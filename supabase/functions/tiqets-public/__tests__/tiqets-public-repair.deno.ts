/**
 * T2C-B2A regression tests for the tiqets-public runtime repair.
 *
 * These are Deno tests (not Vitest): the function imports https:// URLs
 * (zod, supabase-js) that the repo's Vitest runner cannot resolve.
 *
 * Run with:
 *   npx deno test --allow-env supabase/functions/tiqets-public/__tests__/tiqets-public-repair.deno.ts
 *
 * Coverage: destinations/catalogue-search no undefined-body crash,
 * featured no onSale ReferenceError + real diagnostics, search schema
 * (city_id / city_name / query / refine), CORS on every response path,
 * OPTIONS allowlist (production / www / preview-not-allowlisted).
 */

import { assertEquals, assert } from "jsr:@std/assert@1";

// ── Environment must exist before the module import reads it ──
Deno.env.set("SUPABASE_URL", "https://example.supabase.co");
Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "test-service-role");
Deno.env.set("TIQETS_API_TOKEN", "test-tiqets-token");
Deno.env.set("TIQETS_API_BASE_URL", "https://api.tiqets.com/v2");

// ── Capture the Deno.serve handler instead of starting a real server ──
let handler: ((req: Request) => Promise<Response>) | null = null;
(Deno as unknown as { serve: unknown }).serve = (
  h: (req: Request) => Promise<Response>,
): unknown => {
  handler = h;
  return {};
};

// ── fetch stub: Tiqets upstream vs Supabase REST ──
let upstreamMode: "ok" | "unauthorized" = "ok";
let upstreamProducts: unknown[] = [];
let capturedUpstreamUrl: string | null = null;

globalThis.fetch = ((
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> => {
  let url: string;
  if (typeof input === "string") url = input;
  else if (input instanceof Request) url = input.url;
  else url = String(input);

  if (url.startsWith("https://api.tiqets.com")) {
    capturedUpstreamUrl = url;
    if (upstreamMode === "unauthorized") {
      return Promise.resolve(
        new Response('{"error":"unauthorized"}', { status: 401 }),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({
          products: upstreamProducts,
          pagination: {
            total: upstreamProducts.length,
            page: 1,
            page_size: upstreamProducts.length,
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
            "x-request-id": "upstream-req-123",
          },
        },
      ),
    );
  }

  // Supabase REST: reads -> [] (empty), writes -> {}
  const method = (init?.method || "GET").toUpperCase();
  if (method === "GET") {
    return Promise.resolve(
      new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      }),
    );
  }
  return Promise.resolve(
    new Response("{}", {
      status: 201,
      headers: { "content-type": "application/json" },
    }),
  );
}) as typeof fetch;

// ── Import the module AFTER stubbing env / serve / fetch ──
await import("../index.ts");

assert(handler !== null, "Deno.serve handler must be captured");

const ORIGIN = "https://bookingsfinder.com";
const URL = "https://bookingsfinder.com/functions/v1/tiqets-public";
const PREVIEW = "https://feat-things-canonical-url-migration-bookingsfindercom.bookingsfinder.workers.dev";

