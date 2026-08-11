/**
 * Trip Persistence — versioned localStorage for shared trip-planning context.
 *
 * M1 stores TRIP CONTEXT only (origin, destination, dates, travellers).
 * It does NOT store bookings, prices, saved products, or provider offers.
 *
 * STORAGE KEY:  "bf_trip_context"
 * CURRENT VERSION: 1
 *
 * Migration strategy for future versions:
 *   - Increment CURRENT_VERSION when schema changes
 *   - Add a migration path in loadTripFromStorage for the previous version
 *   - Unknown/old versions fail safely and return null
 */

export interface TripDestination {
  id?: string;
  name: string;
  city?: string;
  country?: string;
  countryCode?: string;
  airportCode?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export interface TripDates {
  /** YYYY-MM-DD calendar date — NOT a timestamp */
  departureDate: string;
  /** YYYY-MM-DD calendar date — NOT a timestamp */
  returnDate?: string;
}

export interface TripTravellers {
  adults: number;
  children: number;
  infants: number;
}

export type TripSurface = "home" | "flights" | "stays" | "things" | "tripCost" | "optimizer" | "unknown";

export interface TripContextState {
  version: number;
  origin?: TripDestination;
  destination?: TripDestination;
  dates?: TripDates;
  travellers?: TripTravellers;
  lastSurface?: TripSurface;
  updatedAt: string; // ISO timestamp for metadata only
}

// ── Constants ──

export const TRIP_STORAGE_KEY = "bf_trip_context";
export const CURRENT_VERSION = 1;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Load ──

function isValidDateString(v: unknown): v is string {
  return typeof v === "string" && DATE_RE.test(v);
}

function isValidDestination(v: unknown): v is TripDestination {
  if (!v || typeof v !== "object") return false;
  const d = v as Record<string, unknown>;
  return typeof d.name === "string" && d.name.length > 0;
}

function isValidTravellers(v: unknown): v is TripTravellers {
  if (!v || typeof v !== "object") return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.adults === "number" && Number.isInteger(t.adults) && t.adults >= 1 && t.adults <= 9 &&
    typeof t.children === "number" && Number.isInteger(t.children) && t.children >= 0 && t.children <= 9 &&
    typeof t.infants === "number" && Number.isInteger(t.infants) && t.infants >= 0 && t.infants <= 9
  );
}

/**
 * Load trip context from localStorage.
 * Returns null if nothing is stored or stored data is malformed.
 * Defensive: unknown versions, missing fields, and bad types all fail safely.
 */
export function loadTripFromStorage(): TripContextState | null {
  try {
    const raw = localStorage.getItem(TRIP_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;

    // Version gate
    if (parsed.version !== CURRENT_VERSION) return null;

    const state: TripContextState = { version: CURRENT_VERSION, updatedAt: parsed.updatedAt || new Date().toISOString() };

    // origin
    if (parsed.origin && isValidDestination(parsed.origin)) {
      state.origin = parsed.origin as TripDestination;
    }

    // destination
    if (parsed.destination && isValidDestination(parsed.destination)) {
      state.destination = parsed.destination as TripDestination;
    }

    // dates
    if (parsed.dates && typeof parsed.dates === "object") {
      const dates: Partial<TripDates> = {};
      if (isValidDateString(parsed.dates.departureDate)) dates.departureDate = parsed.dates.departureDate;
      if (parsed.dates.returnDate && isValidDateString(parsed.dates.returnDate)) dates.returnDate = parsed.dates.returnDate;
      if (dates.departureDate) state.dates = dates as TripDates;
    }

    // travellers
    if (parsed.travellers && isValidTravellers(parsed.travellers)) {
      state.travellers = parsed.travellers as TripTravellers;
    }

    // lastSurface
    const surfaces: TripSurface[] = ["home", "flights", "stays", "things", "tripCost", "optimizer", "unknown"];
    if (typeof parsed.lastSurface === "string" && surfaces.includes(parsed.lastSurface as TripSurface)) {
      state.lastSurface = parsed.lastSurface as TripSurface;
    }

    return state;
  } catch {
    // Malformed JSON or storage error — fail safely
    return null;
  }
}

// ── Save ──

/**
 * Persist trip context to localStorage.
 * Does NOT throw on storage errors (quota exceeded, private mode, etc.)
 */
export function saveTripToStorage(state: TripContextState): void {
  try {
    localStorage.setItem(TRIP_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Silently fail — localStorage may be unavailable (quota, private mode)
  }
}

// ── Clear ──

/**
 * Remove trip context from localStorage.
 */
export function clearTripFromStorage(): void {
  try {
    localStorage.removeItem(TRIP_STORAGE_KEY);
  } catch {
    // Silently fail
  }
}
