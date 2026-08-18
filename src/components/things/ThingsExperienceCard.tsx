/**
 * BookingsFinder Things experience card (T3D).
 *
 * Extracted from ThingsToDo.tsx so the listing card has one home, one test
 * surface, and one visual contract shared by the results grid and its loading
 * skeleton.
 *
 * ── PREMIUM TRAVEL-CARD HIERARCHY ────────────────────────────────────────────
 * The reading order is deliberate and top-down: genuine image → genuine
 * city/country → readable title → calm rating/reviews → restrained genuine
 * feature facts → genuine price → subordinate provider attribution → calm CTA.
 * Nothing competes with the title, and nothing shouts.
 *
 * ── DATA HONESTY (the rules this component must never break) ─────────────────
 *
 * PRICE. Both providers emit a genuine MINIMUM price, verified at the mapper:
 *   - Tiqets  `minPrice.amount`            (src/services/experiences.ts)
 *   - Viator  `pricing.summary.fromPrice`  (supabase/functions/_shared/
 *                                           viator-normalizer.ts)
 * A "From <price>" lead-in is therefore truthful for BOTH providers, and is
 * used uniformly. When `price` is null the card renders NO price wording at
 * all — no "Price on request", no "-", no placeholder. An absent price is
 * shown by absence, because we do not know that the experience is priced on
 * request; we only know we were not given a number.
 *
 * FEATURES. Only `=== true` renders. `false` and `null` are not the same thing
 * and neither may produce a positive claim — a null is missing evidence, not a
 * denial, and a false is a denial we have no reason to advertise. The fact list
 * is capped so a data-rich product cannot turn the card into a feature dump.
 *
 * `likelyToSellOut` is deliberately NOT surfaced. It is provider merchandising
 * pressure, not a fact about the experience, and this card carries no
 * popularity, urgency, scarcity or recommendation claims of any kind.
 *
 * LOCATION. `city`/`country` are the PRODUCT's own values as returned by the
 * provider and are printed verbatim. Surrounding-area inventory (a Tivoli or
 * Ostia product surfaced by a Rome search) keeps its true location — the route
 * being Rome never overwrites a product's genuine city.
 *
 * ── CTA CONTRACT (preserved verbatim from T3B) ───────────────────────────────
 *   mapped   → "View details", internal React Router <Link>, same tab,
 *              no target, no rel, no external icon.
 *   unmapped → "View experience", the exact genuine outbound URL,
 *              target="_blank", rel="sponsored nofollow noopener",
 *              ExternalLink icon marking it as leaving the site.
 * Both share ONE calm outline family (`border-primary/30` + `text-primary`).
 * Neither is orange: orange is reserved for the single primary Search action.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Star, MapPin, Check, ExternalLink } from "lucide-react";
import ThingsNoImageState from "@/components/things/ThingsNoImageState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { ExperienceProduct } from "@/types/experiences";

/**
 * Shared calm listing-action family. Mapped and unmapped CTAs are the SAME
 * visual weight because they are the same promise to the traveller ("see more
 * about this experience") — only their destination semantics differ.
 */
const CTA_CLASS =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-primary/30 bg-things-surface-card px-3.5 py-2 text-[13px] font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/5 things-focus-ring shrink-0";

/**
 * Customer-visible labels for genuine boolean product facts.
 *
 * `likelyToSellOut` is absent BY DESIGN and must stay absent: adding it here is
 * the single change that would turn this calm card into an urgency card.
 */
const FEATURE_FACTS: ReadonlyArray<{
  key: keyof ExperienceProduct["features"];
  label: string;
}> = [
  { key: "skipLine", label: "Skip the line" },
  { key: "freeCancellation", label: "Free cancellation" },
  { key: "instantConfirmation", label: "Instant confirmation" },
  { key: "smartphoneTicket", label: "Mobile ticket" },
  { key: "wheelchairAccessible", label: "Wheelchair accessible" },
];

