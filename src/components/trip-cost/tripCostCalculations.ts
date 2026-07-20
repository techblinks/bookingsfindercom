import { differenceInCalendarDays } from "date-fns";
import type { TripCostPlannerState, TripCostSummary } from "./types";

// ── Date helpers ──

/**
 * Parse a "YYYY-MM-DD" string into year/month/day numbers.
 * Returns undefined if the string is empty or malformed.
 */
function parseDateParts(dateStr: string): { year: number; month: number; day: number } | undefined {
  if (!dateStr) return undefined;
  const parts = dateStr.split("-");
  if (parts.length !== 3) return undefined;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return undefined;
  if (month < 1 || month > 12 || day < 1 || day > 31) return undefined;
  return { year, month, day };
}

/** Build a Date object in local time from "YYYY-MM-DD" to avoid timezone shifts. */
function toLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day);
}

/**
 * Check whether the return date is at or after the departure date.
 * Returns false if either date is missing.
 */
export function isReturnAfterDeparture(departureDate: string, returnDate: string): boolean {
  const dep = parseDateParts(departureDate);
  const ret = parseDateParts(returnDate);
  if (!dep || !ret) return false;
  return differenceInCalendarDays(
    toLocalDate(ret.year, ret.month, ret.day),
    toLocalDate(dep.year, dep.month, dep.day)
  ) >= 0;
}

/**
 * Check whether the departure date is today or in the future.
 * Uses date-only comparison (no time component).
 * Returns true if the date is missing (optional field — caller validates if required).
 *
 * @param dateStr  "YYYY-MM-DD"
 * @param today    Injectable reference date for test stability. Defaults to new Date().
 */
export function isDepartureNotBeforeToday(dateStr: string, today: Date = new Date()): boolean {
  if (!dateStr) return true; // optional field — not an error
  const parts = parseDateParts(dateStr);
  if (!parts) return false;
  const todayStr = today.toISOString().slice(0, 10); // "YYYY-MM-DD"
  return dateStr >= todayStr;
}

/**
 * Derive the appropriate accommodation nights value given the trip state.
 *
 * Behaviour:
 * - If nightsManuallyOverridden is true: keep the user's manual value
 * - Else if both dates are valid: derive from trip dates
 * - Otherwise: keep the current value (which may be 0 or a previous manual value)
 */
export function deriveNights(
  departureDate: string,
  returnDate: string,
  currentNights: number,
  nightsManuallyOverridden: boolean
): number {
  if (nightsManuallyOverridden) return currentNights;
  const derived = calculateNights(departureDate, returnDate);
  return derived !== undefined ? derived : currentNights;
}

/**
 * Calculate trip nights (returnDate − departureDate).
 * Returns undefined if either date is missing or invalid.
 * Never returns a negative value — returns 0 for equal dates.
 */
export function calculateNights(departureDate: string, returnDate: string): number | undefined {
  const dep = parseDateParts(departureDate);
  const ret = parseDateParts(returnDate);
  if (!dep || !ret) return undefined;

  const nights = differenceInCalendarDays(
    toLocalDate(ret.year, ret.month, ret.day),
    toLocalDate(dep.year, dep.month, dep.day)
  );

  // Never return negative values — return before departure is a validation error
  return Math.max(0, nights);
}

/**
 * Calculate calendar days including both departure and return.
 * days = nights + 1.
 */
export function calculateDays(departureDate: string, returnDate: string): number | undefined {
  const nights = calculateNights(departureDate, returnDate);
  return nights !== undefined ? nights + 1 : undefined;
}

// ── Travellers ──

export function getTotalTravellers(travellers: { adults: number; children: number; infants: number }): number {
  return travellers.adults + travellers.children + travellers.infants;
}

// ── Cost sub-totals ──

/** Ensure a value is a safe finite non-negative number, defaulting to 0. */
function safeValue(v: number): number {
  if (typeof v !== "number" || !Number.isFinite(v) || v < 0) return 0;
  return v;
}

export function calculateFlightsSubtotal(flightCosts: State["flightCosts"], travellers: State["travellers"]): number {
  const fc = flightCosts;
  const t = travellers;
  return (
    safeValue(fc.adultAirfare) * safeValue(t.adults) +
    safeValue(fc.childAirfare) * safeValue(t.children) +
    safeValue(fc.infantAirfare) * safeValue(t.infants) +
    safeValue(fc.checkedBaggage) +
    safeValue(fc.seatSelection) +
    safeValue(fc.airportParking) +
    safeValue(fc.departureTransfer) +
    safeValue(fc.arrivalTransfer) +
    safeValue(fc.otherFlightCosts)
  );
}

export function calculateAccommodationSubtotal(accommodationCosts: State["accommodationCosts"]): number {
  const ac = accommodationCosts;
  return (
    safeValue(ac.costPerNight) * safeValue(ac.nights) +
    safeValue(ac.taxes) +
    safeValue(ac.cleaningFee) +
    safeValue(ac.resortFee) +
    safeValue(ac.bookingFee) +
    safeValue(ac.otherCosts)
  );
}

function dailyCategorySubtotal(cat: State["dailySpending"][keyof State["dailySpending"]]): number {
  return safeValue(cat.dailyAmount) * safeValue(cat.days);
}

export function calculateDailySpendingSubtotal(dailySpending: State["dailySpending"]): number {
  const ds = dailySpending;
  return (
    dailyCategorySubtotal(ds.foodDrinks) +
    dailyCategorySubtotal(ds.localTransport) +
    dailyCategorySubtotal(ds.shopping) +
    dailyCategorySubtotal(ds.entertainment) +
    dailyCategorySubtotal(ds.miscellaneous)
  );
}

