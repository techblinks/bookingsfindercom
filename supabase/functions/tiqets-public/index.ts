/**
 * tiqets-public — Public read-only Tiqets API proxy.
 *
 * POST only. No authentication required (intentionally public).
 * Supports two actions: `featured` (curated) and `search` (user-driven).
 *
 * SECURITY:
 * - No API token in responses or logs
 * - No upstream Authorization header in logs
 * - 8-second timeout (enforced by tiqets-client)
 * - Handles 401/403/404/429/5xx safely
 * - Respects Retry-After
 * - No uncontrolled retries
 * - Capped page_size at 24
 * - Rejects control characters in query strings
 *
 * CACHE:
 * - Durable DB-backed cache via public.tiqets_public_cache.
 * - 30-min TTL for `featured`, 10-min TTL for `search`.
 * - Stale-if-error: returns recently-expired data when upstream fails.
 * - Service-role access only (RLS bypassed).
 *
 * FILTERS:
 * - Price: price_min / price_max (AUD cents) — upstream-supported.
 * - Ticket features: skip_line, smartphone_ticket, instant_ticket_delivery —
 *   upstream-supported boolean params (sent only when true).
 * - Accessibility: wheelchair_access — upstream-supported boolean param
 *   (sent only when true).
 * - Activity type: tag_ids — upstream-supported, comma-separated.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { tiqetsRequest } from "../_shared/tiqets-client.ts";
import type { TiqetsError } from "../_shared/tiqets-client.ts";
import {
  normalizeProduct,
  buildImageDiagnostics,
} from "../_shared/tiqets-normalizer.ts";
import type {
  NormalizedProduct,
  TiqetsProductRaw,
  TiqetsPaginationRaw,
} from "../_shared/tiqets-normalizer.ts";

// ═══════════════════════════════════════════════════════════════
// Supabase service-role client (bypasses RLS for cache table)
// ═══════════════════════════════════════════════════════════════

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ═══════════════════════════════════════════════════════════════
// CORS — restricted origins (public, not wildcard)
// ═══════════════════════════════════════════════════════════════

const ALLOWED_ORIGINS = [
  "https://bookingsfinder.com",
  "https://www.bookingsfinder.com",
  "https://bookingsfindercom.workers.dev",
  "http://localhost:8080",
  "http://localhost:8081",
];

/**
 * Return CORS headers scoped to the request's Origin.
 * Falls back to the primary production origin when Origin is absent
 * (e.g. server-to-server calls).
 */
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
// Zod schemas
// ═══════════════════════════════════════════════════════════════

/** Reject control characters (0x00–0x1F, 0x7F) while allowing normal unicode. */
const noControlChars = (s: string) =>
  !/[\x00-\x1f\x7f]/.test(s) ||
  "Control characters are not allowed";

const featuredSchema = z.object({
  action: z.literal("featured"),
});

const searchSchema = z
  .object({
    action: z.literal("search"),
    query: z
      .string()
      .max(120)
      .transform((s) => s.trim())
      .refine(noControlChars)
      .optional(),
    city_name: z
      .string()
      .max(80)
      .transform((s) => s.trim())
      .optional(),
    page: z.number().int().min(1).max(20).default(1),
    page_size: z.union([z.literal(12), z.literal(24)]).default(12),
    sort: z
      .enum(["popularity_desc", "price_asc", "title_asc"])
      .default("popularity_desc"),
    min_rating: z.number().int().min(1).max(5).optional(),
    lang: z.literal("en").default("en"),
    currency: z.literal("AUD").default("AUD"),

    // ── Price filter (AUD cents) ──
    price_min: z.number().int().min(0).optional(),
    price_max: z.number().int().min(0).optional(),

    // ── Ticket features (boolean filters) ──
    skip_line: z.boolean().optional(),
    smartphone_ticket: z.boolean().optional(),
    instant_ticket_delivery: z.boolean().optional(),

    // ── Accessibility ──
    wheelchair_access: z.boolean().optional(),

    // ── Activity type / tag IDs ──
    tag_ids: z.array(z.number().int().positive()).max(10).optional(),
  })
  .refine((d) => d.query || d.city_name, {
    message: "At least one of query or city_name is required",
  })
  .refine(
    (d) => {
      if (d.price_min !== undefined && d.price_max !== undefined) {
        return d.price_min <= d.price_max;
      }
      return true;
    },
    { message: "price_min must be less than or equal to price_max" },
  );

