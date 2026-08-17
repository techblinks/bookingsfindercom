import DestinationAutocomplete from "@/components/search/DestinationAutocomplete";
import type { ExperienceDestination } from "@/types/experiences";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import {
  resolveThingsDestinationFromLegacyCity,
  thingsDestinationPath,
  thingsDestinationTiqetsId,
  thingsDestinationViatorId,
} from "@/lib/thingsDestinations";
import type { ThingsDestination } from "@/types/thingsDestination";
import {
  Search,
  Star,
  MapPin,
  Info,
  ListFilter,
  X,
  Check,
  Building2,
  Plane,
  Hotel,
  Calculator,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import ThingsPagination from "@/components/things/ThingsPagination";
import ThingsNoImageState from "@/components/things/ThingsNoImageState";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { searchExperiences } from "@/services/experiences";
import { mapProviderProducts, providerScopedKey } from "@/services/thingsActivityMapping";
import { recordActivity } from "@/lib/recentActivity";
import type { ExperienceProduct, ExperienceSearchFilters, ProviderAvailability } from "@/types/experiences";

/* ─────────────────────────── CONSTANTS ─────────────────────────── */

const ACTIVITY_TYPES = [
  { id: "museums", label: "Museums" },
  { id: "theme-parks", label: "Theme parks" },
  { id: "city-tours", label: "City tours" },
  { id: "cruises", label: "Cruises" },
  { id: "landmarks", label: "Landmarks" },
  { id: "zoos-aquariums", label: "Zoos & aquariums" },
  { id: "shows-entertainment", label: "Shows & entertainment" },
];

// Example destinations, not a popularity ranking — we hold no popularity data.
const SEARCH_SHORTCUTS = ["Sydney", "Melbourne", "Paris", "Rome"];

/*
 * Minimum rating is the one product filter the repaired Tiqets contract
 * genuinely forwards upstream (min_rating), so it is the one filter of its kind
 * the page still offers.
 *
 * Deliberately absent (T3B-INT-PB2B):
 *   price range          — tiqets-public does not forward price_min/price_max
 *   skip the line        — tiqets-public does not forward skip_line
 *   wheelchair access    — tiqets-public does not forward wheelchair_access
 *   sort                 — no active provider request carries a sort value
 *
 * Each of those looked like a working control while the request quietly
 * ignored it. Local post-filtering was never an option: it would have made the
 * provider's totals and pagination untrue. Products may still REPORT skip-line
 * and accessibility as facts on the card — a reported fact is not a searchable
 * filter, and PB2B keeps that distinction.
 */
const RATING_OPTIONS = [
  { id: "any", label: "Any rating" },
  { id: "3", label: "3+" },
  { id: "4", label: "4+" },
];

const PAGE_SIZE = 24;

/* ─────────────────────────── HELPERS ─────────────────────────── */

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-things-brand-soft border border-things-border rounded-full text-xs font-medium text-things-text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-things-border rounded-full p-0.5 things-focus-ring"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-things-surface-card rounded-xl border border-things-border overflow-hidden">
      <Skeleton className="aspect-[16/10] w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
    </div>
  );
}

function formatPrice(price: number | null, currency: string | null): string | null {
  if (price === null || Number.isNaN(price)) return null;
  try {
    return new Intl.NumberFormat("en-AU", {
      style: "currency",
      currency: currency || "AUD",
      maximumFractionDigits: Number.isInteger(price) ? 0 : 2,
    }).format(price);
  } catch {
    return currency ? `${currency} ${price}` : `${price}`;
  }
}

/**
 * Did any provider actually answer?
 *
 * The customer-visible distinction this page must never get wrong:
 *
 *   "available"   the provider responded healthily — an empty list from it is a
 *                 GENUINE zero-result, and saying "no matches" is truthful.
 *   "unavailable" the provider errored, timed out, or its function is missing.
 *   "disabled"    the provider is deliberately switched off. Not a fault, but it
 *                 contributes nothing, so it cannot make a search "healthy".
 *
 * Only when NOTHING answered may we claim inventory is unavailable — and only
 * when SOMETHING answered may we tell the traveller to change their filters.
 * The previous logic keyed solely off `providers.tiqets === "unavailable"`, so
 * a provider returning HTTP 200 with an empty catalogue was reported to the
 * customer as their own filters' fault.
 */
function anyProviderAnswered(providers: ProviderAvailability): boolean {
  return Object.values(providers).some((status) => status === "available");
}

function providerLabel(provider: ExperienceProduct["provider"]): string {
  return provider === "viator" ? "Viator" : "Tiqets";
}

