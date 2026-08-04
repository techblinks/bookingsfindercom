import { useState, useEffect, useRef, useCallback } from "react";
import { Building2, Loader2, MapPin, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { searchHotelDestinations, type HotelDestination } from "@/data/hotelDestinations";

interface HotelDestinationComboboxProps {
  value: string;
  onChange: (value: string, destination?: HotelDestination) => void;
  placeholder?: string;
  id?: string;
  className?: string;
}

const MIN_QUERY_LENGTH = 2;

const HotelDestinationCombobox = ({
  value,
  onChange,
  placeholder = "City or region",
  id,
  className,
}: HotelDestinationComboboxProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [suggestions, setSuggestions] = useState<HotelDestination[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const requestIdRef = useRef(0);

  // Sync with external value changes
  useEffect(() => {
    if (value !== query && !isOpen) {
      setQuery(value);
    }
  }, [value]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        close();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const close = useCallback(() => {
    setIsOpen(false);
    setActiveIndex(-1);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (query.trim().length < MIN_QUERY_LENGTH) {
      setSuggestions([]);
      setIsLoading(false);
      setActiveIndex(-1);
      return;
    }

    setIsLoading(true);
    const thisRequestId = ++requestIdRef.current;

    debounceRef.current = setTimeout(() => {
      if (thisRequestId !== requestIdRef.current) return;
      const results = searchHotelDestinations(query);
      setSuggestions(results);
      setIsLoading(false);
      setActiveIndex(-1);
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setQuery(newValue);
    setIsOpen(true);
    // Every keystroke updates form state so validation sees the raw text
    if (newValue.trim().length >= MIN_QUERY_LENGTH) {
      onChange(newValue.trim());
    }
  };

  const handleSelect = (destination: HotelDestination) => {
    setQuery(destination.label);
    onChange(destination.value, destination);
    close();
  };

  const handleManualConfirm = () => {
    const trimmed = query.trim();
    if (trimmed.length >= MIN_QUERY_LENGTH) {
      onChange(trimmed);
      close();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        setIsOpen(true);
      }
      return;
    }

    const suggestionCount = suggestions.length;
    const hasManualRow = suggestionCount === 0;
    // When only manual row: indices [0] = manual. When suggestions: [0..n-1] = suggestions.
    const maxIndex = hasManualRow ? 0 : suggestionCount - 1;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => {
          return prev < maxIndex ? prev + 1 : 0;
        });
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => {
          return prev > 0 ? prev - 1 : maxIndex;
        });
        break;
      case "Enter":
        e.preventDefault();
        if (suggestionCount > 0 && activeIndex >= 0 && activeIndex < suggestionCount) {
          handleSelect(suggestions[activeIndex]);
        } else if (suggestionCount === 0 && activeIndex === 0) {
          // Manual confirm row
          handleManualConfirm();
        }
        break;
      case "Escape":
        e.preventDefault();
        close();
        inputRef.current?.blur();
        break;
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const items = listRef.current.querySelectorAll('[role="option"]');
      items[activeIndex]?.scrollIntoView?.({ block: "nearest" });
    }
  }, [activeIndex]);

  const trimmed = query.trim();
  const showDropdown = isOpen && trimmed.length >= MIN_QUERY_LENGTH;
  const hasSuggestions = showDropdown && suggestions.length > 0;
  const showNoSuggestions = showDropdown && !isLoading && suggestions.length === 0;
  // Allow manual entry when typed >=2 chars, even with no suggestions
  const showManualEntry = showDropdown && !isLoading && suggestions.length === 0;

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      <div className="relative">
        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={hasSuggestions || showNoSuggestions}
          aria-controls={hasSuggestions || showNoSuggestions ? "hotel-dest-list" : undefined}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? `hotel-dest-${activeIndex}` : undefined}
          aria-haspopup="listbox"
          value={query}
          onChange={handleInputChange}
          onFocus={() => { if (trimmed.length >= MIN_QUERY_LENGTH) setIsOpen(true); }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "flex h-12 w-full rounded-xl border border-input bg-background pl-10 pr-10 text-sm ring-offset-background",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            "disabled:cursor-not-allowed disabled:opacity-50",
          )}
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground animate-spin" aria-hidden="true" />
        )}
      </div>

      {/* Suggestions + manual entry dropdown */}
      {hasSuggestions && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          <ul
            ref={listRef}
            id="hotel-dest-list"
            role="listbox"
            aria-label="Destinations"
            className="max-h-[320px] overflow-y-auto py-1"
          >
            {suggestions.map((dest, idx) => (
              <li
                key={dest.value + dest.country}
                id={`hotel-dest-${idx}`}
                role="option"
                aria-selected={idx === activeIndex}
              >
                <button
                  type="button"
                  onClick={() => handleSelect(dest)}
                  onMouseEnter={() => setActiveIndex(idx)}
                  aria-label={dest.label}
                  className={cn(
                    "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                    "focus-visible:bg-accent focus-visible:outline-none",
                    idx === activeIndex ? "bg-accent" : "hover:bg-muted/50"
                  )}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[15px] font-semibold text-foreground leading-snug truncate">
                      {dest.label.split(",")[0]}
                    </div>
                    <div className="text-sm text-muted-foreground leading-snug mt-0.5">
                      {dest.region ? `${dest.region}, ` : ""}{dest.country}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Manual entry: no suggestions found */}
      {showManualEntry && (
        <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-popover shadow-xl overflow-hidden">
          <div className="py-3 px-4 text-sm text-muted-foreground text-center">
            No suggested destination found.
          </div>
          <button
            type="button"
            id="hotel-dest-manual"
            role="option"
            aria-selected={activeIndex === suggestions.length}
            onClick={handleManualConfirm}
            onMouseEnter={() => setActiveIndex(suggestions.length)}
            className={cn(
              "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors border-t border-border",
              "focus-visible:bg-accent focus-visible:outline-none",
              activeIndex === suggestions.length ? "bg-accent" : "hover:bg-muted/50"
            )}
          >
            <ArrowRight className="h-4 w-4 text-primary mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[15px] font-semibold text-foreground leading-snug">
                Search for "{trimmed}"
              </div>
              <div className="text-sm text-muted-foreground leading-snug mt-0.5">
                Press Enter to use this destination
              </div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
};

export default HotelDestinationCombobox;