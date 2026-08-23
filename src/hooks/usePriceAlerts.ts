import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Helper function to add subscriber when creating a price alert, via the
// subscribe_email RPC. BF-0R-5 round 4: subscribe_email now returns void —
// it never reveals whether the email was new, already subscribed, or
// previously unsubscribed (that distinction was a subscriber-status
// oracle, closed this round). Consequently this function no longer returns
// anything meaningful to branch on; callers must NOT use its outcome to
// decide whether to send a welcome email or otherwise infer subscriber
// state. The welcome email itself is temporarily withheld — see the
// BF-0R-6 follow-up note in the migration for why, and what a non-oracle
// trigger would need to look like.
async function addSubscriber(email: string, source: string = 'price_alert'): Promise<void> {
  try {
    const { error } = await supabase.rpc('subscribe_email', {
      p_email: email,
      p_source: source,
    });

    if (error) {
      console.error('Error adding subscriber:', error);
    }
  } catch (error) {
    // Silently handle errors - don't block the price alert creation
    console.error('Error adding subscriber:', error);
  }
}

export interface SavedSearch {
  id: string;
  email: string;
  origin: string;
  destination: string;
  departure_date: string;
  return_date: string | null;
  passengers: number;
  cabin_class: string;
  target_price: number | null;
  current_lowest_price: number | null;
  last_checked_at: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PriceHistory {
  id: string;
  saved_search_id: string;
  price: number;
  recorded_at: string;
}

export interface CreateAlertParams {
  email: string;
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
  targetPrice?: number;
  currentPrice?: number;
}

export interface CreatedAlert {
  id: string;
  created_at: string;
}

// BF-0R-5 round 3: viewing/managing existing alerts is temporarily
// unavailable — see src/components/flights/SavedSearchesPanel.tsx and
// src/pages/MyAlerts.tsx. This hook no longer attempts to fetch, toggle,
// delete, or read price history for existing alerts, since anon/
// authenticated have no SELECT/UPDATE/DELETE privilege on saved_searches
// or price_history at all (supabase/migrations/20260820000000_bf0r5_...).
// Alert CREATION remains fully functional via the create_saved_search RPC.
export function usePriceAlerts(_email?: string) {
  const [savedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createAlert = useCallback(async (params: CreateAlertParams): Promise<CreatedAlert | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: rpcError } = await supabase
        .rpc('create_saved_search', {
          p_email: params.email,
          p_origin: params.origin,
          p_destination: params.destination,
          p_departure_date: params.departureDate,
          p_return_date: params.returnDate || null,
          p_passengers: params.passengers,
          p_cabin_class: params.cabinClass,
          p_target_price: params.targetPrice || null,
          p_current_price: params.currentPrice || null,
        })
        .single();

      if (rpcError) throw rpcError;
      if (!data) throw new Error('Alert was not created');

      // Add user to subscribers list. BF-0R-5 round 4: no welcome email is
      // sent from the browser — send-welcome-email is an unauthenticated
      // Resend relay (BF-0R-6 follow-up), and subscribe_email's result can
      // no longer be used to infer new-vs-existing subscriber state (that
      // was the closed oracle). The welcome email is temporarily withheld.
      await addSubscriber(params.email, 'price_alert');

      toast.success('Price alert created!', {
        description: `We'll notify you at ${params.email} when prices drop.`,
      });

      // Viewing/managing the list is temporarily unavailable (BF-0R-5 round
      // 3) — no refetch is attempted here; see SavedSearchesPanel.tsx.

      return data as CreatedAlert;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create price alert';
      setError(message);
      toast.error('Failed to create alert', { description: message });
      console.error('Error creating alert:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    savedSearches,
    isLoading,
    error,
    createAlert,
  };
}
