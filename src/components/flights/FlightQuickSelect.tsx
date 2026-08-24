import { useMemo } from "react";
import { Zap, TrendingDown, Route } from "lucide-react";
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

/** A price of 0 is this codebase's established "missing/invalid" sentinel — never a real fare. */
function hasValidPrice(flight: Flight): boolean {
  return Number.isFinite(flight.price) && flight.price > 0;
}

/** duration_minutes === 0 means "unknown" (same sentinel convention as price). */
function hasValidDuration(flight: Flight): boolean {
  return Number.isFinite(flight.duration_minutes) && flight.duration_minutes > 0;
}

const FlightQuickSelect = ({ flights, currency = "$", onSelect, activeId }: FlightQuickSelectProps) => {
  // BF-0R-7.1 Phase C: labels say "Recent" because every price here comes
  // from Travelpayouts' cached prices_for_dates observations, not a live
  // quote — see FlightCard.tsx's "Recent fare found" wording for the same
  // reason at the card level.
  //
  // BF-FLIGHTS-CACHE-1 (Quick-select truth fix): no "Recent best" option.
  // Travelpayouts' cached observations carry no provider-defined ranking,
  // and the previous "best" pick used a BookingsFinder-invented
  // deal_score + direct-flight bonus presented as if it were an objective
  // recommendation. Only sorts directly justified by returned data
  // (price, duration, stop count) are offered — matching the Recent
  // Flight Options sort contract (useFlightSearch.ts).
  const options = useMemo<QuickOption[]>(() => {
    if (flights.length === 0) return [];

    // Cheapest: only ever chosen from flights with a valid, finite,
    // positive price — an invalid/missing price can never win, and if NO
    // flight has one, this quick option is omitted rather than fabricated.
    // Ties keep the earlier (provider-order) flight, since reduce's `<=`
    // keeps the accumulator (the earlier-seen candidate) on an exact tie.
    const validPriceFlights = flights.filter(hasValidPrice);
    const cheapest = validPriceFlights.length > 0
      ? validPriceFlights.reduce((a, b) => (a.price <= b.price ? a : b))
      : null;

    // Fastest: only ever chosen from flights with a valid, finite,
    // positive duration — duration_minutes === 0 ("unknown") can never
    // win, and if no flight has a known duration, this option is omitted.
    const validDurationFlights = flights.filter(hasValidDuration);
    const fastest = validDurationFlights.length > 0
      ? validDurationFlights.reduce((a, b) => (a.duration_minutes <= b.duration_minutes ? a : b))
      : null;

    // Fewest stops: stops is always a genuine, present field (never a
    // "missing" sentinel the way price/duration can be 0) — the lowest
    // stop count always wins and this option is never omitted. On a tie,
    // a valid lower price breaks it; if neither/only one has a valid
    // price, the earlier (provider-order) flight is kept.
    const fewestStops = flights.reduce((a, b) => {
      if (a.stops !== b.stops) return a.stops < b.stops ? a : b;
      if (hasValidPrice(a) && hasValidPrice(b)) return a.price <= b.price ? a : b;
      return a;
    });

    const opts: QuickOption[] = [];

    if (cheapest) {
      opts.push({
        id: "cheapest",
        label: "Recent cheapest",
        sublabel: "Lowest fare",
        price: cheapest.price,
        detail: `${formatDuration(cheapest.duration_minutes)} · ${cheapest.stops === 0 ? "Direct" : `${cheapest.stops} stop`}`,
        icon: <TrendingDown className="h-4 w-4" />,
        flight: cheapest,
        accent: "text-emerald-600 dark:text-emerald-400 border-emerald-500/30 bg-emerald-500/5",
      });
    }

    if (fastest) {
      opts.push({
        id: "fastest",
        label: "Recent fastest fare",
        sublabel: "Shortest time",
        price: fastest.price,
        detail: `${formatDuration(fastest.duration_minutes)} · ${fastest.stops === 0 ? "Direct" : `${fastest.stops} stop`}`,
        icon: <Zap className="h-4 w-4" />,
        flight: fastest,
        accent: "text-amber-600 dark:text-amber-400 border-amber-500/30 bg-amber-500/5",
      });
    }

    opts.push({
      id: "stops",
      label: "Recent fewest stops",
      sublabel: "Fewest connections",
      price: fewestStops.price,
      detail: `${formatDuration(fewestStops.duration_minutes)} · ${fewestStops.stops === 0 ? "Direct" : `${fewestStops.stops} stop`}`,
      icon: <Route className="h-4 w-4" />,
      flight: fewestStops,
      accent: "text-sky-600 dark:text-sky-400 border-sky-500/30 bg-sky-500/5",
    });

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
            {opt.price > 0 ? (
              <p className="text-xl md:text-2xl font-bold text-foreground tabular-nums leading-tight">
                <span className="text-xs font-normal text-muted-foreground mr-0.5">{currency}</span>
                {opt.price.toLocaleString()}
              </p>
            ) : (
              <p className="text-sm font-medium text-muted-foreground leading-tight">Price confirmed at booking</p>
            )}
            <p className="text-xs text-muted-foreground mt-1 truncate">{opt.detail}</p>
          </motion.button>
        );
      })}
    </div>
  );
};

export default FlightQuickSelect;
