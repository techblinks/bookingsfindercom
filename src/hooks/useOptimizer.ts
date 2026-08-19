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

/** A purely factual observation about the returned itinerary. */
export interface FactualNote {
  type: string;
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

export const INSUFFICIENT_LIVE_DATA = "insufficient_live_data";

export type SelectionCriterion = "price" | "duration" | "fewest_stops";

/**
 * A provider-backed answer. Every field traces to a genuine Travelpayouts
 * observation or a deterministic derivation from one — see
 * supabase/functions/run-optimizer/optimizer-core.ts.
 */
export interface OptimizerSuccess {
  status: "ok";
  recommendedRoute: {
    summary: string;
    airline?: string;
    stops?: number;
    duration?: number; // in minutes
  };
  /** Provider-quoted fare. The only monetary figure the Optimizer reports. */
  fare: number;
  selectionCriterion: SelectionCriterion;
  priceContext: PriceContext;
  fareComparison: string | null;
  notes: FactualNote[];
  affiliateLinks: AffiliateLink[];
}

/**
 * The truthful no-data state. Returned whenever the provider errored, timed
 * out, was unavailable or returned nothing usable. No fare, route, airline,
 * duration or timing advice accompanies it.
 */
export interface OptimizerInsufficientData {
  status: typeof INSUFFICIENT_LIVE_DATA;
  reason: "provider_error" | "provider_unavailable" | "no_results" | "unusable_results";
  message: string;
}

export type OptimizerResult = OptimizerSuccess | OptimizerInsufficientData;

export function isOptimizerSuccess(
  result: OptimizerResult | null,
): result is OptimizerSuccess {
  return result?.status === "ok";
}

export interface PaywallError {
  type: "paywall";
  message: string;
  upgradeUrl: string;
}

export const useOptimizer = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paywallError, setPaywallError] = useState<PaywallError | null>(null);

  const runOptimizer = async (request: OptimizerRequest): Promise<OptimizerResult | null> => {
    setIsLoading(true);
    setError(null);
    setPaywallError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("run-optimizer", {
        body: request,
      });

      if (fnError) {
        throw new Error(fnError.message || "Failed to run optimizer");
      }

      // Check for paywall error
      if (data?.error === "paywall") {
        setPaywallError({
          type: "paywall",
          message: data.message || "Upgrade required",
          upgradeUrl: data.upgradeUrl || "/pricing",
        });
        return null;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.status === INSUFFICIENT_LIVE_DATA) {
        return data as OptimizerInsufficientData;
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

  const trackAffiliateClick = async (params: {
    type: "flight" | "hotel";
    action: "redirect" | "compare" | "view_deal";
    origin?: string;
    destination?: string;
    departureDate?: string;
    returnDate?: string;
    price?: number;
    redirectUrl: string;
  }) => {
    try {
      await supabase.functions.invoke("track-affiliate-click", {
        body: params,
      });
    } catch (err) {
      // Silently fail - don't block the redirect
      console.error("Failed to track affiliate click:", err);
    }
  };

  const clearPaywallError = () => {
    setPaywallError(null);
  };

  return {
    runOptimizer,
    trackAffiliateClick,
    isLoading,
    error,
    paywallError,
    clearPaywallError,
  };
};
