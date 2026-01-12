import { useState, useEffect, useCallback, useRef } from "react";
import { Flight, FlightSearchMeta, FilterState, SortOption, DEPARTURE_TIME_SLOTS } from "@/types/flight";
import { supabase } from "@/integrations/supabase/client";
import { trackAffiliateEvent } from "@/services/travelApi";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nrxupicbzblbxolyxksg.supabase.co";

// Polling configuration
const POLL_INTERVAL_MS = 2000;
const MAX_POLL_ATTEMPTS = 30;

interface UseFlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
}

interface UseFlightSearchReturn {
  flights: Flight[];
  meta: FlightSearchMeta;
  isLoading: boolean;
  isSearching: boolean;
  error: string | null;
  retry: () => void;
  filters: FilterState;
  sortBy: SortOption;
  setSortBy: (sort: SortOption) => void;
  updateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  resetFilters: () => void;
  filteredFlights: Flight[];
  airlines: { code: string; name: string; count: number }[];
  searchProgress: number; // 0-100 progress percentage
}

// Helper to format minutes to "Xh Ym"
export function formatDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "N/A";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

// Helper to parse ISO time to hour
function getHourFromISO(isoString: string): number {
  try {
    const date = new Date(isoString);
    return date.getHours();
  } catch {
    return 12;
  }
}

// Convert API flight format to internal Flight format
function convertApiFlight(apiFlight: any): Flight {
  return {
    id: apiFlight.id,
    airline: apiFlight.airline || "Unknown",
    airline_code: apiFlight.airline_code || apiFlight.airline || "",
    price: apiFlight.price || 0,
    currency: apiFlight.currency || "AUD",
    duration_minutes: apiFlight.duration_minutes || 0,
    stops: apiFlight.stops || 0,
    segments: (apiFlight.segments || []).map((seg: any) => ({
      from: seg.from || "",
      to: seg.to || "",
      depart_time: seg.depart_time || "",
      arrive_time: seg.arrive_time || null,
      airline: seg.airline || apiFlight.airline,
      airline_code: seg.airline_code || apiFlight.airline_code,
      flight_number: seg.flight_number,
    })),
    is_deal: apiFlight.is_deal,
    link: apiFlight.link,
  };
}

// Update filter ranges based on current flights
function calculateFilterRanges(flights: Flight[]): Partial<FilterState> {
  if (flights.length === 0) {
    return {};
  }
  
  const prices = flights.map(f => f.price).filter(p => p > 0);
  const durations = flights.map(f => f.duration_minutes).filter(d => d > 0);
  
  if (prices.length === 0) return {};
  
  const minPrice = Math.floor(Math.min(...prices));
  const maxPrice = Math.ceil(Math.max(...prices));
  const maxDuration = durations.length > 0 ? Math.ceil(Math.max(...durations)) : 1440;

  return {
    minPrice,
    maxPrice,
    priceRange: [minPrice, maxPrice],
    maxDuration,
    durationRange: [0, maxDuration],
  };
}

