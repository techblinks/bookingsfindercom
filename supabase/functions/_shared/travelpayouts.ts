/**
 * Shared Travelpayouts API service
 * Centralizes all API calls to reduce duplication
 */

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
 * Get flight prices for specific dates
 */
export async function getFlightPrices(
  params: FlightSearchParams,
  config: TravelpayoutsConfig
): Promise<{ flights: FlightResult[]; isComplete: boolean }> {
  const searchParams = new URLSearchParams({
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    depart_date: params.departureDate,
    currency: params.currency || 'AUD',
    token: config.token,
    marker: config.marker,
  });

  if (params.returnDate) {
    searchParams.append('return_date', params.returnDate);
  }

  if (params.adults) {
    searchParams.append('adults', params.adults.toString());
  }

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

  const flights = (data.data || []).map((flight: any, index: number) => ({
    id: `${flight.origin}-${flight.destination}-${flight.departure_at}-${flight.airline}-${index}`,
    airline: flight.airline || 'Unknown',
    airline_code: flight.airline,
    price: flight.price,
    currency: params.currency || 'AUD',
    duration_minutes: flight.duration || 0,
    stops: flight.transfers || 0,
    segments: [
      {
        from: flight.origin || params.origin.toUpperCase(),
        to: flight.destination || params.destination.toUpperCase(),
        depart_time: flight.departure_at,
        arrive_time: flight.return_at || null,
        airline: flight.airline,
        flight_number: flight.flight_number,
      },
    ],
    link: flight.link,
    flight_number: flight.flight_number,
  }));

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
  },
  config: TravelpayoutsConfig
): Promise<number | null> {
  try {
    const searchParams = new URLSearchParams({
      origin: params.origin.toUpperCase(),
      destination: params.destination.toUpperCase(),
      departure_at: params.departureDate,
      one_way: params.returnDate ? 'false' : 'true',
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
      return data.data[0].price;
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
