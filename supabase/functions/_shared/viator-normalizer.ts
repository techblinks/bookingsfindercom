/**
 * Shared Viator product normalization.
 *
 * Used by viator-catalog (admin) and future viator-public (read-only).
 * Centralises image URL validation, variant selection, and product
 * normalisation so both functions produce consistent output shapes.
 *
 * Mirrors the tiqets-normalizer.ts pattern with Viator-specific rules:
 * - productCode → providerProductId (string)
 * - Flags map to boolean|null feature toggles (never false for absent)
 * - Images validated against viator.com / tripadvisor.com hosts only
 * - outboundUrl validated for HTTPS + viator.com hostname
 */

// ═══════════════════════════════════════════════════════════════
// Raw upstream types (Viator Basic Access /products/search response)
// ═══════════════════════════════════════════════════════════════

export interface ViatorImageRaw {
  url: string;
  width?: number;
  height?: number;
  credit?: string;
}

export interface ViatorProductRaw {
  productCode: string;
  title: string;
  description?: string;
  images?: ViatorImageRaw[];
  reviews?: { totalReviews: number; combinedAverageRating: number };
  pricing?: { summary?: { fromPrice?: number }; currency?: string };
  productUrl?: string;
  destinations?: Array<{ ref: string; name: string; type: string }>;
  tags?: number[];
  flags?: string[];
  bookingInfo?: { freeCancellation?: boolean };
}

// ═══════════════════════════════════════════════════════════════
// Provider-neutral normalised shape
// ═══════════════════════════════════════════════════════════════

export interface NormalizedViatorProduct {
  providerProductId: string;
  title: string;
  description: string | null;
  tagline: string | null;
  city: string | null;
  country: string | null;
  destinationId: number | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCredit: string | null;
  rating: number | null;
  reviewCount: number | null;
  price: number | null;
  currency: string | null;
  saleStatus: string | null;
  freeCancellation: boolean | null;
  skipLine: boolean | null;
  smartphoneTicket: boolean | null;
  instantConfirmation: boolean | null;
  wheelchairAccessible: boolean | null;
  likelyToSellOut: boolean | null;
  outboundUrl: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Allowed image hosts
// ═══════════════════════════════════════════════════════════════

const ALLOWED_IMAGE_HOSTS = [
  "viator.com",
  "tripadvisor.com",
  "media.viator.com",
  "cdn.viator.com",
  "media.tripadvisor.com",
  "dynamic-media-cdn.tripadvisor.com",
];

/** Protocols that must NEVER be treated as image URLs. */
const REJECTED_PROTOCOLS = new Set([
  "javascript:",
  "data:",
  "blob:",
  "file:",
]);

/** Hostnames that are always unsafe regardless of protocol. */
const REJECTED_HOSTS = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "[::1]",
]);

