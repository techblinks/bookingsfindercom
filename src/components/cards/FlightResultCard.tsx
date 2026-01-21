import { useState } from "react";
import { Plane, Clock, ArrowRight, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAirlineLogo, getAirlineName } from "@/lib/airlineLogos";

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
    <div className="bg-card rounded-xl border border-border p-4 md:p-6 shadow-sm hover:shadow-md transition-all duration-200 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        {/* Airline Info */}
        <div className="flex items-center gap-3 lg:w-44">
          <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center overflow-hidden flex-shrink-0">
            {logoUrl && !logoError ? (
              <img
                src={logoUrl}
                alt={displayName}
                className="w-10 h-10 object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <Plane className="h-6 w-6 text-primary" />
            )}
          </div>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground block truncate">
              {displayName}
            </span>
            <div className="flex items-center gap-2">
              {flightNumber && (
                <span className="text-xs text-muted-foreground font-mono">
                  {airlineCode}{flightNumber}
                </span>
              )}
              <span className="text-xs text-muted-foreground">Economy</span>
            </div>
          </div>
        </div>

        {/* Flight Times */}
        <div className="flex-1 flex items-center gap-4">
          <div className="text-center min-w-[80px]">
            <p className="text-2xl font-bold text-foreground tracking-tight">{departureTime}</p>
            <p className="text-sm font-medium text-muted-foreground">
              {departureAirport}
            </p>
          </div>

          <div className="flex-1 flex flex-col items-center px-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
              <Clock className="h-3 w-3" />
              <span className="font-medium">{duration}</span>
            </div>
            <div className="w-full relative py-1">
              <div className="w-full h-0.5 bg-border rounded-full relative">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-card"></div>
                {stops > 0 && (
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 border-2 border-card"></div>
                )}
                {stops > 1 && (
                  <div className="absolute left-1/3 top-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-orange-400 border-2 border-card"></div>
                )}
                <div className="absolute right-0 top-1/2 -translate-y-1/2">
                  <ArrowRight className="h-4 w-4 text-primary" />
                </div>
              </div>
            </div>
            <p className="text-xs font-medium mt-1">
              {stops === 0 ? (
                <span className="text-green-600 font-semibold">Nonstop</span>
              ) : (
                <span className="text-orange-600">
                  {stops} stop{stops > 1 ? "s" : ""}
                </span>
              )}
            </p>
          </div>

          <div className="text-center min-w-[80px]">
            <p className="text-2xl font-bold text-foreground tracking-tight">
              {arrivalTime !== "--:--" ? arrivalTime : "—"}
            </p>
            <p className="text-sm font-medium text-muted-foreground">
              {arrivalAirport}
            </p>
          </div>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between lg:flex-col lg:items-end gap-3 pt-4 lg:pt-0 border-t lg:border-t-0 lg:border-l border-border lg:pl-6 lg:min-w-[150px]">
          <div className="text-right">
            {isDeal && (
              <span className="inline-block bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold px-2 py-0.5 rounded-full mb-1">
                Best Deal
              </span>
            )}
            <p className="text-2xl font-bold text-foreground">
              <span className="text-sm font-normal text-muted-foreground mr-0.5">
                {currency}
              </span>
              {price.toLocaleString()}
            </p>
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
          <Button
            onClick={() => onViewDeal(id)}
            className="lg:w-full gap-2"
            size="sm"
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
