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
// (nested destination/venue/image) to the provider-neutral shape
// ═══════════════════════════════════════════════════════════════

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
    city: destination?.name ?? venue?.city ?? null,
    country: destination?.country ?? null,
    destinationId: typeof destination?.id === "number" ? destination.id : null,
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
  const city = (filters.destination || "").trim();
  // No real Tiqets tag IDs are available client-side, so activity chips are
  // sent as free-text search keywords instead of inventing tag_ids.
  const activityKeywords = (filters.activityTags || []).join(" ").trim();
  const effectiveQuery = query || activityKeywords;

  const isSearch = Boolean(effectiveQuery || city);

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
      body: {
        action: "search",
        query: effectiveQuery || undefined,
        city_name: city || undefined,
        page: filters.page || 1,
        page_size: TIQETS_SEARCH_PAGE_SIZE,
        sort: filters.sort || undefined,
        min_rating: filters.minRating || undefined,
        price_min: filters.minPrice,
        price_max: filters.maxPrice,
        skip_line: filters.skipLine || undefined,
        wheelchair_access: filters.wheelchairAccessible || undefined,
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
// Viator placeholder — mocked until Sandbox key replaced
// ═══════════════════════════════════════════════════════════════

interface ViatorPublicResult {
  products: ExperienceProduct[];
  status: "available" | "disabled" | "unavailable";
}

async function fetchViatorPublic(filters: ExperienceSearchFilters): Promise<ViatorPublicResult> {
  try {
    const { data, error } = await supabase.functions.invoke("viator-public", {
      body: {
        action: "search",
        destinationId: filters.destinationId,
        activityTags: filters.activityTags,
        minPrice: filters.minPrice,
        maxPrice: filters.maxPrice,
        freeCancellation: filters.freeCancellation,
        sort: filters.sort,
        pageSize: filters.pageSize || 10,
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
