import { useState } from "react";
import { Plane, Clock, ChevronDown, ChevronUp, Luggage, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Flight } from "@/types/flight";
import { formatDuration } from "@/hooks/useFlightSearch";
import { getAirlineLogo, getAirlineName } from "@/lib/airlineLogos";
import { getAirportTimezone, formatProviderLocalTime, formatProviderLocalDate } from "@/lib/timezones";
import { cn } from "@/lib/utils";
import PriceConfidenceIndicator from "./PriceConfidenceIndicator";
import FlightWarningBadges from "./FlightWarningBadges";
import UrgencyBadges from "./UrgencyBadges";

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

  // Get timezone info for the departure airport. BF-0R-7: no arrival-side
  // timezone lookup here — the provider gives no outbound arrival
  // timestamp at all (see below), so there is nothing to label with one.
  const departureTimezone = getAirportTimezone(firstSegment?.from || "");

  /*
   * BF-0R-7 Phase 1.1 item 1: departure/arrival time display.
   *
   * formatTime/formatDateWithDay read the provider's stated local
   * date/time directly from the ISO string (timezone.ts's
   * formatProviderLocalTime/formatProviderLocalDate) rather than via
   * `new Date(iso).toLocaleTimeString()` — the latter reinterprets the
   * instant through the *browser's* local timezone, which can show a
   * different wall-clock time (or even a different calendar date near a
   * boundary) than what the provider actually stated, while this card
   * labels it with the airport's timezone abbreviation regardless.
   *
   * There is deliberately no computed arrival clock time. The Data API
   * gives an outbound departure timestamp and a duration — computing a
   * destination-local arrival clock from those needs the destination's
   * UTC offset, and this codebase's only source for that is a static,
   * DST-unaware airport table (see AIRPORT_TIMEZONES) that cannot be
   * trusted to produce a correct clock reading for an arbitrary future
   * date. Manufacturing a specific arrival time from an untrustworthy
   * offset would present a fabricated fact as if it were provider data;
   * "confirmed on partner" (below) is the honest state instead.
   */
  const formatTime = formatProviderLocalTime;
  const formatDateWithDay = formatProviderLocalDate;

  const departureTime = formatTime(firstSegment?.depart_time || "");

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
              {/*
               * BF-0R-7 Phase 1.1 item 2: the Data API this card is sourced
               * from does not price against a cabin class — flight.cabin_class
               * is never actually populated by the current backend mapper,
               * so the previous `|| "Economy"` fallback fabricated a fact on
               * every single card. Only render a real value; otherwise say
               * so honestly rather than default to a specific class.
               */}
              <p className="text-xs text-muted-foreground">
                {flight.cabin_class || "Cabin confirmed on partner"}
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

            {/* Arrival — BF-0R-7 Phase 1.1 item 1: no computed clock time.
                The provider gives no outbound arrival timestamp, and
                deriving one needs a destination UTC offset this codebase
                cannot vouch for (see AIRPORT_TIMEZONES). An honest state
                replaces what used to be a manufactured time. */}
            <div className="text-center min-w-[72px]">
              <p
                className="text-sm md:text-base font-semibold text-muted-foreground tracking-tight"
                title="Arrival time is confirmed on the partner site"
              >
                See partner
              </p>
              <p className="text-xs font-medium text-muted-foreground uppercase mt-0.5">
                {lastSegment?.to || "---"}
              </p>
            </div>
          </div>

          {/* Price, Deal Score & Action */}
          <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 pt-3 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-5 lg:min-w-[160px] shrink-0">
            <div className="text-right space-y-1">
              {/*
               * No deal score, no "Best Deal" and no price-trend chip here. All
               * three were derived from this flight's position within the current
               * result batch, which cannot support an absolute or forward-looking
               * claim. The one comparison we can defend — how this price sits
               * against the average of the results on screen — is stated in words
               * by UrgencyBadges below.
               *
               * BF-0R-7: this price comes from Travelpayouts' cached
               * search-history data (fares other users found recently), not
               * a live, traveller-specific quote — so it is labelled as a
               * recent find, not presented as a guaranteed current fare.
               */}
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
                Recent fare observation
              </p>
              <p className="text-2xl font-bold text-foreground tabular-nums">
                <span className="text-sm font-normal text-muted-foreground mr-0.5">{currency}</span>
                {flight.price.toLocaleString()}
              </p>

              {/*
               * BF-0R-7 Phase 1.1 item 2: "per person" implied this cached
               * fare was computed for the traveller mix the user selected —
               * the Data API does not price against passenger count, so
               * that claim is dropped entirely rather than reworded.
               */}
              <p className="text-xs text-muted-foreground">Indicative ticket price &middot; confirm on partner</p>

              <UrgencyBadges
                price={flight.price}
                averagePrice={flight.average_price}
              />
            </div>
            <Button
              onClick={() => onBookNow(flight.id)}
              size="sm"
              className="lg:w-full gap-1.5"
            >
              Check live price
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
                  // No arrival-side timezone lookup — see the arrival block
                  // below for why no arrival clock time is computed either.

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
                              {formatDateWithDay(segment.depart_time)}
                              {' · '}{segment.airline_code || flight.airline_code} {segment.flight_number || ""}
                            </p>
                          </div>
                          {segment.duration_minutes && (
                            <span className="text-xs text-muted-foreground">
                              {formatDuration(segment.duration_minutes)}
                            </span>
                          )}
                        </div>
                        
                        <div className="mt-2">
                          {/*
                           * BF-0R-7 Phase 1.1 item 1: segment.arrive_time is
                           * never populated for these Data-API-sourced
                           * results (see travelpayouts.ts) — the endpoint
                           * gives no outbound arrival timestamp, and
                           * deriving a clock time from departure+duration
                           * would need a destination UTC offset this
                           * codebase's static, DST-unaware airport table
                           * cannot be trusted to get right. An honest state
                           * replaces what used to be a manufactured time.
                           */}
                          <p className="text-sm font-medium text-muted-foreground" title="Arrival time is confirmed on the partner site">
                            Confirmed on partner &middot; {segment.to}
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

              {/* How this price compares with the other results in this search */}
              {flight.price_confidence && (
                <div>
                  <h5 className="text-xs font-semibold text-foreground mb-2 uppercase tracking-wide">
                    Price vs these results
                  </h5>
                  <PriceConfidenceIndicator
                    confidence={flight.price_confidence}
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
