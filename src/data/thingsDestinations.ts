/**
 * Canonical BookingsFinder Things destination registry.
 *
 * BookingsFinder owns every entry: the slug, the display name, the country,
 * the publication state and the verification record. Providers only ever
 * contribute their own scoped reference, and a ref is recorded only when it
 * has been genuinely verified in this work.
 *
 * Initial registry — Rome only:
 *
 *   - slug rome resolves to Rome, Italy
 *   - providerRefs.viator = "511" — the genuine Viator destination ID for
 *     Rome, verified against the Viator sandbox in T0C.
 *   - providerRefs.tiqets is ABSENT — no genuine Tiqets Rome provider ref is
 *     proven in current production-safe code, so none is invented.
 *   - publicationStatus = draft — never indexable, never sitemap-published.
 *   - verification.viator = "sandbox-verified" — sandbox only, NOT production.
 *
 * DO NOT copy IDs from src/__fixtures__/viator-taxonomy.ts into this file.
 * Those IDs (1–15) are synthetic test data, not provider refs.
 */
import type { ThingsDestination } from "@/types/thingsDestination";

/** Lowercase hyphen-separated slugs only — matches the URL contract. */
export const THINGS_DESTINATION_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Registry entries are a closed, validated set. `assertValidRegistry` runs at
 * module load so a duplicate slug or a duplicated provider ref for the same
 * provider fails loudly instead of silently resolving to the wrong identity.
 */
export function assertValidRegistry(
  destinations: readonly ThingsDestination[],
): void {
  const slugs = new Set<string>();
  const providerRefs = new Set<string>();

  for (const destination of destinations) {
    if (!destination || typeof destination.slug !== "string") {
      throw new Error("Things destination registry: entry missing slug");
    }
    if (!THINGS_DESTINATION_SLUG_RE.test(destination.slug)) {
      throw new Error(
        `Things destination registry: invalid slug "${destination.slug}"`,
      );
    }
    if (slugs.has(destination.slug)) {
      throw new Error(
        `Things destination registry: duplicate slug "${destination.slug}"`,
      );
    }
    slugs.add(destination.slug);

    const refs = destination.providerRefs ?? {};
    for (const provider of ["viator", "tiqets"] as const) {
      const ref = refs[provider];
      if (ref === undefined || ref === null) continue;
      if (typeof ref !== "string" || ref.trim().length === 0) {
        throw new Error(
          `Things destination registry: invalid ${provider} ref for "${destination.slug}"`,
        );
      }
      const key = `${provider}:${ref.trim()}`;
      if (providerRefs.has(key)) {
        throw new Error(
          `Things destination registry: duplicate ${provider} ref "${ref}"`,
        );
      }
      providerRefs.add(key);
    }
  }
}

export const THINGS_DESTINATIONS: readonly ThingsDestination[] = [
  {
    slug: "rome",
    displayName: "Rome",
    countryName: "Italy",
    type: "CITY",
    providerRefs: {
      // Genuine Viator Rome destination ID, verified against the Viator
      // sandbox: destinationId 511, type CITY, parent 57 (Italy).
      viator: "511",
      // No Tiqets ref: a genuine Tiqets Rome provider ref is not yet proven.
    },
    publicationStatus: "draft",
    verification: {
      viator: "sandbox-verified",
    },
  },
];

assertValidRegistry(THINGS_DESTINATIONS);
