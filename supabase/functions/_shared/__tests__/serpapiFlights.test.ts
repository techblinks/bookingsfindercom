/**
 * BF-FLIGHTS-LIVE-4 Phase W — serpapiFlights.ts request-building and
 * response-normalization contract. No real network access — global fetch
 * is stubbed, matching the existing travelpayouts.test.ts convention.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { searchFlights, getBookingOptions, getSerpApiConfig, SerpApiError, SERPAPI_TIMEOUT_MS } from "../serpapiFlights.ts";

const config = { apiKey: "test-serpapi-key" };

function stubFetch(responseBody: unknown, ok = true, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status,
    json: () => Promise.resolve(responseBody),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const baseInput = {
  origin: "SYD",
  destination: "MEL",
  departureDate: "2030-01-10",
  tripType: "one_way" as const,
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: "economy" as const,
  currency: "AUD",
};

describe("searchFlights — request contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps origin/destination to departure_id/arrival_id exactly", async () => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights(baseInput, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("departure_id")).toBe("SYD");
    expect(url.searchParams.get("arrival_id")).toBe("MEL");
  });

  it("sends type=2 for a one-way search", async () => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights({ ...baseInput, tripType: "one_way" }, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("type")).toBe("2");
    expect(url.searchParams.has("return_date")).toBe(false);
  });

  it("sends type=1 and return_date for a round-trip search", async () => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights({ ...baseInput, tripType: "round_trip", returnDate: "2030-01-20" }, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("type")).toBe("1");
    expect(url.searchParams.get("return_date")).toBe("2030-01-20");
  });

  it.each([
    ["economy", "1"],
    ["premium_economy", "2"],
    ["business", "3"],
    ["first", "4"],
  ] as const)("maps cabinClass %s to travel_class %s", async (cabinClass, expected) => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights({ ...baseInput, cabinClass }, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("travel_class")).toBe(expected);
  });

  it("maps adults/children/infants_on_lap", async () => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights({ ...baseInput, adults: 2, children: 1, infants: 1 }, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("adults")).toBe("2");
    expect(url.searchParams.get("children")).toBe("1");
    expect(url.searchParams.get("infants_on_lap")).toBe("1");
  });

  it("omits children/infants params entirely when zero (never sends children=0)", async () => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights(baseInput, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.has("children")).toBe(false);
    expect(url.searchParams.has("infants_on_lap")).toBe(false);
  });

  it("passes the resolved currency through unchanged", async () => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights({ ...baseInput, currency: "JPY" }, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("currency")).toBe("JPY");
  });

  it("includes departure_token only for a return-leg lookup", async () => {
    const fetchMock = stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights({ ...baseInput, departureToken: "TOKEN123" }, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("departure_token")).toBe("TOKEN123");
  });

  it("never returns or logs the API key — console output redacts it", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    stubFetch({ best_flights: [], other_flights: [] });
    await searchFlights(baseInput, config);

    const loggedText = logSpy.mock.calls.map((c) => c.join(" ")).join("\n");
    expect(loggedText).not.toContain(config.apiKey);
    expect(loggedText).toContain("api_key=***");
    logSpy.mockRestore();
  });
});

describe("searchFlights — response normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes best_flights and other_flights into categorized itineraries", async () => {
    stubFetch({
      best_flights: [{ price: 500, flights: [], layovers: [] }],
      other_flights: [{ price: 600, flights: [], layovers: [] }],
    });
    const result = await searchFlights(baseInput, config);
    expect(result.status).toBe("ok");
    expect(result.itineraries).toHaveLength(2);
    expect(result.itineraries[0].category).toBe("best");
    expect(result.itineraries[1].category).toBe("other");
  });

  it("reports no_results when both arrays are empty", async () => {
    stubFetch({ best_flights: [], other_flights: [] });
    const result = await searchFlights(baseInput, config);
    expect(result.status).toBe("no_results");
    expect(result.itineraries).toHaveLength(0);
  });

  it("computes a direct itinerary (0 stops) from a single segment", async () => {
    stubFetch({
      best_flights: [{
        price: 300,
        flights: [{ departure_airport: { id: "SYD", time: "2030-01-10 08:00" }, arrival_airport: { id: "MEL", time: "2030-01-10 09:30" } }],
        layovers: [],
      }],
      other_flights: [],
    });
    const result = await searchFlights(baseInput, config);
    expect(result.itineraries[0].stops).toBe(0);
  });

  it("computes a connecting itinerary's stop count and layovers from multiple segments", async () => {
    stubFetch({
      best_flights: [{
        price: 450,
        flights: [
          { departure_airport: { id: "SYD", time: "2030-01-10 08:00" }, arrival_airport: { id: "BNE", time: "2030-01-10 09:30" } },
          { departure_airport: { id: "BNE", time: "2030-01-10 11:00" }, arrival_airport: { id: "MEL", time: "2030-01-10 13:00" } },
        ],
        layovers: [{ id: "BNE", name: "Brisbane Airport", duration: 90 }],
      }],
      other_flights: [],
    });
    const result = await searchFlights(baseInput, config);
    expect(result.itineraries[0].stops).toBe(1);
    expect(result.itineraries[0].layovers).toEqual([
      { airportCode: "BNE", airportName: "Brisbane Airport", durationMinutes: 90, overnight: false },
    ]);
  });

  it("falls back to a null airline logo when the provider omits one — never fabricates a URL", async () => {
    stubFetch({
      best_flights: [{
        price: 300,
        flights: [{ departure_airport: { id: "SYD", time: "2030-01-10 08:00" }, arrival_airport: { id: "MEL", time: "2030-01-10 09:30" } }],
        layovers: [],
      }],
      other_flights: [],
    });
    const result = await searchFlights(baseInput, config);
    expect(result.itineraries[0].segments[0].airlineLogoUrl).toBeNull();
  });

  it("never fabricates carbonEmissionsGrams, departureToken or bookingToken when absent", async () => {
    stubFetch({ best_flights: [{ price: 300, flights: [], layovers: [] }], other_flights: [] });
    const result = await searchFlights(baseInput, config);
    expect(result.itineraries[0].carbonEmissionsGrams).toBeNull();
    expect(result.itineraries[0].departureToken).toBeNull();
    expect(result.itineraries[0].bookingToken).toBeNull();
  });

  it("carries price and currency through to the itinerary", async () => {
    stubFetch({ best_flights: [{ price: 789, flights: [], layovers: [] }], other_flights: [] });
    const result = await searchFlights({ ...baseInput, currency: "EUR" }, config);
    expect(result.itineraries[0].price).toBe(789);
    expect(result.itineraries[0].currency).toBe("EUR");
  });
});

describe("searchFlights — upstream failure handling", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws a SerpApiError with kind 'upstream' on a 4xx/5xx response, never crashing silently", async () => {
    stubFetch({ error: "Invalid api key" }, false, 401);
    await expect(searchFlights(baseInput, config)).rejects.toMatchObject({
      name: "SerpApiError",
      kind: "upstream",
      statusCode: 401,
    });
  });

  it("classifies a fetch AbortError as kind 'timeout' (what the internal SERPAPI_TIMEOUT_MS bound produces)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("Aborted", "AbortError")));
    await expect(searchFlights(baseInput, config)).rejects.toMatchObject({
      name: "SerpApiError",
      kind: "timeout",
      statusCode: 504,
    });
  });

  it("SERPAPI_TIMEOUT_MS is a bounded, finite value (Phase T — requests must not hang indefinitely)", () => {
    expect(SERPAPI_TIMEOUT_MS).toBeGreaterThan(0);
    expect(SERPAPI_TIMEOUT_MS).toBeLessThanOrEqual(30_000);
  });
});

describe("getSerpApiConfig — fails closed when the secret is missing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("throws rather than returning an empty/fake key when SERPAPI_API_KEY is unset", () => {
    vi.stubGlobal("Deno", { env: { get: () => undefined } });
    expect(() => getSerpApiConfig()).toThrow(SerpApiError);
  });

  it("returns the configured key when present", () => {
    vi.stubGlobal("Deno", { env: { get: (name: string) => (name === "SERPAPI_API_KEY" ? "real-key" : undefined) } });
    expect(getSerpApiConfig()).toEqual({ apiKey: "real-key" });
  });
});

describe("getBookingOptions — normalization", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("adds booking_token to the request", async () => {
    const fetchMock = stubFetch({ booking_options: [] });
    await getBookingOptions({ ...baseInput, bookingToken: "BOOK123" }, config);
    const url = new URL(fetchMock.mock.calls[0][0] as string);
    expect(url.searchParams.get("booking_token")).toBe("BOOK123");
  });

  it("normalizes a 'together' booking option, never fabricating a seller", async () => {
    stubFetch({
      booking_options: [{ together: { book_with: "Qantas", price: 450, booking_request: { url: "https://qantas.com/book", post_data: null } } }],
    });
    const result = await getBookingOptions({ ...baseInput, bookingToken: "BOOK123" }, config);
    expect(result.options).toEqual([
      {
        bookingProvider: "Qantas",
        price: 450,
        currency: "AUD",
        localPrice: null,
        localCurrency: null,
        baggagePolicyUrl: null,
        bookingRequest: { url: "https://qantas.com/book", postData: null },
      },
    ]);
  });

  it("drops an entry with neither together/departing/returning rather than fabricating one", async () => {
    stubFetch({ booking_options: [{}] });
    const result = await getBookingOptions({ ...baseInput, bookingToken: "BOOK123" }, config);
    expect(result.options).toHaveLength(0);
  });
});
