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
import { DEFAULT_BRANDING } from '@/types/branding';

// ── Types ──────────────────────────────────────────────────────────

interface BrandingContextValue {
  branding: BrandingSettings;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  getLogoUrl: (variant: LogoVariant) => string;
  hasCustomBranding: boolean;
}

const BrandingContext = createContext<BrandingContextValue | undefined>(undefined);

// ── Helpers ────────────────────────────────────────────────────────

/** Merge a DB row with DEFAULT_BRANDING so missing columns never become undefined. */
function mergeWithDefaults(raw: Record<string, unknown>): BrandingSettings {
  return {
    ...DEFAULT_BRANDING,
    ...raw,
    // Explicit guards for columns added in later migrations
    id: typeof raw.id === 'string' ? raw.id : '',
    logo_height_desktop:
      typeof raw.logo_height_desktop === 'number'
        ? raw.logo_height_desktop
        : DEFAULT_BRANDING.logo_height_desktop,
    logo_height_mobile:
      typeof raw.logo_height_mobile === 'number'
        ? raw.logo_height_mobile
        : DEFAULT_BRANDING.logo_height_mobile,
    logo_height_footer:
      typeof raw.logo_height_footer === 'number'
        ? raw.logo_height_footer
        : DEFAULT_BRANDING.logo_height_footer,
    updated_at:
      typeof raw.updated_at === 'string'
        ? raw.updated_at
        : new Date().toISOString(),
    updated_by:
      raw.updated_by === null || typeof raw.updated_by === 'string'
        ? (raw.updated_by as string | null)
        : null,
  } as BrandingSettings;
}

// ── Provider ──────────────────────────────────────────────────────

interface BrandingProviderProps {
  children: ReactNode;
}

export function BrandingProvider({ children }: BrandingProviderProps) {
  const [branding, setBranding] = useState<BrandingSettings>(() =>
    mergeWithDefaults({}),
  );
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
        setBranding(mergeWithDefaults(data as Record<string, unknown>));
      }
      // If no data, keep defaults (already set by mergeWithDefaults({}))
    } catch (err) {
      console.error('[BrandingProvider] Failed to fetch branding:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBranding();
  }, [fetchBranding]);

  useEffect(() => {
    const channel = supabase
      .channel('branding-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_branding' },
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

  return (
    <BrandingContext.Provider value={value}>{children}</BrandingContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────

export function useBranding(): BrandingContextValue {
  const context = useContext(BrandingContext);
  if (context !== undefined) {
    return context;
  }

  // ── Safe fallback when no provider exists ──────────────────────
  const safeBranding = mergeWithDefaults({});

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
