/**
 * BookingsFinder Things discovery rail — "Explore Rome" (T3C).
 *
 * WHAT THIS IS, EXACTLY
 *
 * Seven keyword shortcuts. Pressing one commits a free-text activity keyword
 * to the existing search. That is the whole contract, and the copy says so:
 * "Shortcuts that search <destination> experiences by keyword."
 *
 * WHAT THIS IS NOT
 *
 * It is not a provider taxonomy. BookingsFinder holds no verified Tiqets or
 * Viator tag IDs, so these tiles carry NO counts, no "popular", no "top", no
 * curation claim and no ranking — the Rome UX spec §5.1/§5.2 integrity rule.
 * The moment a genuine taxonomy is verified these same tiles can become true
 * filters with exact counts; until then a tile promises a search and nothing
 * more.
 *
 * Presentation replaces the old row of grey pills, which was indistinguishable
 * from a form control and gave a traveller no reason to look at it. Each tile
 * is a real surface — icon in a brand-soft disc, label, lift on hover — laid
 * out as a snap rail below `lg` (mobile and tablet both scroll it naturally)
 * and a seven-column row at `lg` and up.
 *
 * Accessibility: `aria-pressed` carries selection, so state is never conveyed
 * by colour alone; the accessible name is the plain label (no descriptor is
 * appended, because any descriptor here would be invented editorial copy);
 * tiles are ≥ 44px tall; the rail is a labelled group and is reachable and
 * operable entirely from the keyboard, scrolling the focused tile into view.
 */
import { Castle, Compass, Drama, FerrisWheel, Fish, Landmark, Ship } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ThingsDiscoveryItem {
  id: string;
  label: string;
}

interface ThingsDiscoveryRailProps {
  items: readonly ThingsDiscoveryItem[];
  selectedId: string;
  onToggle: (id: string) => void;
  /** Canonical destination display name, when this is a destination route. */
  destinationName?: string;
}

/**
 * Icons are illustrative of the KEYWORD, not of provider data. An id with no
 * icon falls back to Compass rather than borrowing an unrelated one.
 */
const ITEM_ICONS: Record<string, LucideIcon> = {
  museums: Landmark,
  "theme-parks": FerrisWheel,
  "city-tours": Compass,
  cruises: Ship,
  landmarks: Castle,
  "zoos-aquariums": Fish,
  "shows-entertainment": Drama,
};

const ThingsDiscoveryRail = ({
  items,
  selectedId,
  onToggle,
  destinationName,
}: ThingsDiscoveryRailProps) => {
  const headingId = "things-discovery-heading";

  return (
    <section aria-labelledby={headingId} className="mx-auto w-full max-w-7xl px-4 pt-7 sm:px-6 lg:px-8 lg:pt-9">
      <h2 id={headingId} className="text-[17px] font-bold tracking-tight text-things-text-primary lg:text-xl">
        {destinationName ? `Explore ${destinationName}` : "Explore by activity"}
      </h2>
      <p className="mt-1 text-[13px] leading-[18px] text-things-text-secondary">
        {destinationName
          ? `Shortcuts that search ${destinationName} experiences by keyword.`
          : "Shortcuts that search experiences by keyword."}
      </p>

      {/* Edge fade tells a touch user there is more rail to the right without
          adding a scrollbar or an autoplaying carousel. */}
      <div className="relative mt-3.5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-things-surface-page to-transparent lg:hidden"
        />
        <div
          role="group"
          aria-label={destinationName ? `Explore ${destinationName}` : "Explore by activity"}
          className="things-rail -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6 lg:mx-0 lg:grid lg:grid-cols-7 lg:overflow-visible lg:px-0"
        >
          {items.map((item) => {
            const Icon = ITEM_ICONS[item.id] ?? Compass;
            const isSelected = selectedId === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={isSelected}
                onClick={() => onToggle(item.id)}
                className={cn(
                  "group flex min-h-[106px] w-[124px] shrink-0 flex-col items-center justify-start gap-2 rounded-2xl border px-2 py-3.5 text-center",
                  "motion-safe:transition-all motion-safe:duration-200 things-focus-ring lg:w-auto",
                  isSelected
                    ? "border-primary bg-things-brand-soft shadow-card"
                    : "border-things-border bg-things-surface-card hover:border-primary/40 hover:shadow-elevated motion-safe:hover:-translate-y-0.5",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full motion-safe:transition-colors",
                    isSelected ? "bg-primary text-white" : "bg-things-brand-soft text-primary group-hover:bg-primary/15",
                  )}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span
                  className={cn(
                    "text-[12.5px] font-semibold leading-[16px]",
                    isSelected ? "text-primary" : "text-things-text-primary",
                  )}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ThingsDiscoveryRail;
