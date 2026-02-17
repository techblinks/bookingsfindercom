import { useState } from "react";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface DatePrice {
  date: string;
  price: number | null;
  isCheapest?: boolean;
  isSelected?: boolean;
}

interface FlexibleDatesMatrixProps {
  dates: DatePrice[];
  selectedDate: string;
  currency?: string;
  onDateSelect: (date: string) => void;
  onExpand?: () => void;
}

const FlexibleDatesMatrix = ({
  dates,
  selectedDate,
  currency = "$",
  onDateSelect,
  onExpand,
}: FlexibleDatesMatrixProps) => {
  const [startIndex, setStartIndex] = useState(0);
  const visibleCount = 7;

  const visibleDates = dates.slice(startIndex, startIndex + visibleCount);
  const canGoBack = startIndex > 0;
  const canGoForward = startIndex + visibleCount < dates.length;

  const cheapestPrice = Math.min(
    ...dates.filter(d => d.price !== null).map(d => d.price as number)
  );

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return {
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        date: date.getDate(),
      };
    } catch {
      return { day: '--', date: '--' };
    }
  };

  const getStyle = (price: number | null, isSelected: boolean) => {
    if (isSelected) {
      return "bg-primary text-primary-foreground ring-2 ring-primary/30";
    }
    if (price === null) {
      return "bg-muted/30 text-muted-foreground opacity-50 cursor-not-allowed";
    }
    if (price === cheapestPrice) {
      return "bg-accent/15 text-accent-foreground ring-1 ring-accent/40 hover:ring-accent";
    }
    if (price <= cheapestPrice * 1.1) {
      return "bg-primary/5 text-foreground ring-1 ring-primary/20 hover:ring-primary/40";
    }
    return "bg-secondary/50 text-foreground ring-1 ring-border hover:ring-primary/30";
  };

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Flexible Dates</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStartIndex(prev => Math.max(0, prev - 1))}
            disabled={!canGoBack}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors native-touch"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={() => setStartIndex(prev => Math.min(dates.length - visibleCount, prev + 1))}
            disabled={!canGoForward}
            className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary disabled:opacity-30 transition-colors native-touch"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Date cards - horizontal scroll on mobile, grid on desktop */}
      <div className="px-4 pb-3">
        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide sm:grid sm:grid-cols-7 sm:overflow-visible">
          {visibleDates.map((datePrice) => {
            const formatted = formatDate(datePrice.date);
            const isSelected = datePrice.date === selectedDate;
            const isCheapest = datePrice.price === cheapestPrice && !isSelected;

            return (
              <button
                key={datePrice.date}
                onClick={() => datePrice.price !== null && onDateSelect(datePrice.date)}
                disabled={datePrice.price === null}
                className={cn(
                  "flex flex-col items-center justify-center min-w-[48px] py-2.5 px-2 rounded-xl transition-all duration-200 native-touch",
                  getStyle(datePrice.price, isSelected)
                )}
              >
                <span className={cn(
                  "text-[10px] uppercase font-semibold tracking-wide",
                  isSelected ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {formatted.day}
                </span>
                <span className={cn(
                  "text-base font-bold leading-tight mt-0.5",
                  isSelected && "text-primary-foreground"
                )}>
                  {formatted.date}
                </span>
                {datePrice.price !== null ? (
                  <span className={cn(
                    "text-[11px] font-bold mt-1 tabular-nums",
                    isSelected && "text-primary-foreground/90",
                    isCheapest && "text-accent"
                  )}>
                    {currency}{datePrice.price}
                  </span>
                ) : (
                  <span className="text-[11px] text-muted-foreground mt-1">—</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Legend - minimal */}
      <div className="flex items-center justify-center gap-5 px-4 py-2.5 border-t border-border/50 bg-secondary/30">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-accent/40 ring-1 ring-accent/60" />
          <span className="text-[10px] font-medium text-muted-foreground">Cheapest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary/20 ring-1 ring-primary/40" />
          <span className="text-[10px] font-medium text-muted-foreground">Good price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-primary" />
          <span className="text-[10px] font-medium text-muted-foreground">Selected</span>
        </div>
      </div>
    </div>
  );
};

export default FlexibleDatesMatrix;
