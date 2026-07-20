import { describe, it, expect } from "vitest";
import {
  validateCurrency,
  validateTripDetails,
  validateTravellers,
  validateMonetaryValue,
  validateActivities,
  validateContingency,
  validatePlannerState,
} from "../tripCostValidation";
import { DEFAULT_STATE } from "../tripCostDefaults";

describe("validateCurrency", () => {
  it("accepts AUD", () => {
    expect(validateCurrency("AUD").valid).toBe(true);
  });

  it("rejects unsupported currency", () => {
    const r = validateCurrency("XYZ");
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("unsupported_currency");
  });
});

describe("validateTripDetails", () => {
  it("accepts defaults", () => {
    expect(validateTripDetails(DEFAULT_STATE.tripDetails).valid).toBe(true);
  });

  it("rejects return before departure", () => {
    const td = { ...DEFAULT_STATE.tripDetails, departureDate: "2026-08-22", returnDate: "2026-08-15" };
    const r = validateTripDetails(td);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "date_order")).toBe(true);
  });

  it("rejects departure in the past", () => {
    const td = { ...DEFAULT_STATE.tripDetails, departureDate: "2020-01-01", returnDate: "2026-08-22" };
    const r = validateTripDetails(td);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "departure_past")).toBe(true);
  });

  it("rejects too-long trip name", () => {
    const td = { ...DEFAULT_STATE.tripDetails, tripName: "x".repeat(101) };
    expect(validateTripDetails(td).valid).toBe(false);
  });
});

describe("validateTravellers", () => {
  it("accepts defaults", () => {
    expect(validateTravellers(DEFAULT_STATE.travellers).valid).toBe(true);
  });

  it("rejects 0 travellers", () => {
    const t = { adults: 0, children: 0, infants: 0 };
    const r = validateTravellers(t);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "zero_total")).toBe(true);
  });

  it("rejects negative values", () => {
    const t = { adults: -1, children: 0, infants: 0 };
    const r = validateTravellers(t);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "negative")).toBe(true);
  });

  it("rejects non-whole values", () => {
    const t = { adults: 1.5, children: 0, infants: 0 };
    const r = validateTravellers(t);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "not_whole")).toBe(true);
  });

  it("rejects exceeding 20 total", () => {
    const t = { adults: 21, children: 0, infants: 0 };
    const r = validateTravellers(t);
    expect(r.valid).toBe(false);
  });
});

describe("validateMonetaryValue", () => {
  it("accepts 0", () => {
    expect(validateMonetaryValue(0, "field").valid).toBe(true);
  });

  it("rejects negative", () => {
    const r = validateMonetaryValue(-10, "field");
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("negative");
  });

  it("rejects NaN", () => {
    expect(validateMonetaryValue(NaN, "field").valid).toBe(false);
  });

  it("rejects Infinity", () => {
    expect(validateMonetaryValue(Infinity, "field").valid).toBe(false);
  });
});

describe("validateActivities", () => {
  it("accepts empty list", () => {
    expect(validateActivities([]).valid).toBe(true);
  });

  it("rejects activity with cost but no name", () => {
    const acts = [{ id: "1", name: "", cost: 50, quantity: 1 }];
    const r = validateActivities(acts);
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.code === "name_required")).toBe(true);
  });

  it("accepts activity with name and cost", () => {
    const acts = [{ id: "1", name: "Tour", cost: 50, quantity: 1 }];
    expect(validateActivities(acts).valid).toBe(true);
  });

  it("rejects 0 quantity", () => {
    const acts = [{ id: "1", name: "Tour", cost: 50, quantity: 0 }];
    expect(validateActivities(acts).valid).toBe(false);
  });
});

describe("validateContingency", () => {
  it("accepts default 10%", () => {
    expect(validateContingency(DEFAULT_STATE.contingency).valid).toBe(true);
  });

  it("rejects custom percentage > 100", () => {
    const c = { mode: "pct-custom" as const, customPercentage: 150, customFixedAmount: 0 };
    expect(validateContingency(c).valid).toBe(false);
  });

  it("rejects negative fixed amount", () => {
    const c = { mode: "fixed" as const, customPercentage: 0, customFixedAmount: -50 };
    expect(validateContingency(c).valid).toBe(false);
  });
});

describe("validatePlannerState", () => {
  it("accepts default state", () => {
    expect(validatePlannerState(DEFAULT_STATE).valid).toBe(true);
  });

  it("collects multiple errors", () => {
    const state = {
      ...DEFAULT_STATE,
      travellers: { adults: 0, children: 0, infants: 0 },
      flightCosts: { ...DEFAULT_STATE.flightCosts, adultAirfare: -100 },
    };
    const r = validatePlannerState(state);
    expect(r.valid).toBe(false);
    expect(r.errors.length).toBeGreaterThan(1);
  });
});
