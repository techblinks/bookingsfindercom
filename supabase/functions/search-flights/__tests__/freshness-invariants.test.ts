/**
 * BF-FLIGHTS-CACHE-1 Phase 4 — fetched_at must change ONLY after a
 * successful Travelpayouts fetch. A stale-if-error response must retain
 * the ORIGINAL fetched_at — a failed refresh attempt must never be
 * mistaken for a new provider observation. last_requested_at/request_count
 * (demand tracking) update independently and never touch fetched_at.
 *
 * search-flights/index.ts is a Deno.serve handler not imported directly in
 * vitest (see zero-result-caching.test.ts's header for why) — these are
 * structural/source-order assertions on the handler, the same technique
 * used for the migration's GRANT/REVOKE contract.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const indexSource = readFileSync("supabase/functions/search-flights/index.ts", "utf8");
const cacheModuleSource = readFileSync("supabase/functions/_shared/flightSearchCache.ts", "utf8");

describe("stale-if-error preserves the ORIGINAL fetched_at", () => {
  it("the catch (upstream failure) block's stale response uses cacheLookup.row.fetched_at, never a freshly-generated timestamp", () => {
    const catchBlockStart = indexSource.indexOf("} catch (upstreamError) {");
    expect(catchBlockStart).toBeGreaterThan(-1);
    const catchBlockSource = indexSource.slice(catchBlockStart);

    const staleBranchStart = catchBlockSource.indexOf('cacheLookup.type === "stale"');
    expect(staleBranchStart).toBeGreaterThan(-1);
    // Everything from the stale-type check through the next closing of
    // that if-block (up to the following blank "no cache" comment) is the
    // stale response construction.
    const staleBranchSource = catchBlockSource.slice(staleBranchStart, catchBlockSource.indexOf("// No cache, or cache too old"));

    expect(staleBranchSource).toContain("fetchedAt: cacheLookup.row.fetched_at");
    // Must NOT construct a new Date()/now() timestamp for this response —
    // that would misrepresent a failed refresh attempt as a fresh fetch.
    expect(staleBranchSource).not.toMatch(/new Date\(\)/);
  });

  it("the catch (upstream failure) block never calls upsertFlightSearchCache — a failed refresh must not overwrite the stored row", () => {
    const catchBlockStart = indexSource.indexOf("} catch (upstreamError) {");
    const catchBlockSource = indexSource.slice(catchBlockStart);
    expect(catchBlockSource).not.toContain("upsertFlightSearchCache(");
  });

  it("only the successful-fetch try block calls upsertFlightSearchCache, and only there is fetched_at ever written", () => {
    const tryBlockStart = indexSource.indexOf("const provider = createTravelpayoutsProvider();");
    const catchBlockStart = indexSource.indexOf("} catch (upstreamError) {");
    expect(tryBlockStart).toBeGreaterThan(-1);
    expect(catchBlockStart).toBeGreaterThan(tryBlockStart);
    const trySuccessSource = indexSource.slice(tryBlockStart, catchBlockStart);

    expect(trySuccessSource).toContain("upsertFlightSearchCache(");
    // upsertFlightSearchCache itself is what stamps fetched_at — confirm
    // that write path exists exactly once total in the handler.
    expect([...indexSource.matchAll(/upsertFlightSearchCache\(/g)]).toHaveLength(1);
  });
});

describe("upsertFlightSearchCache always stamps a fresh fetched_at (the only place fetched_at is written)", () => {
  it("sets fetched_at from the current time at call time, not a caller-supplied value", () => {
    const fnMatch = cacheModuleSource.match(/export async function upsertFlightSearchCache[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toContain("fetched_at: now.toISOString()");
    // The function signature accepts no fetchedAt/timestamp override —
    // callers cannot backdate or preserve an old fetched_at through this path.
    const paramsMatch = cacheModuleSource.match(/export interface UpsertFlightSearchCacheParams \{[\s\S]*?\}/);
    expect(paramsMatch).not.toBeNull();
    expect(paramsMatch![0]).not.toMatch(/fetched_?[aA]t/);
  });
});

describe("demand tracking (last_requested_at/request_count) is independent of fetched_at", () => {
  it("recordFlightSearchDemand calls a dedicated RPC, never upsertFlightSearchCache or any fetched_at write", () => {
    const fnMatch = cacheModuleSource.match(/export async function recordFlightSearchDemand[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toContain('client.rpc("bump_flight_search_cache_demand"');
    expect(fnMatch![0]).not.toContain("upsertFlightSearchCache");
    expect(fnMatch![0]).not.toMatch(/fetched_at/);
  });

  it("the demand RPC (defined in the migration) updates only last_requested_at and request_count, never fetched_at/payload", () => {
    const migrationSql = readFileSync(
      "supabase/migrations/20260824000000_bf_flights_cache_1_flight_search_cache.sql",
      "utf8",
    );
    const fnMatch = migrationSql.match(/CREATE OR REPLACE FUNCTION public\.bump_flight_search_cache_demand[\s\S]*?\$\$;/);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toContain("last_requested_at = now()");
    expect(fnMatch![0]).toContain("request_count = request_count + 1");
    expect(fnMatch![0]).not.toMatch(/SET\s+[\s\S]*?fetched_at/);
    expect(fnMatch![0]).not.toMatch(/SET\s+[\s\S]*?payload/);
  });
});
