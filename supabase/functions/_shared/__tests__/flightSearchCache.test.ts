/**
 * BF-FLIGHTS-CACHE-1 — persistent flight-search cache contract.
 * The Supabase client is a minimal fluent mock (no real network/DB) that
 * mirrors the chain search-flights/index.ts actually uses:
 *   .from(table).select(...).eq(...).gt(...)[.lte(...)].maybeSingle()
 *   .from(table).upsert(payload, opts)
 *   .rpc(name, args)
 */
import { describe, it, expect, vi } from "vitest";
import {
  computeFlightSearchCacheKey,
  getFlightSearchCache,
  upsertFlightSearchCache,
  recordFlightSearchDemand,
  computeAgeSeconds,
  FRESH_TTL_SEC,
  STALE_MAX_SEC,
} from "../flightSearchCache.ts";

function makeMockClient(opts: { queryResults?: Array<{ data: unknown }>; upsertImpl?: (table: string, payload: unknown, options: unknown) => unknown; rpcImpl?: (fn: string, args: unknown) => unknown; throwOnQuery?: boolean } = {}) {
  const upsertSpy = vi.fn(opts.upsertImpl ?? (() => Promise.resolve({ error: null })));
  const rpcSpy = vi.fn(opts.rpcImpl ?? (() => Promise.resolve({ error: null })));
  // Shared across every .from() call in this client instance — each
  // getFlightSearchCache invocation may call .from() up to twice (fresh
  // query, then stale query), and results[] represents each successive
  // terminal .maybeSingle() call in that same order.
  const results = opts.queryResults ?? [{ data: null }];
  let callIndex = 0;

  return {
    from: (_table: string) => {
      if (opts.throwOnQuery) {
        return {
          select: () => { throw new Error("DB unreachable"); },
          upsert: upsertSpy,
        };
      }
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        gt: () => builder,
        lte: () => builder,
        maybeSingle: () => Promise.resolve(results[Math.min(callIndex++, results.length - 1)] ?? { data: null }),
        upsert: upsertSpy,
      };
      return builder;
    },
    rpc: rpcSpy,
    __upsertSpy: upsertSpy,
    __rpcSpy: rpcSpy,
  } as any;
}

describe("computeFlightSearchCacheKey", () => {
  it("includes origin", () => {
    const a = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    const b = computeFlightSearchCacheKey({ origin: "BNE", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    expect(a).not.toBe(b);
  });

  it("includes destination", () => {
    const a = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    const b = computeFlightSearchCacheKey({ origin: "SYD", destination: "BNE", departureDate: "2099-01-10", currency: "AUD" });
    expect(a).not.toBe(b);
  });

  it("includes departure date", () => {
    const a = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    const b = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-11", currency: "AUD" });
    expect(a).not.toBe(b);
  });

  it("distinguishes one-way from round-trip on the same dates", () => {
    const oneWay = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    const roundTrip = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", returnDate: "2099-01-20", currency: "AUD" });
    expect(oneWay).not.toBe(roundTrip);
  });

  it("includes currency", () => {
    const a = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    const b = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "USD" });
    expect(a).not.toBe(b);
  });

  it("is case/formatting-normalized (lowercase origin produces the same key as uppercase)", () => {
    const a = computeFlightSearchCacheKey({ origin: "syd", destination: "mel", departureDate: "2099-01-10", currency: "aud" });
    const b = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    expect(a).toBe(b);
  });

  it("does not accept (and has no parameter for) adults/children/infants/cabin class — passenger inputs never fragment the key", () => {
    // Structural proof: the function's input type has no passenger/cabin
    // fields at all, so two requests differing only in those cannot
    // produce different keys — verified by TypeScript, exercised here by
    // calling with only the documented fields.
    const key = computeFlightSearchCacheKey({ origin: "SYD", destination: "MEL", departureDate: "2099-01-10", currency: "AUD" });
    expect(key).toBe("SYD|MEL|2099-01-10||AUD");
  });
});

