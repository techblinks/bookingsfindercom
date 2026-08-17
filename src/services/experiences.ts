/**
 * BookingsFinder experience service — multi-provider aggregator.
 * Calls the public, no-auth tiqets-public and viator-public Edge Functions
 * directly. Never calls the admin-gated catalogue functions used by
 * src/services/tiqets.ts and src/services/viator.ts for /admin/* pages —
 * those require an authenticated admin session.
 * Viator availability (VIATOR_PUBLIC_ENABLED) is decided server-side.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  ExperienceProduct,
  ExperienceSearchFilters,
  ExperienceSearchResult,
  ProviderAvailability,
} from "@/types/experiences";
// Viator enablement is server-side only — no frontend constant gates it

const TIQETS_SEARCH_PAGE_SIZE = 24;

// ═══════════════════════════════════════════════════════════════
// Tiqets adapter — maps the tiqets-public NormalizedProduct shape
// to the provider-neutral shape.
//
// Location metadata comes from the normalizer's TOP-LEVEL provider fields
// (city, cityId, country), which is where tiqets-public genuinely publishes
// it. The nested `destination` / `venue` objects remain as a defensive
// fallback only — reading them FIRST was the bug: a Rome product carrying
// city "Rome" / cityId 71631 / country "Italy" at the top level lost that
// metadata whenever the nested shape was absent.
//
// Nothing is manufactured: a missing value stays null, and countryId is never
// promoted into destinationId — a country is not a city.
// ═══════════════════════════════════════════════════════════════

/** Reads a top-level normalized string field; null unless genuinely present. */
function tiqetsText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value : null;
}

function adaptTiqetsPublicProduct(p: Record<string, unknown>): ExperienceProduct {
  const destination = p.destination as { id?: number; name?: string; country?: string } | null | undefined;
  const venue = p.venue as { id?: number; name?: string; city?: string } | null | undefined;
  const rating = p.rating as { average?: number | null; count?: number | null } | null | undefined;
  const minPrice = p.minPrice as { amount?: number | null; currency?: string | null } | null | undefined;
  const image = p.image as { url?: string; altText?: string | null; credit?: string | null } | null | undefined;
  const title = typeof p.title === "string" ? p.title : "";

  return {
    provider: "tiqets",
    providerProductId: typeof p.id === "string" ? p.id : String(p.id ?? ""),
    title,
    description: typeof p.description === "string" ? p.description : null,
    tagline: typeof p.tagline === "string" ? p.tagline : null,
    city: tiqetsText(p.city) ?? destination?.name ?? venue?.city ?? null,
    country: tiqetsText(p.country) ?? destination?.country ?? null,
    destinationId:
      typeof p.cityId === "number" && Number.isFinite(p.cityId)
        ? p.cityId
        : typeof destination?.id === "number"
          ? destination.id
          : null,
    imageUrl: typeof image?.url === "string" && image.url ? image.url : null,
    imageAlt: typeof image?.altText === "string" && image.altText ? image.altText : title || null,
    imageCredit: typeof image?.credit === "string" ? image.credit : null,
    rating: typeof rating?.average === "number" ? rating.average : null,
    reviewCount: typeof rating?.count === "number" ? rating.count : null,
    price: typeof minPrice?.amount === "number" ? minPrice.amount : null,
    currency: typeof minPrice?.currency === "string" ? minPrice.currency : null,
    saleStatus: typeof p.saleStatus === "string" ? p.saleStatus : null,
    features: {
      freeCancellation: null,
      skipLine: typeof p.skipTheLine === "boolean" ? p.skipTheLine : null,
      smartphoneTicket: null,
      instantConfirmation: null,
      wheelchairAccessible: typeof p.wheelchairAccessible === "boolean" ? p.wheelchairAccessible : null,
      likelyToSellOut: null,
    },
    outboundUrl: typeof p.productUrl === "string" ? p.productUrl : null,
    attributionRequired: true,
  };
}

interface TiqetsPublicResult {
  products: ExperienceProduct[];
  /** Genuine upstream total from tiqets-public's pagination.count (search mode only; null in featured mode). */
  totalCount: number | null;
  status: "available" | "unavailable";
}

