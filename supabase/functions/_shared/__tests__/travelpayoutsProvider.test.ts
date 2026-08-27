/**
 * BF1-E ADAPTER BEHAVIOUR TESTS — TravelpayoutsProvider fail-closed semantics.
 *
 * Complements travelpayoutsProvider.golden.test.ts (which locks byte-exact
 * public contracts against pre-refactor snapshots). This suite pins the
 * adapter's DEFENSIVE behaviour:
 *   - provider identity (BF1-D registry id reuse)
 *   - HTTP errors propagate as typed TravelpayoutsError with upstream status
 *   - malformed upstream envelopes fail closed (502), never partial offers
 *   - malformed individual rows are DROPPED with a warning, siblings survive
 *   - empty upstream stays an honest empty result
 *
 * No network access: fetch and Deno.env are stubbed per suite.
 */
import { describe, it, expect, beforeAll, beforeEach, afterEach, vi } from "vitest";
import { createTravelpayoutsProvider } from "../travelpayoutsProvider.ts";
import { TravelpayoutsError } from "../travelpayouts.ts";

function stubFetch(payload: unknown, opts?: { ok?: boolean; status?: number }): void {
  const ok = opts?.ok ?? true;
  const status = opts?.status ?? 200;
  globalThis.fetch = (async () => ({
    ok,
    status,
    json: async () => payload,
  })) as unknown as typeof fetch;
}

/** Raw prices_for_dates row shaped exactly like the committed fixtures. */
function rawOnewayRow(overrides: Record<string, unknown>): Record<string, unknown> {
  return {
    origin: "SYD",
    destination: "DPS",
    origin_airport: "SYD",
    destination_airport: "DPS",
    price: 389.4,
    airline: "JQ",
    flight_number: "JQ43",
    departure_at: "2026-10-01T11:05:00+10:00",
    transfers: 0,
    duration: 375,
    link: "/search/SYD0110DPS1",
    ...overrides,
  };
}

const SEARCH_QUERY = {
  origin: "SYD",
  destination: "DPS",
  departureDate: "2026-10-01",
  returnDate: undefined,
  adults: 1,
  currency: "USD",
} as const;

beforeAll(() => {
  // Adapter reads credentials via Deno.env (getConfig) on every call.
  (globalThis as Record<string, unknown>).Deno = {
    env: {
      get: (key: string) =>
        key === "TRAVELPAYOUTS_API_KEY"
          ? "test-token"
          : key === "MARKER_ID"
            ? "TESTMARKER"
            : undefined,
    },
  };
  vi.spyOn(console, "log").mockImplementation(() => {});
});

// Fresh console mocks per test so warn-call counts never leak across suites.
beforeEach(() => {
  vi.restoreAllMocks();
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BF1-E adapter behaviour: provider identity", () => {
  it("exposes the BF1-D supplier registry id 'travelpayouts'", () => {
    const provider = createTravelpayoutsProvider();
    expect(provider.providerId).toBe("travelpayouts");
  });
});

