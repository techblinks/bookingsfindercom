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
  Info,
  ListFilter,
  X,
  Check,
} from "lucide-react";
import ThingsPagination from "@/components/things/ThingsPagination";
import ThingsExperienceCard, {
  ThingsExperienceCardSkeleton,
} from "@/components/things/ThingsExperienceCard";
import ThingsDestinationHero from "@/components/things/ThingsDestinationHero";
import ThingsDiscoveryRail from "@/components/things/ThingsDiscoveryRail";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
    <span className="inline-flex items-center gap-1 rounded-full border border-primary/25 bg-things-brand-soft py-1 pl-3 pr-1 text-[13px] font-medium text-things-text-primary">
      {label}
      <button
        type="button"
        onClick={onRemove}
        className="flex h-7 w-7 items-center justify-center rounded-full text-things-text-secondary transition-colors hover:bg-primary/10 hover:text-primary things-focus-ring"
        aria-label={`Remove ${label} filter`}
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </span>
  );
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

  /*
   * Sheet dialog behaviour (T3C).
   *
   * The sheet now declares `role="dialog" aria-modal="true"`, and that claim
   * has to be true: while it is open, Escape closes it, the page behind cannot
   * scroll, focus starts inside it and cannot Tab out, and focus returns to
   * the Filters trigger on close. Announcing a modal without managing focus
   * would strand a keyboard or screen-reader user behind an overlay they
   * cannot see.
   */
  const sheetRef = useRef<HTMLDivElement>(null);
  const filterTriggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!mobileSheetOpen) return;

    const sheet = sheetRef.current;
    // Captured now, while the trigger is certainly mounted, so the cleanup
    // returns focus to the control the traveller actually pressed.
    const returnFocusTo = filterTriggerRef.current ?? (document.activeElement as HTMLElement | null);
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";

    const focusable = () =>
      Array.from(
        sheet?.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => !el.hasAttribute("disabled"));

    focusable()[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        setMobileSheetOpen(false);
        return;
      }
      if (event.key !== "Tab") return;
      const items = focusable();
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || !sheet?.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = overflow;
      returnFocusTo?.focus?.();
    };
  }, [mobileSheetOpen]);

  /* --- labels --- */
  const getActivityLabel = (id: string) => ACTIVITY_TYPES.find((a) => a.id === id)?.label || id;

  const hasActiveFilters = Boolean(selectedActivity) || selectedRating !== "any";

  const activeFilterCount = [selectedActivity, selectedRating !== "any"].filter(Boolean).length;

  /*
   * "Other destinations in these results" is gone (T3C).
   *
   * It was derived from whatever products the current page happened to
   * contain, presented as a grid of destination tiles. On a canonical route it
   * could only ever echo the destination the traveller is already on, and on
   * the hub it read as a ranking BookingsFinder has no data to make. The Rome
   * UX spec §3.1 marks it DEMOTE-or-remove; it did not earn its space.
   */

  /* --- pagination --- */
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  /*
   * Results heading. On a canonical destination route the H1 already reads
   * "Things to do in Rome", so repeating it verbatim as the H2 would be a
   * duplicate rather than a hierarchy — the results section names the
   * inventory instead.
   */
  const resultsHeading = destinationProp
    ? `Experiences in ${destinationProp.displayName}`
    : destination.trim()
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

      <main id="main-content" className="bg-things-surface-page">
        {/* ─── DESTINATION HERO ─── */}
        <ThingsDestinationHero
          destination={destinationProp}
          cityInput={cityInput}
          onCityInputChange={setCityInput}
          onCitySelect={(dest: ExperienceDestination) => {
            setCityInput(dest.name);
          }}
          activityInput={activityInput}
          onActivityInputChange={setActivityInput}
          onSubmit={() => commitSearch()}
          cityShortcuts={destinationProp ? undefined : SEARCH_SHORTCUTS}
          onCityShortcutClick={handleShortcutClick}
        />

        {/* ─── TRUST LINE (provider-neutral, slim) ───
            Both claims are architecture-supported and provider-neutral. It is
            one line now rather than a boxed strip: the disclosure below the
            results carries the commercial detail, and this only has to set
            expectations before the traveller starts scanning inventory. */}
        <section className="border-b border-things-border bg-things-surface-card">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-6 gap-y-1 px-4 py-2.5 text-[12.5px] font-medium text-things-text-secondary sm:px-6 lg:px-8">
            <span className="flex items-center gap-1.5">
              <Info className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> Experience details from our
              partners
            </span>
            <span className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" /> Payment and tickets handled by
              the provider
            </span>
          </div>
        </section>

        {/* ─── EXPLORE (keyword discovery shortcuts) ─── */}
        <ThingsDiscoveryRail
          items={ACTIVITY_TYPES}
          selectedId={selectedActivity}
          onToggle={handleActivityToggle}
          destinationName={destinationProp?.displayName}
        />

        {/* ─── RESULTS ─── */}
        <section
          ref={resultsRef}
          aria-labelledby="things-results-heading"
          className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 lg:px-8 lg:pt-10"
        >
          {/* Results header: identity and count on the left, the honest filter
              set on the right. On desktop this is one editorial row with a
              hairline under it, so the page reads hero → discovery → INVENTORY
              rather than as four unrelated strips. */}
          <div className="border-b border-things-border pb-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
              <div className="min-w-0">
                <h2
                  id="things-results-heading"
                  className="text-[20px] font-bold tracking-tight text-things-text-primary lg:text-2xl"
                >
                  {resultsHeading}
                </h2>
                {/* Count is the provider's own genuine total for this search —
                    never a sum of incompatible provider semantics, never an
                    invented figure, and never shown while a search is in
                    flight (it would describe the previous result set). */}
                <p className="mt-1 min-h-[20px] text-sm text-things-text-secondary" aria-live="polite">
                  {hasSearchContext && !loading && totalCount > 0
                    ? `${totalCount.toLocaleString()} ${totalCount === 1 ? "experience" : "experiences"}`
                    : ""}
                </p>
              </div>

              {/* Desktop filter toolbar */}
              {!isMobile && (
                <div className="flex flex-wrap items-center gap-2.5">
                  <Select value={selectedActivity} onValueChange={handleActivityToggle}>
                    <SelectTrigger className="h-10 w-auto min-w-[140px] rounded-xl bg-things-surface-card text-sm" aria-label="Activity filter">
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
                    <SelectTrigger className="h-10 w-auto min-w-[132px] rounded-xl bg-things-surface-card text-sm" aria-label="Rating filter">
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
            </div>
          </div>

          {/* Mobile filter row — sticky under the global header so filter
              access never scrolls away mid-grid. Kept to one row so results
              start immediately below it. */}
          {isMobile && (
            <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-things-border bg-things-surface-page/95 px-4 py-2.5 backdrop-blur-sm">
              <Button
                ref={filterTriggerRef}
                variant="outline"
                onClick={openMobileSheet}
                className="h-11 w-full justify-center rounded-xl border-things-border bg-things-surface-card"
              >
                <ListFilter className="mr-2 h-4 w-4" aria-hidden="true" /> Filters
                {hasActiveFilters && (
                  <Badge className="ml-2 h-5 bg-things-action px-1.5 text-[10px] text-white">{activeFilterCount}</Badge>
                )}
              </Button>
            </div>
          )}

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="mb-5 mt-4 flex flex-wrap items-center gap-2">
              {selectedActivity && <Chip label={getActivityLabel(selectedActivity)} onRemove={() => handleActivityToggle(selectedActivity)} />}
              {selectedRating !== "any" && <Chip label={`Rating ${selectedRating}+`} onRemove={() => handleRatingChange("any")} />}
              <button
                type="button"
                onClick={clearAllFilters}
                className="ml-1 rounded px-1 text-[13px] font-medium text-primary hover:underline things-focus-ring"
              >
                Clear all
              </button>
            </div>
          )}

          <div className={hasActiveFilters ? "" : "mt-6"} aria-busy={loading}>
        {/*
          * Results grid — THREE columns maximum. The `xl:grid-cols-4` this
          * replaces could not be justified from the rendered page.
          *
          * The decisive constraint is the container, not the viewport: this
          * results area is `max-w-7xl` (1280px) with `lg:px-8`, so the grid is
          * capped at 1216px however wide the screen gets. A 4th column
          * therefore buys no extra card width at ANY desktop size — it only
          * divides the same 1216px further.
          *
          * Measured from the rendered card at the real container width:
          *    360px → 1 col  → 313px   (gap 36px)
          *    390px → 1 col  → 343px   (gap 66px)
          *    900px → 2 cols → 416px   (gap 139px)
          *   1024px → 3 cols → 307px   (gap 30px)
          *   1280px → 3 cols → 392px   (gap 115px)
          *   1400px → 4 cols → 289px   (gap 12px)  ← rejected
          *   1500px → 4 cols → 289px   (gap 12px)  ← rejected
          *
          * "gap" is the space between the price block and the CTA. At 4
          * columns that collapses to 12px and the card reads cramped, while
          * being NARROWER than the 3-column card at 1024px — the layout got
          * worse as the screen got wider, which is the one thing a responsive
          * grid must never do. Three columns holds a 392px card from 1280px
          * up, the best card in the whole range.
          *
          * A 4th column would need the results container widened past
          * max-w-7xl. That is a page-layout decision, not a card decision, so
          * T3D does not take it.
          */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <ThingsExperienceCardSkeleton key={i} />
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
            className="rounded-2xl border border-dashed border-things-border bg-things-surface-card px-6 py-16 text-center"
          >
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-things-info-soft">
              <Info className="h-6 w-6 text-things-info" aria-hidden="true" />
            </span>
            <h3 className="mb-1.5 text-base font-semibold text-things-text-primary">
              Experiences are temporarily unavailable
            </h3>
            <p className="mx-auto mb-5 max-w-md text-sm text-things-text-secondary">
              We're having trouble loading activities right now. This is on our side — please try again shortly.
            </p>
            <Button
              onClick={retrySearch}
              className="h-11 rounded-xl bg-things-action px-6 text-white hover:bg-things-action-hover active:bg-things-action-strong things-focus-ring-action"
            >
              Try again
            </Button>
          </div>
        ) : products.length === 0 ? (
          /* A provider answered healthily and genuinely had nothing to match. */
          <div
            role="status"
            className="rounded-2xl border border-dashed border-things-border bg-things-surface-card px-6 py-16 text-center"
          >
            <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-things-info-soft">
              <Info className="h-6 w-6 text-things-info" aria-hidden="true" />
            </span>
            {hasSearchContext ? (
              <>
                <h3 className="mb-1.5 text-base font-semibold text-things-text-primary">No experiences matched your search</h3>
                <p className="mx-auto mb-5 max-w-md text-sm text-things-text-secondary">
                  Try a different destination or activity, or remove some filters.
                </p>
                {hasActiveFilters && (
                  <Button variant="outline" className="h-11 rounded-xl px-5" onClick={clearAllFilters}>
                    Clear all filters
                  </Button>
                )}
              </>
            ) : (
              <p className="mx-auto max-w-md text-sm text-things-text-secondary">
                Search a destination to explore tours, attractions and experiences.
              </p>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ThingsExperienceCard
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
                className="mt-10"
              />
            )}
          </>
        )}
          </div>

          {/*
           * T3C removed three sections from the main Rome flow, each measured
           * against "does this help the traveller understand, decide or act?":
           *
           *   Other destinations in these results — a grid derived from the
           *     current page of products. On /things-to-do/rome it could only
           *     echo Rome back; anywhere else it read as a ranking we hold no
           *     data to make.
           *   How it works — three generic steps repeating what the search box,
           *     the cards and the disclosure already say in situ.
           *   The trip-planning cross-sell grid — four tiles duplicating
           *     navigation the global header and footer both already carry.
           *
           * Roughly 700px of page between the last result card and the
           * disclosure, none of it helping anyone choose an experience in Rome.
           * The provider/commission disclosure below is required and stays.
           */}

          {/* ─── Affiliate disclosure (provider-neutral, required) ─── */}
          <div className="mt-12 border-t border-things-border pt-6">
            <p className="mx-auto max-w-2xl text-center text-xs leading-relaxed text-things-text-secondary">
              Experience information is provided by our partners. BookingsFinder may earn a commission when you
              continue through an affiliate link, at no additional cost to you. Final prices, availability and
              booking terms are confirmed by the provider.
            </p>
          </div>
        </section>
      </main>

      {/* ─── MOBILE FILTER SHEET ─── */}
      {isMobile && mobileSheetOpen && (
        /* z-[60]: the global mobile BottomNav is fixed at z-50, and at 390px it
           sat directly over the sheet's own Clear all / Show results row. */
        <div className="fixed inset-0 z-[60] bg-black/50" onClick={() => setMobileSheetOpen(false)}>
          <div
            ref={sheetRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="things-filter-sheet-heading"
            className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl bg-things-surface-card px-5 pt-5 shadow-modal motion-safe:animate-slide-up"
            /* Bottom padding clears the iOS home indicator / Android gesture bar. */
            style={{ paddingBottom: "calc(1.25rem + var(--sab))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <span aria-hidden="true" className="mx-auto mb-4 block h-1 w-10 rounded-full bg-things-border" />
            <div className="mb-5 flex items-center justify-between">
              <h3 id="things-filter-sheet-heading" className="text-lg font-bold text-things-text-primary">
                Filters
              </h3>
              <button
                type="button"
                onClick={() => setMobileSheetOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-things-surface-page things-focus-ring"
                aria-label="Close filters"
              >
                <X className="h-5 w-5 text-things-text-secondary" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-things-text-secondary">
                  Activity
                </label>
                <Select
                  value={mobileDraft.selectedActivity}
                  onValueChange={(v) => setMobileDraft({ ...mobileDraft, selectedActivity: v })}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl">
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
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-things-text-secondary">
                  Minimum rating
                </label>
                <Select
                  value={mobileDraft.selectedRating}
                  onValueChange={(v) => setMobileDraft({ ...mobileDraft, selectedRating: v })}
                >
                  <SelectTrigger className="h-12 w-full rounded-xl">
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

            <div className="mt-6 flex gap-3 border-t border-things-border pt-4">
              <Button
                variant="outline"
                className="h-12 flex-1 rounded-xl"
                onClick={() => setMobileDraft({ selectedActivity: "", selectedRating: "any" })}
              >
                Clear all
              </Button>
              <Button
                className="h-12 flex-1 rounded-xl bg-things-action text-white hover:bg-things-action-hover active:bg-things-action-strong things-focus-ring-action"
                onClick={applyMobileFilters}
              >
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
