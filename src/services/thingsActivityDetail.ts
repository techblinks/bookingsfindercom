/**
 * BookingsFinder activity-detail resolver service (T2D-B1).
 *
 * The single frontend entry point for the canonical activity page. It invokes
 * the read-only `things-activity-public` Edge Function with:
 *
 *   { action: "resolve", destinationSlug, activitySlug }
 *
 * Contract:
 *   - exact slug pair only — no fuzzy matching, no title-derived fallback,
 *     no provider ID in the request and no provider API calls
 *   - returns a typed state: `resolved` | `not-found` | `unavailable`
 *   - infrastructure failure is NEVER reported as "no such activity": a
 *     network/function failure yields `unavailable`, and only an explicit
 *     not-found response yields `not-found`
 *   - resolved identity is trusted only after the response is validated; a
 *     malformed or identity-mismatched response fails to `unavailable`
 */
import { supabase } from "@/integrations/supabase/client";
import { getThingsDestinationBySlug } from "@/lib/thingsDestinations";
import type {
  ThingsActivityDetail,
  ThingsActivityDetailDestination,
  ThingsActivityOfferDetail,
} from "@/types/thingsActivityDetail";
import type {
  ThingsActivity,
  ThingsActivityPublicationStatus,
} from "@/types/thingsActivity";

/** Typed outcome of resolving a canonical activity pair. */
export type ThingsActivityDetailState =
  | { state: "resolved"; detail: ThingsActivityDetail }
  /** The activity genuinely does not exist (or is archived). Fail closed. */
  | { state: "not-found" }
  /** The resolver could not be reached or returned an invalid response. */
  | { state: "unavailable" };

const PUBLICATION_STATUSES: readonly string[] = ["draft", "published", "archived"];

interface ResolveResponse {
  status?: string;
  activity?: Record<string, unknown>;
  offers?: Array<Record<string, unknown>>;
}

/** Status of a supabase function error (FunctionsHttpError carries context.status). */
function errorStatus(error: unknown): number | null {
  if (!error || typeof error !== "object") return null;
  const context = (error as { context?: { status?: unknown } }).context;
  if (!context || typeof context.status !== "number") return null;
  return context.status;
}

function adaptActivity(row: Record<string, unknown>): ThingsActivity | null {
  const id = row.id;
  const destinationSlug = row.destinationSlug;
  const slug = row.slug;
  const canonicalTitle = row.canonicalTitle;
  const publicationStatus = row.publicationStatus;
  const createdAt = row.createdAt;
  const updatedAt = row.updatedAt;
  if (
    typeof id !== "string" ||
    typeof destinationSlug !== "string" ||
    typeof slug !== "string" ||
    typeof canonicalTitle !== "string" ||
    typeof publicationStatus !== "string" ||
    !PUBLICATION_STATUSES.includes(publicationStatus) ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }
  return {
    id,
    destinationSlug,
    slug,
    canonicalTitle,
    publicationStatus: publicationStatus as ThingsActivityPublicationStatus,
    // Verification is not part of the public resolver payload; a resolved
    // activity is genuinely resolved, so record the truthful default.
    verification: { evidence: "provider-catalog" },
    createdAt,
    updatedAt,
  };
}

function adaptOffer(row: Record<string, unknown>): ThingsActivityOfferDetail | null {
  if (!row || typeof row !== "object") return null;
  const activityId = row.activityId;
  const provider = row.provider;
  const providerProductId = row.providerProductId;
  const createdAt = row.createdAt;
  const updatedAt = row.updatedAt;
  if (
    typeof activityId !== "string" ||
    (provider !== "viator" && provider !== "tiqets") ||
    typeof providerProductId !== "string" ||
    typeof createdAt !== "string" ||
    typeof updatedAt !== "string"
  ) {
    return null;
  }
  const str = (v: unknown): string | null =>
    typeof v === "string" && v.trim() !== "" ? v : null;
  const num = (v: unknown): number | null =>
    typeof v === "number" && Number.isFinite(v) ? v : null;
  const bool = (v: unknown): boolean | null =>
    typeof v === "boolean" ? v : null;

  return {
    activityId,
    provider,
    providerProductId,
    providerUrl: str(row.providerUrl),
    createdAt,
    updatedAt,
    title: str(row.title),
    description: str(row.description),
    tagline: str(row.tagline),
    imageUrl: str(row.imageUrl),
    imageAlt: str(row.imageAlt),
    imageCredit: str(row.imageCredit),
    rating: num(row.rating),
    reviewCount: num(row.reviewCount),
    price: num(row.price),
    currency: str(row.currency),
    freeCancellation: bool(row.freeCancellation),
    skipLine: bool(row.skipLine),
    smartphoneTicket: bool(row.smartphoneTicket),
    instantConfirmation: bool(row.instantConfirmation),
    wheelchairAccessible: bool(row.wheelchairAccessible),
    duration: str(row.duration),
    meetingPoint: str(row.meetingPoint),
    availabilityState: str(row.availabilityState),
    lastVerifiedAt: str(row.lastVerifiedAt),
    fetchedAt: str(row.fetchedAt),
  };
}

function destinationSummary(
  destinationSlug: string,
): ThingsActivityDetailDestination | null {
  const destination = getThingsDestinationBySlug(destinationSlug);
  if (!destination) return null;
  return {
    slug: destination.slug,
    displayName: destination.displayName,
    countryName: destination.countryName,
  };
}

/**
 * Resolve a canonical activity detail by exact slug pair.
 *
 * Never turns infrastructure failure into "no such activity": only an
 * explicit `not_found` response from the resolver maps to `not-found`.
 */
export async function resolveThingsActivityDetail(
  destinationSlug: string,
  activitySlug: string,
): Promise<ThingsActivityDetailState> {
  const { data, error } = await supabase.functions.invoke(
    "things-activity-public",
    {
      body: {
        action: "resolve",
        destinationSlug,
        activitySlug,
      },
    },
  );

  // Explicit not-found (HTTP 404) — the resolver fails closed for unknown
  // AND archived activities.
  if (error && errorStatus(error) === 404) {
    return { state: "not-found" };
  }

  // Any other transport/function error is infrastructure, not identity.
  if (error) {
    return { state: "unavailable" };
  }

  if (!data || typeof data !== "object") {
    return { state: "unavailable" };
  }

  const response = data as ResolveResponse;

  // Defensive: the function can also carry not_found in the body.
  if (response.status === "not_found") {
    return { state: "not-found" };
  }

  if (response.status !== "available" || !response.activity) {
    return { state: "unavailable" };
  }

  const activity = adaptActivity(response.activity);
  if (!activity) return { state: "unavailable" };

  // The resolver resolved exact slugs server-side; a mismatch still means
  // the response does not describe the requested identity — fail safe.
  if (
    activity.destinationSlug !== destinationSlug.toLowerCase() ||
    activity.slug !== activitySlug.toLowerCase()
  ) {
    return { state: "unavailable" };
  }

  const offers = Array.isArray(response.offers)
    ? response.offers
        .map((offer) => adaptOffer(offer))
        .filter((offer): offer is ThingsActivityOfferDetail => offer !== null)
    : [];

  return {
    state: "resolved",
    detail: {
      activity,
      destination: destinationSummary(activity.destinationSlug),
      offers,
    },
  };
}
