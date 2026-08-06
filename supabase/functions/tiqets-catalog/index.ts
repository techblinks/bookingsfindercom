/**
 * Validate, upgrade, and hostname-check a Tiqets image URL.
 * Imgix query parameters (£?auto=format, £?w=400 etc.) are preserved.
 * Only the documented Tiqets CDN hostname and known variants are allowed.
 */
function safeImageUrl(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  let normalised = raw.trim();
  if (normalised.startsWith("//")) normalised = "https:" + normalised;
  // Must be HTTPS
  if (!normalised.startsWith("https://")) return "";
  try {
    const parsed = new URL(normalised);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname;
    // Documented Tiqets image CDN + common variants
    const ALLOWED_HOSTS = [
      "aws-tiqets-cdn.imgix.net",
    ];
    const isAllowed = ALLOWED_HOSTS.some((h) => host === h || host.endsWith("." + h));
    if (!isAllowed) {
      console.warn(`[tiqets] image host rejected: ${host}`);
      return "";
    }
    // Imgix query params are safe — preserve them
    return normalised;
  } catch {
    return "";
  }
}

/**
 * Select the best image variant for card display.
 * Priority: medium > large > small > extra_large.
 */
function selectImageVariant(img: Record<string, unknown>): { url: string; variant: string | null } {
  const variants = ["medium", "large", "small", "extra_large"] as const;
  for (const v of variants) {
    const u = img[v];
    if (typeof u === "string" && u.trim()) {
      const safe = safeImageUrl(u);
      if (safe) return { url: safe, variant: v };
    }
  }
  return { url: "", variant: null };
}

/**
 * Build image diagnostics for admin troubleshooting.
 * Inspects raw image objects — never logs full URLs, query params, or tokens.
 */
function buildImageDiagnostics(rawProducts: unknown): Record<string, unknown> {
  const products = Array.isArray(rawProducts) ? rawProducts : [];
  const rawImage: Record<string, unknown> | undefined =
    products?.[0] && typeof products[0] === "object" && products[0] !== null
      ? (products[0] as { images?: Array<Record<string, unknown>> }).images?.[0]
      : undefined;

  const hasImageData = rawImage != null;
  const imageContainers = products.flatMap((p: any) => p?.images || []);
  const imageCount = imageContainers.length;
  const firstImageFieldNames = rawImage ? Object.keys(rawImage) : [];
  const selected = rawImage ? selectImageVariant(rawImage) : { url: "", variant: null };
  let protocol: string | null = null;
  let hostname: string | null = null;
  if (selected.url) {
    try { const p = new URL(selected.url); protocol = p.protocol; hostname = p.hostname; } catch {}
  }

  return {
    hasImageData,
    imageCount,
    firstImageFieldNames,
    selectedVariant: selected.variant,
    selectedImageProtocol: protocol,
    selectedImageHostname: hostname,
    selectedImageHasCredit: typeof rawImage?.credit === "string" && rawImage.credit.trim().length > 0,
  };
}

