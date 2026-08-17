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

/**
 * Provider-scoped destination identities for one search.
 *
 * Each provider reads ONLY its own key. There is deliberately no shared
 * `destinationId`: the same search now carries two provider identities (Rome
 * is Viator 511 AND Tiqets 71631), and a single generic field made it possible
 * to hand one provider's ID to the other. Cross-wiring is now a type error
 * rather than a silent wrong-inventory bug.
 *
 * Every value must come from the BookingsFinder canonical Things registry —
 * never from city text, autocomplete selections, test fixtures or array
 * position.
 */
export interface ProviderDestinationIds {
  /** Genuine Tiqets city ID (Tiqets `city_id`). Never a Viator destination ID. */
  tiqets?: number;
  /** Genuine Viator destination ID. Never a Tiqets city ID. */
  viator?: number;
}

/**
 * Search filters BookingsFinder can genuinely express to a live provider.
 *
 * Every field here is actually forwarded to at least one active provider
 * request. Filters the repaired provider contracts ignore (price bounds,
 * skip-the-line, wheelchair access, sort) are deliberately absent: offering a
 * control the request drops would tell the traveller a lie about their
 * results. A product may still REPORT those facts — see
 * `ExperienceProduct.features` — but reporting a fact is not the same as being
 * able to search on it.
 */
export interface ExperienceSearchFilters {
  /**
   * Free-text destination (provider-neutral). Used as Tiqets `city_name` on
   * legacy hub searches only; a canonical destination is expressed through
   * `providerDestinationIds` instead.
   */
  destination?: string;
  /** Registry-owned, provider-scoped destination IDs. Absent on hub searches. */
  providerDestinationIds?: ProviderDestinationIds;
  query?: string;
  activityTags?: string[];
  minRating?: number;
  freeCancellation?: boolean;
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