describe("BF1-E adapter behaviour: search()", () => {
  it("propagates upstream HTTP failures as TravelpayoutsError with upstream status", async () => {
    stubFetch({ error: "upstream unavailable" }, { ok: false, status: 503 });
    const provider = createTravelpayoutsProvider();
    await expect(provider.search({ ...SEARCH_QUERY })).rejects.toMatchObject({
      name: "TravelpayoutsError",
      statusCode: 503,
    });
  });

  it("fails closed with 502 when the prices envelope is structurally wrong", async () => {
    // data.data truthy but NOT an array -> transport .map crashes -> adapter
    // must surface a typed 502, never leak the TypeError.
    stubFetch({ success: true, data: { oops: "not-an-array" } });
    const provider = createTravelpayoutsProvider();
    const err = await provider.search({ ...SEARCH_QUERY }).catch((e) => e);
    expect(err).toBeInstanceOf(TravelpayoutsError);
    expect(err.statusCode).toBe(502);
    expect((err as Error).message).toBe("Malformed flight prices payload");
  });

  it("missing data key yields an honest empty result", async () => {
    stubFetch({ success: true });
    const provider = createTravelpayoutsProvider();
    const result = await provider.search({ ...SEARCH_QUERY });
    expect(result.offers).toEqual([]);
    expect(result.totalFound).toBe(0);
    expect(result.isComplete).toBe(true);
    expect(result.excludedNearestDateCount).toBe(0);
  });

  it("drops malformed rows with a warning and keeps valid siblings", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubFetch({
      success: true,
      data: [
        rawOnewayRow({}), // valid JQ row departing 2026-10-01
        rawOnewayRow({ price: "not-a-number", airline: "ZZ", flight_number: "ZZ01", link: "/search/BAD1" }), // price type violation
        rawOnewayRow({ airline: "YY", flight_number: "YY02", link: "" }), // unusable deep link
        rawOnewayRow({ airline: "WW", flight_number: "WW03", departure_at: "", link: "/search/BAD3" }), // no stated departure
      ],
    });
    const provider = createTravelpayoutsProvider();
    const result = await provider.search({ ...SEARCH_QUERY });

    expect(result.offers.length).toBe(1);
    expect(result.offers[0].carrierCode).toBe("JQ");
    expect(result.offers[0].providerId).toBe("travelpayouts");
    expect(result.totalFound).toBe(1);
    expect(warnSpy).toHaveBeenCalledTimes(3);
    expect(String(warnSpy.mock.calls[0][0])).toContain("[travelpayoutsProvider]");
  });
});

