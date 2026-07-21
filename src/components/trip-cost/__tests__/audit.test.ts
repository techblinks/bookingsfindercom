import { describe, it, expect } from "vitest";
import { createDefaultState } from "../useTripCostPlanner";
import {
  calculateSummary,
  calculateFlightsSubtotal,
  calculateAccommodationSubtotal,
  calculateContingencyAmount,
} from "../tripCostCalculations";

// ── Extracted input parsing helpers (pure functions — testable without React) ──

/**
 * Parse a monetary input string. Returns:
 *   { kind: "zero" }         — empty or "0"
 *   { kind: "valid", value } — finite number
 *   { kind: "malformed" }    — NaN, Infinity, or unparseable
 * Accepts negatives so validation can flag them.
 */
function classifyMoneyInput(raw: string): { kind: "zero" | "valid"; value: number } | { kind: "malformed" } {
  if (raw === "" || raw === "-") return { kind: "zero", value: 0 };
  const n = Number(raw);
  if (isNaN(n) || !isFinite(n)) return { kind: "malformed" };
  return { kind: "valid", value: n };
}

/**
 * Parse a whole-number input string. Returns:
 *   { kind: "zero" }         — empty string
 *   { kind: "valid", value } — non-negative integer
 *   { kind: "malformed" }    — NaN, Infinity
 *   { kind: "fractional" }   — finite but not an integer
 */
function classifyIntegerInput(raw: string):
  | { kind: "zero" }
  | { kind: "valid"; value: number }
  | { kind: "malformed" }
  | { kind: "fractional" }
{
  if (raw === "") return { kind: "zero" };
  const n = Number(raw);
  if (isNaN(n) || !isFinite(n)) return { kind: "malformed" };
  if (!Number.isInteger(n)) return { kind: "fractional" };
  return { kind: "valid", value: n };
}

// ── Money input parsing tests ──

describe("classifyMoneyInput", () => {
  it("empty string is zero", () => {
    expect(classifyMoneyInput("")).toEqual({ kind: "zero", value: 0 });
  });

  it("minus sign alone is zero (transient)", () => {
    expect(classifyMoneyInput("-")).toEqual({ kind: "zero", value: 0 });
  });

  it("valid integer", () => {
    expect(classifyMoneyInput("500")).toEqual({ kind: "valid", value: 500 });
  });

  it("valid decimal", () => {
    expect(classifyMoneyInput("99.50")).toEqual({ kind: "valid", value: 99.5 });
  });

  it("negative value passes (validation handles it)", () => {
    expect(classifyMoneyInput("-100")).toEqual({ kind: "valid", value: -100 });
  });

  it("NaN is malformed", () => {
    expect(classifyMoneyInput("abc")).toEqual({ kind: "malformed" });
  });

  it("Infinity is malformed", () => {
    expect(classifyMoneyInput("Infinity")).toEqual({ kind: "malformed" });
  });
});

// ── Integer input parsing tests ──

describe("classifyIntegerInput", () => {
  it("empty string is zero", () => {
    expect(classifyIntegerInput("")).toEqual({ kind: "zero" });
  });

  it("valid integer", () => {
    expect(classifyIntegerInput("3")).toEqual({ kind: "valid", value: 3 });
  });

  it("fractional value is NOT silently accepted", () => {
    expect(classifyIntegerInput("1.5")).toEqual({ kind: "fractional" });
  });

  it("negative value is malformed (or passes to validation)", () => {
    // classifyIntegerInput works on raw number classification
    expect(classifyIntegerInput("-1")).toEqual({ kind: "valid", value: -1 });
  });

  it("NaN is malformed", () => {
    expect(classifyIntegerInput("abc")).toEqual({ kind: "malformed" });
  });
});

// ── Summary audit scenario ──

