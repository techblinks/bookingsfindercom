import { useState, useEffect, useRef } from "react";
import { MapPin, Loader2, Plane } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Airport {
  code: string;
  city: string;
  country: string;
  name: string;
}

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
  const [selectedAirport, setSelectedAirport] = useState<Airport | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

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

  // Search airports with debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length < 2) {
      setAirports([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-airports", {
          body: null,
          method: "GET",
        });

        // Use fetch directly for GET with query params
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-airports?q=${encodeURIComponent(query)}&limit=8`,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.ok) {
          const results = await response.json();
          setAirports(results);
        } else {
          setAirports([]);
        }
      } catch (error) {
        console.error("Airport search error:", error);
        setAirports([]);
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
    onChange(airport.code, airport);
    setIsOpen(false);
  };

  const handleFocus = () => {
    if (query.length >= 2) {
      setIsOpen(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === "ArrowDown" && airports.length > 0) {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
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
            "flex h-12 w-full rounded-md border border-input bg-background pl-10 pr-10 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
          autoComplete="off"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" />
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (airports.length > 0 || isLoading) && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          {isLoading && airports.length === 0 ? (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Searching airports...
            </div>
          ) : (
            <ul className="max-h-64 overflow-auto py-1">
              {airports.map((airport) => (
                <li key={airport.code}>
                  <button
                    type="button"
                    onClick={() => handleSelect(airport)}
                    className="flex w-full items-start gap-3 px-3 py-2.5 hover:bg-accent transition-colors text-left"
                  >
                    <Plane className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">
                          {airport.city}
                        </span>
                        <span className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">
                          {airport.code}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {airport.name}, {airport.country}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* No results */}
      {isOpen && !isLoading && query.length >= 2 && airports.length === 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover shadow-lg">
          <div className="py-4 text-center text-sm text-muted-foreground">
            No airports found for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationCombobox;