// ═══════════════════════════════════════════════════════════════
// Sort mapping (our values → Tiqets upstream ordering values)
// ═══════════════════════════════════════════════════════════════

const SORT_ORDERING: Record<string, string> = {
  popularity_desc: "-popularity",
  price_asc: "price",
  title_asc: "title",
};

// ═══════════════════════════════════════════════════════════════
// Cache TTL constants (seconds)
// ═══════════════════════════════════════════════════════════════

const FEATURED_TTL_SEC = 30 * 60; // 30 minutes
const SEARCH_TTL_SEC = 10 * 60; // 10 minutes
const STALE_WINDOW_MULTIPLIER = 2; // stale window = 2 × TTL

// ═══════════════════════════════════════════════════════════════
// DB cache helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Generate a SHA-256 hex cache key from action + sorted params.
 *
 * Deterministic: skips null/undefined/empty values, sorts array items
 * (e.g. tag_ids) so that order-independent inputs produce the same key.
 */
async function generateCacheKey(
  action: string,
  params: Record<string, unknown>,
): Promise<string> {
  const normalized: Record<string, unknown> = { action };

  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
    const val = params[key];
    // Skip null, undefined, empty strings, and empty arrays
    if (val === null || val === undefined) continue;
    if (typeof val === "string" && val.length === 0) continue;
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
      // Sort primitive arrays so [3,1,2] and [1,2,3] produce the same key
      normalized[key] = [...val].sort();
    } else {
      normalized[key] = val;
    }
  }

  const raw = JSON.stringify(normalized);
  const data = new TextEncoder().encode(raw);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

interface CachedPayload {
  products: NormalizedProduct[];
  pagination?: {
    count: number;
    next: string | null;
    previous: string | null;
  };
}

interface CacheEntry {
  payload: CachedPayload;
  fetched_at: string;
  expires_at: string;
  upstream_request_id: string | null;
}

interface CacheResult {
  type: "hit" | "stale" | "miss";
  entry?: CacheEntry;
}

/**
 * Query the cache table for a fresh entry first, then a stale fallback.
 * Returns `{ type, entry }` — type is "hit", "stale", or "miss".
 * DB errors are caught silently (treated as miss).
 */
async function getCachedEntry(
  cacheKey: string,
  ttlSec: number,
): Promise<CacheResult> {
  try {
    const now = new Date().toISOString();

    // 1. Try fresh: expires_at > now()
    const { data: fresh } = await supabaseAdmin
      .from("tiqets_public_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .gt("expires_at", now)
      .maybeSingle();

    if (fresh) {
      return {
        type: "hit",
        entry: {
          payload: fresh.payload as unknown as CachedPayload,
          fetched_at: fresh.fetched_at,
          expires_at: fresh.expires_at,
          upstream_request_id: fresh.upstream_request_id,
        },
      };
    }

    // 2. Try stale: expires_at <= now() but within 2× TTL window
    const staleThreshold = new Date(
      Date.now() - ttlSec * STALE_WINDOW_MULTIPLIER * 1000,
    ).toISOString();

    const { data: stale } = await supabaseAdmin
      .from("tiqets_public_cache")
      .select("*")
      .eq("cache_key", cacheKey)
      .lte("expires_at", now)
      .gt("expires_at", staleThreshold)
      .order("expires_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (stale) {
      return {
        type: "stale",
        entry: {
          payload: stale.payload as unknown as CachedPayload,
          fetched_at: stale.fetched_at,
          expires_at: stale.expires_at,
          upstream_request_id: stale.upstream_request_id,
        },
      };
    }

    return { type: "miss" };
  } catch {
    // DB unreachable — treat as cache miss, upstream will be tried
    return { type: "miss" };
  }
}

/**
 * Upsert a cache entry. Silently ignores DB errors (cache is best-effort).
 */
async function upsertCacheEntry(
  cacheKey: string,
  payload: CachedPayload,
  ttlSec: number,
  upstreamRequestId: string | null,
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSec * 1000);

    await supabaseAdmin
      .from("tiqets_public_cache")
      .upsert(
        {
          cache_key: cacheKey,
          payload: payload as unknown as Record<string, unknown>,
          fetched_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          upstream_request_id: upstreamRequestId,
          updated_at: now.toISOString(),
        },
        { onConflict: "cache_key" },
      );
  } catch {
    // Cache write failure is non-fatal
  }
}

