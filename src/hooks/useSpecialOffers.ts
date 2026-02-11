import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SpecialOffer {
  id: string;
  origin: string;
  destination: string;
  price: number;
  airline: string;
  departure_date: string;
  return_date: string | null;
  stops: number;
  found_at: string;
  flight_number: string | null;
  link: string;
}

interface UseSpecialOffersResult {
  offers: SpecialOffer[];
  loading: boolean;
  error: string | null;
  currency: string;
}

export function useSpecialOffers(origin: string, currency: string): UseSpecialOffersResult {
  const [offers, setOffers] = useState<SpecialOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!origin) return;

    const fetchOffers = async () => {
      setLoading(true);
      setError(null);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("get-special-offers", {
          body: { origin, currency, limit: 8 },
        });

        if (fnError) throw fnError;
        setOffers(data?.offers || []);
      } catch (err: any) {
        console.error("Failed to fetch special offers:", err);
        setError(err.message || "Failed to load offers");
        setOffers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchOffers();
  }, [origin, currency]);

  return { offers, loading, error, currency };
}
