/**
 * "Explore flight routes" — compact, geo-aware route discovery for /flights.
 *
 * Replaces the landing page's hardcoded route array with `useRouteDiscovery`,
 * keeping the Phase 1 visual hierarchy: the search hero stays dominant and this
 * section stays a single restrained band rather than a marketing block.
 *
 * Deliberate omissions:
 *  - No "popular"/"trending" wording. The upstream feed does not prove
 *    popularity, so the heading stays factual.
 *  - No price-alert controls. The feature has no auth handling and no tests.
 *  - No destination imagery. Hero imagery remains the visual experience.
 *  - No framer-motion. Transitions are CSS-only and motion-reduce aware.
 */
import { Link } from "react-router-dom";
import { Plane, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { logInternalNavigation } from "@/lib/analytics";
import {
  useRouteDiscovery,
  formatIndicativePrice,
  type DiscoveredRoute,
} from "@/hooks/useRouteDiscovery";

interface ExploreRoutesProps {
  /** Currently prefilled origin/destination, used only to highlight a match. */
  prefill?: { origin?: string; destination?: string };
  /** Origin the user already chose; takes priority over inferred geo. */
  preferredOrigin?: string;
}

/** One event per activation, matching the existing fire-and-forget pattern. */
function track(route: DiscoveredRoute, href: string) {
  try {
    logInternalNavigation({
      label: `${route.origin}-${route.destination}`,
      source: "flights",
      href,
    });
  } catch (_) {
    /* analytics must never break navigation */
  }
}

/** Fixed-height price slot so a missing price never shifts the card. */
function PriceLine({ route }: { route: DiscoveredRoute }) {
  const formatted = formatIndicativePrice(route.price, route.currency);
  return (
    <p className="mt-1.5 h-4 text-[11px] leading-4 text-muted-foreground">
      {formatted ? <>Indicative fare {formatted}</> : null}
    </p>
  );
}

function RouteCardSkeleton() {
  return (
    <li className="shrink-0 w-[210px]" aria-hidden="true">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3.5">
        <div className="h-9 w-9 shrink-0 rounded-full bg-muted animate-pulse motion-reduce:animate-none" />
        <div className="min-w-0 flex-1">
          <div className="h-4 w-24 rounded bg-muted animate-pulse motion-reduce:animate-none" />
          <div className="mt-1 h-3 w-32 rounded bg-muted/70 animate-pulse motion-reduce:animate-none" />
          <div className="mt-1.5 h-4" />
        </div>
      </div>
    </li>
  );
}

const ExploreRoutes = ({ prefill, preferredOrigin }: ExploreRoutesProps) => {
  const { routes, loading, isFallback, originName } = useRouteDiscovery({
    preferredOrigin,
    limit: 8,
  });

  // Nothing trustworthy to show and nothing loading — omit the section entirely
  // rather than inventing filler.
  if (!loading && routes.length === 0) return null;

  /*
   * Subheading. Only claims a regional basis when that is genuinely true —
   * i.e. the routes came from the API for an inferred origin, not from the
   * static fallback list.
   */
  const subheading =
    !loading && !isFallback && originName
      ? `Suggested routes from ${originName}. Select one to prefill the search form above.`
      : "Select a route to prefill the search form above. Add your travel dates to compare fares.";

  /*
   * A single restrained carousel at every width this section renders at.
   *
   * /flights shows the mobile task shell below 768px, so this band only ever
   * appears from 768 up. Keeping one scrollable row (rather than wrapping to a
   * grid) is what keeps the section a compact strip instead of a second
   * marketing block, and gives tablet the finger-friendly scroll behaviour.
   */
  const listClasses = cn(
    "flex gap-3 overflow-x-auto snap-x snap-mandatory pb-2 -mx-4 px-4",
    "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
    "sm:gap-4",
  );

  return (
    <section className="py-10 md:py-12 bg-background">
      <div className="container max-w-5xl mx-auto px-4">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
            Explore flight routes
          </h2>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">{subheading}</p>
        </div>

        <ul
          className={listClasses}
          aria-label="Suggested flight routes"
          data-testid="explore-routes-list"
        >
          {loading
            ? Array.from({ length: 4 }, (_, i) => <RouteCardSkeleton key={i} />)
            : routes.map((route) => {
                const href = `/flights?origin=${route.origin}&destination=${route.destination}`;
                const isCurrent =
                  prefill?.origin === route.origin && prefill?.destination === route.destination;
                const formatted = formatIndicativePrice(route.price, route.currency);
                const label = formatted
                  ? `Search flights from ${route.originName} (${route.origin}) to ${route.destinationName} (${route.destination}). Indicative fare ${formatted}.`
                  : `Search flights from ${route.originName} (${route.origin}) to ${route.destinationName} (${route.destination}).`;

                return (
                  <li
                    key={`${route.origin}-${route.destination}`}
                    className="shrink-0 w-[210px] snap-start"
                  >
                    <Link
                      to={href}
                      onClick={() => track(route, href)}
                      aria-label={label}
                      aria-current={isCurrent ? "true" : undefined}
                      className={cn(
                        "group flex h-full items-center gap-3 rounded-xl border border-border bg-card p-3.5",
                        "transition-colors hover:border-primary/40 hover:shadow-sm",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
                        isCurrent && "border-primary/30 bg-primary/5",
                      )}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 transition-colors group-hover:bg-primary/20">
                        <Plane className="h-4 w-4 text-primary" aria-hidden="true" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                          <span className="font-mono uppercase">{route.origin}</span>
                          <ArrowRight
                            className="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                            aria-hidden="true"
                          />
                          <span className="font-mono uppercase">{route.destination}</span>
                        </span>
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {route.originName} → {route.destinationName}
                        </span>
                        <PriceLine route={route} />
                      </span>
                    </Link>
                  </li>
                );
              })}
        </ul>
      </div>
    </section>
  );
};

export default ExploreRoutes;
