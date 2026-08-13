// Flight data types matching backend contract

export type FlightWarning = 'long_layover' | 'overnight_stop' | 'self_transfer' | 'airport_change';
export type PriceConfidence = 'low' | 'average' | 'high';

export interface FlightSegment {
  from: string;
  to: string;
  depart_time: string;
  arrive_time: string;
  airline: string;
  airline_code?: string;
  flight_number?: string;
  aircraft?: string;
  duration_minutes?: number;
  layover_minutes?: number;
}

export interface Flight {
  id: string;
  airline: string;
  airline_code: string;
  price: number;
  currency: string;
  duration_minutes: number;
  stops: number;
  segments: FlightSegment[];
  layover_cities?: string[];
  baggage_included?: boolean;
  cabin_class?: string;
  link?: string;
  is_deal?: boolean;
  // Smart enhancements
  deal_score?: number; // 0-100
  price_confidence?: PriceConfidence;
  price_trend?: 'rising' | 'stable' | 'falling';
  warnings?: FlightWarning[];
  average_price?: number;
  nearby_airport_savings?: {
    airport: string;
    airport_name: string;
    savings: number;
  };
}

export interface FlightSearchMeta {
  total_found: number;
  is_complete: boolean;
  search_id?: string;
  cheapest_price?: number;
  fastest_duration?: number;
}

export interface FlightSearchResponse {
  flights: Flight[];
  meta: FlightSearchMeta;
}

export interface AirlineInfo {
  code: string;
  name: string;
  count: number;
}

export interface FilterState {
  priceRange: [number, number];
  maxPrice: number;
  minPrice: number;
  selectedAirlines: string[];
  selectedStops: number[];
  selectedDepartureTimes: string[];
  durationRange: [number, number];
  maxDuration: number;
}

export type SortOption = "best" | "cheapest" | "fastest";

export const DEPARTURE_TIME_SLOTS = [
  { id: "early-morning", label: "Early Morning", time: "12am - 6am", startHour: 0, endHour: 6 },
  { id: "morning", label: "Morning", time: "6am - 12pm", startHour: 6, endHour: 12 },
  { id: "afternoon", label: "Afternoon", time: "12pm - 6pm", startHour: 12, endHour: 18 },
  { id: "evening", label: "Evening", time: "6pm - 12am", startHour: 18, endHour: 24 },
] as const;

export const STOP_OPTIONS = [
  { value: 0, label: "Direct" },
  { value: 1, label: "1 Stop" },
  { value: 2, label: "2+ Stops" },
] as const;

export const WARNING_LABELS: Record<FlightWarning, { label: string; icon: string }> = {
  long_layover: { label: 'Long layover (8h+)', icon: '⏱️' },
  overnight_stop: { label: 'Overnight stop', icon: '🌙' },
  self_transfer: { label: 'Self-transfer required', icon: '🧳' },
  airport_change: { label: 'Airport change required', icon: '🚌' },
};

/**
 * Copy for the price comparison shown on a result.
 *
 * The underlying value is this flight's deviation from the average price of the
 * results in the SAME search. It is not a market baseline and not a forecast, so
 * the wording says exactly that. Previous copy ("Great price - compare now!",
 * "Price may change") claimed knowledge of the wider market and of future
 * movement that we do not have.
 */
export const PRICE_CONFIDENCE_CONFIG: Record<PriceConfidence, { label: string; color: string; recommendation: string }> = {
  low: { label: 'Above average', color: 'text-amber-600', recommendation: 'Costs more than the average of the results in this search' },
  average: { label: 'Around average', color: 'text-blue-600', recommendation: 'Close to the average of the results in this search' },
  high: { label: 'Below average', color: 'text-emerald-600', recommendation: 'Cheaper than the average of the results in this search' },
};