/**
 * A card is a summary, not a spec sheet. Three facts keep the block to two
 * calm lines at every column count; the activity detail page carries the full
 * set. Truncation here hides facts, it never invents them.
 */
const MAX_VISIBLE_FACTS = 3;

export function formatPrice(price: number | null, currency: string | null): string | null {
  if (price === null || Number.isNaN(price)) return null;
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency || "AUD",
      maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    }).format(price);
  } catch {
    return currency ? `${currency} ${price}` : `${price}`;
  }
}

export function providerLabel(provider: ExperienceProduct["provider"]): string {
  return provider === "viator" ? "Viator" : "Tiqets";
}

/** Only `=== true` survives. `false` and `null` both yield nothing. */
export function visibleFeatureFacts(features: ExperienceProduct["features"]): string[] {
  return FEATURE_FACTS.filter(({ key }) => features[key] === true)
    .map(({ label }) => label)
    .slice(0, MAX_VISIBLE_FACTS);
}

export interface ThingsExperienceCardProps {
  product: ExperienceProduct;
  /**
   * Exact canonical BookingsFinder activity path, present ONLY when the
   * server-backed mapping API returned and validated a mapping for this
   * product identity. The frontend never manufactures one.
   */
  canonicalPath?: string | null;
  className?: string;
}

