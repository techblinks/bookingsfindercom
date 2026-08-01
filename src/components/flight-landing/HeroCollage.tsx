/**
 * HeroCollage — controlled travel-image composition for the flight hero.
 *
 * Deliberately restrained: the search form is the visual protagonist, imagery
 * is supporting.
 *
 *  - Desktop: a balanced flex collage — hero-1 as the tall primary (3:4) beside
 *    hero-2 / hero-3 stacked as two equal squares. One consistent 16px gap
 *    everywhere; the stack height is tuned to sit close to hero-1's height so
 *    the cluster reads as intentionally balanced (no uneven gaps, no filler).
 *  - Mobile: exactly ONE wide image (16:9). In `FlightHero` it is rendered after
 *    the search card, so imagery never precedes the form.
 *
 * Uses `useIsMobile()` (the codebase's standard layout switch, as in
 * ModernFlightSearch) so the rendered image count is deterministic and testable
 * rather than hidden purely via CSS.
 *
 * hero-1 / hero-2 / hero-3 are above the fold in the desktop hero → eager
 * (hero-1 keeps `high` priority as the LCP). The mobile hero-wide's top edge
 * falls within the initial viewport on common phones (≈390×844), so it is eager
 * too — it does not "remain below the initial viewport". Explicit aspect ratios
 * reserve each box, preventing layout shift. Images are the approved production
 * hero set (public/flights/hero/).
 */

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import TravelImage from "./TravelImage";

interface HeroCollageProps {
  className?: string;
}

const HeroCollage = ({ className }: HeroCollageProps) => {
  const isMobile = useIsMobile();

  if (isMobile) {
    // Single, calm wide image placed just below the form. Its top edge sits
    // within the initial viewport on common phones, so it loads eagerly.
    // Full-bleed width on mobile → picks the 480/960 AVIF, never the PNG master.
    return (
      <TravelImage
        src="/flights/hero/hero-wide-960.jpg"
        avifSrcSet="/flights/hero/hero-wide-480.avif 480w, /flights/hero/hero-wide-960.avif 960w"
        webpSrcSet="/flights/hero/hero-wide-480.webp 480w, /flights/hero/hero-wide-960.webp 960w"
        sizes="(max-width: 767px) calc(100vw - 32px), 100vw"
        alt="Wide coastline at sunset with a faint distant airplane on the horizon"
        aspectRatio="16 / 9"
        loading="eager"
        className={cn("rounded-2xl border border-border shadow-sm", className)}
      />
    );
  }

  return (
    <div className={cn("flex w-full items-start gap-4", className)}>
      {/* Tall primary — eager + high priority (hero LCP). Aspect tuned so the
          collage finishes close to the search-card bottom. */}
      <div className="basis-[62%] min-w-0">
        <TravelImage
          src="/flights/hero/hero-1-480.jpg"
          avifSrcSet="/flights/hero/hero-1-240.avif 240w, /flights/hero/hero-1-480.avif 480w"
          webpSrcSet="/flights/hero/hero-1-240.webp 240w, /flights/hero/hero-1-480.webp 480w"
          sizes="220px"
          alt="View from an airplane window of the wing above golden-hour clouds"
          aspectRatio="2 / 3"
          loading="eager"
          fetchPriority="high"
          className="rounded-2xl border border-border shadow-sm"
        />
      </div>
      {/* Two equal images stacked, matched 16px gap. Eager (above the fold). */}
      <div className="flex basis-[38%] min-w-0 flex-col gap-4">
        <TravelImage
          src="/flights/hero/hero-2-320.jpg"
          avifSrcSet="/flights/hero/hero-2-160.avif 160w, /flights/hero/hero-2-320.avif 320w"
          webpSrcSet="/flights/hero/hero-2-160.webp 160w, /flights/hero/hero-2-320.webp 320w"
          sizes="160px"
          alt="Calm coastline meeting distant mountains at soft morning light"
          aspectRatio="6 / 7"
          loading="eager"
          className="rounded-2xl border border-border shadow-sm"
        />
        <TravelImage
          src="/flights/hero/hero-3-320.jpg"
          avifSrcSet="/flights/hero/hero-3-160.avif 160w, /flights/hero/hero-3-320.avif 320w"
          webpSrcSet="/flights/hero/hero-3-160.webp 160w, /flights/hero/hero-3-320.webp 320w"
          sizes="160px"
          alt="Himalayan snow peaks under soft light with a distant airplane"
          aspectRatio="6 / 7"
          loading="eager"
          className="rounded-2xl border border-border shadow-sm"
        />
      </div>
    </div>
  );
};

export default HeroCollage;