async function fetchTiqetsPublic(filters: ExperienceSearchFilters): Promise<TiqetsPublicResult> {
  const query = (filters.query || "").trim();
  /**
   * Tiqets city identity, provider-scoped. A verified registry city ID is the
   * strongest identity Tiqets accepts, so when one exists it is the ONLY
   * location parameter sent: city_name is a documented debugging aid and
   * sending free text beside a proven ID would let the weaker signal muddy a
   * scoping BookingsFinder has already proven. Legacy hub searches, which have
   * no verified ID, keep using city_name.
   */
  const cityId = filters.providerDestinationIds?.tiqets;
  const city = cityId === undefined ? (filters.destination || "").trim() : "";
  // No real Tiqets tag IDs are available client-side, so activity chips are
  // sent as free-text search keywords instead of inventing tag_ids.
  const activityKeywords = (filters.activityTags || []).join(" ").trim();
  const effectiveQuery = query || activityKeywords;

  const isSearch = Boolean(effectiveQuery || city || cityId !== undefined);

  try {
    if (!isSearch) {
      const { data, error } = await supabase.functions.invoke("tiqets-public", {
        body: { action: "featured" },
      });
      if (error || !data) return { products: [], totalCount: null, status: "unavailable" };
      const response = data as { products?: Array<Record<string, unknown>> };
      const products = Array.isArray(response.products) ? response.products.map(adaptTiqetsPublicProduct) : [];
      return { products, totalCount: null, status: "available" };
    }

    const { data, error } = await supabase.functions.invoke("tiqets-public", {
      /*
       * Only parameters the repaired PB2A /v2/products contract genuinely
       * forwards upstream. price_min/price_max, skip_line, wheelchair_access
       * and sort are NOT sent: tiqets-public deliberately drops them, so
       * sending them would produce results that silently ignore the request.
       */
      body: {
        action: "search",
        query: effectiveQuery || undefined,
        city_id: cityId,
        city_name: city || undefined,
        page: filters.page || 1,
        page_size: TIQETS_SEARCH_PAGE_SIZE,
        min_rating: filters.minRating || undefined,
      },
    });
    if (error || !data) return { products: [], totalCount: null, status: "unavailable" };
    const response = data as {
      products?: Array<Record<string, unknown>>;
      pagination?: { count?: number } | null;
    };
    const products = Array.isArray(response.products) ? response.products.map(adaptTiqetsPublicProduct) : [];
    const totalCount = typeof response.pagination?.count === "number" ? response.pagination.count : products.length;
    return { products, totalCount, status: "available" };
  } catch {
    return { products: [], totalCount: null, status: "unavailable" };
  }
}

// ═══════════════════════════════════════════════════════════════
// Viator public adapter - real, server-controlled
//
// viator-public is a real deployed Edge Function. VIATOR_PUBLIC_ENABLED is
// the authoritative server-side kill switch: the frontend calls viator-public
// unconditionally and the server answers disabled/enabled. Verified upstream
// access is sandbox-only - production Viator access remains NOT PROVEN, and
// replacing the API key does not by itself make production ready.
// ═══════════════════════════════════════════════════════════════

interface ViatorPublicResult {
  products: ExperienceProduct[];
  status: "available" | "disabled" | "unavailable";
}

/**
 * No sort is sent to Viator.
 *
 * PB2A made Tiqets sort fail-closed (its upstream sort syntax is unproven), so
 * PB2B removed the customer-facing sort control entirely rather than leave a
 * dropdown that changes nothing. With no customer sort vocabulary left to
 * translate, the former `VIATOR_SORT` mapping had nothing to map: Viator
 * applies its own default ordering, which is exactly what an unspecified sort
 * has always meant. viator-public's own sort schema is untouched and still
 * server-owned.
 */
/** Keep only genuine numeric Viator tag IDs; undefined when there are none. */
function viatorTagIds(tags: string[] | undefined): number[] | undefined {
  if (!tags || tags.length === 0) return undefined;
  const ids = tags
    .map((t) => Number(t))
    .filter((n) => Number.isInteger(n) && n > 0);
  return ids.length > 0 ? ids : undefined;
}

/**
 * viator-public enforces pageSize <= 20 (its Zod search schema). The app's
 * global Things PAGE_SIZE is 24 - a Tiqets contract - so forwarding it to
 * Viator would make viator-public reject the whole search with HTTP 400.
 * The page size is therefore bounded here, in the Viator adapter, to the
 * provider contract. Tiqets keeps its own page size; this cap is Viator-local.
 */
