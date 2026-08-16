/**
 * BookingsFinder provider-neutral activity-detail view model (T2D-B1).
 *
 * This is the model behind the canonical activity page
 * `/things-to-do/:destinationSlug/:activitySlug`. It is deliberately NOT
 * ExperienceProduct: a provider search result is not canonical page identity.
 * The page identity is the persisted `ThingsActivity` (resolved server-side);
 * provider offers hang off it as scoped, optional display data.
 *
 *   ThingsActivityDetail
 *     ├── activity      — the canonical ThingsActivity (BookingsFinder identity)
 *     ├── destination   — canonical destination summary (frontend registry)
 *     └── offers        — ThingsActivityOfferDetail[] (provider-scoped)
 *
 * TRUTHFULNESS RULE: every richer display field (title, description, image,
 * rating, price, features, duration, meeting point, availability) is
 * OPTIONAL / nullable. The current database does not contain most of those
 * fields, so a null means "not genuinely known" — never "absent by default".
 * No field is ever fabricated to fill a UI section, and no field is ever
 * derived from URL text or from a provider product ID.
 */

import type {
  ThingsActivity,
  ThingsActivityProvider,
} from "@/types/thingsActivity";

/**
 * One provider's offer for a canonical activity, extended with optional
 * truthful display data. Provider identity (provider + providerProductId)
 * is scoped to this shape and can never appear in a canonical activity URL,
 * which is built from ThingsActivity identity only.
 */
export interface ThingsActivityOfferDetail {
  /** Stable internal ID of the parent ThingsActivity. */
  activityId: string;
  /** The provider this offer belongs to. */
  provider: ThingsActivityProvider;
  /** The provider's own product ID — NEVER a BookingsFinder activity ID or slug. */
  providerProductId: string;
  /**
   * Provider checkout URL (provider-scoped, never canonical). The page may
   * render a provider CTA ONLY when this is present and validates as
   * http(s). Null means "no checkout URL genuinely known".
   */
  providerUrl: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;

  // ── Optional truthful display data (all null unless genuinely known) ──
  /** Provider-supplied title, when genuinely known. */
  title: string | null;
  /** Provider-supplied description, when genuinely known. */
  description: string | null;
  /** Provider-supplied tagline, when genuinely known. */
  tagline: string | null;
  /** Provider-supplied image URL, when genuinely known. */
  imageUrl: string | null;
  /** Accessible alt text for the image, when genuinely known. */
  imageAlt: string | null;
  /** Image credit / attribution, when genuinely known. */
  imageCredit: string | null;
  /** Genuine rating (0–5 scale), when the provider reports one. */
  rating: number | null;
  /** Genuine review count, when the provider reports one. */
  reviewCount: number | null;
  /** Genuine from-price, when the provider reports one. */
  price: number | null;
  /** Genuine price currency code, when known. */
  currency: string | null;
  /** `true` only when the provider genuinely reports free cancellation. */
  freeCancellation: boolean | null;
  /** `true` only when the provider genuinely reports skip-the-line. */
  skipLine: boolean | null;
  /** `true` only when the provider genuinely reports a smartphone ticket. */
  smartphoneTicket: boolean | null;
  /** `true` only when the provider genuinely reports instant confirmation. */
  instantConfirmation: boolean | null;
  /** `true` only when the provider genuinely reports wheelchair access. */
  wheelchairAccessible: boolean | null;
  /** Genuine duration description, when known. No current source populates this. */
  duration: string | null;
  /** Genuine meeting point, when known. No current source populates this. */
  meetingPoint: string | null;
  /** Genuine availability state, when known. No current source populates this. */
  availabilityState: string | null;
  /** When the provider last reported this data (ISO), when genuinely known. */
  lastVerifiedAt: string | null;
  /** When the provider data was last fetched (ISO), when genuinely known. */
  fetchedAt: string | null;
}

/** A fact that may be claimed at activity level — only when genuinely known. */
export type ThingsActivityOfferFactKey =
  | "freeCancellation"
  | "skipLine"
  | "smartphoneTicket"
  | "instantConfirmation"
  | "wheelchairAccessible";

/** Canonical destination summary shown on the detail page. */
export interface ThingsActivityDetailDestination {
  /** BookingsFinder canonical destination slug (e.g. "rome"). */
  slug: string;
  /** Display name as travellers see it (e.g. "Rome"). */
  displayName: string;
  /** Country name, or null when unknown. */
  countryName: string | null;
}

/**
 * The full provider-neutral detail page model:
 *
 *   activity      — canonical identity (owns the URL)
 *   destination   — canonical destination summary (or null when the
 *                   frontend registry has no entry — display stays sparse)
 *   offers        — provider-scoped offers with optional display data
 */
export interface ThingsActivityDetail {
  /** The canonical BookingsFinder activity this page resolves to. */
  activity: ThingsActivity;
  /** Canonical destination summary. */
  destination: ThingsActivityDetailDestination | null;
  /** Provider offers for this activity (may be empty). */
  offers: ThingsActivityOfferDetail[];
}
