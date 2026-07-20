import { describe, it, expect } from "vitest";
import {
  getTotalTravellers,
  calculateFlightsSubtotal,
  calculateAccommodationSubtotal,
  calculateDailySpendingSubtotal,
  calculatePreparationSubtotal,
  calculateActivitiesSubtotal,
  calculateSubtotalBeforeContingency,
  calculateContingencyAmount,
  calculateSummary,
} from "../tripCostCalculations";
import { DEFAULT_STATE } from "../tripCostDefaults";

// -- Travellers --

describe("getTotalTravellers", () => {
  it("returns 1 for default (1 adult)", () => {
    expect(getTotalTravellers({ adults: 1, children: 0, infants: 0 })).toBe(1);
  });

  it("sums adults, children and infants", () => {
    expect(getTotalTravellers({ adults: 2, children: 1, infants: 1 })).toBe(4);
  });

  it("returns 0 when all are 0", () => {
    expect(getTotalTravellers({ adults: 0, children: 0, infants: 0 })).toBe(0);
  });
});

// -- Flights --

describe("calculateFlightsSubtotal", () => {
  it("multiplies adult airfare by adult count", () => {
    const fc = { ...DEFAULT_STATE.flightCosts, adultAirfare: 500 };
    expect(calculateFlightsSubtotal(fc, { adults: 2, children: 0, infants: 0 })).toBe(1000);
  });

  it("multiplies each age group separately", () => {
    const fc = { ...DEFAULT_STATE.flightCosts, adultAirfare: 500, childAirfare: 300, infantAirfare: 50 };
    expect(calculateFlightsSubtotal(fc, { adults: 2, children: 1, infants: 1 })).toBe(1350);
  });

  it("includes fixed extras without multiplying", () => {
    const fc = { ...DEFAULT_STATE.flightCosts, checkedBaggage: 60, seatSelection: 30 };
    expect(calculateFlightsSubtotal(fc, { adults: 1, children: 0, infants: 0 })).toBe(90);
  });

  it("returns 0 for all-zero costs", () => {
    const fc = DEFAULT_STATE.flightCosts;
    expect(calculateFlightsSubtotal(fc, { adults: 1, children: 0, infants: 0 })).toBe(0);
  });
});

// -- Accommodation --

describe("calculateAccommodationSubtotal", () => {
  it("multiplies cost per night by nights", () => {
    const ac = { ...DEFAULT_STATE.accommodationCosts, costPerNight: 150, nights: 7 };
    expect(calculateAccommodationSubtotal(ac)).toBe(1050);
  });

  it("adds fixed fees", () => {
    const ac = { ...DEFAULT_STATE.accommodationCosts, costPerNight: 100, nights: 3, cleaningFee: 50, resortFee: 25 };
    expect(calculateAccommodationSubtotal(ac)).toBe(375);
  });

  it("returns 0 with no nights", () => {
    const ac = { ...DEFAULT_STATE.accommodationCosts, costPerNight: 150, nights: 0 };
    expect(calculateAccommodationSubtotal(ac)).toBe(0);
  });
});

// -- Daily spending --

describe("calculateDailySpendingSubtotal", () => {
  it("sums all categories", () => {
    const ds = {
      ...DEFAULT_STATE.dailySpending,
      foodDrinks: { dailyAmount: 50, days: 7, daysManuallyOverridden: false },
      localTransport: { dailyAmount: 10, days: 7, daysManuallyOverridden: false },
    };
    // (50 × 7) + (10 × 7) = 420
    expect(calculateDailySpendingSubtotal(ds)).toBe(420);
  });

  it("handles different day counts per category", () => {
    const ds = {
      ...DEFAULT_STATE.dailySpending,
      foodDrinks: { dailyAmount: 50, days: 7, daysManuallyOverridden: false },
      shopping: { dailyAmount: 30, days: 3, daysManuallyOverridden: true },
    };
    expect(calculateDailySpendingSubtotal(ds)).toBe(440);
  });

  it("returns 0 when all amounts are 0", () => {
    expect(calculateDailySpendingSubtotal(DEFAULT_STATE.dailySpending)).toBe(0);
  });
});

// -- Preparation --

describe("calculatePreparationSubtotal", () => {
  it("sums all preparation costs", () => {
    const pc = { ...DEFAULT_STATE.preparationCosts, travelInsurance: 65, esimMobileData: 25 };
    expect(calculatePreparationSubtotal(pc)).toBe(90);
  });

  it("returns 0 for all-zero", () => {
    expect(calculatePreparationSubtotal(DEFAULT_STATE.preparationCosts)).toBe(0);
  });
});

// -- Activities --

describe("calculateActivitiesSubtotal", () => {
  it("sums cost × quantity for each row", () => {
    const activities = [
      { id: "1", name: "Surf lesson", cost: 50, quantity: 2 },
      { id: "2", name: "Temple tour", cost: 30, quantity: 1 },
    ];
    expect(calculateActivitiesSubtotal(activities)).toBe(130);
  });

  it("returns 0 for empty list", () => {
    expect(calculateActivitiesSubtotal([])).toBe(0);
  });
});

// -- Contingency --

