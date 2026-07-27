import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, MapPin, Plane, Loader2, Clock, TrendingUp, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

interface Airport {
  code: string;
  city: string;
  country: string;
  name: string;
}

const popularAirports: Airport[] = [
  { code: "JFK", city: "New York", country: "USA", name: "John F. Kennedy International Airport" },
  { code: "LAX", city: "Los Angeles", country: "USA", name: "Los Angeles International Airport" },
  { code: "LHR", city: "London", country: "UK", name: "Heathrow Airport" },
  { code: "DXB", city: "Dubai", country: "UAE", name: "Dubai International Airport" },
  { code: "SIN", city: "Singapore", country: "Singapore", name: "Changi Airport" },
  { code: "SYD", city: "Sydney", country: "Australia", name: "Sydney Kingsford Smith Airport" },
];

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
    const filtered = recent.filter((a) => a.code !== airport.code);
    const updated = [airport, ...filtered].slice(0, 5);
    localStorage.setItem(RECENT_AIRPORTS_KEY, JSON.stringify(updated));
  } catch {
    // Ignore storage errors
  }
};

interface NativeLocationPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (code: string, airport: Airport) => void;
  title?: string;
  placeholder?: string;
}

const NativeLocationPicker = ({
  isOpen,
  onClose,
  onSelect,
  title = "Select Location",
  placeholder = "Search airports or cities...",
}: NativeLocationPickerProps) => {
  const [query, setQuery] = useState("");
  const [airports, setAirports] = useState<Airport[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [serviceError, setServiceError] = useState(false);
  const [recentAirports, setRecentAirports] = useState<Airport[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (isOpen) {
      setRecentAirports(getRecentAirports());
      setQuery("");
      setAirports([]);
      setServiceError(false);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

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

  const handleSelect = (airport: Airport) => {
    saveRecentAirport(airport);
    onSelect(airport.code, airport);
    onClose();
  };

  const showSearchResults = query.length >= 2;
  const showEmptyState = query.length < 2;
  const showNoResults = !isLoading && !serviceError && query.length >= 2 && airports.length === 0;

  // Three-line airport hierarchy for mobile picker
  const AirportItem = ({ airport }: { airport: Airport }) => (
    <motion.button
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => handleSelect(airport)}
      className="w-full flex items-center gap-4 px-4 py-4 native-press transition-colors text-left min-h-[68px]"
    >
      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <Plane className="h-5 w-5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-base font-semibold text-foreground leading-snug">
          {airport.city}
        </div>
        <div className="text-sm text-muted-foreground leading-snug mt-0.5">
          {airport.name} <span className="font-mono text-xs ml-1">&middot; {airport.code}</span>
        </div>
        <div className="text-xs text-muted-foreground/60 leading-snug mt-0.5">
          {airport.country}
        </div>
      </div>
    </motion.button>
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, y: "100%" }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: "100%" }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed inset-0 z-50 bg-background"
        >
          <div className="flex flex-col h-full safe-area-inset">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
              <button
                onClick={onClose}
                className="w-10 h-10 flex items-center justify-center rounded-full native-press"
              >
                <X className="h-5 w-5 text-foreground" />
              </button>
              <h2 className="text-lg font-semibold text-foreground flex-1">{title}</h2>
            </div>

            {/* Search Input */}
            <div className="px-4 py-3 border-b border-border bg-card">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={placeholder}
                  className="w-full h-14 pl-12 pr-12 bg-secondary rounded-xl text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                  autoComplete="off"
                  autoCapitalize="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
                {isLoading && (
                  <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground animate-spin" />
                )}
                {query && !isLoading && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-muted"
                  >
                    <X className="h-3 w-3 text-muted-foreground" />
                  </button>
                )}
              </div>
            </div>

            {/* Results */}
            <div className="flex-1 overflow-auto">
              {/* Service error state */}
              {showSearchResults && serviceError && !isLoading && (
                <div className="flex items-center justify-center py-12 text-muted-foreground">
                  <div className="text-center">
                    <AlertCircle className="h-10 w-10 mx-auto mb-3 text-amber-500 opacity-50" />
                    <p className="text-sm">Airport search is temporarily unavailable</p>
                  </div>
                </div>
              )}

              {/* Search Results */}
              {showSearchResults && !serviceError && (
                <div className="divide-y divide-border">
                  {isLoading && airports.length === 0 && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      Searching airports...
                    </div>
                  )}
                  {airports.map((airport, index) => (
                    <motion.div
                      key={airport.code}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <AirportItem airport={airport} />
                    </motion.div>
                  ))}
                  {showNoResults && (
                    <div className="py-8 text-center text-muted-foreground">
                      <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
                      <p>No airports found for "{query}"</p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State - Recent & Popular */}
              {showEmptyState && (
                <div>
                  {recentAirports.length > 0 && (
                    <div className="pb-2">
                      <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        <Clock className="h-4 w-4" />
                        Recent
                      </div>
                      <div className="divide-y divide-border">
                        {recentAirports.map((airport, index) => (
                          <motion.div
                            key={`recent-${airport.code}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <AirportItem airport={airport} />
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className={cn(recentAirports.length > 0 && "border-t border-border")}>
                    <div className="flex items-center gap-2 px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <TrendingUp className="h-4 w-4" />
                      Popular Destinations
                    </div>
                    <div className="divide-y divide-border">
                      {popularAirports.map((airport, index) => (
                        <motion.div
                          key={`popular-${airport.code}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: (recentAirports.length + index) * 0.05 }}
                        >
                          <AirportItem airport={airport} />
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NativeLocationPicker;
