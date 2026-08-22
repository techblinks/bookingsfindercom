/**
 * flightDateMatch — exact-date matching for cached Travelpayouts results
 * (BF-0R-7 Phase D). Pure functions, no network/DB — see flightDateMatch.ts.
 */
import { describe, it, expect } from "vitest";
import { extractCalendarDate, isExactDateMatch } from "../flightDateMatch.ts";

describe("extractCalendarDate — timezone-safe calendar date extraction", () => {
  it("extracts the date from a plain YYYY-MM-DD string", () => {
    expect(extractCalendarDate("2026-09-03")).toBe("2026-09-03");
  });

  it("extracts the date from an ISO timestamp with no offset", () => {
    expect(extractCalendarDate("2026-09-03T21:25:00")).toBe("2026-09-03");
  });

  it("extracts the date from an ISO timestamp with a positive offset, without shifting it", () => {
    // A naive `new Date(...).toISOString().slice(0,10)` conversion of this
    // exact timestamp shifts to 2026-09-02 in UTC. The calendar date as
    // stated is the 3rd, and that is what must be returned.
    expect(extractCalendarDate("2026-09-03T00:30:00+03:00")).toBe("2026-09-03");
  });

  it("extracts the date from an ISO timestamp with a negative offset, without shifting it", () => {
    expect(extractCalendarDate("2026-09-03T23:45:00-05:00")).toBe("2026-09-03");
  });

  it("extracts the date from a UTC ('Z') timestamp", () => {
    expect(extractCalendarDate("2026-09-03T21:25:00Z")).toBe("2026-09-03");
  });

  it("returns null for null input", () => {
    expect(extractCalendarDate(null)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(extractCalendarDate(undefined)).toBeNull();
  });

  it("returns null for an empty string", () => {
    expect(extractCalendarDate("")).toBeNull();
  });

  it("returns null for a string that does not start with a date", () => {
    expect(extractCalendarDate("not-a-date")).toBeNull();
  });
});

describe("isExactDateMatch — one-way", () => {
  it("accepts a result whose provider departure date matches the requested date", () => {
    expect(
      isExactDateMatch({
        requestedDepartureDate: "2026-09-03",
        providerDepartureAt: "2026-09-03T21:25:00+03:00",
      })
    ).toBe(true);
  });

  it("rejects a result whose provider departure date is the nearest-available date, not the requested one", () => {
    expect(
      isExactDateMatch({
        requestedDepartureDate: "2026-09-03",
        providerDepartureAt: "2026-09-05T21:25:00+03:00",
      })
    ).toBe(false);
  });

  it("rejects a result with a missing provider departure timestamp", () => {
    expect(
      isExactDateMatch({
        requestedDepartureDate: "2026-09-03",
        providerDepartureAt: null,
      })
    ).toBe(false);
  });

  it("ignores an unrequested return date on the provider result for a one-way search", () => {
    // One-way request (no requestedReturnDate) — the provider's return_at,
    // if any, must not affect the one-way match decision.
    expect(
      isExactDateMatch({
        requestedDepartureDate: "2026-09-03",
        providerDepartureAt: "2026-09-03T21:25:00+03:00",
        providerReturnAt: "2026-09-10T10:00:00+03:00",
      })
    ).toBe(true);
  });
});

describe("isExactDateMatch — round trip", () => {
  const base = {
    requestedDepartureDate: "2026-09-03",
    requestedReturnDate: "2026-09-10",
    providerDepartureAt: "2026-09-03T21:25:00+03:00",
    providerReturnAt: "2026-09-10T09:50:00+03:00",
  };

  it("accepts a result whose provider departure AND return dates both match the request", () => {
    expect(isExactDateMatch(base)).toBe(true);
  });

  it("rejects a result whose departure date matches but return date does not (nearest-date substitution on the return leg)", () => {
    expect(
      isExactDateMatch({ ...base, providerReturnAt: "2026-09-12T09:50:00+03:00" })
    ).toBe(false);
  });

  it("rejects a result whose return date matches but departure date does not", () => {
    expect(
      isExactDateMatch({ ...base, providerDepartureAt: "2026-09-01T21:25:00+03:00" })
    ).toBe(false);
  });

  it("rejects a round-trip request when the provider result has no return timestamp at all", () => {
    expect(isExactDateMatch({ ...base, providerReturnAt: null })).toBe(false);
  });

  it("rejects when both legs are off by one day", () => {
    expect(
      isExactDateMatch({
        ...base,
        providerDepartureAt: "2026-09-04T21:25:00+03:00",
        providerReturnAt: "2026-09-11T09:50:00+03:00",
      })
    ).toBe(false);
  });
});
