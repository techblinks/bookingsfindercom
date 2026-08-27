/**
 * BF-FLIGHTS-CACHE-1 — CACHE PERSISTENCE CORRECTNESS FIX.
 *
 * Edge Function runtimes may terminate background work once a response is
 * sent, so an un-awaited ("fire-and-forget") cache write is not reliable
 * for the primary persistent cache. This file proves:
 *   A/B. the successful-fetch path AWAITS upsertFlightSearchCache before
 *        returning — for both non-empty and zero-result payloads (the
 *        write is unconditional, not gated on exactMatches.length)
 *   C.   upsertFlightSearchCache itself never rethrows (best-effort),
 *        so awaiting it cannot turn a valid Travelpayouts result into a
 *        user-facing failure
 *   D.   recordFlightSearchDemand is never left as an untracked
 *        `void fn(...)` call — it runs inside the Promise.all alongside
 *        the cache lookup
 *   E.   recordFlightSearchDemand itself never rethrows (best-effort)
 *   F/G. the fresh-cache-hit branch (status "hit", including a
 *        zero-flight cached payload) still returns strictly before any
 *        Travelpayouts call, even after the Promise.all refactor
 *
 * H (stale-if-error unchanged) and I (fetched_at invariant unchanged) are
 * already covered by freshness-invariants.test.ts and are not duplicated
 * here.
 *
 * search-flights/index.ts is a Deno.serve handler not imported directly in
 * vitest (see zero-result-caching.test.ts's header for why) — these are
 * structural/source-order assertions on the handler source, the same
 * technique used elsewhere in this test suite.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const indexSource = readFileSync("supabase/functions/search-flights/index.ts", "utf8");
const cacheModuleSource = readFileSync("supabase/functions/_shared/flightSearchCache.ts", "utf8");

describe("A/B. the successful-fetch path awaits the cache write before returning, for both non-empty and zero-result payloads", () => {
  it("calls 'await upsertFlightSearchCache(', never a bare/untracked 'void upsertFlightSearchCache('", () => {
    expect(indexSource).toContain("await upsertFlightSearchCache(");
    expect(indexSource).not.toMatch(/void\s+upsertFlightSearchCache\(/);
  });

  it("the await happens before the refreshed-response return, and is not conditioned on result.offers.length (so a zero-result search is cached identically to a non-empty one)", () => {
    const tryBlockStart = indexSource.indexOf("const provider = createTravelpayoutsProvider();");
    const catchBlockStart = indexSource.indexOf("} catch (upstreamError) {");
    const trySuccessSource = indexSource.slice(tryBlockStart, catchBlockStart);

    const awaitUpsertIndex = trySuccessSource.indexOf("await upsertFlightSearchCache(");
    const refreshedReturnIndex = trySuccessSource.indexOf('cacheStatus: "refreshed"');
    expect(awaitUpsertIndex).toBeGreaterThan(-1);
    expect(refreshedReturnIndex).toBeGreaterThan(-1);
    expect(awaitUpsertIndex).toBeLessThan(refreshedReturnIndex);

    // No conditional gate on result count sits between the provider.search()
    // call and awaiting the cache write — the write always runs.
    const resultComputed = trySuccessSource.indexOf("const result = await provider.search(");
    const between = trySuccessSource.slice(resultComputed, awaitUpsertIndex);
    expect(between).not.toMatch(/if\s*\(\s*result\.(offers|totalFound)\.length/);
  });
});

describe("C. upsertFlightSearchCache never rethrows — awaiting it cannot turn a valid Travelpayouts result into a failure", () => {
  it("the function body catches its own errors and does not rethrow", () => {
    const fnMatch = cacheModuleSource.match(/export async function upsertFlightSearchCache[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("try {");
    expect(fnBody).toContain("catch (err)");
    expect(fnBody).not.toMatch(/catch[\s\S]*?throw /);
  });
});

describe("D. demand tracking is not left as an untracked fire-and-forget promise", () => {
  it("there is no bare 'void recordFlightSearchDemand(' call anywhere in the handler", () => {
    expect(indexSource).not.toMatch(/void\s+recordFlightSearchDemand\(/);
  });

  it("recordFlightSearchDemand runs inside the same Promise.all as the cache lookup, not as a separate untracked statement", () => {
    const promiseAllIndex = indexSource.indexOf("await Promise.all([");
    expect(promiseAllIndex).toBeGreaterThan(-1);

    const promiseAllBlockEnd = indexSource.indexOf("]);", promiseAllIndex);
    const promiseAllBlock = indexSource.slice(promiseAllIndex, promiseAllBlockEnd);

    expect(promiseAllBlock).toContain("getFlightSearchCache(");
    expect(promiseAllBlock).toContain("recordFlightSearchDemand(");
  });

  it("the cache lookup result is destructured from the Promise.all, not from a separate serial await", () => {
    expect(indexSource).toMatch(/const \[cacheLookup\] = await Promise\.all\(/);
  });
});

describe("E. demand tracking failure remains non-fatal", () => {
  it("recordFlightSearchDemand's body catches its own errors and does not rethrow", () => {
    const fnMatch = cacheModuleSource.match(/export async function recordFlightSearchDemand[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    const fnBody = fnMatch![0];
    expect(fnBody).toContain("try {");
    expect(fnBody).toContain("catch (err)");
    expect(fnBody).not.toMatch(/catch[\s\S]*?throw /);
  });

  it("a demand-tracking failure inside Promise.all cannot reject the whole lookup — recordFlightSearchDemand's promise always resolves (never rejects) per its own try/catch contract", () => {
    // Structural corollary of the "never rethrows" test above: since
    // recordFlightSearchDemand swallows every error internally, the
    // Promise.all it participates in can only ever be rejected by
    // getFlightSearchCache, which has the same never-rethrows contract
    // (see flightSearchCache.test.ts's "treats a DB error as a miss").
    const fnMatch = cacheModuleSource.match(/export async function getFlightSearchCache[\s\S]*?^}/m);
    expect(fnMatch).not.toBeNull();
    expect(fnMatch![0]).toContain("catch (err)");
    expect(fnMatch![0]).not.toMatch(/catch[\s\S]*?throw /);
  });
});

describe("F/G. a fresh cache hit (empty or not) still returns strictly before any provider call, even after the Promise.all refactor", () => {
  it("the Promise.all lookup/demand block, then the fresh-hit branch and its return, both sit entirely before the provider.search() call", () => {
    const promiseAllIndex = indexSource.indexOf("await Promise.all([");
    const freshBranchStart = indexSource.indexOf('cacheLookup.type === "fresh"');
    const providerSearchCall = indexSource.indexOf("await provider.search(");

    expect(promiseAllIndex).toBeGreaterThan(-1);
    expect(freshBranchStart).toBeGreaterThan(-1);
    expect(providerSearchCall).toBeGreaterThan(-1);

    expect(promiseAllIndex).toBeLessThan(freshBranchStart);
    expect(freshBranchStart).toBeLessThan(providerSearchCall);

    const freshBranchSource = indexSource.slice(freshBranchStart, providerSearchCall);
    expect(freshBranchSource).toMatch(/return jsonResponse\(/);
    // totalFound reflects the cached payload's own offers length (0 for an
    // empty cached payload), never a call to provider.search().
    expect(freshBranchSource).toContain("totalFound: payload.offers.length");
    expect(freshBranchSource).not.toContain("provider.search(");
  });
});
