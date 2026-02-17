import { useState, useEffect, useCallback, useMemo } from "react";
import { ArrowLeft, SlidersHorizontal, X, Plane, Sparkles } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FlightFiltersPanel from "@/components/flights/FlightFiltersPanel";
import FlightCard from "@/components/flights/FlightCard";
import FlightCardSkeleton from "@/components/flights/FlightCardSkeleton";
import EmptyFlightState from "@/components/flights/EmptyFlightState";
import EnhancedEmptyFlightResults from "@/components/states/EnhancedEmptyFlightResults";
import SearchingIndicator from "@/components/flights/SearchingIndicator";
import SortDropdown from "@/components/flights/SortDropdown";
import FlexibleDatesMatrix from "@/components/flights/FlexibleDatesMatrix";
import PriceCalendar from "@/components/flights/PriceCalendar";
import WeeklyPriceHeatmap from "@/components/flights/WeeklyPriceHeatmap";
import NearbyAirportSuggestion from "@/components/flights/NearbyAirportSuggestion";
import { PriceAlertDialog } from "@/components/flights/PriceAlertDialog";
import FlightSearchSchema from "@/components/seo/FlightSearchSchema";
import { AdSlot } from "@/components/ads/AdSlot";
import { Button } from "@/components/ui/button";
import { useFlightSearch, formatDuration } from "@/hooks/useFlightSearch";
import { useAds } from "@/hooks/useAds";
import { getRedirectUrl, trackAffiliateEvent } from "@/services/travelApi";
import { DEPARTURE_TIME_SLOTS } from "@/types/flight";
import { toast } from "sonner";
import TripOptimizerBanner from "@/components/optimizer/TripOptimizerBanner";
import FlightQuickSelect from "@/components/flights/FlightQuickSelect";
import { useGeoLocation } from "@/hooks/useGeoLocation";

const INITIAL_DISPLAY_COUNT = 10;
const LOAD_MORE_COUNT = 10;

// Generate mock flexible dates data (would come from backend in production)
const generateFlexibleDates = (baseDate: string, cheapestPrice: number) => {
  const dates = [];
  const base = new Date(baseDate);
  
  for (let i = -3; i <= 10; i++) {
    const date = new Date(base);
    date.setDate(date.getDate() + i);
    
    // Simulate varying prices
    const variance = (Math.random() - 0.3) * 0.4; // -30% to +10%
    const price = i === 0 ? cheapestPrice : Math.round(cheapestPrice * (1 + variance));
    
    dates.push({
      date: date.toISOString().split('T')[0],
      price: price > 0 ? price : null,
      isCheapest: i === 0,
    });
  }
  
  return dates;
};

