// ── Types ──
export type {
  SupportedCurrency,
  AccommodationType,
  ContingencyMode,
  TripDetails,
  Travellers,
  FlightCosts,
  AccommodationCosts,
  DailySpendingCategory,
  DailySpending,
  PreparationCosts,
  ActivityItem,
  ContingencyConfig,
  TripCostPlannerState,
  TripCostSummary,
  ValidationError,
  ValidationResult,
  StoredTripCostDraft,
} from "./types";

// ── Config ──
export {
  SUPPORTED_CURRENCIES,
  CURRENCY_MAP,
  DEFAULT_CURRENCY,
  ACCOMMODATION_TYPES,
  DEFAULT_ACCOMMODATION_TYPE,
  CONTINGENCY_MODES,
  DEFAULT_CONTINGENCY_MODE,
  MAX_TRAVELLERS,
  MAX_ACTIVITIES,
  MAX_TEXT_LENGTH,
  MAX_COST,
} from "./tripCostConfig";
export type { CurrencyMeta, ContingencyModeMeta } from "./tripCostConfig";

// ── Defaults ──
export { DEFAULT_STATE } from "./tripCostDefaults";

// ── Calculations ──
export {
  calculateNights,
  calculateDays,
  getTotalTravellers,
  calculateFlightsSubtotal,
  calculateAccommodationSubtotal,
  calculateDailySpendingSubtotal,
  calculatePreparationSubtotal,
  calculateActivitiesSubtotal,
  calculateSubtotalBeforeContingency,
  calculateContingencyAmount,
  calculateSummary,
  isReturnAfterDeparture,
  isDepartureNotBeforeToday,
  deriveNights,
} from "./tripCostCalculations";

// ── Formatting ──
export { formatCurrency, formatCurrencyCompact } from "./tripCostFormatting";

// ── Validation ──
export {
  validateCurrency,
  validateTripDetails,
  validateTravellers,
  validateMonetaryValue,
  validateFlightCosts,
  validateAccommodationCosts,
  validateDailySpending,
  validatePreparationCosts,
  validateActivities,
  validateContingency,
  validatePlannerState,
} from "./tripCostValidation";

// ── Storage ──
export { saveDraft, loadDraft, clearDraft, isStoredDraft, isValidTripCostState } from "./tripCostStorage";

// ── React components & hooks ──
export { TripCostPlanner } from "./TripCostPlanner";
export { TripDetailsSection } from "./TripDetailsSection";
export { TravellersSection } from "./TravellersSection";
export { TripCostSummaryPanel } from "./TripCostSummary";
export { TripCostSectionCard } from "./TripCostSectionCard";
export { useTripCostPlanner } from "./useTripCostPlanner";
export type { TripCostPlannerAPI } from "./useTripCostPlanner";
