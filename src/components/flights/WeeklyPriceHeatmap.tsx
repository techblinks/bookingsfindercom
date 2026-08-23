import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Flame, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePriceCalendar, CalendarPrice } from "@/hooks/usePriceCalendar";
import {
  format,
  addDays,
  addWeeks,
  subWeeks,
  startOfWeek,
  isBefore,
  isAfter,
  startOfDay,
} from "date-fns";

interface WeeklyPriceHeatmapProps {
  origin: string;
  destination: string;
  selectedDate: string;
  /** Display symbol only (e.g. "A$") — see currencyCode for the ISO code sent to the API. */
  currency?: string;
  /**
   * BF-FLIGHTS-LIVE-2 Phase G: the resolved three-letter ISO currency code
   * (from useCurrencyPreference), forwarded to usePriceCalendar so the
   * Recent Fare Heatmap's request matches the currency it displays — see
   * the matching note on PriceCalendar.tsx.
   */
  currencyCode?: string;
  onWeekSelect: (startDate: string) => void;
}

interface WeekSummary {
  startDate: Date;
  endDate: Date;
  avgPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  daysWithPrices: number;
  label: string;
}

const WeeklyPriceHeatmap = ({
  origin,
  destination,
  selectedDate,
  currency = "$",
  currencyCode = "USD",
  onWeekSelect,
}: WeeklyPriceHeatmapProps) => {
  const today = startOfDay(new Date());
  const baseDate = selectedDate ? new Date(selectedDate) : today;
  const [offset, setOffset] = useState(0);

  // We need 2 months of data to cover ~8 weeks. Fetch current and next month.
  const viewStart = addWeeks(startOfWeek(baseDate, { weekStartsOn: 1 }), offset);
  const month1 = format(viewStart, "yyyy-MM");
  const month2 = format(addDays(viewStart, 42), "yyyy-MM");

  const { prices: prices1, isLoading: loading1 } = usePriceCalendar({
    origin,
    destination,
    month: month1,
    currency: currencyCode,
    enabled: !!origin && !!destination,
  });

  const { prices: prices2, isLoading: loading2 } = usePriceCalendar({
    origin,
    destination,
    month: month2,
    currency: currencyCode,
    enabled: !!origin && !!destination && month2 !== month1,
  });

  const isLoading = loading1 || loading2;

  // Merge price data
  const priceMap = useMemo(() => {
    const map: Record<string, number> = {};
    [...prices1, ...prices2].forEach((p) => {
      if (p.price > 0) map[p.date] = p.price;
    });
    return map;
  }, [prices1, prices2]);

  // Build 8 week summaries
  const weeks = useMemo<WeekSummary[]>(() => {
    const result: WeekSummary[] = [];
    for (let w = 0; w < 8; w++) {
      const weekStart = addWeeks(viewStart, w);
      const weekEnd = addDays(weekStart, 6);
      const dayPrices: number[] = [];

      for (let d = 0; d < 7; d++) {
        const day = addDays(weekStart, d);
        const dateStr = format(day, "yyyy-MM-dd");
        if (priceMap[dateStr] !== undefined) {
          dayPrices.push(priceMap[dateStr]);
        }
      }

      result.push({
        startDate: weekStart,
        endDate: weekEnd,
        avgPrice: dayPrices.length > 0 ? Math.round(dayPrices.reduce((a, b) => a + b, 0) / dayPrices.length) : null,
        minPrice: dayPrices.length > 0 ? Math.min(...dayPrices) : null,
        maxPrice: dayPrices.length > 0 ? Math.max(...dayPrices) : null,
        daysWithPrices: dayPrices.length,
        label: `${format(weekStart, "MMM d")} – ${format(weekEnd, "MMM d")}`,
      });
    }
    return result;
  }, [viewStart, priceMap]);

  // Find global min/max for heatmap coloring
  const globalMin = useMemo(() => {
    const avgs = weeks.map((w) => w.avgPrice).filter((p): p is number => p !== null);
    return avgs.length > 0 ? Math.min(...avgs) : null;
  }, [weeks]);

  const globalMax = useMemo(() => {
    const avgs = weeks.map((w) => w.avgPrice).filter((p): p is number => p !== null);
    return avgs.length > 0 ? Math.max(...avgs) : null;
  }, [weeks]);

  const getHeatColor = (avg: number | null): string => {
    if (avg === null || globalMin === null || globalMax === null) return "bg-muted/40";
    if (globalMax === globalMin) return "bg-emerald-100 dark:bg-emerald-900/30";

    const ratio = (avg - globalMin) / (globalMax - globalMin);

    if (ratio <= 0.15) return "bg-emerald-100 dark:bg-emerald-900/40 border-emerald-300 dark:border-emerald-700";
    if (ratio <= 0.35) return "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800";
    if (ratio <= 0.55) return "bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800";
    if (ratio <= 0.75) return "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800";
    return "bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800";
  };

  const getTextColor = (avg: number | null): string => {
    if (avg === null || globalMin === null || globalMax === null) return "text-muted-foreground";
    if (globalMax === globalMin) return "text-emerald-700 dark:text-emerald-300";

    const ratio = (avg - globalMin) / (globalMax - globalMin);

    if (ratio <= 0.15) return "text-emerald-700 dark:text-emerald-300";
    if (ratio <= 0.35) return "text-emerald-600 dark:text-emerald-400";
    if (ratio <= 0.55) return "text-sky-700 dark:text-sky-300";
    if (ratio <= 0.75) return "text-amber-700 dark:text-amber-300";
    return "text-orange-700 dark:text-orange-300";
  };

  const cheapestWeek = useMemo(() => {
    let best: WeekSummary | null = null;
    weeks.forEach((w) => {
      if (w.avgPrice !== null && (best === null || w.avgPrice < best.avgPrice!)) {
        best = w;
      }
    });
    return best;
  }, [weeks]);

  const canGoPrev = !isBefore(addWeeks(viewStart, -1), today);

  const isSelectedWeek = (week: WeekSummary) => {
    if (!selectedDate) return false;
    const sel = new Date(selectedDate);
    return !isBefore(sel, week.startDate) && !isAfter(sel, week.endDate);
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-primary" />
          {/* BF-0R-7.1 Phase C/E: same get-price-calendar contract as
            * PriceCalendar.tsx — origin/destination/month/currency only. */}
          <h3 className="text-sm font-semibold text-foreground">Recent Fare Heatmap</h3>
          {cheapestWeek && cheapestWeek.avgPrice && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingDown className="h-3 w-3" />
              Best week avg {currency}{cheapestWeek.avgPrice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            disabled={!canGoPrev}
            onClick={() => setOffset((o) => o - 4)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOffset((o) => o + 4)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading weekly prices...</span>
        </div>
      ) : (
        <>
          {/* Heatmap Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {weeks.map((week) => {
              const isPast = isBefore(week.endDate, today);
              const selected = isSelectedWeek(week);
              const isCheapest = cheapestWeek && week.avgPrice === cheapestWeek.avgPrice && week.avgPrice !== null;
              const disabled = isPast || week.avgPrice === null;

              return (
                <button
                  key={week.label}
                  disabled={disabled}
                  onClick={() => {
                    if (!disabled) {
                      const selectDate = isBefore(week.startDate, today)
                        ? format(today, "yyyy-MM-dd")
                        : format(week.startDate, "yyyy-MM-dd");
                      onWeekSelect(selectDate);
                    }
                  }}
                  className={cn(
                    "relative rounded-xl border p-3 transition-all text-left",
                    getHeatColor(week.avgPrice),
                    disabled && "opacity-35 cursor-default",
                    !disabled && "cursor-pointer hover:scale-[1.02] hover:shadow-md",
                    selected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                    isCheapest && !selected && "ring-1 ring-emerald-400 dark:ring-emerald-600"
                  )}
                >
                  {isCheapest && (
                    <span className="absolute -top-2 right-2 text-[10px] font-bold bg-emerald-500 text-white px-2 py-0.5 rounded-full">
                      Best
                    </span>
                  )}
                  <p className="text-[11px] text-muted-foreground font-medium mb-1 truncate">
                    {week.label}
                  </p>
                  {week.avgPrice !== null ? (
                    <>
                      <p className={cn("text-lg font-bold tabular-nums", getTextColor(week.avgPrice))}>
                        {currency}{week.avgPrice}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-muted-foreground">avg/day</span>
                        {week.minPrice !== null && week.minPrice !== week.avgPrice && (
                          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
                            low {currency}{week.minPrice}
                          </span>
                        )}
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mt-1">No data</p>
                  )}
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-4 text-[11px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700" />
              <span>Cheapest</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800" />
              <span>Average</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800" />
              <span>Expensive</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WeeklyPriceHeatmap;