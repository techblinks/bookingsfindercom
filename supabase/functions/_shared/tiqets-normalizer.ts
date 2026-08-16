/**
 * Shared Tiqets product normalization.
 *
 * Used by both tiqets-catalog (admin) and tiqets-public (read-only).
 * Centralises image URL validation, variant selection, and product
 * normalisation so both functions produce consistent output shapes.
 *
 * NOTE: The admin-only tiqets-catalog function currently has its own
 * inline normalizer. This shared module is the canonical source going
 * forward; the admin function should be migrated to use this module
 * in a follow-up PR.
 */

// ═══════════════════════════════════════════════════════════════
// Public-facing product type
// ═══════════════════════════════════════════════════════════════

export interface NormalizedProduct {
  id: string;
  title: string;
  tagline: string | null;
  description: string | null;
  destination: { id: number; name: string; country?: string } | null;
  venue: { id: number; name: string; city?: string } | null;
  saleStatus: string | null;
  rating: { average: number | null; count: number | null };
  wheelchairAccessible: boolean | null;
  skipTheLine: boolean | null;
  /** Upstream tag IDs preserved verbatim (never derived or invented). */
  tagIds: number[];
  smartphoneTicket: boolean | null;
  instantTicketDelivery: boolean | null;
  promoLabel: string | null;
  isPackage: boolean | null;
  duration: string | null;
  cancellation: string | null;
  productCheckoutUrl: string | null;
  city: string | null;
  country: string | null;
  cityId: number | null;
  countryId: number | null;
  minPrice: { amount: number | null; currency: string | null };
  productUrl: string | null;
  /** Single best image for card display (medium > large > small > extra_large) */
  image: { url: string; altText: string | null; credit: string | null } | null;
}

// ═══════════════════════════════════════════════════════════════
// Raw upstream type (subset genuinely returned by the API)
// ═══════════════════════════════════════════════════════════════

export interface TiqetsProductRaw {
  id: string;
  title: string;
  tagline?: string;
  description?: string;
  destination?: { id: number; name: string; country?: string };
  venue?: { id: number; name: string; city?: string };
  sale_status?: string;
  ratings?: { average?: number; total?: number };
  wheelchair_access?: boolean;
  skip_line?: boolean;
  smartphone_ticket?: boolean;
  instant_ticket_delivery?: boolean;
  city_name?: string;
  country_name?: string;
  city_id?: number;
  country_id?: number;
  promo_label?: string;
  is_package?: boolean;
  duration?: string;
  cancellation?: string;
  product_checkout_url?: string;
  tag_ids?: number[];
  price?: { amount?: number; currency?: string };
  product_url?: string;
  images?: Array<{
    small?: string;
    medium?: string;
    large?: string;
    extra_large?: string;
    alt_text?: string;
    credit?: string;
  }>;
}

