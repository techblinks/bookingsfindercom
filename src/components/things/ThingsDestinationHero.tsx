/**
 * BookingsFinder Things destination hero (T3C).
 *
 * WHY THIS REPLACES THE NAVY BAND
 *
 * The previous Things hero was a full brand-navy slab carrying a generic
 * "DISCOVER MORE / Find things to do" message and three floating input boxes.
 * It read as a separate product bolted onto BookingsFinder: heavier than the
 * rest of the site, static, and — on the Rome route — it never said Rome
 * anywhere above the search fields. It also sat in a `max-w-5xl` column while
 * the results below used `max-w-7xl`, so the page had two different left edges.
 *
 * The replacement is a light destination masthead: white settling into a soft
 * brand tint, a hairline base rule, and a BookingsFinder-drawn destination
 * motif anchored bottom-right. It shares the Flights hero's DISCIPLINE — the
 * product is operable in the first viewport, the copy is one line, nothing
 * decorative pushes the search down — without copying its navy construction.
 *
 * Two identities, one component:
 *
 *   DESTINATION ROUTE   breadcrumb · "Things to do in Rome" · Rome, Italy ·
 *                       one context line · search. Rome is a PLACE here, not a
 *                       string that happens to be in the query.
 *   HUB                 no breadcrumb, no place meta, the generic H1 and the
 *                       neutral "Try:" city shortcuts (which are examples, and
 *                       are labelled as examples — never a popularity claim).
 *
 * Search behaviour is untouched: this component owns presentation and forwards
 * every commit to the page, which still owns the registry-driven routing
 * contract, the provider identity and the URL.
 */
import { MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import DestinationAutocomplete from "@/components/search/DestinationAutocomplete";
import ThingsDestinationMotif from "@/components/things/ThingsDestinationMotif";
import type { ExperienceDestination } from "@/types/experiences";
import type { ThingsDestination } from "@/types/thingsDestination";

interface ThingsDestinationHeroProps {
  /** Canonical destination when this is a destination route; absent on the hub. */
  destination?: ThingsDestination;
  cityInput: string;
  onCityInputChange: (value: string) => void;
  onCitySelect: (destination: ExperienceDestination) => void;
  activityInput: string;
  onActivityInputChange: (value: string) => void;
  onSubmit: () => void;
  /** Hub-only example destinations. Never rendered on a destination route. */
  cityShortcuts?: readonly string[];
  onCityShortcutClick?: (city: string) => void;
}

/**
 * Field shell. One rounded segment, an icon that spans label + control, and a
 * focus-within brand ring so keyboard focus is obvious on a light surface —
 * the previous hero relied on the input's own ring inside a white box on a
 * white card, which was nearly invisible.
 */
const fieldClass =
  "group relative flex flex-1 items-center gap-3 rounded-xl px-3 py-2.5 transition-colors " +
  "focus-within:bg-things-brand-soft/70 focus-within:ring-2 focus-within:ring-primary/60 sm:px-4";

const labelClass =
  "block text-[11px] font-semibold uppercase leading-4 tracking-wide text-things-text-secondary";

const ThingsDestinationHero = ({
  destination,
  cityInput,
  onCityInputChange,
  onCitySelect,
  activityInput,
  onActivityInputChange,
  onSubmit,
  cityShortcuts,
  onCityShortcutClick,
}: ThingsDestinationHeroProps) => {
  const isDestinationRoute = Boolean(destination);
  const heading = destination
    ? `Things to do in ${destination.displayName}`
    : "Find things to do";

  return (
    <section
      aria-labelledby="things-hero-heading"
      className="relative isolate overflow-hidden border-b border-things-border bg-gradient-to-b from-things-surface-card via-things-surface-card to-things-brand-soft"
    >
      <div className="relative mx-auto w-full max-w-7xl px-4 pb-6 pt-4 sm:px-6 sm:pb-8 sm:pt-5 lg:px-8 lg:pb-10 lg:pt-6">
        {/* Destination ink. Decorative, low-presence, aligned to the content
            column's right edge (not the viewport's) so it reads as part of the
            layout rather than as bleed. Hidden below sm, where the headline
            block uses the full width and there is nowhere for it to go. */}
        <div className="pointer-events-none absolute right-4 top-0 hidden h-[64%] w-[56%] max-w-[620px] text-primary opacity-[0.18] sm:right-6 sm:block lg:right-8 lg:opacity-[0.22]">
          <ThingsDestinationMotif slug={destination?.slug} className="h-full w-full" />
        </div>

        {isDestinationRoute && destination && (
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-things-text-secondary">
              <li>
                <Link
                  to="/things-to-do"
                  className="rounded transition-colors hover:text-primary hover:underline things-focus-ring"
                >
                  Things to do
                </Link>
              </li>
              <li aria-hidden="true" className="text-things-text-muted">
                /
              </li>
              <li aria-current="page" className="font-medium text-things-text-primary">
                {destination.displayName}
              </li>
            </ol>
          </nav>
        )}

        <h1
          id="things-hero-heading"
          className="max-w-[18ch] text-[26px] font-extrabold leading-[1.12] tracking-tight text-things-text-primary sm:max-w-none sm:text-[32px] lg:text-[40px] lg:leading-[1.08]"
        >
          {heading}
        </h1>

        {isDestinationRoute && destination && (
          <p className="mt-2 flex items-center gap-1.5 text-sm font-medium text-primary">
            <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
            {destination.countryName
              ? `${destination.displayName}, ${destination.countryName}`
              : destination.displayName}
          </p>
        )}

        {/*
         * One line, and only what the architecture can back up: genuine
         * provider inventory, named as such. No queue claims, no price claims,
         * no "handpicked", no count.
         *
         * It is deliberately short. The longer version also promised "continue
         * to the provider when you're ready to book", which the trust line
         * directly beneath and the disclosure below the results BOTH already
         * say — three statements of one fact, costing two extra lines of the
         * mobile first viewport.
         */}
        <p className="mt-2.5 max-w-xl text-[15px] leading-[22px] text-things-text-secondary sm:mt-3 sm:text-base">
          {isDestinationRoute && destination
            ? `Tours, tickets and experiences in ${destination.displayName} from our partners.`
            : "Attractions, tours and experiences wherever you're going, from our partners."}
        </p>

        {/* ── Search ───────────────────────────────────────────────
            One shell with internal dividers, not three floating boxes. The
            orange Search is the single principal action of this viewport. */}
        <div className="mt-5 rounded-2xl border border-things-border bg-things-surface-card p-2 shadow-elevated sm:mt-6">
          {/* Horizontal from md, not lg: at 900px a stacked shell put a
              full-width orange bar across the page, which is exactly the
              oversized-tablet-search failure mode. */}
          <div className="flex flex-col gap-1.5 md:flex-row md:items-stretch md:gap-0">
            <div className={fieldClass}>
              <MapPin className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <label htmlFor="ttd-city" className={labelClass}>
                  Where are you going?
                </label>
                <DestinationAutocomplete
                  inputId="ttd-city"
                  hideLeadingIcon
                  value={cityInput}
                  onChange={onCityInputChange}
                  onSelect={onCitySelect}
                  placeholder="Search a city or destination"
                  className="h-8 w-full rounded-none border-0 bg-transparent px-0 pr-6 text-[15px] font-medium text-things-text-primary shadow-none transition-none placeholder:font-normal placeholder:text-things-text-muted focus:ring-0"
                />
              </div>
            </div>

            <div
              aria-hidden="true"
              className="mx-2 hidden w-px shrink-0 self-stretch bg-things-border md:my-2 md:block"
            />

            <div className={fieldClass}>
              <Search className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <label htmlFor="ttd-activity" className={labelClass}>
                  What do you want to do?
                </label>
                <input
                  id="ttd-activity"
                  placeholder="Museums, tours, landmarks..."
                  value={activityInput}
                  onChange={(e) => onActivityInputChange(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && onSubmit()}
                  className="h-8 w-full border-0 bg-transparent px-0 text-[15px] font-medium text-things-text-primary outline-none placeholder:font-normal placeholder:text-things-text-muted"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={onSubmit}
              className="mt-1 inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl bg-things-action px-6 text-[15px] font-semibold text-white transition-colors hover:bg-things-action-hover active:bg-things-action-strong things-focus-ring-action md:ml-2 md:mt-0 md:min-h-0 md:self-stretch md:px-7 lg:px-8"
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              Search
            </button>
          </div>
        </div>

        {/*
         * Hub only. These are EXAMPLES of destinations you can search — the
         * "Try:" label is the honest framing, because BookingsFinder holds no
         * popularity data that could rank them.
         */}
        {!isDestinationRoute && cityShortcuts && cityShortcuts.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="font-medium text-things-text-secondary">Try:</span>
            {cityShortcuts.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => onCityShortcutClick?.(city)}
                className="inline-flex min-h-[44px] items-center rounded-full border border-things-border bg-things-surface-card px-4 font-medium text-things-text-primary transition-colors hover:border-primary/50 hover:bg-things-brand-soft things-focus-ring"
              >
                {city}
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default ThingsDestinationHero;