export function calculatePreparationSubtotal(preparationCosts: State["preparationCosts"]): number {
  const pc = preparationCosts;
  return (
    safeValue(pc.travelInsurance) +
    safeValue(pc.esimMobileData) +
    safeValue(pc.roaming) +
    safeValue(pc.vaccinations) +
    safeValue(pc.visaFees) +
    safeValue(pc.passportCosts) +
    safeValue(pc.otherCosts)
  );
}

export function calculateActivitiesSubtotal(activities: State["activities"]): number {
  return activities.reduce((sum, a) => sum + safeValue(a.cost) * safeValue(a.quantity), 0);
}

export function calculateSubtotalBeforeContingency(flights: number, accommodation: number, daily: number, prep: number, activities: number): number {
  return flights + accommodation + daily + prep + activities;
}

export function calculateContingencyAmount(subtotal: number, contingency: State["contingency"]): number {
  if (subtotal <= 0) return 0;
  const safeSubtotal = safeValue(subtotal);
  switch (contingency.mode) {
    case "none":
      return 0;
    case "pct-5":
      return safeSubtotal * 0.05;
    case "pct-10":
      return safeSubtotal * 0.10;
    case "pct-15":
      return safeSubtotal * 0.15;
    case "pct-custom":
      return safeSubtotal * (safeValue(contingency.customPercentage) / 100);
    case "fixed":
      return safeValue(contingency.customFixedAmount);
    default:
      return 0;
  }
}

// ── Derived metrics ──

function safePerDivisor(total: number, divisor: number): number | undefined {
  if (divisor <= 0 || !Number.isFinite(divisor)) return undefined;
  return total / divisor;
}

// ── State normalisation ──

/**
 * Normalise all date-derived fields in the state.
 *
 * - Accommodation nights: derived from trip dates unless manually overridden
 * - Daily spending days: ALL categories are set to tripDays UNCONDITIONALLY
 *   with daysManuallyOverridden=false (per-category day overrides are not
 *   exposed in the MVP UI and must not persist)
 * - Monetary amounts are never modified
 * - Unrelated state is never modified
 *
 * Safe to call on restored drafts, date changes, and initial defaults.
 */
export function normalizeDateDerivedFields(
  state: TripCostPlannerState,
  tripDays: number | undefined,
  tripNights: number | undefined
): TripCostPlannerState {
  const result = { ...state };

  // Accommodation nights — derive if not manually overridden
  if (!state.accommodationCosts.nightsManuallyOverridden && tripNights !== undefined) {
    result.accommodationCosts = {
      ...state.accommodationCosts,
      nights: tripNights,
    };
  }

  // Daily spending days — always sync all categories unconditionally
  const days = tripDays ?? 0;
  const categoryTemplate = { dailyAmount: 0, days, daysManuallyOverridden: false };
  result.dailySpending = {
    foodDrinks:       { ...categoryTemplate, dailyAmount: state.dailySpending.foodDrinks.dailyAmount },
    localTransport:   { ...categoryTemplate, dailyAmount: state.dailySpending.localTransport.dailyAmount },
    shopping:         { ...categoryTemplate, dailyAmount: state.dailySpending.shopping.dailyAmount },
    entertainment:    { ...categoryTemplate, dailyAmount: state.dailySpending.entertainment.dailyAmount },
    miscellaneous:    { ...categoryTemplate, dailyAmount: state.dailySpending.miscellaneous.dailyAmount },
  };

  return result;
}

// ── Full summary ──

type State = TripCostPlannerState;

export function calculateSummary(state: State): TripCostSummary {
  const flightsSubtotal = calculateFlightsSubtotal(state.flightCosts, state.travellers);
  const accommodationSubtotal = calculateAccommodationSubtotal(state.accommodationCosts);
  const dailySpendingSubtotal = calculateDailySpendingSubtotal(state.dailySpending);
  const preparationSubtotal = calculatePreparationSubtotal(state.preparationCosts);
  const activitiesSubtotal = calculateActivitiesSubtotal(state.activities);

  const subtotalBeforeContingency = calculateSubtotalBeforeContingency(
    flightsSubtotal, accommodationSubtotal, dailySpendingSubtotal,
    preparationSubtotal, activitiesSubtotal
  );
  const contingencyAmount = calculateContingencyAmount(subtotalBeforeContingency, state.contingency);
  const total = subtotalBeforeContingency + contingencyAmount;

  const totalTravellers = getTotalTravellers(state.travellers);
  const tripNights = calculateNights(state.tripDetails.departureDate, state.tripDetails.returnDate);
  const tripDays = tripNights !== undefined ? tripNights + 1 : undefined;

  return {
    flightsSubtotal,
    accommodationSubtotal,
    dailySpendingSubtotal,
    preparationSubtotal,
    activitiesSubtotal,
    subtotalBeforeContingency,
    contingencyAmount,
    total,
    totalTravellers,
    tripNights,
    tripDays,
    costPerTraveller: safePerDivisor(total, totalTravellers),
    costPerDay: tripDays !== undefined && tripDays > 0 ? safePerDivisor(total, tripDays) : undefined,
    costPerTravellerPerDay: tripDays !== undefined && tripDays > 0 && totalTravellers > 0
      ? safePerDivisor(total, tripDays * totalTravellers) : undefined,
  };
}