const VIATOR_MAX_PAGE_SIZE = 20;

async function fetchViatorPublic(filters: ExperienceSearchFilters): Promise<ViatorPublicResult> {
  try {
    const { data, error } = await supabase.functions.invoke("viator-public", {
      body: {
        action: "search",
        // Provider-scoped by construction: the Viator adapter reads the Viator
        // key and nothing else, so a Tiqets city ID can never arrive here.
        destinationId: filters.providerDestinationIds?.viator,
        // viator-public requires genuine numeric Viator tag IDs. The UI's
        // activity chips are free-text labels, so forwarding them would fail
        // its Zod enum. Until the real tag taxonomy is wired to the chips,
        // nothing is sent rather than something invented.
        activityTags: viatorTagIds(filters.activityTags),
        freeCancellation: filters.freeCancellation,
        pageSize: Math.min(filters.pageSize || 10, VIATOR_MAX_PAGE_SIZE),
      },
    });
    if (error || !data) return { products: [], status: "unavailable" };
    const response = data as { products?: Array<Record<string, unknown>>; status?: string };
    if (response.status === "disabled") return { products: [], status: "disabled" };
    if (!response.products) return { products: [], status: "unavailable" };
    return { products: response.products.map((p) => adaptViatorToExperience(p)), status: "available" };
  } catch {
    return { products: [], status: "unavailable" };
  }
}

function adaptViatorToExperience(p: Record<string, unknown>): ExperienceProduct {
  return {
    provider: "viator",
    providerProductId: String(p.providerProductId ?? ""),
    title: String(p.title ?? ""),
    description: typeof p.description === "string" ? p.description : null,
    tagline: null,
    city: typeof p.city === "string" ? p.city : null,
    country: null,
    destinationId: typeof p.destinationId === "number" ? p.destinationId : null,
    imageUrl: typeof p.imageUrl === "string" ? p.imageUrl : null,
    imageAlt: typeof p.imageAlt === "string" ? p.imageAlt : null,
    imageCredit: typeof p.imageCredit === "string" ? p.imageCredit : null,
    rating: typeof p.rating === "number" ? p.rating : null,
    reviewCount: typeof p.reviewCount === "number" ? p.reviewCount : null,
    price: typeof p.price === "number" ? p.price : null,
    currency: typeof p.currency === "string" ? p.currency : null,
    saleStatus: null,
    features: {
      freeCancellation: typeof p.freeCancellation === "boolean" ? p.freeCancellation : null,
      skipLine: null,
      smartphoneTicket: null,
      instantConfirmation: null,
      wheelchairAccessible: null,
      likelyToSellOut: typeof p.likelyToSellOut === "boolean" ? p.likelyToSellOut : null,
    },
    outboundUrl: typeof p.outboundUrl === "string" ? p.outboundUrl : null,
    attributionRequired: true,
  };
}

// ═══════════════════════════════════════════════════════════════
// Aggregated public search
// ═══════════════════════════════════════════════════════════════

export async function searchExperiences(
  filters: ExperienceSearchFilters
): Promise<ExperienceSearchResult> {
  const [tiqetsResult, viatorResult] = await Promise.all([
    fetchTiqetsPublic(filters),
    fetchViatorPublic(filters),
  ]);

  const providerStatus: ProviderAvailability = {
    tiqets: tiqetsResult.status,
    viator: viatorResult.status,
  };

  // Stable ordering: Tiqets first, then Viator
  const allProducts: ExperienceProduct[] = [...tiqetsResult.products, ...viatorResult.products];

  // tiqetsResult.totalCount is only null in "featured" mode (no genuine
  // upstream total to report) — fall back to the actual product count
  // returned rather than fabricating a larger number.
  const totalCount = (tiqetsResult.totalCount ?? tiqetsResult.products.length) + viatorResult.products.length;

  return {
    products: allProducts,
    totalCount,
    page: filters.page || 1,
    providers: providerStatus,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchProviderAvailability(): Promise<ProviderAvailability> {
  let viator: ProviderAvailability["viator"] = "disabled";
  try {
    const { data, error } = await supabase.functions.invoke("viator-public", {
      body: { action: "status" },
    });
    if (!error && data) {
      const response = data as { status?: string };
      viator = response.status === "enabled" ? "available" : "disabled";
    }
  } catch {
    viator = "disabled";
  }
  return { tiqets: "available", viator };
}