// ═══════════════════════════════════════════════════════════════
// Image URL helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Validate and sanitise a Viator image URL.
 *
 * Rules:
 * - Must be a non-empty string
 * - Protocol must be https: (upgraded from // if needed)
 * - Hostname must match a known viator.com or tripadvisor.com domain
 * - Rejects javascript:, data:, blob:, file:, and localhost
 *
 * Returns the sanitised URL string or empty string on failure.
 */
export function safeViatorImageUrl(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "";

  let normalised = raw.trim();
  if (!normalised) return "";

  // Upgrade protocol-relative URLs
  if (normalised.startsWith("//")) {
    normalised = "https:" + normalised;
  }

  // Only https
  if (!normalised.startsWith("https://")) return "";

  // Reject dangerous protocols before URL parsing
  const lower = normalised.toLowerCase();
  for (const proto of REJECTED_PROTOCOLS) {
    if (lower.startsWith(proto)) return "";
  }

  let parsed: URL;
  try {
    parsed = new URL(normalised);
  } catch {
    return "";
  }

  // Enforce https only
  if (parsed.protocol !== "https:") return "";

  const host = parsed.hostname.toLowerCase();

  // Reject dangerous hostnames
  if (REJECTED_HOSTS.has(host)) return "";

  // Allow only viator.com / tripadvisor.com and their known CDN subdomains
  const isAllowed = ALLOWED_IMAGE_HOSTS.some(
    (h) => host === h || host.endsWith("." + h),
  );

  if (!isAllowed) {
    console.warn(`[viator] image host rejected: ${host}`);
    return "";
  }

  return normalised;
}

/**
 * Select the best image from a Viator images array for 16:10 card display.
 *
 * Strategy:
 * - Filter to images with valid HTTPS URLs on allowed hosts
 * - Prefer images where width/height metadata is available
 * - Score images by closeness to 16:10 aspect ratio (1.6)
 * - Tie-break by larger dimensions (favours medium/large over thumbnails)
 * - Fall back to the first valid image if no dimensions available
 */
export function selectViatorImage(
  images: ViatorImageRaw[],
): { url: string | null } {
  if (!images || images.length === 0) return { url: null };

  // Filter to valid images with safe URLs
  const valid: Array<{ url: string; width?: number; height?: number }> = [];
  for (const img of images) {
    const safe = safeViatorImageUrl(img.url);
    if (safe) {
      valid.push({ url: safe, width: img.width, height: img.height });
    }
  }

  if (valid.length === 0) return { url: null };

  // If any images have usable dimensions, score by 16:10 closeness
  const withDimensions = valid.filter(
    (v) =>
      typeof v.width === "number" &&
      v.width > 0 &&
      typeof v.height === "number" &&
      v.height > 0,
  );

  if (withDimensions.length > 0) {
    const TARGET_RATIO = 16 / 10; // 1.6

    let best = withDimensions[0];
    let bestScore = Infinity;

    for (const img of withDimensions) {
      const ratio = img.width! / img.height!;
      // Score: absolute deviation from 1.6, with a bonus for larger images
      const ratioScore = Math.abs(ratio - TARGET_RATIO);
      // Slight preference for larger images (normalise to ~1.0 range)
      const sizeScore = 1 - Math.min(img.width!, 1200) / 1200;
      const score = ratioScore + sizeScore * 0.01;

      if (score < bestScore) {
        bestScore = score;
        best = img;
      }
    }

    return { url: best.url };
  }

  // No dimension metadata — return the first valid image
  return { url: valid[0].url };
}

// ═══════════════════════════════════════════════════════════════
// Outbound URL validation
// ═══════════════════════════════════════════════════════════════

/**
 * Validate a Viator product URL for outbound linking.
 *
 * Rules:
 * - Must be a non-empty string starting with https://
 * - Hostname must be viator.com or a known Viator subdomain
 * - Rejects javascript:, data:, blob:, file:, localhost
 *
 * Returns the URL exactly as provided (preserving tracking params) or null.
 */
function safeOutboundUrl(raw: string | undefined): string | null {
  if (!raw || typeof raw !== "string") return null;

  const normalised = raw.trim();
  if (!normalised) return null;

  // Only https
  if (!normalised.startsWith("https://")) return null;

  // Reject dangerous protocols
  const lower = normalised.toLowerCase();
  for (const proto of REJECTED_PROTOCOLS) {
    if (lower.startsWith(proto)) return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(normalised);
  } catch {
    return null;
  }

  if (parsed.protocol !== "https:") return null;

  const host = parsed.hostname.toLowerCase();

  if (REJECTED_HOSTS.has(host)) return null;

  // Only viator.com hostnames for outbound URLs
  if (
    host !== "viator.com" &&
    !host.endsWith(".viator.com")
  ) {
    console.warn(`[viator] outbound URL host rejected: ${host}`);
    return null;
  }

  // Return the original URL exactly as provided (preserves tracking params)
  return raw;
}

// ═══════════════════════════════════════════════════════════════
// Flag helpers
// ═══════════════════════════════════════════════════════════════

/** Check if a flag is present in the flags array. */
function hasFlag(flags: string[] | undefined, target: string): boolean {
  if (!flags || flags.length === 0) return false;
  return flags.includes(target);
}

// ═══════════════════════════════════════════════════════════════
// Main normalisation
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise a single raw Viator product into the provider-neutral shape.
 *
 * - productCode → providerProductId (string)
 * - reviews.combinedAverageRating → rating (null if absent)
 * - reviews.totalReviews → reviewCount (null if absent)
 * - pricing.summary.fromPrice → price (null if absent)
 * - pricing.currency → currency (null if absent)
 * - flags "FREE_CANCELLATION" → freeCancellation = true (null if absent)
 * - flags "LIKELY_TO_SELL_OUT" → likelyToSellOut = true (null if absent)
 * - productUrl → outboundUrl (validated HTTPS + viator.com hostname)
 * - destinations[0].name → city
 * - images → best 16:10 image via selectViatorImage
 *
 * Boolean feature flags are always `true | null` — absent means unknown,
 * never converted to `false`.
 */
export function normalizeViatorProduct(
  raw: ViatorProductRaw,
): NormalizedViatorProduct {
  // --- Image ---
  const bestImage = selectViatorImage(raw.images ?? []);
  const firstImage = raw.images?.[0];

  // --- Destination ---
  const primaryDestination = raw.destinations?.[0] ?? null;

  // --- Flags ---
  const flags = raw.flags;

  // --- Outbound URL ---
  const outboundUrl = safeOutboundUrl(raw.productUrl);

  return {
    // Core identity
    providerProductId: String(raw.productCode ?? ""),
    title: raw.title ?? "",
    description: raw.description?.trim() || null,
    tagline: null, // Viator Basic Access has no separate tagline field

    // Location
    city: primaryDestination?.name ?? null,
    country: null, // Viator destinations array doesn't include country in basic search
    destinationId: primaryDestination?.ref
      ? parseInt(primaryDestination.ref, 10) || null
      : null,

    // Image
    imageUrl: bestImage.url,
    imageAlt: raw.title?.trim() || null,
    imageCredit: firstImage?.credit?.trim() || null,

    // Reviews
    rating: raw.reviews?.combinedAverageRating ?? null,
    reviewCount: raw.reviews?.totalReviews ?? null,

    // Pricing
    price: raw.pricing?.summary?.fromPrice ?? null,
    currency: raw.pricing?.currency ?? null,

    // Sale status — Viator Basic Access doesn't expose sale_status directly
    saleStatus: null,

    // Feature flags (true | null — never false for absent)
    freeCancellation: hasFlag(flags, "FREE_CANCELLATION") ? true : null,
    skipLine: null,
    smartphoneTicket: null,
    instantConfirmation: null,
    wheelchairAccessible: null,
    likelyToSellOut: hasFlag(flags, "LIKELY_TO_SELL_OUT") ? true : null,

    // Outbound
    outboundUrl,
  };
}
