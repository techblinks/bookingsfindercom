/**
 * BookingsFinder Things activity resolvers + canonical URL helpers.
 *
 * Deterministic lookups over the canonical activity registry. There is
 * deliberately no fuzzy matching and no identity invention: an activity either
 * exists in the registry under a destination + slug pair or it does not, and a
 * slug can never be manufactured from arbitrary URL text or from a provider
 * product ID.
 *
 * The canonical public URL contract is:
 *
 *   /things-to-do/:destinationSlug/:activitySlug
 *
 * Provider names and provider product IDs are absent by construction: the
 * path helper accepts only ThingsActivity identity fields.
 */
import {
  THINGS_ACTIVITIES,
  THINGS_ACTIVITY_SLUG_RE,
} from "@/data/thingsActivities";
import type { ThingsActivity } from "@/types/thingsActivity";

/** Identity shape the canonical path is built from. */
export interface ThingsActivityIdentity {
  /** BookingsFinder destination slug (e.g. "rome"). */
  destinationSlug: string;
  /** BookingsFinder canonical activity slug. */
  slug: string;
}

/**
 * Canonical client-side path for a Things activity — the single place that
 * turns canonical activity identity into a route path, so
 * `/things-to-do/${destination}/${slug}` is never hand-assembled across the
 * codebase.
 *
 * The parameter type accepts ONLY destinationSlug + slug. A provider-scoped
 * offer (provider, providerProductId) cannot be passed here, and therefore
 * cannot leak into a public URL.
 */
export function thingsActivityPath(activity: ThingsActivityIdentity): string {
  return `/things-to-do/${activity.destinationSlug}/${activity.slug}`;
}

/**
 * Exact, strict lookup of a canonical activity by destination + slug.
 * Case-insensitive on both segments, otherwise strict — no fuzziness, no
 * slug generation, no provider interpretation. Unknown activities resolve to
 * null and callers must fail closed (not-found, noindex).
 *
 * `registry` is injectable so the fail-closed contract is testable without
 * mutating the production registry.
 */
export function getThingsActivityBySlug(
  destinationSlug: string | null | undefined,
  slug: string | null | undefined,
  registry: readonly ThingsActivity[] = THINGS_ACTIVITIES,
): ThingsActivity | null {
  if (typeof destinationSlug !== "string" || typeof slug !== "string") {
    return null;
  }
  const normalizedDestination = destinationSlug.trim().toLowerCase();
  const normalizedSlug = slug.trim().toLowerCase();
  if (
    !normalizedDestination ||
    !normalizedSlug ||
    !THINGS_ACTIVITY_SLUG_RE.test(normalizedDestination) ||
    !THINGS_ACTIVITY_SLUG_RE.test(normalizedSlug)
  ) {
    return null;
  }
  return (
    registry.find(
      (a) =>
        a.destinationSlug === normalizedDestination && a.slug === normalizedSlug,
    ) ?? null
  );
}

/** Draft and archived activities are never indexable or sitemap-published. */
export function isThingsActivityPublished(activity: ThingsActivity): boolean {
  return activity.publicationStatus === "published";
}

/** All registry entries (read-only snapshot for tests and surfaces). */
export function getAllThingsActivities(): readonly ThingsActivity[] {
  return THINGS_ACTIVITIES;
}
