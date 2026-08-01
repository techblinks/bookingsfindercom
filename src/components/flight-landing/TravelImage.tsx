/**
 * TravelImage — responsive, layout-shift-safe image for the flight landing page.
 *
 * Wraps the image in a fixed-aspect-ratio box (via CSS `aspect-ratio`) so the
 * layout reserves space before the asset loads — zero cumulative layout shift.
 *
 * Serves modern formats first via `<picture>`: AVIF → WebP → raster fallback,
 * each with a responsive `srcSet` + shared `sizes` so the browser downloads the
 * smallest variant that fits the rendered box at the current DPR. The raster
 * `src` is a modestly-sized JPG fallback — never a multi-MB original.
 *
 * Never hotlinks — all sources must be local (served from /public).
 */

import { cn } from "@/lib/utils";

interface TravelImageProps {
  /** Raster fallback (a modestly-sized JPG). Required — used only when neither
   *  AVIF nor WebP is supported. */
  src: string;
  /** AVIF candidate set, e.g. "img-240.avif 240w, img-480.avif 480w". */
  avifSrcSet?: string;
  /** WebP candidate set. */
  webpSrcSet?: string;
  /** `sizes` describing the rendered width across breakpoints. */
  sizes?: string;
  /** Meaningful alternative text (empty string only for purely decorative art). */
  alt: string;
  /** CSS aspect-ratio value, e.g. "3 / 4" or "16 / 9". Reserves layout space. */
  aspectRatio: string;
  /** Wrapper classes (rounding, shadow, sizing). */
  className?: string;
  /** Image element classes. */
  imgClassName?: string;
  /** "eager" for above-the-fold, "lazy" (default) for below-the-fold. */
  loading?: "lazy" | "eager";
  /** Fetch priority hint — set "high" only on a confirmed LCP image. */
  fetchPriority?: "high" | "low" | "auto";
}

const TravelImage = ({
  src,
  avifSrcSet,
  webpSrcSet,
  sizes,
  alt,
  aspectRatio,
  className,
  imgClassName,
  loading = "lazy",
  fetchPriority,
}: TravelImageProps) => {
  // fetchpriority is not yet in React 18's typed DOM props — pass it as a raw
  // lowercase attribute so it reaches the DOM without a TS/React warning.
  const priorityAttr = fetchPriority
    ? ({ fetchpriority: fetchPriority } as Record<string, string>)
    : {};

  return (
    <div
      className={cn("relative overflow-hidden bg-muted", className)}
      style={{ aspectRatio }}
    >
      <picture>
        {avifSrcSet && <source srcSet={avifSrcSet} sizes={sizes} type="image/avif" />}
        {webpSrcSet && <source srcSet={webpSrcSet} sizes={sizes} type="image/webp" />}
        <img
          src={src}
          alt={alt}
          loading={loading}
          decoding="async"
          sizes={sizes}
          className={cn("h-full w-full object-cover", imgClassName)}
          {...priorityAttr}
        />
      </picture>
    </div>
  );
};

export default TravelImage;