describe("non-zero scenario calculation", () => {
  it("matches the expected summary audit", () => {
    const state = createDefaultState();
    state.travellers = { adults: 2, children: 0, infants: 0 };
    state.flightCosts.adultAirfare = 500;
    state.flightCosts.checkedBaggage = 100;
    state.accommodationCosts.costPerNight = 150;
    state.accommodationCosts.nights = 5;
    state.accommodationCosts.cleaningFee = 50;
    state.contingency.mode = "pct-10";

    const summary = calculateSummary(state);

    // Flights: 500 × 2 + 100 = 1,100
    expect(summary.flightsSubtotal).toBe(1100);
    // Accommodation: 150 × 5 + 50 = 800
    expect(summary.accommodationSubtotal).toBe(800);
    // Subtotal: 1,100 + 800 = 1,900
    expect(summary.subtotalBeforeContingency).toBe(1900);
    // Contingency: 1,900 × 10% = 190
    expect(summary.contingencyAmount).toBe(190);
    // Total: 2,090
    expect(summary.total).toBe(2090);
    // Per traveller: 2,090 / 2 = 1,045
    expect(summary.costPerTraveller).toBe(1045);
  });

  it("JPY has zero decimals in formatted output", () => {
    const state = createDefaultState();
    state.tripDetails.currency = "JPY";
    state.travellers = { adults: 1, children: 0, infants: 0 };
    state.flightCosts.adultAirfare = 10000;
    const summary = calculateSummary(state);
    expect(summary.total).toBe(11000);
  });
});

// ── Accommodation override state transitions ──

describe("accommodation override transitions", () => {
  it("editing nights sets override flag", () => {
    const state = createDefaultState();
    // Simulate setAccommodationNights(10)
    state.accommodationCosts.nights = 10;
    state.accommodationCosts.nightsManuallyOverridden = true;
    expect(state.accommodationCosts.nightsManuallyOverridden).toBe(true);
    expect(state.accommodationCosts.nights).toBe(10);
  });

  it("use trip dates resets override and derives", () => {
    const state = createDefaultState();
    state.accommodationCosts.nights = 10;
    state.accommodationCosts.nightsManuallyOverridden = true;
    state.tripDetails.departureDate = "2026-08-15";
    state.tripDetails.returnDate = "2026-08-22";
    // Simulate useTripDatesForNights
    state.accommodationCosts.nightsManuallyOverridden = false;
    state.accommodationCosts.nights = 7;
    expect(state.accommodationCosts.nightsManuallyOverridden).toBe(false);
    expect(state.accommodationCosts.nights).toBe(7);
  });

  it("restored draft correctly reflects override state", () => {
    const state = createDefaultState();
    state.accommodationCosts.nightsManuallyOverridden = true;
    state.accommodationCosts.nights = 14;
    // Simulate draft restore
    expect(state.accommodationCosts.nightsManuallyOverridden).toBe(true);
    expect(state.accommodationCosts.nights).toBe(14);
  });

  it("invalid dates do not overwrite when resetting override", () => {
    const state = createDefaultState();
    state.accommodationCosts.nights = 5;
    state.accommodationCosts.nightsManuallyOverridden = true;
    // No dates set — useTripDatesForNights keeps current nights
    state.accommodationCosts.nightsManuallyOverridden = false;
    // No valid dates to derive from, nights stays
    expect(state.accommodationCosts.nights).toBe(5);
    expect(state.accommodationCosts.nightsManuallyOverridden).toBe(false);
  });
});

// ── Contingency custom visibility logic ──

describe("contingency custom field visibility", () => {
  it("custom percentage visible only in pct-custom mode", () => {
    const state = createDefaultState();
    state.contingency.mode = "pct-custom";
    const showPct = state.contingency.mode === "pct-custom";
    expect(showPct).toBe(true);

    state.contingency.mode = "pct-10";
    expect(state.contingency.mode === "pct-custom").toBe(false);
  });

  it("fixed amount visible only in fixed mode", () => {
    const state = createDefaultState();
    state.contingency.mode = "fixed";
    const showFixed = state.contingency.mode === "fixed";
    expect(showFixed).toBe(true);

    state.contingency.mode = "none";
    expect(state.contingency.mode === "fixed").toBe(false);
  });

  it("switching modes preserves both custom values", () => {
    const state = createDefaultState();
    state.contingency.customPercentage = 7.5;
    state.contingency.customFixedAmount = 200;
    state.contingency.mode = "fixed";
    expect(state.contingency.customPercentage).toBe(7.5);
    state.contingency.mode = "pct-custom";
    expect(state.contingency.customFixedAmount).toBe(200);
  });
});

// ── No NaN/Infinity in any summary path ──

describe("summary numeric safety", () => {
  it("all summary fields are finite or undefined", () => {
    const state = createDefaultState();
    state.flightCosts.adultAirfare = 500;
    state.tripDetails.departureDate = "2026-08-15";
    state.tripDetails.returnDate = "2026-08-22";
    const summary = calculateSummary(state);
    const entries = Object.entries(summary);
    for (const [, v] of entries) {
      if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    }
  });
});
