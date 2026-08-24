import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { useFlightSearch, calculateFilterRanges } from "@/hooks/useFlightSearch";
import type { Flight } from "@/types/flight";

// Helper: build a minimal flight object for testing
function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: overrides.id || "test-1",
    airline: overrides.airline || "JQ",
    airline_code: overrides.airline_code || "JQ",
    price: overrides.price ?? 100,
    currency: overrides.currency || "USD",
    duration_minutes: overrides.duration_minutes ?? 100,
    stops: overrides.stops ?? 0,
    segments: overrides.segments || [
      {
        from: "BNE",
        to: "SYD",
        depart_time: "2026-08-10T08:00:00Z",
        arrive_time: "2026-08-10T09:40:00Z",
        airline: "JQ",
        airline_code: "JQ",
        flight_number: "JQ813",
      },
    ],
    link: "/search/BNE1008SYD1",
  };
}

// â”€â”€ calculateFilterRanges unit tests â”€â”€

describe("calculateFilterRanges", () => {
  it("returns empty object for empty flight array", () => {
    expect(calculateFilterRanges([])).toEqual({});
  });

  it("computes ranges from flights priced 90-103", () => {
    const flights = [
      makeFlight({ price: 90 }),
      makeFlight({ price: 95, id: "f2" }),
      makeFlight({ price: 103, id: "f3" }),
    ];
    const ranges = calculateFilterRanges(flights);
    expect(ranges.minPrice).toBe(90);
    expect(ranges.maxPrice).toBe(103);
    expect(ranges.priceRange).toEqual([90, 103]);
  });

  it("computes ranges from flights priced 63-72", () => {
    const flights = [
      makeFlight({ price: 63 }),
      makeFlight({ price: 68, id: "f2" }),
      makeFlight({ price: 72, id: "f3" }),
    ];
    const ranges = calculateFilterRanges(flights);
    expect(ranges.minPrice).toBe(63);
    expect(ranges.maxPrice).toBe(72);
    expect(ranges.priceRange).toEqual([63, 72]);
  });
});

// â”€â”€ Regression: filter range staleness after repeated fetch â”€â”€

describe("useFlightSearch filter range staleness regression", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Mock the fetch that useFlightSearch uses internally (calls search-flights edge function)
    vi.stubGlobal("fetch", vi.fn());
    // Mock supabase auth
    vi.mock("@/integrations/supabase/client", () => ({
      supabase: {
        auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
      },
    }));
    vi.mock("@/services/travelApi", () => ({
    }));
    // Mock getFunctionUrl
    vi.mock("@/lib/supabaseConfig", () => ({
      getFunctionUrl: () => "https://mock.test/functions/v1/search-flights",
    }));
  });

  it("updates filter ranges on second result set with different prices", async () => {
    const fetchMock = vi.fn();

    // First call: returns flights priced 90-103
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          flights: [
            { id: "f1", airline: "JQ", airline_code: "JQ", price: 90, currency: "USD", duration_minutes: 100, stops: 0, segments: [{ from: "BNE", to: "SYD", depart_time: "2026-08-10T08:00:00Z", arrive_time: null, airline: "JQ", airline_code: "JQ" }], link: "/search/1" },
            { id: "f2", airline: "JQ", airline_code: "JQ", price: 103, currency: "USD", duration_minutes: 100, stops: 0, segments: [{ from: "BNE", to: "SYD", depart_time: "2026-08-10T10:00:00Z", arrive_time: null, airline: "JQ", airline_code: "JQ" }], link: "/search/2" },
          ],
          meta: { total_found: 2, is_complete: true },
        }),
    });

    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ currency }) =>
        useFlightSearch({
          origin: "BNE",
          destination: "SYD",
          departureDate: "2026-08-10",
          passengers: 1,
          cabinClass: "economy",
          currency,
        }),
      { initialProps: { currency: "USD" } }
    );

    // Wait for first fetch to complete
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.flights.length).toBe(2);
    expect(result.current.filteredFlights.length).toBe(2);
    // First result: all flights should pass the [90,103] filter
    expect(result.current.filters.priceRange).toEqual([90, 103]);

    // Second call: same search but with flights priced 63-72 (simulating AUD vs USD)
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          flights: [
            { id: "f3", airline: "JQ", airline_code: "JQ", price: 63, currency: "AUD", duration_minutes: 100, stops: 0, segments: [{ from: "BNE", to: "SYD", depart_time: "2026-08-10T08:00:00Z", arrive_time: null, airline: "JQ", airline_code: "JQ" }], link: "/search/3" },
            { id: "f4", airline: "JQ", airline_code: "JQ", price: 72, currency: "AUD", duration_minutes: 100, stops: 0, segments: [{ from: "BNE", to: "SYD", depart_time: "2026-08-10T10:00:00Z", arrive_time: null, airline: "JQ", airline_code: "JQ" }], link: "/search/4" },
          ],
          meta: { total_found: 2, is_complete: true },
        }),
    });

    // Trigger re-fetch with different currency
    rerender({ currency: "AUD" });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.flights.length).toBe(2);
    // THE KEY ASSERTION: filteredFlights must NOT be 0
    // (before fix, stale [90,103] range would reject 63 and 72)
    expect(result.current.filteredFlights.length).toBe(2);
    // Filter range must have updated to cover the new prices
    expect(result.current.filters.priceRange).toEqual([63, 72]);
  });
});

// ── enabled: false — BF-0R-7.1 Phase B ──

