/**
 * Central Branding Provider — Phase 7D.
 *
 * Loads branding settings from site_branding table once and caches them.
 * Provides a useBranding() hook for any component that needs branding.
 * Immediately updates after admin saves changes.
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { BrandingSettings, LogoVariant } from '@/types/branding';
import { DEFAULT_BRANDING, BRANDING_SINGLETON_ID } from '@/types/branding';

// ── Types ──────────────────────────────────────────────────────────

interface BrandingContextValue {
  /** The current branding settings (never null — uses defaults while loading). */
  branding: BrandingSettings;
  /** True while the initial fetch is in progress. */
  isLoading: boolean;
  /** Error from the last fetch attempt, or null. */
  error: Error | null;
  /** Reload branding from the database. */
  refresh: () => Promise<void>;
  /** Get the URL for a specific logo variant. Falls back to built-in assets. */
  getLogoUrl: (variant: LogoVariant) => string;
  /** True if custom branding has been loaded (at least one asset URL is set). */
  hasCustomBranding: boolean;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

// ── Provider ──────────────────────────────────────────────────────

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingSettings>(() => ({
    ...DEFAULT_BRANDING,
    id: '',
    updated_at: new Date().toISOString(),
    updated_by: null,
  }));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchBranding = useCallback(async () => {
    try {
      setError(null);
      const { data, error: dbError } = await supabase
        .from('site_branding')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (dbError) throw dbError;

      if (data) {
        setBranding(data as BrandingSettings);
      }
      // If no data, keep defaults
    } catch (err) {
      console.error('[BrandingProvider] Failed to fetch branding:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      // Keep defaults on error — site must still render
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load on mount
  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  // Listen for realtime changes (admin saved branding)
  useEffect(() => {
    const channel = supabase
      .channel('branding-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'site_branding',
        },
        () => {
          fetchBranding();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchBranding]);

  // ── Logo URL resolution ──────────────────────────────────────

  const getLogoUrl = useCallback(
    (variant: LogoVariant): string => {
      switch (variant) {
        case 'light':
          return branding.logo_light_url || branding.logo_url || '/logo.webp';
        case 'dark':
          return branding.logo_dark_url || branding.logo_url || '/logo.webp';
        case 'icon':
          return branding.icon_url || branding.logo_url || '/logo.webp';
        case 'default':
        default:
          return branding.logo_url || '/logo.webp';
      }
    },
    [branding],
  );

  const hasCustomBranding = useMemo(() => {
    return !!(
      branding.logo_url ||
      branding.logo_light_url ||
      branding.logo_dark_url ||
      branding.icon_url ||
      branding.favicon_url
    );
  }, [branding]);

  const value = useMemo<BrandingContextValue>(
    () => ({
      branding,
      isLoading,
      error,
      refresh: fetchBranding,
      getLogoUrl,
      hasCustomBranding,
    }),
    [branding, isLoading, error, fetchBranding, getLogoUrl, hasCustomBranding],
  );

  return <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>;
}

// ── Hook ──────────────────────────────────────────────────────────

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);
  if (context !== undefined) {
    return context;
  }

  // ── Safe fallback when no provider exists ──────────────────────
  // This allows existing components/tests to work without wrapping
  // everything in <BrandingProvider>. Uses built-in static assets.

  const safeBranding: BrandingSettings = {
    ...DEFAULT_BRANDING,
    id: '',
    updated_at: new Date().toISOString(),
    updated_by: null,
  };

  return {
    branding: safeBranding,
    isLoading: false,
    error: null,
    refresh: async () => {},
    getLogoUrl: (variant: LogoVariant): string => {
      switch (variant) {
        case 'light':
        case 'dark':
        case 'default':
          return '/logo.webp';
        case 'icon':
          return '/logo.webp';
      }
    },
    hasCustomBranding: false,
  };
}
