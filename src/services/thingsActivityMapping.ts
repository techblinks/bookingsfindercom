/**
 * BookingsFinder Things — provider → canonical activity mapping client
 * (T2D-B2B-5C).
 *
 * The listing page's identity bridge to the read-only `things-activity-public`
 * Edge Function:
 *
 *   {
 *     action: "map-provider-products",
 *     items: [{ provider, providerProductId }]
 *   }
 *
 * ABSOLUTE IDENTITY RULE — the frontend NEVER manufactures a canonical
 * activity path. A mapping is trusted only after the response is validated:
 *
 *   - top-level status must be exactly "ok"
 *   - `mappings` must be an array
 *   - each mapping must carry a supported provider (tiqets | viator), a
 *     non-empty providerProductId, canonical slug syntax for both slugs, a
 *     canonicalPath EXACTLY equal to `/things-to-do/{destinationSlug}/{activitySlug}`
 *     and publicationStatus draft|published (archived is rejected)
 *   - the returned (provider, providerProductId) pair must be one of the
 *     identities ACTUALLY requested
 *
 * Anything malformed, unexpected or archived is ignored — a repaired path is
 * never invented. Provider identity stays provider-scoped via
 * `providerScopedKey()`: a Tiqets product and a Viator product with the same
 * ID are different identities.
 *
 * FAILURE SEMANTICS — mapping is an ENHANCEMENT over genuine provider
 * inventory. Any transport/function/validation failure returns the typed
 * `{ status: "unavailable", mappings: [] }` state and NEVER throws, so the
 * caller keeps the existing provider outbound cards.
 */
import { supabase } from "@/integrations/supabase/client";

/** The providers a search card may carry a canonical mapping for. */
export type MappingProvider = "tiqets" | "viator";

/** Exact provider identity — the ONLY input the mapping API accepts. */
export interface ProviderIdentity {
  provider: MappingProvider;
  providerProductId: string;
}

/**
 * A validated canonical mapping. The canonicalPath is trusted only after it
 * is verified consistent with the returned slugs — never assembled here.
 */
export interface CanonicalActivityMapping {
  provider: MappingProvider;
  providerProductId: string;
  destinationSlug: string;
  activitySlug: string;
  canonicalPath: string;
  publicationStatus: "draft" | "published";
}

/**
 * Typed outcome:
 *   available    → mappings (possibly empty) that passed validation
 *   unavailable  → the mapping layer could not be trusted; callers keep the
 *                  provider outbound inventory untouched
 */
export type ProviderMappingResult =
  | { status: "available"; mappings: CanonicalActivityMapping[] }
  | { status: "unavailable"; mappings: [] };

/** Lowercase hyphen-separated slugs only — the canonical URL slug contract. */
const CANONICAL_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const SUPPORTED_PROVIDERS: readonly MappingProvider[] = ["tiqets", "viator"];

/**
 * Provider-scoped map key. Two providers can legitimately share a product ID;
 * `tiqets:1111450` and `viator:1111450` are different identities and must
 * never collide.
 */
export function providerScopedKey(
  provider: MappingProvider,
  providerProductId: string,
): string {
  return `${provider}:${providerProductId}`;
}

function isMappingProvider(value: unknown): value is MappingProvider {
  return SUPPORTED_PROVIDERS.includes(value as MappingProvider);
}

/**
 * Validate ONE mapping entry from the server against the requested identity
 * set. Returns null (ignore the entry) for anything malformed — never a
 * repaired path.
 */
function validateMapping(
  raw: unknown,
  requested: ReadonlySet<string>,
): CanonicalActivityMapping | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const m = raw as Record<string, unknown>;

  if (!isMappingProvider(m.provider)) return null;
  const provider = m.provider;

  if (typeof m.providerProductId !== "string" || m.providerProductId.trim() === "") {
    return null;
  }
  const providerProductId = m.providerProductId;

  // The returned identity MUST be one we actually requested — an unexpected
  // identity is never trusted.
  if (!requested.has(providerScopedKey(provider, providerProductId))) {
    return null;
  }

  if (typeof m.destinationSlug !== "string" || !CANONICAL_SLUG_RE.test(m.destinationSlug)) {
    return null;
  }
  if (typeof m.activitySlug !== "string" || !CANONICAL_SLUG_RE.test(m.activitySlug)) {
    return null;
  }
  const destinationSlug = m.destinationSlug;
  const activitySlug = m.activitySlug;

  // draft and published are the only accepted states; archived is rejected.
  if (m.publicationStatus !== "draft" && m.publicationStatus !== "published") {
    return null;
  }
  const publicationStatus = m.publicationStatus;

  // The returned canonicalPath must be EXACTLY consistent with the returned
  // slugs. A mismatch is ignored — no repaired path is ever manufactured.
  if (typeof m.canonicalPath !== "string") return null;
  if (m.canonicalPath !== `/things-to-do/${destinationSlug}/${activitySlug}`) {
    return null;
  }

  return {
    provider,
    providerProductId,
    destinationSlug,
    activitySlug,
    canonicalPath: m.canonicalPath,
    publicationStatus,
  };
}

/**
 * Map visible provider identities to canonical activity paths.
 *
 * - zero identities → no function invocation (nothing to map)
 * - one batched request, never N+1 — the caller sends exactly the visible
 *   products of the current result page
 * - the request carries ONLY provider identity; no title, city, price,
 *   image or outbound URL is ever sent
 * - network/function/validation failure → `unavailable`, never a throw
 */
export async function mapProviderProducts(
  identities: ProviderIdentity[],
): Promise<ProviderMappingResult> {
  if (identities.length === 0) {
    return { status: "available", mappings: [] };
  }

  // Provider-scoped dedupe: first occurrence wins, request order preserved.
  const requested = new Set<string>();
  const items: ProviderIdentity[] = [];
  for (const identity of identities) {
    const key = providerScopedKey(identity.provider, identity.providerProductId);
    if (!requested.has(key)) {
      requested.add(key);
      items.push(identity);
    }
  }

  try {
    const { data, error } = await supabase.functions.invoke("things-activity-public", {
      body: {
        action: "map-provider-products",
        items: items.map((item) => ({
          provider: item.provider,
          providerProductId: item.providerProductId,
        })),
      },
    });

    if (error || !data || typeof data !== "object") {
      return { status: "unavailable", mappings: [] };
    }

    const response = data as { status?: unknown; mappings?: unknown };
    if (response.status !== "ok") {
      return { status: "unavailable", mappings: [] };
    }
    if (!Array.isArray(response.mappings)) {
      return { status: "unavailable", mappings: [] };
    }

    const mappings = response.mappings
      .map((entry) => validateMapping(entry, requested))
      .filter((entry): entry is CanonicalActivityMapping => entry !== null);

    return { status: "available", mappings };
  } catch {
    return { status: "unavailable", mappings: [] };
  }
}
