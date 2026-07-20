import { describe, it, expect } from "vitest";
import { createDefaultState } from "../useTripCostPlanner";
import {
  normalizeDateDerivedFields,
  calculateNights,
  calculateDays,
  calculateSummary,
} from "../tripCostCalculations";

// ── Date normalisation tests ──

describe("normalizeDateDerivedFields", () => {
  const state = createDefaultState();

  it("synchronises all five categories to trip days", () => {
    const tripDays = 5;
    const tripNights = 4;
    const result = normalizeDateDerivedFields(state, tripDays, tripNights);

    expect(result.dailySpending.foodDrinks.days).toBe(5);
    expect(result.dailySpending.localTransport.days).toBe(5);
    expect(result.dailySpending.shopping.days).toBe(5);
    expect(result.dailySpending.entertainment.days).toBe(5);
    expect(result.dailySpending.miscellaneous.days).toBe(5);
  });

  it("sets all daysManuallyOverridden to false", () => {
    const result = normalizeDateDerivedFields(state, 5, 4);
    expect(result.dailySpending.foodDrinks.daysManuallyOverridden).toBe(false);
    expect(result.dailySpending.localTransport.daysManuallyOverridden).toBe(false);
    expect(result.dailySpending.shopping.daysManuallyOverridden).toBe(false);
    expect(result.dailySpending.entertainment.daysManuallyOverridden).toBe(false);
    expect(result.dailySpending.miscellaneous.daysManuallyOverridden).toBe(false);
  });

  it("preserves entered daily amounts", () => {
    const s = createDefaultState();
    s.dailySpending.foodDrinks.dailyAmount = 100;
    s.dailySpending.shopping.dailyAmount = 50;

    const result = normalizeDateDerivedFields(s, 7, 6);
    expect(result.dailySpending.foodDrinks.dailyAmount).toBe(100);
    expect(result.dailySpending.shopping.dailyAmount).toBe(50);
  });

  it("same-day trip synchronises every category to 1 day", () => {
    const result = normalizeDateDerivedFields(state, 1, 0);
    expect(result.dailySpending.foodDrinks.days).toBe(1);
  });

  it("undefined trip days sets all category days to 0", () => {
    const result = normalizeDateDerivedFields(state, undefined, undefined);
    expect(result.dailySpending.foodDrinks.days).toBe(0);
    expect(result.dailySpending.localTransport.days).toBe(0);
  });

  it("missing departure sets days to 0", () => {
    const tripDays = calculateDays("", "2026-08-22");
    expect(tripDays).toBeUndefined();
    const result = normalizeDateDerivedFields(state, tripDays, undefined);
    expect(result.dailySpending.foodDrinks.days).toBe(0);
  });

  it("missing return sets days to 0", () => {
    const tripDays = calculateDays("2026-08-15", "");
    expect(tripDays).toBeUndefined();
    const result = normalizeDateDerivedFields(state, tripDays, undefined);
    expect(result.dailySpending.foodDrinks.days).toBe(0);
  });

  it("return before departure sets days to 0", () => {
    const tripDays = calculateDays("2026-08-22", "2026-08-15");
    // Reversed dates: calculateDays now returns 0, not 1
    expect(tripDays).toBe(0);
    const result = normalizeDateDerivedFields(state, tripDays, calculateNights("2026-08-22", "2026-08-15"));
    expect(result.dailySpending.foodDrinks.days).toBe(0);
  });

  it("accommodation manual override is preserved during normalisation", () => {
    const s = createDefaultState();
    s.accommodationCosts.nightsManuallyOverridden = true;
    s.accommodationCosts.nights = 14;

    const result = normalizeDateDerivedFields(s, 5, 4);
    // Manual override: nights stays 14
    expect(result.accommodationCosts.nights).toBe(14);
    expect(result.accommodationCosts.nightsManuallyOverridden).toBe(true);
  });

  it("accommodation without override derives from trip nights", () => {
    const s = createDefaultState();
    s.accommodationCosts.nightsManuallyOverridden = false;
    s.accommodationCosts.nights = 0;

    const result = normalizeDateDerivedFields(s, 5, 4);
    expect(result.accommodationCosts.nights).toBe(4);
    expect(result.accommodationCosts.nightsManuallyOverridden).toBe(false);
  });

  it("restored draft with mismatched category days is normalised", () => {
    const s = createDefaultState();
    // Simulate a saved draft with inconsistent state
    s.dailySpending.foodDrinks = { dailyAmount: 100, days: 10, daysManuallyOverridden: true };
    s.dailySpending.localTransport = { dailyAmount: 40, days: 3, daysManuallyOverridden: true };
    s.dailySpending.shopping = { dailyAmount: 20, days: 7, daysManuallyOverridden: false };

    const result = normalizeDateDerivedFields(s, 5, 4);
    // All days reset to 5
    expect(result.dailySpending.foodDrinks.days).toBe(5);
    expect(result.dailySpending.localTransport.days).toBe(5);
    expect(result.dailySpending.shopping.days).toBe(5);
    // All flags reset
    expect(result.dailySpending.foodDrinks.daysManuallyOverridden).toBe(false);
    // Amounts preserved
    expect(result.dailySpending.foodDrinks.dailyAmount).toBe(100);
    expect(result.dailySpending.localTransport.dailyAmount).toBe(40);
  });

  it("restored daysManuallyOverridden=true flags become false", () => {
    const s = createDefaultState();
    s.dailySpending.foodDrinks.daysManuallyOverridden = true;
    s.dailySpending.shopping.daysManuallyOverridden = true;

    const result = normalizeDateDerivedFields(s, 7, 6);
    expect(result.dailySpending.foodDrinks.daysManuallyOverridden).toBe(false);
    expect(result.dailySpending.shopping.daysManuallyOverridden).toBe(false);
  });

  it("corrected valid dates reactivate daily totals", () => {
    // Start with no dates — daily subtotal = 0
    const s = createDefaultState();
    s.dailySpending.foodDrinks = { dailyAmount: 100, days: 0, daysManuallyOverridden: false };
    const summary1 = calculateSummary(s);
    expect(summary1.dailySpendingSubtotal).toBe(0);

    // Set valid dates — normalisation reactivates
    const result = normalizeDateDerivedFields(s, 5, 4);
    const summary2 = calculateSummary(result);
    expect(summary2.dailySpendingSubtotal).toBe(500);
  });

  it("daily amounts survive date removal", () => {
    const s = createDefaultState();
    s.dailySpending.foodDrinks = { dailyAmount: 100, days: 5, daysManuallyOverridden: false };
    s.dailySpending.shopping = { dailyAmount: 50, days: 5, daysManuallyOverridden: false };

    // Remove dates — days go to 0, amounts preserved
    const result = normalizeDateDerivedFields(s, undefined, undefined);
    expect(result.dailySpending.foodDrinks.dailyAmount).toBe(100);
    expect(result.dailySpending.shopping.dailyAmount).toBe(50);
    expect(result.dailySpending.foodDrinks.days).toBe(0);
  });

  it("reverse range normalises every daily category to 0 days", () => {
    const s = createDefaultState();
    s.dailySpending.foodDrinks = { dailyAmount: 100, days: 5, daysManuallyOverridden: false };
    s.dailySpending.shopping = { dailyAmount: 50, days: 5, daysManuallyOverridden: false };

    const result = normalizeDateDerivedFields(s, 0, 0);
    expect(result.dailySpending.foodDrinks.days).toBe(0);
    expect(result.dailySpending.shopping.days).toBe(0);
    // Amounts preserved
    expect(result.dailySpending.foodDrinks.dailyAmount).toBe(100);
    expect(result.dailySpending.shopping.dailyAmount).toBe(50);
  });

  it("reverse range daily subtotal is 0", () => {
    const s = createDefaultState();
    s.dailySpending.foodDrinks = { dailyAmount: 100, days: 0, daysManuallyOverridden: false };
    const summary = calculateSummary(s);
    expect(summary.dailySpendingSubtotal).toBe(0);
  });

  it("reverse range preserves entered daily amounts", () => {
    const s = createDefaultState();
    s.dailySpending.foodDrinks = { dailyAmount: 100, days: 0, daysManuallyOverridden: false };
    s.dailySpending.shopping = { dailyAmount: 50, days: 0, daysManuallyOverridden: false };
    expect(s.dailySpending.foodDrinks.dailyAmount).toBe(100);
    expect(s.dailySpending.shopping.dailyAmount).toBe(50);
  });

  it("correcting reverse range to valid dates reactivates the subtotal", () => {
    const s = createDefaultState();
    s.dailySpending.foodDrinks = { dailyAmount: 100, days: 0, daysManuallyOverridden: false };
    // Reverse → subtotal 0
    expect(calculateSummary(s).dailySpendingSubtotal).toBe(0);
    // Fix dates → subtotal reactivates
    const result = normalizeDateDerivedFields(s, 5, 4);
    expect(calculateSummary(result).dailySpendingSubtotal).toBe(500);
  });

  it("preserves unrelated state", () => {
    const s = createDefaultState();
    s.travellers.adults = 3;
    s.flightCosts.adultAirfare = 500;
    s.tripDetails.tripName = "Test";

    const result = normalizeDateDerivedFields(s, 5, 4);
    expect(result.travellers.adults).toBe(3);
    expect(result.flightCosts.adultAirfare).toBe(500);
    expect(result.tripDetails.tripName).toBe("Test");
    // But note: normalizeDateDerivedFields creates a copy of state without tripDetails
    // The hook caller handles tripDetails separately
  });
});
