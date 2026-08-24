/**
 * BF-FLIGHTS-LIVE-4 Phase C — provider-neutral live flight search contract.
 *
 * These types describe what the FlightResults page consumes. They are
 * BookingsFinder-owned, not shaped after any single upstream provider's
 * response — the current server-side implementation normalizes SerpApi's
 * Google Flights response into this shape (see
 * supabase/functions/_shared/serpapiFlights.ts), but nothing in this file or
 * in the UI components that consume it references SerpApi. A future provider
 * swap (KAYAK, Skyscanner, etc.) only has to produce this same shape server
 * side; the frontend does not change.
 *
 * Deliberately duplicated (not imported) into
 * supabase/functions/_shared/liveFlightTypes.ts — Deno edge functions in
 * this repo do not import from src/, matching every other shared module
 * (see _shared/travelpayouts.ts vs src/types/flight.ts). Keep both in sync
 * by hand.
 */

export type LiveFlightTripType = "round_trip" | "one_way";

/** Full SerpApi-documented cabin range. BookingsFinder's search form
 * currently only ever produces "economy" or "business" (see
 * src/lib/cabinClasses.ts) — premium_economy/first are supported here for
 * forward compatibility with a future cabinClasses.ts expansion, not
 * because they are reachable from the search form today. */
export type LiveFlightCabinClass = "economy" | "premium_economy" | "business" | "first";

export type LiveFlightCategory = "best" | "other";

export interface LiveFlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  /** Round-trip only. Absent/ignored for one-way. */
  returnDate?: string;
  tripType: LiveFlightTripType;
  adults: number;
  children: number;
  infants: number;
  cabinClass: LiveFlightCabinClass;
  currency: string;
  /**
   * Round-trip step 2 only: the departure_token from a previously selected
   * outbound itinerary, used to fetch matching return-flight options. When
   * present, departureDate/returnDate/tripType still describe the original
   * search — the server re-derives the return-leg request from the token,
   * per SerpApi's documented round-trip flow (Phase H).
   */
  departureToken?: string;
}

export interface LiveFlightAirport {
  code: string;
  name: string | null;
  /** Provider-supplied local time string, exactly as returned. Never reformatted into a fabricated timezone. */
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
  /** Set only when the provider indicates a different operating carrier than the marketing airline. */
  operatingAirline: string | null;
}

export interface LiveFlightLayover {
  airportCode: string;
  airportName: string | null;
  durationMinutes: number | null;
  overnight: boolean;
}

export interface LiveFlightItinerary {
  /** Stable local id derived from provider fields — safe to use as a React key and for tracking. */
  id: string;
  /** Raw provider identifier when one exists, kept for support/debugging. Never displayed. */
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
  /** Present on round-trip OUTBOUND results only — pass back to request return options (Phase H). */
  departureToken: string | null;
  /** Present once an itinerary is fully selectable (one-way results, or round-trip return results) — enables "See booking options" (Phase J). */
  bookingToken: string | null;
}

export type LiveFlightSearchStatus = "ok" | "no_results" | "unavailable";

export interface LiveFlightSearchResult {
  status: LiveFlightSearchStatus;
  itineraries: LiveFlightItinerary[];
  currency: string;
  searchedAt: string;
  /**
   * "unavailable" only — a safe, generic, pre-approved message. Never the
   * raw upstream error text (which could leak provider/account details).
   */
  errorMessage?: string;
}

export interface LiveFlightBookingOption {
  bookingProvider: string;
  price: number | null;
  currency: string;
  localPrice: number | null;
  localCurrency: string | null;
  baggagePolicyUrl: string | null;
  /**
   * Opaque booking handoff, passed through verbatim from SerpApi — never
   * decoded, parsed, or re-encoded anywhere server- or client-side (see
   * supabase/functions/_shared/serpapiFlights.ts and
   * src/lib/liveFlightBookingRedirect.ts).
   *
   * Round 2 correction: `url` is virtually always Google's own booking
   * click-resolver endpoint (documented shape: host www.google.com, path
   * prefix /travel/clk/) when `postData` is present — NOT an arbitrary
   * airline/OTA domain. A resolver (postData-bearing) handoff has no
   * verified-safe completion path yet and fails closed (see
   * classifyBookingHandoff) — only a postData-absent direct GET deeplink
   * (which CAN legitimately be any airline/OTA) is currently completable,
   * via src/pages/LiveFlightBookingRedirect.tsx.
   */
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
