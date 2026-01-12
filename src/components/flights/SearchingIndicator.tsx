import { Loader2, Plane } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface SearchingIndicatorProps {
  isComplete: boolean;
  totalFound: number;
  searchingText?: string;
}

const SearchingIndicator = ({ 
  isComplete, 
  totalFound,
  searchingText = "Searching more airlines..." 
}: SearchingIndicatorProps) => {
  if (isComplete) return null;

  return (
    <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 flex items-center gap-4">
      <div className="shrink-0">
        <div className="relative">
          <Plane className="h-6 w-6 text-primary animate-pulse" />
          <div className="absolute -top-1 -right-1">
            <Loader2 className="h-3 w-3 text-primary animate-spin" />
          </div>
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">
          {searchingText}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {totalFound} flight{totalFound !== 1 ? 's' : ''} found so far
        </p>
      </div>
      <Progress value={65} className="w-24 h-1.5" />
    </div>
  );
};

export default SearchingIndicator;