const FlightResults = () => {
  const [searchParams] = useSearchParams();
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [displayCount, setDisplayCount] = useState(INITIAL_DISPLAY_COUNT);

  // Search params
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  const departureDate = searchParams.get("departureDate") || "";
  const returnDate = searchParams.get("returnDate") || "";
  const passengers = parseInt(searchParams.get("passengers") || "1", 10);
  const cabinClass = searchParams.get("cabinClass") || "economy";

  // Get geo-based currency
  const { geoData } = useGeoLocation();
  const currencyCode = geoData?.currency || "USD";
  const currencySymbol = geoData?.currencySymbol || "$";

  // Use the flight search hook
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
    origin,
    destination,
    departureDate,
    returnDate,
    passengers,
    cabinClass,
    currency: currencyCode,
  });

  // Fetch ads (lazy loaded, non-blocking)
  const { ads, trackImpression, trackClick } = useAds('flights');

  // Generate flexible dates
  const flexibleDates = useMemo(() => {
    if (!departureDate || cheapestPrice <= 0) return [];
    return generateFlexibleDates(departureDate, cheapestPrice);
  }, [departureDate, cheapestPrice]);

  // Reset display count when filters change
  useEffect(() => {
    setDisplayCount(INITIAL_DISPLAY_COUNT);
  }, [filters, sortBy]);

  // Calculate filter counts
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
    DEPARTURE_TIME_SLOTS.forEach(slot => {
      counts[slot.id] = 0;
    });
    flights.forEach(f => {
      const segment = f.segments[0];
      if (segment?.depart_time) {
        try {
          const hour = new Date(segment.depart_time).getHours();
          const slot = DEPARTURE_TIME_SLOTS.find(s => hour >= s.startHour && hour < s.endHour);
          if (slot) {
            counts[slot.id]++;
          }
        } catch {
          // Ignore parse errors
        }
      }
    });
    return counts;
  }, [flights]);

  // Infinite scroll / load more
  const displayedFlights = filteredFlights.slice(0, displayCount);
  const hasMore = displayCount < filteredFlights.length;

  const loadMore = useCallback(() => {
    setDisplayCount(prev => prev + LOAD_MORE_COUNT);
  }, []);

  // Infinite scroll observer
  useEffect(() => {
    if (!hasMore || isLoading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "200px" }
    );

    const sentinel = document.getElementById("load-more-sentinel");
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [hasMore, isLoading, loadMore]);

  // Handle booking - navigate to redirect interstitial page
  const handleBookNow = async (flightId: string) => {
    const flight = flights.find(f => f.id === flightId);
    if (!flight) return;

    // Track the click
    trackAffiliateEvent({
      type: 'flight',
      action: 'click',
      origin,
      destination,
      departureDate,
      returnDate: returnDate || undefined,
      airlineCode: flight.airline_code,
      price: flight.price,
      currency: flight.currency,
    });

    try {
      const result = await getRedirectUrl({
        id: flightId,
        type: 'flight',
        link: flight.link,
        origin,
        destination,
        departureDate,
        returnDate: returnDate || undefined,
        airline: flight.airline_code,
      });

      if (result.success && result.redirectUrl) {
        // Always route through the interstitial page (production-safe)
        const interstitialUrl = `/redirect?url=${encodeURIComponent(result.redirectUrl)}`;
        window.location.href = interstitialUrl;
      } else {
        toast.error("Could not generate booking link");
      }
    } catch (err) {
      console.error("Redirect error:", err);
      toast.error("An error occurred");
    }
  };

  // Handle flexible date selection
  const handleDateSelect = (date: string) => {
    const params = new URLSearchParams(searchParams);
    params.set("departureDate", date);
    window.location.href = `/flights?${params.toString()}`;
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const totalResults = filteredFlights.length;

  // Get best deal flight for highlight
  const bestDealFlight = filteredFlights.length > 0 
    ? filteredFlights.reduce((best, f) => 
        (f.deal_score || 0) > (best.deal_score || 0) ? f : best
      , filteredFlights[0])
    : null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* SEO Schema Markup */}
      <FlightSearchSchema
        origin={origin}
        destination={destination}
        departureDate={departureDate}
        returnDate={returnDate || undefined}
        passengers={passengers}
        cabinClass={cabinClass}
        lowestPrice={cheapestPrice > 0 ? cheapestPrice : undefined}
        currency={currencyCode}
        totalResults={filteredFlights.length}
      />

      <Header />

      {/* Search Summary Bar - Sticky */}
      <div className="bg-card border-b border-border sticky top-0 z-30 shadow-sm">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <Link to="/">
                <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div className="min-w-0">
                <h1 className="text-base font-semibold text-foreground flex items-center gap-2">
                  <span className="truncate">{origin}</span>
                  <Plane className="h-3.5 w-3.5 text-muted-foreground shrink-0 rotate-90" />
                  <span className="truncate">{destination}</span>
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {formatDate(departureDate)}
                  {returnDate && ` - ${formatDate(returnDate)}`}
                  {" · "}
                  {passengers} {passengers === 1 ? "Traveler" : "Travelers"}
                  {" · "}
                  {cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {/* Quick stats */}
              {!isLoading && cheapestPrice > 0 && (
                <div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground mr-2">
                  <span>From <span className="font-semibold text-foreground">{currencySymbol}{cheapestPrice}</span></span>
                  <span className="w-px h-4 bg-border" />
                  <span>Fastest <span className="font-semibold text-foreground">{formatDuration(fastestDuration)}</span></span>
                </div>
              )}
              {/* Price Alert Button */}
              {!isLoading && cheapestPrice > 0 && (
                <PriceAlertDialog
                  origin={origin}
                  destination={destination}
                  departureDate={departureDate}
                  returnDate={returnDate || undefined}
                  passengers={passengers}
                  cabinClass={cabinClass}
                  currentLowestPrice={cheapestPrice}
                  currency={currencyCode}
                />
              )}
              <Link to="/" className="shrink-0">
                <Button variant="outline" size="sm" className="h-9">
                  Edit
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-5">
        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-[72px] space-y-4">
              <FlightFiltersPanel
                filters={filters}
                airlines={airlines}
                stopCounts={stopCounts}
                departureCounts={departureCounts}
                onFilterChange={updateFilter}
                onReset={resetFilters}
                totalResults={totalResults}
                currency={currencySymbol}
              />
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
            <Button
              onClick={() => setShowMobileFilters(true)}
              className="shadow-lg gap-2 h-11 px-5"
              size="lg"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
              {(filters.selectedAirlines.length > 0 || 
                filters.selectedStops.length > 0 || 
                filters.selectedDepartureTimes.length > 0) && (
                <span className="bg-primary-foreground text-primary text-xs font-bold px-1.5 py-0.5 rounded-full">
                  {filters.selectedAirlines.length + filters.selectedStops.length + filters.selectedDepartureTimes.length}
                </span>
              )}
            </Button>
          </div>

          {/* Mobile Filter Drawer */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setShowMobileFilters(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background overflow-y-auto animate-in slide-in-from-right duration-300">
                <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between z-10">
                  <h2 className="font-semibold text-lg">Filters</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMobileFilters(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4">
                  <FlightFiltersPanel
                    filters={filters}
                    airlines={airlines}
                    stopCounts={stopCounts}
                    departureCounts={departureCounts}
                    onFilterChange={updateFilter}
                    onReset={resetFilters}
                    totalResults={totalResults}
                    currency="$"
                  />
                </div>
                <div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={resetFilters}
                  >
                    Clear All
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={() => setShowMobileFilters(false)}
                  >
                    Show {totalResults} Results
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Quick Select: Best / Cheapest / Fastest */}
            {!isLoading && filteredFlights.length > 0 && (
              <div className="mb-4">
                <FlightQuickSelect
                  flights={filteredFlights}
                  currency="$"
                  onSelect={(id) => {
                    const el = document.getElementById(`flight-${id}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                />
              </div>
            )}

            {/* Flexible Dates Matrix */}
            {!isLoading && flexibleDates.length > 0 && (
              <div className="mb-4">
                <FlexibleDatesMatrix
                  dates={flexibleDates}
                  selectedDate={departureDate}
                  currency={currencySymbol}
                  onDateSelect={handleDateSelect}
                />
              </div>
            )}

            {/* Price Calendar */}
            {origin && destination && (
              <div className="mb-4">
                <PriceCalendar
                  origin={origin}
                  destination={destination}
                  selectedDate={departureDate}
                  currency={currencySymbol}
                  onDateSelect={handleDateSelect}
                />
              </div>
            )}

            {/* Weekly Price Heatmap */}
            {origin && destination && (
              <div className="mb-4">
                <WeeklyPriceHeatmap
                  origin={origin}
                  destination={destination}
                  selectedDate={departureDate}
                  currency={currencySymbol}
                  onWeekSelect={handleDateSelect}
                />
              </div>
            )}

            {/* Trip Optimizer Promotional Banner */}
            {!isLoading && (
              <div className="mb-4">
                <TripOptimizerBanner
                  origin={origin}
                  destination={destination}
                  departureDate={departureDate}
                />
              </div>
            )}

            {/* Nearby Airport Suggestion - Show if applicable */}
            {!isLoading && bestDealFlight?.nearby_airport_savings && (
              <div className="mb-4">
                <NearbyAirportSuggestion
                  airport={bestDealFlight.nearby_airport_savings.airport}
                  airportName={bestDealFlight.nearby_airport_savings.airport_name}
                  savings={bestDealFlight.nearby_airport_savings.savings}
                  currency={currencySymbol}
                />
              </div>
            )}

            {/* Results Header */}
            <div className="flex items-center justify-between mb-4 gap-4 flex-wrap">
              <div>
                {isLoading ? (
                  <p className="text-sm text-muted-foreground animate-pulse">
                    Searching for flights...
                  </p>
                ) : (
                  <div className="flex items-center gap-3">
                    <p className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground tabular-nums">
                        {totalResults.toLocaleString()}
                      </span>{" "}
                      flight{totalResults !== 1 ? 's' : ''} found
                    </p>
                    {bestDealFlight && bestDealFlight.deal_score && bestDealFlight.deal_score >= 80 && (
                      <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                        <Sparkles className="h-3.5 w-3.5" />
                        <span className="font-medium">Great deals available!</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <SortDropdown value={sortBy} onChange={setSortBy} />
            </div>

            {/* Searching Indicator */}
            {isSearching && !isLoading && (
              <div className="mb-4">
                <SearchingIndicator
                  isComplete={meta.is_complete}
                  totalFound={meta.total_found}
                  progress={searchProgress}
                />
              </div>
            )}

            {/* Flight Cards */}
            <div className="space-y-3" role="list" aria-label="Flight results">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 6 }).map((_, index) => (
                  <FlightCardSkeleton key={index} />
                ))
              ) : error ? (
                // Error state
                <EmptyFlightState
                  variant="error"
                  errorMessage={error}
                  onRetry={retry}
                />
              ) : displayedFlights.length === 0 ? (
                // Enhanced empty state with alternatives
                <EnhancedEmptyFlightResults
                  onClearFilters={resetFilters}
                  origin={origin}
                  destination={destination}
                  departureDate={departureDate}
                  returnDate={returnDate}
                />
              ) : (
                // Flight results with ad placements
                <>
                  {displayedFlights.map((flight, index) => (
                    <div key={flight.id} id={`flight-${flight.id}`}>
                      <div
                        role="listitem"
                        className="animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
                      >
                        <FlightCard
                          flight={flight}
                          currency={currencySymbol}
                          onBookNow={handleBookNow}
                        />
                      </div>
                      
                      {/* Ad after 3rd result */}
                      {index === 2 && ads.after_result_3 && (
                        <div className="my-3">
                          <AdSlot
                            ad={ads.after_result_3}
                            onImpression={trackImpression}
                            onClick={trackClick}
                          />
                        </div>
                      )}
                      
                      {/* Ad after 5th result (optional secondary placement) */}
                      {index === 4 && ads.after_result_5 && (
                        <div className="my-3">
                          <AdSlot
                            ad={ads.after_result_5}
                            onImpression={trackImpression}
                            onClick={trackClick}
                          />
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Bottom ad placement */}
                  {ads.bottom && displayedFlights.length > 0 && (
                    <div className="mt-4">
                      <AdSlot
                        ad={ads.bottom}
                        onImpression={trackImpression}
                        onClick={trackClick}
                      />
                    </div>
                  )}

                  {/* Load more sentinel for infinite scroll */}
                  {hasMore && (
                    <div id="load-more-sentinel" className="py-4">
                      <div className="flex justify-center">
                        <Button
                          variant="outline"
                          onClick={loadMore}
                          className="gap-2"
                        >
                          Load More ({filteredFlights.length - displayCount} remaining)
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Results summary at bottom */}
            {!isLoading && displayedFlights.length > 0 && !hasMore && (
              <div className="mt-6 text-center">
                <p className="text-sm text-muted-foreground">
                  Showing all {totalResults} flight{totalResults !== 1 ? 's' : ''}
                </p>
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
