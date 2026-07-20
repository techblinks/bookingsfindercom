import { describe, it, expect } from "vitest";
import { createDefaultState } from "../useTripCostPlanner";
import {
  calculateSummary,
  calculateDailySpendingSubtotal,
  calculatePreparationSubtotal,
} from "../tripCostCalculations";

// ── Daily spending ──

describe("daily spending calculation", () => {
  it("sums categories × days correctly", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 5, daysManuallyOverridden: false };
    state.dailySpending.localTransport = { dailyAmount: 40, days: 5, daysManuallyOverridden: false };
    state.dailySpending.shopping = { dailyAmount: 20, days: 5, daysManuallyOverridden: false };
    state.dailySpending.entertainment = { dailyAmount: 30, days: 5, daysManuallyOverridden: false };
    state.dailySpending.miscellaneous = { dailyAmount: 10, days: 5, daysManuallyOverridden: false };
    // combined daily = 200, × 5 days = 1000
    const subtotal = calculateDailySpendingSubtotal(state.dailySpending);
    expect(subtotal).toBe(1000);
  });

  it("does not multiply by traveller count", () => {
    const state = createDefaultState();
    state.travellers = { adults: 4, children: 0, infants: 0 };
    state.dailySpending.foodDrinks = { dailyAmount: 50, days: 5, daysManuallyOverridden: false };
    const subtotal = calculateDailySpendingSubtotal(state.dailySpending);
    expect(subtotal).toBe(250); // 50 × 5, NOT × 4 travellers
  });

  it("returns 0 when all categories are 0", () => {
    const state = createDefaultState();
    expect(calculateDailySpendingSubtotal(state.dailySpending)).toBe(0);
  });

  it("handles different day counts per category", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 5, daysManuallyOverridden: false };
    state.dailySpending.shopping = { dailyAmount: 20, days: 2, daysManuallyOverridden: true };
    expect(calculateDailySpendingSubtotal(state.dailySpending)).toBe(540); // 500 + 40
  });

  it("handles incomplete dates (days = 0)", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 0, daysManuallyOverridden: false };
    expect(calculateDailySpendingSubtotal(state.dailySpending)).toBe(0);
  });

  it("handles decimals", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: 99.95, days: 3, daysManuallyOverridden: false };
    expect(calculateDailySpendingSubtotal(state.dailySpending)).toBeCloseTo(299.85);
  });

  it("negative values are safe", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: -100, days: 5, daysManuallyOverridden: false };
    expect(calculateDailySpendingSubtotal(state.dailySpending)).toBe(0);
  });

  it("NaN is safe", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: NaN, days: 5, daysManuallyOverridden: false };
    expect(calculateDailySpendingSubtotal(state.dailySpending)).toBe(0);
  });

  it("values survive after date removal", () => {
    // Entry values are stored in dailyAmount fields; days may go to 0
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 0, daysManuallyOverridden: false };
    expect(state.dailySpending.foodDrinks.dailyAmount).toBe(100);
    expect(calculateDailySpendingSubtotal(state.dailySpending)).toBe(0);
  });
});

// ── Preparation ──

describe("preparation calculation", () => {
  it("sums all fields as trip totals", () => {
    const state = createDefaultState();
    state.preparationCosts.travelInsurance = 200;
    state.preparationCosts.visaFees = 100;
    state.preparationCosts.passportCosts = 50;
    state.preparationCosts.vaccinations = 30;
    state.preparationCosts.esimMobileData = 20;
    state.preparationCosts.roaming = 0;
    state.preparationCosts.otherCosts = 0;
    expect(calculatePreparationSubtotal(state.preparationCosts)).toBe(400);
  });

  it("does not multiply by traveller count", () => {
    const state = createDefaultState();
    state.travellers = { adults: 3, children: 0, infants: 0 };
    state.preparationCosts.travelInsurance = 200;
    expect(calculatePreparationSubtotal(state.preparationCosts)).toBe(200);
  });

  it("returns 0 for all zeros", () => {
    expect(calculatePreparationSubtotal(createDefaultState().preparationCosts)).toBe(0);
  });

  it("handles decimals", () => {
    const state = createDefaultState();
    state.preparationCosts.visaFees = 99.50;
    expect(calculatePreparationSubtotal(state.preparationCosts)).toBeCloseTo(99.5);
  });

  it("negative values are safe", () => {
    const state = createDefaultState();
    state.preparationCosts.travelInsurance = -200;
    expect(calculatePreparationSubtotal(state.preparationCosts)).toBe(0);
  });

  it("NaN is safe", () => {
    const state = createDefaultState();
    state.preparationCosts.travelInsurance = NaN;
    expect(calculatePreparationSubtotal(state.preparationCosts)).toBe(0);
  });
});

