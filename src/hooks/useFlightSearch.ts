import { useState, useEffect, useCallback, useRef } from "react";
import { Flight, FlightSearchMeta, FilterState, SortOption, DEPARTURE_TIME_SLOTS, FlightWarning, PriceConfidence } from "@/types/flight";
import { supabase } from "@/integrations/supabase/client";
import { getFunctionUrl } from "@/lib/supabaseConfig";

interface UseFlightSearchParams {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  currency?: string;
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
  searchProgress: number;
  cheapestPrice: number;
  fastestDuration: number;
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

// REMOVED: calculateDealScore - was batch-relative, not market-based
function calculateDealScore(flight: Flight, allFlights: Flight[]): number {
  if (allFlights.length === 0) return 50;

  const prices = allFlights.map(f => f.price).filter(p => p > 0);
  const durations = allFlights.map(f => f.duration_minutes).filter(d => d > 0);
  
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const minDuration = Math.min(...durations);
  const maxDuration = Math.max(...durations);

  // Normalize values (0 = best, 1 = worst)
  const priceScore = maxPrice > minPrice 
    ? (flight.price - minPrice) / (maxPrice - minPrice) 
    : 0;
  const durationScore = maxDuration > minDuration 
    ? (flight.duration_minutes - minDuration) / (maxDuration - minDuration) 
    : 0;
  const stopsScore = Math.min(flight.stops / 2, 1);

  // Weighted combination (lower = better deal)
  const weightedScore = priceScore * 0.5 + durationScore * 0.3 + stopsScore * 0.2;
  
  // Convert to 0-100 scale where 100 = best deal
  return Math.round((1 - weightedScore) * 100);
}

// Calculate price confidence based on comparison with other results in current search
function calculatePriceConfidence(flight: Flight, allFlights: Flight[]): { 
  confidence: PriceConfidence; 
  trend: 'rising' | 'stable' | 'falling';
  averagePrice: number;
} {
  const prices = allFlights.map(f => f.price).filter(p => p > 0);
  const avgPrice = prices.reduce((a, b) => a + b, 0) / prices.length;
  
  const deviation = (flight.price - avgPrice) / avgPrice;
  
  let confidence: PriceConfidence;
  let trend: 'rising' | 'stable' | 'falling';

  if (deviation < -0.15) {
    confidence = 'high';
    trend = 'falling';
  } else if (deviation < 0.05) {
    confidence = 'average';
    trend = 'stable';
  } else {
    confidence = 'low';
    trend = 'rising';
  }

  return { confidence, trend, averagePrice: Math.round(avgPrice) };
}

// Detect flight warnings
function detectWarnings(flight: Flight): FlightWarning[] {
  const warnings: FlightWarning[] = [];

  if (flight.segments.length > 1) {
    for (let i = 0; i < flight.segments.length - 1; i++) {
      const current = flight.segments[i];
      const next = flight.segments[i + 1];
      
      // Calculate layover time if possible
      if (current.arrive_time && next.depart_time) {
        try {
          const arriveTime = new Date(current.arrive_time).getTime();
          const departTime = new Date(next.depart_time).getTime();
          const layoverMinutes = (departTime - arriveTime) / (1000 * 60);
          
          // Long layover (>8 hours)
          if (layoverMinutes > 480) {
            if (!warnings.includes('long_layover')) {
              warnings.push('long_layover');
            }
          }
          
          // Overnight stop (arriving after 10pm, departing after 6am next day)
          const arriveHour = new Date(current.arrive_time).getHours();
          const departHour = new Date(next.depart_time).getHours();
          if (arriveHour >= 22 && departHour >= 6 && layoverMinutes > 360) {
            if (!warnings.includes('overnight_stop')) {
              warnings.push('overnight_stop');
            }
          }
        } catch {
          // Ignore parse errors
        }
      }
      
      // Self-transfer: different airlines
      if (current.airline_code && next.airline_code && 
          current.airline_code !== next.airline_code) {
        if (!warnings.includes('self_transfer')) {
          warnings.push('self_transfer');
        }
      }
    }
  }

  return warnings;
}

// Convert API flight format to internal Flight format with enhancements
function convertApiFlight(apiFlight: any, allApiFlights: any[]): Flight {
  const baseFlight: Flight = {
    id: apiFlight.id,
    airline: apiFlight.airline || "Unknown",
    airline_code: apiFlight.airline_code || apiFlight.airline || "",
    price: apiFlight.price || 0,
    currency: apiFlight.currency || "USD",
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
      aircraft: seg.aircraft,
      duration_minutes: seg.duration_minutes,
      layover_minutes: seg.layover_minutes,
    })),
    is_deal: apiFlight.is_deal,
    link: apiFlight.link,
  };

  // Add warnings
  baseFlight.warnings = apiFlight.warnings || detectWarnings(baseFlight);

  return baseFlight;
}

