import { cn } from "@/lib/utils";
import { Info } from "lucide-react";
import { PriceConfidence, PRICE_CONFIDENCE_CONFIG } from "@/types/flight";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * How one result's price sits against the average of the results on screen.
 *
 * HONESTY RULE: this is a cross-sectional comparison, not a trend. The rising /
 * falling / stable arrows were removed because the underlying value is computed
 * from the current result batch and carried no information about movement over
 * time; a red up-arrow read as "this fare is going up", which we cannot know.
 */

interface PriceConfidenceIndicatorProps {
  confidence: PriceConfidence;
  /** Mean price of the results currently on screen. */
  averagePrice?: number;
  currentPrice?: number;
  currency?: string;
  compact?: boolean;
}

const PriceConfidenceIndicator = ({
  confidence,
  averagePrice,
  currentPrice,
  currency = "$",
  compact = false,
}: PriceConfidenceIndicatorProps) => {
  const config = PRICE_CONFIDENCE_CONFIG[confidence];

  const priceDiff = averagePrice && currentPrice
    ? ((currentPrice - averagePrice) / averagePrice) * 100
    : null;

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1 text-xs cursor-help">
              <span className={cn("font-medium", config.color)}>{config.label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium mb-1">{config.recommendation}</p>
            {averagePrice && (
              <p className="text-xs text-muted-foreground">
                Average of these results: {currency}{averagePrice.toLocaleString()}
              </p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className="bg-muted/50 rounded-lg p-2.5 space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-xs font-semibold", config.color)}>
          {config.label}
        </span>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                This compares the flight with the other results in this search. It is not a
                price history or a forecast.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-xs text-muted-foreground">{config.recommendation}</p>
      {averagePrice && priceDiff !== null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">vs. average of these results:</span>
          <span className={cn(
            "font-medium",
            priceDiff < 0 ? "text-emerald-600" : priceDiff > 10 ? "text-red-600" : "text-foreground"
          )}>
            {priceDiff > 0 ? '+' : ''}{priceDiff.toFixed(0)}%
          </span>
        </div>
      )}
    </div>
  );
};

export default PriceConfidenceIndicator;
