import { describe, it, expect } from "vitest";
import { calculateNights, calculateDays, isDepartureNotBeforeToday, isDateRangeReversed, deriveNights } from "../tripCostCalculations";

describe("calculateNights", () => {
  it("returns 0 for same departure and return date", () => {
    expect(calculateNights("2026-08-15", "2026-08-15")).toBe(0);
  });

  it("returns 7 for a week trip", () => {
    expect(calculateNights("2026-08-15", "2026-08-22")).toBe(7);
  });

  it("returns 1 for next-day return", () => {
    expect(calculateNights("2026-08-15", "2026-08-16")).toBe(1);
  });

  it("handles month boundary", () => {
    expect(calculateNights("2026-08-28", "2026-09-03")).toBe(6);
  });

  it("handles year boundary", () => {
    expect(calculateNights("2026-12-28", "2027-01-04")).toBe(7);
  });

  it("handles leap year (Feb 28 → Mar 01)", () => {
    expect(calculateNights("2028-02-28", "2028-03-01")).toBe(2);
  });

  it("returns undefined when departure is empty", () => {
    expect(calculateNights("", "2026-08-22")).toBeUndefined();
  });

  it("returns undefined when return is empty", () => {
    expect(calculateNights("2026-08-15", "")).toBeUndefined();
  });

  it("returns undefined when both are empty", () => {
    expect(calculateNights("", "")).toBeUndefined();
  });

  it("returns undefined for malformed date string", () => {
    expect(calculateNights("not-a-date", "2026-08-22")).toBeUndefined();
  });

  it("clamps to 0 when return is before departure", () => {
    expect(calculateNights("2026-08-22", "2026-08-15")).toBe(0);
  });
});

describe("isDepartureNotBeforeToday", () => {
  const refDate = new Date("2026-08-20");

  it("accepts today", () => {
    expect(isDepartureNotBeforeToday("2026-08-20", refDate)).toBe(true);
  });

  it("accepts future date", () => {
    expect(isDepartureNotBeforeToday("2026-12-25", refDate)).toBe(true);
  });

  it("rejects past date", () => {
    expect(isDepartureNotBeforeToday("2026-01-01", refDate)).toBe(false);
  });

  it("accepts empty date (optional field)", () => {
    expect(isDepartureNotBeforeToday("", refDate)).toBe(true);
  });

  it("rejects malformed date", () => {
    expect(isDepartureNotBeforeToday("not-a-date", refDate)).toBe(false);
  });
});

describe("deriveNights", () => {
  it("returns derived nights from valid dates when not overridden", () => {
    expect(deriveNights("2026-08-15", "2026-08-22", 0, false)).toBe(7);
  });

  it("returns manual value when overridden", () => {
    expect(deriveNights("2026-08-15", "2026-08-22", 10, true)).toBe(10);
  });

  it("returns current value when dates are missing and not overridden", () => {
    expect(deriveNights("", "", 5, false)).toBe(5);
  });

  it("returns 0 when dates are missing and current value is 0", () => {
    expect(deriveNights("", "", 0, false)).toBe(0);
  });
});

describe("calculateDays", () => {
  it("returns 1 for same-day trip", () => {
    expect(calculateDays("2026-08-15", "2026-08-15")).toBe(1);
  });

  it("returns 8 for a 7-night trip", () => {
    expect(calculateDays("2026-08-15", "2026-08-22")).toBe(8);
  });

  it("returns undefined when dates are missing", () => {
    expect(calculateDays("", "2026-08-22")).toBeUndefined();
  });

  it("returns 0 for reverse date range", () => {
    expect(calculateDays("2026-08-22", "2026-08-15")).toBe(0);
  });

  it("returns 1 for same-day trip", () => {
    expect(calculateDays("2026-08-15", "2026-08-15")).toBe(1);
  });

  it("returns 2 for next-day trip", () => {
    expect(calculateDays("2026-08-15", "2026-08-16")).toBe(2);
  });

  it("5-day audit scenario remains 5 days", () => {
    // Aug 15 → Aug 19 = 4 nights + 1 = 5 days
    expect(calculateDays("2026-08-15", "2026-08-19")).toBe(5);
  });
});

describe("isDateRangeReversed", () => {
  it("returns true when return is before departure", () => {
    expect(isDateRangeReversed("2026-08-22", "2026-08-15")).toBe(true);
  });

  it("returns false for same-day trip", () => {
    expect(isDateRangeReversed("2026-08-15", "2026-08-15")).toBe(false);
  });

  it("returns false for valid forward range", () => {
    expect(isDateRangeReversed("2026-08-15", "2026-08-22")).toBe(false);
  });

  it("returns false when departure is missing", () => {
    expect(isDateRangeReversed("", "2026-08-22")).toBe(false);
  });

  it("returns false when return is missing", () => {
    expect(isDateRangeReversed("2026-08-15", "")).toBe(false);
  });
});
