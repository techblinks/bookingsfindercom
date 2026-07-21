import { Link } from "react-router-dom";
import { ArrowRight, Plane, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AFFILIATE_DISCLOSURE } from "@/lib/travelConfig";
import { mapPlannerToFlightHandoff } from "./tripCostFlightHandoff";
import type { TripCostPlannerState } from "./types";

interface FlightHandoffButtonProps {
  state: TripCostPlannerState;
}

/**
 * Flight search handoff from the Trip Budget Planner.
 *
 * Since the planner stores free-text city/country names (not IATA codes),
 * this always navigates to the internal BookingsFinder flight search page
 * with safely mappable context (dates, traveller count).
 *
 * Direct partner handoff is NOT supported from the planner.
 */
export function FlightHandoffButton({ state }: FlightHandoffButtonProps) {
  const result = mapPlannerToFlightHandoff(state);

  if (result.mode === "disabled") {
    return (
      <div className="border-t border-border pt-4 mt-4">
        <div className="flex items-start gap-2 text-xs text-muted-foreground mb-2">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{result.reason}</span>
        </div>
        <Button
          disabled
          variant="outline"
          size="sm"
          className="w-full h-10 text-sm font-medium rounded-lg cursor-not-allowed"
        >
          <Plane className="h-4 w-4 mr-2" />
          Search real flights
        </Button>
      </div>
    );
  }

  return (
    <div className="border-t border-border pt-4 mt-4 space-y-3">
      {/* CTA */}
      <Button
        asChild
        variant="default"
        size="sm"
        className="w-full h-10 text-sm font-medium rounded-lg"
      >
        <Link to={result.url!}>
          <Plane className="h-4 w-4 mr-2" />
          Search real flights
          <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
        </Link>
      </Button>

      {/* Disclosure */}
      <p className="text-xs text-muted-foreground leading-relaxed">
        Estimated trip costs are planning figures. You'll complete your booking with our travel partner. Final prices and availability are confirmed by the provider.
      </p>
    </div>
  );
}
