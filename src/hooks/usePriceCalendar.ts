import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

import { getFunctionUrl } from "@/lib/supabaseConfig";

export interface CalendarPrice {
  date: string;
  price: number;
  returnDate: string | null;
  airline: string | null;
  stops: number;
  tripDuration: number | null;
}

interface UsePriceCalendarParams {
  origin: string;
  destination: string;
  month: string; // YYYY-MM
  currency?: string;
  enabled?: boolean;
}

/**
 * BF-0R-7.1 Phase E — get-price-calendar contract audit.
 *
 * supabase/functions/get-price-calendar/index.ts reads exactly
 * { origin, destination, month, currency } from the request body (see the
 * request built below) and forwards them to Travelpayouts'
 * /v2/prices/month-matrix endpoint. It does NOT accept or forward adults,
 * children, infants, or cabin class — there is no traveller-specific or
 * cabin-specific parameter anywhere in that contract.
 *
 * Consequences for every caller of this hook:
 *   - returned values are generic recent route/date fare observations,
 *     never a live or traveller-specific quote — label them accordingly
 *     (e.g. "Recent Fare Calendar", "Recent from $X") rather than
 *     presenting a bare price;
 *   - they must never be shown as if they matched a non-economy (e.g.
 *     Business) search, for the same reason the cached search-flights
 *     results are hidden for Business — see FlightResults.tsx's
 *     isNonEconomyCabin branch, which also never renders PriceCalendar/
 *     WeeklyPriceHeatmap (the two consumers of this hook) at all.
 */
export function usePriceCalendar({ origin, destination, month, currency = "USD", enabled = true }: UsePriceCalendarParams) {
  const [prices, setPrices] = useState<CalendarPrice[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !origin || !destination || !month) return;

    const fetchPrices = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const url = getFunctionUrl("get-price-calendar");
        if (!url) return;
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${(await supabase.auth.getSession()).data.session?.access_token || ""}`,
          },
          body: JSON.stringify({ origin, destination, month, currency }),
        });

        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Failed to fetch");

        setPrices(data.prices || []);
      } catch (err) {
        console.error("Price calendar error:", err);
        setError(err instanceof Error ? err.message : "Failed to load prices");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPrices();
  }, [origin, destination, month, currency, enabled]);

  return { prices, isLoading, error };
}

