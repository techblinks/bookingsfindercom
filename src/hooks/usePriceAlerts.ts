import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
