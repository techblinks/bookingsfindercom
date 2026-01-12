import { Building2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyHotelResultsProps {
  onClearFilters?: () => void;
  message?: string;
}

const EmptyHotelResults = ({
  onClearFilters,
  message = "No hotels found matching your criteria",
}: EmptyHotelResultsProps) => {
  return (
    <div className="bg-card rounded-xl border border-border p-8 md:p-12 text-center shadow-sm">
      <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-secondary flex items-center justify-center">
        <Building2 className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-xl font-semibold text-foreground mb-2">
        No Hotels Found
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

export default EmptyHotelResults;
