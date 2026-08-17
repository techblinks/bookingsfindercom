import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDestinations, searchDestinations, displayDestination } from "@/services/destinations";
import type { ExperienceDestination } from "@/types/experiences";

// ── Props ───────────────────────────────────────────────────────

interface DestinationAutocompleteProps {
  /** Current display value of the input (controlled). */
  value: string;
  /** Called on every keystroke so the parent form tracks the text. */
  onChange: (value: string) => void;
  /** Called when the user picks a destination from the dropdown. */
  onSelect?: (destination: ExperienceDestination) => void;
  placeholder?: string;
  className?: string;
  /**
   * DOM id for the input. Without it a caller's `<label htmlFor="...">` points
   * at nothing and the field is effectively unlabelled — which is exactly what
   * the Things hero used to do.
   */
  inputId?: string;
  /** Accessible name when the caller has no visible `<label>` to associate. */
  ariaLabel?: string;
  /**
   * Presentation only. `true` drops the built-in leading MapPin so the field
   * can sit inside a caller-composed search shell that already supplies its
   * own icon. Behaviour, semantics and the dropdown are unchanged.
   */
  hideLeadingIcon?: boolean;
}

// ── Component ───────────────────────────────────────────────────

const DestinationAutocomplete = ({
  value,
  onChange,
  onSelect,
  placeholder = "Where are you going?",
  className,
  inputId,
  ariaLabel,
  hideLeadingIcon = false,
}: DestinationAutocompleteProps) => {
  // ── External data ───────────────────────────────────────────
  const {
    destinations,
    isLoading: isDestLoading,
    error: destError,
  } = useDestinations();

  // ── Local state ─────────────────────────────────────────────
  const [query, setQuery] = useState(value);
  const [isOpen, setIsOpen] = useState(false);
  const [filtered, setFiltered] = useState<ExperienceDestination[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);

  // ── Refs ────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  // ── Sync external value → internal query (when closed) ─────
  useEffect(() => {
    if (!isOpen) {
      setQuery(value);
    }
  }, [value, isOpen]);

  // ── Debounce 150 ms before filtering ────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(() => {
      const trimmed = query.trim();
      if (!trimmed || destinations.length === 0) {
        setFiltered([]);
        return;
      }
      setFiltered(searchDestinations(trimmed, destinations));
    }, 150);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, destinations]);

  // ── Reset active index when filtered results change ─────────
  useEffect(() => {
    setActiveIndex(-1);
  }, [filtered]);

  // ── Click-outside → close ───────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Scroll active item into view ────────────────────────────
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.children[activeIndex] as HTMLElement | undefined;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  // ── Handlers ────────────────────────────────────────────────

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);
      onChange(val);
      setIsOpen(true);
      setActiveIndex(-1);
    },
    [onChange],
  );

  const handleSelect = useCallback(
    (dest: ExperienceDestination) => {
      const display = displayDestination(dest, destinations);
      setQuery(display);
      onChange(display);
      onSelect?.(dest);
      setIsOpen(false);
      setActiveIndex(-1);
    },
    [destinations, onChange, onSelect],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!isOpen) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          setIsOpen(true);
        }
        return;
      }

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setActiveIndex((prev) => Math.min(prev + 1, filtered.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          setActiveIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (activeIndex >= 0 && activeIndex < filtered.length) {
            handleSelect(filtered[activeIndex]);
          }
          break;
        case "Escape":
          e.preventDefault();
          setIsOpen(false);
          inputRef.current?.blur();
          break;
      }
    },
    [isOpen, filtered, activeIndex, handleSelect],
  );

  const handleFocus = useCallback(() => {
    if (query.trim().length > 0) {
      setIsOpen(true);
    }
  }, [query]);

  // ── Derived state ───────────────────────────────────────────

  const activeDescendant =
    activeIndex >= 0 && filtered[activeIndex]
      ? `dest-option-${filtered[activeIndex].destinationId}`
      : undefined;

  const showDropdown = isOpen && query.trim().length > 0;
  const showLoading = showDropdown && isDestLoading;
  const showError = isOpen && !!destError && !isDestLoading;
  const showNoResults = showDropdown && !isDestLoading && !destError && filtered.length === 0;

  // ── Render ──────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative w-full">
      {/* ── Input ─────────────────────────────────────────── */}
      <div className="relative">
        {!hideLeadingIcon && (
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-[#01367F] pointer-events-none z-10" />
        )}
        <input
          ref={inputRef}
          id={inputId}
          aria-label={ariaLabel}
          type="text"
          role="combobox"
          aria-expanded={showDropdown}
          aria-activedescendant={activeDescendant}
          aria-autocomplete="list"
          aria-controls="destination-listbox"
          aria-haspopup="listbox"
          value={query}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className={cn(
            "w-full h-12 pl-10 pr-10",
            "bg-white border border-[#D8E0E7] rounded-xl",
            "text-sm text-gray-900 placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-[#01367F] focus:border-transparent",
            "transition-shadow duration-200",
            className,
          )}
        />

        {/* Spinner while destinations load */}
        {isDestLoading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
        )}
      </div>

      {/* ── Error state ───────────────────────────────────── */}
      {showError && (
        <div
          role="alert"
          className="absolute z-50 mt-1 w-full bg-white border border-[#D8E0E7] rounded-xl shadow-lg"
        >
          <div className="px-4 py-3 text-sm text-red-600">
            Failed to load destinations. You can still type a location manually.
          </div>
        </div>
      )}

      {/* ── Loading state ─────────────────────────────────── */}
      {showLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#D8E0E7] rounded-xl shadow-lg">
          <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading destinations…
          </div>
        </div>
      )}

      {/* ── Suggestions dropdown ──────────────────────────── */}
      {showDropdown && !showError && !showLoading && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-[#D8E0E7] rounded-xl shadow-lg overflow-hidden">
          {filtered.length > 0 ? (
            <ul
              id="destination-listbox"
              ref={listRef}
              role="listbox"
              className="max-h-64 overflow-y-auto py-1"
            >
              {filtered.map((dest, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <li
                    key={dest.destinationId}
                    id={`dest-option-${dest.destinationId}`}
                    role="option"
                    aria-selected={isActive}
                    className={cn(
                      "flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors",
                      isActive
                        ? "bg-[#01367F]/10 text-[#01367F]"
                        : "text-gray-700 hover:bg-gray-50",
                    )}
                    onClick={() => handleSelect(dest)}
                    onMouseEnter={() => setActiveIndex(idx)}
                  >
                    <MapPin
                      className={cn(
                        "h-4 w-4 shrink-0",
                        isActive ? "text-[#01367F]" : "text-gray-400",
                      )}
                    />
                    <span className="text-sm font-medium">
                      {displayDestination(dest, destinations)}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : showNoResults ? (
            <div className="px-4 py-3 text-sm text-gray-500">
              No destinations found
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default DestinationAutocomplete;
