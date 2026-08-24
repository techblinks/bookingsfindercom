/**
 * BF-FLIGHTS-LIVE-4 Phase D/G — SerpApi Google Flights client + normalizer.
 *
 * This is the ONLY module that knows SerpApi's request/response shape.
 * search-live-flights/index.ts and get-live-flight-booking-options/index.ts
 * both call through here and only ever handle the BookingsFinder-owned
 * types in liveFlightTypes.ts — swapping providers later means replacing
 * this file, not the edge functions' request handling or the frontend.
 *
 * SERPAPI_API_KEY is read once via getSerpApiConfig() and is never logged,
 * never included in any thrown error message, and never present in any
 * value returned to a caller — see redactedUrl() below, used for the only
 * logging this module does.
 */

import type {
  LiveFlightBookingOption,
  LiveFlightBookingOptionsResult,
  LiveFlightCabinClass,
  LiveFlightItinerary,
  LiveFlightLayover,
  LiveFlightSearchResult,
  LiveFlightSegment,
  LiveFlightTripType,
} from "./liveFlightTypes.ts";

const SERPAPI_ENDPOINT = "https://serpapi.com/search";

/** Bounded upstream timeout (Phase T) — the browser request must never hang indefinitely on a slow/unresponsive upstream. */
export const SERPAPI_TIMEOUT_MS = 20_000;

const TRAVEL_CLASS_MAP: Record<LiveFlightCabinClass, number> = {
  economy: 1,
  premium_economy: 2,
  business: 3,
  first: 4,
};

export interface SerpApiConfig {
  apiKey: string;
}

export function getSerpApiConfig(): SerpApiConfig {
  const apiKey = Deno.env.get("SERPAPI_API_KEY");
  if (!apiKey) {
    // Fail closed. The caller (index.ts) maps this to a truthful
    // "temporarily unavailable" response — never a fabricated empty result.
    throw new SerpApiError("SERPAPI_API_KEY not configured", 0, "config");
  }
  return { apiKey };
}

export class SerpApiError extends Error {
  public statusCode: number;
  public kind: "config" | "timeout" | "upstream" | "network";

  constructor(message: string, statusCode: number, kind: SerpApiError["kind"]) {
    super(message);
    this.name = "SerpApiError";
    this.statusCode = statusCode;
    this.kind = kind;
  }
}

export interface SerpApiFlightSearchInput {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  tripType: LiveFlightTripType;
  adults: number;
  children: number;
  infants: number;
  cabinClass: LiveFlightCabinClass;
  currency: string;
  /** Round-trip step 2 only (Phase H). */
  departureToken?: string;
}

function buildSearchParams(input: SerpApiFlightSearchInput, apiKey: string): URLSearchParams {
  const params = new URLSearchParams({
    engine: "google_flights",
    departure_id: input.origin,
    arrival_id: input.destination,
    outbound_date: input.departureDate,
    type: input.tripType === "round_trip" ? "1" : "2",
    travel_class: String(TRAVEL_CLASS_MAP[input.cabinClass]),
    adults: String(input.adults),
    currency: input.currency,
    hl: "en",
    // gl (country) deliberately omitted — BookingsFinder has no reliable
    // per-visitor country signal to map here (currency is not country;
    // e.g. EUR spans many). Left to SerpApi's own default rather than
    // guessed.
    deep_search: "false",
    api_key: apiKey,
  });

  if (input.tripType === "round_trip" && input.returnDate) {
    params.set("return_date", input.returnDate);
  }
  if (input.children > 0) {
    params.set("children", String(input.children));
  }
  if (input.infants > 0) {
    // SerpApi documents infants_in_seat and infants_on_lap as distinct
    // params. BookingsFinder's search form only collects a single combined
    // infant count (Phase E scope), so every infant is sent as
    // infants_on_lap — the documented default assumption for a lap infant —
    // until seating choice becomes its own search field.
    params.set("infants_on_lap", String(input.infants));
  }
  if (input.departureToken) {
    params.set("departure_token", input.departureToken);
  }

  return params;
}

/** Safe to log: strips api_key before the URL is ever written anywhere. */
function redactedUrl(params: URLSearchParams): string {
  const redacted = new URLSearchParams(params);
  redacted.set("api_key", "***");
  return `${SERPAPI_ENDPOINT}?${redacted.toString()}`;
}

async function fetchSerpApi(params: URLSearchParams): Promise<unknown> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SERPAPI_TIMEOUT_MS);

  try {
    console.log(`SerpApi request: ${redactedUrl(params)}`);
    const response = await fetch(`${SERPAPI_ENDPOINT}?${params.toString()}`, {
      signal: controller.signal,
    });

    let body: unknown;
    try {
      body = await response.json();
    } catch {
      body = null;
    }

    if (!response.ok) {
      const message =
        body && typeof body === "object" && "error" in body && typeof (body as any).error === "string"
          ? (body as any).error
          : `SerpApi request failed (${response.status})`;
      throw new SerpApiError(message, response.status, "upstream");
    }

    return body;
  } catch (error) {
    if (error instanceof SerpApiError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new SerpApiError("SerpApi request timed out", 504, "timeout");
    }
    throw new SerpApiError(
      error instanceof Error ? error.message : "SerpApi network error",
      502,
      "network",
    );
  } finally {
    clearTimeout(timeout);
  }
}

// ── Response normalization (Phase G) ──

