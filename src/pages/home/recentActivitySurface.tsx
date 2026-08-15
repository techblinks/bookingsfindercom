import { useEffect, useMemo, useState } from "react";
import {
  MAX_RECENT_ITEMS,
  loadRecentActivity,
  selectContinuationCandidate,
  selectRecentItems,
  type FlightActivity,
  type RecentActivityEntry,
  type ThingsActivity,
} from "@/lib/recentActivity";
import { logInternalNavigation } from "@/lib/analytics";
import {
  resolveThingsDestinationFromLegacyCity,
  thingsDestinationPath,
} from "@/lib/thingsDestinations";

/**
 * Shared contract behind "Pick up where you left off".
 *
 * Mobile and desktop lay the same answer out differently, but they must never
 * disagree about WHAT is shown or WHERE it goes. Selection, stay exclusion and
 * every restore URL therefore live here once; each surface only decides how it
 * looks. All the rules about recency, expiry, past dates and deduplication stay
 * where they already are — inside the recentActivity model.
 */

/**
 * What this surface should render, or nothing at all.
 *
 * Storage is read after mount only: the first render must match whatever a
 * server produced, and a homepage can never depend on localStorage being
 * readable. loadRecentActivity already returns [] rather than throwing when the
 * store is missing, unavailable or corrupt.
 */
export function useRecentActivitySurface(): {
  continuation: FlightActivity | null;
  shortcuts: RecentActivityEntry[];
  hasActivity: boolean;
} {
  const [entries, setEntries] = useState<RecentActivityEntry[]>([]);

  useEffect(() => {
    setEntries(loadRecentActivity());
  }, []);

  const continuation = useMemo(() => selectContinuationCandidate(entries), [entries]);

  const shortcuts = useMemo(
    () =>
      selectRecentItems(
        // Stays are filtered out of the INPUT so they cannot consume one of the
        // three visible slots. They keep their model behaviour and stay in
        // storage; they simply have no surface until hotel results can restore
        // a search reliably.
        entries.filter(entry => entry.kind !== "stay"),
        continuation,
        MAX_RECENT_ITEMS,
      ),
    [entries, continuation],
  );

  return { continuation, shortcuts, hasActivity: !!continuation || shortcuts.length > 0 };
}

/** Best-effort. Analytics must never block navigation, and never carries history payload. */
export function trackRecentActivity(label: string, href: string, source: string) {
  try {
    logInternalNavigation({ label, source, href });
  } catch (_) {
    /* ignored */
  }
}

/** The label the traveller saw, falling back to the code they searched. */
export const placeLabel = (label: string | undefined, code: string) => label ?? code;

/**
 * The full committed search, rebuilt field by field from stored values.
 * Parameters only — never a persisted URL, and never a tracking parameter.
 */
export function buildContinuationUrl(flight: FlightActivity): string {
  const params = new URLSearchParams({
    origin: flight.origin,
    destination: flight.destination,
  });
  if (flight.departureDate) params.set("departureDate", flight.departureDate);
  if (flight.returnDate) params.set("returnDate", flight.returnDate);
  if (flight.travellers) {
    const { adults, children, infants } = flight.travellers;
    params.set("passengers", String(adults + children + infants));
    params.set("adults", String(adults));
    params.set("children", String(children));
    params.set("infants", String(infants));
  }
  if (flight.cabinClass) params.set("cabinClass", flight.cabinClass);
  return `/flights?${params.toString()}`;
}

/**
 * Route only. A compact shortcut means "this route again", so it deliberately
 * carries no dates: the search form opens for the route and the traveller
 * chooses when to travel rather than inheriting a stale answer.
 */
export function buildRouteUrl(flight: FlightActivity): string {
  const params = new URLSearchParams({
    origin: flight.origin,
    destination: flight.destination,
  });
  return `/flights?${params.toString()}`;
}

/**
 * City, plus the query if there was one. No filters, sort or pagination.
 *
 * T2B: a stored city that resolves to a canonical registry destination
 * restores to its canonical path; every other city keeps the legacy hub
 * ?city= contract. Storage is untouched — the URL is rebuilt at render time.
 */
export function buildThingsUrl(things: ThingsActivity): string {
  const destination = resolveThingsDestinationFromLegacyCity(things.city);
  if (destination) {
    const params = new URLSearchParams();
    if (things.query) params.set("q", things.query);
    const search = params.toString();
    return `${thingsDestinationPath(destination)}${search ? `?${search}` : ""}`;
  }
  const params = new URLSearchParams({ city: things.city });
  if (things.query) params.set("q", things.query);
  return `/things-to-do?${params.toString()}`;
}

/**
 * A route with two independent truncation boundaries.
 *
 * Origin and destination each shrink on their own, so a long origin can never
 * push the destination off the row: the two ends shrink in proportion to their
 * own length and the arrow between them never shrinks. Truncating one joined
 * string would have hidden where the traveller was actually going.
 */
export function RouteLine({ from, to, className }: { from: string; to: string; className: string }) {
  return (
    <span className={`flex min-w-0 items-center gap-1.5 ${className}`}>
      {/* max-w keeps one long side from squeezing a short one that already fits */}
      <span className="min-w-0 max-w-[60%] truncate">{from}</span>
      <span aria-hidden="true" className="shrink-0 text-muted-foreground">
        →
      </span>
      <span className="min-w-0 max-w-[60%] truncate">{to}</span>
    </span>
  );
}