// Update filter ranges based on current flights
export function calculateFilterRanges(flights: Flight[]): Partial<FilterState> {
  if (flights.length === 0) return {};
  
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

// Enhance flights with deal scores and price confidence after all flights loaded
function enhanceFlights(flights: Flight[]): Flight[] {
  return flights.map(flight => {
    const dealScore = calculateDealScore(flight, flights);
    const priceInfo = calculatePriceConfidence(flight, flights);
    
    return {
      ...flight,
      deal_score: flight.deal_score ?? dealScore,
      price_confidence: flight.price_confidence ?? priceInfo.confidence,
      price_trend: flight.price_trend ?? priceInfo.trend,
      average_price: priceInfo.averagePrice,
    };
  });
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

  // Calculate cheapest and fastest
  const cheapestPrice = flights.length > 0 
    ? Math.min(...flights.map(f => f.price).filter(p => p > 0))
    : 0;
  const fastestDuration = flights.length > 0
    ? Math.min(...flights.map(f => f.duration_minutes).filter(d => d > 0))
    : 0;

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
          // Best = use deal score if available, otherwise calculate weighted score
          const scoreA = a.deal_score ?? (100 - calculateDealScore(a, flights));
          const scoreB = b.deal_score ?? (100 - calculateDealScore(b, flights));
          return scoreB - scoreA; // Higher score = better
      }
    });

  const fetchFlights = useCallback(async () => {
    if (!params.origin || !params.destination || !params.departureDate) {
      // Form/prefill mode invokes this hook without a complete search - that is
      // a normal state (e.g. /flights?origin=SYD&destination=MOW), not an error,
      // so nothing is logged. Validation still blocks any request until every
      // required field is present; malformed inputs are reported separately.

      setIsLoading(false);
      setError(!params.origin || !params.destination 
        ? 'Please select both origin and destination airports.' 
        : 'Please select a departure date.');
      return;
    }

    // Validate airport codes (3-letter IATA)
    const iataRegex = /^[A-Z]{3}$/;
    if (!iataRegex.test(params.origin.toUpperCase()) || !iataRegex.test(params.destination.toUpperCase())) {
      console.warn('Flight search skipped: invalid airport codes', {
        origin: params.origin,
        destination: params.destination,
      });
      setIsLoading(false);
      setError('Invalid airport code. Please select a valid airport.');
      return;
    }

    // Abort previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    hasInitializedFiltersRef.current = false;

    setIsLoading(true);
    setIsSearching(true);
    setError(null);
    setFlights([]);
    setMeta({ total_found: 0, is_complete: false });
    setSearchProgress(0);

    // Tracking is handled in travelApi.searchFlights after successful response
    // (avoids duplicate tracking between hook and service layer)

    try {
      // Set a 30-second timeout for the search
      const timeoutId = setTimeout(() => {
        abortControllerRef.current?.abort();
      }, 30000);

      const requestBody = {
        origin: params.origin.toUpperCase(),
        destination: params.destination.toUpperCase(),
        depart_date: params.departureDate,
        ...(params.returnDate ? { return_date: params.returnDate } : {}),
        adults: params.passengers || 1,
        currency: params.currency || 'USD',
      };

      console.log('Flight search request:', JSON.stringify(requestBody));

      // Use anon key as fallback when user is not authenticated
      const session = (await supabase.auth.getSession()).data.session;
      const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

      const url = getFunctionUrl("search-flights");
      if (!url) throw new Error("Supabase not configured — cannot search flights");
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
        },
        body: JSON.stringify(requestBody),
        signal: abortControllerRef.current.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || data.message || `Search failed (${response.status})`;
        console.error('Flight search API error:', { status: response.status, error: errorMsg, details: data });
        throw new Error(errorMsg);
      }

      // Handle API response
      const apiFlights = data.flights || data.results || [];
      
      console.log(`Flight search response: ${apiFlights.length} flights received`);

      if (apiFlights.length === 0) {
        console.info('Flight search returned 0 results', {
          origin: params.origin,
          destination: params.destination,
          departureDate: params.departureDate,
          returnDate: params.returnDate,
        });
      }

      const convertedFlights = apiFlights.map((f: any) => convertApiFlight(f, apiFlights));
      
      // Deduplicate by ID
      const uniqueFlights = Array.from(
        new Map(convertedFlights.map((f: Flight) => [f.id, f])).values()
      ) as Flight[];
      setFlights(uniqueFlights);
      setMeta({
        total_found: data.meta?.total_found || uniqueFlights.length,
        is_complete: data.meta?.is_complete ?? true,
        cheapest_price: uniqueFlights.length > 0 ? Math.min(...uniqueFlights.map(f => f.price).filter(p => p > 0))
          : undefined,
        fastest_duration: uniqueFlights.length > 0
          ? Math.min(...uniqueFlights.map(f => f.duration_minutes).filter(d => d > 0))
          : undefined,
      });
      setSearchProgress(100);

      // Update filter ranges based on results
      if (uniqueFlights.length > 0) {
        const ranges = calculateFilterRanges(uniqueFlights);
        if (!hasInitializedFiltersRef.current) {
          setFilters(prev => ({ ...prev, ...ranges }));
          hasInitializedFiltersRef.current = true;
        } else {
          setFilters(prev => ({
            ...prev,
            minPrice: ranges.minPrice ?? prev.minPrice,
            maxPrice: ranges.maxPrice ?? prev.maxPrice,
            priceRange: ranges.priceRange ?? prev.priceRange,
            maxDuration: ranges.maxDuration ?? prev.maxDuration,
            durationRange: ranges.durationRange ?? prev.durationRange,
          }));
        }
      }

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.warn('Flight search aborted (timeout or navigation)');
        setError('Search timed out. Please try again.');
        return;
      }
      console.error('Flight search error:', err);
      setError(err instanceof Error ? err.message : 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      setIsSearching(false);
    }
  }, [params.origin, params.destination, params.departureDate, params.returnDate, params.passengers, params.cabinClass, params.currency]);

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
    cheapestPrice,
    fastestDuration,
  };
}


