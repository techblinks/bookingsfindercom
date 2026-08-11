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
import {
  normalizeProduct,
  safeImageUrl,
  selectImageVariant,
  buildImageDiagnostics,
  type TiqetsProductRaw,
  type NormalizedProduct,
  type TiqetsPaginationRaw,
} from "../_shared/tiqets-normalizer.ts";

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

  // ── Refresh Catalogue ── admin-only catalogue sync
  if (action === "refresh-catalogue") {
    try {
      var maxPages = Math.min(parsed.data.max_pages || 5, 10);
      var pageSize = 20;
      var provider = "tiqets";

      // Read checkpoint
      var { data: syncState } = await supabaseAdmin.from("experience_catalog_sync_state").select("*").eq("provider", provider).maybeSingle();
      var startPage = syncState?.next_page || 1;
      var pagesProcessed = 0;
      var productsObserved = 0;
      var seenFingerprints = [];

      // Update status to syncing
      await supabaseAdmin.from("experience_catalog_sync_state").upsert({ provider, status: "syncing", started_at: new Date().toISOString() }, { onConflict: "provider" });

      for (var page = startPage; page < startPage + maxPages; page++) {
        pagesProcessed++;

        var upstream = await tiqetsRequest({ endpoint: "/products", params: new URLSearchParams({ lang: "en", page: String(page), page_size: String(pageSize) }) });
        var rawProducts = upstream.data.products || [];

        if (!Array.isArray(rawProducts) || rawProducts.length === 0) {
          // Stop: empty page → completed
          await supabaseAdmin.from("experience_catalog_sync_state").upsert({ provider, status: "completed", next_page: 1, pages_scanned: pagesProcessed, products_observed: productsObserved, completed_at: new Date().toISOString(), last_success_at: new Date().toISOString() }, { onConflict: "provider" });
          break;
        }

        // Loop detection: check fingerprint of first 3 product IDs
        var fp = rawProducts.slice(0, 3).map(function(p) { return p.id; }).join(",");
        if (seenFingerprints.indexOf(fp) >= 0) {
          await supabaseAdmin.from("experience_catalog_sync_state").upsert({ provider, status: "loop_detected", next_page: page, pages_scanned: pagesProcessed, products_observed: productsObserved, last_success_at: new Date().toISOString() }, { onConflict: "provider" });
          break;
        }
        seenFingerprints.push(fp);

        // Normalize and upsert
        var normalized = rawProducts.map(normalizeProduct);
        var dbProducts = normalized.map(function(p) {
          return {
            provider: provider,
            provider_product_id: p.id,
            title: p.title || "",
            city_id: p.cityId ? String(p.cityId) : null,
            city_name: p.city || null,
            country_id: p.countryId ? String(p.countryId) : null,
            country_name: p.country || null,
            tagline: p.tagline || null,
            description: null,
            venue_name: p.venue?.name || null,
            rating: p.rating?.average || null,
            review_count: p.rating?.count || null,
            price_amount: p.minPrice?.amount || null,
            price_currency: p.minPrice?.currency || null,
            image_url: p.image?.url || null,
            images: JSON.stringify(p.images || []),
            tag_ids: JSON.stringify(p.tagIds || []),
            wheelchair_accessible: p.wheelchairAccessible,
            skip_the_line: p.skipTheLine,
            product_url: p.productUrl || null,
            sale_status: p.saleStatus || null,
            last_seen_at: new Date().toISOString(),
          };
        });

        var { error: upsertErr } = await supabaseAdmin.rpc("upsert_experience_products", { p_provider: provider, p_products: dbProducts });
        if (upsertErr) console.error("[refresh-catalogue] upsert error:", upsertErr);

        // Derive destinations
        var destMap = {};
        for (var d = 0; d < normalized.length; d++) {
          var p = normalized[d];
          if (!p.cityId || !p.city) continue;
          var key = String(p.cityId);
          if (!destMap[key]) {
            destMap[key] = {
              provider: provider,
              destination_id: key,
              name: p.city,
              country_id: p.countryId ? String(p.countryId) : null,
              country: p.country || null,
              country_code: null,
              slug: (p.country ? p.country.toLowerCase().replace(/\s+/g,"-") : "") + "/" + p.city.toLowerCase().replace(/\s+/g,"-"),
              last_seen_at: new Date().toISOString(),
            };
          }
        }
        var destArray = Object.values(destMap);
        if (destArray.length > 0) {
          for (var dt = 0; dt < destArray.length; dt++) {
            await supabaseAdmin.from("experience_destinations").upsert(destArray[dt], { onConflict: "provider, destination_id" });
          }
        }

        productsObserved += rawProducts.length;

        // Short page (< pageSize) → completed
        if (rawProducts.length < pageSize) {
          await supabaseAdmin.from("experience_catalog_sync_state").upsert({ provider, status: "completed", next_page: 1, pages_scanned: pagesProcessed, products_observed: productsObserved, completed_at: new Date().toISOString(), last_success_at: new Date().toISOString() }, { onConflict: "provider" });
          break;
        }

        // Last page in this batch
        if (page === startPage + maxPages - 1) {
          await supabaseAdmin.from("experience_catalog_sync_state").upsert({ provider, status: "partial", next_page: page + 1, pages_scanned: pagesProcessed, products_observed: productsObserved, last_success_at: new Date().toISOString() }, { onConflict: "provider" });
        } else {
          await supabaseAdmin.from("experience_catalog_sync_state").upsert({ provider, status: "syncing", next_page: page + 1, pages_scanned: pagesProcessed, products_observed: productsObserved, last_success_at: new Date().toISOString() }, { onConflict: "provider" });
        }
      }

      return new Response(JSON.stringify({ ok: true, pages_processed: pagesProcessed, products_observed: productsObserved }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    } catch(err) {
      console.error("[refresh-catalogue] error:", err);
      return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
  }
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