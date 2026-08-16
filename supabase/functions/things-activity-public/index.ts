/**
 * things-activity-public — Public read-only canonical activity resolver.
 *
 * POST only. No authentication required (intentionally public — the same
 * contract as tiqets-public / viator-public). Two read-only actions:
 *
 *   resolve                — exact destination_slug + slug resolution
 *   map-provider-products  — exact (provider, provider_product_id) pairs to
 *                            canonical activity identities (identity bridge
 *                            only — never title/URL/heuristic matching)
 *
 * WHY SERVER-SIDE: things_activities / things_activity_offers have NO public
 * RLS policies (the phase2d migration locks them down), so public catalogue
 * reads must happen here, with the service-role client.
 *
 * READ-ONLY. This function performs NO writes, NO provider API calls, NO
 * arbitrary URL passthrough and NO arbitrary table/query passthrough.
 *
 * resolve reads exactly three fixed tables:
 *
 *   1. things_activities        — exact destination_slug + slug resolution
 *   2. things_activity_offers   — provider offers for the resolved activity
 *   3. experience_products      — OPTIONAL provider-keyed display enrichment
 *                                 (best-effort; a cache read failure never
 *                                 fails the resolve)
 *
 * map-provider-products reads ONLY the two identity tables (1 and 2) using
 * fixed .in(...) column filters — never caller-built filter strings.
 *
 * RESPONSES:
 *   resolve:
 *     200 { status: "available", activity, offers }
 *     404 { status: "not_found" }     — unknown OR archived (fail closed)
 *   map-provider-products:
 *     200 { status: "ok", requestedCount, mappedCount, mappings }
 *   both actions:
 *     400 { error }                   — invalid input / unknown action
 *     500 { error }                   — generic, no internal details
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
  buildProviderMappingBody,
  buildPublicActivityPayload,
  buildPublicOfferPayload,
  buildResolvedBody,
  isArchivedStatus,
  mapProviderProductsToCanonical,
  sortOffersByProvider,
  validateProviderMappingInput,
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

/**
 * map-provider-products — exact provider identity → canonical activity
 * identity bridge (T2D-B2B-5A).
 *
 * READ-ONLY. The ONLY join is:
 *
 *   (provider, provider_product_id)
 *     → things_activity_offers.activity_id
 *     → things_activities.id
 *
 * No title similarity, no fuzzy matching, no slugification, no provider URL
 * matching, no AI/heuristic matching and NO provider API calls. Unknown
 * pairs are omitted (never manufactured); archived activities fail closed.
 * The response exposes ONLY public-safe identity fields.
 */
async function handleProviderMapping(
  body: Record<string, unknown>,
  headers: Record<string, string>,
): Promise<Response> {
  const validated = validateProviderMappingInput(body.items);
  if (!validated.ok) {
    return publicError(validated.error, 400, headers);
  }

  try {
    // 1. Fixed .in(...) offer lookup by product IDs. Provider scope is
    //    enforced in application code below — never via a caller-built
    //    filter string.
    const productIds = Array.from(
      new Set(validated.items.map((item) => item.providerProductId)),
    );
    const { data: offerRows, error: offersError } = await supabaseAdmin
      .from("things_activity_offers")
      .select("id, activity_id, provider, provider_product_id")
      .in("provider_product_id", productIds);

    if (offersError) {
      console.error("[things-activity-public] mapping offer query failed");
      return publicError("Unable to map provider products", 500, headers);
    }

    // 2. Keep ONLY rows whose exact (provider, provider_product_id) pair was
    //    in the validated request — provider-scoped even when two providers
    //    happen to share the same product ID.
    const exactPairs = new Set(
      validated.items.map((item) => `${item.provider}:${item.providerProductId}`),
    );
    const offers = (Array.isArray(offerRows) ? offerRows : []).filter(
      (offer) =>
        typeof offer.provider === "string" &&
        typeof offer.provider_product_id === "string" &&
        exactPairs.has(`${offer.provider}:${offer.provider_product_id}`),
    );

    // 3. Fixed .in(...) canonical activity lookup by exact activity IDs.
    const activityIds = Array.from(
      new Set(
        offers
          .map((offer) => offer.activity_id)
          .filter((id): id is string => typeof id === "string"),
      ),
    );

    if (activityIds.length === 0) {
      return json(
        buildProviderMappingBody(validated.items.length, 0, []),
        200,
        headers,
      );
    }

    const { data: activityRows, error: activitiesError } = await supabaseAdmin
      .from("things_activities")
      .select("id, destination_slug, slug, publication_status")
      .in("id", activityIds);

    if (activitiesError) {
      console.error("[things-activity-public] mapping activity query failed");
      return publicError("Unable to map provider products", 500, headers);
    }

    // 4. Exact activity-ID join in application code. Output order preserves
    //    the validated deduplicated request order (deterministic).
    const mappings = mapProviderProductsToCanonical(
      validated.items,
      offers,
      Array.isArray(activityRows) ? activityRows : [],
    );

    return json(
      buildProviderMappingBody(validated.items.length, mappings.length, mappings),
      200,
      headers,
    );
  } catch (err) {
    // Never expose internal details — log a message only, respond generically.
    console.error(
      "[things-activity-public] unexpected error:",
      err instanceof Error ? err.message : "unknown error",
    );
    return publicError("An unexpected error occurred", 500, headers);
  }
}

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

  const body = rawBody as Record<string, unknown>;
  const action = body.action;

  if (action === "map-provider-products") {
    return handleProviderMapping(body, headers);
  }

  if (action !== "resolve") {
    return publicError("action is required (resolve | map-provider-products)", 400, headers);
  }
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
