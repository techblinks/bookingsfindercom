import { useState } from "react";
import { Plane, Clock, ChevronDown, ChevronUp, ArrowRight, Leaf } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/hooks/useFlightSearch";
import { formatLiveFlightClock, formatLiveFlightDateLabel, isDifferentCalendarDay } from "@/lib/liveFlightFormat";
import type { LiveFlightItinerary } from "@/types/liveFlights";

export type LiveFlightCardAction =
  | { type: "choose"; label?: string; onAction: () => void }
  | { type: "booking"; label?: string; onAction: () => void }
  | { type: "none" };

interface LiveFlightCardProps {
  itinerary: LiveFlightItinerary;
  currencySymbol: string;
  action: LiveFlightCardAction;
}

/**
 * BF-FLIGHTS-LIVE-4 Phase L — native structured live flight result card.
 * Styling mirrors FlightCard.tsx (the cached-fare card) so live and cached
 * results don't look like two different products, but every field here
 * comes directly from a SerpApi live search (see serpapiFlights.ts) rather
 * than a cached Data API observation, and nothing shown is fabricated —
 * an absent provider field renders a neutral placeholder, never a guess.
 */
const LiveFlightCard = ({ itinerary, currencySymbol, action }: LiveFlightCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const firstSegment = itinerary.segments[0];
  const lastSegment = itinerary.segments[itinerary.segments.length - 1];

  const airlines = Array.from(new Set(itinerary.segments.map((s) => s.airline).filter((a): a is string => !!a)));
  const airlineLabel = airlines.length === 0 ? "Airline confirmed at booking" : airlines.length === 1 ? airlines[0] : "Multiple airlines";
  const logoUrl = firstSegment?.airlineLogoUrl ?? null;

  const departClock = formatLiveFlightClock(firstSegment?.departureAirport.time);
  const arriveClock = formatLiveFlightClock(lastSegment?.arrivalAirport.time);
  const arrivesNextDay = isDifferentCalendarDay(firstSegment?.departureAirport.time, lastSegment?.arrivalAirport.time);

  const layoverCodes = itinerary.layovers.map((l) => l.airportCode).filter(Boolean);
  const cabin = firstSegment?.travelClass ?? null;

  return (
    <article
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20",
        isExpanded && "ring-1 ring-primary/20",
      )}
    >
      <div className="p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Airline */}
          <div className="flex items-center gap-3 lg:w-44 shrink-0">
            <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={airlineLabel}
                  className="w-9 h-9 object-contain"
                  onError={() => setLogoError(true)}
                  loading="lazy"
                />
              ) : (
                <Plane className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate" title={airlineLabel}>
                {airlineLabel}
              </p>
              <p className="text-xs text-muted-foreground">{cabin || "Cabin confirmed at booking"}</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="flex-1 flex items-center gap-3 md:gap-4">
            <div className="text-center min-w-[72px]">
              <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight tabular-nums">{departClock}</p>
              <p className="text-xs font-medium text-muted-foreground uppercase">{firstSegment?.departureAirport.code || "---"}</p>
            </div>

            <div className="flex-1 flex flex-col items-center px-2 min-w-[100px]">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Clock className="h-3 w-3" />
                <span className="font-medium tabular-nums">
                  {itinerary.totalDurationMinutes ? formatDuration(itinerary.totalDurationMinutes) : "Duration confirmed at booking"}
                </span>
              </div>

              <div className="w-full relative py-1.5">
                <div className="w-full h-0.5 bg-border rounded-full relative">
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  {itinerary.stops > 0 && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 border border-card" />
                  )}
                  {itinerary.stops > 1 && (
                    <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 border border-card" />
                  )}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
              </div>

              <p className="text-xs font-medium mt-0.5">
                {itinerary.stops === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Direct</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    {itinerary.stops} stop{itinerary.stops > 1 ? "s" : ""}
                    {layoverCodes.length > 0 && <span className="text-muted-foreground font-normal"> · {layoverCodes.join(", ")}</span>}
                  </span>
                )}
              </p>
            </div>

            <div className="text-center min-w-[72px]">
              <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight tabular-nums">
                {arriveClock}
                {arrivesNextDay && <span className="text-xs font-semibold text-muted-foreground align-top ml-0.5">+1</span>}
              </p>
              <p className="text-xs font-medium text-muted-foreground uppercase">{lastSegment?.arrivalAirport.code || "---"}</p>
            </div>
          </div>

          {/* Price + CTA */}
          <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-5 lg:min-w-[160px] shrink-0">
            <div className="text-right space-y-1">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Live price</p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                {itinerary.price !== null ? (
                  <>
                    <span className="text-sm font-normal text-muted-foreground mr-0.5">{currencySymbol}</span>
                    {itinerary.price.toLocaleString()}
                  </>
                ) : (
                  <span className="text-base font-medium text-muted-foreground">Price confirmed at booking</span>
                )}
              </p>
              {itinerary.carbonEmissionsGrams !== null && (
                <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
                  <Leaf className="h-3 w-3" />
                  {Math.round(itinerary.carbonEmissionsGrams / 1000)} kg CO₂e
                </p>
              )}
            </div>
            {action.type !== "none" && (
              <Button onClick={action.onAction} size="sm" className="lg:w-full gap-1.5">
                {action.label || (action.type === "choose" ? "Choose flight" : "See booking options")}
              </Button>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>Hide flight details<ChevronUp className="h-3.5 w-3.5" /></>
          ) : (
            <>Flight details<ChevronDown className="h-3.5 w-3.5" /></>
          )}
        </button>
      </div>

      {isExpanded && (
        <div className="border-t border-border bg-muted/30 p-4 md:p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-4">
            {itinerary.segments.map((segment, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                  {index < itinerary.segments.length - 1 && <div className="w-0.5 flex-1 bg-border my-1" />}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatLiveFlightClock(segment.departureAirport.time)} · {segment.departureAirport.code}
                        {segment.departureAirport.name && (
                          <span className="text-xs text-muted-foreground ml-1">({segment.departureAirport.name})</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {formatLiveFlightDateLabel(segment.departureAirport.time)}
                        {" · "}
                        {segment.airline || "Airline confirmed at booking"} {segment.flightNumber || ""}
                        {segment.operatingAirline && ` · Operated by ${segment.operatingAirline}`}
                      </p>
                    </div>
                    {segment.durationMinutes !== null && (
                      <span className="text-xs text-muted-foreground">{formatDuration(segment.durationMinutes)}</span>
                    )}
                  </div>

                  <div className="mt-2">
                    <p className="text-sm font-medium text-foreground">
                      {formatLiveFlightClock(segment.arrivalAirport.time)} · {segment.arrivalAirport.code}
                      {segment.arrivalAirport.name && (
                        <span className="text-xs text-muted-foreground ml-1">({segment.arrivalAirport.name})</span>
                      )}
                      {segment.overnight && <span className="text-xs text-muted-foreground ml-1">(overnight)</span>}
                    </p>
                  </div>

                  {segment.aircraft && <p className="text-xs text-muted-foreground mt-2">Aircraft: {segment.aircraft}</p>}

                  {index < itinerary.layovers.length && (
                    <div
                      className={cn(
                        "mt-3 px-2 py-1.5 rounded-md text-xs",
                        (itinerary.layovers[index].durationMinutes ?? 0) > 480
                          ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          : "bg-muted text-muted-foreground",
                      )}
                    >
                      Layover: {itinerary.layovers[index].durationMinutes ? formatDuration(itinerary.layovers[index].durationMinutes!) : "duration confirmed at booking"} in{" "}
                      {itinerary.layovers[index].airportName || itinerary.layovers[index].airportCode}
                      {itinerary.layovers[index].overnight && " (overnight)"}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default LiveFlightCard;
