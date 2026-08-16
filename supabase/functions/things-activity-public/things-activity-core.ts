/**
 * things-activity-public core — pure resolver + provider-mapping logic
 * (T2D-B1 resolver, T2D-B2B-5A provider→canonical mapping).
 *
 * This file deliberately contains NO Deno globals, NO remote imports and NO
 * database access so the vitest suite can import it directly (the repo's
 * edge-function test convention — same as sitemap/sitemap-core.ts). The
 * index.ts shell supplies the environment, the service-role Supabase client
 * and the HTTP response.
 *
 * Security responsibilities implemented here:
 *   - strict slug syntax validation (lowercase hyphen-separated, bounded)
 *   - archived activities fail closed (→ not_found)
 *   - public payloads expose ONLY public-safe fields: provider product IDs
 *     are present on offers (provider-scoped by design) but never influence
 *     canonical URL identity, and no internal/credential fields are emitted
 */

/** Same lowercase hyphen-separated slug contract as the activity registry. */
export const THINGS_ACTIVITY_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Matches ck_things_activities_slug_length in the phase2d migration. */
export const MAX_ACTIVITY_SLUG_LENGTH = 80;

export type ResolveInputValidation =
  | { ok: true; destinationSlug: string; activitySlug: string }
  | { ok: false; error: string };

/**
 * Validate a resolve request strictly. Slugs are trimmed and lowercased,
 * then matched against the canonical slug contract. No slug is ever
 * manufactured from arbitrary text, and no provider ID is ever accepted as
 * an activity slug.
 */
export function validateResolveInput(
  destinationSlug: unknown,
  activitySlug: unknown,
): ResolveInputValidation {
  if (typeof destinationSlug !== "string" || destinationSlug.trim() === "") {
    return { ok: false, error: "destinationSlug is required" };
  }
  if (typeof activitySlug !== "string" || activitySlug.trim() === "") {
    return { ok: false, error: "activitySlug is required" };
  }

  const destination = destinationSlug.trim().toLowerCase();
  const slug = activitySlug.trim().toLowerCase();

  if (
    destination.length > MAX_ACTIVITY_SLUG_LENGTH ||
    !THINGS_ACTIVITY_SLUG_RE.test(destination)
  ) {
    return { ok: false, error: "invalid destinationSlug syntax" };
  }
  if (
    slug.length > MAX_ACTIVITY_SLUG_LENGTH ||
    !THINGS_ACTIVITY_SLUG_RE.test(slug)
  ) {
    return { ok: false, error: "invalid activitySlug syntax" };
  }

  return { ok: true, destinationSlug: destination, activitySlug: slug };
}

/** Archived activities fail closed: they are never publicly resolvable. */
export function isArchivedStatus(status: unknown): boolean {
  return status === "archived";
}

// ───────────────────────────────────────────────────────────────
// Public-safe payload builders
// ───────────────────────────────────────────────────────────────

/**
 * Public activity payload. Only canonical identity and publication state;
 * `verification` (internal evidence record) and any future internal fields
 * are deliberately excluded.
 */
export interface PublicActivityPayload {
  id: string;
  destinationSlug: string;
  slug: string;
  canonicalTitle: string;
  publicationStatus: string;
  createdAt: string;
  updatedAt: string;
}

export function buildPublicActivityPayload(
  row: Record<string, unknown> | null | undefined,
): PublicActivityPayload | null {
  if (!row || typeof row !== "object") return null;
  const { id, destination_slug, slug, canonical_title, publication_status, created_at, updated_at } = row;
  if (
    typeof id !== "string" ||
    typeof destination_slug !== "string" ||
    typeof slug !== "string" ||
    typeof canonical_title !== "string" ||
    typeof created_at !== "string" ||
    typeof updated_at !== "string"
  ) {
    return null;
  }
  return {
    id,
    destinationSlug: destination_slug,
    slug,
    canonicalTitle: canonical_title,
    publicationStatus: typeof publication_status === "string" ? publication_status : "draft",
    createdAt: created_at,
    updatedAt: updated_at,
  };
}

/**
 * Public offer payload. Canonical offer identity plus OPTIONAL truthful
 * display data from a provider-keyed source (currently
 * experience_products, joined by provider + provider_product_id). Every
 * display field is null unless genuinely known — nothing is invented to
 * fill a UI section.
 */
