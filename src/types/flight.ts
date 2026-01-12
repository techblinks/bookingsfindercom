// Flight data types matching backend contract

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
}

export interface FlightSearchMeta {
  total_found: number;
  is_complete: boolean;
  search_id?: string;
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
