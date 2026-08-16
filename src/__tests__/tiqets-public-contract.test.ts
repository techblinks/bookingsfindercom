/**
 * T3B-INT-PB2A — tiqets-public Content API contract repair tests.
 *
 * The deployed tiqets-public Edge Function is Deno and cannot be imported by
 * vitest, so — following the repo's established edge-function test pattern
 * (see viator-public.test.ts / tiqets.test.ts) — this file combines:
 *
 *   1. Source-string assertions against supabase/functions/tiqets-public/index.ts
 *      proving the outgoing /v2/products wire params conform to the official
 *      Tiqets Distributor API v2.7.0 contract (PB1 audit), and
 *   2. Exact inline replications of the param builder / cache key / pagination
 *      helpers (mirroring the deployed source) proving behaviour.
 *
 * The replication MUST mirror the source: the source assertions below guard
 * against drift (e.g. a forbidden `params.set("search", ...)` line would fail
 * the corresponding source check).
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { createHash } from "node:crypto";

const src = readFileSync("supabase/functions/tiqets-public/index.ts", "utf8");

// ═══════════════════════════════════════════════════════════════════
// 1. Source-string contract assertions (upstream wire params)
// ═══════════════════════════════════════════════════════════════════

describe("PB2A source contract — official /v2/products wiring", () => {
  it("A. city_id is accepted and forwarded as upstream city_id", () => {
    expect(src).toMatch(/city_id: z\.number\(\)\.int\(\)\.positive\(\)\.optional\(\)/);
    expect(src).toContain('params.set("city_id", String(body.city_id))');
  });

  it("B. city_name is forwarded as upstream city_name (official param)", () => {
    expect(src).toMatch(/city_name: z\s*\n\s*\.string\(\)/);
    expect(src).toContain('params.set("city_name", body.city_name)');
  });

  it("C. query is forwarded as upstream query (official param)", () => {
    expect(src).toContain('params.set("query", body.query)');
    expect(src).not.toContain('params.set("search"');
  });

  it("D. destination_id is NOT forwarded and NOT in the public search schema", () => {
    expect(src).not.toContain('params.set("destination_id"');
    // The search schema must not accept a destination_id field.
    expect(src).not.toMatch(/action: z\.literal\("search"\)[\s\S]{0,400}destination_id: z/);
  });

  it("E. destination (legacy free-text city param) is NOT forwarded", () => {
    expect(src).not.toContain('params.set("destination"');
  });

  it("F. search is NOT forwarded", () => {
    expect(src).not.toContain('params.set("search"');
  });

  it("G. ordering is NOT forwarded and SORT_ORDERING mapping is removed", () => {
    expect(src).not.toContain('params.set("ordering"');
    expect(src).not.toMatch(/SORT_ORDERING\s*=/);
    // Sort is fail-closed: no sort value is sent upstream.
    expect(src).not.toContain('params.set("sort"');
  });

  it("H. price_min / price_max are NOT forwarded", () => {
    expect(src).not.toContain('params.set("price_min"');
    expect(src).not.toContain('params.set("price_max"');
  });

  it("I. feature/accessibility params are NOT forwarded", () => {
    for (const param of [
      "skip_line",
      "smartphone_ticket",
      "instant_ticket_delivery",
      "wheelchair_access",
    ]) {
      expect(src).not.toContain(`params.set("${param}"`);
    }
  });

  it("J. page/page_size/lang/currency/min_rating remain forwarded correctly", () => {
    expect(src).toContain("page: String(body.page)");
    expect(src).toContain("page_size: String(body.page_size)");
    expect(src).toContain("lang: body.lang");
    expect(src).toContain("currency: body.currency");
    expect(src).toContain('params.set("min_rating", String(body.min_rating))');
  });

  it("K. genuine numeric tag IDs serialize as repeated tag_id", () => {
    expect(src).toMatch(/tag_ids: z\.array\(z\.number\(\)\.int\(\)\.positive\(\)\)/);
    expect(src).toContain('params.append("tag_id", String(tagId))');
    expect(src).not.toContain('params.set("tag_ids"');
  });

  it("L. official pagination.total/page/page_size are parsed", () => {
    expect(src).toMatch(/pagination\?: \{\s*total\?: number;\s*page\?: number;\s*page_size\?: number;\s*\}/);
    expect(src).toContain("pagination?.total");
    expect(src).toContain("pagination?.page");
    expect(src).toContain("pagination?.page_size");
    expect(src).toContain("toPublicPagination");
  });

  it("M. sale-status fail-closed filter is unchanged in the search path", () => {
    expect(src).toContain("isTiqetsSaleStatusAvailable(p.saleStatus)");
    expect(src).toContain("safeProducts = products.filter");
  });

  it("N. cache key derives from all search params incl. city_id (no destination_id normalization)", () => {
    expect(src).toMatch(/generateCacheKey\("search", searchParams/);
    expect(src).not.toContain("searchParams.destination_id");
  });
});

// ═══════════════════════════════════════════════════════════════════
// 2. Behavioural replications (must mirror the deployed source)
// ═══════════════════════════════════════════════════════════════════

/** Exact replication of the search action's upstream /v2/products builder. */
function buildUpstreamParams(body: Record<string, unknown>): URLSearchParams {
  const params = new URLSearchParams({
    lang: body.lang as string,
    page: String(body.page),
    page_size: String(body.page_size),
    currency: body.currency as string,
  });

  if (body.city_id !== undefined) params.set("city_id", String(body.city_id));
  if (body.city_name) params.set("city_name", body.city_name as string);
  if (body.query) params.set("query", body.query as string);
  if (body.min_rating !== undefined) params.set("min_rating", String(body.min_rating));

  if (body.tag_ids && (body.tag_ids as number[]).length > 0) {
    for (const tagId of body.tag_ids as number[]) {
      params.append("tag_id", String(tagId));
    }
  }

  return params;
}

