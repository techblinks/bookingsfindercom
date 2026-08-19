import { CloudOff, RotateCcw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OptimizerRequest, OptimizerInsufficientData } from "@/hooks/useOptimizer";

interface OptimizerNoDataProps {
  result: OptimizerInsufficientData;
  request: OptimizerRequest;
  onReset: () => void;
}

/**
 * The truthful no-data state (BF-0R-2).
 *
 * Shown whenever the Optimizer could not obtain enough genuine provider data.
 * It deliberately does NOT claim that no flights exist, that the route is
 * unavailable, that a provider is permanently down, that prices are high or
 * low, or that the traveller should book now or wait. No fare, airline,
 * duration, stop count or recommendation is displayed, because none was
 * produced.
 */
const OptimizerNoData = ({ result, request, onReset }: OptimizerNoDataProps) => {
  const compareUrl = `/flights?origin=${request.origin}&destination=${request.destination}&date=${request.travelWindowStart}`;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border border-border rounded-xl p-8 md:p-10 text-center shadow-sm">
        <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
          <CloudOff className="h-7 w-7 text-muted-foreground" />
        </div>

        <h2 className="text-xl font-semibold text-foreground mb-2">
          No flight data available from our provider right now
        </h2>

        <p className="text-muted-foreground mb-6">{result.message}</p>

        <p className="text-sm text-muted-foreground mb-6">
          This means we could not retrieve enough data from our flight data provider for{" "}
          <span className="font-medium text-foreground">
            {request.origin} → {request.destination}
          </span>{" "}
          at this moment. It does not tell you whether flights exist on this route, or
          what they cost.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={onReset} variant="default" size="lg">
            <RotateCcw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button asChild variant="outline" size="lg">
            <a href={compareUrl}>
              <Search className="h-4 w-4 mr-2" />
              Search Flights Directly
            </a>
          </Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center mt-4">
        BookingsFinder does not generate estimated fares or recommendations when
        provider data is unavailable.
      </p>
    </div>
  );
};

export default OptimizerNoData;
