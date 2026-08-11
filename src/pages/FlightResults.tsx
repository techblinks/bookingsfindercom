import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowLeft, Plane, ChevronDown, AlertTriangle } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FlightFiltersPanel from "@/components/flights/FlightFiltersPanel";
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
import { DEPARTURE_TIME_SLOTS } from "@/types/flight";
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
  const quickSelectRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
        lowestPrice={cheapestPrice > 0 ? cheapestPrice : undefined}
        currency={currencyCode} totalResults={filteredFlights.length}
      />

      <Header />

      {/* Search Summary Bar */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link to={`/flights?${searchParams.toString()}`}>
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
              {!isLoading && cheapestPrice > 0 && (
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                  <span>From <span className="font-semibold text-foreground">{currencySymbol}{cheapestPrice}</span></span>
                  <span className="w-px h-4 bg-border" />
                  <span>Fastest <span className="font-semibold text-foreground">{formatDuration(fastestDuration)}</span></span>
                </div>
              )}
              {/* V1: Edit hidden on mobile (MobileQuickEditBar not yet reconnected) */}
              {!isMobile && (
              <Link to={`/flights?${searchParams.toString()}`} className="shrink-0">
                <Button variant="outline" size="sm" className="h-9">Edit</Button>
              </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      <main id="main-content" className={"flex-1 container mx-auto px-4 py-5" + (isMobile ? " pb-24" : "")}>
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
            {!isLoading && filteredFlights.length > 0 && (
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

            {!isLoading && bestDealFlight?.nearby_airport_savings && (
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
              {isMobile ? (
                <div role="radiogroup" aria-label="Sort flights" className="flex bg-muted rounded-full p-0.5">
                  {(["best", "cheapest", "fastest"] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setSortBy(opt)}
                      role="radio"
                      aria-checked={sortBy === opt}
                      className={sortBy === opt
                        ? "bg-card text-foreground shadow-sm px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                        : "text-muted-foreground hover:text-foreground px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200"
                      }
                    >
                      {opt === "best" ? "Best" : opt === "cheapest" ? "Cheapest" : "Fastest"}
                    </button>
                  ))}
                </div>
              ) : (
                <SortDropdown value={sortBy} onChange={setSortBy} />
              )}
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
                <EmptyFlightState variant="error" errorMessage={error} onRetry={retry} />
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
      </main>

      <Footer />
    </div>
  );
};

export default FlightResults;
