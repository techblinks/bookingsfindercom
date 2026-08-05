/**
 * Shared hero collage component.
 *
 * Renders backend-managed images when a complete published set exists.
 * Falls back to local images immediately (no spinner, no broken state).
 *
 * Stays with no custom media returns null — the page must add its own
 * SVG/gradient fallback next to this component.
 */

import { useHeroMedia, type HeroMediaSlot } from "@/hooks/useHeroMedia";
import type { HeroPageKey, HeroMediaSet } from "@/types/hero";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useState } from "react";

// ── Local fallback definitions ─────────────────────────────────

interface FallbackAsset {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  width: number;
  height: number;
}

const HOME_FALLBACK: {
  main: FallbackAsset;
  support1: FallbackAsset;
  support2: FallbackAsset;
  mobile: FallbackAsset;
} = {
  main: { src: "/flights/hero/hero-1-480.webp", srcSet: "/flights/hero/hero-1-480.webp 480w, /flights/hero/hero-1-240.webp 240w", sizes: "420px", alt: "", width: 480, height: 600 },
  support1: { src: "/flights/hero/hero-2-320.webp", srcSet: "/flights/hero/hero-2-320.webp 320w, /flights/hero/hero-2-160.webp 160w", sizes: "200px", alt: "", width: 320, height: 280 },
  support2: { src: "/flights/hero/hero-3-320.webp", srcSet: "/flights/hero/hero-3-320.webp 320w, /flights/hero/hero-3-160.webp 160w", sizes: "200px", alt: "", width: 320, height: 280 },
  mobile: { src: "/flights/hero/hero-wide-960.webp", srcSet: "/flights/hero/hero-wide-960.webp 960w, /flights/hero/hero-wide-480.webp 480w", sizes: "100vw", alt: "", width: 960, height: 540 },
};

const FLIGHTS_FALLBACK = HOME_FALLBACK;

interface HeroMediaCollageProps {
  pageKey: HeroPageKey;
  className?: string;
  /** When true, renders draft data instead of published (admin previews). */
  previewSet?: HeroMediaSet | null;
}

export default function HeroMediaCollage({ pageKey, className, previewSet }: HeroMediaCollageProps) {
  const { data, isUsingFallback } = useHeroMedia(pageKey);
  const isMobile = useIsMobile();
  const [imgErrors, setImgErrors] = useState<Set<string>>(new Set());

  const effectiveData = previewSet ?? data;
  const effectiveFallback = previewSet ? false : isUsingFallback;

  const fallback = pageKey === "stays" ? null : (pageKey === "flights" ? FLIGHTS_FALLBACK : HOME_FALLBACK);
  const useBackend = effectiveData && !effectiveFallback;
  const useFallback = effectiveFallback || !effectiveData;

  // Stays and flights with no custom media → render nothing
  // (pages provide their own SVG/HeroCollage fallback)
  if ((pageKey === "stays" || pageKey === "flights") && useFallback) return null;

  const handleImgError = (key: string) => {
    setImgErrors((prev) => new Set(prev).add(key));
  };

  const renderFallbackImg = (asset: FallbackAsset, extraClass?: string) => (
    <img
      src={asset.src}
      srcSet={asset.srcSet}
      sizes={asset.sizes}
      alt={asset.alt}
      width={asset.width}
      height={asset.height}
      className={cn("w-full h-full object-cover", extraClass)}
      decoding="async"
      loading="lazy"
    />
  );

  const renderBackendImg = (slot: HeroMediaSlot, key: string, extraClass?: string) => {
    if (imgErrors.has(key)) {
      if (fallback) {
        const fbKey = key as keyof typeof fallback;
        if (fbKey in fallback) return renderFallbackImg(fallback[fbKey] as FallbackAsset, extraClass);
      }
      return null;
    }
    return (
      <img
        src={`${slot.publicUrl}?v=${effectiveData?.version ?? 1}`}
        alt={slot.isDecorative ? "" : (slot.altText || "")}
        className={cn("w-full h-full object-cover", extraClass)}
        style={{ objectPosition: `${slot.focalX}% ${slot.focalY}%` }}
        decoding="async"
        loading="lazy"
        onError={() => handleImgError(key)}
      />
    );
  };

  // ── Mobile ──
  if (isMobile) {
    const mobileSrc = useBackend ? null : (fallback?.mobile);
    return (
      <div className={cn("rounded-2xl overflow-hidden aspect-[16/9]", className)} aria-hidden="true">
        {useBackend
          ? renderBackendImg(effectiveData!.mobile, "mobile")
          : mobileSrc && renderFallbackImg(mobileSrc)}
      </div>
    );
  }

  // ── Desktop ──
  if (!useBackend && !fallback) return null;

  return (
    <div className={cn("hidden lg:grid grid-cols-2 gap-3 w-[420px] shrink-0", className)} aria-hidden="true">
      <div className="col-span-2 rounded-2xl overflow-hidden h-[200px]">
        {useBackend
          ? renderBackendImg(effectiveData!.main, "main")
          : fallback && renderFallbackImg(fallback.main)}
      </div>
      <div className="rounded-2xl overflow-hidden h-[140px]">
        {useBackend
          ? renderBackendImg(effectiveData!.support1, "support1")
          : fallback && renderFallbackImg(fallback.support1)}
      </div>
      <div className="rounded-2xl overflow-hidden h-[140px]">
        {useBackend
          ? renderBackendImg(effectiveData!.support2, "support2")
          : fallback && renderFallbackImg(fallback.support2)}
      </div>
    </div>
  );
}

// keep exports for existing test imports
const _HOME_FALLBACK = HOME_FALLBACK;
const _FLIGHTS_FALLBACK = FLIGHTS_FALLBACK;
export type _HeroMediaSet = HeroMediaSet;
