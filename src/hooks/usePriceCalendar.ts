import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "https://nrxupicbzblbxolyxksg.supabase.co";

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
        const response = await fetch(`${SUPABASE_URL}/functions/v1/get-price-calendar`, {
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
