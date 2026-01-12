import { Plane, Clock, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FlightCardProps {
  airline: string;
  airlineLogo?: string;
  departureTime: string;
  arrivalTime: string;
  departureAirport: string;
  arrivalAirport: string;
  duration: string;
  stops: number;
  price: number;
  currency?: string;
  isDeal?: boolean;
}

const FlightCard = ({
  airline,
  departureTime,
  arrivalTime,
  departureAirport,
  arrivalAirport,
  duration,
  stops,
  price,
  currency = "$",
  isDeal = false,
}: FlightCardProps) => {
  return (
    <div className="travel-card p-4 md:p-6">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Airline Info */}
        <div className="flex items-center gap-3 md:w-32">
          <div className="w-10 h-10 rounded-lg bg-secondary flex items-center justify-center">
            <Plane className="h-5 w-5 text-primary" />
          </div>
          <span className="text-sm font-medium text-foreground">{airline}</span>
        </div>

        {/* Flight Times */}
        <div className="flex-1 flex items-center gap-4">
          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{departureTime}</p>
            <p className="text-sm text-muted-foreground">{departureAirport}</p>
          </div>

          <div className="flex-1 flex flex-col items-center px-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
              <Clock className="h-3 w-3" />
              <span>{duration}</span>
            </div>
            <div className="w-full flex items-center gap-2">
              <div className="flex-1 h-px bg-border"></div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stops === 0 ? "Nonstop" : `${stops} stop${stops > 1 ? "s" : ""}`}
            </p>
          </div>

          <div className="text-center">
            <p className="text-xl font-bold text-foreground">{arrivalTime}</p>
            <p className="text-sm text-muted-foreground">{arrivalAirport}</p>
          </div>
        </div>

        {/* Price and Action */}
        <div className="flex items-center justify-between md:flex-col md:items-end gap-2 pt-4 md:pt-0 border-t md:border-t-0 md:border-l border-border md:pl-6">
          <div className="text-right">
            {isDeal && (
              <span className="deal-badge mb-1">Great Deal</span>
            )}
            <p className="price-tag">
              <span className="price-currency">{currency}</span>
              {price}
            </p>
            <p className="text-xs text-muted-foreground">per person</p>
          </div>
          <Button size="sm" className="md:mt-2">
            Select
          </Button>
        </div>
      </div>
    </div>
  );
};

export default FlightCard;
