/**
 * Destination autocomplete service.
 *
 * Fetches a full destination index once via the tiqets-public Edge Function
 * and caches it with React Query (30 min stale, 1 hr cache).  All search
 * happens client‑side against the cached list — no API call per keystroke.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ExperienceDestination } from "@/types/experiences";

/* ------------------------------------------------------------------ */
/*  Accent‑tolerant normalisation                                      */
/* ------------------------------------------------------------------ */

function normalize(s: string): string {
  // NFD decomposes accented chars → base + combining marks;
  // the regex strips the combining marks, yielding plain ASCII.
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

/* ------------------------------------------------------------------ */
/*  Client‑side fuzzy search                                           */
/* ------------------------------------------------------------------ */

export function searchDestinations(
  query: string,
  destinations: ExperienceDestination[],
): ExperienceDestination[] {
  const q = query.trim();
  if (!q) return [];

  const qNorm = normalize(q);

  const prefixMatches: ExperienceDestination[] = [];
  const substringMatches: ExperienceDestination[] = [];

  for (const dest of destinations) {
    const nameNorm = normalize(dest.name);
    const countryNorm = dest.country ? normalize(dest.country) : "";

    const nameStarts = nameNorm.startsWith(qNorm);
    const countryStarts = countryNorm.startsWith(qNorm);

    if (nameStarts || countryStarts) {
      prefixMatches.push(dest);
    } else if (nameNorm.includes(qNorm)) {
      substringMatches.push(dest);
    }
  }

  // Stable sort: alphabetically within each bucket
  const collator = new Intl.Collator("en", { sensitivity: "base" });
  prefixMatches.sort((a, b) => collator.compare(a.name, b.name));
  substringMatches.sort((a, b) => collator.compare(a.name, b.name));

  return [...prefixMatches, ...substringMatches];
}

/* ------------------------------------------------------------------ */
/*  React Query hook — cached destination index                        */
/* ------------------------------------------------------------------ */

const DESTINATIONS_QUERY_KEY = ["destinations"] as const;

export function useDestinations() {
  const { data, isLoading, error } = useQuery<ExperienceDestination[]>({
    queryKey: DESTINATIONS_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("tiqets-public", {
        body: { action: "destinations" },
      });
      if (error) throw new Error(error.message);
      if (!data || !Array.isArray(data.destinations)) throw new Error("Invalid destinations response");
      return data.destinations;
    },
    staleTime: 30 * 60 * 1000,  // 30 minutes — background refetch threshold
    gcTime: 60 * 60 * 1000,     // 1 hour — keep in cache after unmount (React Query ≥v5)
  });

  return {
    destinations: data ?? [],
    isLoading,
    error: error ? (error instanceof Error ? error.message : "Failed to load destinations") : null,
  };
}