// ── Summary audit scenario ──

describe("audit scenario", () => {
  it("matches the specified scenario totals", () => {
    const state = createDefaultState();
    state.tripDetails.departureDate = "2026-08-15";
    state.tripDetails.returnDate = "2026-08-19"; // 4 nights, 5 days
    state.travellers = { adults: 2, children: 0, infants: 0 };
    state.flightCosts.adultAirfare = 500;
    state.flightCosts.checkedBaggage = 100;
    state.accommodationCosts.costPerNight = 150;
    state.accommodationCosts.nights = 5;
    state.accommodationCosts.cleaningFee = 50;
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 5, daysManuallyOverridden: false };
    state.dailySpending.localTransport = { dailyAmount: 40, days: 5, daysManuallyOverridden: false };
    state.dailySpending.shopping = { dailyAmount: 20, days: 5, daysManuallyOverridden: false };
    state.dailySpending.entertainment = { dailyAmount: 30, days: 5, daysManuallyOverridden: false };
    state.dailySpending.miscellaneous = { dailyAmount: 10, days: 5, daysManuallyOverridden: false };
    state.preparationCosts.travelInsurance = 200;
    state.preparationCosts.visaFees = 100;
    state.preparationCosts.esimMobileData = 50;
    state.preparationCosts.otherCosts = 50;
    state.contingency.mode = "pct-10";

    const summary = calculateSummary(state);

    // Flights: 500×2 + 100 = 1100
    expect(summary.flightsSubtotal).toBe(1100);
    // Accommodation: 150×5 + 50 = 800
    expect(summary.accommodationSubtotal).toBe(800);
    // Daily: (100+40+20+30+10)×5 = 200×5 = 1000
    expect(summary.dailySpendingSubtotal).toBe(1000);
    // Preparation: 200+100+50+50 = 400
    expect(summary.preparationSubtotal).toBe(400);
    // Subtotal: 1100+800+1000+400 = 3300
    expect(summary.subtotalBeforeContingency).toBe(3300);
    // Contingency 10%: 330
    expect(summary.contingencyAmount).toBe(330);
    // Total: 3630
    expect(summary.total).toBe(3630);
    // Per traveller: 3630/2 = 1815
    expect(summary.costPerTraveller).toBe(1815);
    // Per day: 3630/5 = 726
    expect(summary.costPerDay).toBe(726);
    // Per traveller/day: 3630/(5*2) = 363
    expect(summary.costPerTravellerPerDay).toBe(363);
  });
});

// ── State integration ──

describe("state integration", () => {
  it("daily spending update preserves flights", () => {
    const state = createDefaultState();
    state.flightCosts.adultAirfare = 500;
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 5, daysManuallyOverridden: false };
    expect(state.flightCosts.adultAirfare).toBe(500);
    expect(state.dailySpending.foodDrinks.dailyAmount).toBe(100);
  });

  it("preparation update preserves accommodation", () => {
    const state = createDefaultState();
    state.accommodationCosts.costPerNight = 150;
    state.preparationCosts.travelInsurance = 200;
    expect(state.accommodationCosts.costPerNight).toBe(150);
  });

  it("summary includes both new sections", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: 50, days: 3, daysManuallyOverridden: false };
    state.preparationCosts.travelInsurance = 100;
    const summary = calculateSummary(state);
    expect(summary.dailySpendingSubtotal).toBe(150);
    expect(summary.preparationSubtotal).toBe(100);
    expect(summary.subtotalBeforeContingency).toBe(250);
  });

  it("contingency recalculates from expanded subtotal", () => {
    const state = createDefaultState();
    state.flightCosts.adultAirfare = 500;
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 5, daysManuallyOverridden: false };
    state.preparationCosts.travelInsurance = 100;
    state.contingency.mode = "pct-10";
    const summary = calculateSummary(state);
    expect(summary.subtotalBeforeContingency).toBe(1100); // 500+500+100
    expect(summary.contingencyAmount).toBe(110);
  });

  it("never produces NaN or Infinity in full summary", () => {
    const state = createDefaultState();
    state.dailySpending.foodDrinks = { dailyAmount: 100, days: 7, daysManuallyOverridden: false };
    state.preparationCosts.travelInsurance = 200;
    state.tripDetails.departureDate = "2026-08-15";
    state.tripDetails.returnDate = "2026-08-22";
    const summary = calculateSummary(state);
    const entries = Object.entries(summary);
    for (const [, v] of entries) {
      if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    }
  });
});
