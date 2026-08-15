/**
 * BookingsFinder Things destination identity — provider-independent model.
 *
 * A BookingsFinder Things destination is an entity BookingsFinder OWNS. Its
 * `slug` is ours and stable; the providers only supply their own internal
 * references under `providerRefs`. Provider references are provider-scoped:
 * a ref that belongs to one provider must never be treated as a ref for
 * another provider (a Tiqets destination ID is not a Viator destination ID).
 *
 * The model deliberately carries no marketing fields. Popularity, ranking,
 * editorial scores, sales, review summaries, coordinates and country codes
 * are only added when genuinely verified and required — nothing is invented
 * to make a page look fuller than it is.
 */

/** The providers a Things destination may carry a scoped reference for. */
export type ThingsDestinationProvider = "viator" | "tiqets";

/**
 * Publication state drives indexability:
 * - `draft`     → never sitemap-published, never indexable (noindex,follow)
 * - `published` → may be sitemap-published and indexable
 */
export type ThingsDestinationPublicationStatus = "draft" | "published";

/** Provider-scoped references. Absent means "no verified ref for this provider". */
export interface ThingsDestinationProviderRefs {
  /** Genuine Viator destination ID. Never a Tiqets ID or a fixture ID. */
  viator?: string;
  /** Genuine Tiqets destination ID. Never a Viator ID or a fixture ID. */
  tiqets?: string;
}

/** How a provider ref was established. Absent = not verified for that provider. */
export interface ThingsDestinationVerification {
  viator?: "sandbox-verified" | "production-verified";
  tiqets?: "verified";
}

export interface ThingsDestination {
  /** BookingsFinder-owned stable slug. Never auto-derived from provider taxonomy. */
  slug: string;
  /** Display name as travellers see it (e.g. "Rome"). */
  displayName: string;
  /** Country name (e.g. "Italy"), or null when unknown. */
  countryName: string | null;
  /** Destination granularity as reported by the provider taxonomy. */
  type: "CITY" | "REGION" | "COUNTRY" | string;
  /** Provider-scoped references — never shared across providers. */
  providerRefs: ThingsDestinationProviderRefs;
  /** Draft destinations are never indexable or sitemap-published. */
  publicationStatus: ThingsDestinationPublicationStatus;
  /** Honest record of how each provider ref was verified. */
  verification: ThingsDestinationVerification;
}
