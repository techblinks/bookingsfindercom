import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { useSearchParams, Link } from "react-router-dom";
import {
  Search,
  Star,
  MapPin,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Loader2,
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
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Skeleton } from "@/components/ui/skeleton";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { searchExperiences } from "@/services/experiences";
import type { ExperienceProduct, ExperienceSearchFilters } from "@/types/experiences";

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

const POPULAR_SEARCH_SHORTCUTS = ["Sydney", "Melbourne", "Paris", "Rome"];

// Values are AUD cents — tiqets-public's price_min/price_max contract.
const PRICE_RANGES = [
  { id: "under-25", label: "Under A$25", min: 0, max: 2499 },
  { id: "25-50", label: "A$25–A$50", min: 2500, max: 5000 },
  { id: "50-100", label: "A$50–A$100", min: 5000, max: 10000 },
  { id: "100-plus", label: "A$100+", min: 10000, max: 99999999 },
];

const RATING_OPTIONS = [
  { id: "any", label: "Any rating" },
  { id: "3", label: "3+" },
  { id: "4", label: "4+" },
];

const SORT_OPTIONS = [
  { id: "popularity_desc", label: "Recommended" },
  { id: "price_asc", label: "Price: low to high" },
  { id: "title_asc", label: "Title: A–Z" },
];

const FEATURES = [
  { id: "skipLine", label: "Skip the line" },
  { id: "instant", label: "Instant ticket" },
];

const PAGE_SIZE = 24;

/* ─────────────────────────── HELPERS ─────────────────────────── */

