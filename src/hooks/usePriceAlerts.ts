import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

// Helper function to send welcome email to new subscribers
async function sendWelcomeEmail(email: string, origin?: string, destination?: string): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-welcome-email', {
      body: { email, origin, destination },
    });
    
    if (error) {
      console.error('Error sending welcome email:', error);
    } else {
      console.log('Welcome email sent to:', email);
    }
  } catch (error) {
    console.error('Error invoking welcome email function:', error);
  }
}
import { toast } from 'sonner';

// Helper function to add subscriber when creating price alert
// Returns true if this is a new subscriber (for sending welcome email)
async function addSubscriber(email: string, source: string = 'price_alert'): Promise<boolean> {
  try {
    // Check if already subscribed
    const { data: existing } = await supabase
      .from('subscribers')
      .select('id, is_subscribed')
      .eq('email', email)
      .single();

    if (existing) {
      // If exists but unsubscribed, resubscribe them
      if (!existing.is_subscribed) {
        await supabase
          .from('subscribers')
          .update({ 
            is_subscribed: true, 
            unsubscribed_at: null,
            subscribed_at: new Date().toISOString()
          })
          .eq('id', existing.id);
        return true; // Resubscribed user should get welcome email
      }
      return false; // Already subscribed, no welcome email
    }

    // Add new subscriber
    await supabase
      .from('subscribers')
      .insert({
        email,
        subscription_source: source,
        is_subscribed: true,
      });
    
    return true; // New subscriber, send welcome email
  } catch (error) {
    // Silently handle errors - don't block the price alert creation
    console.error('Error adding subscriber:', error);
    return false;
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

export function usePriceAlerts(email?: string) {
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSavedSearches = useCallback(async () => {
    if (!email) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { data, error: fetchError } = await supabase
        .from('saved_searches')
        .select('*')
        .eq('email', email)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;
      setSavedSearches(data || []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to fetch saved searches';
      setError(message);
      console.error('Error fetching saved searches:', err);
    } finally {
      setIsLoading(false);
    }
  }, [email]);

  const createAlert = useCallback(async (params: CreateAlertParams): Promise<SavedSearch | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error: insertError } = await supabase
        .from('saved_searches')
        .insert({
          email: params.email,
          origin: params.origin,
          destination: params.destination,
          departure_date: params.departureDate,
          return_date: params.returnDate || null,
          passengers: params.passengers,
          cabin_class: params.cabinClass,
          target_price: params.targetPrice || null,
          current_lowest_price: params.currentPrice || null,
          is_active: true,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Record initial price in history
      if (params.currentPrice && data) {
        await supabase
          .from('price_history')
          .insert({
            saved_search_id: data.id,
            price: params.currentPrice,
          });
      }

      // Add user to subscribers list and send welcome email if new
      const isNewSubscriber = await addSubscriber(params.email, 'price_alert');
      
      if (isNewSubscriber) {
        // Send welcome email to new subscribers
        await sendWelcomeEmail(params.email, params.origin, params.destination);
      }

      toast.success('Price alert created!', {
        description: `We'll notify you at ${params.email} when prices drop.`,
      });

      // Refresh the list
      if (email) {
        await fetchSavedSearches();
      }

      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create price alert';
      setError(message);
      toast.error('Failed to create alert', { description: message });
      console.error('Error creating alert:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [email, fetchSavedSearches]);

  const updateAlert = useCallback(async (id: string, updates: Partial<SavedSearch>): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('saved_searches')
        .update(updates)
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success('Alert updated');
      await fetchSavedSearches();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update alert';
      toast.error('Failed to update alert', { description: message });
      console.error('Error updating alert:', err);
      return false;
    }
  }, [fetchSavedSearches]);

  const deleteAlert = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('saved_searches')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Alert deleted');
      await fetchSavedSearches();
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete alert';
      toast.error('Failed to delete alert', { description: message });
      console.error('Error deleting alert:', err);
      return false;
    }
  }, [fetchSavedSearches]);

  const toggleAlert = useCallback(async (id: string, isActive: boolean): Promise<boolean> => {
    return updateAlert(id, { is_active: isActive });
  }, [updateAlert]);

  const getPriceHistory = useCallback(async (searchId: string): Promise<PriceHistory[]> => {
    try {
      const { data, error: fetchError } = await supabase
        .from('price_history')
        .select('*')
        .eq('saved_search_id', searchId)
        .order('recorded_at', { ascending: true });

      if (fetchError) throw fetchError;
      return data || [];
    } catch (err) {
      console.error('Error fetching price history:', err);
      return [];
    }
  }, []);

  const recordPrice = useCallback(async (searchId: string, price: number): Promise<void> => {
    try {
      await supabase
        .from('price_history')
        .insert({
          saved_search_id: searchId,
          price,
        });

      // Update current lowest price if this is lower
      const search = savedSearches.find(s => s.id === searchId);
      if (search && (!search.current_lowest_price || price < search.current_lowest_price)) {
        await supabase
          .from('saved_searches')
          .update({ 
            current_lowest_price: price,
            last_checked_at: new Date().toISOString(),
          })
          .eq('id', searchId);
      }
    } catch (err) {
      console.error('Error recording price:', err);
    }
  }, [savedSearches]);

  useEffect(() => {
    if (email) {
      fetchSavedSearches();
    }
  }, [email, fetchSavedSearches]);

  return {
    savedSearches,
    isLoading,
    error,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
    getPriceHistory,
    recordPrice,
    refetch: fetchSavedSearches,
  };
}
