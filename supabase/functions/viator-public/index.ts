/**
 * viator-public — DISABLED-BY-DEFAULT public Viator Basic Access proxy.

  // ── Status ── (zero upstream calls)
  if (action === "status") {
    const parsed = statusSchema.safeParse(body);
    if (!parsed.success) return errorResponse("Invalid status request", 400);
    const enabled = Deno.env.get("VIATOR_PUBLIC_ENABLED") === "true";
    const configured = !!Deno.env.get("VIATOR_API_KEY");
    return jsonResponse({
      provider: "viator",
      status: !enabled ? "disabled" : !configured ? "misconfigured" : "enabled",
    });
  }

 *
 * POST only. No authentication required (intentionally public).
 * Supports four read-only actions: `status`, `search`, `destinations`, `tags`.
 * These are exactly the three Basic Access golden-path endpoints, plus a
 * zero-upstream-call status probe. Sandbox host only.
 *
 * DISABLED BY DEFAULT:
 * - Returns `{ provider: "viator", status: "disabled", products: [] }` with 200
 *   unless VIATOR_PUBLIC_ENABLED === "true".
 * - No upstream request is ever made when disabled.
 *
 * SECURITY:
 * - No API key in responses or logs
 * - 15-second timeout on upstream requests
 * - Handles 400/401/403/404/429/5xx safely
 * - Strict CORS: same 5 origins as tiqets-public
 * - No arbitrary JSON passthrough
 * - No endpoint/URL passthrough
 * - No Booking API endpoints
 * - Only api.sandbox.viator.com hostname
 * - productUrl validated (HTTPS, viator.com only via normalizer)
 *
 * CACHE:
 * - Durable DB-backed cache via public.tiqets_public_cache.
 * - 10-min TTL for `search`, 24h TTL for `destinations` / `tags`.
 * - Stale-if-error: returns recently-expired data when upstream fails
 *   (stale window = 2 × TTL).
 * - Cache keys prefixed with provider ("viator:") for isolation.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import {
  normalizeViatorDestination,
  normalizeViatorProduct,
  normalizeViatorTag,
} from "../_shared/viator-normalizer.ts";
import type {
  NormalizedViatorDestination,
  NormalizedViatorProduct,
  NormalizedViatorTag,
  ViatorDestinationRaw,
  ViatorProductRaw,
  ViatorTagRaw,
} from "../_shared/viator-normalizer.ts";

// ═══════════════════════════════════════════════════════════════
// Supabase service-role client (bypasses RLS for cache table)
// ═══════════════════════════════════════════════════════════════

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

// ═══════════════════════════════════════════════════════════════
// Viator API config (direct fetch — viator-client is GET-only)
// ═══════════════════════════════════════════════════════════════

const VIATOR_BASE_URL =
  Deno.env.get("VIATOR_API_BASE_URL")?.trim() ||
  "https://api.sandbox.viator.com/partner";

const VIATOR_TIMEOUT_MS = 15_000;
const ALLOWED_HOSTNAME = "api.sandbox.viator.com";

// Validate base URL hostname at startup
{
  const url = new URL(VIATOR_BASE_URL);
  if (url.hostname !== ALLOWED_HOSTNAME) {
    throw new Error(
      `[viator-public] Disallowed hostname "${url.hostname}". Only "${ALLOWED_HOSTNAME}" is permitted.`,
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// CORS — restricted origins (same as tiqets-public)
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
// Zod schemas
// ═══════════════════════════════════════════════════════════════

const statusSchema = z.object({ action: z.literal("status") });

const searchSchema = z
  .object({
    action: z.literal("search"),
    destinationId: z.number().int().positive().optional(),
    activityTags: z.array(z.number().int().positive()).max(10).optional(),
    minPrice: z.number().min(0).optional(),
    maxPrice: z.number().min(0).optional(),
    freeCancellation: z.boolean().optional(),
    sort: z.enum(["relevance", "rating_high", "price_low"]).optional(),
    pageSize: z.number().int().min(1).max(20).default(10),
    cursor: z.string().optional(),
    currency: z.literal("AUD").default("AUD"),
    language: z.literal("en").default("en"),
  })
  .refine(
    (d) =>
      d.minPrice == null || d.maxPrice == null || d.minPrice <= d.maxPrice,
    { message: "minPrice must be <= maxPrice" },
  );

const destinationsSchema = z.object({
  action: z.literal("destinations"),
});

const tagsSchema = z.object({
  action: z.literal("tags"),
});

// ═══════════════════════════════════════════════════════════════
// Sort mapping (our values → Viator sorting options)
// ═══════════════════════════════════════════════════════════════

interface ViatorSortOption {
  sort: string;
  order: string;
}

const SORT_MAP: Record<string, ViatorSortOption> = {
  relevance: { sort: "DEFAULT", order: "DESCENDING" },
  rating_high: { sort: "TRAVELER_RATING", order: "DESCENDING" },
  price_low: { sort: "PRICE", order: "ASCENDING" },
};

const DEFAULT_SORT: ViatorSortOption = {
  sort: "DEFAULT",
  order: "DESCENDING",
};

// ═══════════════════════════════════════════════════════════════
// Cache TTL constants (seconds)
// ═══════════════════════════════════════════════════════════════

const SEARCH_TTL_SEC = 10 * 60; // 10 minutes
const DESTINATIONS_TTL_SEC = 24 * 60 * 60; // 24 hours
const TAGS_TTL_SEC = 24 * 60 * 60; // 24 hours
const STALE_WINDOW_MULTIPLIER = 2;

// ═══════════════════════════════════════════════════════════════
// Cache helpers (same table + pattern as tiqets-public)
// ═══════════════════════════════════════════════════════════════

async function generateCacheKey(
  provider: string,
  action: string,
  params: Record<string, unknown>,
): Promise<string> {
  const normalized: Record<string, unknown> = { provider, action };
  for (const key of Object.keys(params).sort()) {
    const val = params[key];
    if (val === null || val === undefined) continue;
    if (typeof val === "string" && val.length === 0) continue;
    if (Array.isArray(val)) {
      if (val.length === 0) continue;
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
  products?: NormalizedViatorProduct[];
  totalCount?: number;
  destinations?: NormalizedViatorDestination[];
  tags?: NormalizedViatorTag[];
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

async function getCachedEntry(
  cacheKey: string,
  ttlSec: number,
): Promise<CacheResult> {
  try {
    const now = new Date().toISOString();
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
    return { type: "miss" };
  }
}

async function upsertCacheEntry(
  cacheKey: string,
  payload: CachedPayload,
  ttlSec: number,
  upstreamRequestId: string | null,
): Promise<void> {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + ttlSec * 1000);
    await supabaseAdmin.from("tiqets_public_cache").upsert(
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
// Viator upstream POST helper
// ═══════════════════════════════════════════════════════════════

interface ViatorSearchResponseRaw {
  products?: ViatorProductRaw[];
  totalCount?: number;
  nextCursor?: string | null;
}

class ViatorUpstreamError extends Error {
  readonly type: string;
  readonly status: number | null;
  readonly trackingId: string | null;
  constructor(
    type: string,
    message: string,
    status: number | null,
    trackingId: string | null,
  ) {
    super(message);
    this.name = "ViatorUpstreamError";
    this.type = type;
    this.status = status;
    this.trackingId = trackingId;
  }
}

async function viatorPost<T>(
  endpoint: string,
  body: unknown,
  timeoutMs: number = VIATOR_TIMEOUT_MS,
): Promise<{ data: T; status: number; trackingId: string | null }> {
  const apiKey = Deno.env.get("VIATOR_API_KEY");
  if (!apiKey) {
    throw new ViatorUpstreamError(
      "auth_failure",
      "[viator-public] VIATOR_API_KEY environment variable is not set.",
      null,
      null,
    );
  }

  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint
    : `/${endpoint}`;
  const url = `${VIATOR_BASE_URL.replace(/\/$/, "")}${normalizedEndpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "exp-api-key": apiKey,
        Accept: "application/json;version=2.0",
        "Accept-Language": "en-AU",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ViatorUpstreamError(
        "timeout",
        `[viator-public] Request to ${endpoint} timed out after ${timeoutMs} ms.`,
        null,
        null,
      );
    }
    throw new ViatorUpstreamError(
      "network",
      `[viator-public] Network error calling ${endpoint}.`,
      null,
      null,
    );
  }
  clearTimeout(timer);

  const trackingId = res.headers.get("X-Unique-ID") ?? null;
  const bodyText = await res.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new ViatorUpstreamError(
      "parse",
      `[viator-public] Failed to parse JSON response from ${endpoint} (status ${res.status}).`,
      res.status,
      trackingId,
    );
  }

  if (!res.ok) {
    const code = {
      400: "validation",
      401: "auth_failure",
      403: "access_denied",
      404: "not_found",
      429: "rate_limit",
      500: "upstream",
      503: "unavailable",
    }[res.status] || "unknown";
    throw new ViatorUpstreamError(
      code,
      `[viator-public] Viator API returned ${res.status} for ${endpoint}.`,
      res.status,
      trackingId,
    );
  }

  return { data: parsed as T, status: res.status, trackingId };
}

/**
 * Read-only GET against the Viator Partner API.
 *
 * The taxonomy endpoints are GET; /products/search is POST. Both go through the
 * same hostname allow-list (enforced once at startup on VIATOR_BASE_URL) and
 * the same key handling — the key is read from the environment per request and
 * never returned, logged or cached. `endpoint` is always a literal from this
 * file: no caller-supplied path or host ever reaches here, so there is no
 * proxying and no SSRF surface.
 */
