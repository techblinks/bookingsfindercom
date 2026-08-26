/**
 * Shared Travelpayouts API service
 * Centralizes all API calls to reduce duplication
 */

import { makeProviderMoney, normalizeCurrencyCode, type ProviderMoney } from "./money.ts"; // BF1-F

const TRAVELPAYOUTS_API = "https://api.travelpayouts.com";

export interface TravelpayoutsConfig {
  token: string;
  marker: string;
}

export interface FlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string | null;
  adults?: number;
  currency?: string;
}

export interface FlightResult {
  id: string;
  airline: string;
  airline_code: string;
  price: number;
  currency: string;
  duration_minutes: number;
  stops: number;
  segments: FlightSegment[];
  link: string;
  flight_number: string;
  /**
   * Provider-returned outbound departure timestamp for THIS cached result
   * (BF-0R-7 Phase D). Distinct from segments[0].depart_time, which is the
   * same value reused for display — this field exists specifically so
   * callers can run exact-date validation against the calendar date the
   * provider actually returned, independent of any display formatting.
   */
  provider_departure_at: string | null;
  /** Provider-returned return timestamp for this cached result, present only when the provider returned one. */
  provider_return_at: string | null;
  /**
   * Provider freshness metadata (BF-0R-7 Phase 1.1 item 4) — optional and
   * NEVER relied upon. prices_for_dates' documented contract does not
   * include found_at/expires_at in its normal response schema; this field
   * is mapped only if a future/undocumented provider response happens to
   * include one, and callers must not use its absence to mean anything
   * (and must not claim an exact observation age from its presence either
   * — the endpoint-level "found in roughly the last 48 hours" contract is
   * the only freshness claim this codebase makes; see "Recent fare found"
   * wording on FlightCard.tsx).
   */
  found_at?: string | null;
}

export interface FlightSegment {
  from: string;
  to: string;
  depart_time: string;
  arrive_time: string | null;
  airline: string;
  flight_number: string;
}

/**
 * Get flight prices for specific dates.
 *
 * BF-0R-7 Phase B/C correction: /aviasales/v3/prices_for_dates is
 * Travelpayouts' cached/search-history Data API — the cheapest fares found
 * by Aviasales users in roughly the previous 48 hours, not a live,
 * traveller-specific booking quote. Its documented request parameters are
 * `departure_at` / `return_at` (this function previously sent the legacy
 * `depart_date`/`return_date` names, which are not this endpoint's
 * contract and were likely simply ignored, defeating date filtering
 * entirely) and `one_way`, which this function now sends explicitly rather
 * than leaving to whatever the provider defaults to. The endpoint does not
 * document adults/children/infants or cabin class as request parameters,
 * so none are sent — sending them would imply a per-passenger, per-cabin
 * price this cached endpoint does not price.
 */
