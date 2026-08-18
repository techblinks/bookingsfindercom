/**
 * BookingsFinder activity booking panel (T3E).
 *
 * The single decision surface of the activity detail page. It answers four
 * questions and nothing else:
 *
 *   who can I book with · what does it cost, if genuinely known ·
 *   what happens when I click · who takes the payment
 *
 * ── PROVIDER NEUTRALITY (the rule this component exists to protect) ─────────
 * Offers arrive already ordered by `sortOffersNeutrally` (provider name, then
 * product ID). Every offer row is rendered with IDENTICAL visual weight: the
 * same type scale, the same divider, the same full-width action-orange CTA.
 * There is no "best", "cheapest", "recommended", no highlight ring, no badge,
 * no reordering by price and no commission-aware ranking. Making one row look
 * different from another would be a recommendation we have not earned, so the
 * rows are deliberately interchangeable and the neutral-order note says so out
 * loud when there is more than one.
 *
 * ── STRUCTURE (why there are no nested cards) ──────────────────────────────
 * The panel is ONE card: a header block, a divided list of offer rows, and a
 * tinted disclosure footer. The previous revision drew a bordered card inside
 * a bordered card for every offer, which read as a settings screen and made
 * two providers look like two unrelated widgets. Hairline dividers inside a
 * single frame make them read as what they are — comparable ways to book the
 * same canonical experience.
 *
 * ── DATA HONESTY ───────────────────────────────────────────────────────────
 * PRICE renders only from `getOfferPriceLabel` (a genuine provider from-price).
 * A null price produces NO wording — no "Price on request", no "N/A", no dash.
 *
 * CTA renders only when `isValidProviderUrl` accepts the offer's genuine
 * checkout URL; the frontend never manufactures one. Without a valid URL the
 * row shows honest copy instead of a button that would go nowhere.
 *
 * No availability state is ever implied: the button says "Check availability"
 * because checking is genuinely what happens next, on the provider's site.
 */
import { ExternalLink } from "lucide-react";
import {
  getOfferPriceLabel,
  isValidProviderUrl,
  providerDisplayName,
} from "@/lib/thingsActivityDetail";
import type { ThingsActivityOfferDetail } from "@/types/thingsActivityDetail";
import { cn } from "@/lib/utils";

const SITE_NAME = "BookingsFinder";

/**
 * A tall panel pinned with `position: sticky` can push its own footer below
 * the viewport permanently, which would hide the disclosure and trap keyboard
 * users inside an unreachable region. Sticky is therefore applied only while
 * the panel is genuinely short. Live data carries at most two providers, so
 * this is the normal path — the guard exists so a future third and fourth
 * offer degrade to a calm static rail instead of an unreachable one.
 */
const MAX_STICKY_OFFERS = 3;

interface ActivityBookingPanelProps {
  /** Offers ALREADY ordered by `sortOffersNeutrally`. Never re-sorted here. */
  offers: readonly ThingsActivityOfferDetail[];
  className?: string;
}

const ActivityBookingPanel = ({ offers, className }: ActivityBookingPanelProps) => {
  const multiple = offers.length > 1;
  const sticky = offers.length <= MAX_STICKY_OFFERS;

  return (
    <aside
      aria-label="Booking options"
      data-testid="activity-booking-panel"
      /* Sticky from the 900px split onward — the same breakpoint the page
         grid uses, offset to clear the 68px sticky site header. */
      className={cn(sticky && "min-[900px]:sticky min-[900px]:top-[84px]", className)}
    >
      <div className="overflow-hidden rounded-2xl border border-things-border bg-things-surface-card shadow-card">
        <div className="border-b border-things-border px-5 py-4">
          <h2 className="text-base font-semibold text-things-text-primary">
            {multiple ? "Booking options" : "Book this experience"}
          </h2>
          {multiple && (
            /*
             * Said plainly because the ordering is genuinely alphabetical.
             * A traveller looking at two identical-weight rows deserves to
             * know the order carries no opinion.
             */
            <p className="mt-1 text-xs leading-relaxed text-things-text-secondary">
              Listed in a neutral order. {SITE_NAME} does not rank providers.
            </p>
          )}
        </div>

        {offers.length === 0 ? (
          <p className="px-5 py-6 text-sm text-things-text-secondary">
            No booking options are available yet.
          </p>
        ) : (
          <ul className="divide-y divide-things-border">
            {offers.map((offer) => (
              <li key={`${offer.provider}:${offer.providerProductId}`} className="px-5 py-4">
                <OfferRow offer={offer} />
              </li>
            ))}
          </ul>
        )}

        {/*
          * Required affiliate disclosure. Tinted rather than muted-grey: the
          * previous `text-muted` (#8BA0B8) failed contrast on white, and a
          * disclosure nobody can read is not a disclosure.
          */}
        <p className="border-t border-things-border bg-things-surface-page px-5 py-4 text-xs leading-relaxed text-things-text-secondary">
          {SITE_NAME} may earn a commission when you book with a provider.
          Availability and prices are set by the provider.
        </p>
      </div>
    </aside>
  );
};

/**
 * One provider's row. Identical treatment for every provider — see the
 * neutrality note in the file header before changing anything visual here.
 */
function OfferRow({ offer }: { offer: ThingsActivityOfferDetail }) {
  const priceLabel = getOfferPriceLabel(offer);
  const provider = providerDisplayName(offer.provider);
  const hasCta = isValidProviderUrl(offer.providerUrl);

  return (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-things-text-primary">{provider}</span>
        {/*
          * Genuine from-price only, kept in ONE element so the lead-in and the
          * amount are never read apart. No price → no wording at all.
          */}
        {priceLabel && (
          <span className="text-[15px] font-bold leading-none text-things-text-primary">
            From {priceLabel}
          </span>
        )}
      </div>

      {hasCta ? (
        <>
          <a
            href={offer.providerUrl as string}
            target="_blank"
            rel="sponsored nofollow noopener"
            /*
             * `aria-label` extends — never replaces — the visible label, so
             * two identically-worded CTAs are distinguishable to a screen
             * reader while staying WCAG 2.5.3 compliant.
             */
            aria-label={`Check availability with ${provider}`}
            className="mt-3 inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-things-action px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-things-action-hover active:bg-things-action-strong things-focus-ring-action"
          >
            Check availability
            {/* Marks the boundary: the next page is not BookingsFinder. */}
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
          <p className="mt-2 text-xs leading-relaxed text-things-text-secondary">
            Booking and payment handled by {provider}.
          </p>
        </>
      ) : (
        /*
         * No genuine checkout URL → no button. A disabled or dead-linked CTA
         * would imply we know where to send the traveller when we do not.
         */
        <p className="mt-3 text-sm text-things-text-secondary">
          Check availability with the provider
        </p>
      )}
    </>
  );
}

export default ActivityBookingPanel;