/** Exact replication of generateCacheKey (normalize + sort + SHA-256). */
async function generateCacheKey(
  action: string,
  params: Record<string, unknown>,
): Promise<string> {
  const normalized: Record<string, unknown> = { action };
  const sortedKeys = Object.keys(params).sort();
  for (const key of sortedKeys) {
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
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

interface UpstreamPagination {
  total?: number;
  page?: number;
  page_size?: number;
}

/** Exact replication of buildSearchCachePayload. */
function buildSearchCachePayload(
  products: unknown[],
  upstream: { pagination?: UpstreamPagination },
) {
  const pagination = upstream.pagination;
  return {
    products,
    pagination: {
      total: pagination?.total ?? products.length,
      page: pagination?.page ?? 1,
      page_size: pagination?.page_size ?? products.length,
    },
  };
}

/** Exact replication of toPublicPagination (legacy {count,next,previous} tolerated). */
function toPublicPagination(p: unknown) {
  if (!p) return null;
  const raw = p as {
    total?: number;
    count?: number;
    page?: number;
    page_size?: number;
  };
  const total = typeof raw.total === "number" ? raw.total : (typeof raw.count === "number" ? raw.count : 0);
  const page = typeof raw.page === "number" ? raw.page : 1;
  const pageSize = typeof raw.page_size === "number" ? raw.page_size : 0;
  return { count: total, total, page, page_size: pageSize };
}

const BASE = { page: 1, page_size: 24, lang: "en", currency: "AUD" };

describe("PB2A behaviour — upstream param builder", () => {
  it("A. city_id 71631 -> upstream city_id=71631", () => {
    const p = buildUpstreamParams({ ...BASE, city_id: 71631 });
    expect(p.get("city_id")).toBe("71631");
  });

  it("B. city_name Rome -> upstream city_name=Rome", () => {
    const p = buildUpstreamParams({ ...BASE, city_name: "Rome" });
    expect(p.get("city_name")).toBe("Rome");
  });

  it("C. query vatican -> upstream query=vatican", () => {
    const p = buildUpstreamParams({ ...BASE, query: "vatican" });
    expect(p.get("query")).toBe("vatican");
  });

  it("D. destination_id passed by a legacy caller is never forwarded", () => {
    const p = buildUpstreamParams({ ...BASE, city_id: 71631, destination_id: 511 } as Record<string, unknown>);
    expect(p.toString()).not.toContain("destination_id");
    expect(p.get("city_id")).toBe("71631");
  });

  it("E. destination is never forwarded", () => {
    const p = buildUpstreamParams({ ...BASE, city_name: "Rome", destination: "Rome" } as Record<string, unknown>);
    expect(p.toString()).not.toContain("destination=");
    expect(p.get("city_name")).toBe("Rome");
  });

  it("F. search is never forwarded", () => {
    const p = buildUpstreamParams({ ...BASE, query: "vatican", search: "vatican" } as Record<string, unknown>);
    expect(p.toString()).not.toContain("search");
    expect(p.get("query")).toBe("vatican");
  });

  it("G. ordering is never forwarded (sort is fail-closed)", () => {
    const p = buildUpstreamParams({ ...BASE, city_id: 71631, sort: "popularity_desc" } as Record<string, unknown>);
    expect(p.toString()).not.toContain("ordering");
    expect(p.toString()).not.toContain("sort=");
  });

  it("H. price_min / price_max are never forwarded", () => {
    const p = buildUpstreamParams({ ...BASE, city_id: 71631, price_min: 100, price_max: 500 } as Record<string, unknown>);
    expect(p.toString()).not.toContain("price_min");
    expect(p.toString()).not.toContain("price_max");
  });

  it("I. feature/accessibility params are never forwarded", () => {
    const p = buildUpstreamParams({
      ...BASE,
      city_id: 71631,
      skip_line: true,
      smartphone_ticket: true,
      instant_ticket_delivery: true,
      wheelchair_access: true,
    } as Record<string, unknown>);
    const s = p.toString();
    for (const param of ["skip_line", "smartphone_ticket", "instant_ticket_delivery", "wheelchair_access"]) {
      expect(s).not.toContain(param);
    }
  });

  it("J. page/page_size/lang/currency/min_rating remain correct", () => {
    const p = buildUpstreamParams({ ...BASE, page: 2, page_size: 24, min_rating: 4 });
    expect(p.get("page")).toBe("2");
    expect(p.get("page_size")).toBe("24");
    expect(p.get("lang")).toBe("en");
    expect(p.get("currency")).toBe("AUD");
    expect(p.get("min_rating")).toBe("4");
  });

  it("K. genuine numeric tag IDs serialize as repeated tag_id", () => {
    const p = buildUpstreamParams({ ...BASE, city_id: 71631, tag_ids: [3, 1, 2] });
    expect(p.getAll("tag_id")).toEqual(["3", "1", "2"]);
    expect(p.toString()).not.toContain("tag_ids");
  });
});

describe("PB2A behaviour — pagination truth", () => {
  it("L1. official pagination.total/page/page_size parse correctly", () => {
    const payload = buildSearchCachePayload([{ id: "1" } as never, { id: "2" } as never], {
      pagination: { total: 87, page: 2, page_size: 24 },
    });
    expect(payload.pagination).toEqual({ total: 87, page: 2, page_size: 24 });
    expect(toPublicPagination(payload.pagination)).toEqual({
      count: 87,
      total: 87,
      page: 2,
      page_size: 24,
    });
  });

  it("L2. missing upstream pagination falls back to the returned page count, never fabricated", () => {
    const payload = buildSearchCachePayload([{ id: "1" } as never], {});
    expect(payload.pagination.total).toBe(1);
    expect(toPublicPagination(payload.pagination)?.count).toBe(1);
  });

  it("L3. legacy cached {count,next,previous} shape is tolerated", () => {
    const legacy = { count: 40, next: "url", previous: null };
    expect(toPublicPagination(legacy)).toEqual({ count: 40, total: 40, page: 1, page_size: 0 });
    expect(toPublicPagination(null)).toBeNull();
  });
});

describe("PB2A behaviour — sale-status fail-closed (unchanged)", () => {
  function isTiqetsSaleStatusAvailable(saleStatus: string | null | undefined): boolean {
    return typeof saleStatus === "string" && saleStatus.trim() === "available";
  }

  it("M. only exact sale_status 'available' is customer-visible", () => {
    expect(isTiqetsSaleStatusAvailable("available")).toBe(true);
    expect(isTiqetsSaleStatusAvailable(" on_sale ")).toBe(false);
    expect(isTiqetsSaleStatusAvailable("unavailable")).toBe(false);
    expect(isTiqetsSaleStatusAvailable("sold_out")).toBe(false);
    expect(isTiqetsSaleStatusAvailable(null)).toBe(false);
    expect(isTiqetsSaleStatusAvailable(undefined)).toBe(false);
    expect(isTiqetsSaleStatusAvailable("")).toBe(false);
  });
});

describe("PB2A behaviour — cache identity by city_id", () => {
  it("N1. city_id=71631 and city_id=66342 never share a cache key", async () => {
    const keyRome = await generateCacheKey("search", { city_id: 71631, page: 1, page_size: 24, lang: "en", currency: "AUD" });
    const keyBcn = await generateCacheKey("search", { city_id: 66342, page: 1, page_size: 24, lang: "en", currency: "AUD" });
    expect(keyRome).not.toBe(keyBcn);
    expect(keyRome).toMatch(/^[0-9a-f]{64}$/);
  });

  it("N2. identical search inputs produce identical cache keys (deterministic)", async () => {
    const a = await generateCacheKey("search", { city_id: 71631, page: 1, page_size: 24, lang: "en", currency: "AUD" });
    const b = await generateCacheKey("search", { city_id: 71631, page: 1, page_size: 24, lang: "en", currency: "AUD" });
    expect(a).toBe(b);
  });

  it("N3. query change changes the cache key", async () => {
    const a = await generateCacheKey("search", { city_id: 71631, query: "vatican" });
    const b = await generateCacheKey("search", { city_id: 71631, query: "colosseum" });
    expect(a).not.toBe(b);
  });
});
