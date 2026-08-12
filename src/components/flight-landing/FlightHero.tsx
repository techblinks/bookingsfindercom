/**
 * FlightHero — redesigned hero for the /flights landing page (Phase 1).
 *
 * Balance model:
 *  - The headline + supporting copy sit ABOVE a dedicated "card row".
 *  - The card row is a two-column grid (xl+) with `items-start`, so the image
 *    collage's TOP aligns with the search card's top — not with the taller
 *    heading-plus-card block. The collage height is tuned to finish close to the
 *    card's bottom, so the right column reads as intentionally balanced.
 *  - Controlled widths: left ≈ 760px, right collage ≈ 336px, gap 32px, inside a
 *    ~1160px centred container — no drifting or excess empty space.
 *
 * Responsive:
 *  - xl (≥1280): two columns, collage beside the card (justify-self-center).
 *  - lg and below (incl. 1024): single column — collage stacks below the card,
 *    width-capped, so the two-column layout never feels cramped.
 *  - Mobile (<768): ModernFlightSearch's own mobile layout; order is
 *    headline → copy → SEARCH CARD → microcopy → ONE image (after the form).
 *
 * The search card keeps ≥700px content width at xl (left track floors at 720px)
 * so the "Search flights" CTA never truncates; 1366×768 keeps H1 + all fields +
 * CTA above the fold.
 *
 * ModernFlightSearch is reused unchanged (validation, analytics, URL building
 * and submission untouched; multi-city stays hidden).
 */

import type { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import type { FlightSearchFormValues } from "@/lib/flightSearchValidation";
import HeroMediaCollage from "@/components/hero/HeroMediaCollage";
import { useHeroMedia } from "@/hooks/useHeroMedia";
import HeroCollage from "./HeroCollage";

/**
 * Conditionally renders backend hero or local HeroCollage for flights.
 * Guarantees exactly ONE collage is rendered — never both simultaneously.
 * No layout shift, no empty hero column, no image doubling.
 */
function FlightsHeroImage({ isMobile }: { isMobile: boolean }) {
  const { isUsingFallback } = useHeroMedia("flights");

  const className = isMobile
    ? "mt-5"
    : "mx-auto mt-8 max-w-[336px] xl:mx-0 xl:mt-0 xl:justify-self-center";

  if (!isUsingFallback) {
    return <HeroMediaCollage pageKey="flights" className={className} />;
  }

  return <HeroCollage className={className} />;
}

interface FlightHeroProps {
  /** Fully-composed H1 text (default or route-aware, computed by the caller). */
  heading: string;
  /** Prefill for the search form (route-card / URL prefill). */
  prefill?: Partial<FlightSearchFormValues>;
  /** Whether a real prefill exists (drives whether prefill is passed through). */
  hasPrefill: boolean;
  /** Optional validation-error banner, rendered above the search card. */
  errorBanner?: ReactNode;
}

const SUPPORTING_TEXT =
  "Search flight options from multiple travel providers in one clear place.";

const FlightHero = ({ heading, prefill, hasPrefill, errorBanner }: FlightHeroProps) => {
  const isMobile = useIsMobile();

  return (
    <section className="bg-background">
      <div className="mx-auto max-w-[1160px] px-4 py-6 lg:py-8">
        {/* Headline block — width-matched to the left/search column. */}
        <div className="xl:max-w-[760px]">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {heading}
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            {SUPPORTING_TEXT}
          </p>
          {errorBanner}
        </div>

        {/* Card row — collage aligns to the top of the search card (items-start). */}
        <div className="mt-5 xl:grid xl:grid-cols-[minmax(720px,1fr)_336px] xl:items-start xl:gap-8">
          {/* Left: search card (dominant) + microcopy + mobile image. */}
          <div className="min-w-0">
            <div id="flight-search" className="rounded-2xl border border-border bg-card px-2 py-4 shadow-elevated xl:p-4">
              <ModernFlightSearch prefill={hasPrefill ? prefill : undefined} hideMultiCity />
            </div>
            <p className="mt-2.5 text-xs font-medium uppercase tracking-wider text-muted-foreground/80">
              Independent travel comparison · you book with the provider
            </p>

            {/* Mobile-only image: backend hero when available, else local fallback. */}
            {isMobile && <FlightsHeroImage isMobile />}
          </div>

          {/* Right: backend hero when available, else local fallback. */}
          {!isMobile && <FlightsHeroImage isMobile={false} />}
        </div>
      </div>
    </section>
  );
};

export default FlightHero;