async function viatorGet<T>(
  endpoint: string,
  timeoutMs: number = VIATOR_TIMEOUT_MS,
): Promise<{ data: T; status: number; trackingId: string | null }> {
  const apiKey = Deno.env.get("VIATOR_API_KEY");
  if (!apiKey) {
    throw new ViatorUpstreamError(
      "auth_failure",
      "[viator-public] VIATOR_API_KEY environment variable is not set.",
      null,
      null,
    );
  }

  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = `${VIATOR_BASE_URL.replace(/\/$/, "")}${normalizedEndpoint}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(url, {
      method: "GET",
      headers: {
        "exp-api-key": apiKey,
        Accept: "application/json;version=2.0",
        "Accept-Language": "en-AU",
      },
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ViatorUpstreamError(
        "timeout",
        `[viator-public] Request to ${endpoint} timed out after ${timeoutMs} ms.`,
        null,
        null,
      );
    }
    throw new ViatorUpstreamError(
      "network",
      `[viator-public] Network error calling ${endpoint}.`,
      null,
      null,
    );
  }
  clearTimeout(timer);

  const trackingId = res.headers.get("X-Unique-ID") ?? null;
  const bodyText = await res.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyText);
  } catch {
    throw new ViatorUpstreamError(
      "parse",
      `[viator-public] Failed to parse JSON response from ${endpoint} (status ${res.status}).`,
      res.status,
      trackingId,
    );
  }

  if (!res.ok) {
    const code = {
      400: "validation",
      401: "auth_failure",
      403: "access_denied",
      404: "not_found",
      429: "rate_limit",
      500: "upstream",
      503: "unavailable",
    }[res.status] || "unknown";
    throw new ViatorUpstreamError(
      code,
      `[viator-public] Viator API returned ${res.status} for ${endpoint}.`,
      res.status,
      trackingId,
    );
  }

  return { data: parsed as T, status: res.status, trackingId };
}

// ═══════════════════════════════════════════════════════════════
// Search body builder — translates provider-neutral → Viator POST
// ═══════════════════════════════════════════════════════════════

interface ViatorSearchBody {
  filtering?: Record<string, unknown>;
  sorting?: { sort: string; order: string };
  pagination?: { start?: number; count?: number; cursor?: string };
  currency?: string;
}

function buildSearchBody(
  params: z.infer<typeof searchSchema>,
): ViatorSearchBody {
  const body: ViatorSearchBody = {};

  // ── Filtering ──
  const f: Record<string, unknown> = {};
  if (params.destinationId != null) f.destination = params.destinationId;
  if (params.activityTags && params.activityTags.length > 0) {
    f.tags = params.activityTags;
  }
  if (params.minPrice != null) f.lowestPrice = params.minPrice;
  if (params.maxPrice != null) f.highestPrice = params.maxPrice;
  if (params.freeCancellation === true) f.flags = ["FREE_CANCELLATION"];
  if (Object.keys(f).length > 0) body.filtering = f;

  // ── Sorting ──
  const sortCfg = params.sort ? SORT_MAP[params.sort] : DEFAULT_SORT;
  body.sorting = { sort: sortCfg.sort, order: sortCfg.order };

  // ── Pagination ──
  body.pagination = params.cursor
    ? { cursor: params.cursor, count: params.pageSize }
    : { start: 1, count: params.pageSize };

  // ── Currency ──
  body.currency = "AUD";

  return body;
}

// ═══════════════════════════════════════════════════════════════
// Error mapper
// ═══════════════════════════════════════════════════════════════

function handleUpstreamError(
  err: ViatorUpstreamError,
  headers: Record<string, string>,
): Response {
  const statusMap: Record<string, number> = {
    auth_failure: 502,
    validation: 400,
    access_denied: 403,
    not_found: 404,
    rate_limit: 429,
    upstream: 502,
    unavailable: 503,
    timeout: 504,
    parse: 502,
    network: 502,
    unknown: 502,
  };
  const publicMessages: Record<string, string> = {
    auth_failure: "Upstream authentication failed",
    validation: "Upstream validation error",
    access_denied: "Access to upstream resource denied",
    not_found: "Requested resource not found",
    rate_limit: "Too many requests — please try again shortly",
    timeout: "Upstream request timed out",
    upstream: "Upstream server error",
    unavailable: "Upstream service temporarily unavailable",
    parse: "Unable to process upstream response",
    network: "Network error contacting upstream",
    unknown: "An unexpected error occurred",
  };
  const message = publicMessages[err.type] || "An unexpected error occurred";
  const extra: Record<string, unknown> = {};
  if (err.trackingId) extra.upstreamRequestId = err.trackingId;
  return publicError(message, statusMap[err.type] || 502, headers, extra);
}

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req: Request) => {
  // ── DISABLED BY DEFAULT — authoritative check before any logic ──
  const SERVER_ENABLED = Deno.env.get("VIATOR_PUBLIC_ENABLED") === "true";
  if (!SERVER_ENABLED) {
    return new Response(
      JSON.stringify({ provider: "viator", status: "disabled", products: [] }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const headers = originScopedHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

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
  if (!action || typeof action !== "string") {
    return publicError(
      "action is required (search | destinations | tags)",
      400,
      headers,
    );
  }

  // ═══════════════════════════════════════════════════════════
  // ACTION: search
  // ═══════════════════════════════════════════════════════════

  if (action === "search") {
    const parsed = searchSchema.safeParse(rawBody);
    if (!parsed.success) {
      const flat = parsed.error.flatten();
      return publicError(flat.formErrors?.[0] || "Invalid search request", 400, headers, {
        details: flat,
      });
    }

    const body = parsed.data;
    const { action: _a, ...searchParams } = body;
    const cacheKey = await generateCacheKey(
      "viator",
      "search",
      searchParams as Record<string, unknown>,
    );

    const cacheResult = await getCachedEntry(cacheKey, SEARCH_TTL_SEC);

    if (cacheResult.type === "hit" && cacheResult.entry) {
      return json(
        {
          products: cacheResult.entry.payload.products ?? [],
          totalCount: cacheResult.entry.payload.totalCount ?? null,
          fetchedAt: cacheResult.entry.fetched_at,
          cacheStatus: "hit",
        },
        200,
        headers,
      );
    }

    const staleFallback =
      cacheResult.type === "stale" ? cacheResult.entry : null;

    const searchBody = buildSearchBody(body);

    try {
      const upstream = await viatorPost<ViatorSearchResponseRaw>(
        "/products/search",
        searchBody,
      );

      const rawProducts: ViatorProductRaw[] = upstream.data.products ?? [];
      const products = rawProducts.map(normalizeViatorProduct);

      const cachePayload: CachedPayload = {
        products,
        totalCount: upstream.data.totalCount ?? products.length,
      };

      const now = new Date().toISOString();
      upsertCacheEntry(cacheKey, cachePayload, SEARCH_TTL_SEC, upstream.trackingId);

      return json(
        {
          products,
          totalCount: upstream.data.totalCount ?? products.length,
          nextCursor: upstream.data.nextCursor ?? null,
          fetchedAt: now,
          cacheStatus: "miss",
          upstreamRequestId: upstream.trackingId,
        },
        200,
        headers,
      );
    } catch (e: unknown) {
      if (staleFallback) {
        return json(
          {
            products: staleFallback.payload.products ?? [],
            totalCount: staleFallback.payload.totalCount ?? null,
            fetchedAt: staleFallback.fetched_at,
            cacheStatus: "stale",
          },
          200,
          headers,
        );
      }
      return handleUpstreamError(e as ViatorUpstreamError, headers);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ACTION: destinations (placeholder)
  // ═══════════════════════════════════════════════════════════

  if (action === "destinations") {
    const parsed = destinationsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return publicError("Invalid request", 400, headers, {
        details: parsed.error.flatten(),
      });
    }

    // No caller input participates in this request, so the cache key is a
    // constant for the action. The key never contains credentials.
    const cacheKey = await generateCacheKey("viator", "destinations", {});
    const cacheResult = await getCachedEntry(cacheKey, DESTINATIONS_TTL_SEC);

    if (cacheResult.type === "hit" && cacheResult.entry) {
      return json(
        {
          provider: "viator",
          destinations: cacheResult.entry.payload.destinations ?? [],
          fetchedAt: cacheResult.entry.fetched_at,
          cacheStatus: "hit",
        },
        200,
        headers,
      );
    }

    const staleFallback = cacheResult.type === "stale" ? cacheResult.entry : null;

    try {
      const upstream = await viatorGet<{ destinations?: ViatorDestinationRaw[] }>(
        "/destinations",
      );

      const rawDestinations = Array.isArray(upstream.data?.destinations)
        ? upstream.data.destinations
        : [];
      // Untrustworthy rows are dropped, not defaulted.
      const destinations = rawDestinations
        .map(normalizeViatorDestination)
        .filter((d): d is NormalizedViatorDestination => d !== null);

      const now = new Date().toISOString();
      upsertCacheEntry(cacheKey, { destinations }, DESTINATIONS_TTL_SEC, upstream.trackingId);

      return json(
        {
          provider: "viator",
          destinations,
          totalCount: destinations.length,
          fetchedAt: now,
          cacheStatus: "miss",
        },
        200,
        headers,
      );
    } catch (e: unknown) {
      if (staleFallback) {
        return json(
          {
            provider: "viator",
            destinations: staleFallback.payload.destinations ?? [],
            fetchedAt: staleFallback.fetched_at,
            cacheStatus: "stale",
          },
          200,
          headers,
        );
      }
      return handleUpstreamError(e as ViatorUpstreamError, headers);
    }
  }

  // ═══════════════════════════════════════════════════════════
  // ACTION: tags (placeholder)
  // ═══════════════════════════════════════════════════════════

  if (action === "tags") {
    const parsed = tagsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return publicError("Invalid request", 400, headers, {
        details: parsed.error.flatten(),
      });
    }

    const cacheKey = await generateCacheKey("viator", "tags", {});
    const cacheResult = await getCachedEntry(cacheKey, TAGS_TTL_SEC);

    if (cacheResult.type === "hit" && cacheResult.entry) {
      return json(
        {
          provider: "viator",
          tags: cacheResult.entry.payload.tags ?? [],
          fetchedAt: cacheResult.entry.fetched_at,
          cacheStatus: "hit",
        },
        200,
        headers,
      );
    }

    const staleFallback = cacheResult.type === "stale" ? cacheResult.entry : null;

    try {
      const upstream = await viatorGet<{ tags?: ViatorTagRaw[] }>("/products/tags");

      const rawTags = Array.isArray(upstream.data?.tags) ? upstream.data.tags : [];
      // Real provider taxonomy only — no popularity, no product counts, no
      // BookingsFinder marketing labels.
      const tags = rawTags
        .map(normalizeViatorTag)
        .filter((t): t is NormalizedViatorTag => t !== null);

      const now = new Date().toISOString();
      upsertCacheEntry(cacheKey, { tags }, TAGS_TTL_SEC, upstream.trackingId);

      return json(
        {
          provider: "viator",
          tags,
          totalCount: tags.length,
          fetchedAt: now,
          cacheStatus: "miss",
        },
        200,
        headers,
      );
    } catch (e: unknown) {
      if (staleFallback) {
        return json(
          {
            provider: "viator",
            tags: staleFallback.payload.tags ?? [],
            fetchedAt: staleFallback.fetched_at,
            cacheStatus: "stale",
          },
          200,
          headers,
        );
      }
      return handleUpstreamError(e as ViatorUpstreamError, headers);
    }
  }

  return publicError(`Unknown action: ${action}`, 400, headers);
});