describe("useFlightSearch enabled flag", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock("@/integrations/supabase/client", () => ({
      supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
    }));
    vi.mock("@/lib/supabaseConfig", () => ({
      getFunctionUrl: () => "https://mock.test/functions/v1/search-flights",
    }));
  });

  it("never calls fetch when enabled is false, even with a complete search", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useFlightSearch({
        origin: "BNE",
        destination: "SYD",
        departureDate: "2026-08-10",
        passengers: 1,
        cabinClass: "business",
        currency: "USD",
        enabled: false,
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();
    expect(result.current.flights).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  it("resumes fetching once enabled flips back to true", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          flights: [
            { id: "f1", airline: "JQ", airline_code: "JQ", price: 90, currency: "USD", duration_minutes: 100, stops: 0, segments: [{ from: "BNE", to: "SYD", depart_time: "2026-08-10T08:00:00Z", arrive_time: null, airline: "JQ", airline_code: "JQ" }], link: "/search/1" },
          ],
          meta: { total_found: 1, is_complete: true },
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result, rerender } = renderHook(
      ({ enabled }) =>
        useFlightSearch({
          origin: "BNE",
          destination: "SYD",
          departureDate: "2026-08-10",
          passengers: 1,
          cabinClass: "business",
          currency: "USD",
          enabled,
        }),
      { initialProps: { enabled: false } }
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).not.toHaveBeenCalled();

    rerender({ enabled: true });

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result.current.flights.length).toBe(1);
  });
});

// ── BF-FLIGHTS-CACHE-1 Phase 3/4: Cheapest/Fastest/Fewest-stops sort ──
// No "Best" option — Travelpayouts' cached observations carry no
// provider-defined ranking. Default is "cheapest".

describe("useFlightSearch sort — Cheapest/Fastest/Fewest stops (no proprietary Best score)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.mock("@/integrations/supabase/client", () => ({
      supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
    }));
    vi.mock("@/lib/supabaseConfig", () => ({
      getFunctionUrl: () => "https://mock.test/functions/v1/search-flights",
    }));
  });

  function segmentFor(id: string) {
    return [{ from: "BNE", to: "SYD", depart_time: "2026-08-10T08:00:00Z", arrive_time: null, airline: "JQ", airline_code: "JQ" }];
  }

  // f1: price 300, duration 200, stops 1
  // f2: price 100, duration 400, stops 0
  // f3: price 0 (invalid/missing), duration 50, stops 2
  // f4: price 200, duration 0 (invalid/missing), stops 0
  const RAW_FLIGHTS = [
    { id: "f1", airline: "QF", airline_code: "QF", price: 300, currency: "USD", duration_minutes: 200, stops: 1, segments: segmentFor("f1"), link: "/1" },
    { id: "f2", airline: "QF", airline_code: "QF", price: 100, currency: "USD", duration_minutes: 400, stops: 0, segments: segmentFor("f2"), link: "/2" },
    { id: "f3", airline: "QF", airline_code: "QF", price: 0, currency: "USD", duration_minutes: 50, stops: 2, segments: segmentFor("f3"), link: "/3" },
    { id: "f4", airline: "QF", airline_code: "QF", price: 200, currency: "USD", duration_minutes: 0, stops: 0, segments: segmentFor("f4"), link: "/4" },
  ];

  async function renderWithFixture() {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ flights: RAW_FLIGHTS, meta: { total_found: RAW_FLIGHTS.length, is_complete: true } }),
    }));

    const { result } = renderHook(() =>
      useFlightSearch({
        origin: "BNE", destination: "SYD", departureDate: "2026-08-10",
        passengers: 1, cabinClass: "economy", currency: "USD",
      }),
    );
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // The price/duration RANGE FILTERS are a separate concern from sort
    // order and are auto-initialized from calculateFilterRanges, which
    // itself excludes invalid (<=0) values from the computed min/max —
    // so a price:0/duration:0 fixture flight would otherwise be excluded
    // by the filter step before sort ever runs. Widen both ranges
    // explicitly so all four fixture flights reach the sort comparator;
    // these tests are about sort order, not the (unrelated, untouched)
    // range-filter behavior.
    act(() => {
      result.current.updateFilter("priceRange", [0, 1000]);
      result.current.updateFilter("durationRange", [0, 1000]);
    });

    return result;
  }

  it("defaults to 'cheapest', never 'best'", async () => {
    const result = await renderWithFixture();
    expect(result.current.sortBy).toBe("cheapest");
  });

  it("Cheapest: valid positive prices ascending, invalid/missing price (0) sorts last", async () => {
    const result = await renderWithFixture();
    act(() => result.current.setSortBy("cheapest"));
    expect(result.current.filteredFlights.map((f) => f.id)).toEqual(["f2", "f4", "f1", "f3"]);
  });

  it("Fastest: valid positive durations ascending, invalid/missing duration (0) sorts last", async () => {
    const result = await renderWithFixture();
    act(() => result.current.setSortBy("fastest"));
    expect(result.current.filteredFlights.map((f) => f.id)).toEqual(["f3", "f1", "f2", "f4"]);
  });

  it("Fewest stops: ascending stop count, ties broken by ascending price when both prices are valid", async () => {
    const result = await renderWithFixture();
    act(() => result.current.setSortBy("stops"));
    // f2 (stops 0, price 100) and f4 (stops 0, price 200) tie on stops —
    // both prices valid, so price ascending breaks the tie: f2 before f4.
    expect(result.current.filteredFlights.map((f) => f.id)).toEqual(["f2", "f4", "f1", "f3"]);
  });
});
