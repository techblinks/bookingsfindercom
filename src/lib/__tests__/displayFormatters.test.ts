/**
 * V0: displayFormatters tests — human-friendly date/traveller display.
 */
import { describe, it, expect } from "vitest";
import { formatDateDisplay, formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";

describe("formatDateDisplay", () => {
  it("formats a single date", () => {
    expect(formatDateDisplay("2026-08-18")).toBe("Aug 18");
  });

  it("handles December", () => {
    expect(formatDateDisplay("2026-12-25")).toBe("Dec 25");
  });

  it("does not shift by UTC (always T00:00:00)", () => {
    // Any ISO date must not shift to previous day
    expect(formatDateDisplay("2026-01-01")).toBe("Jan 1");
  });

  it("returns raw string on invalid input", () => {
    expect(formatDateDisplay("not-a-date")).toBe("not-a-date");
  });
});

describe("formatDateRangeDisplay", () => {
  it("same-month range uses en-dash", () => {
    expect(formatDateRangeDisplay("2026-08-18", "2026-08-29")).toBe("Aug 18–29");
  });

  it("cross-month range uses spaced en-dash", () => {
    expect(formatDateRangeDisplay("2026-08-29", "2026-09-03")).toBe("Aug 29 – Sep 3");
  });

  it("cross-year range includes years", () => {
    const result = formatDateRangeDisplay("2026-12-30", "2027-01-03");
    expect(result).toContain("2026");
    expect(result).toContain("2027");
  });

  it("single date without return", () => {
    expect(formatDateRangeDisplay("2026-08-18")).toBe("Aug 18");
  });

  it("null returnDate shows single date", () => {
    expect(formatDateRangeDisplay("2026-08-18", null)).toBe("Aug 18");
  });

  it("empty string returns empty", () => {
    expect(formatDateRangeDisplay("")).toBe("");
  });

  it("falls back to raw on parse failure", () => {
    expect(formatDateRangeDisplay("bad", "also-bad")).toBe("bad – also-bad");
  });
});

describe("formatTravellers", () => {
  it("singular", () => {
    expect(formatTravellers(1)).toBe("1 traveller");
  });

  it("plural", () => {
    expect(formatTravellers(2)).toBe("2 travellers");
  });

  it("includes children and infants", () => {
    expect(formatTravellers(1, 1, 0)).toBe("2 travellers");
  });

  it("zero", () => {
    expect(formatTravellers(0)).toBe("0 travellers");
  });
});
