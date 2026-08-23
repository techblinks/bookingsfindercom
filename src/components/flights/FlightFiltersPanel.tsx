import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { FilterState, DEPARTURE_TIME_SLOTS, STOP_OPTIONS } from "@/types/flight";
import { formatDuration } from "@/hooks/useFlightSearch";
import { getAirlineLogo } from "@/lib/airlineLogos";
import { countActiveFilters } from "./filterSummary";
import { cn } from "@/lib/utils";

interface FilterSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const FilterSection = ({ title, children, defaultOpen = true }: FilterSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-b border-border pb-4 mb-4 last:border-b-0 last:pb-0 last:mb-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full text-left py-2 group"
        aria-expanded={isOpen}
      >
        <span className="font-semibold text-foreground text-sm">{title}</span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        )}
      </button>
      {isOpen && <div className="mt-3 animate-in fade-in slide-in-from-top-1 duration-200">{children}</div>}
    </div>
  );
};

interface FlightFiltersPanelProps {
  filters: FilterState;
  airlines: { code: string; name: string; count: number }[];
  stopCounts: Record<number, number>;
  departureCounts: Record<string, number>;
  onFilterChange: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onReset: () => void;
  totalResults: number;
  currency?: string;
  /**
   * "card" (default) is the desktop sidebar: its own card chrome, heading and
   * Reset. "plain" drops that chrome so the panel can sit inside a surface that
   * already provides a title and actions — the mobile filter sheet. The filter
   * controls themselves are identical in both.
   */
  variant?: "card" | "plain";
  /**
   * BF-0R-7.2 Phase G: whether the search actually returned any flights
   * (meta.total_found > 0), as opposed to zero after filtering. Defaults to
   * true so existing callers that don't pass it keep today's behaviour.
   * When false, the price range, Stops and Departure Time sections are
   * dead controls — every count is 0 and the price range is an unused
   * default placeholder, not provider-derived — so they are hidden rather
   * than shown empty.
   */
  hasResults?: boolean;
}

const FlightFiltersPanel = ({
  filters,
  airlines,
  stopCounts,
  departureCounts,
  onFilterChange,
  onReset,
  totalResults,
  currency = "$",
  variant = "card",
  hasResults = true,
}: FlightFiltersPanelProps) => {
  const isPlain = variant === "plain";
  const toggleArrayFilter = <T,>(current: T[], value: T, onChange: (newValue: T[]) => void) => {
    if (current.includes(value)) {
      onChange(current.filter(v => v !== value));
    } else {
      onChange([...current, value]);
    }
  };

  const hasActiveFilters = countActiveFilters(filters) > 0;

  return (
    <div className={cn(!isPlain && "bg-card rounded-xl border border-border shadow-sm overflow-hidden")}>
      {/* Header — the sheet supplies its own title, Reset and result count */}
      {!isPlain && (
        <div className="p-4 border-b border-border bg-muted/30">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-foreground">Filters</h2>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onReset}
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-3 w-3" />
                Reset
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {totalResults} flight{totalResults !== 1 ? 's' : ''} found
          </p>
        </div>
      )}

      <div className={cn(!isPlain && "p-4")}>
        {/* Price Range — BF-0R-7.1 Phase C: "Recent fare" because these
          * ranges are computed from cached search-flights results, not a
          * live quote. BF-0R-7.2 Phase G: hidden with zero results — the
          * range is otherwise just the unused [0, 10000] default
          * placeholder, not a real provider-derived range. */}
        {hasResults && (
          <FilterSection title="Recent fare">
            <div className="px-1">
              <Slider
                value={filters.priceRange}
                min={filters.minPrice}
                max={filters.maxPrice}
                step={10}
                onValueChange={(value) => onFilterChange('priceRange', value as [number, number])}
                className="mb-3"
              />
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">{currency}{filters.priceRange[0]}</span>
                <span className="font-medium text-foreground">{currency}{filters.priceRange[1]}</span>
              </div>
            </div>
          </FilterSection>
        )}

        {/* Stops — BF-0R-7.2 Phase G: hidden with zero results, since every
          * count would read 0 and none of them could filter anything. */}
        {hasResults && (
          <FilterSection title="Stops">
            <div className="space-y-2.5">
              {STOP_OPTIONS.map((option) => {
                const count = stopCounts[option.value] || 0;
                return (
                  <label
                    key={option.value}
                    className="flex items-center justify-between cursor-pointer group py-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id={`stop-${option.value}`}
                        checked={filters.selectedStops.includes(option.value)}
                        onCheckedChange={() =>
                          toggleArrayFilter(filters.selectedStops, option.value, (v) => onFilterChange('selectedStops', v))
                        }
                      />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors">
                        {option.label}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Airlines */}
        {airlines.length > 0 && (
          <FilterSection title="Airlines">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {airlines.map((airline) => (
                <label
                  key={airline.code}
                  className="flex items-center justify-between cursor-pointer group py-1"
                >
                  <div className="flex items-center gap-2.5">
                    <Checkbox
                      id={`airline-${airline.code}`}
                      checked={filters.selectedAirlines.includes(airline.code)}
                      onCheckedChange={() =>
                        toggleArrayFilter(filters.selectedAirlines, airline.code, (v) => onFilterChange('selectedAirlines', v))
                      }
                    />
                    <div className="flex items-center gap-2">
                      <img
                        src={getAirlineLogo(airline.code)}
                        alt=""
                        className="w-5 h-5 object-contain rounded"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="text-sm text-foreground group-hover:text-primary transition-colors truncate max-w-[120px]">
                        {airline.name}
                      </span>
                    </div>
                  </div>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
                    {airline.count}
                  </span>
                </label>
              ))}
            </div>
          </FilterSection>
        )}

        {/* Departure Time — BF-0R-7.2 Phase G: hidden with zero results,
          * for the same reason as Stops above. */}
        {hasResults && (
          <FilterSection title="Departure Time">
            <div className="space-y-2.5">
              {DEPARTURE_TIME_SLOTS.map((slot) => {
                const count = departureCounts[slot.id] || 0;
                return (
                  <label
                    key={slot.id}
                    className="flex items-center justify-between cursor-pointer group py-1"
                  >
                    <div className="flex items-center gap-2.5">
                      <Checkbox
                        id={slot.id}
                        checked={filters.selectedDepartureTimes.includes(slot.id)}
                        onCheckedChange={() =>
                          toggleArrayFilter(filters.selectedDepartureTimes, slot.id, (v) => onFilterChange('selectedDepartureTimes', v))
                        }
                      />
                      <div>
                        <span className="text-sm text-foreground group-hover:text-primary transition-colors block">
                          {slot.label}
                        </span>
                        <span className="text-xs text-muted-foreground">{slot.time}</span>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full tabular-nums">
                      {count}
                    </span>
                  </label>
                );
              })}
            </div>
          </FilterSection>
        )}

        {/* Duration */}
        {hasResults && filters.maxDuration > 0 && (
          <FilterSection title="Duration" defaultOpen={false}>
            <div className="px-1">
              <Slider
                value={filters.durationRange}
                min={0}
                max={filters.maxDuration}
                step={15}
                onValueChange={(value) => onFilterChange('durationRange', value as [number, number])}
                className="mb-3"
              />
              <div className="flex justify-between text-sm">
                <span className="font-medium text-foreground">{formatDuration(filters.durationRange[0])}</span>
                <span className="font-medium text-foreground">{formatDuration(filters.durationRange[1])}</span>
              </div>
            </div>
          </FilterSection>
        )}
      </div>
    </div>
  );
};

export default FlightFiltersPanel;