describe("BF1-E adapter behaviour: getPriceCalendar()", () => {
  const CAL_QUERY = { origin: "BNE", destination: "DPS", month: "2026-09", currency: "USD" } as const;

  it("passes the upstream HTTP status through on failure", async () => {
    stubFetch({ error: "Rate limited" }, { ok: false, status: 429 });
    const provider = createTravelpayoutsProvider();
    const err = await provider.getPriceCalendar(CAL_QUERY).catch((e) => e);
    expect(err).toBeInstanceOf(TravelpayoutsError);
    expect(err.statusCode).toBe(429);
    expect((err as Error).message).toBe("Rate limited");
  });

  // CONTRACT-PARITY CLOSEOUT (Fix 3): pre-BF1-E get-price-calendar read
  // `data.error` WITHOUT optional chaining after `await response.json()`.
  // When an upstream error body parsed to JSON null, that property access
  // threw an untyped TypeError which landed on the handler's GENERIC 500
  // catch. The adapter must preserve exactly that fall-through — a typed
  // TravelpayoutsError here would wrongly expose the provider status code.
  it("JSON-null error body falls through UNTYPED (legacy generic-500 path), not as TravelpayoutsError", async () => {
    stubFetch(null, { ok: false, status: 502 });
    const provider = createTravelpayoutsProvider();
    const err = await provider.getPriceCalendar(CAL_QUERY).catch((e) => e);
    expect(err).not.toBeInstanceOf(TravelpayoutsError);
    expect(err).toBeInstanceOf(TypeError); // untyped -> Edge Function emits 500
  });

  it("non-object JSON error bodies (string) still pass the provider status through, like pre-BF1-E", async () => {
    // Property access on a string yields undefined without throwing — legacy
    // exposed the real status with the fallback message for this class too.
    stubFetch("Unauthorized", { ok: false, status: 401 });
    const provider = createTravelpayoutsProvider();
    const err = await provider.getPriceCalendar(CAL_QUERY).catch((e) => e);
    expect(err).toBeInstanceOf(TravelpayoutsError);
    expect(err.statusCode).toBe(401);
    expect((err as Error).message).toBe("Failed to fetch price calendar");
  });

  it("fails closed with 502 when month-matrix data.data is not an array", async () => {
    stubFetch({});
    const provider = createTravelpayoutsProvider();
    const err = await provider.getPriceCalendar(CAL_QUERY).catch((e) => e);
    expect(err).toBeInstanceOf(TravelpayoutsError);
    expect(err.statusCode).toBe(502);
    expect((err as Error).message).toBe("Malformed price calendar payload");
  });

  it("drops malformed calendar rows and keeps parseable ones", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubFetch({
      data: [
        { depart_date: "2026-09-05", value: 123.45, return_date: "2026-09-12", gate: "Emirates", number_of_changes: 1, trip_duration: 7 },
        { depart_date: "2026-09-06" }, // missing numeric value -> dropped
      ],
    });
    const provider = createTravelpayoutsProvider();
    const calendar = await provider.getPriceCalendar(CAL_QUERY);

    expect(calendar.entries.length).toBe(1);
    expect(calendar.entries[0].date).toBe("2026-09-05");
    expect(calendar.entries[0].price.amountMajor).toBe(123.45);
    expect(calendar.entries[0].gateLabel).toBe("Emirates");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("an empty matrix stays an empty calendar", async () => {
    stubFetch({ data: [] });
    const provider = createTravelpayoutsProvider();
    const calendar = await provider.getPriceCalendar(CAL_QUERY);
    expect(calendar.entries).toEqual([]);
  });
});

describe("BF1-E adapter behaviour: getRouteSuggestions()", () => {
  it("passes the upstream HTTP status through on failure", async () => {
    stubFetch({}, { ok: false, status: 500 });
    const provider = createTravelpayoutsProvider();
    const err = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 }).catch((e) => e);
    expect(err).toBeInstanceOf(TravelpayoutsError);
    expect(err.statusCode).toBe(500);
    expect((err as Error).message).toBe("Failed to fetch popular directions");
  });

  it("fails closed with 502 when city-directions data is null", async () => {
    stubFetch({ data: null });
    const provider = createTravelpayoutsProvider();
    const err = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 }).catch((e) => e);
    expect(err).toBeInstanceOf(TravelpayoutsError);
    expect(err.statusCode).toBe(502);
    expect((err as Error).message).toBe("Malformed popular directions payload");
  });

  it("applies limit BEFORE validation, matching pre-BF1-E slicing order", async () => {
    // First entry within the limit window is malformed; if validation ran
    // before slicing we would see 2 routes here — seeing exactly 1 proves the
    // original slice-then-map ordering was preserved.
    stubFetch({
      data: {
        AAA: { price: "cheap" }, // type-violating price -> dropped
        BBB: { destination: "BBB", origin: "BNE", price: 99 },
        CCC: { destination: "CCC", origin: "BNE", price: 88 },
      },
    });
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 2 });

    expect(result.routes.length).toBe(1);
    expect(result.routes[0].destination).toBe("BBB");
    expect(result.routes[0].price?.amountMajor).toBe(99);
    expect(result.routes[0].origin).toBe("BNE");
  });
});

describe("BF1-E parity regression: popular-directions currency precedence", () => {
  // CONTRACT-PARITY CLOSEOUT (Fix 2): pre-BF1-E wire semantics were
  // `currency: data.currency || currency`. Both directions of the precedence
  // are locked here at the adapter/wire boundary.
  it("upstream-declared currency DIFFERING from the request wins (data.currency || currency)", async () => {
    stubFetch({ success: true, currency: "EUR", data: { DPS: { price: 489 } } });
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 });
    expect(result.currency).toBe("EUR");
  });

  it("absent upstream currency falls back to the requested currency", async () => {
    stubFetch({ success: true, data: { DPS: { price: 489 } } });
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 });
    expect(result.currency).toBe("USD");
  });

  it.each([
    ["null upstream currency", null],
    ["empty-string upstream currency", ""],
  ])("%s falls back to the requested currency (legacy truthiness)", async (_name, badCurrency) => {
    stubFetch({ success: true, currency: badCurrency, data: { DPS: { price: 489 } } });
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 });
    expect(result.currency).toBe("USD");
  });
});