function Chip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#EDF4FC] border border-[#D8E0E7] rounded-full text-xs font-medium text-[#0F172A]">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="hover:bg-[#D8E0E7] rounded-full p-0.5"
        aria-label={`Remove ${label} filter`}
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border border-[#D8E0E7] overflow-hidden">
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

const FALLBACK_SVG =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23EDF4FC'%3E%3Crect width='400' height='300'/%3E%3Ctext x='200' y='155' text-anchor='middle' fill='%2301367F' font-size='14' font-family='system-ui,sans-serif'%3EBookingsFinder%3C/text%3E%3C/svg%3E";

function handleImgError(e: React.SyntheticEvent<HTMLImageElement>) {
  e.currentTarget.src = FALLBACK_SVG;
}

function ImageFallbackPanel({ label }: { label?: string | null }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#EDF4FC]">
      <MapPin className="w-6 h-6 text-[#01367F]/30 mb-1" aria-hidden="true" />
      {label ? (
        <p className="text-[11px] font-medium text-[#41536A] px-2 text-center line-clamp-1">{label}</p>
      ) : null}
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

function ExperienceCard({ product }: { product: ExperienceProduct }) {
  const price = formatPrice(product.price, product.currency);
  const locationLabel = [product.city, product.country].filter(Boolean).join(", ");

  return (
    <div
      role="article"
      className="group bg-white rounded-xl border border-[#D8E0E7] overflow-hidden hover:shadow-lg transition-shadow flex flex-col"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-[#EDF4FC]">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.imageAlt || product.title || "Experience photo"}
            onError={handleImgError}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            loading="lazy"
          />
        ) : (
          <ImageFallbackPanel label={product.title} />
        )}
        <div className="absolute top-3 right-3 flex flex-wrap gap-1 justify-end max-w-[80%]">
          {product.features.skipLine === true && (
            <span className="bg-white/90 text-[#0F172A] text-[10px] px-2 py-0.5 rounded-full font-medium">
              Skip the line
            </span>
          )}
          {product.features.freeCancellation === true && (
            <span className="bg-white/90 text-[#0F172A] text-[10px] px-2 py-0.5 rounded-full font-medium">
              Free cancellation
            </span>
          )}
          {product.features.instantConfirmation === true && (
            <span className="bg-white/90 text-[#0F172A] text-[10px] px-2 py-0.5 rounded-full font-medium">
              Instant confirmation
            </span>
          )}
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        {locationLabel && (
          <div className="flex items-center gap-1 text-xs text-[#41536A] mb-1">
            <MapPin className="w-3 h-3" aria-hidden="true" />
            {locationLabel}
          </div>
        )}
        <h3 className="font-semibold text-[#0F172A] mb-2 line-clamp-2 text-sm leading-snug">
          {product.title || "Experience"}
        </h3>
        {(product.rating !== null || product.reviewCount !== null) && (
          <div className="flex items-center gap-1.5 mb-2">
            {product.rating !== null && (
              <span className="flex items-center text-xs font-semibold text-[#0F172A]">
                <Star className="w-3.5 h-3.5 text-yellow-500 fill-yellow-500 mr-0.5" aria-hidden="true" />
                {product.rating.toFixed(1)}
              </span>
            )}
            {product.reviewCount !== null && (
              <span className="text-xs text-[#41536A]">({product.reviewCount.toLocaleString()} reviews)</span>
            )}
          </div>
        )}
        <div className="mt-auto pt-2 flex items-center justify-between gap-2">
          <div className="min-w-0">
            {price ? (
              <span className="text-base font-bold text-[#0F172A]">From {price}</span>
            ) : (
              <span className="text-xs text-[#8BA0B8]">Price on request</span>
            )}
            <p className="text-[11px] text-[#8BA0B8] mt-0.5">Provided by {providerLabel(product.provider)}</p>
          </div>
          {product.outboundUrl ? (
            <a
              href={product.outboundUrl}
              target="_blank"
              rel="sponsored nofollow noopener"
              className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-[#D64A2A] hover:bg-[#B83D22] px-3 py-2 rounded-lg transition-colors shrink-0"
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

export default function ThingsToDo() {
  const [searchParams, setSearchParams] = useSearchParams();

  /* --- hero search draft (uncommitted text inputs) --- */
  const [cityInput, setCityInput] = useState(searchParams.get("city") || "");
  const [activityInput, setActivityInput] = useState(searchParams.get("q") || "");

  /* --- committed filter state (drives fetch + URL) --- */
  const [destination, setDestination] = useState(searchParams.get("city") || "");
  const [queryText, setQueryText] = useState(searchParams.get("q") || "");
  const [selectedActivity, setSelectedActivity] = useState(searchParams.get("activity") || "");
  const [selectedPriceRange, setSelectedPriceRange] = useState(
    searchParams.get("minPrice") && searchParams.get("maxPrice")
      ? PRICE_RANGES.find(
          (p) => p.min === Number(searchParams.get("minPrice")) && p.max === Number(searchParams.get("maxPrice"))
        )?.id || ""
      : ""
  );
  const [selectedRating, setSelectedRating] = useState(searchParams.get("rating") || "any");
  const [wheelchairOnly, setWheelchairOnly] = useState(searchParams.get("accessible") === "1");
  const [skipLineOnly, setSkipLineOnly] = useState(searchParams.get("skipLine") === "1");
  const [instantOnly, setInstantOnly] = useState(searchParams.get("instant") === "1");
  const [sort, setSort] = useState(searchParams.get("sort") || "popularity_desc");
  const [page, setPage] = useState(Number(searchParams.get("page")) || 1);

  /* --- data state --- */
  const [products, setProducts] = useState<ExperienceProduct[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [providersAvailable, setProvidersAvailable] = useState({ tiqets: true, viator: true });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  /* --- UI state --- */
  const [mobileSheetOpen, setMobileSheetOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const resultsRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  /* --- mobile draft (for sheet) --- */
  const [mobileDraft, setMobileDraft] = useState({
    selectedActivity: "",
    selectedPriceRange: "",
    selectedRating: "any",
    wheelchairOnly: false,
    skipLineOnly: false,
    instantOnly: false,
    sort: "popularity_desc",
  });

  /* detect mobile */
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const hasSearchContext = Boolean(destination.trim() || queryText.trim() || selectedActivity);

  /* --- fetch filters --- */
  const filters: ExperienceSearchFilters = useMemo(() => {
    const activityLabel = ACTIVITY_TYPES.find((a) => a.id === selectedActivity)?.label;
    const range = PRICE_RANGES.find((p) => p.id === selectedPriceRange);
    return {
      destination: destination.trim() || undefined,
      query: queryText.trim() || undefined,
      activityTags: activityLabel ? [activityLabel] : undefined,
      minPrice: range?.min,
      maxPrice: range?.max,
      minRating: selectedRating !== "any" ? Number(selectedRating) : undefined,
      skipLine: skipLineOnly || undefined,
      wheelchairAccessible: wheelchairOnly || undefined,
      sort,
      page,
      pageSize: PAGE_SIZE,
    };
  }, [destination, queryText, selectedActivity, selectedPriceRange, selectedRating, skipLineOnly, wheelchairOnly, sort, page]);

  /* --- fetch on filter change --- */
  useEffect(() => {
    const requestId = ++requestIdRef.current;
    setLoading(true);
    setLoadError(false);

    searchExperiences(filters)
      .then((result) => {
        if (requestIdRef.current !== requestId) return; // stale response — ignore
        setProducts(result.products);
        setTotalCount(result.totalCount);
        setProvidersAvailable({
          tiqets: result.providers.tiqets !== "unavailable",
          viator: result.providers.viator !== "unavailable",
        });
        setLoadError(result.products.length === 0 && result.providers.tiqets === "unavailable");
        setLoading(false);
      })
      .catch(() => {
        if (requestIdRef.current !== requestId) return;
        setProducts([]);
        setTotalCount(0);
        setLoadError(true);
        setLoading(false);
      });
    // instantOnly is deliberately not wired to the API yet — no matching filter param;
    // it still participates in the active-filter chip UI so the state model stays shared.
  }, [filters]);

  /* --- sync URL <-> state --- */
  const syncUrl = useCallback(
    (overrides?: Record<string, string | number | boolean | undefined>) => {
      const merged = {
        city: destination,
        q: queryText,
        activity: selectedActivity,
        priceRange: selectedPriceRange,
        rating: selectedRating,
        accessible: wheelchairOnly,
        skipLine: skipLineOnly,
        instant: instantOnly,
        sort,
        page,
        ...overrides,
      };

      const params: Record<string, string> = {};
      if (merged.q) params.q = String(merged.q);
      if (merged.city) params.city = String(merged.city);
      if (merged.activity) params.activity = String(merged.activity);
      const range = PRICE_RANGES.find((p) => p.id === merged.priceRange);
      if (range) {
        params.minPrice = String(range.min);
        params.maxPrice = String(range.max);
      }
      if (merged.rating && merged.rating !== "any") params.rating = String(merged.rating);
      if (merged.accessible) params.accessible = "1";
      if (merged.skipLine) params.skipLine = "1";
      if (merged.instant) params.instant = "1";
      if (merged.sort && merged.sort !== "popularity_desc") params.sort = String(merged.sort);
      if (merged.page && Number(merged.page) > 1) params.page = String(merged.page);

      setSearchParams(params, { replace: true });
    },
    [destination, queryText, selectedActivity, selectedPriceRange, selectedRating, wheelchairOnly, skipLineOnly, instantOnly, sort, page, setSearchParams]
  );

  /* --- handlers --- */
  const commitSearch = useCallback(
    (overrides?: { city?: string; query?: string }) => {
      const nextCity = overrides?.city ?? cityInput;
      const nextQuery = overrides?.query ?? activityInput;
      setDestination(nextCity);
      setQueryText(nextQuery);
      setPage(1);
      syncUrl({ city: nextCity, q: nextQuery, page: 1 });
      window.setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
    },
    [cityInput, activityInput, syncUrl]
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

  const handlePriceChange = useCallback(
    (v: string) => {
      setSelectedPriceRange(v);
      setPage(1);
      syncUrl({ priceRange: v, page: 1 });
    },
    [syncUrl]
  );

  const handleRatingChange = useCallback(
    (v: string) => {
      setSelectedRating(v);
      setPage(1);
      syncUrl({ rating: v, page: 1 });
    },
    [syncUrl]
  );

  const handleWheelchairToggle = useCallback(
    (v: boolean) => {
      setWheelchairOnly(v);
      setPage(1);
      syncUrl({ accessible: v, page: 1 });
    },
    [syncUrl]
  );

  const handleSkipLineToggle = useCallback(
    (v: boolean) => {
      setSkipLineOnly(v);
      setPage(1);
      syncUrl({ skipLine: v, page: 1 });
    },
    [syncUrl]
  );

  const handleInstantToggle = useCallback(
    (v: boolean) => {
      setInstantOnly(v);
      setPage(1);
      syncUrl({ instant: v, page: 1 });
    },
    [syncUrl]
  );

  const handleSortChange = useCallback(
    (v: string) => {
      setSort(v);
      syncUrl({ sort: v });
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
    setSelectedPriceRange("");
    setSelectedRating("any");
    setWheelchairOnly(false);
    setSkipLineOnly(false);
    setInstantOnly(false);
    setSort("popularity_desc");
    setPage(1);
    syncUrl({
      activity: "",
      priceRange: "",
      rating: "any",
      accessible: false,
      skipLine: false,
      instant: false,
      sort: "popularity_desc",
      page: 1,
    });
  }, [syncUrl]);

  /* --- mobile sheet --- */
  const openMobileSheet = useCallback(() => {
    setMobileDraft({
      selectedActivity,
      selectedPriceRange,
      selectedRating,
      wheelchairOnly,
      skipLineOnly,
      instantOnly,
      sort,
    });
    setMobileSheetOpen(true);
  }, [selectedActivity, selectedPriceRange, selectedRating, wheelchairOnly, skipLineOnly, instantOnly, sort]);

  const applyMobileFilters = useCallback(() => {
    setSelectedActivity(mobileDraft.selectedActivity);
    setSelectedPriceRange(mobileDraft.selectedPriceRange);
    setSelectedRating(mobileDraft.selectedRating);
    setWheelchairOnly(mobileDraft.wheelchairOnly);
    setSkipLineOnly(mobileDraft.skipLineOnly);
    setInstantOnly(mobileDraft.instantOnly);
    setSort(mobileDraft.sort);
    setPage(1);
    syncUrl({
      activity: mobileDraft.selectedActivity,
      priceRange: mobileDraft.selectedPriceRange,
      rating: mobileDraft.selectedRating,
      accessible: mobileDraft.wheelchairOnly,
      skipLine: mobileDraft.skipLineOnly,
      instant: mobileDraft.instantOnly,
      sort: mobileDraft.sort,
      page: 1,
    });
    setMobileSheetOpen(false);
  }, [mobileDraft, syncUrl]);

  /* --- labels --- */
  const getActivityLabel = (id: string) => ACTIVITY_TYPES.find((a) => a.id === id)?.label || id;
  const getPriceLabel = (id: string) => PRICE_RANGES.find((p) => p.id === id)?.label || id;

  const hasActiveFilters =
    Boolean(selectedActivity) ||
    Boolean(selectedPriceRange) ||
    selectedRating !== "any" ||
    wheelchairOnly ||
    skipLineOnly ||
    instantOnly;

  const activeFilterCount = [
    selectedActivity,
    selectedPriceRange,
    selectedRating !== "any",
    wheelchairOnly,
    skipLineOnly,
    instantOnly,
  ].filter(Boolean).length;

  /* --- popular destinations, derived from currently loaded products --- */
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
      : "Popular experiences";

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
        <title>Things To Do | BookingsFinder.com</title>
        <meta
          name="description"
          content="Find things to do, tours, attractions and experiences. Compare experience details from our partners and continue to book when you're ready."
        />
        <link rel="canonical" href="https://www.bookingsfinder.com/things-to-do" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Things to Do | BookingsFinder",
            description: "Discover attractions, museums, tours and experiences wherever you're going.",
            url: "https://bookingsfinder.com/things-to-do",
          })}
        </script>
        {structuredData && <script type="application/ld+json">{JSON.stringify(structuredData)}</script>}
      </Helmet>

      {/* ─── COMPACT HERO ─── */}
      <section className="relative bg-[#001D45] overflow-hidden">
        <HeroDecoration />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-10">
          <p className="text-[#D64A2A] text-xs font-bold uppercase tracking-widest mb-1 sm:mb-2">DISCOVER MORE</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white mb-1 sm:mb-2 tracking-tight leading-tight">
            Find things to do
          </h1>
          <p className="text-sm sm:text-base text-white/80 max-w-xl mb-1.5 sm:mb-5">
            Discover attractions, tours and experiences wherever you're going.
          </p>

          <div className="bg-white rounded-2xl shadow-lg p-2.5 sm:p-3 flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="flex-1">
              <label htmlFor="ttd-city" className="text-xs font-semibold text-[#41536A] mb-0.5 sm:mb-1 block">
                Where are you going?
              </label>
              <input
                id="ttd-city"
                placeholder="Search a city or destination"
                value={cityInput}
                onChange={(e) => setCityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSearch()}
                className="w-full px-4 py-3 rounded-xl border border-[#D8E0E7] focus:border-[#01367F] focus:ring-2 focus:ring-[#01367F]/20 outline-none text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="ttd-activity" className="text-xs font-semibold text-[#41536A] mb-0.5 sm:mb-1 block">
                What do you want to do?
              </label>
              <input
                id="ttd-activity"
                placeholder="Museums, tours, landmarks..."
                value={activityInput}
                onChange={(e) => setActivityInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && commitSearch()}
                className="w-full px-4 py-3 rounded-xl border border-[#D8E0E7] focus:border-[#01367F] focus:ring-2 focus:ring-[#01367F]/20 outline-none text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => commitSearch()}
              className="bg-[#D64A2A] hover:bg-[#B83D22] text-white rounded-xl px-6 py-3 font-semibold flex items-center justify-center gap-2 shrink-0 transition-colors"
            >
              <Search className="w-4 h-4" aria-hidden="true" /> Search
            </button>
          </div>

          <div className="mt-1.5 sm:mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="text-white/60 font-medium">Popular:</span>
            {POPULAR_SEARCH_SHORTCUTS.map((city) => (
              <button
                key={city}
                type="button"
                onClick={() => handleShortcutClick(city)}
                className="text-white/90 bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-full transition-colors"
              >
                {city}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST STRIP (provider-neutral) ─── */}
      <section className="bg-[#F7F9FC] border-b border-[#D8E0E7]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 text-xs text-[#41536A] font-medium">
          <span className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#01367F]" aria-hidden="true" /> Experience details from our partners
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#01367F]" aria-hidden="true" /> No booking fee added by
            BookingsFinder
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#01367F]" aria-hidden="true" /> Current availability confirmed with
            the provider
          </span>
          <span className="flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-[#01367F]" aria-hidden="true" /> Payment and tickets handled by the
            provider
          </span>
        </div>
      </section>

      {/* ─── CATEGORY CHIPS ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 border-b border-[#EDF4FC]">
        <div className="flex gap-2 overflow-x-auto sm:flex-wrap sm:overflow-visible pb-1 -mx-1 px-1" role="group" aria-label="Activity categories">
          {ACTIVITY_TYPES.map((a) => (
            <button
              key={a.id}
              type="button"
              aria-pressed={selectedActivity === a.id}
              onClick={() => handleActivityToggle(a.id)}
              className={`shrink-0 whitespace-nowrap px-3.5 py-2 rounded-full text-sm font-medium border transition-colors ${
                selectedActivity === a.id
                  ? "bg-[#01367F] border-[#01367F] text-white"
                  : "bg-white border-[#D8E0E7] text-[#0F172A] hover:border-[#01367F]"
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
          <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">{resultsHeading}</h2>
          {hasSearchContext && !loading && totalCount > 0 && (
            <p className="text-sm text-[#41536A] mt-1">
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

            <Select value={selectedPriceRange} onValueChange={handlePriceChange}>
              <SelectTrigger className="w-auto min-w-[120px] h-9 text-sm" aria-label="Price filter">
                <SelectValue placeholder="Price" />
              </SelectTrigger>
              <SelectContent>
                {PRICE_RANGES.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.label}
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

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 text-sm gap-1.5" aria-label="Features filter">
                  Features
                  {(skipLineOnly || instantOnly || wheelchairOnly) && (
                    <Badge className="ml-1 h-4 w-4 p-0 flex items-center justify-center text-[10px] bg-[#D64A2A]">
                      {[skipLineOnly, instantOnly, wheelchairOnly].filter(Boolean).length}
                    </Badge>
                  )}
                  <ChevronDown className="w-3 h-3" aria-hidden="true" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-3">
                <div className="space-y-2">
                  {FEATURES.map((f) => {
                    const isActive = f.id === "skipLine" ? skipLineOnly : instantOnly;
                    const handler = f.id === "skipLine" ? handleSkipLineToggle : handleInstantToggle;
                    return (
                      <label key={f.id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => handler(e.target.checked)}
                          className="rounded border-[#D8E0E7] text-[#01367F] focus:ring-[#01367F]"
                        />
                        {f.label}
                      </label>
                    );
                  })}
                  <label className="flex items-center gap-2 cursor-pointer text-sm pt-1 border-t border-[#EDF4FC]">
                    <input
                      type="checkbox"
                      checked={wheelchairOnly}
                      onChange={(e) => handleWheelchairToggle(e.target.checked)}
                      className="rounded border-[#D8E0E7] text-[#01367F] focus:ring-[#01367F]"
                    />
                    Wheelchair accessible
                  </label>
                </div>
              </PopoverContent>
            </Popover>

            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-auto min-w-[150px] h-9 text-sm ml-auto" aria-label="Sort results">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mobile Filters + Sort row */}
        {isMobile && (
          <div className="flex items-center gap-3 mb-4">
            <Button variant="outline" onClick={openMobileSheet} className="flex-1">
              <ListFilter className="w-4 h-4 mr-2" aria-hidden="true" /> Filters
              {hasActiveFilters && (
                <Badge className="ml-2 bg-[#D64A2A] text-white text-[10px] h-5 px-1.5">{activeFilterCount}</Badge>
              )}
            </Button>
            <Select value={sort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-auto min-w-[110px] h-9 text-sm" aria-label="Sort results">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 mb-4">
            {selectedActivity && <Chip label={getActivityLabel(selectedActivity)} onRemove={() => handleActivityToggle(selectedActivity)} />}
            {selectedPriceRange && <Chip label={getPriceLabel(selectedPriceRange)} onRemove={() => handlePriceChange("")} />}
            {selectedRating !== "any" && <Chip label={`Rating ${selectedRating}+`} onRemove={() => handleRatingChange("any")} />}
            {wheelchairOnly && <Chip label="Wheelchair accessible" onRemove={() => handleWheelchairToggle(false)} />}
            {skipLineOnly && <Chip label="Skip the line" onRemove={() => handleSkipLineToggle(false)} />}
            {instantOnly && <Chip label="Instant ticket" onRemove={() => handleInstantToggle(false)} />}
            <button type="button" onClick={clearAllFilters} className="text-xs text-[#01367F] hover:underline ml-1">
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
        ) : loadError && products.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-[#D8E0E7] rounded-2xl">
            <Info className="w-10 h-10 text-[#D8E0E7] mx-auto mb-3" aria-hidden="true" />
            <h3 className="text-base font-semibold text-[#0F172A] mb-1">We couldn't load experiences right now</h3>
            <p className="text-sm text-[#41536A] mb-4">Please try again in a moment.</p>
            <Button variant="outline" onClick={() => setPage((p) => p)}>
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-14 border border-dashed border-[#D8E0E7] rounded-2xl">
            <Info className="w-10 h-10 text-[#D8E0E7] mx-auto mb-3" aria-hidden="true" />
            {hasSearchContext ? (
              <>
                <h3 className="text-base font-semibold text-[#0F172A] mb-1">No experiences found</h3>
                <p className="text-sm text-[#41536A] mb-4">Try adjusting your filters or search terms.</p>
                <Button variant="outline" onClick={clearAllFilters}>
                  Clear all filters
                </Button>
              </>
            ) : (
              <p className="text-sm text-[#41536A]">Search a destination to explore tours, attractions and experiences.</p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {products.map((product) => (
                <ExperienceCard key={`${product.provider}-${product.providerProductId}`} product={product} />
              ))}
            </div>

            {hasSearchContext && totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 mt-8">
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                  className="p-2 rounded-lg border border-[#D8E0E7] hover:bg-[#F7F9FC] disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" aria-hidden="true" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => goToPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      p === page ? "bg-[#01367F] text-white" : "border border-[#D8E0E7] hover:bg-[#F7F9FC] text-[#0F172A]"
                    }`}
                  >
                    {p}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => goToPage(Math.min(totalPages, page + 1))}
                  disabled={page >= totalPages}
                  className="p-2 rounded-lg border border-[#D8E0E7] hover:bg-[#F7F9FC] disabled:opacity-40 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            )}
          </>
        )}

        {/* ─── Popular destinations (below results, compact) ─── */}
        {destinationsFromResults.length > 0 && (
          <div className="mt-14">
            <h2 className="text-lg sm:text-xl font-bold text-[#0F172A] mb-4">Popular destinations</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {destinationsFromResults.map((d) => (
                <button
                  key={d.name}
                  type="button"
                  onClick={() => handleShortcutClick(d.name)}
                  className="group relative rounded-xl overflow-hidden aspect-[3/2] bg-[#EDF4FC] border border-[#D8E0E7] hover:border-[#01367F] transition-colors"
                >
                  <div className="w-full h-full flex flex-col items-center justify-center p-3">
                    <MapPin className="w-5 h-5 text-[#01367F]/40 mb-1.5" aria-hidden="true" />
                    <p className="text-sm font-semibold text-[#0F172A]">{d.name}</p>
                    {d.country && <p className="text-xs text-[#41536A]">{d.country}</p>}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ─── How it works (compact, supporting) ─── */}
        <div className="mt-14 bg-[#F7F9FC] rounded-2xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-[#0F172A] mb-4 text-center">How it works</h2>
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
                <div className="w-8 h-8 rounded-full bg-[#01367F] text-white flex items-center justify-center mx-auto mb-2 font-bold text-xs">
                  {item.step}
                </div>
                <h3 className="font-semibold text-[#0F172A] mb-1 text-sm">{item.title}</h3>
                <p className="text-xs text-[#41536A]">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ─── Plan your entire trip (restrained) ─── */}
        <div className="mt-8 bg-white border border-[#D8E0E7] rounded-2xl p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <Building2 className="w-4 h-4 text-[#01367F]" aria-hidden="true" />
            <h2 className="text-base font-bold text-[#0F172A]">Plan your entire trip</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              to="/flights"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#D8E0E7] hover:border-[#01367F] hover:bg-[#EDF4FC] transition-colors text-center"
            >
              <Plane className="w-5 h-5 text-[#01367F]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[#0F172A]">Flights</span>
              <span className="text-xs text-[#41536A]">Compare flight deals</span>
            </Link>
            <Link
              to="/"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#D8E0E7] hover:border-[#01367F] hover:bg-[#EDF4FC] transition-colors text-center"
            >
              <Hotel className="w-5 h-5 text-[#01367F]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[#0F172A]">Stays</span>
              <span className="text-xs text-[#41536A]">Find accommodation</span>
            </Link>
            <Link
              to="/trip-cost"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#D8E0E7] hover:border-[#01367F] hover:bg-[#EDF4FC] transition-colors text-center"
            >
              <Calculator className="w-5 h-5 text-[#01367F]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[#0F172A]">Trip Cost</span>
              <span className="text-xs text-[#41536A]">Estimate your budget</span>
            </Link>
            <Link
              to="/optimizer"
              className="flex flex-col items-center gap-1.5 p-3 rounded-xl border border-[#D8E0E7] hover:border-[#01367F] hover:bg-[#EDF4FC] transition-colors text-center"
            >
              <Sparkles className="w-5 h-5 text-[#01367F]" aria-hidden="true" />
              <span className="text-sm font-semibold text-[#0F172A]">Optimizer</span>
              <span className="text-xs text-[#41536A]">Find your best order</span>
            </Link>
          </div>
        </div>

        {/* ─── Affiliate disclosure (provider-neutral) ─── */}
        <div className="mt-8 text-center">
          <p className="text-xs text-[#8BA0B8] max-w-2xl mx-auto leading-relaxed">
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
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-[#0F172A]">Filters</h3>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="p-1 hover:bg-[#F7F9FC] rounded-full"
                aria-label="Close filters"
              >
                <X className="w-5 h-5 text-[#41536A]" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-[#41536A] mb-1.5 block">Activity</label>
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
                <label className="text-xs font-semibold text-[#41536A] mb-1.5 block">Price range</label>
                <Select
                  value={mobileDraft.selectedPriceRange}
                  onValueChange={(v) => setMobileDraft({ ...mobileDraft, selectedPriceRange: v })}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Any price" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41536A] mb-1.5 block">Minimum rating</label>
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

              <div>
                <label className="text-xs font-semibold text-[#41536A] mb-1.5 block">Features</label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mobileDraft.skipLineOnly}
                      onChange={(e) => setMobileDraft({ ...mobileDraft, skipLineOnly: e.target.checked })}
                      className="rounded border-[#D8E0E7] text-[#01367F] focus:ring-[#01367F]"
                    />
                    <span className="text-sm">Skip the line</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mobileDraft.instantOnly}
                      onChange={(e) => setMobileDraft({ ...mobileDraft, instantOnly: e.target.checked })}
                      className="rounded border-[#D8E0E7] text-[#01367F] focus:ring-[#01367F]"
                    />
                    <span className="text-sm">Instant ticket</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41536A] mb-1.5 block">Accessibility</label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={mobileDraft.wheelchairOnly}
                    onChange={(e) => setMobileDraft({ ...mobileDraft, wheelchairOnly: e.target.checked })}
                    className="rounded border-[#D8E0E7] text-[#01367F] focus:ring-[#01367F]"
                  />
                  <span className="text-sm">Wheelchair accessible</span>
                </label>
              </div>

              <div>
                <label className="text-xs font-semibold text-[#41536A] mb-1.5 block">Sort by</label>
                <Select value={mobileDraft.sort} onValueChange={(v) => setMobileDraft({ ...mobileDraft, sort: v })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex gap-3 mt-6 pt-4 border-t border-[#D8E0E7]">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() =>
                  setMobileDraft({
                    selectedActivity: "",
                    selectedPriceRange: "",
                    selectedRating: "any",
                    wheelchairOnly: false,
                    skipLineOnly: false,
                    instantOnly: false,
                    sort: "popularity_desc",
                  })
                }
              >
                Clear all
              </Button>
              <Button className="flex-1 bg-[#D64A2A] hover:bg-[#B83D22] text-white" onClick={applyMobileFilters}>
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
