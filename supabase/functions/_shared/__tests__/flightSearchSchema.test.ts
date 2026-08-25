/**
 * BF1-E × BF1-C COMPATIBILITY TESTS — shared FlightSearchSchema.
 *
 * The schema was extracted VERBATIM from search-flights/index.ts (shape,
 * messages, transforms frozen). These tests pin the boundary contract the
 * Edge Function enforces BEFORE any provider call:
 *   - normal airport IATA codes pass and are uppercased
 *   - BF1-C metro/city provider codes (TYO/LON/NYC/PAR/SFO) are accepted —
 *     they are 3-letter codes after client-side resolution
 *   - short/overlong/unformatted inputs are rejected fail-closed
 * Nothing here redesigns metro behaviour; it only proves the frozen schema
 * still admits what BF1-C resolves to.
 */
import { describe, it, expect } from "vitest";
import { FlightSearchSchema } from "../flightSearchSchema.ts";

const BASE = {
  origin: "HND",
  destination: "SIN",
  depart_date: "2026-09-03",
} as const;

describe("BF1-C compatibility: FlightSearchSchema accepts resolved locations", () => {
  it("accepts normal airport IATA codes and uppercases lowercase input", () => {
    const parsed = FlightSearchSchema.safeParse({
      ...BASE,
      origin: "hnd",
      destination: "sin",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.origin).toBe("HND");
      expect(parsed.data.destination).toBe("SIN");
    }
  });

  it.each(["TYO", "LON", "NYC", "PAR", "SFO"])(
    "accepts metro provider code %s as a 3-letter location",
    (metro) => {
      const parsed = FlightSearchSchema.safeParse({ ...BASE, destination: metro });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.destination).toBe(metro);
      }
    }
  );
});

describe("BF1-C compatibility: fail-closed rejection at the boundary", () => {
  it("rejects 2-character inputs", () => {
    const parsed = FlightSearchSchema.safeParse({ ...BASE, origin: "SY" });
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues[0].message).toContain("3-letter");
    }
  });

  it("rejects 4-character inputs", () => {
    const parsed = FlightSearchSchema.safeParse({ ...BASE, destination: "SYDN" });
    expect(parsed.success).toBe(false);
  });

  it("rejects malformed depart_date formats", () => {
    expect(FlightSearchSchema.safeParse({ ...BASE, depart_date: "2026-9-3" }).success).toBe(false);
    expect(FlightSearchSchema.safeParse({ ...BASE, depart_date: "03/09/2026" }).success).toBe(false);
  });
});

describe("Frozen search-flights request semantics (unchanged since pre-BF1-E)", () => {
  it("return_date '' / null / omitted all normalize to undefined", () => {
    for (const return_date of ["", null, undefined]) {
      const parsed = FlightSearchSchema.safeParse({ ...BASE, return_date });
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.returnDate ?? parsed.data.return_date).toBeUndefined();
      }
    }
    const kept = FlightSearchSchema.safeParse({ ...BASE, return_date: "2026-09-17" });
    expect(kept.success).toBe(true);
    if (kept.success) {
      expect(kept.data.return_date).toBe("2026-09-17");
    }
  });

  it("adults defaults to 1 and is bounded to integers 1–9", () => {
    const defaulted = FlightSearchSchema.safeParse(BASE);
    expect(defaulted.success && defaulted.data.adults).toBe(1);

    for (const adults of [0, 10, 1.5]) {
      expect(FlightSearchSchema.safeParse({ ...BASE, adults }).success).toBe(false);
    }
  });

  it("currency defaults to USD and must be exactly 3 characters", () => {
    const defaulted = FlightSearchSchema.safeParse(BASE);
    expect(defaulted.success && defaulted.data.currency).toBe("USD");

    expect(FlightSearchSchema.safeParse({ ...BASE, currency: "AU" }).success).toBe(false);
    expect(FlightSearchSchema.safeParse({ ...BASE, currency: "AUDX" }).success).toBe(false);
  });
});
