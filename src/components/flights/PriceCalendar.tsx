import { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Calendar, TrendingDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePriceCalendar, CalendarPrice } from "@/hooks/usePriceCalendar";
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, addMonths, subMonths, isToday, isBefore } from "date-fns";

interface PriceCalendarProps {
  origin: string;
  destination: string;
  selectedDate: string;
  currency?: string;
  onDateSelect: (date: string) => void;
}

const PriceCalendar = ({ origin, destination, selectedDate, currency = "$", onDateSelect }: PriceCalendarProps) => {
  const today = new Date();
  const initialMonth = selectedDate ? new Date(selectedDate) : today;
  const [currentMonth, setCurrentMonth] = useState(initialMonth);

  const monthStr = format(currentMonth, "yyyy-MM");

  const { prices, isLoading, error } = usePriceCalendar({
    origin,
    destination,
    month: monthStr,
    enabled: !!origin && !!destination,
  });

  // Build a map of date -> price
  const priceMap = useMemo(() => {
    const map: Record<string, CalendarPrice> = {};
    prices.forEach((p) => {
      map[p.date] = p;
    });
    return map;
  }, [prices]);

  const cheapestPrice = useMemo(() => {
    const vals = prices.map((p) => p.price).filter((p) => p > 0);
    return vals.length > 0 ? Math.min(...vals) : null;
  }, [prices]);

  // Build calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const weeks: Date[][] = [];
  let day = calStart;
  while (day <= calEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(day);
      day = addDays(day, 1);
    }
    weeks.push(week);
  }

  const getPriceColor = (price: number) => {
    if (!cheapestPrice) return "";
    if (price === cheapestPrice) return "text-emerald-600 dark:text-emerald-400 font-bold";
    if (price <= cheapestPrice * 1.15) return "text-blue-600 dark:text-blue-400";
    if (price <= cheapestPrice * 1.4) return "text-foreground";
    return "text-orange-600 dark:text-orange-400";
  };

  const getCellBg = (dateStr: string, price: number | undefined, inMonth: boolean) => {
    if (!inMonth) return "bg-transparent";
    const sel = selectedDate === dateStr;
    if (sel) return "bg-primary text-primary-foreground";
    if (price === undefined) return "hover:bg-muted/60";
    if (price === cheapestPrice) return "bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/40";
    return "hover:bg-muted/60";
  };

  const canGoPrev = !isBefore(subMonths(currentMonth, 1), startOfMonth(today));

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          {/* BF-0R-7.1 Phase C/E: get-price-calendar's request contract is
            * origin/destination/month/currency only — no passenger or cabin
            * data — so these are recent route-level fare observations, not
            * a live or traveller-specific quote. */}
          <h3 className="text-sm font-semibold text-foreground">Recent Fare Calendar</h3>
          {cheapestPrice && (
            <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
              <TrendingDown className="h-3 w-3" />
              Recent from {currency}{cheapestPrice}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={!canGoPrev} onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium min-w-[120px] text-center">{format(currentMonth, "MMMM yyyy")}</span>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Loading prices...</span>
        </div>
      ) : (
        <div className="space-y-0.5">
          {weeks.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 gap-0.5">
              {week.map((d) => {
                const inMonth = isSameMonth(d, currentMonth);
                const dateStr = format(d, "yyyy-MM-dd");
                const priceData = priceMap[dateStr];
                const price = priceData?.price;
                const isPast = isBefore(d, today) && !isToday(d);
                const isSelected = selectedDate === dateStr;
                const disabled = !inMonth || isPast || price === undefined;

                return (
                  <button
                    key={dateStr}
                    disabled={disabled}
                    onClick={() => !disabled && onDateSelect(dateStr)}
                    className={cn(
                      "relative flex flex-col items-center justify-center py-1.5 rounded-lg transition-all text-center min-h-[52px]",
                      getCellBg(dateStr, price, inMonth),
                      disabled && "opacity-40 cursor-default",
                      !disabled && "cursor-pointer",
                      isSelected && "ring-2 ring-primary ring-offset-1 ring-offset-background",
                      isToday(d) && !isSelected && "ring-1 ring-accent"
                    )}
                  >
                    <span className={cn(
                      "text-xs",
                      !inMonth && "text-muted-foreground/40",
                      isSelected && "text-primary-foreground font-bold",
                    )}>
                      {format(d, "d")}
                    </span>
                    {inMonth && price !== undefined && (
                      <span className={cn(
                        "text-[10px] tabular-nums leading-tight mt-0.5",
                        isSelected ? "text-primary-foreground" : getPriceColor(price)
                      )}>
                        {currency}{price}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {/* Legend */}
      {!isLoading && prices.length > 0 && (
        <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700" />
            <span>Cheapest</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-primary" />
            <span>Selected</span>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-destructive text-center mt-2">{error}</p>
      )}
    </div>
  );
};

export default PriceCalendar;