describe("calculateContingencyAmount", () => {
  const subtotal = 1000;

  it("returns 0 for mode none", () => {
    expect(calculateContingencyAmount(subtotal, { mode: "none", customPercentage: 10, customFixedAmount: 50 })).toBe(0);
  });

  it("calculates 5%", () => {
    expect(calculateContingencyAmount(subtotal, { mode: "pct-5", customPercentage: 10, customFixedAmount: 0 })).toBe(50);
  });

  it("calculates 10%", () => {
    expect(calculateContingencyAmount(subtotal, { mode: "pct-10", customPercentage: 10, customFixedAmount: 0 })).toBe(100);
  });

  it("calculates 15%", () => {
    expect(calculateContingencyAmount(subtotal, { mode: "pct-15", customPercentage: 10, customFixedAmount: 0 })).toBe(150);
  });

  it("uses custom percentage", () => {
    expect(calculateContingencyAmount(subtotal, { mode: "pct-custom", customPercentage: 7.5, customFixedAmount: 0 })).toBe(75);
  });

  it("uses fixed amount", () => {
    expect(calculateContingencyAmount(subtotal, { mode: "fixed", customPercentage: 10, customFixedAmount: 200 })).toBe(200);
  });

  it("returns 0 if subtotal is 0", () => {
    expect(calculateContingencyAmount(0, { mode: "pct-10", customPercentage: 10, customFixedAmount: 0 })).toBe(0);
  });
});

// -- Summary --

describe("calculateSummary", () => {
  it("returns zeroes for default empty state", () => {
    const summary = calculateSummary(DEFAULT_STATE);
    expect(summary.total).toBe(0);
    expect(summary.flightsSubtotal).toBe(0);
  });

  it("calculates total correctly", () => {
    const state = {
      ...DEFAULT_STATE,
      flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: 500 },
      accommodationCosts: { ...DEFAULT_STATE.accommodationCosts, costPerNight: 150, nights: 7 },
    };
    const summary = calculateSummary(state);
    // flights: 500×1 = 500, accommodation: 150×7 = 1050
    // subtotal = 1550, contingency 10% = 155, total = 1705
    expect(summary.flightsSubtotal).toBe(500);
    expect(summary.accommodationSubtotal).toBe(1050);
    expect(summary.subtotalBeforeContingency).toBe(1550);
    expect(summary.contingencyAmount).toBe(155);
    expect(summary.total).toBe(1705);
  });

  it("calculates per-traveller cost", () => {
    const state = {
      ...DEFAULT_STATE,
      flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: 500 },
      accommodationCosts: { ...DEFAULT_STATE.accommodationCosts, costPerNight: 150, nights: 7 },
      travellers: { adults: 1, children: 0, infants: 0 },
      contingency: { mode: "none" as const, customPercentage: 0, customFixedAmount: 0 },
    };
    const summary = calculateSummary(state);
    // flights 500 + acc 1050 = 1550, no contingency → total 1550 per traveller
    expect(summary.costPerTraveller).toBeCloseTo(1550);
  });

  it("calculates per-day cost when dates are set", () => {
    const state = {
      ...DEFAULT_STATE,
      tripDetails: { ...DEFAULT_STATE.tripDetails, departureDate: "2026-08-15", returnDate: "2026-08-22" },
      flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: 500 },
      accommodationCosts: { ...DEFAULT_STATE.accommodationCosts, costPerNight: 150, nights: 7 },
    };
    const summary = calculateSummary(state);
    expect(summary.tripNights).toBe(7);
    expect(summary.tripDays).toBe(8);
    expect(summary.costPerDay).toBeCloseTo(213.125);
  });

  it("returns undefined per-day when dates are missing", () => {
    const summary = calculateSummary(DEFAULT_STATE);
    expect(summary.costPerDay).toBeUndefined();
  });

  it("returns undefined per-traveller when travellers are 0", () => {
    const state = { ...DEFAULT_STATE, travellers: { adults: 0, children: 0, infants: 0 } };
    const summary = calculateSummary(state);
    expect(summary.costPerTraveller).toBeUndefined();
  });

  it("never returns NaN or Infinity", () => {
    const summary = calculateSummary(DEFAULT_STATE);
    expect(Number.isFinite(summary.total)).toBe(true);
    expect(Number.isFinite(summary.flightsSubtotal)).toBe(true);
    expect(Number.isFinite(summary.subtotalBeforeContingency)).toBe(true);
    // costPerTraveller can be undefined — that's expected
    expect(summary.costPerTraveller ?? 0).not.toBeNaN();
  });

  it("handles NaN in state gracefully", () => {
    const state = { ...DEFAULT_STATE, flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: NaN } };
    const summary = calculateSummary(state);
    expect(Number.isFinite(summary.total)).toBe(true);
    expect(summary.flightsSubtotal).toBe(0); // NaN → 0 via safeValue
  });

  it("handles Infinity gracefully", () => {
    const state = { ...DEFAULT_STATE, flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: Infinity } };
    const summary = calculateSummary(state);
    expect(Number.isFinite(summary.total)).toBe(true);
    expect(summary.flightsSubtotal).toBe(0);
  });

  it("handles negative values gracefully", () => {
    const state = { ...DEFAULT_STATE, flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: -500 } };
    const summary = calculateSummary(state);
    expect(summary.flightsSubtotal).toBe(0);
    expect(Number.isFinite(summary.total)).toBe(true);
  });

  it("handles fractional travellers gracefully", () => {
    const state = {
      ...DEFAULT_STATE,
      flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: 500 },
      travellers: { adults: 1.5, children: 0, infants: 0 },
    };
    const summary = calculateSummary(state);
    // safeValue clamps 1.5 → 1.5 (it IS finite and non-negative), 
    // so cost = 500 × 1.5 = 750 — this is fine mathematically,
    // but validation would catch the non-whole value
    expect(summary.flightsSubtotal).toBe(750);
    expect(Number.isFinite(summary.total)).toBe(true);
  });
});