export function useFlightSearch(params: UseFlightSearchParams): UseFlightSearchReturn {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [meta, setMeta] = useState<FlightSearchMeta>({ total_found: 0, is_complete: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("best");
  const [searchProgress, setSearchProgress] = useState(0);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollAttemptsRef = useRef(0);
  const hasInitializedFiltersRef = useRef(false);

  // Filter state
  const [filters, setFilters] = useState<FilterState>({
    priceRange: [0, 10000],
    maxPrice: 10000,
    minPrice: 0,
    selectedAirlines: [],
    selectedStops: [],
    selectedDepartureTimes: [],
    durationRange: [0, 1440],
    maxDuration: 1440,
  });

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(prev => ({
      ...prev,
      priceRange: [prev.minPrice, prev.maxPrice],
      selectedAirlines: [],
      selectedStops: [],
      selectedDepartureTimes: [],
      durationRange: [0, prev.maxDuration],
    }));
  }, []);

  // Calculate derived filter data from flights
  const airlines = flights.reduce<{ code: string; name: string; count: number }[]>((acc, flight) => {
    const existing = acc.find(a => a.code === flight.airline_code);
    if (existing) {
      existing.count++;
    } else if (flight.airline_code) {
      acc.push({ code: flight.airline_code, name: flight.airline, count: 1 });
    }
    return acc;
  }, []).sort((a, b) => b.count - a.count);

  // Apply filters and sorting
  const filteredFlights = flights
    .filter(flight => {
      // Price filter
      if (flight.price < filters.priceRange[0] || flight.price > filters.priceRange[1]) {
        return false;
      }
      
      // Airlines filter
      if (filters.selectedAirlines.length > 0 && !filters.selectedAirlines.includes(flight.airline_code)) {
        return false;
      }
      
      // Stops filter
      if (filters.selectedStops.length > 0) {
        const flightStops = flight.stops >= 2 ? 2 : flight.stops;
        if (!filters.selectedStops.includes(flightStops)) {
          return false;
        }
      }
      
      // Duration filter
      if (flight.duration_minutes > 0 && 
          (flight.duration_minutes < filters.durationRange[0] || flight.duration_minutes > filters.durationRange[1])) {
        return false;
      }
      
      // Departure time filter
      if (filters.selectedDepartureTimes.length > 0) {
        const firstSegment = flight.segments[0];
        if (firstSegment?.depart_time) {
          const hour = getHourFromISO(firstSegment.depart_time);
          const matchesSlot = filters.selectedDepartureTimes.some(slotId => {
            const slot = DEPARTURE_TIME_SLOTS.find(s => s.id === slotId);
            return slot && hour >= slot.startHour && hour < slot.endHour;
          });
          if (!matchesSlot) return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "cheapest":
          return a.price - b.price;
        case "fastest":
          return a.duration_minutes - b.duration_minutes;
        case "best":
        default:
          // Best = weighted score of price, duration, and stops
          const scoreA = a.price * 0.5 + a.duration_minutes * 0.3 + a.stops * 100;
          const scoreB = b.price * 0.5 + b.duration_minutes * 0.3 + b.stops * 100;
          return scoreA - scoreB;
      }
    });

  const fetchFlights = useCallback(async () => {
    if (!params.origin || !params.destination || !params.departureDate) {
      setIsLoading(false);
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    pollAttemptsRef.current = 0;
    hasInitializedFiltersRef.current = false;

    setIsLoading(true);
    setIsSearching(true);
    setError(null);
    setFlights([]);
    setMeta({ total_found: 0, is_complete: false });
    setSearchProgress(0);

    // Track the search
    trackAffiliateEvent({
      type: 'flight',
      action: 'search',
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
    });

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/search-flights`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ''}`,
        },
        body: JSON.stringify({
          origin: params.origin,
          destination: params.destination,
          depart_date: params.departureDate,
          return_date: params.returnDate,
          adults: params.passengers,
          currency: 'AUD',
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search flights');
      }

      // Handle new API format: { flights: [], meta: { total_found, is_complete } }
      const apiFlights = data.flights || data.results || [];
      const convertedFlights = apiFlights.map(convertApiFlight);
      
      // Deduplicate by ID
      const uniqueFlights = Array.from(
        new Map(convertedFlights.map((f: Flight) => [f.id, f])).values()
      ) as Flight[];
      
      setFlights(uniqueFlights);
      setMeta({
        total_found: data.meta?.total_found || uniqueFlights.length,
        is_complete: data.meta?.is_complete ?? true,
      });
      setSearchProgress(100);

      // Update filter ranges based on results
      if (uniqueFlights.length > 0 && !hasInitializedFiltersRef.current) {
        const ranges = calculateFilterRanges(uniqueFlights);
        setFilters(prev => ({ ...prev, ...ranges }));
        hasInitializedFiltersRef.current = true;
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      console.error('Flight search error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [params.origin, params.destination, params.departureDate, params.returnDate, params.passengers, params.cabinClass]);

  useEffect(() => {
    fetchFlights();
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [fetchFlights]);

  return {
    flights,
    meta,
    isLoading,
    isSearching,
    error,
    retry: fetchFlights,
    filters,
    sortBy,
    setSortBy,
    updateFilter,
    resetFilters,
    filteredFlights,
    airlines,
    searchProgress,
  };
}