function post(body: unknown, origin: string = ORIGIN): Promise<Response> {
  assert(handler, "handler required");
  return handler(
    new Request(URL, {
      method: "POST",
      headers: { Origin: origin, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

function options(origin: string): Promise<Response> {
  assert(handler, "handler required");
  return handler(
    new Request(URL, { method: "OPTIONS", headers: { Origin: origin } }),
  );
}

function acao(res: Response): string | null {
  return res.headers.get("Access-Control-Allow-Origin");
}

// ── OPTIONS / CORS ──

Deno.test("OPTIONS: production origin returns 204 with echoed ACAO", async () => {
  const res = await options("https://bookingsfinder.com");
  assertEquals(res.status, 204);
  assertEquals(acao(res), "https://bookingsfinder.com");
});

Deno.test("OPTIONS: www production origin returns echoed ACAO", async () => {
  const res = await options("https://www.bookingsfinder.com");
  assertEquals(res.status, 204);
  assertEquals(acao(res), "https://www.bookingsfinder.com");
});

Deno.test("OPTIONS: Cloudflare branch-preview origin is NOT allowlisted (falls back)", async () => {
  const res = await options(PREVIEW);
  assertEquals(res.status, 204);
  assertEquals(acao(res), "https://bookingsfinder.com");
  assert(acao(res) !== PREVIEW, "preview origin must not be echoed");
});

// ── destinations ──

Deno.test("destinations: POST {action:destinations} returns 200 + CORS (no ReferenceError)", async () => {
  const res = await post({ action: "destinations" });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assert(Array.isArray(body.destinations), "destinations must be an array");
  assertEquals(body.cacheStatus, "miss");
});

// ── catalogue-search ──

Deno.test("catalogue-search: reaches DB path (no undefined-body crash)", async () => {
  const res = await post({ action: "catalogue-search", query: "colosseum" });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assert(Array.isArray(body.products), "products must be an array");
});

// ── featured ──

Deno.test("featured: successful response has real diagnostics and availability filtering", async () => {
  upstreamMode = "ok";
  upstreamProducts = [
    { id: "1", title: "Available Tour", sale_status: "available" },
    { id: "2", title: "Unavailable Tour", sale_status: "unavailable" },
  ];
  const res = await post({ action: "featured" });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assertEquals(body.products.length, 1, "unavailable product must be filtered");
  assertEquals(body.products[0].id, "1");
  assertEquals(body.diagnostics.upstreamRawCount, 2);
  assertEquals(body.diagnostics.normalizedCount, 2);
  assertEquals(body.diagnostics.filteredOnSaleCount, 1);
  assertEquals(body.diagnostics.saleStatusCounts, { available: 1, unavailable: 1 });
  assertEquals(body.cacheStatus, "miss");
});

// ── search ──

Deno.test("search: city_name maps to upstream city_name (official param)", async () => {
  upstreamMode = "ok";
  upstreamProducts = [{ id: "1", title: "Rome Tour", sale_status: "available" }];
  const res = await post({
    action: "search",
    city_name: "Rome",
    page: 1,
    page_size: 24,
    sort: "popularity_desc",
  });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assertEquals(body.products.length, 1);
  const upstream = capturedUpstreamUrl ?? "";
  assert(upstream.includes("city_name=Rome"), "city_name must map to upstream city_name");
  assert(!upstream.includes("destination="), "legacy destination param must not be sent");
  assert(!upstream.includes("ordering="), "ordering must not be sent");
  assert(!upstream.includes("sort="), "sort must not be sent (fail-closed)");
});

Deno.test("search: destination_id is not a public parameter (400 refine)", async () => {
  const res = await post({ action: "search", destination_id: 123, page: 1, page_size: 24 });
  assertEquals(res.status, 400);
  assertEquals(acao(res), ORIGIN);
});

Deno.test("search: city_id accepted and mapped upstream as city_id", async () => {
  upstreamMode = "ok";
  upstreamProducts = [{ id: "10", title: "Vatican", sale_status: "available" }];
  const res = await post({ action: "search", city_id: 71631, page: 1, page_size: 24 });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assertEquals(body.products.length, 1);
  assert(
    capturedUpstreamUrl !== null && capturedUpstreamUrl.includes("city_id=71631"),
    "city_id must reach upstream",
  );
});

Deno.test("search: invalid (non-positive) city_id rejected with 400 + CORS", async () => {
  const res = await post({ action: "search", city_id: -5, page: 1, page_size: 24 });
  assertEquals(res.status, 400);
  assertEquals(acao(res), ORIGIN);
});

Deno.test("search: no destination/query/city -> 400 (refine) with CORS", async () => {
  const res = await post({ action: "search", page: 1, page_size: 24 });
  assertEquals(res.status, 400);
  assertEquals(acao(res), ORIGIN);
});

Deno.test("search: query maps to upstream query (official full-text param)", async () => {
  upstreamMode = "ok";
  upstreamProducts = [{ id: "20", title: "Vatican Museums", sale_status: "available" }];
  const res = await post({ action: "search", query: "vatican", page: 1, page_size: 24 });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assertEquals(body.products.length, 1);
  const upstream = capturedUpstreamUrl ?? "";
  assert(upstream.includes("query=vatican"), "query must map to upstream query");
  assert(!upstream.includes("search=vatican"), "legacy search param must not be sent");
});

Deno.test("search: official pagination.total/page/page_size surface as public count/total", async () => {
  upstreamMode = "ok";
  upstreamProducts = [
    { id: "1", title: "Rome A", sale_status: "available" },
    { id: "2", title: "Rome B", sale_status: "available" },
  ];
  const res = await post({ action: "search", city_id: 71631, page: 1, page_size: 24 });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assertEquals(body.pagination.total, 2);
  assertEquals(body.pagination.count, 2);
  assertEquals(body.pagination.page, 1);
  assertEquals(body.pagination.page_size, 2);
});

Deno.test("search: upstream auth failure -> 502 retaining CORS headers", async () => {
  upstreamMode = "unauthorized";
  const res = await post({ action: "search", city_name: "Rome", page: 1, page_size: 24 });
  assertEquals(res.status, 502);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assertEquals(body.error, "Upstream authentication failed");
});

Deno.test("unknown action -> 400 with CORS", async () => {
  const res = await post({ action: "nope" });
  assertEquals(res.status, 400);
  assertEquals(acao(res), ORIGIN);
});
// ── sale-status diagnostics (T2D-B2B-3C) ──

Deno.test("featured: saleStatusCounts reveals raw provider statuses (incl. (missing))", async () => {
  upstreamMode = "ok";
  upstreamProducts = [
    { id: "1", title: "A", sale_status: "available" },
    { id: "2", title: "B", sale_status: "available" },
    { id: "3", title: "C", sale_status: "unavailable" },
    { id: "4", title: "D", sale_status: null },
  ];
  const res = await post({ action: "featured" });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  // Aggregate diagnostics reflect exactly what the provider sent.
  assertEquals(body.diagnostics.saleStatusCounts, {
    available: 2,
    unavailable: 1,
    "(missing)": 1,
  });
  // Only products with sale_status "available" survive the predicate.
  assertEquals(body.diagnostics.upstreamRawCount, 4);
  assertEquals(body.diagnostics.normalizedCount, 4);
  assertEquals(body.diagnostics.filteredOnSaleCount, 2);
  assertEquals(body.products.length, 2);
  assertEquals(body.products[0].id, "1");
  assertEquals(body.products[1].id, "2");
});

Deno.test("featured: diagnostics expose counts only (no ids/titles/urls/tokens)", async () => {
  upstreamMode = "ok";
  upstreamProducts = [
    {
      id: "id-1",
      title: "TITLE-SECRET",
      product_url: "https://tiqets.com/URL-SECRET",
      product_checkout_url: "https://tiqets.com/CHECKOUT-SECRET",
      token: "TOKEN-SECRET",
      sale_status: "available",
    },
    { id: "id-2", title: "Other", sale_status: "unavailable" },
  ];
  const res = await post({ action: "featured" });
  assertEquals(res.status, 200);
  const body = await res.json();
  const diagJson = JSON.stringify(body.diagnostics);
  assert(!diagJson.includes("SECRET"), "diagnostics must not contain product data");
  assert(!diagJson.includes("tiqets.com"), "diagnostics must not contain URLs");
});

Deno.test("search: fresh response includes sale-status aggregate diagnostics", async () => {
  upstreamMode = "ok";
  upstreamProducts = [
    { id: "1", title: "Rome", sale_status: "available" },
    { id: "2", title: "Vatican", sale_status: "on_sale" },
  ];
  const res = await post({ action: "search", city_name: "Rome", page: 1, page_size: 24 });
  assertEquals(res.status, 200);
  assertEquals(acao(res), ORIGIN);
  const body = await res.json();
  assertEquals(body.products.length, 1, "only available survives the availability predicate");
  assertEquals(body.diagnostics.upstreamRawCount, 2);
  assertEquals(body.diagnostics.normalizedCount, 2);
  assertEquals(body.diagnostics.filteredOnSaleCount, 1);
  assertEquals(body.diagnostics.saleStatusCounts, { available: 1, on_sale: 1 });
});