// ═══════════════════════════════════════════════════════════════
// Response helpers
// ═══════════════════════════════════════════════════════════════

function json(body: unknown, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

function publicError(
  message: string,
  status: number,
  headers: Record<string, string>,
  extra?: Record<string, unknown>,
) {
  return json({ error: message, ...(extra || {}) }, status, headers);
}

// ═══════════════════════════════════════════════════════════════
// Upstream product response shape
// ═══════════════════════════════════════════════════════════════

interface TiqetsProductsResponse {
  products?: TiqetsProductRaw[];
  results?: TiqetsProductRaw[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Build a cache payload from Tiqets response data
// ═══════════════════════════════════════════════════════════════

function buildSearchCachePayload(
  products: NormalizedProduct[],
  upstream: TiqetsProductsResponse,
): CachedPayload {
  return {
    products,
    pagination: {
      count: upstream.count ?? products.length,
      next: upstream.next || null,
      previous: upstream.previous || null,
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════


/**
 * Extract destinations from normalized products and upsert into the durable index.
 * Called internally when featured results are fresh — no public action.
 */
async function refreshDestinationIndex(products: NormalizedProduct[]): Promise<void> {
  if (!products || products.length === 0) return;

  const destMap = new Map<string, Record<string, unknown>>();

  for (const p of products) {
    if (!p.city || !p.cityId) continue;
    const key = p.cityId.toString();
    if (!destMap.has(key)) {
      destMap.set(key, {
        destination_id: key,
        name: p.city,
        country: p.country || null,
        country_id: p.countryId ? String(p.countryId) : null,
        product_count: 1,
        slug: (p.country ? p.country.toLowerCase().replace(/\s+/g, '-') : '') + '/' + p.city.toLowerCase().replace(/\s+/g, '-'),
      });
    } else {
      const existing = destMap.get(key)!;
      existing.product_count = (Number(existing.product_count) || 0) + 1;
    }
  }

  const destinations = Array.from(destMap.values());
  if (destinations.length === 0) return;

  try {
    const { error } = await supabaseAdmin.rpc("refresh_experience_destinations", {
      p_provider: "tiqets",
      p_destinations: destinations,
    });
    if (error) console.error("[tiqets-public] refreshDestinationIndex error:", error);
  } catch (err) {
    console.error("[tiqets-public] refreshDestinationIndex failed:", err);
  }
}

Deno.serve(async (req: Request) => {
  const headers = originScopedHeaders(req);

  // ── CORS preflight ──
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // ── Method check ──
  if (req.method !== "POST") {
    return publicError("Method not allowed", 405, headers);
  }

  // ── Parse body ──
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
    // ── Catalogue Search ── local database search (no upstream Tiqets)
  if (action === "catalogue-search") {
    try {
      const parsed = z.object({
        action: z.literal("catalogue-search"),
        destinationId: z.string().max(20).optional(),
        countryId: z.string().max(20).optional(),
        query: z.string().max(120).optional(),
        minRating: z.number().int().min(1).max(5).optional(),
        page: z.number().int().min(1).max(20).default(1),
        pageSize: z.number().int().min(1).max(50).default(20),
        sort: z.enum(["popularity", "rating", "price_asc"]).default("popularity"),
      }).safeParse(body);
      if (!parsed.success) return json({ error: "Invalid catalogue search" }, 400, headers);

      const q = parsed.data;
      let dbQuery = supabaseAdmin.from("experience_products").select("*", { count: "exact" });

      if (q.destinationId) dbQuery = dbQuery.eq("city_id", q.destinationId);
      if (q.countryId) dbQuery = dbQuery.eq("country_id", q.countryId);
      if (q.query) dbQuery = dbQuery.or("title.ilike.%25" + q.query + "%25,tagline.ilike.%25" + q.query + "%25");
      if (q.minRating) dbQuery = dbQuery.gte("rating", q.minRating);

      if (q.sort === "rating") dbQuery = dbQuery.order("rating", { ascending: false });
      else if (q.sort === "price_asc") dbQuery = dbQuery.order("price_amount", { ascending: true, nullsFirst: false });
      else dbQuery = dbQuery.order("review_count", { ascending: false, nullsFirst: false });

      var from = (q.page - 1) * q.pageSize;
      dbQuery = dbQuery.range(from, from + q.pageSize - 1);

      const { data: rows, count, error } = await dbQuery;
      if (error) return json({ error: "Search failed" }, 500, headers);

      var products = (rows || []).map(function(r) {
        return {
          provider: "tiqets",
          providerProductId: r.provider_product_id,
          title: r.title,
          city: r.city_name,
          country: r.country_name,
          rating: r.rating ? { average: r.rating, count: r.review_count } : null,
          price: r.price_amount ? { amount: r.price_amount, currency: r.price_currency } : null,
          productUrl: r.product_url,
          imageUrl: r.image_url,
          features: { wheelchair: r.wheelchair_accessible, skipLine: r.skip_the_line },
          saleStatus: r.sale_status,
        };
      });

      return json({ products: products, pagination: { page: q.page, pageSize: q.pageSize, count: count || 0 }, fetchedAt: new Date().toISOString() }, 200, headers);
    } catch(err) {
      console.error("[catalogue-search] error:", err);
      return json({ error: "Search failed" }, 500, headers);
    }
  }
if (!action || typeof action !== "string") {
    return publicError(
      "action is required (featured | search)",
      400,
      headers,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ACTION: featured
  // ═══════════════════════════════════════════════════════════

  if (action === "featured") {
    const parsed = featuredSchema.safeParse(rawBody);
    if (!parsed.success) {
      return publicError("Invalid request", 400, headers, {
        details: parsed.error.flatten(),
      });
    }

    // Build cache key and check cache
    const cacheKey = await generateCacheKey("featured", {
      lang: "en",
      page: "1",
      page_size: "20",
    });

    const cacheResult = await getCachedEntry(cacheKey, FEATURED_TTL_SEC);

    // Cache hit — return immediately
    if (cacheResult.type === "hit" && cacheResult.entry) {
      return json(
        {
          products: cacheResult.entry.payload.products,
          fetchedAt: cacheResult.entry.fetched_at,
          cacheStatus: "hit",
        },
        200,
        headers,
      );
    }

    // Hold stale entry as fallback in case upstream fails
    const staleFallback = cacheResult.type === "stale" ? cacheResult.entry : null;

    // Server-controlled featured query
    const params = new URLSearchParams({
      lang: "en",
      page: "1",
      page_size: "20",
    });

    try {
      const upstream = await tiqetsRequest<TiqetsProductsResponse>({
        endpoint: "/products",
        params,
      });

      const rawResults: TiqetsProductRaw[] =
        upstream.data.products || upstream.data.results || [];

      // Filter: only products with sale_status === "on_sale"
      const products = rawResults.map(normalizeProduct);
      console.log(`[tiqets-public] featured: upstream=${rawResults.length} products=${products.length}`);
      const now = new Date().toISOString();

      // Write to cache (best-effort, never blocks response)
      upsertCacheEntry(
        cacheKey,
        { products },
        FEATURED_TTL_SEC,
        upstream.upstreamRequestId || null,
      );

      return json(
        {
          products,
          fetchedAt: now,
          cacheStatus: "miss",
          upstreamRequestId: upstream.upstreamRequestId || null,
          diagnostics: {
            upstreamRawCount: rawResults.length,
            filteredOnSaleCount: onSale.length,
            normalizedCount: products.length,
            imageDiagnostics: buildImageDiagnostics(rawResults),
          },
        },
        200,
        headers,
      );
    } catch (e: unknown) {
      // Stale-if-error: return stale fallback if available
      if (staleFallback) {
        return json(
          {
            products: staleFallback.payload.products,
            fetchedAt: staleFallback.fetched_at,
            cacheStatus: "stale",
          },
          200,
          headers,
        );
      }

      const err = e as TiqetsError;
      return handleUpstreamError(err, headers);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ACTION: search
  // ═══════════════════════════════════════════════════════════


  // ── Destinations ── (read from durable index, not upstream)
  if (action === "destinations") {
    const parsed = z.object({ action: z.literal("destinations") }).safeParse(body);
    if (!parsed.success) {
      return errorResponse("Invalid destinations request", 400);
    }

    try {
      // Build cache key — simple for destinations (no params)
      const cacheKey = await generateCacheKey("destinations", { provider: "tiqets" });
      const cacheResult = await getCachedEntry(cacheKey, 3600); // 1 hour TTL

      if (cacheResult.type === "hit" && cacheResult.entry) {
        return jsonResponse({
          destinations: cacheResult.entry.payload,
          fetchedAt: cacheResult.entry.fetched_at,
          cacheStatus: "hit" as const,
        });
      }

      // Read from durable index
      const { data: rows, error } = await supabaseAdmin
        .from("experience_destinations")
        .select("*")
        .eq("provider", "tiqets")
        .order("product_count", { ascending: false })
        .limit(200);

      if (error || !rows) {
        return jsonResponse({ destinations: [], fetchedAt: new Date().toISOString(), cacheStatus: "miss" });
      }

      const destinations = rows.map((r: Record<string, unknown>) => ({
        provider: r.provider,
        destinationId: String(r.destination_id || ""),
        name: r.name || "",
        country: r.country || null,
        countryId: r.country_id ? String(r.country_id) : null,
        countryCode: r.country_code || null,
        slug: r.slug || "",
        productCount: Number(r.product_count) || 0,
        latitude: r.latitude || null,
        longitude: r.longitude || null,
      }));

      // Cache the result
      await upsertCacheEntry(cacheKey, { destinations } as any, 3600, null);

      return jsonResponse({
        destinations,
        fetchedAt: new Date().toISOString(),
        cacheStatus: "miss" as const,
      });
    } catch (err) {
      console.error("[tiqets-public] destinations error:", err);
      return jsonResponse({ destinations: [], fetchedAt: new Date().toISOString(), cacheStatus: "miss" });
    }
  }

if (action === "search") {
    const parsed = searchSchema.safeParse(rawBody);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      // Surface the refine error clearly
      const refineMsg = flat.formErrors?.[0];
      return publicError(
        refineMsg || "Invalid search request",
        400,
        headers,
        { details: flat },
      );
    }

    const body = parsed.data;

    // Build cache key from search params (exclude action)
    const { action: _a, ...searchParams } = body;
    // Ensure numeric params are serialized consistently for cache keys
    if (searchParams.destination_id) searchParams.destination_id = Number(searchParams.destination_id);
    const cacheKey = await generateCacheKey("search", searchParams as Record<string, unknown>);

    const cacheResult = await getCachedEntry(cacheKey, SEARCH_TTL_SEC);

    // Cache hit — return immediately
    if (cacheResult.type === "hit" && cacheResult.entry) {
      return json(
        {
          products: cacheResult.entry.payload.products,
          fetchedAt: cacheResult.entry.fetched_at,
          cacheStatus: "hit",
          pagination: cacheResult.entry.payload.pagination || null,
        },
        200,
        headers,
      );
    }

    // Hold stale entry as fallback
    const staleFallback = cacheResult.type === "stale" ? cacheResult.entry : null;

    // Build upstream params
    const params = new URLSearchParams({
      lang: "en",
      page: String(body.page),
      page_size: String(body.page_size),
      ordering: SORT_ORDERING[body.sort],
      currency: "AUD",
    });

    if (body.query) params.set("search", body.query);
    if (body.city_name) params.set("destination", body.city_name);
    if (body.min_rating) params.set("min_rating", String(body.min_rating));

    // ── Price filter (AUD cents) ──
    if (body.price_min !== undefined) params.set("price_min", String(body.price_min));
    if (body.price_max !== undefined) params.set("price_max", String(body.price_max));

    // ── Ticket features (only send when true) ──
    if (body.skip_line === true) params.set("skip_line", "true");
    if (body.smartphone_ticket === true) params.set("smartphone_ticket", "true");
    if (body.instant_ticket_delivery === true) params.set("instant_ticket_delivery", "true");

    // ── Accessibility ──
    if (body.wheelchair_access === true) params.set("wheelchair_access", "true");

    // ── Activity type / tag IDs ──
    if (body.tag_ids && body.tag_ids.length > 0) {
      params.set("tag_ids", body.tag_ids.join(","));
    }

    try {
      const upstream = await tiqetsRequest<TiqetsProductsResponse>({
        endpoint: "/products",
        params,
      });

      const rawResults: TiqetsProductRaw[] =
        upstream.data.products || upstream.data.results || [];

      const products = rawResults.map(normalizeProduct);

      // Filter out sold-out / cancelled if the user didn't explicitly ask for them
      // (Search returns on_sale by default from Tiqets; this is a safety net.)
      const safeProducts = products.filter(
        (p) => !p.saleStatus || p.saleStatus === "on_sale",
      );

      const cachePayload = buildSearchCachePayload(safeProducts, upstream.data);
      const now = new Date().toISOString();

      // Write to cache (best-effort)
      upsertCacheEntry(
        cacheKey,
        cachePayload,
        SEARCH_TTL_SEC,
        upstream.upstreamRequestId || null,
      );

      return json(
        {
          products: safeProducts,
          fetchedAt: now,
          cacheStatus: "miss",
          upstreamRequestId: upstream.upstreamRequestId || null,
          pagination: cachePayload.pagination,
        },
        200,
        headers,
      );
    } catch (e: unknown) {
      // Stale-if-error: return stale fallback if available
      if (staleFallback) {
        return json(
          {
            products: staleFallback.payload.products,
            fetchedAt: staleFallback.fetched_at,
            cacheStatus: "stale",
            pagination: staleFallback.payload.pagination || null,
          },
          200,
          headers,
        );
      }

      const err = e as TiqetsError;
      return handleUpstreamError(err, headers);
    }
  }

  // ── Unknown action ──
  return publicError(`Unknown action: ${action}`, 400, headers);
});

// ═══════════════════════════════════════════════════════════════
// Error mapping — safe public messages only
// ═══════════════════════════════════════════════════════════════

function handleUpstreamError(
  err: TiqetsError,
  headers: Record<string, string>,
): Response {
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

  // Safe public messages — never expose raw upstream bodies
  const publicMessages: Record<string, string> = {
    auth: "Upstream authentication failed",
    not_found: "Requested resource not found",
    rate_limit: "Too many requests — please try again shortly",
    timeout: "Upstream request timed out",
    upstream: "Upstream server error",
    parse: "Unable to process upstream response",
    config: "Service configuration error",
  };

  const message = publicMessages[err.type] || "An unexpected error occurred";

  // Build extra fields for the response
  const extra: Record<string, unknown> = {};
  if (err.upstreamRequestId) {
    extra.upstreamRequestId = err.upstreamRequestId;
  }
  if (err.retryAfterSec) {
    extra.retryAfterSec = err.retryAfterSec;
  }

  // Build response headers with optional Retry-After
  const respHeaders: Record<string, string> = { ...headers };
  if (err.retryAfterSec) {
    respHeaders["Retry-After"] = String(err.retryAfterSec);
  }

  return publicError(message, status, respHeaders, extra);
}