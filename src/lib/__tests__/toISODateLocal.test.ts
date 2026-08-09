import { describe, it, expect } from "vitest";
import { toISODateLocal } from "@/lib/flightSearchValidation";

describe("toISODateLocal — local calendar-date serialization", () => {
  // ════════════════════════════════════════════════════
  // Core contract: local YYYY-MM-DD, never UTC-truncated
  // ════════════════════════════════════════════════════

  it("returns 2026-08-18 for a local date of 2026-08-18 (UTC+ proof)", () => {
    // Simulates parsing from a date-picker or URL param: "2026-08-18"
    const d = new Date("2026-08-18T00:00:00");
    expect(toISODateLocal(d)).toBe("2026-08-18");
  });

  it("does NOT produce 2026-08-17 (the UTC bug)", () => {
    const d = new Date("2026-08-18T00:00:00");
    expect(toISODateLocal(d)).not.toBe("2026-08-17");
  });

  it("returns 2026-01-01 for Jan 1 (new-year edge)", () => {
    const d = new Date("2026-01-01T00:00:00");
    expect(toISODateLocal(d)).toBe("2026-01-01");
  });

  it("returns 2026-12-31 for Dec 31 (year-end edge)", () => {
    const d = new Date("2026-12-31T00:00:00");
    expect(toISODateLocal(d)).toBe("2026-12-31");
  });

  it("returns 2026-02-28 for Feb 28 (non-leap)", () => {
    const d = new Date("2026-02-28T00:00:00");
    expect(toISODateLocal(d)).toBe("2026-02-28");
  });

  it("zero-pads single-digit months and days", () => {
    // March 5
    const d = new Date("2026-03-05T00:00:00");
    expect(toISODateLocal(d)).toBe("2026-03-05");
  });

  // ════════════════════════════════════════════════════
  // Deterministic: timezone-independent
  // ════════════════════════════════════════════════════

  it("is deterministic regardless of runtime timezone", () => {
    // Create a specific UTC timestamp that corresponds to a known local date
    // 2026-08-18T12:00:00Z = Aug 18 in UTC, Aug 18 or 19 in various timezones
    // The local calendar date read from getFullYear/getMonth/getDate
    // must match the system's local interpretation
    const d = new Date("2026-08-18T12:00:00Z");
    // We can't assert a specific string because it depends on TZ,
    // but we CAN assert it matches the JS local calendar methods
    const expected = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(toISODateLocal(d)).toBe(expected);
  });

  // ════════════════════════════════════════════════════
  // Integration: same normalized date reaches API params
  // ════════════════════════════════════════════════════

  it("produces the same date string that would be sent to the flight search API", () => {
    // Simulate what FlightResults does after parsing URL params
    const parsed = new Date("2026-08-18T00:00:00");
    const apiDate = toISODateLocal(parsed);

    // The API expects YYYY-MM-DD
    expect(apiDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // It must be the parsed calendar date, not UTC-shifted
    expect(apiDate).toBe("2026-08-18");
  });

  // ════════════════════════════════════════════════════
  // White-label outbound date compatibility
  // ════════════════════════════════════════════════════

  it("produces a date compatible with toDDMM in whiteLabelUrl", () => {
    // buildWhiteLabelFlightUrl extracts DDMM via isoDate.slice(8,10) + isoDate.slice(5,7)
    const d = new Date("2026-08-18T00:00:00");
    const isoDate = toISODateLocal(d);

    const dd = isoDate.slice(8, 10);
    const mm = isoDate.slice(5, 7);

    expect(dd).toBe("18");
    expect(mm).toBe("08");
    expect(`${dd}${mm}`).toBe("1808");
  });
});
