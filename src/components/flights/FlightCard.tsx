import { useState } from "react";
import { Plane, Clock, ChevronDown, ChevronUp, Luggage, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flight } from "@/types/flight";
import { formatDuration } from "@/hooks/useFlightSearch";
import { getAirlineLogo, getAirlineName } from "@/lib/airlineLogos";
import { getAirportTimezone, calculateDayDifference, formatDayDifference } from "@/lib/timezones";
import { cn } from "@/lib/utils";
import DealScoreBadge from "./DealScoreBadge";
import PriceConfidenceIndicator from "./PriceConfidenceIndicator";
import FlightWarningBadges from "./FlightWarningBadges";

interface FlightCardProps {
  flight: Flight;
  currency?: string;
  onBookNow: (flightId: string) => void;
}

const FlightCard = ({ flight, currency = "$", onBookNow }: FlightCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [logoError, setLogoError] = useState(false);

  const logoUrl = getAirlineLogo(flight.airline_code);
  const airlineName = getAirlineName(flight.airline_code) || flight.airline;

  // Get first and last segment for display
  const firstSegment = flight.segments[0];
  const lastSegment = flight.segments[flight.segments.length - 1];

  // Get timezone info for departure and arrival airports
  const departureTimezone = getAirportTimezone(firstSegment?.from || "");
  const arrivalTimezone = getAirportTimezone(lastSegment?.to || "");

  // Format times
  const formatTime = (isoString: string | null | undefined): string => {
    if (!isoString) return "";
    try {
      if (isoString.includes('T') || isoString.includes('-')) {
        const date = new Date(isoString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
      }
      return isoString;
    } catch {
      return isoString;
    }
  };

  // Calculate arrival time and date from departure + duration if not provided
  const calculateArrivalInfo = (): { time: string; dayDiff: number } => {
    const departTime = firstSegment?.depart_time;
    const durationMinutes = flight.duration_minutes;
    const destinationCode = lastSegment?.to;
    
    // If we have arrive_time in the last segment, use it
    if (lastSegment?.arrive_time) {
      const dayDiff = departTime ? calculateDayDifference(departTime, durationMinutes, destinationCode) : 0;
      return {
        time: formatTime(lastSegment.arrive_time),
        dayDiff
      };
    }
    
    // Otherwise calculate from departure + duration
    if (departTime && durationMinutes > 0) {
      try {
        const departure = new Date(departTime);
        const arrival = new Date(departure.getTime() + durationMinutes * 60 * 1000);
        const dayDiff = calculateDayDifference(departTime, durationMinutes, destinationCode);
        
        return {
          time: arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          dayDiff
        };
      } catch {
        return { time: "", dayDiff: 0 };
      }
    }
    
    return { time: "", dayDiff: 0 };
  };

  const departureTime = formatTime(firstSegment?.depart_time || "");
  const arrivalInfo = calculateArrivalInfo();
  const arrivalTime = arrivalInfo.time;
  const dayDiffLabel = formatDayDifference(arrivalInfo.dayDiff);

  // Get layover cities
  const layoverCities = flight.layover_cities || 
    (flight.stops > 0 && flight.segments.length > 1 
      ? flight.segments.slice(0, -1).map(s => s.to)
      : []);

  // Check for long layovers
  const hasWarnings = flight.warnings && flight.warnings.length > 0;

  return (
    <article 
      className={cn(
        "bg-card rounded-xl border border-border shadow-sm transition-all duration-200 hover:shadow-md hover:border-primary/20",
        isExpanded && "ring-1 ring-primary/20"
      )}
    >
      {/* Main Card Content */}
      <div className="p-4 md:p-5">
        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          {/* Airline Info + Deal Score */}
          <div className="flex items-center gap-3 lg:w-44 shrink-0">
            <div className="w-11 h-11 rounded-lg bg-muted flex items-center justify-center overflow-hidden shrink-0">
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={airlineName}
                  className="w-9 h-9 object-contain"
                  onError={() => setLogoError(true)}
                  loading="lazy"
                />
              ) : (
                <Plane className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground truncate" title={airlineName}>
                {airlineName}
              </p>
              <p className="text-xs text-muted-foreground">
                {flight.cabin_class || "Economy"}
              </p>
            </div>
          </div>

          {/* Flight Timeline */}
          <div className="flex-1 flex items-center gap-3 md:gap-4">
            {/* Departure */}
            <div className="text-center min-w-[72px]">
              <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight tabular-nums">
                {departureTime || "--:--"}
              </p>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {firstSegment?.from || "---"}
              </p>
              {departureTimezone && (
                <p className="text-[10px] text-muted-foreground/70" title={departureTimezone.name}>
                  {departureTimezone.abbr}
                </p>
              )}
            </div>

            {/* Timeline */}
            <div className="flex-1 flex flex-col items-center px-2 min-w-[100px]">
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1.5">
                <Clock className="h-3 w-3" />
                <span className="font-medium tabular-nums">{formatDuration(flight.duration_minutes)}</span>
                {hasWarnings && (
                  <FlightWarningBadges warnings={flight.warnings!} compact />
                )}
              </div>
              
              <div className="w-full relative py-1.5">
                <div className="w-full h-0.5 bg-border rounded-full relative">
                  {/* Start dot */}
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                  
                  {/* Stop indicators */}
                  {flight.stops > 0 && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 border border-card" />
                  )}
                  {flight.stops > 1 && (
                    <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-amber-500 border border-card" />
                  )}
                  
                  {/* End arrow */}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2">
                    <ArrowRight className="h-3.5 w-3.5 text-primary" />
                  </div>
                </div>
              </div>

              <p className="text-xs font-medium mt-0.5">
                {flight.stops === 0 ? (
                  <span className="text-emerald-600 dark:text-emerald-400">Direct</span>
                ) : (
                  <span className="text-amber-600 dark:text-amber-400">
                    {flight.stops} stop{flight.stops > 1 ? 's' : ''}
                    {layoverCities.length > 0 && (
                      <span className="text-muted-foreground font-normal"> · {layoverCities.join(', ')}</span>
                    )}
                  </span>
                )}
              </p>
            </div>

            {/* Arrival */}
            <div className="text-center min-w-[72px]">
              <div className="flex items-baseline justify-center gap-0.5">
                <p className="text-xl md:text-2xl font-bold text-foreground tracking-tight tabular-nums">
                  {arrivalTime || "--:--"}
                </p>
                {dayDiffLabel && (
                  <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                    {dayDiffLabel}
                  </span>
                )}
              </div>
              <p className="text-xs font-medium text-muted-foreground uppercase">
                {lastSegment?.to || "---"}
              </p>
              {arrivalTimezone && (
                <p className="text-[10px] text-muted-foreground/70" title={arrivalTimezone.name}>
                  {arrivalTimezone.abbr}
                </p>
              )}
            </div>
          </div>

          {/* Price, Deal Score & Action */}
          <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-5 lg:min-w-[160px] shrink-0">
            <div className="text-right space-y-1">
              {/* Deal Score Badge */}
              {flight.deal_score !== undefined && (
                <div className="mb-1.5">
                  <DealScoreBadge score={flight.deal_score} size="sm" showLabel={false} />
                </div>
              )}
              
              {/* Legacy deal badge fallback */}
              {flight.is_deal && !flight.deal_score && (
                <span className="inline-block bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-semibold px-2 py-0.5 rounded-full mb-1">
                  Best Deal
                </span>
              )}
              
              <p className="text-2xl font-bold text-foreground tabular-nums">
                <span className="text-sm font-normal text-muted-foreground mr-0.5">{currency}</span>
                {flight.price.toLocaleString()}
              </p>
              
              {/* Price Confidence */}
              {flight.price_confidence && (
                <PriceConfidenceIndicator
                  confidence={flight.price_confidence}
                  trend={flight.price_trend}
                  compact
                />
              )}
              
              <p className="text-xs text-muted-foreground">per person</p>
            </div>
            <Button
              onClick={() => onBookNow(flight.id)}
              size="sm"
              className="lg:w-full gap-1.5"
            >
              Book Now
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Expand Button */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="mt-3 flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              Hide details
              <ChevronUp className="h-3.5 w-3.5" />
            </>
          ) : (
            <>
              View details
              <ChevronDown className="h-3.5 w-3.5" />
            </>
          )}
        </button>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="border-t border-border bg-muted/30 p-4 md:p-5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Flight Segments */}
            <div className="flex-1">
              <h4 className="text-sm font-semibold text-foreground mb-4">Flight Details</h4>
              
              <div className="space-y-4">
                {flight.segments.map((segment, index) => {
                  const segmentDepartTz = getAirportTimezone(segment.from);
                  const segmentArriveTz = getAirportTimezone(segment.to);
                  
                  return (
                    <div key={index} className="flex gap-4">
                      {/* Timeline indicator */}
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-primary shrink-0" />
                        {index < flight.segments.length - 1 && (
                          <div className="w-0.5 flex-1 bg-border my-1" />
                        )}
                      </div>

                      {/* Segment info */}
                      <div className="flex-1 pb-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {formatTime(segment.depart_time)} 
                              {segmentDepartTz && (
                                <span className="text-xs text-muted-foreground ml-1">({segmentDepartTz.abbr})</span>
                              )}
                              {' · '}{segment.from}
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {segment.airline_code || flight.airline_code} {segment.flight_number || ""}
                            </p>
                          </div>
                          {segment.duration_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(segment.duration_minutes)}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          <p className="text-sm font-medium text-foreground">
                            {(() => {
                              // Use arrive_time if available, otherwise calculate from segment duration
                              if (segment.arrive_time) {
                                return formatTime(segment.arrive_time);
                              } else if (segment.depart_time && segment.duration_minutes) {
                                const departure = new Date(segment.depart_time);
                                const arrival = new Date(departure.getTime() + segment.duration_minutes * 60 * 1000);
                                return arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                              } else if (segment.depart_time && flight.duration_minutes && flight.segments.length === 1) {
                                // Single segment - use total flight duration
                                const departure = new Date(segment.depart_time);
                                const arrival = new Date(departure.getTime() + flight.duration_minutes * 60 * 1000);
                                return arrival.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                              }
                              return "--:--";
                            })()}
                            {segmentArriveTz && (
                              <span className="text-xs text-muted-foreground ml-1">({segmentArriveTz.abbr})</span>
                            )}
                            {' · '}{segment.to}
                          </p>
                        </div>

                        {segment.aircraft && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Aircraft: {segment.aircraft}
                          </p>
                        )}

                        {/* Layover info */}
                        {segment.layover_minutes && index < flight.segments.length - 1 && (
                          <div className={cn(
                            "mt-3 px-2 py-1.5 rounded-md text-xs",
                            segment.layover_minutes > 480 
                              ? "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                              : "bg-muted text-muted-foreground"
                          )}>
                            Layover: {formatDuration(segment.layover_minutes)} in {segment.to}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Side Panel - Warnings & Price Info */}
            <div className="lg:w-56 space-y-4">
              {/* Warnings */}
              {hasWarnings && (
                <div>
                  <h5 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                    Important Info
                  </h5>
                  <FlightWarningBadges warnings={flight.warnings!} />
                </div>
              )}

              {/* Price Confidence Detail */}
              {flight.price_confidence && (
                <div>
                  <h5 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                    Price Analysis
                  </h5>
                  <PriceConfidenceIndicator
                    confidence={flight.price_confidence}
                    trend={flight.price_trend}
                    averagePrice={flight.average_price}
                    currentPrice={flight.price}
                    currency={currency}
                  />
                </div>
              )}

              {/* Baggage Info Placeholder */}
              <div>
                <h5 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                  Baggage
                </h5>
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg p-2.5">
                  <Luggage className="h-4 w-4" />
                  <span>Details at booking</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
};

export default FlightCard;
