/**
 * BookingsFinder activity-detail page — provider-neutral presentation.
 *
 * Renders a resolved ThingsActivityDetail. Every section is gated by
 * genuine data:
 *
 *   - image region: first offer with a genuine image, else a neutral
 *     BookingsFinder fallback panel (never unrelated stock photography)
 *   - rating / review summary: only when exactly ONE offer carries genuine
 *     values (unambiguous attribution)
 *   - price summary: only when exactly ONE offer carries a genuine price
 *   - feature facts: only facts EVERY offer reports as true
 *   - "About this experience": only when exactly ONE offer carries a
 *     non-blank description, attributed to that provider
 *   - provider CTA: only when the offer's providerUrl validates as http(s);
 *     external links open in a new tab with rel="sponsored nofollow noopener"
 *     and provider attribution ("Booking and payment handled by Viator.")
 *
 * No fabricated availability, no fabricated prices, no
 * best/cheapest/recommended claims, no automatic redirect, and no provider
 * ID anywhere in canonical URL identity.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  ExternalLink,
  MapPin,
  Star,
} from "lucide-react";
import ThingsFactChip from "@/components/things/ThingsFactChip";
import ThingsNoImageState from "@/components/things/ThingsNoImageState";
import ThingsSectionHeader from "@/components/things/ThingsSectionHeader";
import { thingsDestinationPath } from "@/lib/thingsDestinations";
import {
  getActivityLevelFacts,
  getActivityPriceSummary,
  getActivityRatingSummary,
  getOfferPriceLabel,
  getSingleOfferDescription,
  isValidProviderUrl,
  providerDisplayName,
  sortOffersNeutrally,
  THINGS_ACTIVITY_FACT_LABELS,
} from "@/lib/thingsActivityDetail";
import type {
  ThingsActivityDetail,
  ThingsActivityOfferDetail,
} from "@/types/thingsActivityDetail";
import type { ThingsDestination } from "@/types/thingsDestination";

interface ActivityDetailPageProps {
  /** Resolved detail (identity already validated by the resolver). */
  detail: ThingsActivityDetail;
  /** Full canonical destination registry entry (breadcrumb + location). */
  destination: ThingsDestination;
}

const SITE_NAME = "BookingsFinder";

const ActivityDetailPage = ({ detail, destination }: ActivityDetailPageProps) => {
  const { activity, offers } = detail;
  const sortedOffers = sortOffersNeutrally(offers);

  const ratingSummary = getActivityRatingSummary(sortedOffers);
  const priceSummary = getActivityPriceSummary(sortedOffers);
  const facts = getActivityLevelFacts(sortedOffers);
  const about = getSingleOfferDescription(sortedOffers);
  const heroOffer = sortedOffers.find(
    (offer) => typeof offer.imageUrl === "string" && offer.imageUrl.trim() !== "",
  );

  const locationText = destination.countryName
    ? `${destination.displayName}, ${destination.countryName}`
    : destination.displayName;

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      {/* ── Breadcrumb ─────────────────────────────────────────── */}
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-things-text-secondary">
          <li>
            <Link to="/things-to-do" className="hover:text-primary hover:underline things-focus-ring">
              Things to do
            </Link>
          </li>
          <li aria-hidden="true" className="text-things-text-muted">
            /
          </li>
          <li>
            <Link
              to={thingsDestinationPath(destination)}
              className="hover:text-primary hover:underline things-focus-ring"
            >
              {destination.displayName}
            </Link>
          </li>
          <li aria-hidden="true" className="text-things-text-muted">
            /
          </li>
          <li aria-current="page" className="max-w-[16rem] truncate text-things-text-primary sm:max-w-xs">
            {activity.canonicalTitle}
          </li>
        </ol>
      </nav>

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Main column ──────────────────────────────────────── */}
        <div className="min-w-0">
          <header>
            <h1 className="break-words text-2xl font-bold leading-tight text-things-text-primary sm:text-3xl">
              {activity.canonicalTitle}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-things-text-secondary">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              {locationText}
            </p>
          </header>

          {/* ── Rating / price summary (single-offer genuine only) ── */}
          {(ratingSummary || priceSummary) && (
            <dl className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              {ratingSummary && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">Rating</dt>
                  <Star
                    className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400"
                    aria-hidden="true"
                  />
                  <dd className="font-semibold text-things-text-primary">
                    {ratingSummary.rating.toFixed(1)}
                  </dd>
                  <dd className="text-things-text-secondary">
                    {ratingSummary.reviewCount.toLocaleString("en-AU")} reviews
                  </dd>
                </div>
              )}
              {priceSummary && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">From price</dt>
                  <dd className="font-semibold text-things-text-primary">
                    From{" "}
                    {formatSummaryPrice(priceSummary.price, priceSummary.currency)}
                  </dd>
                </div>
              )}
            </dl>
          )}

          {/* ── Image region or neutral fallback ───────────────── */}
          <div className="mt-5">
            <ActivityHeroImage
              offer={heroOffer ?? null}
              fallbackLabel={activity.canonicalTitle}
            />
          </div>

          {/* ── Feature facts (only genuinely known) ───────────── */}
          {facts.length > 0 && (
            <section aria-labelledby="facts-heading" className="mt-8">
              <ThingsSectionHeader id="facts-heading" heading="Good to know" />
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {facts.map((fact) => (
                  <ThingsFactChip key={fact} fact={THINGS_ACTIVITY_FACT_LABELS[fact]} />
                ))}
              </ul>
            </section>
          )}

          {/* ── About this experience (attributed, single-offer) ─ */}
          {about && (
            <section aria-labelledby="about-heading" className="mt-8">
              <ThingsSectionHeader id="about-heading" heading="About this experience" />
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-things-text-secondary">
                {about.description}
              </p>
              <p className="mt-3 text-xs text-things-text-secondary">
                Description provided by {providerDisplayName(about.provider)}.
              </p>
            </section>
          )}
        </div>

        {/* ── Booking panel (provider-neutral) ─────────────────── */}
        <aside aria-label="Booking options" className="lg:mt-0">
          <div className="rounded-xl border border-things-border bg-things-surface-card p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-things-text-primary">
              {sortedOffers.length > 1 ? "Booking options" : "Book this experience"}
            </h2>

            {sortedOffers.length === 0 ? (
              <p className="mt-4 text-sm text-things-text-secondary">
                No booking options are available yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {sortedOffers.map((offer) => (
                  <OfferCard key={`${offer.provider}:${offer.providerProductId}`} offer={offer} />
                ))}
              </div>
            )}

            <p className="mt-5 border-t border-things-border pt-4 text-xs leading-relaxed text-things-text-muted">
              {SITE_NAME} may earn a commission when you book with a provider.
              Availability and prices are set by the provider.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
};

