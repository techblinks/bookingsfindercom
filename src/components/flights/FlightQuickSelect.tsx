import { useMemo } from "react";
import { Zap, TrendingDown, Star } from "lucide-react";
import { cn } from "@/lib/utils";
import { Flight } from "@/types/flight";
import { formatDuration } from "@/hooks/useFlightSearch";
import { motion } from "framer-motion";

interface FlightQuickSelectProps {
  flights: Flight[];
  currency?: string;
  onSelect: (flightId: string) => void;
  activeId?: string;
}

interface QuickOption {
  id: string;
  label: string;
  sublabel: string;
  price: number;
  detail: string;
  icon: React.ReactNode;
  flight: Flight;
  accent: string;
}

const FlightQuickSelect = ({ flights, currency = "$", onSelect, activeId }: FlightQuickSelectProps) => {
  const options = useMemo<QuickOption[]>(() => {
    if (flights.length === 0) return [];

    const cheapest = flights.reduce((a, b) => (a.price < b.price ? a : b));
    const fastest = flights.reduce((a, b) => (a.duration_minutes < b.duration_minutes ? a : b));
    const best = flights.reduce((a, b) => {
      const scoreA = (a.deal_score ?? 50) + (a.stops === 0 ? 10 : 0);
      const scoreB = (b.deal_score ?? 50) + (b.stops === 0 ? 10 : 0);
      return scoreA > scoreB ? a : b;
    });

    const opts: QuickOption[] = [
      {
        id: "best",
        label: "Best",
        sublabel: "Score + comfort",
        price: best.price,
        detail: `${formatDuration(best.duration_minutes)} · ${best.stops === 0 ? "Direct" : `${best.stops} stop`}`,
        icon: <Star className="h-4 w-4" />,
        flight: best,
        accent: "text-primary border-primary/30 bg-primary/5",
      },
      {
        id: "cheapest",
        label: "Cheapest",
        sublabel: "Lowest fare",
        price: cheapest.price,
        detail: `${formatDuration(cheapest.duration_minutes)} · ${cheapest.stops === 0 ? "Direct" : `${cheapest.stops} stop`}`,
        icon: <TrendingDown className="h-4 w-4" />,
        flight: cheapest,
        accent: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
      },
      {
        id: "fastest",
        label: "Fastest",
        sublabel: "Shortest time",
        price: fastest.price,
        detail: `${formatDuration(fastest.duration_minutes)} · ${fastest.stops === 0 ? "Direct" : `${fastest.stops} stop`}`,
        icon: <Zap className="h-4 w-4" />,
        flight: fastest,
        accent: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5",
      },
    ];

    // Deduplicate if same flight appears in multiple categories
    const seen = new Set<string>();
    return opts.filter((o) => {
      if (seen.has(o.flight.id)) return true; // keep duplicates for display
      seen.add(o.flight.id);
      return true;
    });
  }, [flights]);

  if (options.length === 0) return null;

  return (
    <div className="grid grid-cols-3 gap-2 md:gap-3">
      {options.map((opt, i) => {
        const isActive = activeId === opt.flight.id;
        return (
          <motion.button
            key={opt.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, duration: 0.25 }}
            onClick={() => onSelect(opt.flight.id)}
            className={cn(
              "relative rounded-xl border p-3 md:p-4 text-left transition-all duration-200 cursor-pointer",
              "hover:shadow-md hover:scale-[1.01]",
              isActive
                ? `${opt.accent} border-2 shadow-sm`
                : "border-border bg-card hover:border-primary/20"
            )}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <span className={cn("shrink-0", opt.accent.split(" ")[0])}>
                {opt.icon}
              </span>
              <span className="text-sm font-semibold text-foreground">{opt.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground tabular-nums leading-tight">
              <span className="text-xs font-normal text-muted-foreground mr-0.5">{currency}</span>
              {opt.price.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{opt.detail}</p>
          </motion.button>
        );
      })}
    </div>
  );
};

export default FlightQuickSelect;