/* ─────────────────────────── HERO DECORATION ──────────────────── */

function HeroDecoration() {
  return (
    <svg
      className="absolute inset-0 w-full h-full opacity-[0.06] pointer-events-none"
      viewBox="0 0 1200 300"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M0 150 Q 200 120, 400 140 T 800 160 T 1200 145" stroke="white" strokeWidth="2" fill="none" />
      <path d="M0 190 Q 250 210, 500 195 T 1000 205 T 1200 190" stroke="white" strokeWidth="1.5" fill="none" />
      <circle cx="200" cy="150" r="4" fill="white" />
      <circle cx="600" cy="140" r="3" fill="white" />
      <circle cx="900" cy="160" r="4" fill="white" />
    </svg>
  );
}

/* ─────────────────────────── EXPERIENCE CARD ───────────────────── */

function ExperienceCard({
  product,
  canonicalPath,
}: {
  product: ExperienceProduct;
  /**
   * Exact canonical BookingsFinder activity path, present ONLY when the
   * server-backed mapping API returned and validated a mapping for this
   * product identity. The frontend never manufactures one.
   */
  canonicalPath?: string | null;
}) {
  const price = formatPrice(product.price, product.currency);
  const locationLabel = [product.city, product.country].filter(Boolean).join(", ");
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <div
      role="article"
      className="group bg-things-surface-card rounded-xl border border-things-border overflow-hidden shadow-card hover:shadow-elevated transition-shadow flex flex-col"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-things-surface-subtle">
        {product.imageUrl && !imageFailed ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt || product.title || "Experience photo"}
            onError={() => setImageFailed(true)}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <ThingsNoImageState icon="map-pin" label={product.title} />
        )}
        <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end max-w-[80%]">
          {product.features.skipLine === true && (
            <span className="bg-white/90 text-things-text-primary text-[10px] px-2 py-0.5 rounded-full font-medium">
              Skip the line
            </span>
          )}
          {product.features.freeCancellation === true && (
            <span className="bg-white/90 text-things-text-primary text-[10px] px-2 py-0.5 rounded-full font-medium">
              Free cancellation
            </span>
          )}
          {product.features.instantConfirmation === true && (
            <span className="bg-white/90 text-things-text-primary text-[10px] px-2 py-0.5 rounded-full font-medium">
              Instant confirmation
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        {locationLabel && (
          <div className="flex items-center gap-1 text-xs text-things-text-secondary mb-1">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            {locationLabel}
          </div>
        )}
        <h3 className="font-semibold text-things-text-primary mb-2 line-clamp-2 text-sm leading-snug">
          {product.title || "Experience"}
        </h3>
        {(product.rating !== null || product.reviewCount !== null) && (
          <div className="flex items-center gap-1.5 mb-2">
            {product.rating !== null && (
              <span className="flex items-center text-xs font-semibold text-things-text-primary">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 mr-0.5" aria-hidden="true" />
                {product.rating.toFixed(1)}
              </span>
            )}
            {product.reviewCount !== null && (
              <span className="text-xs text-things-text-secondary">({product.reviewCount.toLocaleString()} reviews)</span>
            )}
          </div>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {price ? (
              <span className="text-base font-bold text-things-text-primary">From {price}</span>
            ) : (
              <span className="text-xs text-things-text-secondary">Price on request</span>
            )}
            <p className="text-xs text-things-text-secondary mt-0.5">Provided by {providerLabel(product.provider)}</p>
          </div>
          {canonicalPath ? (
            /*
             * Mapped card - internal BookingsFinder navigation ONLY. This is
             * not an affiliate click: same-tab React Router link, no
             * target="_blank", no sponsored rel, no ExternalLink icon. The
             * path came from the validated mapping API - never guessed.
             */
            <Link
              to={canonicalPath}
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-things-surface-card px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/5 things-focus-ring shrink-0"
            >
              View details
            </Link>
          ) : product.outboundUrl ? (
            <a
              href={product.outboundUrl}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="inline-flex items-center gap-1 rounded-lg border border-primary/30 bg-things-surface-card px-3.5 py-2 text-xs font-semibold text-primary transition-colors hover:border-primary/60 hover:bg-primary/5 things-focus-ring shrink-0"
            >
              View experience
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── MAIN COMPONENT ───────────────────── */

interface ThingsToDoProps {
  /**
   * Canonical BookingsFinder Things destination when this page renders from
   * /things-to-do/:destinationSlug. Absent on the hub (/things-to-do).
   */
  destination?: ThingsDestination;
}

export default function ThingsToDo({ destination: destinationProp }: ThingsToDoProps = {}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  /* --- hero search draft (uncommitted text inputs) --- */
  // cityInput is the single hero-city draft: the autocomplete controls it and
  // commitSearch reads it. A separate draft would let the typed city and the
  // committed city drift apart, which is exactly what used to happen.
  // On the destination route the canonical display name seeds the draft; the
  // hub keeps hydrating from ?city= exactly as before.
  const [cityInput, setCityInput] = useState(destinationProp?.displayName ?? searchParams.get("city") ?? "");
  const [activityInput, setActivityInput] = useState(searchParams.get("q") || "");

  /* --- committed filter state (drives fetch + URL) --- */
  const [destination, setDestination] = useState(destinationProp?.displayName ?? searchParams.get("city") ?? "");
  const [queryText, setQueryText] = useState(searchParams.get("q") || "");
  const [selectedActivity, setSelectedActivity] = useState(searchParams.get("activity") || "");
  const [selectedRating, setSelectedRating] = useState(searchParams.get("rating") || "any");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  /* --- data state --- */
  const [products, setProducts] = useState<ExperienceProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  /**
   * Canonical activity paths keyed by provider-scoped identity
   * (`tiqets:1111450`). Belongs ONLY to the current visible result set: it is
   * reset at the start of every search and repopulated from one validated
   * mapping batch, so a stale path can never survive into a different
   * destination/query/filter/page/retry.
   */
  const [canonicalMappings, setCanonicalMappings] = useState<ReadonlyMap<string, string>>(new Map());
  const [providersAvailable, setProvidersAvailable] = useState({ tiqets: true, viator: true });
  const [loading, setLoading] = useState(true);
  const [inventoryUnavailable, setInventoryUnavailable] = useState(false);

  /* --- UI state --- */
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);
  const [retryNonce, setRetryNonce] = useState(0);

  /* --- mobile draft (for sheet) --- */
  const [mobileDraft, setMobileDraft] = useState({
    selectedActivity: "",
    selectedRating: "any",
  });

  /* detect mobile */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  /* --- canonical route URL hygiene --- */
  // A canonical destination route owns its identity via the path. A
  // conflicting legacy ?city= param must not alter identity or search, and is
  // stripped from the URL so it cannot claim a different destination.
  useEffect(() => {
    if (destinationProp && searchParams.get("city")) {
      const params = new URLSearchParams(searchParams);
      params.delete("city");
      setSearchParams(params, { replace: true });
    }
  }, [destinationProp, searchParams, setSearchParams]);

  const hasSearchContext = Boolean(destination.trim() || queryText.trim() || selectedActivity);

  /* --- provider destination identity (route-driven, registry-owned) --- */
  /*
   * Both provider identities exist ONLY when this page is a canonical
   * destination route AND the committed destination text still matches that
   * route identity. Each ID is read from its own provider namespace in the
   * registry — Rome is Tiqets 71631 AND Viator 511, and neither is derived
   * from the slug, the display name or the other provider's ref.
   *
   * A city the traveller types or selects cannot inherit the route's provider
   * IDs: committing "Paris" from /things-to-do/rome leaves the canonical route
   * entirely, and the resulting legacy hub search carries no provider ID at
   * all. That is why the committed text is compared here rather than trusting
   * the route prop alone.
   */
  const providerDestinationIds = useMemo(() => {
    if (!destinationProp) return undefined;
    const committed = destination.trim().toLocaleLowerCase();
    const canonical = destinationProp.displayName.trim().toLocaleLowerCase();
    if (!committed || committed !== canonical) return undefined;
    const tiqets = thingsDestinationTiqetsId(destinationProp);
    const viator = thingsDestinationViatorId(destinationProp);
    if (tiqets === undefined && viator === undefined) return undefined;
    return { tiqets, viator };
  }, [destinationProp, destination]);

  /* --- fetch filters --- */
  const filters: ExperienceSearchFilters = useMemo(() => {
    const activityLabel = ACTIVITY_TYPES.find((a) => a.id === selectedActivity)?.label;
    return {
      destination: destination.trim() || undefined,
      providerDestinationIds,
      query: queryText.trim() || undefined,
      activityTags: activityLabel ? [activityLabel] : undefined,
      minRating: selectedRating !== "any" ? Number(selectedRating) : undefined,
      page,
      pageSize: PAGE_SIZE,
    };
  }, [destination, providerDestinationIds, queryText, selectedActivity, selectedRating, page]);

  /* --- fetch on filter change --- */
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setInventoryUnavailable(false);
    // Canonical mappings belong only to the current visible result set: reset
    // before every search so no old path can survive into a different
    // destination/query/filter/sort/page/retry.
    setCanonicalMappings(new Map());

    searchExperiences(filters)
      .then(async (result) => {
        if (requestIdRef.current !== requestId) return; // stale search response - ignore

        // ONE canonical mapping batch for the visible products, only when
        // there is something to map. Mapping failure (including a rejected
        // call) is enhancement-only: it must never erase the genuine provider
        // inventory, hide results or break outbound links.
        let mappingsByKey = new Map<string, string>();
        if (result.products.length > 0) {
          try {
            const mappingResult = await mapProviderProducts(
              result.products.map((p) => ({
                provider: p.provider,
                providerProductId: p.providerProductId,
              })),
            );
            if (requestIdRef.current === requestId && mappingResult?.status === "available") {
              mappingsByKey = new Map(
                mappingResult.mappings.map((m) => [
                  providerScopedKey(m.provider, m.providerProductId),
                  m.canonicalPath,
                ]),
              );
            }
          } catch {
            // Mapping infrastructure failure - keep the provider inventory.
          }
        }

        if (requestIdRef.current !== requestId) return; // stale mapping response - ignore
        setProducts(result.products);
        setTotalCount(result.totalCount);
        setCanonicalMappings(mappingsByKey);
        setProvidersAvailable({
          tiqets: result.providers.tiqets !== "unavailable",
          viator: result.providers.viator !== "unavailable",
        });
        setInventoryUnavailable(!anyProviderAnswered(result.providers));
        setLoading(false);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setProducts([]);
        setTotalCount(0);
        setCanonicalMappings(new Map());
        setInventoryUnavailable(true);
        setLoading(false);
      });
  }, [filters, retryNonce]);

  /*
   * Genuine retry. The previous control called setPage(p => p), which sets the
   * same value — React bails out, the effect never re-runs and nothing is
   * refetched. A nonce in the dependency list actually repeats the request.
   */
  const retrySearch = useCallback(() => setRetryNonce((n) => n + 1), []);

  /* --- URL parameter serialisation (shared by syncUrl and canonical commits) --- */
  const buildSearchParams = useCallback(
    (overrides?: Record<string, string | number | boolean | undefined>): URLSearchParams => {
      /*
       * Only filters the page can genuinely apply are serialized. The removed
       * controls' params (minPrice, maxPrice, accessible, skipLine, sort) are
       * neither read nor written any more, so a shared or bookmarked URL can
       * no longer promise a filter the provider request ignores.
       */
      const merged = {
        q: queryText,
        activity: selectedActivity,
        rating: selectedRating,
        page,
        ...overrides,
      };

      const params = new URLSearchParams();
      if (merged.q) params.set("q", String(merged.q));
      if (merged.activity) params.set("activity", String(merged.activity));
      if (merged.rating && merged.rating !== "any") params.set("rating", String(merged.rating));
      if (merged.page && Number(merged.page) > 1) params.set("page", String(merged.page));
      return params;
    },
    [queryText, selectedActivity, selectedRating, page]
  );

  /* --- sync URL <-> state --- */
  const syncUrl = useCallback(
    (overrides?: Record<string, string | number | boolean | undefined>) => {
      const params = buildSearchParams(overrides);
      // On a canonical destination route the destination identity comes from
      // the path - never redundantly write ?city= beside the canonical slug.
      const city = overrides?.city ?? destination;
      if (city && !destinationProp) params.set("city", String(city));

      setSearchParams(params, { replace: true });
    },
    [buildSearchParams, destination, destinationProp, setSearchParams]
  );

  /* --- handlers --- */
  const commitSearch = useCallback(
    (overrides?: { city?: string; query?: string }) => {
      const nextCity = overrides?.city ?? cityInput;
      const nextQuery = overrides?.query ?? activityInput;
      const canonicalDestination = resolveThingsDestinationFromLegacyCity(nextCity);

      /*
       * Registry-driven T2B routing contract (this replaces the temporary
       * pre-T2B integrity escape hatch). A committed city that resolves to a
       * canonical BookingsFinder destination is expressed as a canonical path:
       *
       *   hub  Rome        → /things-to-do/rome
       *   hub  Paris       → /things-to-do?city=Paris   (no registry entry)
       *   rome Rome        → /things-to-do/rome         (same identity)
       *   rome Paris       → /things-to-do?city=Paris   (leaves the route)
       *
       * Future registry entries resolve through the same code — this is
       * registry-driven, not Rome-hardcoded.
       */
      if (canonicalDestination) {
        if (destinationProp && destinationProp.slug === canonicalDestination.slug) {
          // Same canonical identity: stay on the route and update the filters.
          setDestination(canonicalDestination.displayName);
          setQueryText(nextQuery);
          setPage(1);
          syncUrl({ city: canonicalDestination.displayName, q: nextQuery, page: 1 });
        } else {
          // A canonical destination (from the hub, or from a different route):
          // navigate to its canonical path, preserving every active filter.
          setDestination(canonicalDestination.displayName);
          setQueryText(nextQuery);
          setPage(1);
          const params = buildSearchParams({ q: nextQuery, page: 1 });
          const search = params.toString();
          navigate(`${thingsDestinationPath(canonicalDestination)}${search ? `?${search}` : ""}`);
        }

        if (nextCity.trim()) {
          recordActivity({ kind: "things", city: nextCity, query: nextQuery || undefined });
        }
        window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
        return;
      }

      // Non-canonical city — the legacy hub query contract.
      if (destinationProp) {
        // Committing a DIFFERENT, non-canonical city from a canonical route
        // must leave the route: /things-to-do/rome can never represent a Paris
        // search. Continue on the legacy hub search URL.
        if (nextCity.trim()) {
          recordActivity({ kind: "things", city: nextCity, query: nextQuery || undefined });
        }
        const params = new URLSearchParams();
        if (nextCity.trim()) params.set("city", nextCity.trim());
        if (nextQuery.trim()) params.set("q", nextQuery.trim());
        const search = params.toString();
        navigate(`/things-to-do${search ? `?${search}` : ""}`);
        return;
      }

      setDestination(nextCity);
      setQueryText(nextQuery);
      setPage(1);
      syncUrl({ city: nextCity, q: nextQuery, page: 1 });

      /*
       * Recent activity — this callback is the only committed-search boundary
       * on the page, so filters, sorting, pagination and URL hydration never
       * reach it. A query with no city is not a place we could return the user
       * to, so it is not recorded. Canonicalisation and truncation belong to
       * the model.
       */
      if (nextCity.trim()) {
        recordActivity({ kind: "things", city: nextCity, query: nextQuery || undefined });
      }

      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    },
    [cityInput, activityInput, buildSearchParams, syncUrl, destinationProp, navigate]
  );

  const handleShortcutClick = useCallback(
    (city: string) => {
      setCityInput(city);
      commitSearch({ city });
    },
    [commitSearch]
  );

  const handleActivityToggle = useCallback(
    (id: string) => {
      const next = selectedActivity === id ? "" : id;
      setSelectedActivity(next);
      setPage(1);
      syncUrl({ activity: next, page: 1 });
    },
    [selectedActivity, syncUrl]
  );

  const handleRatingChange = useCallback(
    (v: string) => {
      setSelectedRating(v);
      setPage(1);
      syncUrl({ rating: v, page: 1 });
    },
    [syncUrl]
  );

  const goToPage = useCallback(
    (p: number) => {
      setPage(p);
      syncUrl({ page: p });
      resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [syncUrl]
  );

  const clearAllFilters = useCallback(() => {
    setSelectedActivity("");
    setSelectedRating("any");
    setPage(1);
    syncUrl({ activity: "", rating: "any", page: 1 });
  }, [syncUrl]);

  /* --- mobile sheet --- */
  const openMobileSheet = useCallback(() => {
    setMobileDraft({ selectedActivity, selectedRating });
    setMobileSheetOpen(true);
  }, [selectedActivity, selectedRating]);

  const applyMobileFilters = useCallback(() => {
    setSelectedActivity(mobileDraft.selectedActivity);
    setSelectedRating(mobileDraft.selectedRating);
    setPage(1);
    syncUrl({
      activity: mobileDraft.selectedActivity,
      rating: mobileDraft.selectedRating,
      page: 1,
    });
    setMobileSheetOpen(false);
  }, [mobileDraft, syncUrl]);

  /* --- labels --- */
  const getActivityLabel = (id: string) => ACTIVITY_TYPES.find((a) => a.id === id)?.label || id;

  const hasActiveFilters = Boolean(selectedActivity) || selectedRating !== "any";

  const activeFilterCount = [selectedActivity, selectedRating !== "any"].filter(Boolean).length;

  /* --- other destinations, derived from currently loaded products --- */
  const destinationsFromResults = useMemo(() => {
    const map = new Map<string, { name: string; country: string | null }>();
    for (const p of products) {
      if (p.city && !map.has(p.city)) {
        map.set(p.city, { name: p.city, country: p.country });
      }
    }
    return Array.from(map.values()).slice(0, 8);
  }, [products]);

  /* --- pagination --- */
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /* --- results heading --- */
  const resultsHeading = destination.trim()
    ? `Things to do in ${destination.trim()}`
    : queryText.trim() || selectedActivity
      ? "Explore experiences"
      : "Experiences to explore";

  /* --- structured data --- */
  const structuredData =
    products.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "ItemList",
          itemListElement: products.slice(0, 10).map((p, i) => ({
            "@type": "ListItem",
            position: i + 1,
            item: {
              "@type": "TouristAttraction",
              name: p.title || "",
              description: p.description || "",
              address: {
                "@type": "PostalAddress",
                addressLocality: p.city || "",
                addressCountry: p.country || "",
              },
            },
          })),
        }
      : null;

  return (
    <>
      <Header />

      <Helmet>
        {destinationProp ? (
          <>
            <title>Things to do in {destinationProp.displayName} | BookingsFinder</title>
            <meta
              name="description"
              content={`Find things to do, tours, attractions and experiences in ${destinationProp.displayName}${destinationProp.countryName ? `, ${destinationProp.countryName}` : ""}. Compare experience details from our partners and continue to book when you're ready.`}
            />
            {/* Non-www is the site's canonical host; the route owns the path. */}
            <link rel="canonical" href={`https://bookingsfinder.com/things-to-do/${destinationProp.slug}`} />
            {/* Draft destinations are never indexable or sitemap-published. */}
            {destinationProp.publicationStatus !== "published" && (
              <meta name="robots" content="noindex,follow" />
            )}
            <script type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: `Things to do in ${destinationProp.displayName} | BookingsFinder`,
                description: `Discover attractions, museums, tours and experiences in ${destinationProp.displayName}${destinationProp.countryName ? `, ${destinationProp.countryName}` : ""}.`,
                url: `https://bookingsfinder.com/things-to-do/${destinationProp.slug}`,
              })}
            </script>
          </>
        ) : (
          <>
            <title>Things To Do | BookingsFinder.com</title>
            <meta
              name="description"
              content="Find things to do, tours, attractions and experiences. Compare experience details from our partners and continue to book when you're ready."
            />
            {/* Non-www is the site's canonical host (index.html, robots.txt sitemap
                URL and the sitemap function all use it). This was the only www
                canonical in the codebase and disagreed with its own JSON-LD url. */}
            <link rel="canonical" href="https://bookingsfinder.com/things-to-do" />
            <script type="application/ld+json">
              {JSON.stringify({
                "@context": "https://schema.org",
                "@type": "WebPage",
                name: "Things to Do | BookingsFinder",
                description: "Discover attractions, museums, tours and experiences wherever you're going.",
                url: "https://bookingsfinder.com/things-to-do",
              })}
            </script>
          </>
        )}
        {structuredData && <script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
      </Helmet>

      {/* ─── COMPACT HERO ─── */}
      <section className="relative bg-things-surface-anchor overflow-hidden">
        <HeroDecoration />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-10">
          <p className="text-white/70 text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">DISCOVER MORE</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 sm:mb-2 tracking-tight leading-tight">
            Find things to do
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-xl mb-1.5 sm:mb-5">
            Discover attractions, tours and experiences wherever you're going.
          </p>

          <div className="bg-things-surface-card rounded-2xl shadow-lg p-2.5 sm:p-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1">
              <label htmlFor="ttd-city" className="text-xs font-semibold text-things-text-secondary mb-0.5 sm:mb-1 block">
                Where are you going?
              </label>
              <DestinationAutocomplete
                value={cityInput}
                onChange={setCityInput}
                onSelect={(dest: ExperienceDestination) => { setCityInput(dest.name); }}
                placeholder="Search a city or destination"
                className="w-full"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="ttd-activity" className="text-xs font-semibold text-things-text-secondary mb-0.5 sm:mb-1 block">
                What do you want to do?
              </label>
              <input
                id="ttd-activity"
                placeholder="Museums, tours, landmarks..."
                value={activityInput}
                onChange={(e) => setActivityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSearch()}
                className="w-full px-4 py-3 rounded-xl border border-things-border focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => commitSearch()}
              className="bg-things-action hover:bg-things-action-hover active:bg-things-action-strong text-white rounded-xl px-6 py-3 font-semibold flex items-center justify-center gap-2 shrink-0 transition-colors things-focus-ring-action"
            >
              <Search className="w-4 h-4" aria-hidden="true" /> Search
            </button>
          </div>

          <div className="mt-1.5 sm:mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/70 font-medium">Try:</span>
            {SEARCH_SHORTCUTS.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleShortcutClick(city)}
                className="text-white/90 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors things-focus-ring-on-dark"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST STRIP (provider-neutral) ─── */}
      <section className="bg-things-surface-page border-b border-things-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-things-text-secondary font-medium">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Experience details from our partners
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-primary" aria-hidden="true" /> Payment and tickets handled by the
            provider
          </span>
        </div>
      </section>

      {/* ─── CATEGORY CHIPS ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-things-brand-soft">
        <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 -mx-1 px-1" role="group" aria-label="Activity categories">
          {ACTIVITY_TYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={selectedActivity === a.id}
              onClick={() => handleActivityToggle(a.id)}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-medium border transition-colors things-focus-ring ${
                selectedActivity === a.id
                  ? "bg-primary border-primary text-white"
                  : "bg-things-surface-card border-things-border text-things-text-primary hover:border-primary"
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── RESULTS ─── */}
      <section ref={resultsRef} className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-bold text-things-text-primary">{resultsHeading}</h2>
          {hasSearchContext && !loading && totalCount > 0 && (
            <p className="text-sm text-things-text-secondary mt-1">
              {totalCount.toLocaleString()} {totalCount === 1 ? "experience" : "experiences"}
            </p>
          )}
        </div>

        {/* Desktop filter toolbar */}
        {!isMobile && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Select value={selectedActivity} onValueChange={handleActivityToggle}>
              <SelectTrigger className="w-auto min-w-[130px] h-9 text-sm" aria-label="Activity filter">
                <SelectValue placeholder="Activity" />
              </SelectTrigger>
              <SelectContent>
                {ACTIVITY_TYPES.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedRating} onValueChange={handleRatingChange}>
              <SelectTrigger className="w-auto min-w-[120px] h-9 text-sm" aria-label="Rating filter">
                <SelectValue placeholder="Rating" />
              </SelectTrigger>
              <SelectContent>
                {RATING_OPTIONS.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

          </div>
        )}

        {/* Mobile Filters row */}
        {isMobile && (
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" onClick={openMobileSheet} className="flex-1">
              <ListFilter className="w-4 h-4 mr-2" aria-hidden="true" /> Filters
              {hasActiveFilters && (
                <Badge className="ml-2 bg-things-action text-white text-[10px] h-5 px-1.5">{activeFilterCount}</Badge>
              )}
            </Button>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {selectedActivity && <Chip label={getActivityLabel(selectedActivity)} onRemove={() => handleActivityToggle(selectedActivity)} />}
            {selectedRating !== "any" && <Chip label={`Rating ${selectedRating}+`} onRemove={() => handleRatingChange("any")} />}
            <button type="button" onClick={clearAllFilters} className="text-xs text-primary hover:underline ml-1 things-focus-ring">
              Clear all
            </button>
          </div>
        )}

        {/* Results grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : inventoryUnavailable ? (
          /*
            * Nothing answered. This is our problem, not the traveller's, so it
            * must never suggest they change their filters or spelling. No
            * provider or infrastructure detail is exposed.
            */
          <div
            role="status"
            className="text-center py-14 border border-dashed border-things-border rounded-2xl"
          >
            <Info className="w-10 h-10 text-things-info mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold text-things-text-primary mb-1">
              Experiences are temporarily unavailable
            </h3>
            <p className="text-sm text-things-text-secondary mb-4">
              We're having trouble loading activities right now. This is on our side — please try again shortly.
            </p>
            <Button
              onClick={retrySearch}
              className="bg-things-action hover:bg-things-action-hover active:bg-things-action-strong text-white things-focus-ring-action"
            >
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          /* A provider answered healthily and genuinely had nothing to match. */
          <div
            role="status"
            className="text-center py-14 border border-dashed border-things-border rounded-2xl"
          >
            <Info className="w-10 h-10 text-things-info mx-auto mb-3" aria-hidden="true" />
            {hasSearchContext ? (
              <>
                <h3 className="text-base font-semibold text-things-text-primary mb-1">No experiences matched your search</h3>
                <p className="text-sm text-things-text-secondary mb-4">
                  Try a different destination or activity, or remove some filters.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-things-text-secondary">Search a destination to explore tours, attractions and experiences.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((product) => (
                <ExperienceCard
                  key={`${product.provider}-${product.providerProductId}`}
                  product={product}
                  canonicalPath={
                    canonicalMappings.get(providerScopedKey(product.provider, product.providerProductId)) ?? null
                  }
                />
              ))}
            </div>

            {hasSearchContext && totalPages > 1 && (
              <ThingsPagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={goToPage}
                className="mt-8"
              />
            )}
          </>
        )}

        {/* ─── Other destinations seen in these results (compact) ─── */}
        {destinationsFromResults.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg sm:text-xl font-bold text-things-text-primary mb-4">Other destinations in these results</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {destinationsFromResults.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => handleShortcutClick(d.name)}
                  className="group relative rounded-xl overflow-hidden aspect-[3/2] bg-things-brand-soft border border-things-border hover:border-primary transition-colors things-focus-ring"
                >
                  <div className="w-full h-full flex flex-col items-center justify-center p-3">
                    <MapPin className="w-5 h-5 text-primary/40 mb-1.5" aria-hidden="true" />
                    <p className="text-sm font-semibold text-things-text-primary">{d.name}</p>
                    {d.country && <p className="text-xs text-things-text-secondary">{d.country}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── How it works (compact, supporting) ─── */}
        <div className="mt-14 bg-things-surface-page rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-things-text-primary mb-4 text-center">How it works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { step: "1", title: "Search", desc: "Find attractions and experiences for your destination." },
              { step: "2", title: "Compare", desc: "Compare prices, ratings and useful experience details." },
              {
                step: "3",
                title: "Continue to book",
                desc: "Check current availability and complete your booking with the provider.",
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center mx-auto mb-2 font-bold text-xs">
                  {item.step}
                </div>
                <h3 className="font-semibold text-things-text-primary mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-things-text-secondary">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Plan your entire trip (restrained) ─── */}
        <div className="mt-8 bg-things-surface-card border border-things-border rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-primary" aria-hidden="true" />
            <h2 className="text-base font-bold text-things-text-primary">Plan your entire trip</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/flights"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-things-border hover:border-primary hover:bg-things-brand-soft transition-colors text-center things-focus-ring"
            >
              <Plane className="w-5 h-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-things-text-primary">Flights</span>
              <span className="text-xs text-things-text-secondary">Compare flight deals</span>
            </Link>
            <Link
              to="/"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-things-border hover:border-primary hover:bg-things-brand-soft transition-colors text-center things-focus-ring"
            >
              <Hotel className="w-5 h-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-things-text-primary">Stays</span>
              <span className="text-xs text-things-text-secondary">Find accommodation</span>
            </Link>
            <Link
              to="/trip-cost"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-things-border hover:border-primary hover:bg-things-brand-soft transition-colors text-center things-focus-ring"
            >
              <Calculator className="w-5 h-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-things-text-primary">Trip Cost</span>
              <span className="text-xs text-things-text-secondary">Estimate your budget</span>
            </Link>
            <Link
              to="/optimizer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-things-border hover:border-primary hover:bg-things-brand-soft transition-colors text-center things-focus-ring"
            >
              <Sparkles className="w-5 h-5 text-primary" aria-hidden="true" />
              <span className="text-sm font-semibold text-things-text-primary">Optimizer</span>
              {/* The optimizer analyses one route — it does not order an itinerary. */}
              <span className="text-xs text-things-text-secondary">Cost, timing and layovers</span>
            </Link>
          </div>
        </div>

        {/* ─── Affiliate disclosure (provider-neutral) ─── */}
        <div className="mt-8 text-center">
          <p className="text-xs text-things-text-muted max-w-2xl mx-auto leading-relaxed">
            Experience information is provided by our partners. BookingsFinder may earn a commission when you
            continue through an affiliate link, at no additional cost to you. Final prices, availability and
            booking terms are confirmed by the provider.
          </p>
        </div>
      </section>

      {/* ─── MOBILE FILTER SHEET ─── */}
      {isMobile && mobileSheetOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setMobileSheetOpen(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-things-surface-card rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-things-text-primary">Filters</h3>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="p-1 hover:bg-things-surface-page rounded-full things-focus-ring"
                aria-label="Close filters"
              >
                <X className="w-5 h-5 text-things-text-secondary" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-things-text-secondary mb-1.5 block">Activity</label>
                <Select
                  value={mobileDraft.selectedActivity}
                  onValueChange={(v) => setMobileDraft({ ...mobileDraft, selectedActivity: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any activity" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-things-text-secondary mb-1.5 block">Minimum rating</label>
                <Select
                  value={mobileDraft.selectedRating}
                  onValueChange={(v) => setMobileDraft({ ...mobileDraft, selectedRating: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any rating" />
                  </SelectTrigger>
                  <SelectContent>
                    {RATING_OPTIONS.map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-things-border">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setMobileDraft({ selectedActivity: "", selectedRating: "any" })}
              >
                Clear all
              </Button>
              <Button className="flex-1 bg-things-action hover:bg-things-action-hover active:bg-things-action-strong text-white things-focus-ring-action" onClick={applyMobileFilters}>
                Show results
              </Button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
