import type { TripCostPlannerState, StoredTripCostDraft } from "./types";

const STORAGE_KEY = "bookingsfinder.trip-cost.draft.v1";
const CURRENT_VERSION = 1 as const;

/**
 * Save the planner state to localStorage.
 * Wraps in a versioned payload with timestamp.
 * Silently handles storage unavailability.
 */
export function saveDraft(state: TripCostPlannerState): boolean {
  try {
    const payload: StoredTripCostDraft = {
      version: CURRENT_VERSION,
      savedAt: new Date().toISOString(),
      state,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

/**
 * Load a previously saved draft from localStorage.
 * Returns null if no draft exists, the data is malformed,
 * the version is unsupported, the state shape is corrupt, or storage is unavailable.
 */
export function loadDraft(): TripCostPlannerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isStoredDraft(parsed)) return null;
    if (parsed.version !== CURRENT_VERSION) return null;
    if (!isValidTripCostState(parsed.state)) return null;

    return parsed.state;
  } catch {
    return null;
  }
}

/**
 * Remove the saved draft from localStorage.
 */
export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore
  }
}

/**
 * Type guard: verify a parsed value has the expected StoredTripCostDraft shape.
 */
export function isStoredDraft(value: unknown): value is StoredTripCostDraft {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.version === "number" &&
    typeof v.savedAt === "string" &&
    typeof v.state === "object" &&
    v.state !== null
  );
}

/**
 * Structural type guard: verify the state object has the minimum expected shape
 * for the Trip Budget Planner. Returns false for corrupted or malformed payloads.
 *
 * This is intentionally lenient for optional fields (empty dates, zero costs, empty
 * strings are all valid) but rejects payloads missing required nested sections, or
 * with fundamentally wrong data types (non-object sections, non-array activities).
 */
export function isValidTripCostState(state: unknown): state is TripCostPlannerState {
  if (typeof state !== "object" || state === null) return false;
  const s = state as Record<string, unknown>;

  // Required top-level sections must be objects
  if (typeof s.tripDetails !== "object" || s.tripDetails === null) return false;
  if (typeof s.travellers !== "object" || s.travellers === null) return false;
  if (typeof s.flightCosts !== "object" || s.flightCosts === null) return false;
  if (typeof s.accommodationCosts !== "object" || s.accommodationCosts === null) return false;
  if (typeof s.dailySpending !== "object" || s.dailySpending === null) return false;
  if (typeof s.preparationCosts !== "object" || s.preparationCosts === null) return false;
  if (!Array.isArray(s.activities)) return false;
  if (typeof s.contingency !== "object" || s.contingency === null) return false;

  // Activities: each element must be an object with string name, number cost, number quantity
  const acts = s.activities as unknown[];
  for (const a of acts) {
    if (typeof a !== "object" || a === null) return false;
    const act = a as Record<string, unknown>;
    if (typeof act.id !== "string") return false;
    if (typeof act.name !== "string") return false;
    if (typeof act.cost !== "number") return false;
    if (typeof act.quantity !== "number") return false;
  }

  // Travellers: must have numeric counts
  const travellers = s.travellers as Record<string, unknown>;
  if (typeof travellers.adults !== "number") return false;
  if (typeof travellers.children !== "number") return false;
  if (typeof travellers.infants !== "number") return false;

  // Trip details: currency must be a string, dates must be strings
  const td = s.tripDetails as Record<string, unknown>;
  if (typeof td.currency !== "string") return false;
  if (typeof td.departureDate !== "string") return false;
  if (typeof td.returnDate !== "string") return false;

  // Contingency: mode must be a string
  const cont = s.contingency as Record<string, unknown>;
  if (typeof cont.mode !== "string") return false;

  return true;
}
