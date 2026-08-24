/**
 * BF-FLIGHTS-LIVE-4 Phase C/G — server-side mirror of
 * src/types/liveFlights.ts. Deno edge functions in this repo do not import
 * from src/ (matching every other shared module, e.g. _shared/travelpayouts.ts
 * vs src/types/flight.ts), so this is a hand-kept duplicate, not an import.
 * Keep both files in sync when the contract changes.
 */

export type LiveFlightTripType = "round_trip" | "one_way";
export type LiveFlightCabinClass = "economy" | "premium_economy" | "business" | "first";
export type LiveFlightCategory = "best" | "other";

export interface LiveFlightAirport {
  code: string;
  name: string | null;
  time: string | null;
}

export interface LiveFlightSegment {
  airline: string | null;
  airlineLogoUrl: string | null;
  flightNumber: string | null;
  aircraft: string | null;
  travelClass: string | null;
  departureAirport: LiveFlightAirport;
  arrivalAirport: LiveFlightAirport;
  durationMinutes: number | null;
  overnight: boolean;
  operatingAirline: string | null;
}

export interface LiveFlightLayover {
  airportCode: string;
  airportName: string | null;
  durationMinutes: number | null;
  overnight: boolean;
}

export interface LiveFlightItinerary {
  id: string;
  providerResultId: string | null;
  category: LiveFlightCategory;
  price: number | null;
  currency: string;
  tripType: LiveFlightTripType;
  totalDurationMinutes: number | null;
  segments: LiveFlightSegment[];
  layovers: LiveFlightLayover[];
  stops: number;
  carbonEmissionsGrams: number | null;
  departureToken: string | null;
  bookingToken: string | null;
}

export type LiveFlightSearchStatus = "ok" | "no_results" | "unavailable";

export interface LiveFlightSearchResult {
  status: LiveFlightSearchStatus;
  itineraries: LiveFlightItinerary[];
  currency: string;
  searchedAt: string;
  errorMessage?: string;
}

export interface LiveFlightBookingOption {
  bookingProvider: string;
  price: number | null;
  currency: string;
  localPrice: number | null;
  localCurrency: string | null;
  baggagePolicyUrl: string | null;
  bookingRequest: {
    url: string | null;
    postData: string | null;
  } | null;
}

export interface LiveFlightBookingOptionsResult {
  status: "ok" | "unavailable";
  options: LiveFlightBookingOption[];
  errorMessage?: string;
}
