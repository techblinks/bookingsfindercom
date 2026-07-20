import type { TripCostPlannerState } from "./types";
import { DEFAULT_CURRENCY, DEFAULT_ACCOMMODATION_TYPE, DEFAULT_CONTINGENCY_MODE } from "./tripCostConfig";

/**
 * Default planner state — single source of truth.
 * All monetary fields start at 0.
 * Dates are empty — user must enter them.
 * Accommodation nights default to 7, not auto-derived until dates are set.
 */
export const DEFAULT_STATE: TripCostPlannerState = {
  tripDetails: {
    tripName: "",
    departureCountry: "",
    departureCity: "",
    destinationCountry: "",
    destinationCity: "",
    departureDate: "",
    returnDate: "",
    currency: DEFAULT_CURRENCY,
  },
  travellers: {
    adults: 1,
    children: 0,
    infants: 0,
  },
  flightCosts: {
    adultAirfare: 0,
    childAirfare: 0,
    infantAirfare: 0,
    checkedBaggage: 0,
    seatSelection: 0,
    airportParking: 0,
    departureTransfer: 0,
    arrivalTransfer: 0,
    otherFlightCosts: 0,
  },
  accommodationCosts: {
    type: DEFAULT_ACCOMMODATION_TYPE,
    costPerNight: 0,
    nights: 0,
    nightsManuallyOverridden: false,
    taxes: 0,
    cleaningFee: 0,
    resortFee: 0,
    bookingFee: 0,
    otherCosts: 0,
  },
  dailySpending: {
    foodDrinks: { dailyAmount: 0, days: 0, daysManuallyOverridden: false },
    localTransport: { dailyAmount: 0, days: 0, daysManuallyOverridden: false },
    shopping: { dailyAmount: 0, days: 0, daysManuallyOverridden: false },
    entertainment: { dailyAmount: 0, days: 0, daysManuallyOverridden: false },
    miscellaneous: { dailyAmount: 0, days: 0, daysManuallyOverridden: false },
  },
  preparationCosts: {
    travelInsurance: 0,
    esimMobileData: 0,
    roaming: 0,
    vaccinations: 0,
    visaFees: 0,
    passportCosts: 0,
    otherCosts: 0,
  },
  activities: [],
  contingency: {
    mode: DEFAULT_CONTINGENCY_MODE,
    customPercentage: 10,
    customFixedAmount: 0,
  },
};
