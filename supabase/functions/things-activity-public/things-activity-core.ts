/**
 * things-activity-public core — pure resolver logic (T2D-B1).
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