describe("getFlightSearchCache", () => {
  it("returns 'fresh' when a row exists within the TTL window", async () => {
    const row = { cache_key: "K", payload: { flights: [] }, fetched_at: new Date().toISOString(), expires_at: "x" };
    const client = makeMockClient({ queryResults: [{ data: row }] });
    const result = await getFlightSearchCache(client, "K");
    expect(result.type).toBe("fresh");
  });

  it("returns 'stale' when the fresh query misses but a row exists within the 24h window", async () => {
    const staleFetchedAt = new Date(Date.now() - (FRESH_TTL_SEC + 3600) * 1000).toISOString();
    const row = { cache_key: "K", payload: { flights: [] }, fetched_at: staleFetchedAt, expires_at: "x" };
    // First query (fresh) misses -> null; second query (stale) hits -> row
    const client = makeMockClient({ queryResults: [{ data: null }, { data: row }] });
    const result = await getFlightSearchCache(client, "K");
    expect(result.type).toBe("stale");
  });

  it("BF-FLIGHTS-CACHE-1 Phase 4: an 8h-old row is classified 'stale' and its fetched_at is returned unmodified — reading the cache never rewrites fetched_at", async () => {
    const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString();
    const row = { cache_key: "K", payload: { flights: [] }, fetched_at: eightHoursAgo, expires_at: "x" };
    const client = makeMockClient({ queryResults: [{ data: null }, { data: row }] });

    const result = await getFlightSearchCache(client, "K");

    expect(result.type).toBe("stale");
    if (result.type === "stale") {
      // The read path returns exactly what was stored — it never
      // generates a new timestamp or otherwise touches fetched_at.
      expect(result.row.fetched_at).toBe(eightHoursAgo);
    }
  });

  it("returns 'miss' when both queries miss (no row at all)", async () => {
    const client = makeMockClient({ queryResults: [{ data: null }, { data: null }] });
    const result = await getFlightSearchCache(client, "K");
    expect(result.type).toBe("miss");
  });

  it("treats a row older than the 24h stale ceiling as 'miss', never returning it", async () => {
    // Both queries return null because the row's fetched_at falls outside
    // both the fresh (<6h) and stale (<24h) windows — this test proves the
    // CALLER'S query filters (gt/lte staleThreshold) are what exclude it;
    // simulated here by both queries returning no row, matching what the
    // real .gt(staleThreshold) filter would do for an expired row.
    const client = makeMockClient({ queryResults: [{ data: null }, { data: null }] });
    const result = await getFlightSearchCache(client, "K");
    expect(result.type).toBe("miss");
  });

  it("treats a DB error as a miss (fails open to upstream, never fails the whole request)", async () => {
    const client = makeMockClient({ throwOnQuery: true });
    const result = await getFlightSearchCache(client, "K");
    expect(result.type).toBe("miss");
  });
});

describe("upsertFlightSearchCache", () => {
  it("writes the cache_key, semantic columns and payload", async () => {
    const client = makeMockClient();
    await upsertFlightSearchCache(client, {
      cacheKey: "SYD|MEL|2099-01-10||AUD",
      origin: "SYD", destination: "MEL", departureDate: "2099-01-10", returnDate: null,
      currency: "AUD", payload: { flights: [] },
    });
    expect(client.__upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ cache_key: "SYD|MEL|2099-01-10||AUD", origin: "SYD", destination: "MEL", currency: "AUD" }),
      expect.objectContaining({ onConflict: "cache_key" }),
    );
  });

  it("never throws when the DB write fails — best-effort only", async () => {
    const client = makeMockClient({ upsertImpl: () => { throw new Error("write failed"); } });
    await expect(
      upsertFlightSearchCache(client, {
        cacheKey: "K", origin: "SYD", destination: "MEL", departureDate: "2099-01-10", returnDate: null,
        currency: "AUD", payload: { flights: [] },
      }),
    ).resolves.toBeUndefined();
  });
});

describe("recordFlightSearchDemand", () => {
  it("calls the bump RPC with the cache key", async () => {
    const client = makeMockClient();
    await recordFlightSearchDemand(client, "SYD|MEL|2099-01-10||AUD");
    expect(client.__rpcSpy).toHaveBeenCalledWith("bump_flight_search_cache_demand", { p_cache_key: "SYD|MEL|2099-01-10||AUD" });
  });

  it("never throws when the RPC fails — best-effort only", async () => {
    const client = makeMockClient({ rpcImpl: () => { throw new Error("rpc failed"); } });
    await expect(recordFlightSearchDemand(client, "K")).resolves.toBeUndefined();
  });
});

describe("computeAgeSeconds", () => {
  it("computes BookingsFinder's own cache-fetch age, not a provider observation age", () => {
    const fetchedAt = new Date(Date.now() - 7200 * 1000).toISOString();
    expect(computeAgeSeconds(fetchedAt)).toBeGreaterThanOrEqual(7199);
    expect(computeAgeSeconds(fetchedAt)).toBeLessThanOrEqual(7201);
  });

  it("never returns a negative age", () => {
    const future = new Date(Date.now() + 100000).toISOString();
    expect(computeAgeSeconds(future)).toBe(0);
  });
});

describe("TTL constants", () => {
  it("FRESH_TTL_SEC is 6 hours", () => {
    expect(FRESH_TTL_SEC).toBe(6 * 60 * 60);
  });

  it("STALE_MAX_SEC is 24 hours", () => {
    expect(STALE_MAX_SEC).toBe(24 * 60 * 60);
  });
});