/** Single-offer price formatting (same currency contract as search cards). */
function formatSummaryPrice(price: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency,
      maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}

/** Hero image with a neutral fallback panel — never unrelated stock imagery. */
function ActivityHeroImage({
  offer,
  fallbackLabel,
}: {
  offer: ThingsActivityOfferDetail | null;
  fallbackLabel: string;
}) {
  const [failed, setFailed] = useState(false);
  const imageUrl = offer?.imageUrl ?? null;
  const showImage = Boolean(imageUrl) && !failed;

  return (
    <div className="overflow-hidden rounded-xl border border-things-border bg-things-surface-subtle">
      {showImage ? (
        <img
          src={imageUrl as string}
          alt={offer?.imageAlt || fallbackLabel}
          className="h-56 w-full object-cover sm:h-72 lg:h-80"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="h-56 w-full sm:h-72 lg:h-80">
          <ThingsNoImageState variant="detail" />
        </div>
      )}
      {offer?.imageCredit && (
        <p className="px-3 py-1.5 text-right text-[11px] text-things-text-muted">
          Image: {offer.imageCredit}
        </p>
      )}
    </div>
  );
}

/**
 * One provider offer card. The CTA renders ONLY when the offer carries a
 * validated http(s) providerUrl; otherwise honest copy ("Check availability
 * with the provider") is shown instead of a fake booking button.
 */
function OfferCard({ offer }: { offer: ThingsActivityOfferDetail }) {
  const priceLabel = getOfferPriceLabel(offer);
  const hasCta = isValidProviderUrl(offer.providerUrl);

  return (
    <div className="rounded-lg border border-things-border p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-things-text-primary">
          {providerDisplayName(offer.provider)}
        </span>
        {priceLabel && (
          <span className="text-sm font-bold text-things-text-primary">From {priceLabel}</span>
        )}
      </div>

      {hasCta ? (
        <>
          <a
            href={offer.providerUrl as string}
            target="_blank"
            rel="sponsored nofollow noopener"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-things-action px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-things-action-hover active:bg-things-action-strong things-focus-ring-action"
          >
            Check availability
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
          <p className="mt-2 text-xs text-things-text-secondary">
            Booking and payment handled by {providerDisplayName(offer.provider)}.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-things-text-secondary">
          Check availability with the provider
        </p>
      )}
    </div>
  );
}

export default ActivityDetailPage;
