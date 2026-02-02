import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionStatus {
  plan: string;
  isProActive: boolean;
  canOptimize: boolean;
  monthlyUses: number;
  remainingOptimizations: number; // -1 means unlimited
  subscription: {
    status: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
  } | null;
}

export const useSubscription = () => {
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        // Not logged in - default to free tier with 1 allowed
        setStatus({
          plan: "free",
          isProActive: false,
          canOptimize: true,
          monthlyUses: 0,
          remainingOptimizations: 1,
          subscription: null,
        });
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke("get-subscription-status");
      
      if (fnError) throw fnError;
      
      setStatus(data);
    } catch (err) {
      console.error("Error fetching subscription status:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch subscription status");
      // Default to allowing optimization on error
      setStatus({
        plan: "free",
        isProActive: false,
        canOptimize: true,
        monthlyUses: 0,
        remainingOptimizations: 1,
        subscription: null,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchStatus]);

  const startCheckout = async (successUrl?: string, cancelUrl?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        throw new Error("Please sign in to upgrade to Pro");
      }

      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          successUrl: successUrl || `${window.location.origin}/account?success=true`,
          cancelUrl: cancelUrl || `${window.location.origin}/pricing`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
        return { success: true };
      }
      
      throw new Error("No checkout URL received");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start checkout";
      return { success: false, error: message };
    }
  };

  return {
    status,
    isLoading,
    error,
    refetch: fetchStatus,
    startCheckout,
    canOptimize: status?.canOptimize ?? true,
    isProActive: status?.isProActive ?? false,
  };
};
