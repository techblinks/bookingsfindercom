import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Plane, ChevronDown, AlertTriangle, ExternalLink } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useIsMobile, useIsBelowDesktop } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FlightFiltersPanel from "@/components/flights/FlightFiltersPanel";
import MobileFiltersSheet from "@/components/flights/MobileFiltersSheet";
import FlightCard from "@/components/flights/FlightCard";
import FlightCardSkeleton from "@/components/flights/FlightCardSkeleton";
import EmptyFlightState from "@/components/flights/EmptyFlightState";
import EnhancedEmptyFlightResults from "@/components/states/EnhancedEmptyFlightResults";
import SearchingIndicator from "@/components/flights/SearchingIndicator";
import SortDropdown from "@/components/flights/SortDropdown";
import PriceCalendar from "@/components/flights/PriceCalendar";
import WeeklyPriceHeatmap from "@/components/flights/WeeklyPriceHeatmap";
import NearbyAirportSuggestion from "@/components/flights/NearbyAirportSuggestion";
import FlightSearchSchema from "@/components/seo/FlightSearchSchema";
import { AdSlot } from "@/components/ads/AdSlot";
import { Button } from "@/components/ui/button";
import { useFlightSearch, formatDuration } from "@/hooks/useFlightSearch";
import { useAds } from "@/hooks/useAds";
import { getRedirectUrl } from "@/services/travelApi";
import { logAffiliateClick } from "@/lib/analytics";
import { buildWhiteLabelFlightUrl } from "@/lib/whiteLabelUrl";
import { getWhiteLabelHost } from "@/lib/travelConfig";
import { DEPARTURE_TIME_SLOTS, type FilterState } from "@/types/flight";
import { toast } from "sonner";
import FlightQuickSelect from "@/components/flights/FlightQuickSelect";
import CurrencySelector from "@/components/flights/CurrencySelector";
import UnsupportedCurrencyDialog from "@/components/flights/UnsupportedCurrencyDialog";
import { useCurrencyPreference } from "@/hooks/useCurrencyPreference";
import TravelpayoutsLiveFlights from "@/components/flights/TravelpayoutsLiveFlights";
import { useTravelpayoutsWidget } from "@/hooks/useTravelpayoutsWidget";

const LIVE_FLIGHTS_SECTION_ID = "live-flights-section";
/*
 * BF-FLIGHTS-LIVE-3 Phase I: interim compatibility mapping — no new
 * ad_placements DB values or migration. The `placement` column has a DB
 * CHECK constraint limited to ('after_result_3', 'bottom', 'after_result_5')
 * (see supabase/migrations/20260113131101_...sql), so introducing new
 * semantic keys would require a migration. Reusing the existing two keys
 * positionally needs none:
 *   after_result_3 → live_results_top    (rendered before the embedded Live Flights section)
 *   after_result_5 → live_results_bottom (rendered after the embedded Live Flights section)
 * AdminAds.tsx's placement labels were updated to disclose this mapping
 * rather than silently keep the old "After Result #3/#5" wording.
 */
import MobileFlightSearch from "@/components/search/MobileFlightSearch";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import { FlightLandingPage } from "@/pages/flight/FlightLandingPage";
import { parseAndValidateFlightSearchParams, toISODateLocal } from "@/lib/flightSearchValidation";

const INITIAL_DISPLAY_COUNT = 10;
const LOAD_MORE_COUNT = 10;

