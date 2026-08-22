/**
 * getFlightPrices — Travelpayouts /aviasales/v3/prices_for_dates contract
 * (BF-0R-7 Phase C). No real network access — global fetch is stubbed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getFlightPrices } from "../travelpayouts.ts";

const config = { token: "test-token", marker: "test-marker" };

function stubFetch(responseBody: unknown, ok = true) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok,
    status: ok ? 200 : 500,
    json: () => Promise.resolve(responseBody),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("getFlightPrices — request contract", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends departure_at (not depart_date) for a one-way search", async () => {
    const fetchMock = stubFetch({ data: [] });

    await getFlightPrices(
      { origin: "syd", destination: "mel", departureDate: "2026-09-03" },
      config
    );

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("departure_at")).toBe("2026-09-03");
    expect(calledUrl.searchParams.has("depart_date")).toBe(false);
  });

  it("sends return_at (not return_date) for a round-trip search", async () => {
    const fetchMock = stubFetch({ data: [] });

    await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", returnDate: "2026-09-10" },
      config
    );

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("return_at")).toBe("2026-09-10");
    expect(calledUrl.searchParams.has("return_date")).toBe(false);
  });

  it("sends one_way=true for a one-way search (no returnDate)", async () => {
    const fetchMock = stubFetch({ data: [] });

    await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03" },
      config
    );

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("one_way")).toBe("true");
  });

  it("sends one_way=false for a round-trip search", async () => {
    const fetchMock = stubFetch({ data: [] });

    await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", returnDate: "2026-09-10" },
      config
    );

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.get("one_way")).toBe("false");
  });

  it("does NOT send adults, even when the caller supplies a passenger count", async () => {
    const fetchMock = stubFetch({ data: [] });

    await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", adults: 3 },
      config
    );

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.has("adults")).toBe(false);
  });

  it("never sends children/infants/cabin_class parameters (endpoint does not document them)", async () => {
    const fetchMock = stubFetch({ data: [] });

    await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03" },
      config
    );

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.searchParams.has("children")).toBe(false);
    expect(calledUrl.searchParams.has("infants")).toBe(false);
    expect(calledUrl.searchParams.has("cabin_class")).toBe(false);
  });

  it("hits the documented endpoint path", async () => {
    const fetchMock = stubFetch({ data: [] });

    await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03" },
      config
    );

    const calledUrl = new URL(fetchMock.mock.calls[0][0] as string);
    expect(calledUrl.pathname).toBe("/aviasales/v3/prices_for_dates");
  });
});

describe("getFlightPrices — response mapping / provenance", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps provider_departure_at and provider_return_at onto each result", async () => {
    stubFetch({
      data: [
        {
          origin: "SYD",
          destination: "MEL",
          airline: "JQ",
          price: 99,
          departure_at: "2026-09-03T21:25:00+03:00",
          return_at: "2026-09-10T09:50:00+03:00",
          link: "/searches/abc123",
        },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", returnDate: "2026-09-10" },
      config
    );

    expect(flights).toHaveLength(1);
    expect(flights[0].provider_departure_at).toBe("2026-09-03T21:25:00+03:00");
    expect(flights[0].provider_return_at).toBe("2026-09-10T09:50:00+03:00");
  });

  it("maps provider_return_at to null when the provider omits it (one-way result)", async () => {
    stubFetch({
      data: [
        {
          origin: "SYD",
          destination: "MEL",
          airline: "JQ",
          price: 99,
          departure_at: "2026-09-03T21:25:00+03:00",
          link: "/searches/abc123",
        },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03" },
      config
    );

    expect(flights[0].provider_return_at).toBeNull();
  });

  it("maps found_at to null when the provider does not return it (never fabricated)", async () => {
    stubFetch({
      data: [
        { origin: "SYD", destination: "MEL", airline: "JQ", price: 99, departure_at: "2026-09-03T21:25:00+03:00", link: "x" },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03" },
      config
    );

    expect(flights[0].found_at).toBeNull();
  });
});

describe("getFlightPrices — round-trip duration/return semantics (BF-0R-7 Phase 1.1 item 1)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("never maps return_at into segments[0].arrive_time (return-leg departure is not the outbound arrival)", async () => {
    stubFetch({
      data: [
        {
          origin: "SYD", destination: "MEL", airline: "JQ", price: 250,
          departure_at: "2026-09-03T21:25:00+03:00",
          return_at: "2026-09-10T09:50:00+03:00",
          duration: 700, duration_to: 95, duration_back: 90,
          link: "x",
        },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", returnDate: "2026-09-10" },
      config
    );

    expect(flights[0].segments[0].arrive_time).toBeNull();
  });

  it("uses duration_to (not the total round-trip duration) as duration_minutes for a round-trip result", async () => {
    stubFetch({
      data: [
        {
          origin: "SYD", destination: "MEL", airline: "JQ", price: 250,
          departure_at: "2026-09-03T21:25:00+03:00",
          return_at: "2026-09-10T09:50:00+03:00",
          duration: 700, // total round-trip — must NOT be used as outbound duration
          duration_to: 95, // the correct outbound-only duration
          duration_back: 90,
          link: "x",
        },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", returnDate: "2026-09-10" },
      config
    );

    expect(flights[0].duration_minutes).toBe(95);
  });

  it("falls back to `duration` for a genuine one-way result (no return_at, no duration_to)", async () => {
    stubFetch({
      data: [
        {
          origin: "SYD", destination: "MEL", airline: "JQ", price: 120,
          departure_at: "2026-09-03T21:25:00+03:00",
          duration: 95,
          link: "x",
        },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03" },
      config
    );

    expect(flights[0].duration_minutes).toBe(95);
  });

  it("does NOT fall back to the total `duration` for a round-trip result missing duration_to (leaves duration_minutes unknown/0 rather than mislabel the total)", async () => {
    stubFetch({
      data: [
        {
          origin: "SYD", destination: "MEL", airline: "JQ", price: 250,
          departure_at: "2026-09-03T21:25:00+03:00",
          return_at: "2026-09-10T09:50:00+03:00",
          duration: 700, // total round-trip — must NOT leak into duration_minutes
          link: "x",
        },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", returnDate: "2026-09-10" },
      config
    );

    expect(flights[0].duration_minutes).toBe(0);
  });

  it("keeps provider_return_at as separate return-leg-departure provenance, distinct from arrive_time and duration_minutes", async () => {
    stubFetch({
      data: [
        {
          origin: "SYD", destination: "MEL", airline: "JQ", price: 250,
          departure_at: "2026-09-03T21:25:00+03:00",
          return_at: "2026-09-10T09:50:00+03:00",
          duration_to: 95,
          link: "x",
        },
      ],
    });

    const { flights } = await getFlightPrices(
      { origin: "SYD", destination: "MEL", departureDate: "2026-09-03", returnDate: "2026-09-10" },
      config
    );

    expect(flights[0].provider_return_at).toBe("2026-09-10T09:50:00+03:00");
    expect(flights[0].segments[0].arrive_time).toBeNull();
    expect(flights[0].duration_minutes).toBe(95);
  });
});
