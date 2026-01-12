import { useState } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
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
        month: date.toLocaleDateString('en-US', { month: 'short' }),
      };
    } catch {
      return { day: '--', date: '--', month: '--' };
    }
  };

  const getColorClass = (price: number | null, isSelected: boolean) => {
    if (isSelected) {
      return "bg-primary text-primary-foreground border-primary";
    }
    if (price === null) {
      return "bg-muted/50 text-muted-foreground border-border cursor-not-allowed";
    }
    if (price === cheapestPrice) {
      return "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700 hover:border-emerald-500";
    }
    if (price <= cheapestPrice * 1.1) {
      return "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:border-blue-400";
    }
    return "bg-card border-border hover:border-primary/50";
  };

  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">Flexible Dates</h3>
        </div>
        {onExpand && (
          <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onExpand}>
            View calendar
          </Button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setStartIndex(prev => Math.max(0, prev - 1))}
          disabled={!canGoBack}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>

        <div className="flex-1 grid grid-cols-7 gap-1.5">
          {visibleDates.map((datePrice) => {
            const formatted = formatDate(datePrice.date);
            const isSelected = datePrice.date === selectedDate;
            const isCheapest = datePrice.price === cheapestPrice;

            return (
              <button
                key={datePrice.date}
                onClick={() => datePrice.price !== null && onDateSelect(datePrice.date)}
                disabled={datePrice.price === null}
                className={cn(
                  "flex flex-col items-center p-2 rounded-lg border transition-all duration-200",
                  getColorClass(datePrice.price, isSelected)
                )}
              >
                <span className="text-[10px] uppercase font-medium opacity-75">
                  {formatted.day}
                </span>
                <span className="text-sm font-bold">{formatted.date}</span>
                {datePrice.price !== null ? (
                  <span className={cn(
                    "text-xs font-semibold mt-0.5 tabular-nums",
                    isCheapest && !isSelected && "text-emerald-600 dark:text-emerald-400"
                  )}>
                    {currency}{datePrice.price}
                  </span>
                ) : (
                  <span className="text-xs text-muted-foreground mt-0.5">--</span>
                )}
              </button>
            );
          })}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          onClick={() => setStartIndex(prev => Math.min(dates.length - visibleCount, prev + 1))}
          disabled={!canGoForward}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-center gap-4 mt-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-emerald-100 dark:bg-emerald-900/40 border border-emerald-300 dark:border-emerald-700" />
          <span>Cheapest</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800" />
          <span>Good price</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-sm bg-primary" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
};

export default FlexibleDatesMatrix;