/**
 * tiqets-catalog — Admin-only Tiqets Content API proxy.
 *
 * POST only. JWT-verified. Admin-role check.
 * Proxies the Tiqets Content API (Essential tier: Content + Availability & Pricing).
 * No Booking API, no orders, no payments.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { validateRequest } from "../_shared/validation.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  tiqetsRequest,
  tiqetsHealthCheck,
} from "../_shared/tiqets-client.ts";
import type { TiqetsError } from "../_shared/tiqets-client.ts";

// ═══════════════════════════════════════════════════════════════
// Validation schemas
// ═══════════════════════════════════════════════════════════════

const SUPPORTED_LANGUAGES = ["en", "nl", "fr", "de", "it", "es", "pt", "ja", "zh"] as const;

const healthSchema = z.object({
  action: z.literal("health"),
});

const productsSchema = z.object({
  action: z.literal("products"),
  language: z.enum(SUPPORTED_LANGUAGES).default("en"),
  page: z.number().int().min(1).default(1),
  page_size: z.number().int().min(1).max(20).default(10),
  destination_id: z.number().int().positive().optional(),
  sale_status: z.enum(["on_sale", "sold_out", "cancelled"]).optional(),
});

type ActionBody = z.infer<typeof healthSchema> | z.infer<typeof productsSchema>;

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
// Normalization (only fields genuinely returned by the API)
// ═══════════════════════════════════════════════════════════════

interface TiqetsProductRaw {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  destination?: { id: number; name: string; country?: string };
  venue?: { id: number; name: string; city?: string };
  sale_status?: string;
  rating?: { average?: number; count?: number };
  wheelchair_accessible?: boolean;
  skip_the_line?: boolean;
  min_price?: { amount?: number; currency?: string };
  product_url?: string;
  images?: Array<{
    small?: string;
    medium?: string;
    large?: string;
    extra_large?: string;
    alt_text?: string;
    credit?: string;
  }>;
}

interface TiqetsPaginationRaw {
  count: number;
  next: string | null;
  previous: string | null;
}

interface TiqetsProductsResponse {
  products?: TiqetsProductRaw[];
  results?: TiqetsProductRaw[];
  count?: number;
  next?: string | null;
  previous?: string | null;
}

interface BookingsFinderProduct {
  id: string;
  title: string;
  tagline: string | null;
  city: string | null;
  country: string | null;
  venue: string | null;
  saleStatus: string | null;
  rating: { average: number | null; count: number | null };
  wheelchairAccessible: boolean | null;
  skipTheLine: boolean | null;
  minPrice: { amount: number | null; currency: string | null };
  productUrl: string | null;
  images: Array<{
    smallUrl: string;
    mediumUrl: string;
    largeUrl: string;
    extraLargeUrl: string;
    altText: string | null;
    credit: string | null;
  }>;
}

function normalizeProduct(raw: TiqetsProductRaw): BookingsFinderProduct {
  return {
    id: typeof raw.id === "number" ? String(raw.id) : (raw.id || ""),
    title: raw.title || "",
    tagline: raw.tagline || null,
    city: raw.venue?.city || raw.destination?.name || null,
    country: raw.destination?.country || null,
    venue: raw.venue?.name || null,
    saleStatus: raw.sale_status || null,
    rating: {
      average: raw.rating?.average ?? null,
      count: raw.rating?.count ?? null,
    },
    wheelchairAccessible: raw.wheelchair_accessible ?? null,
    skipTheLine: raw.skip_the_line ?? null,
    minPrice: {
      amount: raw.min_price?.amount ?? null,
      currency: raw.min_price?.currency ?? null,
    },
    productUrl: raw.product_url || null,
    images: (raw.images || []).map((img) => ({
      smallUrl: safeImageUrl(img.small),
      mediumUrl: safeImageUrl(img.medium),
      largeUrl: safeImageUrl(img.large),
      extraLargeUrl: safeImageUrl(img.extra_large),
      altText: img.alt_text || null,
      credit: img.credit || null,
    })),
  };
}

// ═══════════════════════════════════════════════════════════════
// In-memory non-durable cache (admin POC only — not production)
// ═══════════════════════════════════════════════════════════════

const productCache = new Map<string, { data: BookingsFinderProduct[]; pagination: TiqetsPaginationRaw; storedAt: number }>();
const CACHE_TTL_MS = 30_000; // 30 seconds

function cacheKey(body: z.infer<typeof productsSchema>): string {
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

  // ── Auth ──
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

  const action = (rawBody as Record<string, unknown>)?.action;
  if (!action || typeof action !== "string") {
    return new Response(
      JSON.stringify({ error: "action is required (health | products)" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  // ── Health ──
  if (action === "health") {
    const parsed = healthSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid health request", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
  if (action === "products") {
    const parsed = productsSchema.safeParse(rawBody);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid product request", details: parsed.error.flatten() }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = parsed.data;
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
  }

  return new Response(
    JSON.stringify({ error: `Unknown action: ${action}` }),
    { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
