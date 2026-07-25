import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
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

// ── calculateFilterRanges unit tests ──

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

// ── Regression: filter range staleness after repeated fetch ──

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
    // Mock trackAffiliateEvent
    vi.mock("@/services/travelApi", () => ({
      trackAffiliateEvent: vi.fn(),
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
