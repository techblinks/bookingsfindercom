/**
 * useHeroMedia — public hook for reading published hero media.
 *
 * Returns backend hero images when a complete published set exists,
 * otherwise signals `isUsingFallback` so pages use their built-in
 * local images / SVG fallbacks.
 *
 * Uses React Query for cache invalidation after admin publish.
 * Never returns incomplete sets. Never blocks initial render.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { HeroPageKey, HeroMediaSet, HeroMediaSlot } from "@/types/hero";
import { isValidSlotKey } from "@/types/hero";

export type { HeroPageKey, HeroMediaSet, HeroMediaSlot } from "@/types/hero";

export const HERO_MEDIA_QUERY_KEY = "heroMedia";

interface UseHeroMediaResult {
  data: HeroMediaSet | null;
  isLoading: boolean;
  error: Error | null;
  isComplete: boolean;
  isUsingFallback: boolean;
}

function buildPublicUrl(storagePath: string): string {
  const url = supabase.storage.from("site-media").getPublicUrl(storagePath);
  return url.data.publicUrl;
}

async function fetchHeroMedia(pageKey: HeroPageKey): Promise<HeroMediaSet | null> {
  // Fetch published set
  const { data: sets, error: setErr } = await supabase
    .from("site_hero_sets")
    .select("id, version_number, status")
    .eq("page_key", pageKey)
    .eq("status", "published")
    .limit(1);

  if (setErr) throw setErr;

  const published = sets?.[0];
  if (!published) return null;

  // Fetch assets
  const { data: assets, error: assetErr } = await supabase
    .from("site_hero_assets")
    .select("*")
    .eq("hero_set_id", published.id);

  if (assetErr) throw assetErr;

  if (!assets || assets.length < 4) return null;

  // Validate slot keys
  const bySlot: Record<string, (typeof assets)[number]> = {};
  for (const a of assets) {
    if (!isValidSlotKey(a.slot_key)) return null; // malformed → fallback
    bySlot[a.slot_key] = a;
  }

  // All four required slots must exist
  if (!bySlot.main || !bySlot.support_1 || !bySlot.support_2 || !bySlot.mobile) {
    return null;
  }

  const toSlot = (a: (typeof assets)[number]): HeroMediaSlot => ({
    storagePath: a.storage_path,
    publicUrl: buildPublicUrl(a.storage_path),
    altText: a.alt_text,
    isDecorative: a.is_decorative,
    focalX: a.focal_x,
    focalY: a.focal_y,
  });

  return {
    main: toSlot(bySlot.main),
    support1: toSlot(bySlot.support_1),
    support2: toSlot(bySlot.support_2),
    mobile: toSlot(bySlot.mobile),
    version: published.version_number,
  };
}

export function useHeroMedia(pageKey: HeroPageKey): UseHeroMediaResult {
  const query = useQuery({
    queryKey: [HERO_MEDIA_QUERY_KEY, pageKey],
    queryFn: () => fetchHeroMedia(pageKey),
    staleTime: 5 * 60 * 1000, // 5 min — fine for published content
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: true,
  });

  return {
    data: query.data ?? null,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error : query.error ? new Error(String(query.error)) : null,
    isComplete: query.data !== null && !query.isLoading,
    isUsingFallback: query.data === null && !query.isLoading,
  };
}

/**
 * Invalidate hero media cache for all pages (call after admin publish).
 */
export function invalidateHeroMediaCache(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: [HERO_MEDIA_QUERY_KEY] });
}