describe("BF1-E adapter behaviour: getSpecialOffers()", () => {
  it("passes the upstream HTTP status through on failure", async () => {
    stubFetch({}, { ok: false, status: 403 });
    const provider = createTravelpayoutsProvider();
    const err = await provider.getSpecialOffers({ origin: "LHR", currency: "USD", limit: 8 }).catch((e) => e);
    expect(err).toBeInstanceOf(TravelpayoutsError);
    expect(err.statusCode).toBe(403);
    expect((err as Error).message).toBe("Failed to fetch offers");
  });

  it.each([
    ["success:false stays an honest empty array", { success: false, data: [{ destination: "BCN" }] }],
    ["missing data stays an honest empty array", { success: true, data: null }],
  ])("%s", async (_name, payload) => {
    stubFetch(payload);
    const provider = createTravelpayoutsProvider();
    const result = await provider.getSpecialOffers({ origin: "LHR", currency: "USD", limit: 8 });
    expect(result.offers).toEqual([]);
    // CONTRACT-PARITY CLOSEOUT (Fix 1): these are upstream-ENVELOPE empty
    // states — the legacy wire used source:"empty" for exactly this class.
    expect(result.upstreamEmpty).toBe(true);
  });

  it("a truthy but empty data envelope is POPULATED (upstreamEmpty false), like pre-BF1-E", async () => {
    // `data: []` is truthy in JS, so pre-BF1-E proceeded past the empty check
    // and returned source:"travelpayouts_latest" with zero offers. Locked so
    // the flag can never regress into an array-length check.
    stubFetch({ success: true, data: [] });
    const provider = createTravelpayoutsProvider();
    const result = await provider.getSpecialOffers({ origin: "LHR", currency: "USD", limit: 8 });
    expect(result.offers).toEqual([]);
    expect(result.upstreamEmpty).toBe(false);
  });

  it("drops type-violating deals and keeps valid ones with provider-supplied observedAt", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    stubFetch({
      success: true,
      data: [
        { destination: "BCN", depart_date: "2026-09-10", value: 120, airline: "FR", found_at: "2026-08-24T09:15:00Z" },
        { destination: "XXX", value: "expensive" }, // price type violation -> dropped
      ],
    });
    const provider = createTravelpayoutsProvider();
    const result = await provider.getSpecialOffers({ origin: "LHR", currency: "USD", limit: 8 });

    expect(result.offers.length).toBe(1);
    expect(result.offers[0].destination).toBe("BCN");
    expect(result.offers[0].observedAt).toBe("2026-08-24T09:15:00Z"); // never fabricated
    expect(result.offers[0].deepLink).toContain("marker=TESTMARKER");
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });
});

describe("BF1-F money contract", () => {
  it("fails closed on malformed REQUEST currency (400, no silent default)", async () => {
    const provider = createTravelpayoutsProvider();
    await expect(
      provider.search({ ...SEARCH_QUERY, currency: "12$" })
    ).rejects.toMatchObject({ name: "TravelpayoutsError", statusCode: 400 });
  });

  it("fails closed on malformed UPSTREAM-declared currency (502)", async () => {
    stubFetch({ success: true, currency: "NOPE", data: { DPS: { price: 489 } } });
    const provider = createTravelpayoutsProvider();
    await expect(
      provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 })
    ).rejects.toMatchObject({ name: "TravelpayoutsError", statusCode: 502 });
  });

  it("performs NO FX conversion: upstream amounts pass through verbatim", async () => {
    stubFetch({ success: true, currency: "EUR", data: { DPS: { price: 489.7 } } });
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({ origin: "BNE", currency: "USD", limit: 10 });
    expect(result.routes[0].price?.amountMajor).toBe(489.7);
    expect(result.routes[0].price?.currency).toBe("EUR");
    expect(result.currency).toBe("EUR");
  });
});