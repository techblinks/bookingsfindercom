/**
 * BookingsFinder activity-detail presentation helpers (T2D-B1).
 *
 * Pure, provider-neutral display logic for the canonical activity page.
 * Every helper follows the "absence is better than invention" rule:
 *
 *   - a fact renders only when EVERY offer genuinely reports it as true
 *     (a single-offer page renders that offer's known-true facts; a
 *     multi-offer page renders only facts all offers agree on)
 *   - rating / review / price / description summaries render only when
 *     EXACTLY ONE offer carries a genuine value (unambiguous attribution);
 *     with zero or multiple genuine values the summary is omitted
 *   - a provider CTA renders only when the offer's providerUrl validates
 *     as an http(s) URL
 *
 * Nothing here can manufacture identity: these helpers never accept a
 * provider product alone and never return a canonical URL.
 */
import type {
  ThingsActivityOfferDetail,
  ThingsActivityOfferFactKey,
} from "@/types/thingsActivityDetail";

/** Customer-visible labels for genuinely known activity-level facts. */
export const THINGS_ACTIVITY_FACT_LABELS: Record<ThingsActivityOfferFactKey, string> = {
  freeCancellation: "Free cancellation",
  skipLine: "Skip the line",
  smartphoneTicket: "Mobile ticket",
  instantConfirmation: "Instant confirmation",
  wheelchairAccessible: "Wheelchair accessible",
};

const FACT_KEYS: readonly ThingsActivityOfferFactKey[] = [
  "freeCancellation",
  "skipLine",
  "smartphoneTicket",
  "instantConfirmation",
  "wheelchairAccessible",
];

/**
 * Activity-level facts that may be claimed, in stable order.
 *
 * A fact is claimed only when EVERY offer reports it as `true`. Unknown
 * (`null`) or explicitly `false` never renders. On a single-offer page this
 * is that offer's known-true facts; on a multi-offer page only facts every
 * offer agrees on survive — a fact that one offer reports and another does
 * not is never promoted to an activity-level claim.
 */
export function getActivityLevelFacts(
  offers: readonly ThingsActivityOfferDetail[],
): ThingsActivityOfferFactKey[] {
  if (offers.length === 0) return [];
  return FACT_KEYS.filter((key) => offers.every((offer) => offer[key] === true));
}

/**
 * Value from the SINGLE offer that carries a genuine value for `key`, or
 * null. With zero genuine values there is nothing to show; with more than
 * one the value is ambiguous at activity level and must not be promoted.
 */
export function getSingleOfferField<
  T extends keyof ThingsActivityOfferDetail,
>(
  offers: readonly ThingsActivityOfferDetail[],
  key: T,
): ThingsActivityOfferDetail[T] | null {
  const known = offers.filter(
    (offer) => offer[key] !== null && offer[key] !== undefined,
  );
  return known.length === 1 ? known[0][key] : null;
}

/** Genuine rating + review count from the single offer that has both. */
export interface ActivityRatingSummary {
  rating: number;
  reviewCount: number;
}

export function getActivityRatingSummary(
  offers: readonly ThingsActivityOfferDetail[],
): ActivityRatingSummary | null {
  const known = offers.filter(
    (offer) =>
      typeof offer.rating === "number" && typeof offer.reviewCount === "number",
  );
  if (known.length !== 1) return null;
  return { rating: known[0].rating as number, reviewCount: known[0].reviewCount as number };
}

/** Genuine price + currency from the single offer that has both. */
export interface ActivityPriceSummary {
  price: number;
  currency: string;
}

export function getActivityPriceSummary(
  offers: readonly ThingsActivityOfferDetail[],
): ActivityPriceSummary | null {
  const known = offers.filter(
    (offer) =>
      typeof offer.price === "number" &&
      typeof offer.currency === "string" &&
      offer.currency.trim() !== "",
  );
  if (known.length !== 1) return null;
  return {
    price: known[0].price as number,
    currency: known[0].currency as string,
  };
}

/** Non-blank description from the single offer that has one (attributed). */
export function getSingleOfferDescription(
  offers: readonly ThingsActivityOfferDetail[],
): { description: string; provider: string } | null {
  const known = offers.filter(
    (offer) =>
      typeof offer.description === "string" && offer.description.trim() !== "",
  );
  if (known.length !== 1) return null;
  return {
    description: (known[0].description as string).trim(),
    provider: known[0].provider,
  };
}

/**
 * Format a genuine price for display ("A$59", "€45.50"). Same currency
 * formatting the Things search cards use. Returns null only when the price
 * is not genuinely known.
 */
export function formatActivityPrice(
  price: number | null | undefined,
  currency: string | null | undefined,
): string | null {
  if (typeof price !== "number" || Number.isNaN(price)) return null;
  const c =
    typeof currency === "string" && currency.trim() !== "" ? currency : "AUD";
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: c,
      maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    }).format(price);
  } catch {
    return `${c} ${price}`;
  }
}

/** Display price label for a single offer, or null when not genuinely known. */
export function getOfferPriceLabel(
  offer: ThingsActivityOfferDetail,
): string | null {
  return formatActivityPrice(offer.price, offer.currency);
}

/**
 * A provider CTA is allowed only for a genuinely known http(s) checkout URL.
 * Scheme validation only — host allow-listing belongs to the ingestion layer
 * (things_activity_offers.provider_url is written there, not by the page).
 */
export function isValidProviderUrl(
  url: string | null | undefined,
): boolean {
  if (typeof url !== "string" || url.trim() === "") return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Neutral, stable offer ordering: provider name ascending, then product ID.
 * Deliberately NOT "best / cheapest / recommended" — no ordering claim is
 * made about the offers themselves.
 */
export function sortOffersNeutrally(
  offers: readonly ThingsActivityOfferDetail[],
): ThingsActivityOfferDetail[] {
  return [...offers].sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) ||
      a.providerProductId.localeCompare(b.providerProductId),
  );
}

/** Provider display name (fallback to the raw provider key). */
export function providerDisplayName(provider: string): string {
  switch (provider) {
    case "viator":
      return "Viator";
    case "tiqets":
      return "Tiqets";
    default:
      return provider;
  }
}
