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

