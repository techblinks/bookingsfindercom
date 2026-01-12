import { Search, Plane } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyFlightResultsProps {
  onClearFilters?: () => void;
  message?: string;
}

const EmptyFlightResults = ({
  onClearFilters,
  message = "No flights found matching your criteria",
}: EmptyFlightResultsProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-8 md:p-12 text-center shadow-sm">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
        <Plane className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No Flights Found
      </h3>
      <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters}>
            Clear All Filters
          </Button>
        )}
        <Button>
          <Search className="h-4 w-4 mr-2" />
          Modify Search
        </Button>
      </div>
    </div>
  );
};

export default EmptyFlightResults;
