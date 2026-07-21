// ── Trip Budget Planner — Core Types ──

/** Supported currencies for the Trip Budget Planner. */
export type SupportedCurrency = "AUD" | "USD" | "NZD" | "GBP" | "EUR" | "CAD" | "JPY";

/** Accommodation type options. */
export type AccommodationType = "hotel" | "apartment" | "hostel" | "resort" | "holiday-rental" | "family-friends" | "other";

/** Contingency mode. */
export type ContingencyMode = "none" | "pct-5" | "pct-10" | "pct-15" | "pct-custom" | "fixed";

// ── State interfaces ──

export interface TripDetails {
  tripName: string;
  departureCountry: string;
  departureCity: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;   // "YYYY-MM-DD" or ""
  returnDate: string;      // "YYYY-MM-DD" or ""
  currency: SupportedCurrency;
}

export interface Travellers {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightCosts {
  adultAirfare: number;
  childAirfare: number;
  infantAirfare: number;
  checkedBaggage: number;
  seatSelection: number;
  airportParking: number;
  departureTransfer: number;
  arrivalTransfer: number;
  otherFlightCosts: number;
}

export interface AccommodationCosts {
  type: AccommodationType;
  costPerNight: number;
  nights: number;
  /** Whether the user has manually edited the nights field. */
  nightsManuallyOverridden: boolean;
  taxes: number;
  cleaningFee: number;
  resortFee: number;
  bookingFee: number;
  otherCosts: number;
}

export interface DailySpendingCategory {
  dailyAmount: number;
  days: number;
  daysManuallyOverridden: boolean;
}

export interface DailySpending {
  foodDrinks: DailySpendingCategory;
  localTransport: DailySpendingCategory;
  shopping: DailySpendingCategory;
  entertainment: DailySpendingCategory;
  miscellaneous: DailySpendingCategory;
}

export interface PreparationCosts {
  travelInsurance: number;
  esimMobileData: number;
  roaming: number;
  vaccinations: number;
  visaFees: number;
  passportCosts: number;
  otherCosts: number;
}

export interface ActivityItem {
  id: string;
  name: string;
  cost: number;
  quantity: number;
}

export interface ContingencyConfig {
  mode: ContingencyMode;
  customPercentage: number;
  customFixedAmount: number;
}

/** Complete planner state — serialisable and suitable for localStorage. */
export interface TripCostPlannerState {
  tripDetails: TripDetails;
  travellers: Travellers;
  flightCosts: FlightCosts;
  accommodationCosts: AccommodationCosts;
  dailySpending: DailySpending;
  preparationCosts: PreparationCosts;
  activities: ActivityItem[];
  contingency: ContingencyConfig;
}

// ── Derived summary ──

export interface TripCostSummary {
  flightsSubtotal: number;
  accommodationSubtotal: number;
  dailySpendingSubtotal: number;
  preparationSubtotal: number;
  activitiesSubtotal: number;
  subtotalBeforeContingency: number;
  contingencyAmount: number;
  total: number;
  totalTravellers: number;
  tripNights: number | undefined;
  tripDays: number | undefined;
  costPerTraveller: number | undefined;
  costPerDay: number | undefined;
  costPerTravellerPerDay: number | undefined;
}

// ── Validation ──

export interface ValidationError {
  field: string;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ── Storage ──

export interface StoredTripCostDraft {
  version: 1;
  savedAt: string;          // ISO 8601
  state: TripCostPlannerState;
}
