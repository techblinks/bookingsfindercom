/**
 * BookingsFinder Things destination resolvers.
 *
 * Deterministic lookups over the canonical registry. There is deliberately no
 * fuzzy matching and no name-only ambiguity resolution: a slug either exists
 * in the registry or it does not, and a provider ref resolves only inside its
 * own provider's namespace. A Tiqets ref can never be found through a Viator
 * lookup, and no ID is ever derived from free text.
 */
import {
  THINGS_DESTINATIONS,
  THINGS_DESTINATION_SLUG_RE,
} from "@/data/thingsDestinations";
import type {
  ThingsDestination,
  ThingsDestinationProvider,
} from "@/types/thingsDestination";

/** Exact stable slug lookup. Case-insensitive, otherwise strict — no fuzziness. */
export function getThingsDestinationBySlug(
  slug: string | null | undefined,
): ThingsDestination | null {
  if (typeof slug !== "string") return null;
  const normalized = slug.trim().toLowerCase();
  if (!normalized || !THINGS_DESTINATION_SLUG_RE.test(normalized)) return null;
  return THINGS_DESTINATIONS.find((d) => d.slug === normalized) ?? null;
}

/**
 * Provider-scoped ref lookup. `ref` is only compared against the named
 * provider's namespace — cross-provider resolution is impossible by
 * construction.
 */
export function getThingsDestinationByProviderRef(
  provider: ThingsDestinationProvider,
  ref: string | null | undefined,
): ThingsDestination | null {
  if (typeof ref !== "string") return null;
  const normalized = ref.trim();
  if (!normalized) return null;
  return THINGS_DESTINATIONS.find((d) => d.providerRefs[provider] === normalized) ?? null;
}

/** Draft destinations are never indexable or sitemap-published. */
export function isThingsDestinationPublished(
  destination: ThingsDestination,
): boolean {
  return destination.publicationStatus === "published";
}

/**
 * The Viator destination ID to use for Viator searches, derived ONLY from the
 * canonical registry's provider ref. Returns undefined when the destination
 * has no verified Viator ref, or when the ref is not a usable positive
 * integer. Never derived from text, slugs, autocomplete selections or array
 * position.
 */
export function thingsDestinationViatorId(
  destination: ThingsDestination,
): number | undefined {
  const ref = destination.providerRefs.viator;
  if (typeof ref !== "string") return undefined;
  const id = Number(ref.trim());
  return Number.isInteger(id) && id > 0 ? id : undefined;
}

/** All registry entries (read-only snapshot for tests and surfaces). */
export function getAllThingsDestinations(): readonly ThingsDestination[] {
  return THINGS_DESTINATIONS;
}
