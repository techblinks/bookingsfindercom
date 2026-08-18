/**
 * BookingsFinder activity-detail page (T3E) — provider-neutral presentation.
 *
 * The canonical decision page for one BookingsFinder activity. T3C redesigned
 * the destination shell and T3D the result card; this page is the step after
 * the card, and it is built to answer, in this order:
 *
 *   what is this · where is it · what evidence do we genuinely have ·
 *   what is genuinely known about it · what does it cost, if known ·
 *   who can I book with · what happens when I click
 *
 * ── COMPOSITION ────────────────────────────────────────────────────────────
 * A full-width identity block sits ABOVE the two-column body, so the canonical
 * title owns the top of the page at every width instead of sharing the first
 * fixation with a booking widget. Below it:
 *
 *   content column  — media, "Good to know", "About this experience"
 *   decision rail   — ActivityBookingPanel (the only elevated card on the page)
 *
 * The rail is the single elevated surface precisely so the eye finds the
 * decision without anything shouting. Everything else sits directly on the
 * T3C canvas with whitespace rather than boxes doing the separating — a page
 * of bordered panels reads as a settings screen, not as a travel page.
 *
 * On mobile the DOM order IS the reading order: identity → media → evidence →
 * description → booking. Booking sits last deliberately. The genuine price and
 * rating already appear in the identity block, so the traveller reaches the
 * orange button having seen the evidence rather than before it.
 *
 * ── DATA HONESTY (unchanged from T2D-B1 / T3B — visual work only) ───────────
 * Every section is gated by the existing truth helpers and NONE of those gates
 * was loosened for layout convenience:
 *
 *   - hero media: the first neutrally-sorted offer carrying a genuine image;
 *     otherwise the designed no-image state. Never stock, never the
 *     destination photo standing in for a product, never one image duplicated
 *     into a gallery to imply media we do not have.
 *   - rating / reviews: `getActivityRatingSummary` — only when exactly ONE
 *     offer carries genuine values, so attribution is unambiguous. Never
 *     averaged, never summed across providers.
 *   - from-price: `getActivityPriceSummary` — same single-offer rule. A null
 *     price renders NOTHING; there is no "Price on request".
 *   - facts: `getActivityLevelFacts` — a fact is claimed only when EVERY offer
 *     reports it `true`. `null` is missing evidence, not a denial.
 *   - description: `getSingleOfferDescription`, with its provider attribution
 *     kept. Never merged across providers, never rewritten, never generated.
 *
 * `tagline`, `duration`, `meetingPoint`, `availabilityState`, `lastVerifiedAt`
 * and `fetchedAt` are deliberately UNUSED. No current source populates most of
 * them, and an empty shell waiting for future data would advertise the gap.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Star } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ActivityBookingPanel from "@/components/activity/ActivityBookingPanel";
import ThingsFactChip from "@/components/things/ThingsFactChip";
import ThingsNoImageState from "@/components/things/ThingsNoImageState";
import ThingsSectionHeader from "@/components/things/ThingsSectionHeader";
import { thingsDestinationPath } from "@/lib/thingsDestinations";
import {
  formatActivityPrice,
  getActivityLevelFacts,
  getActivityPriceSummary,
  getActivityRatingSummary,
  getSingleOfferDescription,
  providerDisplayName,
  sortOffersNeutrally,
  THINGS_ACTIVITY_FACT_LABELS,
} from "@/lib/thingsActivityDetail";
import type {
  ThingsActivityDetail,
  ThingsActivityOfferDetail,
} from "@/types/thingsActivityDetail";
import type { ThingsDestination } from "@/types/thingsDestination";
import { cn } from "@/lib/utils";

interface ActivityDetailPageProps {
  /** Resolved detail (identity already validated by the resolver). */
  detail: ThingsActivityDetail;
  /** Full canonical destination registry entry (breadcrumb + location). */
  destination: ThingsDestination;
}

/**
 * Shared page gutter. `max-w-7xl` matches the T3C destination page exactly, so
 * navigating card → detail keeps one continuous content edge rather than the
 * page narrowing by 128px mid-journey.
 */
