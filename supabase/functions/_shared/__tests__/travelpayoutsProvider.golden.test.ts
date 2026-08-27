/**
 * BF1-E GOLDEN CONTRACT TESTS — TravelpayoutsProvider + wire serializers vs
 * committed pre-refactor snapshots.
 *
 * The golden JSON files in __fixtures__/golden/ were captured BEFORE the
 * FlightProvider refactor (git 7745ddd) by driving the then-current code
 * paths with these exact raw fixtures:
 *   - golden_search_flights.json          round trip, exact-date filtering
 *   - golden_search_flights_oneway.json   one way, found_at retention on kept row
 *   - golden_search_flights_empty.json    honest empty state
 *   - golden_price_calendar.json          month-matrix mapping
 *   - golden_popular_routes.json          city-directions mapping incl. null price
 *   - golden_special_offers.json          post-fix contract (observedAt null when absent)
 *   - golden_special_offers.pre_bf1e.json audit artifact of the removed fabrication
 *
 * These tests run the NEW provider path through the SAME wire serializers the
 * Edge Functions use, so a pass means byte-equal public contracts.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createTravelpayoutsProvider } from "../travelpayoutsProvider.ts";
import {
  toWireFlightSearchResponse,
  toWireCalendarPrice,
  toWireRouteSuggestion,
  toWireSpecialOffer,
} from "../flightWire.ts";

const RAW_DIR = path.resolve(process.cwd(), "supabase/functions/_shared/__tests__/__fixtures__/travelpayouts");
const GOLDEN_DIR = path.resolve(process.cwd(), "supabase/functions/_shared/__tests__/__fixtures__/golden");

function loadRaw(name: string): unknown {
  return JSON.parse(readFileSync(path.join(RAW_DIR, name), "utf8"));
}
function loadGolden(name: string): any {
  return JSON.parse(readFileSync(path.join(GOLDEN_DIR, name), "utf8"));
}

function stubJsonFetch(payload: unknown): void {
  globalThis.fetch = (async () => ({
    ok: true,
    status: 200,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

beforeAll(() => {
  // Adapter reads credentials via Deno.env (getConfig). Provide a stub env
  // matching the fixture marker used when the goldens were captured.
  (globalThis as Record<string, unknown>).Deno = {
    env: {
      get: (key: string) =>
        key === "TRAVELPAYOUTS_API_KEY" ? "test-token" : key === "MARKER_ID" ? "TESTMARKER" : undefined,
    },
  };
});

describe("BF1-E golden contracts: search-flights", () => {
  it("round-trip search output is byte-identical to pre-refactor behaviour", async () => {
    stubJsonFetch(loadRaw("raw_prices_for_dates.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.search({
      origin: "SYD",
      destination: "KTM",
      departureDate: "2026-09-03",
      returnDate: "2026-09-17",
      adults: 1,
      currency: "USD",
    });
    expect(toWireFlightSearchResponse(result)).toEqual(loadGolden("golden_search_flights.json"));
  });

  it("one-way search retains provider found_at on kept rows", async () => {
    stubJsonFetch(loadRaw("raw_prices_for_dates_oneway.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.search({
      origin: "SYD",
      destination: "DPS",
      departureDate: "2026-10-01",
      returnDate: undefined,
      adults: 1,
      currency: "USD",
    });
    expect(toWireFlightSearchResponse(result)).toEqual(loadGolden("golden_search_flights_oneway.json"));
    const jq = result.offers.find((o) => o.carrierCode === "JQ");
    expect(jq?.observedAt).toBe("2026-08-20T02:41:00Z");
    const va = result.offers.find((o) => o.carrierCode === "VA");
    expect(va?.observedAt).toBeNull();
  });

  it("empty upstream data yields the honest empty response", async () => {
    stubJsonFetch(loadRaw("raw_prices_for_dates_empty.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.search({
      origin: "SYD",
      destination: "DPS",
      departureDate: "2026-10-01",
      currency: "USD",
    });
    expect(toWireFlightSearchResponse(result)).toEqual(loadGolden("golden_search_flights_empty.json"));
  });

  it("nearest-date cache substitutes never reach offers", async () => {
    stubJsonFetch(loadRaw("raw_prices_for_dates_oneway.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.search({
      origin: "SYD",
      destination: "DPS",
      departureDate: "2026-10-01",
      currency: "USD",
    });
    expect(result.excludedNearestDateCount).toBe(1); // QF row departs 2026-10-02
    for (const offer of result.offers) {
      expect((offer.departureAt ?? "").slice(0, 10)).toBe("2026-10-01");
    }
  });
});

describe("BF1-E golden contracts: price calendar", () => {
  it("month-matrix output is byte-identical to pre-refactor behaviour", async () => {
    stubJsonFetch(loadRaw("raw_month_matrix.json"));
    const provider = createTravelpayoutsProvider();
    const calendar = await provider.getPriceCalendar({
      origin: "BNE",
      destination: "DPS",
      month: "2026-09",
      currency: "USD",
    });
    expect({
      prices: calendar.entries.map(toWireCalendarPrice),
      success: true,
    }).toEqual(loadGolden("golden_price_calendar.json"));
  });
});

describe("BF1-E golden contracts: popular routes", () => {
  it("city-directions output is byte-identical to pre-refactor behaviour", async () => {
    stubJsonFetch(loadRaw("raw_city_directions.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 });
    expect({
      routes: result.routes.map(toWireRouteSuggestion),
      currency: result.currency,
      success: true,
    }).toEqual(loadGolden("golden_popular_routes.json"));
  });

  // CONTRACT-PARITY CLOSEOUT (Fix 2): legacy wire semantics
  // `currency: data.currency || currency` — the upstream-declared currency
  // takes precedence over an echo of the requested currency. Locked against a
  // committed pre-refactor snapshot with an upstream currency ("EUR") that
  // DIFFERS from the requested one ("USD").
  it("upstream-declared currency wins over the requested currency (legacy precedence)", async () => {
    stubJsonFetch(loadRaw("raw_city_directions_currency.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 });
    expect(result.currency).toBe("EUR");
    expect({
      routes: result.routes.map(toWireRouteSuggestion),
      currency: result.currency,
      success: true,
    }).toEqual(loadGolden("golden_popular_routes_currency.json"));
  });
});

describe("BF1-E golden contracts: special offers", () => {
  it("offers match the sanctioned post-fix contract (observedAt null when absent)", async () => {
    stubJsonFetch(loadRaw("raw_prices_latest.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.getSpecialOffers({ origin: "LHR", currency: "USD", limit: 8 });
    expect({
      offers: result.offers.map(toWireSpecialOffer),
      currency: "USD",
      source: "travelpayouts_latest",
    }).toEqual(loadGolden("golden_special_offers.json"));

    // Explicit observedAt assertions (retain vs absent — never fabricated).
    const bcn = result.offers.find((o) => o.destination === "BCN");
    expect(bcn?.observedAt).toBe("2026-08-24T09:15:00Z");
    const prg = result.offers.find((o) => o.destination === "PRG");
    expect(prg?.observedAt).toBeNull();

    // Affiliate marker/deep-link preserved exactly.
    expect(bcn?.deepLink).toBe(
      "https://www.aviasales.com/search/LHR2609BCN1?marker=TESTMARKER"
    );
  });

  // CONTRACT-PARITY CLOSEOUT (Fix 1): the empty-source wire response is
  // restored. When the upstream ENVELOPE reports no offer set, the Edge
  // Function composes source:"empty" exactly as pre-BF1-E did.
  it("empty upstream envelope composes the legacy { offers: [], source: 'empty' } response", async () => {
    stubJsonFetch(loadRaw("raw_prices_latest_empty.json")); // success:true, data:null
    const provider = createTravelpayoutsProvider();
    const result = await provider.getSpecialOffers({ origin: "LHR", currency: "USD", limit: 8 });
    expect(result.upstreamEmpty).toBe(true);
    expect({
      offers: result.offers.map(toWireSpecialOffer),
      currency: "USD",
      source: "empty", // legacy composition performed by get-special-offers
    }).toEqual(loadGolden("golden_special_offers_empty.json"));
  });

  it("a POPULATED envelope reduced to zero offers keeps source 'travelpayouts_latest'", async () => {
    // Rows parse but fail the legacy post-filter (price must be > 0,
    // destination >= 2 chars): pre-BF1-E this produced offers:[] with
    // source:"travelpayouts_latest" — NOT source:"empty". The distinction is
    // envelope-shaped and must not regress into an array-length check.
    stubJsonFetch(loadRaw("raw_prices_latest_zero_after_filter.json"));
    const provider = createTravelpayoutsProvider();
    const result = await provider.getSpecialOffers({ origin: "LHR", currency: "USD", limit: 8 });
    expect(result.offers).toEqual([]);
    expect(result.upstreamEmpty).toBe(false);
  });
});
