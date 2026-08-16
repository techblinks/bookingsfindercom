/**
 * things-activity-public — Public read-only canonical activity resolver.
 *
 * POST only. No authentication required (intentionally public — the same
 * contract as tiqets-public / viator-public). This phase supports exactly
 * one action:
 *
 *   { "action": "resolve", "destinationSlug": "rome", "activitySlug": "..." }
 *
 * WHY SERVER-SIDE: things_activities / things_activity_offers have NO public
 * RLS policies (the phase2d migration locks them down), so public catalogue
 * reads must happen here, with the service-role client.
 *
 * READ-ONLY. This function performs NO writes, NO provider API calls, NO
 * arbitrary URL passthrough and NO arbitrary table/query passthrough. It
 * reads exactly three fixed tables:
 *
 *   1. things_activities        — exact destination_slug + slug resolution
 *   2. things_activity_offers   — provider offers for the resolved activity
 *   3. experience_products      — OPTIONAL provider-keyed display enrichment
 *                                 (best-effort; a cache read failure never
 *                                 fails the resolve)
 *
 * RESPONSES:
 *   200 { status: "available", activity, offers }
 *   404 { status: "not_found" }     — unknown OR archived (fail closed)
 *   400 { error }                   — invalid input / unknown action
 *   500 { error }                   — generic, no internal details
 *
 * SECURITY:
 *   - service-role key is read from the environment only, never returned,
 *     logged or echoed
 *   - public payloads are built by things-activity-core.ts: no internal
 *     fields (verification, keys, row internals) are emitted
 *   - activity identity is NEVER fabricated from request strings: a slug
 *     either resolves in the database or the request fails closed to 404
 *   - error responses never expose internal error details
 *
 * DEPLOYMENT: DO NOT DEPLOY in T2D-B1. The production activity tables do not
 * exist yet (the phase2d migration is local-only). This function is created
 * and tested locally; T2D-B2 performs the controlled migration + deployment.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  buildNotFoundBody,
  buildPublicActivityPayload,
  buildPublicOfferPayload,
  buildResolvedBody,
  isArchivedStatus,
  sortOffersByProvider,
  validateResolveInput,
} from "./things-activity-core.ts";

// ═══════════════════════════════════════════════════════════════
// Supabase service-role client (bypasses RLS — server-side reads only)
// ═══════════════════════════════════════════════════════════════

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ═══════════════════════════════════════════════════════════════
// CORS — restricted origins (identical to tiqets-public / viator-public)
// ═══════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  "https://bookingsfinder.com",
  "https://www.bookingsfinder.com",
  "https://bookingsfindercom.workers.dev",
  "http://localhost:8080",
  "http://localhost:8081",
];

function originScopedHeaders(req: Request): Record<string, string> {
  const origin = (req.headers.get("Origin") || "").trim();
  const allowed = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];
  return {
    ...corsHeaders,
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ═══════════════════════════════════════════════════════════════
// Response helpers
// ═══════════════════════════════════════════════════════════════

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

/** Safe public error — never includes internal details. */
function publicError(
  message: string,
  status: number,
  headers: Record<string, string>,
): Response {
  return json({ error: message }, status, headers);
}

// ═══════════════════════════════════════════════════════════════
// Optional provider display enrichment (best-effort, read-only)
// ═══════════════════════════════════════════════════════════════

/**
 * Load genuine provider display fields from the provider-keyed catalogue
 * cache (experience_products) for the resolved offers. Keyed by
 * (provider, provider_product_id) — a product ID is never assumed to be
 * globally unique across providers. Best-effort: any failure yields an
 * empty map so the canonical resolve still succeeds with sparse offers.
 */
