import { useState, useEffect, useCallback, useRef } from "react";
import { Flight, FlightSearchMeta, FilterState, SortOption, DEPARTURE_TIME_SLOTS } from "@/types/flight";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nrxupicbzblbxolyxksg.supabase.co";

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
}

// Helper to format minutes to "Xh Ym"
export function formatDuration(minutes: number): string {
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

// Convert legacy FlightResult to new Flight format
function convertLegacyFlight(legacy: any): Flight {
  // Parse duration string to minutes
  let durationMinutes = 0;
  if (legacy.duration) {
    const match = legacy.duration.match(/(\d+)h\s*(\d+)?m?/);
    if (match) {
      durationMinutes = parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
    }
  }

  // Build segments from departure/arrival info
  const segments = [{
    from: legacy.departureAirport || legacy.origin || "",
    to: legacy.arrivalAirport || legacy.destination || "",
    depart_time: legacy.departureTime || "",
    arrive_time: legacy.arrivalTime || "",
    airline: legacy.airline,
    airline_code: legacy.airlineCode,
    flight_number: legacy.flightNumber,
  }];

  return {
    id: legacy.id,
    airline: legacy.airline,
    airline_code: legacy.airlineCode || legacy.airline,
    price: legacy.price,
    currency: legacy.currency || "USD",
    duration_minutes: durationMinutes,
    stops: legacy.stops || 0,
    segments,
    is_deal: legacy.isDeal,
    link: legacy.link,
  };
}

export function useFlightSearch(params: UseFlightSearchParams): UseFlightSearchReturn {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [meta, setMeta] = useState<FlightSearchMeta>({ total_found: 0, is_complete: false });
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("best");
  
  const abortControllerRef = useRef<AbortController | null>(null);

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
    } else {
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
      if (flight.duration_minutes < filters.durationRange[0] || flight.duration_minutes > filters.durationRange[1]) {
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

    setIsLoading(true);
    setIsSearching(true);
    setError(null);
    setFlights([]);
    setMeta({ total_found: 0, is_complete: false });

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
          departureDate: params.departureDate,
          returnDate: params.returnDate,
          passengers: params.passengers,
          cabinClass: params.cabinClass,
        }),
        signal: abortControllerRef.current.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to search flights');
      }

      // Convert legacy format to new format
      const convertedFlights = (data.results || []).map(convertLegacyFlight);
      
      setFlights(convertedFlights);
      setMeta({
        total_found: convertedFlights.length,
        is_complete: true,
      });

      // Update filter ranges based on results
      if (convertedFlights.length > 0) {
        const prices = convertedFlights.map((f: Flight) => f.price);
        const durations = convertedFlights.map((f: Flight) => f.duration_minutes);
        const minPrice = Math.floor(Math.min(...prices));
        const maxPrice = Math.ceil(Math.max(...prices));
        const maxDuration = Math.ceil(Math.max(...durations));

        setFilters(prev => ({
          ...prev,
          minPrice,
          maxPrice,
          priceRange: [minPrice, maxPrice],
          maxDuration,
          durationRange: [0, maxDuration],
        }));
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
  };
}
