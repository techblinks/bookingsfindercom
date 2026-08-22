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
import { PriceAlertDialog } from "@/components/flights/PriceAlertDialog";
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
import { useGeoLocation } from "@/hooks/useGeoLocation";
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

  const { geoData } = useGeoLocation();
  const currencyCode = geoData?.currency || "USD";
  const currencySymbol = geoData?.currencySymbol || "$";

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

  const handleBookNow = async (flightId: string) => {
    const flight = flights.find(f => f.id === flightId);
    if (!flight) return;

    let finalUrl: string | null = null;
    let outboundHost: string | undefined;

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
        cabinClass,
      });
      if (wlResult.success && wlResult.url) {
        finalUrl = wlResult.url;
        outboundHost = new URL(wlResult.url).hostname;
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

    void logAffiliateClick({
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
    }).catch(() => {});

    window.location.href = `/redirect?url=${encodeURIComponent(finalUrl)}`;
  };

  /*
   * BF-0R-7 Round 1.1 item 2: the CTA shown instead of cached fare cards
   * for a non-economy cabin search. Same handoff mechanism as
   * handleBookNow (White Label first, get-redirect fallback) — just not
   * tied to a specific cached flight, since none are displayed.
   */
  const handleCheckCabinLivePrices = async () => {
    let finalUrl: string | null = null;
    let outboundHost: string | undefined;

    if (hasExplicitPassengers) {
      const wlResult = buildWhiteLabelFlightUrl({
        origin, destination, outboundDate: departureDate,
        returnDate: returnDate || undefined,
        adults: adults!, children: children!, infants: infants!,
        cabinClass,
      });
      if (wlResult.success && wlResult.url) {
        finalUrl = wlResult.url;
        outboundHost = new URL(wlResult.url).hostname;
      }
    }

    if (!finalUrl) {
      try {
        const result = await getRedirectUrl({
          id: 'cabin-live-search', type: 'flight', origin, destination,
          departureDate, returnDate: returnDate || undefined,
        });
        if (result.success && result.redirectUrl) {
          finalUrl = result.redirectUrl;
          outboundHost = new URL(result.redirectUrl).hostname;
        }
      } catch (err) { /* URL generation failed */ }
    }

    if (!finalUrl) {
      toast.error("Could not generate a live search link");
      return;
    }

    void logAffiliateClick({
      partner: outboundHost || 'aviasales',
      partnerType: 'flight',
      route: origin + '-' + destination,
      currency: currencyCode,
      whiteLabelUsed: !!(outboundHost && getWhiteLabelHost() && outboundHost === getWhiteLabelHost()),
      fallbackUsed: !(outboundHost && getWhiteLabelHost() && outboundHost === getWhiteLabelHost()),
      outboundHost: outboundHost || null,
      landingPage: '/flights',
    }).catch(() => {});

    window.location.href = `/redirect?url=${encodeURIComponent(finalUrl)}`;
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
                * BF-0R-7 Round 1.1 item 2: this chip must not surface a
                * cached numeric fare for a non-economy search either — it
                * would undermine the same fix the results list below
                * makes. "Fastest" alone (no price) still shows.
                */}
              {!isLoading && !isNonEconomyCabin && cheapestPrice > 0 && (
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                  <span>From <span className="font-semibold text-foreground">{currencySymbol}{cheapestPrice}</span></span>
                  <span className="w-px h-4 bg-border" />
                  <span>Fastest <span className="font-semibold text-foreground">{formatDuration(fastestDuration)}</span></span>
                </div>
              )}
              {!isLoading && isNonEconomyCabin && fastestDuration > 0 && (
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                  <span>Fastest <span className="font-semibold text-foreground">{formatDuration(fastestDuration)}</span></span>
                </div>
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
        ) : (
        <div className="flex gap-6">
          {/* Desktop filters — hidden on mobile */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-[72px] space-y-4">
              <FlightFiltersPanel
                filters={filters} airlines={airlines} stopCounts={stopCounts}
                departureCounts={departureCounts} onFilterChange={updateFilter}
                onReset={resetFilters} totalResults={totalResults} currency={currencySymbol}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0">
            {/*
              * BF-0R-7 Round 1.1 item 2: FlightQuickSelect renders cached
              * numeric prices (cheapest/fastest/best) — same gating as the
              * results list below, for the same reason.
              */}
            {!isLoading && !isNonEconomyCabin && filteredFlights.length > 0 && (
              <div className="mb-4" ref={quickSelectRef}>
                <FlightQuickSelect flights={filteredFlights} currency="$"
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
                  <PriceCalendar origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} onDateSelect={handleDateSelect} />
                  <WeeklyPriceHeatmap origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} onWeekSelect={handleDateSelect} />
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <>
                <div className="mb-4"><PriceCalendar origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} onDateSelect={handleDateSelect} /></div>
                <div className="mb-4"><WeeklyPriceHeatmap origin={origin} destination={destination} selectedDate={departureDate} currency={currencySymbol} onWeekSelect={handleDateSelect} /></div>
              </>
            )}

            {/*
              * BF-0R-7 Round 1.1 item 2: savings is derived from cached
              * economy-priced data — same gating as FlightQuickSelect above.
              */}
            {!isLoading && !isNonEconomyCabin && bestDealFlight?.nearby_airport_savings && (
              <div className="mb-4">
                <NearbyAirportSuggestion airport={bestDealFlight.nearby_airport_savings.airport} airportName={bestDealFlight.nearby_airport_savings.airport_name} savings={bestDealFlight.nearby_airport_savings.savings} currency={currencySymbol} />
              </div>
            )}

            {/* Sort: mobile segmented control, desktop dropdown */}
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground animate-pulse">Searching for flights...</p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-semibold text-foreground tabular-nums">{totalResults.toLocaleString()}</span> flight{totalResults !== 1 ? 's' : ''} found
                  </p>
                )}
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
                  />
                </div>
              </div>
            </div>

            {isSearching && !isLoading && (
              <div className="mb-4">
                <SearchingIndicator isComplete={meta.is_complete} totalFound={meta.total_found} progress={searchProgress} />
              </div>
            )}

            {/*
              * BF-0R-7 Round 1.1 item 2: one concise, page-level disclosure
              * — not repeated per card — shown only alongside the cached
              * fare list itself (economy searches with results).
              */}
            {!isLoading && !error && !isNonEconomyCabin && displayedFlights.length > 0 && (
              <p className="text-xs text-muted-foreground mb-3">
                Recent fare snapshots are route/date observations from our flight partner. They are not adjusted for traveller type or cabin class. Your selected travellers and cabin are applied when you check the live partner search.
              </p>
            )}

            <div className="space-y-3" role="list" aria-label="Flight results">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => <FlightCardSkeleton key={i} />)
              ) : error ? (
                <EmptyFlightState variant="error" errorMessage={error} onRetry={retry} />
              ) : isNonEconomyCabin ? (
                /*
                 * BF-0R-7 Round 1.1 item 2: cached fares are unknown/
                 * standard-cabin observations — showing them as if they
                 * matched a Business/First/Premium Economy search would
                 * misrepresent the number itself, not just its freshness.
                 * Send the traveller straight to the partner's live search
                 * for the selected cabin instead of any numeric fare card.
                 * The selected adults/children/infants/cabin still flow
                 * into that handoff — see handleCheckCabinLivePrices.
                 */
                <div className="rounded-xl border border-border bg-card p-6 md:p-8 text-center space-y-4">
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Our flight partner's recent fare snapshots aren't adjusted for cabin class, so we don't show them as matching a {cabinClassLabel} search. Check live prices for your selected cabin on the partner site instead.
                  </p>
                  <Button onClick={handleCheckCabinLivePrices} className="gap-1.5">
                    Check live prices for your selected cabin
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ) : displayedFlights.length === 0 ? (
                <EnhancedEmptyFlightResults onClearFilters={resetFilters} origin={origin} destination={destination} departureDate={departureDate} returnDate={returnDate} />
              ) : (
                <>
                  {displayedFlights.map((flight, index) => (
                    <div key={flight.id} id={`flight-${flight.id}`}>
                      <div role="listitem" style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}>
                        <FlightCard flight={flight} currency={currencySymbol} onBookNow={handleBookNow} />
                      </div>
                      {index === 2 && ads.after_result_3 && (
                        <div className="my-3"><AdSlot ad={ads.after_result_3} onImpression={trackImpression} onClick={trackClick} /></div>
                      )}
                      {index === 4 && ads.after_result_5 && (
                        <div className="my-3"><AdSlot ad={ads.after_result_5} onImpression={trackImpression} onClick={trackClick} /></div>
                      )}
                    </div>
                  ))}
                  {ads.bottom && displayedFlights.length > 0 && (
                    <div className="mt-4"><AdSlot ad={ads.bottom} onImpression={trackImpression} onClick={trackClick} /></div>
                  )}
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
                <p className="text-sm text-muted-foreground">Showing all {totalResults} flight{totalResults !== 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default FlightResults;
