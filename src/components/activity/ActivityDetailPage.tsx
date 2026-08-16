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
  CheckCircle2,
  ExternalLink,
  ImageOff,
  MapPin,
  Star,
} from "lucide-react";
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
        <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-[#41536A]">
          <li>
            <Link to="/things-to-do" className="hover:text-[#D64A2A] hover:underline">
              Things to do
            </Link>
          </li>
          <li aria-hidden="true" className="text-[#8BA0B8]">
            /
          </li>
          <li>
            <Link
              to={thingsDestinationPath(destination)}
              className="hover:text-[#D64A2A] hover:underline"
            >
              {destination.displayName}
            </Link>
          </li>
          <li aria-hidden="true" className="text-[#8BA0B8]">
            /
          </li>
          <li aria-current="page" className="max-w-[16rem] truncate sm:max-w-xs">
            {activity.canonicalTitle}
          </li>
        </ol>
      </nav>

      <div className="mt-5 grid gap-10 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* ── Main column ──────────────────────────────────────── */}
        <div className="min-w-0">
          <header>
            <h1 className="break-words text-2xl font-bold leading-tight text-[#0F172A] sm:text-3xl">
              {activity.canonicalTitle}
            </h1>
            <p className="mt-2 flex items-center gap-1.5 text-sm text-[#41536A]">
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
                  <dd className="font-semibold text-[#0F172A]">
                    {ratingSummary.rating.toFixed(1)}
                  </dd>
                  <dd className="text-[#41536A]">
                    {ratingSummary.reviewCount.toLocaleString("en-AU")} reviews
                  </dd>
                </div>
              )}
              {priceSummary && (
                <div className="flex items-center gap-1.5">
                  <dt className="sr-only">From price</dt>
                  <dd className="font-semibold text-[#0F172A]">
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
              <h2 id="facts-heading" className="text-lg font-semibold text-[#0F172A]">
                Good to know
              </h2>
              <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                {facts.map((fact) => (
                  <li
                    key={fact}
                    className="flex items-center gap-2 rounded-lg border border-[#D8E0E7] bg-white px-3 py-2.5 text-sm text-[#41536A]"
                  >
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-emerald-600"
                      aria-hidden="true"
                    />
                    {THINGS_ACTIVITY_FACT_LABELS[fact]}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* ── About this experience (attributed, single-offer) ─ */}
          {about && (
            <section aria-labelledby="about-heading" className="mt-8">
              <h2
                id="about-heading"
                className="text-lg font-semibold text-[#0F172A]"
              >
                About this experience
              </h2>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-[#41536A]">
                {about.description}
              </p>
              <p className="mt-3 text-xs text-[#8BA0B8]">
                Description provided by {providerDisplayName(about.provider)}.
              </p>
            </section>
          )}
        </div>

        {/* ── Booking panel (provider-neutral) ─────────────────── */}
        <aside aria-label="Booking options" className="lg:mt-0">
          <div className="rounded-xl border border-[#D8E0E7] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-[#0F172A]">
              {sortedOffers.length > 1 ? "Booking options" : "Book this experience"}
            </h2>

            {sortedOffers.length === 0 ? (
              <p className="mt-4 text-sm text-[#41536A]">
                No booking options are available yet.
              </p>
            ) : (
              <div className="mt-4 space-y-3">
                {sortedOffers.map((offer) => (
                  <OfferCard key={`${offer.provider}:${offer.providerProductId}`} offer={offer} />
                ))}
              </div>
            )}

            <p className="mt-5 border-t border-[#D8E0E7] pt-4 text-xs leading-relaxed text-[#8BA0B8]">
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
    <div className="overflow-hidden rounded-xl border border-[#D8E0E7] bg-[#F5F1EC]">
      {showImage ? (
        <img
          src={imageUrl as string}
          alt={offer?.imageAlt || fallbackLabel}
          className="h-56 w-full object-cover sm:h-72 lg:h-80"
          loading="lazy"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-56 w-full flex-col items-center justify-center gap-3 px-6 text-center sm:h-72 lg:h-80">
          <ImageOff className="h-8 w-8 text-[#8BA0B8]" aria-hidden="true" />
          <p className="max-w-sm text-sm text-[#41536A]">
            No image is available for this experience yet.
          </p>
        </div>
      )}
      {offer?.imageCredit && (
        <p className="px-3 py-1.5 text-right text-[11px] text-[#8BA0B8]">
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
    <div className="rounded-lg border border-[#D8E0E7] p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="text-sm font-semibold text-[#0F172A]">
          {providerDisplayName(offer.provider)}
        </span>
        {priceLabel && (
          <span className="text-sm font-bold text-[#0F172A]">From {priceLabel}</span>
        )}
      </div>

      {hasCta ? (
        <>
          <a
            href={offer.providerUrl as string}
            target="_blank"
            rel="sponsored nofollow noopener"
            className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#D64A2A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#B83D22] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D64A2A] focus-visible:ring-offset-2"
          >
            Check availability
            <ExternalLink className="h-4 w-4 shrink-0" aria-hidden="true" />
          </a>
          <p className="mt-2 text-xs text-[#8BA0B8]">
            Booking and payment handled by {providerDisplayName(offer.provider)}.
          </p>
        </>
      ) : (
        <p className="mt-3 text-sm text-[#41536A]">
          Check availability with the provider
        </p>
      )}
    </div>
  );
}

export default ActivityDetailPage;
