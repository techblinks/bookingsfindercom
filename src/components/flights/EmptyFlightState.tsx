import { Plane, Search, Calendar, MapPin, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface EmptyFlightStateProps {
  variant: "no-results" | "error";
  onClearFilters?: () => void;
  onRetry?: () => void;
  searchParams?: {
    origin: string;
    destination: string;
  };
  errorMessage?: string;
}

const EmptyFlightState = ({
  variant,
  onClearFilters,
  onRetry,
  searchParams,
  errorMessage,
}: EmptyFlightStateProps) => {
  if (variant === "error") {
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
  }

  return (
    <div className="bg-card rounded-xl border border-border p-8 md:p-12 text-center">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
        <Plane className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No flights found
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">
        We couldn't find any flights matching your search criteria.
      </p>

      {/* Suggestions */}
      <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
        <p className="text-sm font-medium text-foreground mb-3">Try these suggestions:</p>
        <ul className="text-sm text-muted-foreground space-y-2">
          <li className="flex items-start gap-2">
            <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Choose different travel dates (flexible by a few days)</span>
          </li>
          <li className="flex items-start gap-2">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Try nearby airports (within 100 miles)</span>
          </li>
          <li className="flex items-start gap-2">
            <Search className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <span>Adjust your filters to see more results</span>
          </li>
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear All Filters
          </Button>
        )}
        <Link to="/">
          <Button className="gap-2">
            <Search className="h-4 w-4" />
            Modify Search
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default EmptyFlightState;
