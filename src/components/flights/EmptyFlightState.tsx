import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

/**
 * BF-FLIGHTS-LIVE-2 Phase J: this component's `"no-results"` variant was
 * removed — it was provably unreachable (only `variant="error"` is ever
 * passed, from FlightResults.tsx) and its copy was stale: a hardcoded "No
 * flights found" heading and a fabricated "Try nearby airports (within 100
 * miles)" claim that BF-0R-7.2 had already removed from the actually-used
 * zero-result component, EnhancedEmptyFlightResults.tsx. That component
 * remains the sole zero-result UI. This one is error-state only now.
 */
interface EmptyFlightStateProps {
  onRetry?: () => void;
  errorMessage?: string;
}

const EmptyFlightState = ({ onRetry, errorMessage }: EmptyFlightStateProps) => {
  return (
    <div className="bg-card rounded-xl border border-destructive/20 p-8 md:p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-8 w-8 text-destructive" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        Something went wrong
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        {errorMessage || "We couldn't load flight results. Please try again."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onRetry && (
          <Button onClick={onRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
        )}
        <Link to="/">
          <Button variant="outline">
            Modify Search
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default EmptyFlightState;
