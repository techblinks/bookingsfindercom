import { MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface NearbyAirportSuggestionProps {
  airport: string;
  airportName: string;
  savings: number;
  currency?: string;
  onViewFlights?: () => void;
}

const NearbyAirportSuggestion = ({
  airport,
  airportName,
  savings,
  currency = "$",
  onViewFlights,
}: NearbyAirportSuggestionProps) => {
  if (savings <= 0) return null;

  return (
    <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
              Save {currency}{savings.toLocaleString()} from {airport}
            </p>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">
              Nearby airport: {airportName}
            </p>
          </div>
        </div>
        {onViewFlights && (
          <Button
            variant="ghost"
            size="sm"
            className="shrink-0 h-7 text-xs text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/40"
            onClick={onViewFlights}
          >
            View
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default NearbyAirportSuggestion;