export interface PublicOfferPayload {
  activityId: string;
  provider: string;
  providerProductId: string;
  providerUrl: string | null;
  createdAt: string;
  updatedAt: string;

  title: string | null;
  description: string | null;
  tagline: string | null;
  imageUrl: string | null;
  imageAlt: string | null;
  imageCredit: string | null;
  rating: number | null;
  reviewCount: number | null;
  price: number | null;
  currency: string | null;
  freeCancellation: boolean | null;
  skipLine: boolean | null;
  smartphoneTicket: boolean | null;
  instantConfirmation: boolean | null;
  wheelchairAccessible: boolean | null;
  duration: string | null;
  meetingPoint: string | null;
  availabilityState: string | null;
  lastVerifiedAt: string | null;
  fetchedAt: string | null;
}

/** Optional enrichment row from the provider catalogue cache. */
export type OfferEnrichmentRow = Record<string, unknown>;

function str(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export function buildPublicOfferPayload(
  row: Record<string, unknown> | null | undefined,
  enrichment: OfferEnrichmentRow | null | undefined,
): PublicOfferPayload | null {
  if (!row || typeof row !== "object") return null;
  const { activity_id, provider, provider_product_id, provider_url, created_at, updated_at } = row;
  if (
    typeof activity_id !== "string" ||
    typeof provider !== "string" ||
    typeof provider_product_id !== "string" ||
    typeof created_at !== "string" ||
    typeof updated_at !== "string"
  ) {
    return null;
  }

  // Provider URL passes through only when it matches the http(s) contract
  // enforced by ck_things_activity_offers_url (defense in depth).
  const providerUrl =
    typeof provider_url === "string" && /^https?:\/\//.test(provider_url)
      ? provider_url
      : null;

  const e = enrichment ?? {};

  return {
    activityId: activity_id,
    provider,
    providerProductId: provider_product_id,
    providerUrl,
    createdAt: created_at,
    updatedAt: updated_at,

    title: str(e.title),
    description: str(e.description),
    tagline: str(e.tagline),
    imageUrl: str(e.image_url),
    imageAlt: str(e.image_alt),
    imageCredit: str(e.image_credit),
    rating: num(e.rating),
    reviewCount: num(e.review_count),
    price: num(e.price_amount),
    currency: str(e.price_currency),
    freeCancellation: bool(e.free_cancellation),
    skipLine: bool(e.skip_the_line),
    smartphoneTicket: bool(e.smartphone_ticket),
    instantConfirmation: bool(e.instant_confirmation),
    wheelchairAccessible: bool(e.wheelchair_accessible),
    duration: str(e.duration),
    meetingPoint: str(e.meeting_point),
    availabilityState: str(e.availability_state),
    lastVerifiedAt: str(e.provider_updated_at),
    fetchedAt: str(e.last_seen_at),
  };
}

// ───────────────────────────────────────────────────────────────
// Response body builders
// ───────────────────────────────────────────────────────────────

export function buildResolvedBody(
  activity: PublicActivityPayload,
  offers: PublicOfferPayload[],
): Record<string, unknown> {
  return { status: "available", activity, offers };
}

/** Unknown AND archived activities share the same fail-closed body. */
export function buildNotFoundBody(): Record<string, unknown> {
  return { status: "not_found" };
}

/** Neutral, deterministic offer ordering (provider name, then product ID). */
export function sortOffersByProvider<T extends { provider: string; providerProductId: string }>(
  offers: T[],
): T[] {
  return [...offers].sort(
    (a, b) =>
      a.provider.localeCompare(b.provider) ||
      a.providerProductId.localeCompare(b.providerProductId),
  );
}

// ───────────────────────────────────────────────────────────────
// Provider → canonical activity mapping (T2D-B2B-5A)
// ───────────────────────────────────────────────────────────────
//
// map-provider-products is a strict IDENTITY bridge. The ONLY valid join is
//
//   (provider, provider_product_id)
//         ↓
//   things_activity_offers.activity_id
//         ↓
//   things_activities.id
//
// Title similarity, fuzzy matching, slugifying provider titles, provider URL
// text, images, city-alone, price, provider-product-ID-without-provider, AI
// and heuristic matching are ALL forbidden. No match means NO canonical
// mapping — never manufacture one.

/** Providers whose exact offer identities bridge into the canonical registry. */
export const SUPPORTED_MAPPING_PROVIDERS = ["tiqets", "viator"] as const;
export type MappingProvider = (typeof SUPPORTED_MAPPING_PROVIDERS)[number];

/** Maximum provider-product pairs accepted in one mapping request. */
export const MAX_MAPPING_BATCH_SIZE = 50;

/**
 * Conservative provider product-ID contract. Provider IDs are opaque tokens
 * owned by the provider: Tiqets IDs are numeric ("1111450") and Viator IDs
 * are alphanumeric ("3731VATICAN", "11489P12"), so IDs are never coerced to
 * numbers. The contract allows ASCII alphanumerics (always starting with
 * one) plus the conservative punctuation actually seen in provider IDs
 * (`.` `_` `-`). Control characters, whitespace, quotes, commas and SQL
 * metacharacters are rejected — a validated ID can never become SQL syntax.
 */
export const PROVIDER_PRODUCT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Upper bound on a trimmed provider product ID. */
export const MAX_PROVIDER_PRODUCT_ID_LENGTH = 128;

export type ProviderMappingInputValidation =
  | { ok: true; items: Array<{ provider: string; providerProductId: string }> }
  | { ok: false; error: string };

/**
 * Strict validation for a map-provider-products request body.
 *
 * items: required array, 1..MAX_MAPPING_BATCH_SIZE. Each item must carry a
 * supported provider (exact enum match — malformed providers are rejected,
 * never silently repaired) and a trimmed, bounded, safe providerProductId.
 * Exact (provider, providerProductId) duplicates are removed
 * deterministically: the first occurrence wins and request order is
 * preserved, so the output is deterministic for a given request.
 */
export function validateProviderMappingInput(items: unknown): ProviderMappingInputValidation {
  if (!Array.isArray(items)) {
    return { ok: false, error: "items is required (array of provider-product pairs)" };
  }
  if (items.length < 1) {
    return { ok: false, error: `items must contain at least 1 pair` };
  }
  if (items.length > MAX_MAPPING_BATCH_SIZE) {
    return { ok: false, error: `items must contain at most ${MAX_MAPPING_BATCH_SIZE} pairs` };
  }

  const seen = new Set<string>();
  const normalized: Array<{ provider: string; providerProductId: string }> = [];

  for (const item of items) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return { ok: false, error: "each item must be an object with provider and providerProductId" };
    }
    const { provider, providerProductId } = item as Record<string, unknown>;

    if (typeof provider !== "string" || !SUPPORTED_MAPPING_PROVIDERS.includes(provider as MappingProvider)) {
      return {
        ok: false,
        error: `provider must be one of: ${SUPPORTED_MAPPING_PROVIDERS.join(", ")}`,
      };
    }
    if (typeof providerProductId !== "string") {
      return { ok: false, error: "providerProductId is required" };
    }

    const productId = providerProductId.trim();
    if (productId === "") {
      return { ok: false, error: "providerProductId must not be empty" };
    }
    if (productId.length > MAX_PROVIDER_PRODUCT_ID_LENGTH) {
      return {
        ok: false,
        error: `providerProductId must be at most ${MAX_PROVIDER_PRODUCT_ID_LENGTH} characters`,
      };
    }
    if (!PROVIDER_PRODUCT_ID_RE.test(productId)) {
      return { ok: false, error: "providerProductId contains unsupported characters" };
    }

    const key = `${provider}:${productId}`;
    if (seen.has(key)) continue; // exact-pair dedup — first occurrence wins
    seen.add(key);
    normalized.push({ provider, providerProductId: productId });
  }

  return { ok: true, items: normalized };
}