const ThingsExperienceCard = ({ product, canonicalPath, className }: ThingsExperienceCardProps) => {
  const [imageFailed, setImageFailed] = useState(false);

  const price = formatPrice(product.price, product.currency);
  /*
   * The product's OWN location, never the searched destination. A comma joins
   * the two only when both exist, so a product with a city and no country
   * reads "Tivoli" rather than "Tivoli, ".
   */
  const locationLabel = [product.city, product.country].filter(Boolean).join(", ");
  const facts = visibleFeatureFacts(product.features);
  const hasRatingBlock = product.rating !== null || product.reviewCount !== null;

  return (
    <article
      role="article"
      data-testid="things-experience-card"
      className={cn(
        "group flex h-full flex-col overflow-hidden rounded-2xl border border-things-border bg-things-surface-card shadow-card motion-safe:transition-all motion-safe:duration-200 hover:border-primary/25 hover:shadow-elevated motion-safe:hover:-translate-y-0.5",
        className,
      )}
    >
      {/*
        * The image carries no overlay chips. Badges floating on the photo were
        * the loudest thing on the old card and competed with the title for the
        * first fixation; genuine facts now sit in the body where they can be
        * read as facts rather than as decoration.
        */}
      <div className="relative aspect-[16/11] overflow-hidden bg-things-surface-subtle">
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt || product.title || "Experience photo"}
            onError={() => setImageFailed(true)}
            className="h-full w-full object-cover motion-safe:transition-transform motion-safe:duration-500 motion-safe:group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <ThingsNoImageState icon="map-pin" label={product.title} />
        )}
      </div>

      <div className="flex flex-1 flex-col p-4">
        {locationLabel && (
          <p className="mb-1.5 flex items-center gap-1.5 text-xs text-things-text-secondary">
            <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <span className="line-clamp-1">{locationLabel}</span>
          </p>
        )}

        <h3 className="mb-2 line-clamp-2 text-[15px] font-semibold leading-snug text-things-text-primary">
          {product.title || "Experience"}
        </h3>

        {hasRatingBlock && (
          <p className="mb-2.5 flex items-center gap-1.5 text-xs text-things-text-secondary">
            {product.rating !== null && (
              <span className="flex items-center gap-1 font-semibold text-things-text-primary">
                {/*
                  * Calm rating: a single bronze star at text weight, not a
                  * saturated yellow badge. The number is the signal.
                  */}
                <Star
                  className="h-3.5 w-3.5 fill-things-warning text-things-warning"
                  aria-hidden="true"
                />
                {product.rating.toFixed(1)}
              </span>
            )}
            {product.reviewCount !== null && (
              <span>
                {product.rating !== null && <span aria-hidden="true">· </span>}
                {product.reviewCount.toLocaleString()} reviews
              </span>
            )}
          </p>
        )}

        {facts.length > 0 && (
          <ul
            data-testid="things-card-facts"
            className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1"
          >
            {facts.map((fact) => (
              <li
                key={fact}
                className="flex items-center gap-1 text-xs text-things-text-secondary"
              >
                <Check className="h-3.5 w-3.5 shrink-0 text-things-success" aria-hidden="true" />
                {fact}
              </li>
            ))}
          </ul>
        )}

        {/*
          * Footer pinned to the bottom so price and CTA align across a row of
          * cards with different title and fact heights — the scan line that
          * makes a grid feel calm rather than ragged.
          *
          * No divider rule: on a sparse product (no rating, no facts) the
          * pinned footer leaves whitespace above it, and a rule drawn across
          * that gap advertised the missing data instead of letting it pass
          * quietly. The price's own weight separates the footer well enough.
          */}
        <div className="mt-auto flex items-end justify-between gap-3 pt-3">
          <div className="min-w-0">
            {/*
              * Genuine minimum price only. No price → no wording, no
              * placeholder, no "Price on request".
              */}
            {price && (
              <p className="text-[17px] font-bold leading-tight text-things-text-primary">
                <span className="text-xs font-medium text-things-text-secondary">From </span>
                {price}
              </p>
            )}
            <p
              /*
               * 12px minimum on `text-secondary`. An earlier revision set the
               * attribution at 11px on `text-muted` (#8BA0B8), which fails
               * contrast on white — subordinate must never mean unreadable.
               */
              className={cn(
                "truncate text-xs text-things-text-secondary",
                price && "mt-0.5",
              )}
            >
              Provided by {providerLabel(product.provider)}
            </p>
          </div>

          {canonicalPath ? (
            /*
             * Mapped card — internal BookingsFinder navigation ONLY. This is
             * not an affiliate click: same-tab React Router link, no
             * target="_blank", no sponsored rel, no ExternalLink icon. The
             * path came from the validated mapping API — never guessed.
             */
            <Link to={canonicalPath} className={CTA_CLASS}>
              View details
            </Link>
          ) : product.outboundUrl ? (
            <a
              href={product.outboundUrl}
              target="_blank"
              rel="sponsored nofollow noopener"
              className={CTA_CLASS}
            >
              View experience
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
};

/**
 * Loading skeleton — structurally the SAME card: identical border, radius,
 * surface, 4:3 media box and 16px body padding, with a block standing in for
 * each row the real card renders (location, two title lines, rating, facts,
 * footer rule + price/CTA). Matching the structure is what stops the grid
 * jumping when real results replace it.
 */
export const ThingsExperienceCardSkeleton = () => (
  <div
    data-testid="things-experience-card-skeleton"
    aria-hidden="true"
    className="flex h-full flex-col overflow-hidden rounded-2xl border border-things-border bg-things-surface-card shadow-card"
  >
    <Skeleton className="aspect-[16/11] w-full rounded-none" />
    <div className="flex flex-1 flex-col p-4">
      <Skeleton className="mb-1.5 h-3 w-24" />
      <Skeleton className="mb-1.5 h-4 w-full" />
      <Skeleton className="mb-2.5 h-4 w-3/5" />
      <Skeleton className="mb-3 h-3 w-32" />
      <Skeleton className="mb-3 h-3 w-40" />
      <div className="mt-auto flex items-end justify-between gap-3 pt-3">
        <div className="min-w-0 flex-1">
          <Skeleton className="mb-1.5 h-5 w-20" />
          <Skeleton className="h-2.5 w-24" />
        </div>
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>
    </div>
  </div>
);

export default ThingsExperienceCard;
