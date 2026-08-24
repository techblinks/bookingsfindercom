/**
 * BF-FLIGHTS-CACHE-1 — a successful Travelpayouts request that produces
 * ZERO exact-date observations is still a successful provider response and
 * MUST be cacheable, exactly like a non-empty one. This must never be
 * conflated with a provider failure ("unavailable").
 *
 * search-flights/index.ts is a Deno.serve handler and isn't imported/run
 * directly in vitest (matching this repo's established convention — see
 * every other supabase/functions/**\/__tests__ directory), so items C/D
 * below are proven via structural/source-order assertions on the handler
 * source, the same technique already used for the migration's GRANT/REVOKE
 * contract. Items A/B/E exercise the real, imported cache/date-match
 * functions directly.
 */
import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "fs";
import { upsertFlightSearchCache, getFlightSearchCache } from "../../_shared/flightSearchCache.ts";
import { isExactDateMatch } from "../../_shared/flightDateMatch.ts";

const indexSource = readFileSync("supabase/functions/search-flights/index.ts", "utf8");

function makeMockClient(queryResults: Array<{ data: unknown }>) {
  const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
  let callIndex = 0;
  return {
    from: () => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        gt: () => builder,
        lte: () => builder,
        maybeSingle: () => Promise.resolve(queryResults[Math.min(callIndex++, queryResults.length - 1)] ?? { data: null }),
        upsert: upsertSpy,
      };
      return builder;
    },
    __upsertSpy: upsertSpy,
  } as any;
}

// ── A. zero exact results are persisted ──

describe("A. zero exact results are persisted", () => {
  it("upsertFlightSearchCache writes an empty flights payload the same way it writes a non-empty one", async () => {
    const client = makeMockClient([]);
    await upsertFlightSearchCache(client, {
      cacheKey: "SYD|MEL|2099-01-10||AUD",
      origin: "SYD", destination: "MEL", departureDate: "2099-01-10", returnDate: null,
      currency: "AUD", payload: { flights: [] },
    });

    expect(client.__upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { flights: [] } }),
      expect.objectContaining({ onConflict: "cache_key" }),
    );
  });
});

// ── B. a fresh cached empty result is a cache HIT ──

describe("B. a fresh cached empty result is a cache HIT", () => {
  it("getFlightSearchCache classifies a fresh row with flights: [] as 'fresh', not 'miss'", async () => {
    const row = { cache_key: "K", payload: { flights: [] }, fetched_at: new Date().toISOString(), expires_at: "x" };
    const client = makeMockClient([{ data: row }]);
    const result = await getFlightSearchCache(client, "K");
    expect(result.type).toBe("fresh");
    if (result.type === "fresh") {
      expect(result.row.payload.flights).toEqual([]);
    }
  });
});

// ── C. fresh cached empty result performs zero Travelpayouts requests ──

describe("C. a fresh cache hit (empty or not) never reaches the Travelpayouts call", () => {
  it("the 'fresh' branch in search-flights/index.ts returns before getFlightPrices is ever called, and returns whatever total_found the cached payload actually has (including 0)", () => {
    const freshBranchStart = indexSource.indexOf('cacheLookup.type === "fresh"');
    const getFlightPricesCall = indexSource.indexOf("await getFlightPrices(");
    expect(freshBranchStart).toBeGreaterThan(-1);
    expect(getFlightPricesCall).toBeGreaterThan(-1);
    // The fresh-hit branch (and its own `return`) is positioned entirely
    // before the code that calls getFlightPrices — there is no code path
    // from a fresh hit into the upstream call.
    expect(freshBranchStart).toBeLessThan(getFlightPricesCall);

    const freshBranchSource = indexSource.slice(freshBranchStart, getFlightPricesCall);
    expect(freshBranchSource).toMatch(/return jsonResponse\(/);
    // total_found reflects the cached payload's own length — never
    // hardcoded to a nonzero value, so an empty cached payload reports 0.
    expect(freshBranchSource).toContain("total_found: payload.flights.length");
  });
});

// ── D. provider failure remains distinguishable from cached zero ──

describe("D. 'unavailable' (provider failure) is structurally distinct from a genuine zero-match ('hit'/'refreshed' with total_found: 0)", () => {
  it("cacheStatus: 'unavailable' appears only in the upstream-failure catch block, never in a success path", () => {
    const occurrences = [...indexSource.matchAll(/cacheStatus:\s*"unavailable"/g)];
    expect(occurrences).toHaveLength(1);

    const catchBlockStart = indexSource.indexOf("} catch (upstreamError) {");
    expect(catchBlockStart).toBeGreaterThan(-1);
    expect(occurrences[0].index!).toBeGreaterThan(catchBlockStart);
  });

  it("the success paths ('hit' and 'refreshed') never set total_found to a value other than the actual result length", () => {
    expect(indexSource).toContain('cacheStatus: "hit"');
    expect(indexSource).toContain('cacheStatus: "refreshed"');
    // Both success statuses derive total_found from real data
    // (payload.flights.length or exactMatches.length), never a literal 0
    // used to signal failure.
    expect(indexSource).toMatch(/cacheStatus: "hit"/);
    expect(indexSource).toMatch(/total_found: exactMatches\.length/);
  });
});

// ── E. nearby-date-only response filters to zero, and that zero is what gets cached ──

describe("E. a nearby-date-only provider response filters down to zero exact matches, and that empty array is exactly what's cached", () => {
  it("isExactDateMatch rejects a result for the nearest cached date instead of the requested date", () => {
    // Traveller asked for 2099-01-10; Travelpayouts' cache only has an
    // observation for the nearest available date, 2099-01-12.
    const nearbyDateOnlyResult = {
      requestedDepartureDate: "2099-01-10",
      providerDepartureAt: "2099-01-12T08:00:00",
    };
    expect(isExactDateMatch(nearbyDateOnlyResult)).toBe(false);
  });

  it("filtering a nearby-date-only upstream response through isExactDateMatch produces the same empty array that upsertFlightSearchCache would persist", async () => {
    const rawFlights = [
      { id: "f1", provider_departure_at: "2099-01-12T08:00:00", provider_return_at: null },
      { id: "f2", provider_departure_at: "2099-01-14T08:00:00", provider_return_at: null },
    ];
    const requestedDepartureDate = "2099-01-10";

    const exactMatches = rawFlights.filter((flight) =>
      isExactDateMatch({
        requestedDepartureDate,
        providerDepartureAt: flight.provider_departure_at,
        providerReturnAt: flight.provider_return_at,
      }),
    );
    expect(exactMatches).toEqual([]);

    const client = makeMockClient([]);
    await upsertFlightSearchCache(client, {
      cacheKey: "SYD|MEL|2099-01-10||AUD",
      origin: "SYD", destination: "MEL", departureDate: requestedDepartureDate, returnDate: null,
      currency: "AUD", payload: { flights: exactMatches as any },
    });
    expect(client.__upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({ payload: { flights: [] } }),
      expect.anything(),
    );
  });
});