export interface TiqetsPaginationRaw {
  count: number;
  next: string | null;
  previous: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Image URL helpers
// ═══════════════════════════════════════════════════════════════

/**
 * Validate, upgrade, and hostname-check a Tiqets image URL.
 * Imgix query parameters (£?auto=format, £?w=400 etc.) are preserved.
 * Only the documented Tiqets CDN hostname and known variants are allowed.
 */
export function safeImageUrl(raw: string | undefined): string {
  if (!raw || typeof raw !== "string") return "";
  let normalised = raw.trim();
  if (normalised.startsWith("//")) normalised = "https:" + normalised;
  if (!normalised.startsWith("https://")) return "";
  try {
    const parsed = new URL(normalised);
    if (parsed.protocol !== "https:") return "";
    const host = parsed.hostname;
    const ALLOWED_HOSTS = ["aws-tiqets-cdn.imgix.net"];
    const isAllowed = ALLOWED_HOSTS.some(
      (h) => host === h || host.endsWith("." + h),
    );
    if (!isAllowed) {
      console.warn(`[tiqets] image host rejected: ${host}`);
      return "";
    }
    return normalised;
  } catch {
    return "";
  }
}

/**
 * Select the best image variant for card display.
 * Priority: medium > large > small > extra_large.
 */
export function selectImageVariant(
  img: Record<string, unknown>,
): { url: string; variant: string | null } {
  const variants = ["medium", "large", "small", "extra_large"] as const;
  for (const v of variants) {
    const u = img[v];
    if (typeof u === "string" && u.trim()) {
      const safe = safeImageUrl(u);
      if (safe) return { url: safe, variant: v };
    }
  }
  return { url: "", variant: null };
}

// ═══════════════════════════════════════════════════════════════
// Normalisation
// ═══════════════════════════════════════════════════════════════

/**
 * Normalise a single raw Tiqets product into the public-facing shape.
 *
 * - Selects the best image variant via selectImageVariant.
 * - Guarantees camelCase keys.
 * - Returns null for absent optional fields rather than undefined.
 */
export function normalizeProduct(raw: TiqetsProductRaw): NormalizedProduct {
  const bestImage =
    raw.images && raw.images.length > 0
      ? selectImageVariant(raw.images[0] as unknown as Record<string, unknown>)
      : { url: "", variant: null };

  return {
    id: typeof raw.id === "number" ? String(raw.id) : (raw.id || ""),
    title: raw.title || "",
    tagline: raw.tagline || null,
    description: raw.description || null,
    tagIds: raw.tag_ids?.slice() ?? [],
    destination: raw.destination
      ? { id: raw.destination.id, name: raw.destination.name, country: raw.destination.country }
      : null,
    venue: raw.venue
      ? { id: raw.venue.id, name: raw.venue.name, city: raw.venue.city }
      : null,
    saleStatus: raw.sale_status || null,
    rating: {
      average: raw.ratings?.average ?? null,
      count: raw.ratings?.total ?? null,
    },
    wheelchairAccessible: raw.wheelchair_access ?? null,
    skipTheLine: raw.skip_line ?? null,
    smartphoneTicket: raw.smartphone_ticket ?? null,
    instantTicketDelivery: raw.instant_ticket_delivery ?? null,
    promoLabel: raw.promo_label || null,
    isPackage: raw.is_package ?? null,
    duration: raw.duration || null,
    cancellation: raw.cancellation || null,
    minPrice: {
      amount: raw.price?.amount ?? null,
      currency: raw.price?.currency ?? null,
    },
    productUrl: raw.product_url || null,
    productCheckoutUrl: raw.product_checkout_url || null,
    city: raw.city_name || (raw.venue?.city ?? null),
    country: raw.country_name || (raw.destination?.country ?? null),
    cityId: raw.city_id ?? null,
    countryId: raw.country_id ?? null,
    image: bestImage.url
      ? {
          url: bestImage.url,
          altText:
            raw.images?.[0]?.alt_text &&
            typeof raw.images[0].alt_text === "string"
              ? raw.images[0].alt_text
              : null,
          credit:
            raw.images?.[0]?.credit &&
            typeof raw.images[0].credit === "string"
              ? raw.images[0].credit
              : null,
        }
      : null,
  };
}

/**
 * Build image diagnostics for admin troubleshooting.
 * Inspects raw image objects — never logs full URLs, query params, or tokens.
 */
export function buildImageDiagnostics(
  rawProducts: unknown,
): Record<string, unknown> {
  const products = Array.isArray(rawProducts) ? rawProducts : [];
  const rawImage: Record<string, unknown> | undefined =
    products?.[0] &&
    typeof products[0] === "object" &&
    products[0] !== null
      ? (
          products[0] as {
            images?: Array<Record<string, unknown>>;
          }
        ).images?.[0]
      : undefined;

  const hasImageData = rawImage != null;
  const imageContainers = products.flatMap(
    (p: Record<string, unknown>) => p?.images || [],
  );
  const imageCount = imageContainers.length;
  const firstImageFieldNames = rawImage ? Object.keys(rawImage) : [];
  const selected = rawImage
    ? selectImageVariant(rawImage)
    : { url: "", variant: null };
  let protocol: string | null = null;
  let hostname: string | null = null;
  if (selected.url) {
    try {
      const p = new URL(selected.url);
      protocol = p.protocol;
      hostname = p.hostname;
    } catch {
      /* ignore */
    }
  }

  return {
    hasImageData,
    imageCount,
    firstImageFieldNames,
    selectedVariant: selected.variant,
    selectedImageProtocol: protocol,
    selectedImageHostname: hostname,
    selectedImageHasCredit:
      typeof rawImage?.credit === "string" &&
      rawImage.credit.trim().length > 0,
  };
}

// ═══════════════════════════════════════════════════════════════
// Sale-status aggregate diagnostics
// ═══════════════════════════════════════════════════════════════

/**
 * Stable placeholder key for products with no meaningful sale status.
 */
export const MISSING_SALE_STATUS = "(missing)";

/**
 * Build safe sale-status aggregate diagnostics.
 *
 * Returns one count per observed sale-status value — counts only. Never
 * returns product IDs, titles, URLs, descriptions, tokens, or raw product
 * objects. Accepts both normalized (`saleStatus`) and raw (`sale_status`)
 * shapes. Status values are trimmed and preserved verbatim; null, empty,
 * and whitespace-only statuses are aggregated under `(missing)`.
 */
export function buildSaleStatusDiagnostics(
  products: unknown,
): Record<string, number> {
  const list = Array.isArray(products) ? products : [];
  const counts: Record<string, number> = {};
  for (const item of list) {
    const label = saleStatusLabel(item);
    counts[label] = (counts[label] || 0) + 1;
  }
  return counts;
}

function saleStatusLabel(item: unknown): string {
  if (item && typeof item === "object") {
    const record = item as Record<string, unknown>;
    const raw =
      typeof record.saleStatus === "string"
        ? record.saleStatus
        : typeof record.sale_status === "string"
          ? record.sale_status
          : "";
    const trimmed = raw.trim();
    if (trimmed.length > 0) return trimmed;
  }
  return MISSING_SALE_STATUS;
}
