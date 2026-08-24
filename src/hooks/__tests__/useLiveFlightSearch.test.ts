/**
 * BF-FLIGHTS-LIVE-4 Phase H/W — round-trip two-step token flow and
 * one-way flow state machine.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: (name: string) => `https://mock.test/functions/v1/${name}`,
}));

import { useLiveFlightSearch } from "@/hooks/useLiveFlightSearch";

function itinerary(id: string, extra: Record<string, unknown> = {}) {
  return {
    id, providerResultId: null, category: "best", price: 300, currency: "AUD",
    tripType: "round_trip", totalDurationMinutes: 120, segments: [], layovers: [],
    stops: 0, carbonEmissionsGrams: null, departureToken: null, bookingToken: null,
    ...extra,
  };
}

function stubFetch(handler: (body: any) => any) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation((_url: string, init: RequestInit) => {
    const body = JSON.parse(init.body as string);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(handler(body)) });
  }));
}

const baseParams = {
  origin: "SYD", destination: "MEL", departureDate: "2099-01-10",
  adults: 1, children: 0, infants: 0, cabinClass: "economy" as const, currency: "AUD",
};

beforeEach(() => {
  vi.unstubAllGlobals();
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useLiveFlightSearch — one-way", () => {
  it("renders full itineraries directly, no step 2", async () => {
    stubFetch(() => ({ status: "ok", itineraries: [itinerary("f1", { bookingToken: "BOOK1" })], currency: "AUD", searchedAt: "x" }));

    const { result } = renderHook(() => useLiveFlightSearch({ ...baseParams, tripType: "one_way" }));

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.step).toBe("outbound");
    expect(result.current.itineraries).toHaveLength(1);
  });
});

describe("useLiveFlightSearch — round trip", () => {
  it("initial search only fetches once (no fan-out of return searches per outbound result)", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(
          body.departureToken
            ? { status: "ok", itineraries: [itinerary("r1")], currency: "AUD", searchedAt: "x" }
            : { status: "ok", itineraries: [itinerary("o1", { departureToken: "DEP1" }), itinerary("o2", { departureToken: "DEP2" })], currency: "AUD", searchedAt: "x" },
        ),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useLiveFlightSearch({ ...baseParams, tripType: "round_trip", returnDate: "2099-01-20" }));

    await waitFor(() => expect(result.current.status).toBe("ok"));
    expect(result.current.step).toBe("outbound");
    expect(result.current.itineraries).toHaveLength(2);
    // Exactly one call so far — selecting an outbound has not happened yet.
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("selecting an outbound itinerary fetches return options using its departure_token, and only then", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(
          body.departureToken
            ? { status: "ok", itineraries: [itinerary("r1", { bookingToken: "BOOK1" })], currency: "AUD", searchedAt: "x" }
            : { status: "ok", itineraries: [itinerary("o1", { departureToken: "DEP1" })], currency: "AUD", searchedAt: "x" },
        ),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useLiveFlightSearch({ ...baseParams, tripType: "round_trip", returnDate: "2099-01-20" }));
    await waitFor(() => expect(result.current.status).toBe("ok"));

    act(() => {
      result.current.selectOutbound(result.current.itineraries[0]);
    });

    await waitFor(() => expect(result.current.step).toBe("return"));
    await waitFor(() => expect(result.current.itineraries[0]?.id).toBe("r1"));

    const returnCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(returnCallBody.departureToken).toBe("DEP1");
    expect(result.current.itineraries[0].bookingToken).toBe("BOOK1");
  });

  it("backToOutbound returns to the original outbound list without re-fetching", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, init: RequestInit) => {
      const body = JSON.parse(init.body as string);
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(
          body.departureToken
            ? { status: "ok", itineraries: [itinerary("r1")], currency: "AUD", searchedAt: "x" }
            : { status: "ok", itineraries: [itinerary("o1", { departureToken: "DEP1" })], currency: "AUD", searchedAt: "x" },
        ),
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() => useLiveFlightSearch({ ...baseParams, tripType: "round_trip", returnDate: "2099-01-20" }));
    await waitFor(() => expect(result.current.status).toBe("ok"));

    act(() => result.current.selectOutbound(result.current.itineraries[0]));
    await waitFor(() => expect(result.current.step).toBe("return"));

    const callsBeforeBack = fetchMock.mock.calls.length;
    act(() => result.current.backToOutbound());

    expect(result.current.step).toBe("outbound");
    expect(result.current.itineraries[0].id).toBe("o1");
    expect(fetchMock).toHaveBeenCalledTimes(callsBeforeBack);
  });
});

describe("useLiveFlightSearch — failure states", () => {
  it("surfaces 'unavailable' with an error message on upstream failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({ error: "Live flight search is temporarily unavailable" }) }));

    const { result } = renderHook(() => useLiveFlightSearch({ ...baseParams, tripType: "one_way" }));
    await waitFor(() => expect(result.current.status).toBe("unavailable"));
    expect(result.current.errorMessage).toBeTruthy();
  });

  it("distinguishes a genuine empty result (no_results) from an unavailable one", async () => {
    stubFetch(() => ({ status: "no_results", itineraries: [], currency: "AUD", searchedAt: "x" }));
    const { result } = renderHook(() => useLiveFlightSearch({ ...baseParams, tripType: "one_way" }));
    await waitFor(() => expect(result.current.status).toBe("no_results"));
  });

  it("does not fetch when enabled is false", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { result } = renderHook(() => useLiveFlightSearch({ ...baseParams, tripType: "one_way", enabled: false }));
    expect(result.current.status).toBe("idle");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
