/**
 * tiqets-catalog — Admin-only Tiqets Content API proxy.
 *
 * POST only. JWT-verified. Admin-role check.
 * Proxies the Tiqets Content API (Essential tier: Content + Availability & Pricing).
 * No Booking API, no orders, no payments.
 *
 * The action contract, validation and dispatch live in ./catalogue-core.ts so
 * they are testable without Deno. `refresh-catalogue` is a declared but
 * unavailable action (T4A-P1): the dispatcher resolves it to a terminal
 * `catalogue_sync_not_ready` response, so this file holds no durable-write path
 * at all — no catalogue tables, no sync-state checkpoint, no provider fetch.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";
import {
  tiqetsRequest,
  tiqetsHealthCheck,
} from "../_shared/tiqets-client.ts";
import type { TiqetsError } from "../_shared/tiqets-client.ts";
import {
  normalizeProduct,
  safeImageUrl,
  selectImageVariant,
  buildImageDiagnostics,
  type TiqetsProductRaw,
  type NormalizedProduct,
  type TiqetsPaginationRaw,
} from "../_shared/tiqets-normalizer.ts";
import {
  parseCatalogueRequest,
  type ProductsRequest,
} from "./catalogue-core.ts";

// ═══════════════════════════════════════════════════════════════
// Admin verification
// ═══════════════════════════════════════════════════════════════

async function verifyAdmin(req: Request): Promise<string> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    throw { status: 401, message: "Authentication required" };
  }

  const token = authHeader.replace("Bearer ", "");
  if (!token || token.length < 10) {
    throw { status: 401, message: "Invalid token" };
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: { user }, error: userError } = await supabase.auth.getUser(token);
  if (userError || !user) {
    throw { status: 401, message: "Invalid or expired token" };
  }

  // Check admin role via existing has_role function
  const { data: isAdmin, error: roleError } = await supabase.rpc("has_role", {
    _user_id: user.id,
    _role: "admin",
  });

  if (roleError || !isAdmin) {
    throw { status: 403, message: "Admin role required" };
  }

  return user.id;
}

// ═══════════════════════════════════════════════════════════════
// Upstream response shape
// ═══════════════════════════════════════════════════════════════

interface TiqetsProductsResponse {
  products?: TiqetsProductRaw[];
  results?: TiqetsProductRaw[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// In-memory non-durable cache (admin POC only — not production)
// ═══════════════════════════════════════════════════════════════

const productCache = new Map<string, { data: NormalizedProduct[]; pagination: TiqetsPaginationRaw; storedAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function cacheKey(body: ProductsRequest): string {
  return `${body.language}|${body.page}|${body.page_size}|${body.destination_id ?? ""}|${body.sale_status ?? ""}`;
}

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Auth ── every action, including refresh-catalogue, is admin-gated
  let userId: string;
  try {
    userId = await verifyAdmin(req);
  } catch (e: unknown) {
    const err = e as { status: number; message: string };
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: err.status || 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Parse body ──
  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Validate + dispatch ──
  // Everything that is not executable terminates here: missing or unknown
  // action, invalid body, and the disabled refresh-catalogue action.
  const dispatch = parseCatalogueRequest(rawBody);
  if (!dispatch.ok) {
    return new Response(
      JSON.stringify(dispatch.body),
      { status: dispatch.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Health ──
  if (dispatch.action === "health") {
    const configured = !!Deno.env.get("TIQETS_API_TOKEN");
    const health = await tiqetsHealthCheck();

    return new Response(
      JSON.stringify({
        configured,
        connected: health.connected,
        upstreamStatus: health.upstreamStatus,
        responseTimeMs: health.responseTimeMs,
        upstreamRequestId: health.upstreamRequestId || null,
        checkedAt: new Date().toISOString(),
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Products ──
  const body = dispatch.body;
  const key = cacheKey(body);

  // Check cache
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.storedAt < CACHE_TTL_MS) {
    return new Response(
      JSON.stringify({
        products: cached.data,
        pagination: cached.pagination,
        fetchedAt: new Date(cached.storedAt).toISOString(),
        cacheStatus: "hit",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // Build upstream params
  const params = new URLSearchParams({
    lang: body.language,
    page: String(body.page),
    page_size: String(body.page_size),
  });
  if (body.destination_id) params.set("destination_id", String(body.destination_id));
  if (body.sale_status) params.set("sale_status", body.sale_status);

  try {
    const upstream = await tiqetsRequest<TiqetsProductsResponse>({
      endpoint: "/products",
      params,
    });

    // Support both "products" (official Tiqets wrapper) and "results" (fallback)
    const rawResults: TiqetsProductRaw[] =
      upstream.data.products || upstream.data.results || [];
    const products = rawResults.map(normalizeProduct);
    const pagination: TiqetsPaginationRaw = {
      count: upstream.data.count ?? rawResults.length,
      next: upstream.data.next || null,
      previous: upstream.data.previous || null,
    };

    // Admin diagnostics (counts/types only — never raw data or tokens)
    const diagnostics = {
      upstreamPayloadType: Array.isArray(upstream.data) ? "array" : (typeof upstream.data),
      upstreamTopLevelKeys: typeof upstream.data === "object" && upstream.data !== null && !Array.isArray(upstream.data)
        ? Object.keys(upstream.data as Record<string, unknown>)
        : null,
      upstreamRawItemCount: rawResults.length,
      normalizationInputCount: rawResults.length,
      normalizationOutputCount: products.length,
      imageDiagnostics: buildImageDiagnostics(
        (upstream.data.products || upstream.data.results || [])
      ),
    };

    // Store in cache
    productCache.set(key, { data: products, pagination, storedAt: Date.now() });

    return new Response(
      JSON.stringify({
        products,
        pagination,
        fetchedAt: new Date().toISOString(),
        cacheStatus: "miss",
        upstreamRequestId: upstream.upstreamRequestId || null,
        diagnostics,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: unknown) {
    const err = e as TiqetsError;
    const statusMap: Record<string, number> = {
      auth: 502,
      not_found: 404,
      rate_limit: 429,
      upstream: 502,
      timeout: 504,
      parse: 502,
      config: 500,
    };
    const status = statusMap[err.type] || 502;

    return new Response(
      JSON.stringify({
        error: err.message,
        upstreamRequestId: err.upstreamRequestId || null,
        retryAfterSec: err.retryAfterSec || null,
      }),
      { status, headers: { ...corsHeaders, "Content-Type": "application/json", ...(err.retryAfterSec ? { "Retry-After": String(err.retryAfterSec) } : {}) } }
    );
  }
});