export async function getFlightPrices(
  params: FlightSearchParams,
  config: TravelpayoutsConfig
): Promise<{ flights: FlightResult[]; isComplete: boolean }> {
  const isRoundTrip = !!params.returnDate;

  const searchParams = new URLSearchParams({
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    departure_at: params.departureDate,
    one_way: isRoundTrip ? 'false' : 'true',
    currency: params.currency || 'AUD',
    token: config.token,
    marker: config.marker,
  });

  if (params.returnDate) {
    searchParams.append('return_at', params.returnDate);
  }

  // params.adults is accepted on FlightSearchParams for callers' own
  // bookkeeping (e.g. request logging) but is deliberately NOT forwarded
  // to prices_for_dates — this endpoint does not document supporting a
  // passenger count, and sending one would misrepresent a cached,
  // route-level price as priced for a specific traveller mix.

  const url = `${TRAVELPAYOUTS_API}/aviasales/v3/prices_for_dates?${searchParams.toString()}`;
  console.log(`Fetching flight prices: ${params.origin} -> ${params.destination}`);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new TravelpayoutsError(
      data.error || 'Failed to fetch flight prices',
      response.status
    );
  }

  const flights = (data.data || []).map((flight: any, index: number) => {
    // BF-0R-7 Phase 1.1 item 1: prices_for_dates' contract is
    //   departure_at  = outbound departure
    //   return_at     = RETURN-LEG DEPARTURE, not outbound arrival
    //   duration      = TOTAL round-trip duration (when return_at present)
    //   duration_to   = outbound-leg duration
    //   duration_back = return-leg duration
    // The previous mapper used `duration` unconditionally as
    // duration_minutes (silently treating total round-trip duration as
    // outbound-only for round-trip results) and mapped `return_at` into
    // segments[0].arrive_time (silently treating the RETURN departure as
    // the OUTBOUND arrival). Both were real, distinct provider quantities
    // conflated with the wrong field. Fixed below: outbound duration
    // prefers `duration_to`; `duration` is only ever used as a fallback
    // for a genuine one-way result, where it IS the (only) leg's duration;
    // for a round-trip result with no `duration_to`, duration_minutes is
    // left at 0 (unknown) rather than reusing the wrong total. arrive_time
    // is never set from return_at — the endpoint provides no outbound
    // arrival timestamp at all, so none is fabricated; return_at is kept
    // only as provider_return_at (return-leg departure provenance).
    const isRoundTripResult = !!flight.return_at;
    let outboundDurationMinutes = 0;
    if (typeof flight.duration_to === 'number') {
      outboundDurationMinutes = flight.duration_to;
    } else if (!isRoundTripResult && typeof flight.duration === 'number') {
      outboundDurationMinutes = flight.duration;
    }

    return {
      id: `${flight.origin}-${flight.destination}-${flight.departure_at}-${flight.airline}-${index}`,
      airline: flight.airline || 'Unknown',
      airline_code: flight.airline,
      price: flight.price,
      currency: params.currency || 'AUD',
      duration_minutes: outboundDurationMinutes,
      stops: flight.transfers || 0,
      segments: [
        {
          from: flight.origin || params.origin.toUpperCase(),
          to: flight.destination || params.destination.toUpperCase(),
          depart_time: flight.departure_at,
          // Never return_at — that is the return leg's departure, not this
          // outbound leg's arrival. The endpoint provides no outbound
          // arrival timestamp, so none is fabricated here.
          arrive_time: null,
          airline: flight.airline,
          flight_number: flight.flight_number,
        },
      ],
      link: flight.link,
      flight_number: flight.flight_number,
      provider_departure_at: flight.departure_at ?? null,
      provider_return_at: flight.return_at ?? null,
      // Not documented for this endpoint — mapped only if actually present.
      found_at: flight.found_at ?? null,
    };
  });

  return {
    flights,
    isComplete: true, // prices_for_dates returns complete results
  };
}

/**
 * Get the lowest price for a route (used by price alerts)
 */
export async function getLowestPrice(
  params: {
    origin: string;
    destination: string;
    departureDate: string;
    returnDate?: string | null;
    currency?: string;
  },
  config: TravelpayoutsConfig
): Promise<ProviderMoney | null> {
  try {
    const searchParams = new URLSearchParams({
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      departure_at: params.departureDate,
      one_way: params.returnDate ? 'false' : 'true',
      currency: params.currency || 'USD',
      token: config.token,
      marker: config.marker,
      sorting: 'price',
      limit: '1',
    });

    if (params.returnDate) {
      searchParams.append('return_at', params.returnDate);
    }

    const url = `${TRAVELPAYOUTS_API}/aviasales/v3/prices_for_dates?${searchParams.toString()}`;
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (data.data && data.data.length > 0) {
      // BF1-F: typed money result bound to the REQUESTED currency (no FX, no silent default).
      return makeProviderMoney(data.data[0].price, normalizeCurrencyCode(params.currency));
    }

    return null;
  } catch (error) {
    console.error("Error fetching lowest price:", error);
    return null;
  }
}

/**
 * Deduplicate flights by ID
 */
export function deduplicateFlights(flights: FlightResult[]): FlightResult[] {
  return Object.values(
    flights.reduce((acc: Record<string, FlightResult>, flight) => {
      acc[flight.id] = flight;
      return acc;
    }, {})
  );
}

/**
 * Custom error class for Travelpayouts API errors
 */
export class TravelpayoutsError extends Error {
  public statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'TravelpayoutsError';
    this.statusCode = statusCode;
  }
}

/**
 * Get config from environment variables
 */
export function getConfig(): TravelpayoutsConfig {
  const token = Deno.env.get('TRAVELPAYOUTS_API_KEY') || Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
  const marker = Deno.env.get('MARKER_ID') || '';

  if (!token) {
    throw new Error('TRAVELPAYOUTS_API_KEY not configured');
  }

  return { token, marker };
}