const FlightResults = () => {
  const [searchParams] = useSearchParams();
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);
  const [priceToolsOpen, setPriceToolsOpen] = useState(false);
  const [isEditingSearch, setIsEditingSearch] = useState(false);
  /*
   * BF-FLIGHTS-LIVE-2 Round 2 Phase C: a White Label redirect whose
   * currency could not be preserved (buildWhiteLabelFlightUrl reported
   * requestedCurrency set but currencyApplied === false) is held here
   * instead of navigating immediately, so UnsupportedCurrencyDialog can
   * get explicit confirmation first. Null means no warning is pending —
   * the redirect proceeds immediately.
   */
  const [pendingCurrencyHandoff, setPendingCurrencyHandoff] = useState<{
    url: string;
    trackingPayload: Record<string, unknown>;
    requestedCurrency: string;
  } | null>(null);
  const quickSelectRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  /* Phones and tablets share the mobile search UI; only lg+ gets the wide desktop form. */
  const isBelowDesktop = useIsBelowDesktop();

  const parsed = useMemo(() => parseAndValidateFlightSearchParams(searchParams), [searchParams]);
  const isResultsMode = parsed.mode === "results";
  const validated = parsed.validated;
  const prefill = parsed.prefill;
  const validationErrors = parsed.errors;

  const origin = validated?.origin ?? "";
  const destination = validated?.destination ?? "";
  const departureDate = validated?.departureDate
    ? toISODateLocal(validated.departureDate)
    : "";
  const returnDate = validated?.returnDate
    ? toISODateLocal(validated.returnDate)
    : "";
  const passengers = validated ? (validated.adults + validated.children + validated.infants) : 1;
  const cabinClass = validated?.cabinClass ?? "economy";

  const adults = validated?.adults ?? null;
  const children = validated?.children ?? null;
  const infants = validated?.infants ?? null;
  const hasExplicitPassengers =
    adults !== null && children !== null && infants !== null;

  /*
   * BF-0R-7 Round 1.1 item 2 (smallest truthful design): Travelpayouts'
   * Data API does not price against cabin class — every cached fare on
   * this page is effectively an unknown/standard-cabin observation. A text
   * disclosure next to a Business/First/Premium Economy search result list
   * would not be enough: the prominently-displayed NUMBER itself would
   * still misrepresent what that cabin actually costs (often by a large
   * multiple), not just its freshness. So for any non-economy cabin
   * search, no cached numeric fares are shown at all — the results list is
   * replaced with a direct path to the partner's live search for that
   * cabin. Economy searches keep the existing recent/indicative card list
   * (labelled per Phase E) plus the one page-level disclosure below.
   */
  const isNonEconomyCabin = !!cabinClass && cabinClass !== "economy";
  const cabinClassLabel = cabinClass ? cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1) : "";

  /*
   * BF-FLIGHTS-LIVE-2 Phase B: currencyCode/currencySymbol are resolved
   * through the single currency preference contract (explicit user
   * selection > geo-detected > USD fallback) — not read directly from geo
   * data, so this page, the cached fare cards, Recent Fare Calendar/
   * Heatmap and the White Label handoff can never disagree with each
   * other or with a deliberate override.
   */
  const { currency: currencyCode, currencySymbol, setCurrency } = useCurrencyPreference();

  /*
   * BF-FLIGHTS-LIVE-3 Phase G: "ready" gates whether Search Live Flights
   * scrolls to the embedded widget instead of leaving the site — see
   * handleSearchLiveFlights below. This is a second, independent call to
   * the same hook the TravelpayoutsLiveFlights component uses; the
   * underlying script load is deduplicated at module scope (see
   * useTravelpayoutsWidget.ts), so this never causes a second script tag.
   */
  const { state: travelpayoutsWidgetState } = useTravelpayoutsWidget();

  const {
    flights,
    meta,
    isLoading,
    isSearching,
    error,
    retry,
    filters,
    sortBy,
    setSortBy,
    updateFilter,
    resetFilters,
    filteredFlights,
    airlines,
    searchProgress,
    cheapestPrice,
    fastestDuration,
  } = useFlightSearch({
    origin: isResultsMode ? origin : "",
    destination: isResultsMode ? destination : "",
    departureDate: isResultsMode ? departureDate : "",
    returnDate,
    passengers,
    cabinClass,
    currency: currencyCode,
    /*
     * BF-0R-7.1 Phase B: a non-economy (Business) search must not call the
     * cached search-flights Data API at all — it cannot truthfully
     * represent a Business fare, so there is nothing honest to decorate
     * the page with. The hook itself is still called unconditionally
     * every render (no conditional hook call); only its internal fetch is
     * suppressed.
     */
    enabled: !isNonEconomyCabin,
  });

  const { ads, trackImpression, trackClick } = useAds('flights');

  useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [filters, sortBy]);

  /*
   * A committed change of search — from the edit form, the price calendar, or
   * any other route into /flights — starts a different journey.
   *
   * useFlightSearch keeps filter state across param changes and only
   * re-initialises the numeric ranges from the new results, so a selected
   * airline, stop count or departure slot would otherwise survive into an
   * unrelated route and silently hide flights that do exist. Sort returns to
   * Best for the same reason: the old ordering was chosen against a different
   * set of options.
   *
   * Keyed on the validated search rather than the raw query string so filter
   * state is not thrown away by a cosmetic parameter change.
   */
  const searchKey = validated
    ? [origin, destination, departureDate, returnDate, adults, children, infants, cabinClass].join("|")
    : "";
  const committedSearchRef = useRef(searchKey);

  useEffect(() => {
    if (committedSearchRef.current === searchKey) return;
    committedSearchRef.current = searchKey;
    resetFilters();
    setSortBy("best");
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [searchKey, resetFilters, setSortBy]);

  /*
   * Any committed submit closes the editor, including one that re-submits the
   * same criteria: the traveller pressed Update search, so the form has done its
   * job and leaving the panel open would read as a failure. Keyed on the router
   * entry rather than the criteria for exactly that reason.
   */
  const { key: locationKey } = useLocation();
  const locationKeyRef = useRef(locationKey);

  useEffect(() => {
    if (locationKeyRef.current === locationKey) return;
    locationKeyRef.current = locationKey;
    setIsEditingSearch(false);
  }, [locationKey]);

  const stopCounts = useMemo(() => {
    const counts: Record<number, number> = { 0: 0, 1: 0, 2: 0 };
    flights.forEach(f => {
      const stops = f.stops >= 2 ? 2 : f.stops;
      counts[stops]++;
    });
    return counts;
  }, [flights]);

  const departureCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    DEPARTURE_TIME_SLOTS.forEach(slot => { counts[slot.id] = 0; });
    flights.forEach(f => {
      const segment = f.segments[0];
      if (segment?.depart_time) {
        try {
          const hour = new Date(segment.depart_time).getHours();
          const slot = DEPARTURE_TIME_SLOTS.find(s => hour >= s.startHour && hour < s.endHour);
          if (slot) counts[slot.id]++;
        } catch { /* ignore */ }
      }
    });
    return counts;
  }, [flights]);

  const displayedFlights = filteredFlights.slice(0, displayCount);
  const hasMore = displayCount < filteredFlights.length;

  const loadMore = useCallback(() => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  }, []);

  /*
   * Commit a whole mobile filter draft. The five constraint fields are pushed
   * through the existing updateFilter API in one handler, so React batches them
   * into a single render and the existing displayCount reset runs once.
   */
  const applyMobileFilters = useCallback((next: FilterState) => {
    updateFilter("priceRange", next.priceRange);
    updateFilter("selectedStops", next.selectedStops);
    updateFilter("selectedAirlines", next.selectedAirlines);
    updateFilter("selectedDepartureTimes", next.selectedDepartureTimes);
    updateFilter("durationRange", next.durationRange);
  }, [updateFilter]);

  useEffect(() => {
    if (!hasMore || isLoading) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { threshold: 0.1, rootMargin: "200px" }
    );
    const sentinel = document.getElementById("load-more-sentinel");
    if (sentinel) observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  /*
   * BF-FLIGHTS-LIVE-2 Round 2 Phase C: commits a handoff that either never
   * needed a currency warning, or already got explicit confirmation from
   * UnsupportedCurrencyDialog. The only place logAffiliateClick + the
   * actual navigation happen — see attemptHandoff below.
   */
  const commitRedirect = (url: string, trackingPayload: Record<string, unknown>) => {
    void logAffiliateClick(trackingPayload as Parameters<typeof logAffiliateClick>[0]).catch(() => {});
    window.location.href = `/redirect?url=${encodeURIComponent(url)}`;
  };

  /*
   * BF-FLIGHTS-LIVE-2 Round 2 Phase C/G: the single gate every White Label
   * handoff goes through — page-level Search Live Flights, the Business
   * cabin panel (handleSearchLiveFlights covers both), and per-card
   * Check live price / book-now (handleBookNow) all call this so none of
   * them can silently redirect through a currency mismatch while another
   * warns. requestedCurrency/currencyApplied come straight from
   * buildWhiteLabelFlightUrl's result — never re-derived or guessed here.
   */
  const attemptHandoff = (
    url: string,
    trackingPayload: Record<string, unknown>,
    currencyMismatch: { requestedCurrency: string } | null
  ) => {
    if (currencyMismatch) {
      setPendingCurrencyHandoff({ url, trackingPayload, requestedCurrency: currencyMismatch.requestedCurrency });
      return;
    }
    commitRedirect(url, trackingPayload);
  };

  const handleBookNow = async (flightId: string) => {
    const flight = flights.find(f => f.id === flightId);
    if (!flight) return;

    let finalUrl: string | null = null;
    let outboundHost: string | undefined;
    let currencyMismatch: { requestedCurrency: string } | null = null;

    /*
     * BF-0R-7 Phase F: the displayed price (FlightCard) and this handoff
     * are deliberately two different things, and this function does not
     * try to make them look like the same offer.
     *
     * Neither path below preserves "the exact priced offer the traveller
     * saw": buildWhiteLabelFlightUrl() below builds a brand-new generic
     * White Label search from route/dates/passengers/cabin only (never
     * flight.link/id/price); the getRedirectUrl() fallback's flight.link,
     * when present, is itself just a cached-provider search link from the
     * same Data API response the displayed price came from — Travelpayouts
     * does not document that following it re-quotes or preserves that
     * specific cached price, and this codebase has no proven expiry/TTL
     * behaviour for it either. Preferring flight.link here would fabricate
     * a continuity between the two numbers that isn't actually provable,
     * which is why this order is NOT "prefer flight.link" — see the
     * BF-0R-7 audit for why that recommendation was reversed.
     *
     * What both paths correctly do is send the traveller to the partner's
     * live search for the real route/dates/passengers, where the actual
     * current price and availability are confirmed — hence "Check live
     * price" as the button label (FlightCard.tsx), not "Book this fare".
     */
    if (hasExplicitPassengers) {
      // Preferred path: a full White Label search carrying the complete
      // supported query contract (origin, destination, dates, adults,
      // children, infants, cabin class) — see whiteLabelUrl.ts.
      const wlResult = buildWhiteLabelFlightUrl({
        origin, destination, outboundDate: departureDate,
        returnDate: returnDate || undefined,
        adults: adults!, children: children!, infants: infants!,
        cabinClass, currency: currencyCode,
      });
      if (wlResult.success && wlResult.url) {
        finalUrl = wlResult.url;
        outboundHost = new URL(wlResult.url).hostname;
        if (wlResult.requestedCurrency && !wlResult.currencyApplied) {
          currencyMismatch = { requestedCurrency: wlResult.requestedCurrency };
        }
      }
    }

    if (!finalUrl) {
      // Fallback path only: get-redirect prefers flight.link when present
      // (a cached-provider search link tied to this specific result, not a
      // proven-live re-quote) and otherwise builds a generic partner search
      // itself. Reached only when White Label is unavailable/disabled or
      // passenger details are incomplete.
      try {
        const result = await getRedirectUrl({
          id: flightId, type: 'flight', link: flight.link, origin, destination,
          departureDate, returnDate: returnDate || undefined, airline: flight.airline_code,
        });
        if (result.success && result.redirectUrl) {
          finalUrl = result.redirectUrl;
          outboundHost = new URL(result.redirectUrl).hostname;
        }
      } catch (err) { /* URL generation failed */ }
    }

    if (!finalUrl) {
      toast.error("Could not generate booking link");
      return;
    }

    attemptHandoff(finalUrl, {
      partner: outboundHost || 'aviasales',
      partnerType: 'flight',
      route: origin + '-' + destination,
      airline: flight.airline_code,
      price: flight.price,
      currency: flight.currency,
      whiteLabelUsed: outboundHost && getWhiteLabelHost() && outboundHost === getWhiteLabelHost(),
      fallbackUsed: !(outboundHost && getWhiteLabelHost() && outboundHost === getWhiteLabelHost()),
      outboundHost: outboundHost || null,
      landingPage: '/flights',
    }, currencyMismatch);
  };

  /*
   * BF-FLIGHTS-LIVE-1 Phase C: the single "go to the partner's live search"
   * handoff, shared by the non-economy (business) cabin panel's dedicated
   * CTA (BF-0R-7 Round 1.2 item 3) and the page-level "Search Live Flights"
   * action available on every valid search (economy included). Both call
   * sites need the exact same behaviour, so there is one implementation:
   *
   * MUST FAIL CLOSED. Unlike handleBookNow, this has no generic
   * get-redirect fallback: that fallback does not carry
   * adults/children/infants/cabinClass, so silently falling back to it
   * would drop the exact thing this CTA promises to preserve while still
   * appearing to have "checked live prices". A WL failure here means
   * something is genuinely wrong (rollout mode disabled, host
   * misconfigured, etc.) — not a normal case to paper over.
   */
  const handleOpenFullFlightSearch = async () => {
    let finalUrl: string | null = null;
    let outboundHost: string | undefined;
    let currencyMismatch: { requestedCurrency: string } | null = null;

    if (hasExplicitPassengers) {
      const wlResult = buildWhiteLabelFlightUrl({
        origin, destination, outboundDate: departureDate,
        returnDate: returnDate || undefined,
        adults: adults!, children: children!, infants: infants!,
        cabinClass, currency: currencyCode,
      });
      if (wlResult.success && wlResult.url) {
        finalUrl = wlResult.url;
        outboundHost = new URL(wlResult.url).hostname;
        if (wlResult.requestedCurrency && !wlResult.currencyApplied) {
          currencyMismatch = { requestedCurrency: wlResult.requestedCurrency };
        }
      }
    }

    if (!finalUrl) {
      toast.error(isNonEconomyCabin
        ? `Live ${cabinClassLabel} search is temporarily unavailable. Please try again.`
        : "Live flight search is temporarily unavailable. Please try again.");
      return;
    }

    attemptHandoff(finalUrl, {
      partner: outboundHost || 'aviasales',
      partnerType: 'flight',
      route: origin + '-' + destination,
      currency: currencyCode,
      whiteLabelUsed: !!(outboundHost && getWhiteLabelHost() && outboundHost === getWhiteLabelHost()),
      fallbackUsed: !(outboundHost && getWhiteLabelHost() && outboundHost === getWhiteLabelHost()),
      outboundHost: outboundHost || null,
      landingPage: '/flights',
    }, currencyMismatch);
  };

  /*
   * BF-FLIGHTS-LIVE-3 Round 2 Issue 1: "Search Live Flights" prefers
   * staying on bookingsfinder.com — scrolling to the embedded
   * Travelpayouts widget — over leaving for the Page White Label,
   * whenever the widget has any chance of still becoming usable:
   *   ready   → scroll (the widget's search form is right there)
   *   loading → ALSO scroll (a normal initial load in progress is not a
   *             reason to send the visitor away — TravelpayoutsLiveFlights
   *             shows its own loading state at that section, and the
   *             section's own "Open full flight search" link/button stays
   *             available the entire time as an explicit fallback)
   *   error   → falls through to the exact same Page White Label handoff
   *             as before — see handleOpenFullFlightSearch, unchanged —
   *             the only state where leaving the site makes sense.
   * Scrolling to an on-page element is not an outbound affiliate click, so
   * no tracking call happens on that path (see commitRedirect/attemptHandoff,
   * which only run for an actual redirect).
   */
  const handleSearchLiveFlights = async () => {
    if (travelpayoutsWidgetState === "ready" || travelpayoutsWidgetState === "loading") {
      document.getElementById(LIVE_FLIGHTS_SECTION_ID)?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    await handleOpenFullFlightSearch();
  };

  const handleDateSelect = (date: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("departureDate", date);
    window.location.href = `/flights?${params.toString()}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch { return dateStr; }
  };

  const totalResults = filteredFlights.length;
  const bestDealFlight = filteredFlights.length > 0
    ? filteredFlights.reduce((best, f) => (f.deal_score || 0) > (best.deal_score || 0) ? f : best, filteredFlights[0])
    : null;

  /* ═════════════════════════════════════════════════════════════════
     V1: Form mode — mobile gets new V1 search, desktop preserves existing
     ═════════════════════════════════════════════════════════════════ */

  if (!isResultsMode) {
    if (isMobile) {
      return (
        <div className="min-h-screen bg-background flex flex-col">
          <main id="main-content" className="flex-1 px-4 pt-3 pb-24">
            <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Flights</span>
            </Link>
            <MobileFlightSearch />
            {/* Compact below-form proof panel */}
            <div className="mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
              <p className="text-xs text-muted-foreground leading-relaxed text-center">
                BookingsFinder is a travel comparison and planning platform. Current prices and availability are confirmed by providers. Some outbound links may be affiliate links.
              </p>
            </div>
            <div className="mt-3 space-y-0.5">
              <Link to="/trip-cost" className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors min-h-[44px]">
                <span className="text-sm text-foreground">Trip Cost Planner</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground rotate-270" />
              </Link>
              <Link to="/help" className="flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-muted transition-colors min-h-[44px]">
                <span className="text-sm text-foreground">Help Centre</span>
                <ChevronDown className="h-4 w-4 text-muted-foreground rotate-270" />
              </Link>
            </div>
          </main>
        </div>
      );
    }
    return <FlightLandingPage prefill={prefill} validationErrors={validationErrors} suppliedSearchParams={searchParams} />;
  }

  /* ═════════════════════════════════════════════════════════════════
     Results mode
     ═════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <FlightSearchSchema
        origin={origin} destination={destination} departureDate={departureDate}
        returnDate={returnDate || undefined} passengers={passengers} cabinClass={cabinClass}
        // BF-0R-7 Round 1.1 item 2: no cached numeric fare is attached to a
        // non-economy cabin search anywhere on this page — see the same
        // gating on the "From $X" summary chip below and the results list.
        lowestPrice={!isNonEconomyCabin && cheapestPrice > 0 ? cheapestPrice : undefined}
        currency={currencyCode} totalResults={filteredFlights.length}
      />

      <Header />

      {/* Search Summary Bar */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {/* A genuinely fresh form. Editing this search is the Edit action. */}
              <Link to="/flights">
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" aria-label="New search">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span className="truncate">{origin}</span>
                  <Plane className="h-3.5 w-3.5 text-muted-foreground shrink-0 rotate-90" aria-hidden="true" />
                  <span className="truncate">{destination}</span>
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDate(departureDate)}
                  {returnDate && ` - ${formatDate(returnDate)}`}
                  {" · "}{passengers} {passengers === 1 ? "Traveler" : "Travelers"}
                  {" · "}{cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/*
                * BF-FLIGHTS-LIVE-2 Phase F: lightweight override, initially
                * showing the geo-detected currency. Selecting one only
                * calls setCurrency (persists locally, re-resolves
                * currencyCode) — it never touches route/date/passenger/
                * cabin state, so it does not reset the search.
                */}
              {!isEditingSearch && (
                <CurrencySelector value={currencyCode} onChange={setCurrency} />
              )}
              {/*
                * BF-0R-7 Round 1.1 item 2 / BF-0R-7.1 Phase B/C: this chip
                * is Economy-only — a non-economy (Business) search never
                * fetches cached results at all (see the `enabled` flag on
                * useFlightSearch above), so cheapestPrice/fastestDuration
                * are always 0 for Business and this chip would never have
                * rendered anyway; the branch that used to show "Fastest"
                * alone for non-economy is removed rather than left as dead
                * code. "Recent from" — not "From" — because this is a
                * cached fare observation, not a live price.
                */}
              {!isLoading && !isNonEconomyCabin && cheapestPrice > 0 && (
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                  <span>Recent from <span className="font-semibold text-foreground">{currencySymbol}{cheapestPrice}</span></span>
                  <span className="w-px h-4 bg-border" />
                  <span>Fastest <span className="font-semibold text-foreground">{formatDuration(fastestDuration)}</span></span>
                </div>
              )}
              {/*
                * BF-FLIGHTS-LIVE-1 Phase C: a prominent live-search handoff
                * is available on every valid search, not just the Business
                * cabin panel or the zero-result state (see the matching CTA
                * in EnhancedEmptyFlightResults below). Always visible in the
                * sticky header so it survives scrolling past a long results
                * list.
                *
                * BF-FLIGHTS-LIVE-3 Round 3 Fix 2: no ExternalLink icon —
                * its normal (healthy-path) behavior is scrolling to the
                * embedded #live-flights-section on THIS page (see
                * handleSearchLiveFlights), not leaving the site. An
                * external-link icon would misrepresent that. Only the
                * error-state fallback actually navigates away, and it
                * does so through handleOpenFullFlightSearch — a visually
                * distinct action ("Open full flight search") that keeps
                * its own ExternalLink icon.
                */}
              {!isEditingSearch && (
                <Button
                  size="sm"
                  className="h-9 shrink-0"
                  onClick={handleSearchLiveFlights}
                >
                  Search Live Flights
                </Button>
              )}
              {/*
                * Edit is a local UI mode, not a URL mode: it opens the same
                * search form the user already knows, prefilled from the
                * validated search behind these results. Available at every
                * width — the previous link pointed at this exact results URL
                * and did nothing.
                */}
              {!isEditingSearch && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 shrink-0"
                  aria-expanded={false}
                  onClick={() => setIsEditingSearch(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <main id="main-content" className={"flex-1 container mx-auto px-4 py-5" + (isMobile ? " pb-24" : "")}>
        {isEditingSearch ? (
          /*
           * Edit mode replaces the results rather than layering over them: the
           * form's own location, date and traveller pickers are full-screen
           * overlays, so hosting the form inside another dialog would nest one
           * overlay in another. Results, filters and sort are untouched while
           * this is open, so Cancel is a pure return.
           */
          <section
            aria-label="Edit search"
            className={isBelowDesktop ? "mx-auto w-full max-w-[560px]" : "w-full"}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-foreground">Edit search</h2>
              <Button variant="ghost" size="sm" className="h-9" onClick={() => setIsEditingSearch(false)}>
                Cancel
              </Button>
            </div>
            {isBelowDesktop ? (
              <MobileFlightSearch prefill={validated ?? undefined} submitLabel="Update search" />
            ) : (
              <ModernFlightSearch prefill={validated ?? undefined} />
            )}
          </section>
        ) : isNonEconomyCabin ? (
          /*
           * BF-0R-7.1 Phase B: Business (the only non-economy cabin that
           * ever reaches results mode — see cabinClasses.ts) never calls
           * the cached search-flights Data API at all (see the `enabled`
           * flag on useFlightSearch above), so there is nothing derived
           * from it to show: no filters, sort, result count, price
           * calendar/heatmap, quick select or nearby-airport suggestion —
           * all of that is cached-result-derived UI this mode intentionally
           * never fetches. Route/dates/travellers/cabin are already shown
           * in the sticky header above; this panel is only the honest
           * live-search handoff.
           */
          <div className="max-w-xl mx-auto space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 md:p-8 text-center space-y-4">
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Our flight partner's recent fare snapshots aren't adjusted for cabin class, so we don't show them as matching a {cabinClassLabel} search. Check live prices for your selected cabin below.
              </p>
              {/*
                * BF-FLIGHTS-LIVE-3 Round 3 Fix 2 (same principle applied
                * consistently): this button shares handleSearchLiveFlights
                * with the header's Search Live Flights button — its normal
                * behavior is scrolling to the embedded #live-flights-section
                * right below in this same panel, not leaving the site, so
                * no ExternalLink icon here either.
                */}
              <Button onClick={handleSearchLiveFlights}>
                Check live prices for your selected cabin
              </Button>
            </div>
            {/*
              * BF-FLIGHTS-LIVE-3 Phase M: the embedded widget is shown here
              * too — it never claims to be pre-set to Business (no
              * documented mechanism exists to do that, see
              * TravelpayoutsLiveFlights.tsx), it's simply Travelpayouts'
              * own visible search form, where the traveller picks cabin
              * themselves. This does not reintroduce cached Business fare
              * observations — useFlightSearch's fetch is still disabled
              * for this branch (see `enabled: !isNonEconomyCabin` above).
              */}
            <section id={LIVE_FLIGHTS_SECTION_ID} aria-label="Live Flights">
              <h2 className="text-lg font-semibold text-foreground mb-3 text-center">Live Flights</h2>
              <TravelpayoutsLiveFlights onOpenFullSearch={handleOpenFullFlightSearch} />
            </section>
          </div>
        ) : (
        <div className="flex gap-6">
          {/* Desktop filters — hidden on mobile */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-[72px] space-y-4">
              <FlightFiltersPanel
                filters={filters} airlines={airlines} stopCounts={stopCounts}
                departureCounts={departureCounts} onFilterChange={updateFilter}
                onReset={resetFilters} totalResults={totalResults} currency={currencySymbol}
                hasResults={meta.total_found > 0}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/*
              * BF-0R-7.1 Phase D: one concise disclosure before the first
              * cached-price surface on the page (FlightQuickSelect, right
              * below). This branch is economy-only — Business has its own
              * honest panel above and never reaches here — so this always
              * renders ahead of every cached price on the page. Replaces
              * the old, longer disclosure that used to sit further down,
              * after several prices had already been shown.
              */}
            {!isLoading && !error && displayedFlights.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                Recent indicative fares from our flight partner. Confirm current price, travellers and availability on the partner site.
              </p>
            )}

            {!isLoading && filteredFlights.length > 0 && (
              <div className="mb-4" ref={quickSelectRef}>
                <FlightQuickSelect flights={filteredFlights} currency={currencySymbol}
                  onSelect={(id) => { document.getElementById(`flight-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }); }}
                />
              </div>
            )}

            {isMobile ? (
              <Collapsible open={priceToolsOpen} onOpenChange={setPriceToolsOpen} className="mb-4">
                <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-card border border-border rounded-xl text-sm font-semibold native-touch">
                  <span>Price Tools</span>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${priceToolsOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 mt-3">
                  <PriceCalendar origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} currencyCode={currencyCode} onDateSelect={handleDateSelect} />
                  <WeeklyPriceHeatmap origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} currencyCode={currencyCode} onWeekSelect={handleDateSelect} />
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <>
                <div className="mb-4"><PriceCalendar origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} currencyCode={currencyCode} onDateSelect={handleDateSelect} /></div>
                <div className="mb-4"><WeeklyPriceHeatmap origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} currencyCode={currencyCode} onWeekSelect={handleDateSelect} /></div>
              </>
            )}

            {!isLoading && bestDealFlight?.nearby_airport_savings && (
              <div className="mb-4">
                <NearbyAirportSuggestion airport={bestDealFlight.nearby_airport_savings.airport} airportName={bestDealFlight.nearby_airport_savings.airport_name} savings={bestDealFlight.nearby_airport_savings.savings} currency={currencySymbol} />
              </div>
            )}

            {/*
              * BF-FLIGHTS-LIVE-3 Phase F: a plain, low-prominence truthful
              * statement — not a large card — when there is no exact recent
              * fare observation. The embedded Live Flights section right
              * below is what actually answers "are there flights", so this
              * line does not need to carry that weight (and must not claim
              * it either).
              */}
            {!isLoading && meta.total_found === 0 && (
              <p className="text-sm text-muted-foreground mb-4">
                No exact recent fare observation is available for these dates. Live flights may still be available below.
              </p>
            )}

            {/*
              * BF-FLIGHTS-LIVE-3 Phase I/J: BookingsFinder-owned placements
              * around the embedded widget, eligible regardless of cached
              * result count — see the interim after_result_3/5 → live_results_top/bottom
              * mapping documented above. Rendering ads.after_result_3/5 here
              * (unconditional on displayedFlights) replaces the old
              * per-card-index placement further down, which is removed so
              * the same ad row is never shown twice.
              */}
            {ads.after_result_3 && (
              <div className="mb-4"><AdSlot ad={ads.after_result_3} onImpression={trackImpression} onClick={trackClick} /></div>
            )}

            <section id={LIVE_FLIGHTS_SECTION_ID} aria-label="Live Flights" className="mb-4">
              <h2 className="text-lg font-semibold text-foreground mb-3">Live Flights</h2>
              <TravelpayoutsLiveFlights onOpenFullSearch={handleOpenFullFlightSearch} />
            </section>

            {ads.after_result_5 && (
              <div className="mb-4"><AdSlot ad={ads.after_result_5} onImpression={trackImpression} onClick={trackClick} /></div>
            )}

            {/* Sort: mobile segmented control, desktop dropdown */}
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Searching for flights...</p>
                ) : totalResults > 0 ? (
                  /*
                   * BF-FLIGHTS-LIVE-1 Phase B/D: this count is how many
                   * cached fare observations exactly matched the requested
                   * dates — not a statement that this many flights exist.
                   *
                   * BF-FLIGHTS-LIVE-3 Round 3 Fix 1: only rendered when
                   * totalResults > 0 — at zero, the compact truthful
                   * sentence above the Live Flights section already says
                   * "No exact recent fare observation is available for
                   * these dates", so "0 recent fare observations" here
                   * would just repeat it without adding information.
                   */
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">{totalResults.toLocaleString()}</span> recent fare observation{totalResults !== 1 ? 's' : ''}
                  </p>
                ) : null}
              </div>
              {/*
                * The filters trigger follows the sidebar, not the mobile search
                * breakpoint: the sidebar appears at lg, so every width below it
                * needs the sheet — including the 768-1023 band, which had no
                * filter controls at all.
                */}
              <div className={isMobile ? "flex w-full items-center justify-between gap-2" : "flex items-center gap-2"}>
                {isMobile ? (
                  <div role="radiogroup" aria-label="Sort flights" className="flex min-w-0 bg-muted rounded-full p-0.5">
                    {(["best", "cheapest", "fastest"] as const).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => setSortBy(opt)}
                        role="radio"
                        aria-checked={sortBy === opt}
                        className={sortBy === opt
                          ? "bg-card text-foreground shadow-sm px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                          : "text-muted-foreground hover:text-foreground px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                        }
                      >
                        {opt === "best" ? "Best" : opt === "cheapest" ? "Cheapest" : "Fastest"}
                      </button>
                    ))}
                  </div>
                ) : (
                  <SortDropdown value={sortBy} onChange={setSortBy} />
                )}
                <div className="lg:hidden">
                  <MobileFiltersSheet
                    filters={filters}
                    airlines={airlines}
                    stopCounts={stopCounts}
                    departureCounts={departureCounts}
                    onApply={applyMobileFilters}
                    totalResults={totalResults}
                    currency={currencySymbol}
                    hasResults={meta.total_found > 0}
                  />
                </div>
              </div>
            </div>

            {isSearching && !isLoading && (
              <div className="mb-4">
                <SearchingIndicator isComplete={meta.is_complete} totalFound={meta.total_found} progress={searchProgress} />
              </div>
            )}

            <div className="space-y-3" role="list" aria-label="Flight results">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <FlightCardSkeleton key={i} />)
              ) : error ? (
                <EmptyFlightState errorMessage={error} onRetry={retry} />
              ) : displayedFlights.length === 0 ? (
                <EnhancedEmptyFlightResults
                  onClearFilters={resetFilters}
                  onModifySearch={() => setIsEditingSearch(true)}
                  onSearchLiveFlights={handleSearchLiveFlights}
                  origin={origin} destination={destination}
                  departureDate={departureDate} returnDate={returnDate}
                  adults={adults ?? undefined} children={children ?? undefined} infants={infants ?? undefined}
                  cabinClass={cabinClass}
                  /*
                   * BF-FLIGHTS-LIVE-3 Round 3 Fix 1: only when there are
                   * genuinely ZERO cached observations for this search
                   * (meta.total_found === 0) — the embedded Live Flights
                   * section (with its own compact truthful zero-result
                   * sentence) already covers that case above, so the
                   * large "No Exact Recent Fare Data Found" card would be
                   * a redundant second failure message there.
                   *
                   * Deliberately NOT hidden when meta.total_found > 0 but
                   * displayedFlights.length === 0 anyway — that means the
                   * traveller's own sidebar/sheet filters excluded every
                   * cached result, cached data genuinely exists, and
                   * "Clear All Filters" (inside the primary card) is the
                   * correct fix for THAT problem — Live Flights being
                   * shown above doesn't address it, so hiding the button
                   * would remove real functionality (see
                   * FlightResults.mobileFilters.test.tsx's "Clear filters
                   * from the empty state restores the results").
                   */
                  hidePrimaryCard={meta.total_found === 0}
                />
              ) : (
                <>
                  {displayedFlights.map((flight, index) => (
                    <div key={flight.id} id={`flight-${flight.id}`}>
                      <div role="listitem" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
                        <FlightCard flight={flight} currency={currencySymbol} onBookNow={handleBookNow} />
                      </div>
                    </div>
                  ))}
                  {hasMore && (
                    <div id="load-more-sentinel" className="py-4">
                      <div className="flex justify-center">
                        <Button variant="outline" onClick={loadMore} className="gap-2">
                          Load More ({filteredFlights.length - displayCount} remaining)
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {!isLoading && displayedFlights.length > 0 && !hasMore && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">Showing all {totalResults} recent fare observation{totalResults !== 1 ? 's' : ''}</p>
              </div>
            )}

            {/*
              * BF-FLIGHTS-LIVE-3 Phase J: unconditional on cached result
              * count — a sponsored placement must not require cached
              * FlightCard results to exist (see the same note on
              * after_result_3/5 above).
              */}
            {ads.bottom && (
              <div className="mt-4"><AdSlot ad={ads.bottom} onImpression={trackImpression} onClick={trackClick} /></div>
            )}
          </div>
        </div>
        )}
      </main>

      {/*
        * BF-FLIGHTS-LIVE-2 Round 2 Phase C/G: rendered unconditionally
        * (not nested inside the editing/Business/results branches above)
        * so it can appear regardless of which panel triggered the handoff
        * — the Business live-only CTA and the per-card Check live price
        * button both route through attemptHandoff just like the page-level
        * Search Live Flights button.
        */}
      <UnsupportedCurrencyDialog
        open={!!pendingCurrencyHandoff}
        currency={pendingCurrencyHandoff?.requestedCurrency ?? null}
        onOpenChange={(open) => { if (!open) setPendingCurrencyHandoff(null); }}
        onContinue={() => {
          if (!pendingCurrencyHandoff) return;
          commitRedirect(pendingCurrencyHandoff.url, pendingCurrencyHandoff.trackingPayload);
          setPendingCurrencyHandoff(null);
        }}
      />

      <Footer />
    </div>
  );
};

export default FlightResults;