/** Public-safe identity mapping for one provider-product pair. */
export interface ProviderMappingPayload {
  provider: string;
  providerProductId: string;
  destinationSlug: string;
  activitySlug: string;
  canonicalPath: string;
  publicationStatus: string;
}

/**
 * Canonical path is built ONLY from stored canonical DB fields — never from
 * provider titles, provider product IDs, provider URLs or slugification.
 */
export function canonicalActivityPath(destinationSlug: string, activitySlug: string): string {
  return `/things-to-do/${destinationSlug}/${activitySlug}`;
}

/**
 * Build a public-safe mapping payload for one validated pair + its exact
 * canonical activity row. Fails closed (returns null) when:
 *   - the activity row is missing/malformed,
 *   - stored canonical identity violates the canonical slug contract
 *     (no corrected values are ever manufactured),
 *   - publication_status is unknown (never guessed),
 *   - the activity is archived (archived activities never map).
 *
 * The response intentionally contains ONLY identity fields — no activity
 * UUID, offer UUID, provider_url, verification JSON or internal timestamps.
 */
export function buildProviderMappingPayload(
  provider: string,
  providerProductId: string,
  activity: Record<string, unknown> | null | undefined,
): ProviderMappingPayload | null {
  if (!activity || typeof activity !== "object") return null;

  const { destination_slug, slug, publication_status } = activity;
  if (typeof destination_slug !== "string" || typeof slug !== "string") return null;

  if (
    publication_status !== "draft" &&
    publication_status !== "published" &&
    publication_status !== "archived"
  ) {
    return null;
  }
  if (isArchivedStatus(publication_status)) return null;

  // Validate stored canonical identity with the canonical slug contract
  // before emitting a path (defense in depth; DB CHECKs already enforce it).
  if (
    destination_slug.length > MAX_ACTIVITY_SLUG_LENGTH ||
    !THINGS_ACTIVITY_SLUG_RE.test(destination_slug) ||
    slug.length > MAX_ACTIVITY_SLUG_LENGTH ||
    !THINGS_ACTIVITY_SLUG_RE.test(slug)
  ) {
    return null;
  }

  return {
    provider,
    providerProductId,
    destinationSlug: destination_slug,
    activitySlug: slug,
    canonicalPath: canonicalActivityPath(destination_slug, slug),
    publicationStatus: publication_status,
  };
}

