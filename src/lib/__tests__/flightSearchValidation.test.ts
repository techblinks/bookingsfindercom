import { describe, it, expect } from "vitest";
import {
  validateFlightSearch,
  parseAndValidateFlightSearchParams,
  type FlightSearchFormValues,
} from "@/lib/flightSearchValidation";

function makeValues(overrides: Partial<FlightSearchFormValues> = {}): FlightSearchFormValues {
  return {
    origin: "BNE",
    destination: "SYD",
    departureDate: new Date("2026-08-10T00:00:00"),
    returnDate: new Date("2026-08-13T00:00:00"),
    adults: 1,
    children: 0,
    infants: 0,
    cabinClass: "economy",
    tripType: "roundtrip",
    ...overrides,
  };
}

describe("validateFlightSearch", () => {
  // ── Valid cases ──

  it("returns no errors for a valid roundtrip search", () => {
    expect(validateFlightSearch(makeValues())).toEqual([]);
  });

  it("returns no errors for a valid one-way search (no return date)", () => {
    expect(
      validateFlightSearch(
        makeValues({ tripType: "oneway", returnDate: undefined })
      )
    ).toEqual([]);
  });

  it("returns no errors for premium economy cabin", () => {
    expect(validateFlightSearch(makeValues({ cabinClass: "premium" }))).toEqual([]);
  });

  it("returns no errors for business cabin", () => {
    expect(validateFlightSearch(makeValues({ cabinClass: "business" }))).toEqual([]);
  });

  it("returns no errors for first class cabin", () => {
    expect(validateFlightSearch(makeValues({ cabinClass: "first" }))).toEqual([]);
  });

  it("returns no errors with multiple passengers", () => {
    expect(
      validateFlightSearch(makeValues({ adults: 2, children: 1, infants: 0 }))
    ).toEqual([]);
  });

  // ── Origin ──

  it("rejects empty origin", () => {
    const errors = validateFlightSearch(makeValues({ origin: "" }));
    expect(errors.some(e => e.field === "origin")).toBe(true);
  });

  it("rejects non-IATA origin", () => {
    const errors = validateFlightSearch(makeValues({ origin: "BRIS" }));
    expect(errors.some(e => e.field === "origin")).toBe(true);
  });

  it("accepts lowercase 3-letter codes", () => {
    expect(validateFlightSearch(makeValues({ origin: "bne" }))).toEqual([]);
  });

  // ── Destination ──

  it("rejects empty destination", () => {
    const errors = validateFlightSearch(makeValues({ destination: "" }));
    expect(errors.some(e => e.field === "destination")).toBe(true);
  });

  it("rejects same origin and destination", () => {
    const errors = validateFlightSearch(makeValues({ origin: "SYD", destination: "SYD" }));
    expect(errors.some(e => e.field === "destination" && e.message.includes("same"))).toBe(true);
  });

  // ── Departure date ──

  it("rejects missing departure date", () => {
    const errors = validateFlightSearch(makeValues({ departureDate: undefined }));
    expect(errors.some(e => e.field === "departureDate")).toBe(true);
  });

  // ── Return date ──

  it("rejects missing return date for roundtrip", () => {
    const errors = validateFlightSearch(makeValues({ tripType: "roundtrip", returnDate: undefined }));
    expect(errors.some(e => e.field === "returnDate")).toBe(true);
  });

  it("rejects return date before departure date", () => {
    const errors = validateFlightSearch(
      makeValues({
        departureDate: new Date("2026-08-10T00:00:00"),
        returnDate: new Date("2026-08-05T00:00:00"),
      })
    );
    expect(errors.some(e => e.field === "returnDate")).toBe(true);
  });

  // ── Passengers ──

  it("rejects zero adults", () => {
    const errors = validateFlightSearch(makeValues({ adults: 0 }));
    expect(errors.some(e => e.field === "adults")).toBe(true);
  });

  it("rejects infants greater than adults", () => {
    const errors = validateFlightSearch(makeValues({ adults: 1, infants: 2 }));
    expect(errors.some(e => e.field === "infants")).toBe(true);
  });

  it("rejects more than 9 total passengers", () => {
    const errors = validateFlightSearch(makeValues({ adults: 5, children: 3, infants: 2 }));
    expect(errors.some(e => e.field === "adults")).toBe(true);
  });

  // ── Cabin class ──

  it("rejects invalid cabin class", () => {
    const errors = validateFlightSearch(makeValues({ cabinClass: "luxury" }));
    expect(errors.some(e => e.field === "cabinClass")).toBe(true);
  });

  it("rejects empty cabin class", () => {
    const errors = validateFlightSearch(makeValues({ cabinClass: "" }));
    expect(errors.some(e => e.field === "cabinClass")).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// parseAndValidateFlightSearchParams — route-mode decision
// ══════════════════════════════════════════════════════════════

describe("parseAndValidateFlightSearchParams", () => {
  // ── A. Complete + valid → results mode ──

  it("returns results mode for a complete valid URL", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=2026-08-10&returnDate=2026-08-13&adults=1&children=0&infants=0&cabinClass=economy"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("results");
    expect(result.validated).not.toBeNull();
    expect(result.validated!.origin).toBe("BNE");
    expect(result.validated!.destination).toBe("SYD");
    expect(result.errors).toEqual([]);
  });

  it("returns results mode for a valid one-way URL", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=2026-08-10&adults=2&cabinClass=business"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("results");
    expect(result.validated!.tripType).toBe("oneway");
    expect(result.validated!.cabinClass).toBe("business");
    expect(result.validated!.adults).toBe(2);
  });

  // ── B. Incomplete → form mode ──

  it("returns form mode for empty params", () => {
    const result = parseAndValidateFlightSearchParams(new URLSearchParams());
    expect(result.mode).toBe("form");
    expect(result.validated).toBeNull();
  });

  it("returns form mode when destination is missing", () => {
    const params = new URLSearchParams("origin=BNE&departureDate=2026-08-10");
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.prefill.origin).toBe("BNE");
  });

  // ── C. Complete but invalid → form mode with errors ──

  it("returns form mode for invalid IATA origin (BRIS — 4 letters)", () => {
    const params = new URLSearchParams(
      "origin=BRIS&destination=SYD&departureDate=2026-08-10"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors.some(e => e.field === "origin")).toBe(true);
    // Safe fields should still be prefilled
    expect(result.prefill.destination).toBe("SYD");
    // Invalid origin should NOT be in prefill
    expect(result.prefill.origin).toBeUndefined();
  });

  it("returns form mode for malformed departure date", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=bad"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.prefill.departureDate).toBeUndefined();
    // Valid fields remain
    expect(result.prefill.origin).toBe("BNE");
    expect(result.prefill.destination).toBe("SYD");
  });

  it("returns form mode for return before departure", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=2026-08-13&returnDate=2026-08-10"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.errors.some(e => e.field === "returnDate")).toBe(true);
  });

  it("returns form mode for adults=0", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=2026-08-10&adults=0"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.errors.some(e => e.field === "adults")).toBe(true);
    // Invalid adult count should NOT be prefilled
    expect(result.prefill.adults).toBeUndefined();
  });

  // ── D. Unsupported cabin → form mode, NOT silently changed ──

  it("returns form mode for unsupported cabin class (luxury)", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=2026-08-10&cabinClass=luxury"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.errors.some(e => e.field === "cabinClass")).toBe(true);
    // Cabin should NOT be defaulted to "economy" in validated or prefill
    expect(result.prefill.cabinClass).toBeUndefined();
    expect(result.validated).toBeNull();
  });

  it("returns form mode for empty cabin class", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=2026-08-10&cabinClass="
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.errors.some(e => e.field === "cabinClass")).toBe(true);
  });

  // ── E. Invalid date → form mode ──

  it("returns form mode for non-date-string departure", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=not-a-date-at-all"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.prefill.departureDate).toBeUndefined();
  });

  it("returns form mode for invalid month (2026-13-01)", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SYD&departureDate=2026-13-01"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.prefill.departureDate).toBeUndefined();
  });

  // ── F. Invalid IATA → form mode ──

  it("returns form mode for numeric origin", () => {
    const params = new URLSearchParams(
      "origin=123&destination=SYD&departureDate=2026-08-10"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.errors.some(e => e.field === "origin")).toBe(true);
  });

  it("returns form mode for 2-letter destination", () => {
    const params = new URLSearchParams(
      "origin=BNE&destination=SY&departureDate=2026-08-10"
    );
    const result = parseAndValidateFlightSearchParams(params);
    expect(result.mode).toBe("form");
    expect(result.prefill.destination).toBeUndefined();
  });

  // ── Prefill: safe fields survive invalidity ──

  it("prefills only individually safe fields from an invalid URL", () => {
    const params = new URLSearchParams(
      "origin=BRIS&destination=SYD&departureDate=bad&adults=2&children=0&infants=0&cabinClass=luxury"
    );
    const result = parseAndValidateFlightSearchParams(params);

    // Safe: destination (valid IATA), adults/children/infants (valid values)
    expect(result.prefill.destination).toBe("SYD");
    expect(result.prefill.adults).toBe(2);
    expect(result.prefill.children).toBe(0);
    expect(result.prefill.infants).toBe(0);

    // Unsafe: invalid IATA, invalid date, invalid cabin
    expect(result.prefill.origin).toBeUndefined();
    expect(result.prefill.departureDate).toBeUndefined();
    expect(result.prefill.cabinClass).toBeUndefined();
  });
});
