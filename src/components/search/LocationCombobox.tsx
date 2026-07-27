import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Plane, Clock, TrendingUp, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Airport {
  code: string;
  city: string;
  country: string;
  name: string;
}

// Popular airports shown when input is empty
const popularAirports: Airport[] = [
  { code: "JFK", city: "New York", country: "USA", name: "John F. Kennedy International Airport" },
  { code: "LAX", city: "Los Angeles", country: "USA", name: "Los Angeles International Airport" },
  { code: "LHR", city: "London", country: "UK", name: "Heathrow Airport" },
  { code: "DXB", city: "Dubai", country: "UAE", name: "Dubai International Airport" },
  { code: "SIN", city: "Singapore", country: "Singapore", name: "Changi Airport" },
  { code: "SYD", city: "Sydney", country: "Australia", name: "Sydney Kingsford Smith Airport" },
];

// Storage key for recent airports
const RECENT_AIRPORTS_KEY = "recent_airports";

const getRecentAirports = (): Airport[] => {
  try {
    const stored = localStorage.getItem(RECENT_AIRPORTS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveRecentAirport = (airport: Airport) => {
  try {
    const recent = getRecentAirports();
    // Remove if already exists, then add to front
    const filtered = recent.filter((a) => a.code !== airport.code);
    const updated = [airport, ...filtered].slice(0, 5);
    localStorage.setItem(RECENT_AIRPORTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
};

interface LocationComboboxProps {
  value: string;
  onChange: (value: string, airport?: Airport) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

const LocationCombobox = ({
  value,
  onChange,
  placeholder = "City or airport",
  className,
  id,
}: LocationComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceError, setServiceError] = useState(false);
  const [recentAirports, setRecentAirports] = useState<Airport[]>([]);
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // Sync query with external value changes
  useEffect(() => {
    if (value !== query && !isOpen) {
      setQuery(value);
    }
  }, [value]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Load recent airports on mount
  useEffect(() => {
    setRecentAirports(getRecentAirports());
  }, []);

  // Search airports with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setAirports([]);
      setIsLoading(false);
      setServiceError(false);
      return;
    }

    setIsLoading(true);
    setServiceError(false);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-airports", {
          body: { q: query, limit: 8 },
        });

        if (error) {
          console.error("Airport search error:", error);
          setAirports([]);
          setServiceError(true);
        } else if (data) {
          setAirports(Array.isArray(data) ? data : []);
        } else {
          setAirports([]);
        }
      } catch (err) {
        console.error("Airport search error:", err);
        setAirports([]);
        setServiceError(true);
      } finally {
        setIsLoading(false);
      }
    }, 150);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setSelectedAirport(null);
    onChange(newValue);
    setIsOpen(true);
  };

  const handleSelect = (airport: Airport) => {
    const displayValue = `${airport.city} (${airport.code})`;
    setQuery(displayValue);
    setSelectedAirport(airport);
    saveRecentAirport(airport);
    setRecentAirports(getRecentAirports());
    onChange(airport.code, airport);
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const showSearchResults = query.length >= 2 && (airports.length > 0 || isLoading || serviceError);
  const showEmptyState = isOpen && query.length < 2;
  const showNoResults = isOpen && !isLoading && !serviceError && query.length >= 2 && airports.length === 0;

  // Shared airport option renderer — three-line hierarchy
  const renderAirportOption = (airport: Airport) => (
    <button
      key={airport.code}
      type="button"
      onClick={() => handleSelect(airport)}
      className="flex w-full items-start gap-3 px-4 py-3 hover:bg-accent focus-visible:bg-accent focus-visible:outline-none transition-colors text-left"
    >
      <Plane className="h-4 w-4 text-muted-foreground mt-1 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-semibold text-foreground leading-snug">
          {airport.city}
        </div>
        <div className="text-sm text-muted-foreground leading-snug mt-0.5">
          {airport.name} <span className="font-mono text-xs ml-1">&middot; {airport.code}</span>
        </div>
        <div className="text-xs text-muted-foreground/60 leading-snug mt-0.5">
          {airport.country}
        </div>
      </div>
    </button>
  );

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            "flex h-10 w-full bg-transparent pl-6 pr-6 py-1 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 truncate",
            className
          )}
          autoComplete="off"
          title={query}
        />
        {isLoading && (
          <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Service error state */}
      {isOpen && serviceError && !isLoading && (
        <div className="absolute z-50 mt-1 w-full min-w-[340px] rounded-md border border-border bg-popover shadow-lg">
          <div className="flex items-center gap-2 py-4 px-3 text-sm text-muted-foreground">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-500" />
            Airport search is temporarily unavailable
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {isOpen && showSearchResults && (
        <div className="absolute z-50 mt-1 w-full min-w-[340px] rounded-md border border-border bg-popover shadow-lg">
          {isLoading && airports.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching airports...
            </div>
          ) : (
            <ul className="max-h-[370px] overflow-y-auto py-1" role="listbox">
              {airports.map((airport) => (
                <li key={airport.code} role="option" aria-selected={selectedAirport?.code === airport.code}>
                  {renderAirportOption(airport)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Recent & Popular Airports (when input is empty/short) */}
      {showEmptyState && (
        <div className="absolute z-50 mt-1 w-full min-w-[340px] rounded-md border border-border bg-popover shadow-lg">
          <div className="max-h-[420px] overflow-y-auto py-1">
            {/* Recent Airports */}
            {recentAirports.length > 0 && (
              <div className="pb-1">
                <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  <Clock className="h-3 w-3" />
                  Recent
                </div>
                <ul>
                  {recentAirports.map((airport) => (
                    <li key={`recent-${airport.code}`}>
                      {renderAirportOption(airport)}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Popular Airports */}
            <div className={recentAirports.length > 0 ? "border-t border-border pt-1" : ""}>
              <div className="flex items-center gap-2 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                <TrendingUp className="h-3 w-3" />
                Popular Destinations
              </div>
              <ul>
                {popularAirports.map((airport) => (
                  <li key={`popular-${airport.code}`}>
                    {renderAirportOption(airport)}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* No results */}
      {showNoResults && (
        <div className="absolute z-50 mt-1 w-full min-w-[340px] rounded-md border border-border bg-popover shadow-lg">
          <div className="py-4 text-center text-sm text-muted-foreground">
            No airports found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationCombobox;
