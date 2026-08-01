# Flight landing hero images — production assets

Approved BookingsFinder hero campaign for the `/flights` landing page. One
coordinated set: high-key editorial travel photography, cool-teal shadows,
soft sand-warm highlights, golden-hour light from the upper-left.

## Served variants (what the page actually loads)

`HeroCollage` references responsive AVIF/WebP variants via `<picture>` +
`srcSet`/`sizes`; a small JPG is the raster fallback. The multi-MB PNG/JPG
masters below are **not referenced by the app** and never load.

| Image      | Aspect | Variant widths (AVIF + WebP) | JPG fallback | Rendered ~ |
|------------|--------|------------------------------|--------------|------------|
| hero-1     | 2:3\*  | 240, 480                     | 480          | ~200px (desktop) |
| hero-2     | 6:7\*  | 160, 320                     | 320          | ~120px (desktop) |
| hero-3     | 6:7\*  | 160, 320                     | 320          | ~120px (desktop) |
| hero-wide  | 16:9   | 480, 960                     | 960          | full-width (mobile) |

\* Display crop applied in CSS via `object-cover`; the variant files keep the
original composition (scaled, not re-cropped). Masters: `hero-1.png` 3:4,
`hero-2.png` 4:3, `hero-3.jpg` 4:3, `hero-wide.png` 16:9.

Explicit `aspect-ratio` boxes reserve space → zero layout shift. hero-1 is the
desktop LCP candidate (eager + high priority); hero-wide is eager on mobile
(top edge within the initial viewport); all others eager, none forced `high`.

## Regenerating variants

From this directory, with ImageMagick installed:

```bash
magick hero-1.png -resize 480x -quality 60 hero-1-480.avif   # AVIF @ q60
magick hero-1.png -resize 480x -quality 80 hero-1-480.webp   # WebP @ q80
magick hero-1.png -resize 480x -quality 82 hero-1-480.jpg    # JPG fallback
```

Do not hotlink external images. Keep all assets local under `public/flights/`.
