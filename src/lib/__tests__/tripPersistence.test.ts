/**
 * M1: TripContext tests — persistence, versioning, state management.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadTripFromStorage, saveTripToStorage, clearTripFromStorage, TRIP_STORAGE_KEY, CURRENT_VERSION, type TripContextState } from "@/lib/tripPersistence";

// Mock localStorage
const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, value: string) => { store[key] = value; }),
  removeItem: vi.fn((key: string) => { delete store[key]; }),
};
Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, writable: true });

beforeEach(() => {
  Object.keys(store).forEach(k => delete store[k]);
  vi.clearAllMocks();
});

describe("TripContext persistence — default empty state", () => {
  it("loadTripFromStorage returns null when nothing stored", () => {
    expect(loadTripFromStorage()).toBeNull();
  });

  it("clearTripFromStorage removes the key", () => {
    saveTripToStorage({ version: CURRENT_VERSION, updatedAt: new Date().toISOString() });
    clearTripFromStorage();
    expect(localStorage.getItem(TRIP_STORAGE_KEY)).toBeNull();
  });
});

describe("TripContext persistence — destination state", () => {
  it("roundtrips a destination-only state", () => {
    const state: TripContextState = {
      version: CURRENT_VERSION,
      destination: { name: "Sydney", country: "Australia", countryCode: "AU", airportCode: "SYD" },
      updatedAt: new Date().toISOString(),
    };
    saveTripToStorage(state);
    const loaded = loadTripFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.destination?.name).toBe("Sydney");
    expect(loaded!.destination?.airportCode).toBe("SYD");
  });
});

describe("TripContext persistence — route state", () => {
  it("roundtrips origin + destination", () => {
    const state: TripContextState = {
      version: CURRENT_VERSION,
      origin: { name: "Brisbane", airportCode: "BNE", countryCode: "AU" },
      destination: { name: "Kathmandu", airportCode: "KTM", countryCode: "NP" },
      updatedAt: new Date().toISOString(),
    };
    saveTripToStorage(state);
    const loaded = loadTripFromStorage();
    expect(loaded!.origin?.airportCode).toBe("BNE");
    expect(loaded!.destination?.airportCode).toBe("KTM");
  });
});

describe("TripContext persistence — canonical YYYY-MM-DD dates", () => {
  it("roundtrips departure and return dates as strings (not timestamps)", () => {
    const state: TripContextState = {
      version: CURRENT_VERSION,
      destination: { name: "Sydney" },
      dates: { departureDate: "2026-08-18", returnDate: "2026-08-29" },
      updatedAt: new Date().toISOString(),
    };
    saveTripToStorage(state);
    const loaded = loadTripFromStorage();
    expect(loaded!.dates?.departureDate).toBe("2026-08-18");
    expect(loaded!.dates?.returnDate).toBe("2026-08-29");
    // Not timestamps
    expect(loaded!.dates?.departureDate).not.toContain("T");
    expect(loaded!.dates?.departureDate).not.toContain("Z");
  });

  it("rejects non-YYYY-MM-DD date strings", () => {
    const state: TripContextState = {
      version: CURRENT_VERSION,
      dates: { departureDate: "2026-08-18T00:00:00Z" as any },
      updatedAt: new Date().toISOString(),
    };
    saveTripToStorage(state);
    const loaded = loadTripFromStorage();
    // Should be rejected — no dates field
    expect(loaded!.dates).toBeUndefined();
  });

  it("preserves YYYY-MM-DD without UTC shifting", () => {
    // Simulate writing a date that's always "2026-08-18" regardless of timezone
    const state: TripContextState = {
      version: CURRENT_VERSION,
      destination: { name: "Sydney" },
      dates: { departureDate: "2026-08-18" },
      updatedAt: new Date().toISOString(),
    };
    saveTripToStorage(state);
    const raw = JSON.parse(store[TRIP_STORAGE_KEY]);
    expect(raw.dates.departureDate).toBe("2026-08-18");
  });
});

describe("TripContext persistence — travellers", () => {
  it("roundtrips traveller counts", () => {
    const state: TripContextState = {
      version: CURRENT_VERSION,
      travellers: { adults: 2, children: 1, infants: 0 },
      updatedAt: new Date().toISOString(),
    };
    saveTripToStorage(state);
    const loaded = loadTripFromStorage();
    expect(loaded!.travellers?.adults).toBe(2);
    expect(loaded!.travellers?.children).toBe(1);
    expect(loaded!.travellers?.infants).toBe(0);
  });
});

describe("TripContext persistence — malformed data", () => {
  it("returns null for garbage JSON", () => {
    store[TRIP_STORAGE_KEY] = "not-json{";
    expect(loadTripFromStorage()).toBeNull();
  });

  it("returns null for wrong version", () => {
    store[TRIP_STORAGE_KEY] = JSON.stringify({ version: 99, destination: { name: "X" }, updatedAt: "" });
    expect(loadTripFromStorage()).toBeNull();
  });

  it("returns null for missing version", () => {
    store[TRIP_STORAGE_KEY] = JSON.stringify({ destination: { name: "X" } });
    expect(loadTripFromStorage()).toBeNull();
  });

  it("returns null for null/undefined in storage", () => {
    store[TRIP_STORAGE_KEY] = "null";
    expect(loadTripFromStorage()).toBeNull();
  });

  it("survives missing updatedAt gracefully", () => {
    store[TRIP_STORAGE_KEY] = JSON.stringify({ version: CURRENT_VERSION, destination: { name: "Sydney" } });
    const loaded = loadTripFromStorage();
    expect(loaded).not.toBeNull();
    expect(loaded!.destination?.name).toBe("Sydney");
  });
});

describe("TripContext persistence — clearTrip action", () => {
  it("clearTripFromStorage followed by load returns null", () => {
    saveTripToStorage({ version: CURRENT_VERSION, destination: { name: "X" }, updatedAt: new Date().toISOString() });
    clearTripFromStorage();
    expect(loadTripFromStorage()).toBeNull();
  });
});