async function loadOfferEnrichment(
  offers: Array<{ provider: string; provider_product_id: string }>,
): Promise<Map<string, Record<string, unknown>>> {
  const byKey = new Map<string, Record<string, unknown>>();
  const ids = offers
    .map((o) => o.provider_product_id)
    .filter((id) => typeof id === "string" && id.length > 0);
  if (ids.length === 0) return byKey;

  try {
    const { data, error } = await supabaseAdmin
      .from("experience_products")
      .select(
        "provider, provider_product_id, title, description, tagline, image_url, rating, review_count, price_amount, price_currency, wheelchair_accessible, skip_the_line, provider_updated_at, last_seen_at",
      )
      .in("provider_product_id", ids);

    if (error || !data) return byKey;
    for (const row of data) {
      const provider = row.provider;
      const productId = row.provider_product_id;
      if (typeof provider === "string" && typeof productId === "string") {
        byKey.set(`${provider}:${productId}`, row);
      }
    }
  } catch {
    // Enrichment is best-effort — never fail the resolve because of it.
  }
  return byKey;
}

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  const headers = originScopedHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (req.method !== "POST") {
    return publicError("Method not allowed", 405, headers);
  }

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return publicError("Invalid JSON body", 400, headers);
  }

  if (!rawBody || typeof rawBody !== "object" || Array.isArray(rawBody)) {
    return publicError("Request body must be a JSON object", 400, headers);
  }

  const action = (rawBody as Record<string, unknown>).action;
  if (action !== "resolve") {
    return publicError("action is required (resolve)", 400, headers);
  }

  const body = rawBody as Record<string, unknown>;
  const validated = validateResolveInput(body.destinationSlug, body.activitySlug);
  if (!validated.ok) {
    return publicError(validated.error, 400, headers);
  }

  try {
    // 1. Exact canonical identity — destination_slug + slug only.
    const { data: activity, error: activityError } = await supabaseAdmin
      .from("things_activities")
      .select("*")
      .eq("destination_slug", validated.destinationSlug)
      .eq("slug", validated.activitySlug)
      .maybeSingle();

    if (activityError) {
      console.error("[things-activity-public] activity query failed");
      return publicError("Unable to resolve activity", 500, headers);
    }

    // Unknown → fail closed. No identity is fabricated from request strings.
    if (!activity) {
      return json(buildNotFoundBody(), 404, headers);
    }

    // Archived → fail closed as not_found.
    if (isArchivedStatus(activity.publication_status)) {
      return json(buildNotFoundBody(), 404, headers);
    }

    // 2. Provider offers for the resolved activity (stable provider order).
    const { data: offerRows, error: offersError } = await supabaseAdmin
      .from("things_activity_offers")
      .select("*")
      .eq("activity_id", activity.id);

    if (offersError) {
      console.error("[things-activity-public] offers query failed");
      return publicError("Unable to resolve activity", 500, headers);
    }

    const offers = Array.isArray(offerRows) ? offerRows : [];
    const sortedOffers = sortOffersByProvider(offers);

    // 3. Optional provider display enrichment (best-effort).
    const enrichment = await loadOfferEnrichment(sortedOffers);

    const offerPayloads = sortedOffers
      .map((offer) =>
        buildPublicOfferPayload(
          offer,
          enrichment.get(`${offer.provider}:${offer.provider_product_id}`) ?? null,
        ),
      )
      .filter((payload): payload is NonNullable<typeof payload> => payload !== null);

    // 4. Public-safe response. The canonical activity payload is required;
    //    if it cannot be built the request fails closed (never emit a
    //    partial or fabricated identity).
    const activityPayload = buildPublicActivityPayload(activity);
    if (!activityPayload) {
      return publicError("Unable to resolve activity", 500, headers);
    }

    return json(buildResolvedBody(activityPayload, offerPayloads), 200, headers);
  } catch (err) {
    // Never expose internal details — log a message only, respond generically.
    console.error(
      "[things-activity-public] unexpected error:",
      err instanceof Error ? err.message : "unknown error",
    );
    return publicError("An unexpected error occurred", 500, headers);
  }
});