/**
 * Pure exact join used by map-provider-products:
 *
 *   1. offer rows are indexed by exact (provider, provider_product_id);
 *   2. activity rows are indexed by exact activity id;
 *   3. validated request items drive output order (deterministic);
 *   4. a missing offer, missing/orphaned activity or fail-closed payload
 *      simply omits that pair — the batch never fails and nothing is
 *      fabricated.
 */
export function mapProviderProductsToCanonical(
  items: Array<{ provider: string; providerProductId: string }>,
  offers: Array<Record<string, unknown>>,
  activities: Array<Record<string, unknown>>,
): ProviderMappingPayload[] {
  const offersByPair = new Map<string, Record<string, unknown>>();
  for (const offer of offers) {
    if (typeof offer.provider !== "string" || typeof offer.provider_product_id !== "string") {
      continue;
    }
    const key = `${offer.provider}:${offer.provider_product_id}`;
    if (!offersByPair.has(key)) offersByPair.set(key, offer);
  }

  const activitiesById = new Map<string, Record<string, unknown>>();
  for (const activity of activities) {
    if (typeof activity.id !== "string") continue;
    if (!activitiesById.has(activity.id)) activitiesById.set(activity.id, activity);
  }

  const mappings: ProviderMappingPayload[] = [];
  for (const item of items) {
    const offer = offersByPair.get(`${item.provider}:${item.providerProductId}`);
    if (!offer) continue; // unknown provider-product identity — omit
    const activityId = offer.activity_id;
    if (typeof activityId !== "string") continue;
    const activity = activitiesById.get(activityId);
    if (!activity) continue; // orphaned offer — fail closed for this pair
    const payload = buildProviderMappingPayload(item.provider, item.providerProductId, activity);
    if (payload) mappings.push(payload);
  }
  return mappings;
}

/**
 * Compact public response for map-provider-products. Unknown provider-product
 * identities are normal and never fail the batch; they simply do not appear
 * in `mappings`. Counts are neutral integers, not echoed raw input.
 */
export function buildProviderMappingBody(
  requestedCount: number,
  mappedCount: number,
  mappings: ProviderMappingPayload[],
): Record<string, unknown> {
  return { status: "ok", requestedCount, mappedCount, mappings };
}
