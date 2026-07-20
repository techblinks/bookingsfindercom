import type {
  SupportedCurrency,
  TripCostPlannerState,
  ValidationError,
  ValidationResult,
} from "./types";
import { CURRENCY_MAP, MAX_TRAVELLERS, MAX_ACTIVITIES, MAX_TEXT_LENGTH, MAX_COST } from "./tripCostConfig";
import { isReturnAfterDeparture, isDepartureNotBeforeToday, getTotalTravellers } from "./tripCostCalculations";

// ── Helpers ──

function isFinitePositive(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function isWholeNumber(n: number): boolean {
  return Number.isInteger(n);
}

function isFiniteNonNegative(n: number): boolean {
  return typeof n === "number" && Number.isFinite(n) && n >= 0;
}

function err(field: string, code: string, message: string): ValidationError {
  return { field, code, message };
}

// ── Individual validators ──

export function validateCurrency(currency: string): ValidationResult {
  const errors: ValidationError[] = [];
  if (!CURRENCY_MAP[currency as SupportedCurrency]) {
    errors.push(err("tripDetails.currency", "unsupported_currency", "Select a supported currency (AUD, USD, NZD, GBP, EUR, CAD, JPY)"));
  }
  return { valid: errors.length === 0, errors };
}

export function validateTripDetails(tripDetails: TripCostPlannerState["tripDetails"]): ValidationResult {
  const errors: ValidationError[] = [];

  if (tripDetails.tripName.length > MAX_TEXT_LENGTH) {
    errors.push(err("tripDetails.tripName", "too_long", `Trip name must be ${MAX_TEXT_LENGTH} characters or fewer`));
  }
  if (tripDetails.departureCountry.length > MAX_TEXT_LENGTH) {
    errors.push(err("tripDetails.departureCountry", "too_long", `Departure country must be ${MAX_TEXT_LENGTH} characters or fewer`));
  }
  if (tripDetails.departureCity.length > MAX_TEXT_LENGTH) {
    errors.push(err("tripDetails.departureCity", "too_long", `Departure city must be ${MAX_TEXT_LENGTH} characters or fewer`));
  }
  if (tripDetails.destinationCountry.length > MAX_TEXT_LENGTH) {
    errors.push(err("tripDetails.destinationCountry", "too_long", `Destination country must be ${MAX_TEXT_LENGTH} characters or fewer`));
  }
  if (tripDetails.destinationCity.length > MAX_TEXT_LENGTH) {
    errors.push(err("tripDetails.destinationCity", "too_long", `Destination city must be ${MAX_TEXT_LENGTH} characters or fewer`));
  }

  // Departure before today
  if (tripDetails.departureDate && !isDepartureNotBeforeToday(tripDetails.departureDate)) {
    errors.push(err("tripDetails.departureDate", "departure_past", "Departure date cannot be in the past"));
  }

  // Date ordering (only when both are non-empty)
  if (tripDetails.departureDate && tripDetails.returnDate) {
    if (!isReturnAfterDeparture(tripDetails.departureDate, tripDetails.returnDate)) {
      errors.push(err("tripDetails.returnDate", "date_order", "Return date must be at or after departure date"));
    }
  }

  // Currency
  const currencyResult = validateCurrency(tripDetails.currency);
  errors.push(...currencyResult.errors);

  return { valid: errors.length === 0, errors };
}

export function validateTravellers(travellers: TripCostPlannerState["travellers"]): ValidationResult {
  const errors: ValidationError[] = [];

  for (const key of ["adults", "children", "infants"] as const) {
    const v = travellers[key];
    if (!isWholeNumber(v)) {
      errors.push(err(`travellers.${key}`, "not_whole", "Must be a whole number"));
    } else if (v < 0) {
      errors.push(err(`travellers.${key}`, "negative", "Must be 0 or more"));
    } else if (v > MAX_TRAVELLERS) {
      errors.push(err(`travellers.${key}`, "too_many", `Maximum ${MAX_TRAVELLERS} per group`));
    }
  }

  const total = getTotalTravellers(travellers);
  if (total === 0) {
    errors.push(err("travellers", "zero_total", "At least one traveller is required"));
  }
  if (total > MAX_TRAVELLERS) {
    errors.push(err("travellers", "total_limit", `Maximum ${MAX_TRAVELLERS} travellers total`));
  }

  return { valid: errors.length === 0, errors };
}

export function validateMonetaryValue(value: number, fieldPath: string): ValidationResult {
  const errors: ValidationError[] = [];
  if (value < 0) {
    errors.push(err(fieldPath, "negative", "Value cannot be negative"));
  } else if (!Number.isFinite(value)) {
    errors.push(err(fieldPath, "invalid", "Enter a valid amount"));
  } else if (value > MAX_COST) {
    errors.push(err(fieldPath, "too_high", `Maximum $${MAX_COST.toLocaleString()}`));
  }
  return { valid: errors.length === 0, errors };
}

export function validateAccommodationCosts(accommodationCosts: TripCostPlannerState["accommodationCosts"]): ValidationResult {
  const errors: ValidationError[] = [];

  if (!isFiniteNonNegative(accommodationCosts.nights) || !isWholeNumber(accommodationCosts.nights)) {
    errors.push(err("accommodationCosts.nights", "invalid_nights", "Must be a whole number of nights"));
  } else if (accommodationCosts.nights > 365) {
    errors.push(err("accommodationCosts.nights", "too_many_nights", "Maximum 365 nights"));
  }

  // Monetary fields
  for (const key of ["costPerNight", "taxes", "cleaningFee", "resortFee", "bookingFee", "otherCosts"] as const) {
    const result = validateMonetaryValue(accommodationCosts[key], `accommodationCosts.${key}`);
    errors.push(...result.errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateDailySpending(dailySpending: TripCostPlannerState["dailySpending"]): ValidationResult {
  const errors: ValidationError[] = [];

  for (const [catKey, cat] of Object.entries(dailySpending) as [string, TripCostPlannerState["dailySpending"][keyof TripCostPlannerState["dailySpending"]]][]) {
    // Days
    if (!isFiniteNonNegative(cat.days) || !isWholeNumber(cat.days)) {
      errors.push(err(`dailySpending.${catKey}.days`, "invalid_days", "Must be a whole number of days"));
    } else if (cat.days > 365) {
      errors.push(err(`dailySpending.${catKey}.days`, "too_many_days", "Maximum 365 days"));
    }

    // Amount
    const amountResult = validateMonetaryValue(cat.dailyAmount, `dailySpending.${catKey}.dailyAmount`);
    errors.push(...amountResult.errors);
  }

  return { valid: errors.length === 0, errors };
}

export function validateFlightCosts(flightCosts: TripCostPlannerState["flightCosts"]): ValidationResult {
  const errors: ValidationError[] = [];
  for (const key of [
    "adultAirfare", "childAirfare", "infantAirfare",
    "checkedBaggage", "seatSelection", "airportParking",
    "departureTransfer", "arrivalTransfer", "otherFlightCosts",
  ] as const) {
    const result = validateMonetaryValue(flightCosts[key], `flightCosts.${key}`);
    errors.push(...result.errors);
  }
  return { valid: errors.length === 0, errors };
}

export function validatePreparationCosts(preparationCosts: TripCostPlannerState["preparationCosts"]): ValidationResult {
  const errors: ValidationError[] = [];
  for (const key of [
    "travelInsurance", "esimMobileData", "roaming",
    "vaccinations", "visaFees", "passportCosts", "otherCosts",
  ] as const) {
    const result = validateMonetaryValue(preparationCosts[key], `preparationCosts.${key}`);
    errors.push(...result.errors);
  }
  return { valid: errors.length === 0, errors };
}

export function validateActivities(activities: TripCostPlannerState["activities"]): ValidationResult {
  const errors: ValidationError[] = [];

  if (activities.length > MAX_ACTIVITIES) {
    errors.push(err("activities", "too_many", `Maximum ${MAX_ACTIVITIES} activities`));
  }

  for (let i = 0; i < activities.length; i++) {
    const a = activities[i];
    const prefix = `activities[${i}]`;

    if (a.name.length > MAX_TEXT_LENGTH) {
      errors.push(err(`${prefix}.name`, "too_long", `Activity name must be ${MAX_TEXT_LENGTH} characters or fewer`));
    }
    if (!isFinitePositive(a.cost)) {
      errors.push(err(`${prefix}.cost`, "invalid_cost", "Enter a valid amount"));
    }
    if (!isWholeNumber(a.quantity) || a.quantity <= 0) {
      errors.push(err(`${prefix}.quantity`, "invalid_quantity", "Quantity must be a positive whole number"));
    }

    // Activity name required when cost > 0
    if (a.cost > 0 && a.name.trim().length === 0) {
      errors.push(err(`${prefix}.name`, "name_required", "Activity name is required when a cost is entered"));
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateContingency(contingency: TripCostPlannerState["contingency"]): ValidationResult {
  const errors: ValidationError[] = [];

  if (contingency.mode === "pct-custom") {
    const pct = contingency.customPercentage;
    if (!isFiniteNonNegative(pct) || pct < 0 || pct > 100) {
      errors.push(err("contingency.customPercentage", "invalid_pct", "Enter a percentage between 0 and 100"));
    }
  }
  if (contingency.mode === "fixed") {
    const result = validateMonetaryValue(contingency.customFixedAmount, "contingency.customFixedAmount");
    errors.push(...result.errors);
  }

  return { valid: errors.length === 0, errors };
}

// ── Composite validator ──

export function validatePlannerState(state: TripCostPlannerState): ValidationResult {
  const all: ValidationError[] = [];

  all.push(...validateTripDetails(state.tripDetails).errors);
  all.push(...validateTravellers(state.travellers).errors);
  all.push(...validateFlightCosts(state.flightCosts).errors);
  all.push(...validateAccommodationCosts(state.accommodationCosts).errors);
  all.push(...validateDailySpending(state.dailySpending).errors);
  all.push(...validatePreparationCosts(state.preparationCosts).errors);
  all.push(...validateActivities(state.activities).errors);
  all.push(...validateContingency(state.contingency).errors);

  return { valid: all.length === 0, errors: all };
}
