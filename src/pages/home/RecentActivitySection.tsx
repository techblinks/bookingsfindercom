import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Plane, Ticket } from "lucide-react";
import {
  MAX_RECENT_ITEMS,
  loadRecentActivity,
  selectContinuationCandidate,
  selectRecentItems,
  type FlightActivity,
  type RecentActivityEntry,
  type ThingsActivity,
} from "@/lib/recentActivity";
import { formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";
import { logInternalNavigation } from "@/lib/analytics";

/**
 * "Pick up where you left off" — Mobile V2 Phase 2A-3.
 *
 * Renders only what the traveller genuinely committed, and only if there is
 * something to show. Every rule about what counts as recent, resumable, expired
 * or duplicated already lives in the recentActivity model; this component asks
 * the model and lays the answer out.
 *
 * Two shapes, deliberately different:
 *
 *   continuation — a flight with a departure date that has not passed. It
 *                  restores the whole committed search.
 *   shortcut     — a route or a city. It restores intent only: the flight form
 *                  reopens for that route with no stale dates attached.
 *
 * Stay entries are filtered out of the input rather than hidden at render, so
 * they cannot consume one of the three visible slots. They stay in storage and
 * keep their model behaviour; they simply have no surface until hotel results
 * can restore a search reliably.
 *
 * Nothing here reads TripContext or writes any store.
 */

const safeTrack = (label: string, href: string) => {
  try {
    logInternalNavigation({ label, source: "homepage-mobile", href });
  } catch (_) {
    /* analytics must never block navigation */
  }
};

/** The label the traveller saw, falling back to the code they searched. */
const placeLabel = (label: string | undefined, code: string) => label ?? code;

/**
 * The full committed search, rebuilt field by field from stored values.
 * Parameters only — never a persisted URL, and never a tracking parameter.
 */
function buildContinuationUrl(flight: FlightActivity): string {
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
function buildRouteUrl(flight: FlightActivity): string {
  const params = new URLSearchParams({
    origin: flight.origin,
    destination: flight.destination,
  });
  return `/flights?${params.toString()}`;
}

/** City, plus the query if there was one. No filters, sort or pagination. */
function buildThingsUrl(things: ThingsActivity): string {
  const params = new URLSearchParams({ city: things.city });
  if (things.query) params.set("q", things.query);
  return `/things-to-do?${params.toString()}`;
}

const ROW_CLASS =
  "flex min-h-[56px] w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left motion-safe:transition-colors hover:bg-primary/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * A route with two independent truncation boundaries.
 *
 * Origin and destination each shrink on their own, so a long origin can never
 * push the destination off the row: the two ends shrink in proportion to their
 * own length and the arrow between them never shrinks. Truncating one joined
 * string would have hidden where the traveller was actually going.
 */
function RouteLine({ from, to, className }: { from: string; to: string; className: string }) {
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

function ContinuationCard({ flight }: { flight: FlightActivity }) {
  const from = placeLabel(flight.originLabel, flight.origin);
  const to = placeLabel(flight.destinationLabel, flight.destination);

  const details: string[] = [];
  if (flight.departureDate) {
    details.push(formatDateRangeDisplay(flight.departureDate, flight.returnDate));
  }
  if (flight.travellers) {
    details.push(
      formatTravellers(flight.travellers.adults, flight.travellers.children, flight.travellers.infants),
    );
  }

  return (
    <Link
      to={buildContinuationUrl(flight)}
      onClick={() => safeTrack("continue_recent_flight", "/flights")}
      aria-label={`Continue search, flights from ${from} to ${to}`}
      className="flex min-h-[64px] items-center gap-3 rounded-[14px] border border-strong bg-card px-4 py-3 shadow-sm motion-safe:transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/[0.08]">
        <Plane className="h-[18px] w-[18px] text-primary" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <RouteLine from={from} to={to} className="text-[15px] leading-[22px] font-semibold text-foreground" />
        {details.length > 0 && (
          <span className="block truncate text-[13px] leading-[18px] text-[hsl(var(--text-secondary))]">
            {details.join(" · ")}
          </span>
        )}
        <span className="mt-0.5 block text-[13px] leading-[18px] font-semibold text-primary">
          Continue search
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function FlightShortcut({ flight }: { flight: FlightActivity }) {
  const from = placeLabel(flight.originLabel, flight.origin);
  const to = placeLabel(flight.destinationLabel, flight.destination);

  return (
    <Link
      to={buildRouteUrl(flight)}
      onClick={() => safeTrack("recent_flight", "/flights")}
      aria-label={`Search flights from ${from} to ${to} again`}
      className={ROW_CLASS}
    >
      <Plane className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <RouteLine from={from} to={to} className="text-[15px] leading-[22px] text-foreground" />
        <span className="block text-[13px] leading-[18px] text-[hsl(var(--text-secondary))]">
          Search route again
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function ThingsShortcut({ things }: { things: ThingsActivity }) {
  return (
    <Link
      to={buildThingsUrl(things)}
      onClick={() => safeTrack("recent_things", "/things-to-do")}
      aria-label={`Things to do in ${things.city}`}
      className={ROW_CLASS}
    >
      <Ticket className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] leading-[22px] text-foreground">{things.city}</span>
        <span className="block truncate text-[13px] leading-[18px] text-[hsl(var(--text-secondary))]">
          {things.query ? things.query : "Things to do"}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

export default function RecentActivitySection() {
  /*
   * Storage is read after mount only: the first render must match whatever a
   * server produced, and a homepage can never depend on localStorage being
   * readable. loadRecentActivity already returns [] rather than throwing when
   * the store is missing, unavailable or corrupt.
   */
  const [entries, setEntries] = useState<RecentActivityEntry[]>([]);

  useEffect(() => {
    setEntries(loadRecentActivity());
  }, []);

  const continuation = useMemo(() => selectContinuationCandidate(entries), [entries]);

  const shortcuts = useMemo(
    () =>
      selectRecentItems(
        entries.filter(entry => entry.kind !== "stay"),
        continuation,
        MAX_RECENT_ITEMS,
      ),
    [entries, continuation],
  );

  // No history, nothing eligible, or a first visit: the section does not exist.
  if (!continuation && shortcuts.length === 0) return null;

  return (
    <section className="mt-8" aria-labelledby="recent-activity-heading">
      <h2
        id="recent-activity-heading"
        className="text-[18px] leading-[24px] font-bold text-foreground"
      >
        Pick up where you left off
      </h2>

      {continuation && (
        <div className="mt-3">
          <ContinuationCard flight={continuation} />
        </div>
      )}

      {shortcuts.length > 0 && (
        <ul className={continuation ? "mt-2 space-y-0.5" : "mt-3 space-y-0.5"}>
          {shortcuts.map(entry => (
            <li key={entry.key}>
              {entry.kind === "flight" ? (
                <FlightShortcut flight={entry} />
              ) : entry.kind === "things" ? (
                <ThingsShortcut things={entry} />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