function toMinutes(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function extractOperatingAirline(extensions: unknown): string | null {
  if (!Array.isArray(extensions)) return null;
  for (const item of extensions) {
    if (typeof item !== "string") continue;
    const match = item.match(/^Operated by (.+)$/i);
    if (match) return match[1].trim();
  }
  return null;
}

function normalizeSegment(raw: any): LiveFlightSegment {
  return {
    airline: raw?.airline ?? null,
    airlineLogoUrl: raw?.airline_logo ?? null,
    flightNumber: raw?.flight_number ?? null,
    aircraft: raw?.airplane ?? null,
    travelClass: raw?.travel_class ?? null,
    departureAirport: {
      code: raw?.departure_airport?.id ?? "",
      name: raw?.departure_airport?.name ?? null,
      time: raw?.departure_airport?.time ?? null,
    },
    arrivalAirport: {
      code: raw?.arrival_airport?.id ?? "",
      name: raw?.arrival_airport?.name ?? null,
      time: raw?.arrival_airport?.time ?? null,
    },
    durationMinutes: toMinutes(raw?.duration),
    overnight: raw?.overnight === true,
    operatingAirline: extractOperatingAirline(raw?.extensions),
  };
}

function normalizeLayover(raw: any): LiveFlightLayover {
  return {
    airportCode: raw?.id ?? "",
    airportName: raw?.name ?? null,
    durationMinutes: toMinutes(raw?.duration),
    overnight: raw?.overnight === true,
  };
}

function normalizeItinerary(
  raw: any,
  category: "best" | "other",
  currency: string,
  tripType: LiveFlightTripType,
  index: number,
): LiveFlightItinerary {
  const segments = Array.isArray(raw?.flights) ? raw.flights.map(normalizeSegment) : [];
  const layovers = Array.isArray(raw?.layovers) ? raw.layovers.map(normalizeLayover) : [];
  const firstSegment = segments[0];

  const idParts = [
    raw?.departure_token ?? raw?.booking_token ?? "",
    firstSegment?.flightNumber ?? "",
    firstSegment?.departureAirport.time ?? "",
    String(raw?.price ?? ""),
    String(index),
  ];

  return {
    id: idParts.join("-"),
    providerResultId: raw?.departure_token ?? raw?.booking_token ?? null,
    category,
    price: typeof raw?.price === "number" ? raw.price : null,
    currency,
    tripType,
    totalDurationMinutes: toMinutes(raw?.total_duration),
    segments,
    layovers,
    stops: Math.max(segments.length - 1, 0),
    carbonEmissionsGrams:
      typeof raw?.carbon_emissions?.this_flight === "number" ? raw.carbon_emissions.this_flight : null,
    departureToken: raw?.departure_token ?? null,
    bookingToken: raw?.booking_token ?? null,
  };
}

function normalizeSearchResponse(
  data: any,
  currency: string,
  tripType: LiveFlightTripType,
): LiveFlightSearchResult {
  const best = Array.isArray(data?.best_flights) ? data.best_flights : [];
  const other = Array.isArray(data?.other_flights) ? data.other_flights : [];

  const itineraries: LiveFlightItinerary[] = [
    ...best.map((f: any, i: number) => normalizeItinerary(f, "best", currency, tripType, i)),
    ...other.map((f: any, i: number) => normalizeItinerary(f, "other", currency, tripType, best.length + i)),
  ];

  return {
    status: itineraries.length > 0 ? "ok" : "no_results",
    itineraries,
    currency,
    searchedAt: new Date().toISOString(),
  };
}

export async function searchFlights(input: SerpApiFlightSearchInput, config: SerpApiConfig): Promise<LiveFlightSearchResult> {
  const params = buildSearchParams(input, config.apiKey);
  const data = await fetchSerpApi(params);
  return normalizeSearchResponse(data, input.currency, input.tripType);
}

// ── Booking options (Phase J) ──

export interface SerpApiBookingOptionsInput extends SerpApiFlightSearchInput {
  bookingToken: string;
}

function normalizeBookingOption(raw: any, currency: string): LiveFlightBookingOption | null {
  const src = raw?.together ?? raw?.departing ?? raw?.returning;
  if (!src) return null;

  const localEntry = Array.isArray(src.local_prices) ? src.local_prices[0] : null;

  return {
    bookingProvider: src.book_with ?? "Unknown",
    price: typeof src.price === "number" ? src.price : null,
    currency,
    localPrice: typeof localEntry?.price === "number" ? localEntry.price : null,
    localCurrency: typeof localEntry?.currency === "string" ? localEntry.currency : null,
    // SerpApi does not document a baggage policy URL field on booking
    // options (only free-text baggage_prices) — never fabricated.
    baggagePolicyUrl: null,
    bookingRequest: src.booking_request
      ? {
          url: typeof src.booking_request.url === "string" ? src.booking_request.url : null,
          postData: typeof src.booking_request.post_data === "string" ? src.booking_request.post_data : null,
        }
      : null,
  };
}

export async function getBookingOptions(
  input: SerpApiBookingOptionsInput,
  config: SerpApiConfig,
): Promise<LiveFlightBookingOptionsResult> {
  const params = buildSearchParams(input, config.apiKey);
  params.set("booking_token", input.bookingToken);

  const data = await fetchSerpApi(params);
  const rawOptions = Array.isArray((data as any)?.booking_options) ? (data as any).booking_options : [];

  const options = rawOptions
    .map((raw: any) => normalizeBookingOption(raw, input.currency))
    .filter((opt: LiveFlightBookingOption | null): opt is LiveFlightBookingOption => opt !== null);

  return { status: "ok", options };
}
