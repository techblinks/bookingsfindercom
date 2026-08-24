/**
 * BF-FLIGHTS-LIVE-4 Phase W — frontend live-flights API client.
 * Proves the API key is never referenced/returned here (server-side only),
 * and that failures/malformed responses always resolve to a truthful
 * "unavailable" result rather than throwing or fabricating "ok".
 */
import { describe, it, expect, vi, afterEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: (name: string) => `https://mock.test/functions/v1/${name}`,
}));

import { searchLiveFlights, getLiveFlightBookingOptions } from "@/lib/liveFlightsApi";

const request = {
  origin: "SYD", destination: "MEL", departureDate: "2099-01-10",
  tripType: "one_way" as const, adults: 1, children: 0, infants: 0,
  cabinClass: "economy" as const, currency: "AUD",
};

function stubFetch(impl: (url: string) => Promise<{ ok: boolean; json: () => Promise<unknown> }>) {
  vi.stubGlobal("fetch", vi.fn().mockImplementation(impl));
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("searchLiveFlights", () => {
  it("returns the well-formed result on success", async () => {
    stubFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ status: "ok", itineraries: [], currency: "AUD", searchedAt: "x" }) }));
    const result = await searchLiveFlights(request);
    expect(result.status).toBe("ok");
  });

  it("returns 'unavailable' truthfully on a non-ok HTTP response, never throwing", async () => {
    stubFetch(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "Upstream failed" }) }));
    const result = await searchLiveFlights(request);
    expect(result.status).toBe("unavailable");
  });

  it("returns 'unavailable' when fetch itself rejects (network failure)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    const result = await searchLiveFlights(request);
    expect(result.status).toBe("unavailable");
  });

  it("returns 'unavailable' when the 200 response body is malformed (never trusts an unrecognized shape as ok)", async () => {
    stubFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ flights: [], meta: {} }) }));
    const result = await searchLiveFlights(request);
    expect(result.status).toBe("unavailable");
  });

  it("never references or logs an API key value in the request it sends", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: "ok", itineraries: [], currency: "AUD", searchedAt: "x" }) });
    vi.stubGlobal("fetch", fetchMock);
    await searchLiveFlights(request);

    const [, init] = fetchMock.mock.calls[0];
    const bodyText = JSON.stringify(init.body);
    expect(bodyText).not.toMatch(/serpapi/i);
    expect(bodyText).not.toMatch(/api_key/i);
  });

  it("posts to the search-live-flights function, not directly to SerpApi", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: () => Promise.resolve({ status: "ok", itineraries: [], currency: "AUD", searchedAt: "x" }) });
    vi.stubGlobal("fetch", fetchMock);
    await searchLiveFlights(request);

    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/functions/v1/search-live-flights");
    expect(String(url)).not.toContain("serpapi.com");
  });
});

describe("getLiveFlightBookingOptions", () => {
  it("returns 'unavailable' on failure rather than throwing", async () => {
    stubFetch(() => Promise.resolve({ ok: false, json: () => Promise.resolve({ error: "fail" }) }));
    const result = await getLiveFlightBookingOptions({ ...request, bookingToken: "BOOK1" });
    expect(result.status).toBe("unavailable");
    expect(result.options).toEqual([]);
  });

  it("returns the well-formed result on success", async () => {
    stubFetch(() => Promise.resolve({ ok: true, json: () => Promise.resolve({ status: "ok", options: [] }) }));
    const result = await getLiveFlightBookingOptions({ ...request, bookingToken: "BOOK1" });
    expect(result.status).toBe("ok");
  });
});
