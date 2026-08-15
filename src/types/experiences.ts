/**
 * Provider-neutral experience model for multi-provider "Things to Do".
 *
 * Design notes:
 * - `features` fields use `null` to mean "unknown" and `false` to mean
 *   "provider explicitly reports this feature is not available".  Consumers
 *   should treat `null` as "we don't know" rather than "absent".
 * - All provider-specific data is normalised into `ExperienceProduct`.
 *   No provider-specific fields leak into the shared model.
 * - Viator public integration is real but controlled server-side:
 *   `VIATOR_PUBLIC_ENABLED` is the authoritative runtime kill switch read
 *   from the Supabase Edge Function environment. Current verified upstream
 *   access is sandbox-only; production Viator access is not yet proven.
 */

export type ExperienceProvider = "tiqets" | "viator";

export interface ExperienceProduct {
  provider: ExperienceProvider;
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
  features: {
    /** `null` = unknown; `false` = provider explicitly says feature is absent */
    freeCancellation: boolean | null;
    /** `null` = unknown; `false` = provider explicitly says feature is absent */
    skipLine: boolean | null;
    /** `null` = unknown; `false` = provider explicitly says feature is absent */
    smartphoneTicket: boolean | null;
    /** `null` = unknown; `false` = provider explicitly says feature is absent */
    instantConfirmation: boolean | null;
    /** `null` = unknown; `false` = provider explicitly says feature is absent */
    wheelchairAccessible: boolean | null;
    /** `null` = unknown; `false` = provider explicitly says feature is absent */
    likelyToSellOut: boolean | null;
  };
  outboundUrl: string | null;
  attributionRequired: boolean;
}


export interface ExperienceDestination {
  provider: ExperienceProvider;
  destinationId: string;
  name: string;
  /** Tiqets destination fields */
  country: string | null;
  countryId: string | null;
  countryCode: string | null;
  slug: string;
  productCount: number;
  latitude: number | null;
  longitude: number | null;
  /** Viator taxonomy fixture fields (test-only) */
  type: string | null;
  parentDestinationId: string | null;
  lookupId: string | null;
  defaultCurrencyCode: string | null;
  timeZone: string | null;
}

export interface ExperienceTag {
  provider: ExperienceProvider;
  tagId: number;
  name: string;
  parentTagIds: number[] | null;
  category: string | null;
}

export interface ExperienceSearchFilters {
  /** Free-text destination (provider-neutral; also Tiqets city_name). */
  destination?: string;
  /**
   * Provider-scoped destination ID for Viator. Must be a genuine Viator
   * destination ID from the BookingsFinder canonical Things registry - never
   * a Tiqets destination ID, a test fixture ID, or a value derived from city
   * text. Absent on hub searches.
   */
  destinationId?: number;
  query?: string;
  activityTags?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  freeCancellation?: boolean;
  skipLine?: boolean;
  wheelchairAccessible?: boolean;
  sort?: string;
  page?: number;
  pageSize?: number;
}

export type ProviderStatus = "available" | "unavailable" | "disabled";

export interface ProviderAvailability {
  tiqets: ProviderStatus;
  viator: ProviderStatus;
}

export interface ExperienceSearchResult {
  products: ExperienceProduct[];
  totalCount: number;
  page: number;
  providers: ProviderAvailability;
  fetchedAt: string;
}

/** Viator enablement is controlled server-side via VIATOR_PUBLIC_ENABLED Supabase secret.
 * The frontend calls viator-public unconditionally; the server returns status.
 * No frontend constant gates Viator — the server is authoritative. */