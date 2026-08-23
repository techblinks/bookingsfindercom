import { useRef, useState } from "react";
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

  /**
   * PR #65 round 4: attempt-ID guard against stale-response/stale-error
   * overwrite. A ref (not state) so the comparison is synchronous and never
   * subject to React's state-update batching/timing — two overlapping
   * `runOptimizer` calls each capture their OWN attempt id at start; when a
   * call's network round-trip finally resolves, it only commits state
   * (loading/error/paywall/return value) if it is STILL the most recent
   * attempt. A response or error from an attempt that has since been
   * superseded by a newer one is discarded rather than overwriting the
   * newer attempt's in-flight or already-resolved state.
   */
  const currentAttemptRef = useRef(0);

  const runOptimizer = async (request: OptimizerRequest): Promise<OptimizerResult | null> => {
    const attemptId = ++currentAttemptRef.current;
    const isCurrent = () => currentAttemptRef.current === attemptId;

    setIsLoading(true);
    setError(null);
    setPaywallError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("run-optimizer", {
        body: request,
      });

      if (!isCurrent()) return null; // superseded by a newer attempt — discard

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
      if (!isCurrent()) return null; // stale error must not overwrite current attempt
      const message = err instanceof Error ? err.message : "An unexpected error occurred";
      setError(message);
      return null;
    } finally {
      // Only the most recent attempt may clear isLoading — an earlier
      // attempt's finally block must not flip loading off while a newer
      // attempt is still genuinely in flight.
      if (isCurrent()) setIsLoading(false);
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
