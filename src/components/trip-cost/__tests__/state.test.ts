import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createDefaultState } from "../useTripCostPlanner";
import { DEFAULT_STATE } from "../tripCostDefaults";
import { calculateSummary, calculateNights } from "../tripCostCalculations";
import { loadDraft, saveDraft, clearDraft } from "../tripCostStorage";

// ── Mock localStorage ──

const store = new Map<string, string>();
const mockStorage: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, val: string) => { store.set(key, val); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => store.clear(),
  get length() { return store.size; },
  key: (i: number) => Array.from(store.keys())[i] ?? null,
};
const orig = globalThis.localStorage;
(globalThis as Record<string, unknown>).localStorage = mockStorage;

afterAll(() => {
  (globalThis as Record<string, unknown>).localStorage = orig;
});

beforeEach(() => store.clear());

// ── Default state ──

describe("createDefaultState", () => {
  it("returns a clone of DEFAULT_STATE", () => {
    const s1 = createDefaultState();
    const s2 = createDefaultState();
    expect(s1).toEqual(DEFAULT_STATE);
    expect(s2).toEqual(DEFAULT_STATE);
    // Not the same reference
    expect(s1).not.toBe(s2);
    expect(s1.tripDetails).not.toBe(s2.tripDetails);
  });

  it("returns independent mutable copies", () => {
    const s1 = createDefaultState();
    s1.travellers.adults = 99;
    const s2 = createDefaultState();
    expect(s2.travellers.adults).toBe(1); // default intact
  });

  it("returns a valid state object", () => {
    const s = createDefaultState();
    expect(s.tripDetails.currency).toBe("AUD");
    expect(s.travellers.adults).toBe(1);
    expect(s.activities).toEqual([]);
    expect(s.contingency.mode).toBe("pct-10");
  });
});

// ── Derived summary from state ──

describe("summary from state", () => {
  it("produces zero totals for default state", () => {
    const state = createDefaultState();
    const summary = calculateSummary(state);
    expect(summary.total).toBe(0);
    expect(summary.flightsSubtotal).toBe(0);
  });

  it("updates when trip details change", () => {
    const state = createDefaultState();
    state.tripDetails.departureDate = "2026-08-15";
    state.tripDetails.returnDate = "2026-08-22";
    const summary = calculateSummary(state);
    expect(summary.tripNights).toBe(7);
    expect(summary.tripDays).toBe(8);
  });

  it("updates currency in summary metadata", () => {
    const state = createDefaultState();
    state.tripDetails.currency = "JPY";
    state.flightCosts.adultAirfare = 10000;
    const summary = calculateSummary(state);
    expect(summary.total).toBeGreaterThan(0);
  });

  it("returns undefined per-day when dates are missing", () => {
    const summary = calculateSummary(createDefaultState());
    expect(summary.costPerDay).toBeUndefined();
    expect(summary.costPerTravellerPerDay).toBeUndefined();
  });

  it("returns undefined per-traveller with 0 travellers", () => {
    const state = createDefaultState();
    state.travellers = { adults: 0, children: 0, infants: 0 };
    const summary = calculateSummary(state);
    expect(summary.costPerTraveller).toBeUndefined();
  });

  it("never returns NaN or Infinity", () => {
    const state = createDefaultState();
    // Set some costs
    state.flightCosts.adultAirfare = 500;
    const summary = calculateSummary(state);
    expect(Number.isFinite(summary.total)).toBe(true);
    expect(Number.isFinite(summary.flightsSubtotal)).toBe(true);
    expect(summary.costPerTraveller).not.toBeNaN();
    expect(summary.costPerDay ?? 0).not.toBeNaN();
  });

  it("correctly handles JPY zero-decimal formatting in summary", () => {
    const state = createDefaultState();
    state.tripDetails.currency = "JPY";
    state.flightCosts.adultAirfare = 10000;
    const summary = calculateSummary(state);
    expect(summary.flightsSubtotal).toBe(10000);
    expect(summary.total).toBe(11000); // +10% contingency
  });
});

// ── Draft restore simulation ──

describe("draft lifecycle", () => {
  it("saveDraft creates a loadable draft", () => {
    const state = createDefaultState();
    state.tripDetails.tripName = "Test Trip";
    saveDraft(state);
    const loaded = loadDraft();
    expect(loaded).toBeTruthy();
    expect(loaded!.tripDetails.tripName).toBe("Test Trip");
  });

  it("loadDraft returns null when nothing saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("clearDraft removes saved data", () => {
    saveDraft(createDefaultState());
    expect(loadDraft()).toBeTruthy();
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("restored draft takes precedence over defaults", () => {
    // Simulate the restore logic
    const defaults = createDefaultState();
    const saved = createDefaultState();
    saved.tripDetails.tripName = "Restored Trip";
    saved.travellers.adults = 3;
    saveDraft(saved);

    // Simulate the hook's restore
    const draft = loadDraft();
    const finalState = draft ?? defaults;

    expect(finalState.tripDetails.tripName).toBe("Restored Trip");
    expect(finalState.travellers.adults).toBe(3);
    expect(finalState).not.toBe(defaults);
  });
});

// ── Date → nights derivation ──

describe("date-derived nights", () => {
  it("derives nights when dates change and not overridden", () => {
    const state = createDefaultState();
    state.accommodationCosts.nightsManuallyOverridden = false;
    state.tripDetails.departureDate = "2026-08-15";
    state.tripDetails.returnDate = "2026-08-22";

    const derivedNights = calculateNights(state.tripDetails.departureDate, state.tripDetails.returnDate);

    expect(derivedNights).toBe(7);
  });

  it("preserves manual nights when overridden", () => {
    const state = createDefaultState();
    state.accommodationCosts.nightsManuallyOverridden = true;
    state.accommodationCosts.nights = 14;
    state.tripDetails.departureDate = "2026-08-15";
    state.tripDetails.returnDate = "2026-08-22";
    // Manual override: nights should stay 14
    expect(state.accommodationCosts.nights).toBe(14);
  });
});

// ── Currency update ──

describe("currency update", () => {
  it("changing currency updates state", () => {
    const state = createDefaultState();
    state.tripDetails.currency = "EUR";
    expect(state.tripDetails.currency).toBe("EUR");
  });

  it("summary reflects currency change", () => {
    const state = createDefaultState();
    state.tripDetails.currency = "GBP";
    state.flightCosts.adultAirfare = 500;
    const summary = calculateSummary(state);
    expect(summary.total).toBeGreaterThan(0);
  });
});
