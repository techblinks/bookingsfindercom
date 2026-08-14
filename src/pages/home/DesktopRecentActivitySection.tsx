import { Link } from "react-router-dom";
import { ArrowRight, Plane, Ticket } from "lucide-react";
import { type FlightActivity, type ThingsActivity } from "@/lib/recentActivity";
import { formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";
import {
  RouteLine,
  buildContinuationUrl,
  buildRouteUrl,
  buildThingsUrl,
  placeLabel,
  trackRecentActivity,
  useRecentActivitySurface,
} from "./recentActivitySurface";

/**
 * "Pick up where you left off" — desktop.
 *
 * Same model, same selection, same restore URLs as the mobile surface (all in
 * ./recentActivitySurface); this file owns only the desktop composition.
 *
 * From lg up the four actions read as ONE continuation band rather than a
 * dashboard: five equal conceptual columns, the resumable search spanning two
 * and each shortcut spanning one. Stacking the shortcuts beside the
 * continuation used to force the pale panel to the height of three rows, which
 * left a large hollow area inside it; four items on one row share a single
 * natural row height instead, and the whole section costs ~200px.
 *
 * Below lg the five-column row would crush the labels, so the continuation
 * takes the full width and the shortcuts sit under it as a three-up row —
 * responsive, never five columns at tablet widths.
 *
 * It is deliberately quiet. The navy product band above already carries the
 * page, so this sits on white with one hairline border, no shadow and no
 * orange — it is a way back into something the traveller already started, not
 * a second hero and not a dashboard.
 */

const safeTrack = (label: string, href: string) => trackRecentActivity(label, href, "homepage-desktop");

/**
 * A shortcut is a card now, not a row.
 *
 * At a fifth of the row a leading icon and a trailing chevron together cost
 * ~50px of the ~190px available, which clipped ordinary routes like
 * "Sydney → Melbourne" at 1024. So the chevron is gone and the icon moved down
 * to the meta line: the route or city gets the card's full width, and the icon
 * still says which product this is. Content is vertically centred because the
 * row height is set by the taller continuation beside it.
 */
const SHORTCUT_CLASS =
  // lg is the tightest column (~180px at 1024); one step less padding there is
  // what keeps an ordinary route like "Sydney → Melbourne" off the ellipsis.
  "group flex h-full min-h-[76px] flex-col justify-center gap-1 rounded-[12px] border border-border bg-card px-4 py-4 lg:px-3 xl:px-4 motion-safe:transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Icon + supporting line, under a full-width title. */
function ShortcutMeta({ icon: Icon, children }: { icon: typeof Plane; children: string }) {
  return (
    <span className="flex min-w-0 items-center gap-1.5 text-[13px] leading-[18px] text-[hsl(var(--text-secondary))]">
      <Icon className="h-[14px] w-[14px] shrink-0" aria-hidden="true" />
      <span className="min-w-0 truncate">{children}</span>
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
      className="group flex h-full min-w-0 flex-col justify-center gap-1 rounded-[14px] border border-strong bg-primary/[0.04] px-5 py-4 motion-safe:transition-colors hover:border-primary/50 hover:bg-primary/[0.07] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Plane className="h-[15px] w-[15px] text-primary" aria-hidden="true" />
        </span>
        <RouteLine from={from} to={to} className="text-[17px] leading-[24px] font-bold text-foreground" />
      </span>

      {/* pl aligns the two supporting lines under the route, past the icon */}
      {details.length > 0 && (
        <span className="block truncate pl-[38px] text-[13px] leading-[18px] text-[hsl(var(--text-secondary))]">
          {details.join(" · ")}
        </span>
      )}

      <span className="flex items-center gap-1.5 pl-[38px] text-[13px] leading-[18px] font-semibold text-primary">
        Continue search
        <ArrowRight
          className="h-[14px] w-[14px] shrink-0 motion-safe:transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
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
      className={SHORTCUT_CLASS}
    >
      <RouteLine from={from} to={to} className="text-[15px] leading-[22px] font-semibold text-foreground" />
      <ShortcutMeta icon={Plane}>Search route again</ShortcutMeta>
    </Link>
  );
}

function ThingsShortcut({ things }: { things: ThingsActivity }) {
  return (
    <Link
      to={buildThingsUrl(things)}
      onClick={() => safeTrack("recent_things", "/things-to-do")}
      aria-label={`Things to do in ${things.city}`}
      className={SHORTCUT_CLASS}
    >
      <span className="block truncate text-[15px] leading-[22px] font-semibold text-foreground">
        {things.city}
      </span>
      <ShortcutMeta icon={Ticket}>{things.query ? things.query : "Things to do"}</ShortcutMeta>
    </Link>
  );
}

export default function DesktopRecentActivitySection() {
  const { continuation, shortcuts, hasActivity } = useRecentActivitySurface();

  // First visit, nothing eligible, or unreadable storage: the section does not exist.
  if (!hasActivity) return null;

  return (
    <section className="bg-white py-6" aria-labelledby="recent-activity-heading">
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <h2
          id="recent-activity-heading"
          className="text-[20px] leading-[26px] font-bold text-[#0F172A]"
        >
          Pick up where you left off
        </h2>

        {/*
          * Five equal columns from lg: continuation 2, each shortcut 1. The
          * shortcut list keeps the same gap as the outer grid so its three
          * columns line up with columns 3–5 exactly, rather than approximately
          * as a fractional split would.
          */}
        <div className="mt-4 grid gap-3 lg:grid-cols-5">
          {continuation && (
            <div className="min-w-0 lg:col-span-2">
              <ContinuationCard flight={continuation} />
            </div>
          )}

          {shortcuts.length > 0 && (
            <ul
              className={
                continuation
                  ? "grid gap-3 sm:grid-cols-3 lg:col-span-3"
                  : "grid gap-3 sm:grid-cols-3 lg:col-span-5"
              }
            >
              {shortcuts.map(entry => (
                <li key={entry.key} className="min-w-0">
                  {entry.kind === "flight" ? (
                    <FlightShortcut flight={entry} />
                  ) : entry.kind === "things" ? (
                    <ThingsShortcut things={entry} />
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
