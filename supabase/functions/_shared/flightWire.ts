/**
 * Frozen wire serializers for the flight Edge Function HTTP contracts (BF1-E).
 *
 * These functions map normalized BookingsFinder domain objects
 * (_shared/flightProvider.ts) back into the EXACT JSON shapes the Edge
 * Functions emitted before the FlightProvider abstraction existed. They are
 * the single auditable definition of each public contract; the Edge Functions
 * themselves stay thin HTTP shells, and the golden contract tests run THESE
 * serializers, so what is tested is what ships.
 *
 * Byte-parity rules preserved from pre-BF1-E output:
 *  - `airline_code` / segment-level `airline` / `flight_number` keys are
 *    omitted (undefined) exactly when the provider did not state a value —
 *    JSON.stringify drops undefined keys, as before.
 *  - top-level `airline` falls back to "Unknown" (search results) or ""
 *    (special offers), as before.
 *  - `found_at` is always present in search results (null when unstated) and
 *    always present in special offers (null since BF1-E removed the
 *    timestamp fabrication).
 */

import type {
  FlightOffer,
  FlightSearchResult,
  PriceCalendarEntry,
  RouteSuggestion,
  SpecialOffer,
} from "./flightProvider.ts";

/** Wire shape of one search-flights result row. */
export interface WireFlightResult {
  id: string;
  airline: string;
  airline_code?: string;
  price: number;
  currency: string;
  duration_minutes: number;
  stops: number;
  segments: Array<{
    from: string;
    to: string;
    depart_time: string | null;
    arrive_time: string | null;
    airline?: string;
    flight_number?: string;
  }>;
  link: string;
  flight_number?: string;
  provider_departure_at: string | null;
  provider_return_at: string | null;
  found_at: string | null;
}

export function toWireFlightResult(offer: FlightOffer): WireFlightResult {
  return {
    id: offer.id,
    airline: offer.carrierCode ?? "Unknown",
    // undefined (key omitted) when the provider stated no carrier code.
    ...(offer.carrierCode !== null ? { airline_code: offer.carrierCode } : {}),
    price: offer.priceMajor,
    currency: offer.currency,
    duration_minutes: offer.durationMinutes,
    stops: offer.stops,
    segments: offer.segments.map((seg) => ({
      from: seg.from,
      to: seg.to,
      depart_time: seg.departAt,
      arrive_time: seg.arriveAt,
      ...(seg.carrierCode !== null ? { airline: seg.carrierCode } : {}),
      ...(seg.flightNumber !== null ? { flight_number: seg.flightNumber } : {}),
    })),
    link: offer.deepLink,
    ...(offer.flightNumber !== null ? { flight_number: offer.flightNumber } : {}),
    provider_departure_at: offer.departureAt,
    provider_return_at: offer.returnAt,
    found_at: offer.observedAt,
  };
}

export function toWireFlightSearchResponse(result: FlightSearchResult): {
  flights: WireFlightResult[];
  meta: { total_found: number; is_complete: boolean };
} {
  return {
    flights: result.offers.map(toWireFlightResult),
    meta: {
      total_found: result.totalFound,
      is_complete: result.isComplete,
    },
  };
}

export function toWireCalendarPrice(entry: PriceCalendarEntry): {
  date: string | null;
  price: number | null;
  returnDate: string | null;
  airline: string | null;
  stops: number;
  tripDuration: number | null;
} {
  return {
    date: entry.date,
    price: entry.priceMajor,
    returnDate: entry.returnDate,
    airline: entry.gateLabel,
    stops: entry.stops,
    tripDuration: entry.tripDuration,
  };
}

export function toWireRouteSuggestion(suggestion: RouteSuggestion): {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  price: number | null;
  airline: string | null;
  departureDate: string | null;
  returnDate: string | null;
  stops: number;
  flightNumber: string | null;
  expiresAt: string | null;
} {
  return {
    origin: suggestion.origin,
    originName: suggestion.originName,
    destination: suggestion.destination,
    destinationName: suggestion.destinationName,
    price: suggestion.priceMajor,
    airline: suggestion.airlineCode,
    departureDate: suggestion.departureAt,
    returnDate: suggestion.returnAt,
    stops: suggestion.stops,
    flightNumber: suggestion.flightNumber,
    expiresAt: suggestion.expiresAt,
  };
}

export function toWireSpecialOffer(offer: SpecialOffer): {
  id: string;
  origin: string;
  destination: string;
  price: number;
  airline: string;
  departure_date: string | null;
  return_date: string | null;
  stops: number;
  found_at: string | null;
  flight_number: string | null;
  duration_minutes: number;
  link: string;
} {
  return {
    id: offer.id,
    origin: offer.origin,
    destination: offer.destination,
    price: offer.priceMajor,
    airline: offer.carrierCode ?? "",
    departure_date: offer.departureDate,
    return_date: offer.returnDate,
    stops: offer.stops,
    found_at: offer.observedAt,
    flight_number: offer.flightNumber,
    duration_minutes: offer.durationMinutes,
    link: offer.deepLink,
  };
}
