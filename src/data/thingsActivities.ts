/**
 * Canonical BookingsFinder Things activity registry.
 *
 * BookingsFinder owns every entry: the id, the destination slug, the canonical
 * slug, the canonical title, the publication state and the verification
 * record. Providers only ever contribute a scoped offer under
 * ThingsActivityOffer, recorded only when genuinely verified.
 *
 * THIS IS NOT A PROVIDER CATALOGUE.
 *
 * Do NOT copy provider products into this file. A provider product becomes a
 * ThingsActivity only when BookingsFinder genuinely owns and verifies the
 * activity identity; the offer mapping then lives in things_activity_offers
 * (database) / ThingsActivityOffer (types), not here.
 *
 * Initial registry — EMPTY. This phase establishes the identity foundation:
 * the canonical URL contract, the slug algorithm, the collision strategy, the
 * fail-closed resolver and the database constraints. No activity has yet
 * passed the genuine content/value/inventory gate, so nothing is listed and
 * every /things-to-do/:destinationSlug/:activitySlug request fails closed to
 * not-found (noindex).
 *
 * The slug format is the same lowercase hyphen-separated contract as
 * destination slugs. The registry is a closed, validated set:
 * `assertValidActivityRegistry` runs at module load so a duplicate identity or
 * a malformed slug fails loudly instead of silently resolving to the wrong
 * page.
 */
import type {
  ThingsActivity,
  ThingsActivityPublicationStatus,
} from "@/types/thingsActivity";

/** Lowercase hyphen-separated slugs only — matches the URL contract. */
export const THINGS_ACTIVITY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Sensible maximum canonical slug length. Keeps URLs readable and bounded;
 * truncation (word-boundary aware) happens inside the slug utility, never
 * here.
 */
export const MAX_ACTIVITY_SLUG_LENGTH = 80;

const PUBLICATION_STATUSES: readonly ThingsActivityPublicationStatus[] = [
  "draft",
  "published",
  "archived",
];

/**
 * Validate a canonical activity registry at module load. Rejects:
 *   - missing/invalid id
 *   - malformed destinationSlug or slug (shape + length)
 *   - empty canonicalTitle
 *   - unknown publicationStatus
 *   - duplicate (destinationSlug, slug) identity
 *   - duplicate id
 *
 * `registry` is injectable so the contract is testable without mutating the
 * production registry.
 */
export function assertValidActivityRegistry(
  activities: readonly ThingsActivity[],
): void {
  const identities = new Set<string>();
  const ids = new Set<string>();

  for (const activity of activities) {
    if (!activity || typeof activity !== "object") {
      throw new Error("Things activity registry: entry missing");
    }
    if (typeof activity.id !== "string" || activity.id.trim().length === 0) {
      throw new Error(
        `Things activity registry: entry for "${activity.slug ?? "?"}" missing id`,
      );
    }
    if (ids.has(activity.id)) {
      throw new Error(
        `Things activity registry: duplicate id "${activity.id}"`,
      );
    }
    ids.add(activity.id);

    if (
      typeof activity.destinationSlug !== "string" ||
      !THINGS_ACTIVITY_SLUG_RE.test(activity.destinationSlug)
    ) {
      throw new Error(
        `Things activity registry: invalid destinationSlug "${activity.destinationSlug}"`,
      );
    }
    if (
      typeof activity.slug !== "string" ||
      !THINGS_ACTIVITY_SLUG_RE.test(activity.slug)
    ) {
      throw new Error(
        `Things activity registry: invalid slug "${activity.slug}"`,
      );
    }
    if (activity.slug.length > MAX_ACTIVITY_SLUG_LENGTH) {
      throw new Error(
        `Things activity registry: slug "${activity.slug}" exceeds ${MAX_ACTIVITY_SLUG_LENGTH} characters`,
      );
    }
    if (
      typeof activity.canonicalTitle !== "string" ||
      activity.canonicalTitle.trim().length === 0
    ) {
      throw new Error(
        `Things activity registry: empty canonicalTitle for "${activity.slug}"`,
      );
    }
    if (
      typeof activity.publicationStatus !== "string" ||
      !PUBLICATION_STATUSES.includes(activity.publicationStatus)
    ) {
      throw new Error(
        `Things activity registry: invalid publicationStatus "${activity.publicationStatus}" for "${activity.slug}"`,
      );
    }

    const identityKey = `${activity.destinationSlug}/${activity.slug}`;
    if (identities.has(identityKey)) {
      throw new Error(
        `Things activity registry: duplicate identity "${identityKey}"`,
      );
    }
    identities.add(identityKey);
  }
}

/**
 * The canonical registry — currently EMPTY.
 *
 * Every entry here is a genuine BookingsFinder-owned activity. A page for an
 * activity is indexable only when publicationStatus is `published`; the
 * resolver fails closed for everything not listed.
 */
export const THINGS_ACTIVITIES: readonly ThingsActivity[] = [];

assertValidActivityRegistry(THINGS_ACTIVITIES);
