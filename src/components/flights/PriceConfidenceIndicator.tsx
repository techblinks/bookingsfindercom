import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";
import { PriceConfidence, PRICE_CONFIDENCE_CONFIG } from "@/types/flight";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PriceConfidenceIndicatorProps {
  confidence: PriceConfidence;
  trend?: 'rising' | 'stable' | 'falling';
  averagePrice?: number;
  currentPrice?: number;
  currency?: string;
  compact?: boolean;
}

const getTrendIcon = (trend?: string) => {
  switch (trend) {
    case 'rising':
      return <TrendingUp className="h-3 w-3 text-red-500" />;
    case 'falling':
      return <TrendingDown className="h-3 w-3 text-emerald-500" />;
    default:
      return <Minus className="h-3 w-3 text-muted-foreground" />;
  }
};

const PriceConfidenceIndicator = ({
  confidence,
  trend,
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
              {getTrendIcon(trend)}
              <span className={cn("font-medium", config.color)}>
                {confidence.charAt(0).toUpperCase() + confidence.slice(1)}
              </span>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs">
            <p className="font-medium mb-1">{config.recommendation}</p>
            {averagePrice && (
              <p className="text-xs text-muted-foreground">
                Average price: {currency}{averagePrice.toLocaleString()}
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
        <div className="flex items-center gap-1.5">
          {getTrendIcon(trend)}
          <span className={cn("text-xs font-semibold", config.color)}>
            {config.label}
          </span>
        </div>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              <p className="text-xs">
                Price confidence is based on historical data and current market trends.
              </p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <p className="text-xs text-muted-foreground">{config.recommendation}</p>
      {averagePrice && priceDiff !== null && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">vs. average:</span>
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
