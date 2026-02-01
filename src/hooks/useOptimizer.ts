import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface OptimizerRequest {
  origin: string;
  destination: string;
  travelWindowStart: string;
  travelWindowEnd?: string;
  hasBags: boolean;
  priority: "cheapest" | "fastest" | "low_risk";
}

export interface RiskAlert {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
}

export interface AffiliateLink {
  provider: string;
  url: string;
}

export interface PriceContext {
  optionsFound: number;
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
}

export interface OptimizerResult {
  recommendedRoute: {
    summary: string;
    airline?: string;
    stops?: number;
    duration?: number; // in minutes
  };
  estimatedTotalCost: number;
  costBreakdown: {
    fare: number;
    baggage: number;
    transfers: number;
    extraFees: number;
  };
  timingAdvice: "buy" | "wait" | "neutral";
  timingReason?: string;
  riskAlerts?: RiskAlert[];
  affiliateLinks?: AffiliateLink[];
  priceContext?: PriceContext | null;
}

export const useOptimizer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const runOptimizer = async (request: OptimizerRequest): Promise<OptimizerResult | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("run-optimizer", {
        body: request,
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to run optimizer");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      return data as OptimizerResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    runOptimizer,
    isLoading,
    error,
  };
};
