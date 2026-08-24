/**
 * BF-FLIGHTS-LIVE-4 Phase E/W — fail-closed input validation contract.
 */
import { describe, it, expect } from "vitest";
import { LiveFlightSearchRequestSchema, LiveFlightBookingOptionsRequestSchema, LIVE_FLIGHT_SUPPORTED_CURRENCIES } from "../liveFlightValidation.ts";

const valid = {
  origin: "SYD",
  destination: "MEL",
  departureDate: "2099-01-10",
  tripType: "one_way" as const,
  adults: 1,
  children: 0,
  infants: 0,
  cabinClass: "economy" as const,
  currency: "AUD",
};

describe("LiveFlightSearchRequestSchema — IATA and route", () => {
  it("accepts a well-formed one-way request", () => {
    expect(LiveFlightSearchRequestSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects a lowercase origin", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, origin: "syd" }).success).toBe(false);
  });

  it("rejects a 2-letter code", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, origin: "SY" }).success).toBe(false);
  });

  it("rejects a 4-letter code", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, destination: "MELB" }).success).toBe(false);
  });

  it("rejects origin === destination", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, destination: "SYD" }).success).toBe(false);
  });
});

describe("LiveFlightSearchRequestSchema — dates", () => {
  it("rejects a past departure date", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, departureDate: "2020-01-01" }).success).toBe(false);
  });

  it("rejects a malformed date format", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, departureDate: "10-01-2099" }).success).toBe(false);
  });

  it("rejects a round-trip search with no return date", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, tripType: "round_trip" }).success).toBe(false);
  });

  it("rejects a return date before the departure date", () => {
    expect(
      LiveFlightSearchRequestSchema.safeParse({
        ...valid, tripType: "round_trip", returnDate: "2099-01-05",
      }).success,
    ).toBe(false);
  });

  it("accepts a valid round trip", () => {
    expect(
      LiveFlightSearchRequestSchema.safeParse({
        ...valid, tripType: "round_trip", returnDate: "2099-01-20",
      }).success,
    ).toBe(true);
  });
});

describe("LiveFlightSearchRequestSchema — cabin class", () => {
  it.each(["economy", "premium_economy", "business", "first"])("accepts cabin class %s", (cabinClass) => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, cabinClass }).success).toBe(true);
  });

  it("rejects an unsupported cabin class", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, cabinClass: "suite" }).success).toBe(false);
  });
});

describe("LiveFlightSearchRequestSchema — currency", () => {
  it.each(LIVE_FLIGHT_SUPPORTED_CURRENCIES)("accepts supported currency %s", (currency) => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, currency }).success).toBe(true);
  });

  it("rejects an unsupported currency code", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, currency: "XYZ" }).success).toBe(false);
  });
});

describe("LiveFlightSearchRequestSchema — passengers", () => {
  it("rejects zero adults", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, adults: 0 }).success).toBe(false);
  });

  it("rejects more than 9 adults", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, adults: 10 }).success).toBe(false);
  });

  it("rejects an infant count exceeding the accompanying adult count", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, adults: 1, infants: 2 }).success).toBe(false);
  });

  it("accepts infants equal to adults", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, adults: 2, infants: 2 }).success).toBe(true);
  });
});

describe("LiveFlightSearchRequestSchema — no arbitrary caller-controlled params", () => {
  it("rejects an unrecognized extra field instead of silently stripping it", () => {
    const result = LiveFlightSearchRequestSchema.safeParse({ ...valid, deep_search: true, no_cache: true });
    expect(result.success).toBe(false);
  });

  it("accepts an optional departureToken for the return-leg step", () => {
    expect(LiveFlightSearchRequestSchema.safeParse({ ...valid, departureToken: "TOKEN" }).success).toBe(true);
  });
});

describe("LiveFlightBookingOptionsRequestSchema", () => {
  it("requires bookingToken", () => {
    expect(LiveFlightBookingOptionsRequestSchema.safeParse(valid).success).toBe(false);
  });

  it("accepts a well-formed request with bookingToken", () => {
    expect(LiveFlightBookingOptionsRequestSchema.safeParse({ ...valid, bookingToken: "BOOK123" }).success).toBe(true);
  });

  it("still rejects an unrecognized extra field", () => {
    expect(
      LiveFlightBookingOptionsRequestSchema.safeParse({ ...valid, bookingToken: "BOOK123", proxy_url: "https://evil.example" }).success,
    ).toBe(false);
  });
});