const SHELL = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

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

  /*
   * Location comes from the canonical destination registry, never from
   * provider text: the registry owns destination identity, and a provider's
   * own city string is offer-scoped data.
   */
  const locationText = destination.countryName
    ? `${destination.displayName}, ${destination.countryName}`
    : destination.displayName;

  const priceLabel = priceSummary
    ? formatActivityPrice(priceSummary.price, priceSummary.currency)
    : null;

  return (
    <>
      <Header />

      <main id="main-content" className="bg-things-surface-page">
        {/* ── Breadcrumb band ───────────────────────────────────────
            A white strip against the page canvas gives the detail page the
            same "you are here" ledge the destination page uses, and keeps the
            trail out of the identity block's whitespace. */}
        <div className="border-b border-things-border bg-things-surface-card">
          <nav aria-label="Breadcrumb" className={cn(SHELL, "py-3")}>
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px] text-things-text-secondary">
              <li>
                <Link
                  to="/things-to-do"
                  className="hover:text-primary hover:underline things-focus-ring"
                >
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
              {/* Truncated, never abbreviated: the canonical title is long by
                  nature and the H1 below carries it in full. */}
              <li
                aria-current="page"
                className="max-w-[12rem] truncate text-things-text-primary sm:max-w-sm lg:max-w-md"
              >
                {activity.canonicalTitle}
              </li>
            </ol>
          </nav>
        </div>

        <div className={cn(SHELL, "pb-12 pt-6 lg:pb-20 lg:pt-9")}>
          {/* ── Activity identity ──────────────────────────────────
              Full width, but the measure is capped so a long canonical title
              never runs to a 1216px line at 1500px. */}
          <header className="max-w-4xl">
            <h1 className="break-words text-[26px] font-bold leading-[1.15] tracking-tight text-things-text-primary sm:text-[32px] lg:text-[36px]">
              {activity.canonicalTitle}
            </h1>

            <p className="mt-3 flex items-center gap-1.5 text-sm text-things-text-secondary">
              <MapPin className="h-4 w-4 shrink-0" aria-hidden="true" />
              {locationText}
            </p>

            {/* ── Evidence row ────────────────────────────────────
                Rating and genuine from-price read as evidence, not as a
                banner: text weight, a bronze star at the same size as the
                type, and a hairline divider instead of two coloured pills.
                Both render ONLY under the unambiguous-attribution helpers. */}
            {(ratingSummary || priceLabel) && (
              <dl className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
                {ratingSummary && (
                  <div className="flex items-center gap-1.5">
                    <dt className="sr-only">Rating</dt>
                    <Star
                      className="h-4 w-4 shrink-0 fill-things-warning text-things-warning"
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
                {priceLabel && (
                  <div
                    className={cn(
                      "flex items-center",
                      ratingSummary && "border-l border-things-border pl-4",
                    )}
                  >
                    <dt className="sr-only">From price</dt>
                    {/* One element: the lead-in and the amount are never
                        separable, so "From" can never be lost from "A$59". */}
                    <dd className="font-semibold text-things-text-primary">
                      From {priceLabel}
                    </dd>
                  </div>
                )}
              </dl>
            )}
          </header>

          {/*
            * The split happens at 900px, not at `lg` (1024px). A 1024px window
            * has a ~1009px layout viewport, so an `lg:` split left tablets and
            * small laptops stacked — and a stacked 960px-wide 16:9 hero is a
            * 540px wall of photograph before any information. Splitting at 900
            * puts the rail beside the media exactly where the media would
            * otherwise become oversized.
            *
            * `items-start` keeps the rail from stretching, which is what lets
            * it stick.
            */}
          <div className="mt-7 grid gap-8 min-[900px]:mt-9 min-[900px]:grid-cols-[minmax(0,1fr)_320px] min-[900px]:items-start lg:grid-cols-[minmax(0,1fr)_352px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_368px]">
            {/* ── Content column ───────────────────────────────── */}
            <div className="min-w-0">
              <ActivityHeroMedia
                offer={heroOffer ?? null}
                fallbackLabel={activity.canonicalTitle}
              />

              {/* ── Good to know ──────────────────────────────────
                  The detail page carries the FULL genuine fact set (the T3D
                  card caps at three) because here there is room to read them.
                  It still only renders facts the every-offer-true gate
                  returns. */}
              {facts.length > 0 && (
                <section aria-labelledby="facts-heading" className="mt-9">
                  <ThingsSectionHeader id="facts-heading" heading="Good to know" />
                  {/* Wrapped and content-width, not a stretched two-column
                      grid: at 1500px a grid gave each three-word fact a 355px
                      box, which read as an empty form field rather than as a
                      fact. Wrapping keeps the block dense at every width. */}
                  <ul className="mt-3.5 flex flex-wrap gap-2.5">
                    {facts.map((fact) => (
                      <ThingsFactChip
                        key={fact}
                        fact={THINGS_ACTIVITY_FACT_LABELS[fact]}
                      />
                    ))}
                  </ul>
                </section>
              )}

              {/* ── About this experience ─────────────────────────
                  Provider copy, verbatim and attributed. Never merged, never
                  rewritten, never generated when absent. */}
              {about && (
                <section aria-labelledby="about-heading" className="mt-9">
                  <ThingsSectionHeader
                    id="about-heading"
                    heading="About this experience"
                  />
                  {/* ~68ch measure and 1.75 leading: provider descriptions are
                      long single paragraphs and were previously set at the
                      full column width, which is unreadable at 1500px. */}
                  <p className="mt-3.5 max-w-[68ch] whitespace-pre-line text-[15px] leading-7 text-things-text-secondary">
                    {about.description}
                  </p>
                  <p className="mt-4 text-xs text-things-text-secondary">
                    Description provided by {providerDisplayName(about.provider)}.
                  </p>
                </section>
              )}
            </div>

            {/* ── Decision rail ─────────────────────────────────── */}
            <ActivityBookingPanel offers={sortedOffers} />
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
};

/**
 * Hero media, or the designed no-image state.
 *
 * ONE image, presented as one image. There is no thumbnail strip: the current
 * model carries a single genuine image per offer, and tiling it three times to
 * look like a gallery would claim media we do not have. A load failure falls
 * back to the same honest panel as a missing image — a broken frame is never
 * shown.
 */
function ActivityHeroMedia({
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
    <figure className="m-0">
      {/*
        * 16:10 on phones (≈224px at 390px wide) keeps the photo from eating
        * the first viewport before the traveller has read anything; 16:9 from
        * 640px up gives it presence without pushing the facts below the fold.
        * The frame is never taller than this: one genuine image is presented
        * as one image, at a size that leaves room for the evidence around it.
        */}
      <div className="overflow-hidden rounded-2xl border border-things-border bg-things-surface-subtle shadow-card">
        {showImage ? (
          <div className="aspect-[16/10] w-full sm:aspect-[16/9]">
            <img
              data-testid="activity-hero-image"
              src={imageUrl as string}
              alt={offer?.imageAlt || fallbackLabel}
              className="h-full w-full object-cover"
              loading="eager"
              onError={() => setFailed(true)}
            />
          </div>
        ) : (
          /*
           * The no-image panel is NOT the photo's 16:9 footprint. Holding the
           * full ratio open turned a sparse activity into a 450px empty grey
           * rectangle — which reads as broken, not as honest. A short fixed
           * band states the absence once, calmly, and lets the rest of the
           * page carry the weight.
           */
          <div className="h-44 w-full sm:h-52">
            <ThingsNoImageState variant="detail" />
          </div>
        )}
      </div>
      {/* Credit stays whenever the provider genuinely supplies one, and sits
          outside the frame so the media edge stays clean. */}
      {showImage && offer?.imageCredit && (
        <figcaption className="mt-2 text-xs text-things-text-secondary">
          Image: {offer.imageCredit}
        </figcaption>
      )}
    </figure>
  );
}

export default ActivityDetailPage;
