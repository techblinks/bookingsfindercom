import { useState } from "react";
import { Plane, Clock, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAirlineLogo, getAirlineName } from "@/lib/airlineLogos";
import UrgencyBadges from "@/components/flights/UrgencyBadges";

interface FlightResultCardProps {
  id: string;
  airline: string;
  airlineCode?: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  price: number;
  currency?: string;
  isDeal?: boolean;
  flightNumber?: string;
  onViewDeal: (flightId: string) => void;
}

const FlightResultCard = ({
  id,
  airline,
  airlineCode,
  departureTime,
  arrivalTime,
  departureAirport,
  arrivalAirport,
  duration,
  stops,
  price,
  currency = "$",
  isDeal = false,
  flightNumber,
  onViewDeal,
}: FlightResultCardProps) => {
  const [logoError, setLogoError] = useState(false);
  const logoUrl = airlineCode ? getAirlineLogo(airlineCode) : "";
  const displayName = airlineCode ? getAirlineName(airlineCode) : airline;

  return (
    <div className="bg-card rounded-xl border border-border hover:border-primary/30 transition-all duration-200 group">
      <div className="flex flex-col lg:flex-row lg:items-center">
        {/* Left: Airline + Flight Info */}
        <div className="flex-1 p-4 lg:p-5">
          <div className="flex items-center gap-4">
            {/* Airline Logo */}
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
              {logoUrl && !logoError ? (
                <img
                  src={logoUrl}
                  alt={displayName}
                  className="w-8 h-8 object-contain"
                  onError={() => setLogoError(true)}
                />
              ) : (
                <Plane className="h-5 w-5 text-muted-foreground" />
              )}
            </div>

            {/* Flight Timeline */}
            <div className="flex-1 flex items-center gap-3 min-w-0">
              {/* Departure */}
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-foreground leading-tight">{departureTime}</p>
                <p className="text-xs text-muted-foreground font-medium">{departureAirport}</p>
              </div>

              {/* Route Line */}
              <div className="flex-1 flex flex-col items-center px-1 min-w-[80px]">
                <span className="text-[11px] text-muted-foreground font-medium mb-1">{duration}</span>
                <div className="w-full relative h-[2px]">
                  <div className="absolute inset-0 bg-border rounded-full" />
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-foreground" />
                  {stops > 0 && (
                    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-muted-foreground" />
                  )}
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-foreground" />
                </div>
                <span className={`text-[11px] font-medium mt-1 ${stops === 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
                  {stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}
                </span>
              </div>

              {/* Arrival */}
              <div className="text-center shrink-0">
                <p className="text-lg font-bold text-foreground leading-tight">
                  {arrivalTime !== "--:--" ? arrivalTime : "—"}
                </p>
                <p className="text-xs text-muted-foreground font-medium">{arrivalAirport}</p>
              </div>
            </div>
          </div>

          {/* Airline name + flight number + urgency badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2.5 ml-14">
            <span className="text-xs text-muted-foreground">{displayName}</span>
            {flightNumber && (
              <>
                <span className="text-xs text-border">·</span>
                <span className="text-xs text-muted-foreground font-mono">{airlineCode}{flightNumber}</span>
              </>
            )}
            {isDeal && (
              <>
                <span className="text-xs text-border">·</span>
                <span className="text-[11px] font-semibold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                  Great price
                </span>
              </>
            )}
          </div>
          <div className="mt-2 ml-14">
            <UrgencyBadges price={price} />
          </div>
        </div>

        {/* Right: Price + CTA */}
        <div className="flex items-center justify-between lg:flex-col lg:items-end gap-2 px-4 pb-4 lg:p-5 lg:pl-0 lg:border-l border-border lg:min-w-[140px]">
          <div className="text-right">
            <p className="text-xl font-bold text-foreground leading-tight">
              <span className="text-sm font-normal text-muted-foreground">{currency}</span>
              {price.toLocaleString()}
            </p>
            <p className="text-[11px] text-muted-foreground">per person</p>
          </div>
          <Button
            onClick={() => onViewDeal(id)}
            variant="outline"
            size="sm"
            className="gap-1.5 text-primary border-primary/30 hover:bg-primary hover:text-primary-foreground transition-all"
          >
            View Deal
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightResultCard;
