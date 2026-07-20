import { describe, it, expect, beforeEach } from "vitest";
import { saveDraft, loadDraft, clearDraft, isStoredDraft, isValidTripCostState } from "../tripCostStorage";
import { DEFAULT_STATE } from "../tripCostDefaults";

// Mock localStorage
const store = new Map<string, string>();
const mockLocalStorage: Storage = {
  getItem: (key: string) => store.get(key) ?? null,
  setItem: (key: string, value: string) => { store.set(key, value); },
  removeItem: (key: string) => { store.delete(key); },
  clear: () => { store.clear(); },
  get length() { return store.size; },
  key: (index: number) => Array.from(store.keys())[index] ?? null,
};

// Replace global localStorage
const _original = globalThis.localStorage;
(globalThis as Record<string, unknown>).localStorage = mockLocalStorage;

afterAll(() => {
  (globalThis as Record<string, unknown>).localStorage = _original;
});

beforeEach(() => {
  store.clear();
});

describe("saveDraft / loadDraft", () => {
  it("roundtrips save → load", () => {
    saveDraft(DEFAULT_STATE);
    const loaded = loadDraft();
    expect(loaded).toBeTruthy();
    expect(loaded!.tripDetails.currency).toBe("AUD");
  });

  it("returns null when nothing saved", () => {
    expect(loadDraft()).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    store.set("bookingsfinder.trip-cost.draft.v1", "{not-json");
    expect(loadDraft()).toBeNull();
  });

  it("returns null for empty object in storage", () => {
    store.set("bookingsfinder.trip-cost.draft.v1", "{}");
    expect(loadDraft()).toBeNull();
  });

  it("returns null for wrong version shape", () => {
    store.set("bookingsfinder.trip-cost.draft.v1", JSON.stringify({ version: 99, savedAt: "2026", state: {} }));
    expect(loadDraft()).toBeNull();
  });

  it("returns null when state is an empty object", () => {
    store.set("bookingsfinder.trip-cost.draft.v1", JSON.stringify({ version: 1, savedAt: "2026-07-20", state: {} }));
    expect(loadDraft()).toBeNull();
  });

  it("returns null when state is missing tripDetails", () => {
    const state = { travellers: { adults: 1, children: 0, infants: 0 } };
    store.set("bookingsfinder.trip-cost.draft.v1", JSON.stringify({ version: 1, savedAt: "2026-07-20", state }));
    expect(loadDraft()).toBeNull();
  });

  it("returns null when activities is not an array", () => {
    const corrupt = { ...DEFAULT_STATE, activities: "not-an-array" };
    store.set("bookingsfinder.trip-cost.draft.v1", JSON.stringify({ version: 1, savedAt: "2026-07-20", state: corrupt }));
    expect(loadDraft()).toBeNull();
  });

  it("returns null when activity rows are corrupted", () => {
    const corrupt = { ...DEFAULT_STATE, activities: [{ name: "ok", cost: 10, quantity: 1 }, null] };
    store.set("bookingsfinder.trip-cost.draft.v1", JSON.stringify({ version: 1, savedAt: "2026-07-20", state: corrupt }));
    expect(loadDraft()).toBeNull();
  });

  it("returns null when traveller count is not a number", () => {
    const corrupt = { ...DEFAULT_STATE, travellers: { adults: "one", children: 0, infants: 0 } };
    store.set("bookingsfinder.trip-cost.draft.v1", JSON.stringify({ version: 1, savedAt: "2026-07-20", state: corrupt }));
    expect(loadDraft()).toBeNull();
  });

  it("accepts draft with empty dates and zero costs (valid draft shape)", () => {
    const draft = {
      ...DEFAULT_STATE,
      tripDetails: { ...DEFAULT_STATE.tripDetails, departureDate: "", returnDate: "" },
    };
    saveDraft(draft);
    const loaded = loadDraft();
    expect(loaded).toBeTruthy();
    expect(loaded!.tripDetails.departureDate).toBe("");
    expect(loaded!.tripDetails.returnDate).toBe("");
  });
});

describe("isValidTripCostState", () => {
  it("accepts default state", () => {
    expect(isValidTripCostState(DEFAULT_STATE)).toBe(true);
  });

  it("rejects null", () => {
    expect(isValidTripCostState(null)).toBe(false);
  });

  it("rejects missing travellers section", () => {
    const { travellers: _, ...rest } = DEFAULT_STATE;
    expect(isValidTripCostState(rest)).toBe(false);
  });

  it("rejects non-array activities", () => {
    const corrupt = { ...DEFAULT_STATE, activities: "nope" };
    expect(isValidTripCostState(corrupt)).toBe(false);
  });

  it("rejects corrupted activity items", () => {
    const corrupt = { ...DEFAULT_STATE, activities: [{ id: 123, name: null, cost: "ten", quantity: {} }] };
    expect(isValidTripCostState(corrupt)).toBe(false);
  });
});

describe("clearDraft", () => {
  it("removes saved draft", () => {
    saveDraft(DEFAULT_STATE);
    expect(loadDraft()).toBeTruthy();
    clearDraft();
    expect(loadDraft()).toBeNull();
  });

  it("does not throw when nothing saved", () => {
    expect(() => clearDraft()).not.toThrow();
  });
});

describe("isStoredDraft", () => {
  it("accepts valid draft shape", () => {
    const draft = { version: 1, savedAt: "2026-07-20T00:00:00Z", state: { tripDetails: { currency: "AUD" } } };
    expect(isStoredDraft(draft)).toBe(true);
  });

  it("rejects null", () => {
    expect(isStoredDraft(null)).toBe(false);
  });

  it("rejects missing version", () => {
    expect(isStoredDraft({ savedAt: "2026", state: {} })).toBe(false);
  });

  it("rejects missing state", () => {
    expect(isStoredDraft({ version: 1, savedAt: "2026" })).toBe(false);
  });
});
