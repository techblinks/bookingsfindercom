/**
 * BookingsFinder canonical activity identity — provider-independent model.
 *
 * T2D-A splits what "a thing to do" means into TWO concepts that must never
 * be collapsed:
 *
 *   ThingsActivity        — the activity BookingsFinder OWNS. Its identity
 *                           (id, destinationSlug, slug) is ours and stable,
 *                           and its canonical URL never names a provider.
 *   ThingsActivityOffer   — one provider's listing for that activity
 *                           (Viator product, Tiqets product, …). The provider
 *                           and providerProductId live ONLY here, explicitly
 *                           provider-scoped.
 *
 * The relationship is deliberately one canonical activity with many possible
 * offers:
 *
 *   ThingsActivity
 *     ├── ThingsActivityOffer (viator, 3731VATICAN)
 *     ├── ThingsActivityOffer (tiqets, some-tiqets-id)
 *     └── … future providers
 *
 * Structural separation is the guardrail: `ThingsActivity` carries NO provider
 * fields, and `ThingsActivityOffer` carries NO slug/destination fields, so
 * providerProductId can never be mistaken for activityId or activitySlug by
 * construction.
 *
 * Publication state mirrors ThingsDestination and the repo's site_hero_sets
 * status vocabulary:
 *   - `draft`     → never indexable, never sitemap-published
 *   - `published` → may be indexable / sitemap-published after a genuine
 *                   content + value + inventory gate
 *   - `archived`  → retired, never indexable
 *
 * Newly created activities default to `draft`. Nothing in this model
 * manufactures inventory: a ThingsActivity exists only when BookingsFinder
 * genuinely owns and verifies it.
 */

/** The providers an activity may carry a scoped offer for. */
export type ThingsActivityProvider = "viator" | "tiqets";

/**
 * Publication state drives indexability, exactly like ThingsDestination.
 * Default for a newly created activity is `draft` — NOT published.
 */
export type ThingsActivityPublicationStatus = "draft" | "published" | "archived";

/**
 * Honest record of how the activity's existence was established.
 * Absent evidence (`null`) means "not yet verified" — never a claim.
 */
export interface ThingsActivityVerification {
  /**
   * How the mapping between this activity and its provider offers was
   * established:
   * - `"provider-catalog"` — offer mapping recorded from a genuine provider
   *   catalogue (e.g. the canonical provider adapter observed the product).
   * - `null` — not yet verified. Nothing is invented to make it look verified.
   */
  evidence: "provider-catalog" | null;
}

/**
 * A BookingsFinder-owned activity. This — never a provider product — is what
 * a canonical /things-to-do/:destinationSlug/:activitySlug URL resolves to.
 */
export interface ThingsActivity {
  /** BookingsFinder-owned stable internal ID (uuid). */
  id: string;
  /** BookingsFinder destination identity (a ThingsDestination slug). */
  destinationSlug: string;
  /**
   * BookingsFinder canonical slug. Generated from the canonical title ONLY at
   * creation time; after persistence a title change must NEVER re-slug it —
   * that would churn the canonical URL.
   */
  slug: string;
  /** BookingsFinder canonical title — BookingsFinder's own copy, not the provider's. */
  canonicalTitle: string;
  /** Default `draft`: never indexable until genuinely published. */
  publicationStatus: ThingsActivityPublicationStatus;
  /** Evidence record — see ThingsActivityVerification. */
  verification: ThingsActivityVerification;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}

/**
 * One provider's offer for a ThingsActivity. Provider identity is scoped to
 * this shape: the provider and providerProductId can never appear in a
 * canonical activity URL, which is built from ThingsActivity identity only.
 */
export interface ThingsActivityOffer {
  /** Stable internal ID of the parent ThingsActivity. */
  activityId: string;
  /** The provider this offer belongs to. */
  provider: ThingsActivityProvider;
  /** The provider's own product ID — NEVER a BookingsFinder activity ID or slug. */
  providerProductId: string;
  /** Provider checkout URL (provider-scoped, never canonical). */
  providerUrl: string | null;
  /** ISO timestamp. */
  createdAt: string;
  /** ISO timestamp. */
  updatedAt: string;
}
