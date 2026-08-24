/**
 * BF-FLIGHTS-CACHE-1 Phase L — user-facing freshness copy for the
 * server-side flight-search cache. Every string here describes
 * BOOKINGSFINDER'S OWN cache-fetch time (fetchedAt/ageSeconds from
 * search-flights' response), never a claimed Travelpayouts provider
 * observation time — the Data API does not expose a trustworthy exact
 * found_at (see supabase/functions/search-flights/index.ts), so none is
 * invented here.
 */
import type { FlightSearchCacheStatus } from "@/types/flight";

export function formatFlightCacheAge(ageSeconds: number): string {
  if (ageSeconds < 60) return "moments ago";
  const minutes = Math.floor(ageSeconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/**
 * "hit"/"refreshed" — a plain freshness line ("Recent-fare data refreshed
 * 2h ago."). "stale" — an explicit, honest caveat that this data could not
 * be refreshed just now. "unavailable" (and absent cacheStatus, e.g. a
 * disabled/Business search that never called search-flights at all)
 * return null — callers show their own distinct message for those.
 */
export function getFlightCacheFreshnessMessage(meta: {
  cacheStatus?: FlightSearchCacheStatus;
  ageSeconds?: number;
}): string | null {
  if (meta.cacheStatus === "hit" || meta.cacheStatus === "refreshed") {
    if (typeof meta.ageSeconds !== "number") return null;
    return `Recent-fare data refreshed ${formatFlightCacheAge(meta.ageSeconds)}.`;
  }
  if (meta.cacheStatus === "stale") {
    return "Unable to refresh right now. Showing older recent-fare data.";
  }
  return null;
}
