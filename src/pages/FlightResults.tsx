import { useState, useEffect, useMemo } from "react";
import { ArrowLeft, SlidersHorizontal, X, ArrowUpDown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FlightFilters from "@/components/filters/FlightFilters";
import FlightResultCard from "@/components/cards/FlightResultCard";
import FlightCardSkeleton from "@/components/skeletons/FlightCardSkeleton";
import EmptyFlightResults from "@/components/states/EmptyFlightResults";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { searchFlights, getRedirectUrl, trackAffiliateEvent, FlightResult } from "@/services/travelApi";
import { toast } from "sonner";

type SortOption = "best" | "price-asc" | "price-desc" | "duration" | "departure";

const FlightResults = () => {
  const [searchParams] = useSearchParams();
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState<SortOption>("best");
  const resultsPerPage = 10;
  
  // Search params
  const origin = searchParams.get("origin") || "";
  const destination = searchParams.get("destination") || "";
  const departureDate = searchParams.get("departureDate") || "";
  const returnDate = searchParams.get("returnDate") || "";
  const passengers = searchParams.get("passengers") || "1";
  const cabinClass = searchParams.get("cabinClass") || "economy";

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedStops, setSelectedStops] = useState<number[]>([]);
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[]>([]);

  useEffect(() => {
    const fetchFlights = async () => {
      if (!origin || !destination || !departureDate) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await searchFlights({
          origin,
          destination,
          departureDate,
          returnDate: returnDate || undefined,
          passengers: parseInt(passengers),
          cabinClass,
        });

        if (result.success) {
          setFlights(result.results);
          // Update price range based on actual results
          if (result.results.length > 0) {
            const prices = result.results.map(f => f.price);
            const minPrice = Math.floor(Math.min(...prices));
            const maxPrice = Math.ceil(Math.max(...prices));
            setPriceRange([minPrice, maxPrice + 100]);
          }
        } else {
          toast.error(result.error || "Failed to search flights");
        }
      } catch (error) {
        console.error("Flight search error:", error);
        toast.error("An error occurred while searching for flights");
      } finally {
        setIsLoading(false);
      }
    };

    fetchFlights();
  }, [origin, destination, departureDate, returnDate, passengers, cabinClass]);

  const clearFilters = () => {
    if (flights.length > 0) {
      const prices = flights.map(f => f.price);
      setPriceRange([Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices)) + 100]);
    } else {
      setPriceRange([0, 2000]);
    }
    setSelectedAirlines([]);
    setSelectedStops([]);
    setSelectedDepartureTimes([]);
  };

  // Apply filters and sorting
  const filteredAndSortedFlights = useMemo(() => {
    let result = flights.filter((flight) => {
      // Price filter
      if (flight.price < priceRange[0] || flight.price > priceRange[1]) {
        return false;
      }
      // Airlines filter
      if (selectedAirlines.length > 0 && !selectedAirlines.includes(flight.airlineCode || flight.airline)) {
        return false;
      }
      // Stops filter
      if (selectedStops.length > 0 && !selectedStops.includes(flight.stops)) {
        return false;
      }
      return true;
    });

    // Sort
    switch (sortBy) {
      case "price-asc":
        result = [...result].sort((a, b) => a.price - b.price);
        break;
      case "price-desc":
        result = [...result].sort((a, b) => b.price - a.price);
        break;
      case "duration":
        result = [...result].sort((a, b) => {
          const parseDuration = (d: string) => {
            const match = d.match(/(\d+)h\s*(\d+)?m?/);
            if (!match) return Infinity;
            return parseInt(match[1]) * 60 + (parseInt(match[2]) || 0);
          };
          return parseDuration(a.duration) - parseDuration(b.duration);
        });
        break;
      case "departure":
        result = [...result].sort((a, b) => {
          const parseTime = (t: string) => {
            const [h, m] = t.split(":").map(Number);
            return h * 60 + (m || 0);
          };
          return parseTime(a.departureTime) - parseTime(b.departureTime);
        });
        break;
      case "best":
      default:
        // Best = combination of price and stops (prefer nonstop + low price)
        result = [...result].sort((a, b) => {
          const scoreA = a.price + a.stops * 50;
          const scoreB = b.price + b.stops * 50;
          return scoreA - scoreB;
        });
        break;
    }

    return result;
  }, [flights, priceRange, selectedAirlines, selectedStops, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedFlights.length / resultsPerPage);
  const paginatedFlights = filteredAndSortedFlights.slice(
    (currentPage - 1) * resultsPerPage,
    currentPage * resultsPerPage
  );

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
      airlineCode: flight.airlineCode,
      flightNumber: flight.flightNumber,
      price: flight.price,
      currency: 'USD',
    });

    try {
      // If the API returned a direct link, use it
      if (flight.link) {
        const result = await getRedirectUrl({
          id: flightId,
          type: 'flight',
          link: flight.link,
        });
        if (result.success && result.redirectUrl) {
          window.open(result.redirectUrl, '_blank');
          return;
        }
      }

      // Fallback: build redirect URL with search params
      const result = await getRedirectUrl({
        id: flightId,
        type: 'flight',
        origin,
        destination,
        departureDate,
        returnDate: returnDate || undefined,
        airline: flight.airlineCode,
      });

      if (result.success && result.redirectUrl) {
        window.open(result.redirectUrl, '_blank');
      } else {
        toast.error("Could not generate booking link");
      }
    } catch (error) {
      console.error("Redirect error:", error);
      toast.error("An error occurred");
    }
  };

  const totalResults = filteredAndSortedFlights.length;

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

  // Get unique airlines for filter
  const uniqueAirlines = useMemo(() => {
    const airlines = new Set(flights.map(f => f.airlineCode || f.airline));
    return Array.from(airlines);
  }, [flights]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Search Summary Bar */}
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Back</span>
                </Button>
              </Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground">
                  {origin} → {destination}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(departureDate)}{returnDate ? ` - ${formatDate(returnDate)}` : ""} · {passengers} {parseInt(passengers) === 1 ? "Adult" : "Adults"} · {cabinClass.charAt(0).toUpperCase() + cabinClass.slice(1)}
                </p>
              </div>
            </div>
            <Link to="/">
              <Button variant="outline" size="sm">
                Modify Search
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-6">
              <FlightFilters
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                selectedAirlines={selectedAirlines}
                onAirlinesChange={setSelectedAirlines}
                selectedStops={selectedStops}
                onStopsChange={setSelectedStops}
                selectedDepartureTimes={selectedDepartureTimes}
                onDepartureTimesChange={setSelectedDepartureTimes}
              />
            </div>
          </aside>

          {/* Mobile Filter Button */}
          <div className="lg:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40">
            <Button
              onClick={() => setShowMobileFilters(true)}
              className="shadow-lg gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
          </div>

          {/* Mobile Filter Drawer */}
          {showMobileFilters && (
            <div className="fixed inset-0 z-50 lg:hidden">
              <div
                className="absolute inset-0 bg-black/50"
                onClick={() => setShowMobileFilters(false)}
              />
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background overflow-y-auto animate-slide-in-right">
                <div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between">
                  <h2 className="font-semibold">Filters</h2>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowMobileFilters(false)}
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>
                <div className="p-4">
                  <FlightFilters
                    priceRange={priceRange}
                    onPriceChange={setPriceRange}
                    selectedAirlines={selectedAirlines}
                    onAirlinesChange={setSelectedAirlines}
                    selectedStops={selectedStops}
                    onStopsChange={setSelectedStops}
                    selectedDepartureTimes={selectedDepartureTimes}
                    onDepartureTimesChange={setSelectedDepartureTimes}
                  />
                </div>
                <div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={clearFilters}
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
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4 gap-4">
              <p className="text-sm text-muted-foreground">
                {isLoading ? (
                  "Searching for flights..."
                ) : (
                  <span>
                    <span className="font-semibold text-foreground">
                      {totalResults}
                    </span>{" "}
                    flights found
                  </span>
                )}
              </p>
              <Select value={sortBy} onValueChange={(v) => { setSortBy(v as SortOption); setCurrentPage(1); }}>
                <SelectTrigger className="w-48">
                  <ArrowUpDown className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="best">Best</SelectItem>
                  <SelectItem value="price-asc">Price: Low to High</SelectItem>
                  <SelectItem value="price-desc">Price: High to Low</SelectItem>
                  <SelectItem value="duration">Duration: Shortest</SelectItem>
                  <SelectItem value="departure">Departure: Earliest</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Flight Cards */}
            <div className="space-y-4">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, index) => (
                  <FlightCardSkeleton key={index} />
                ))
              ) : paginatedFlights.length === 0 ? (
                // Empty state
                <EmptyFlightResults onClearFilters={clearFilters} />
              ) : (
                // Flight results
                paginatedFlights.map((flight, index) => (
                  <div key={flight.id} style={{ animationDelay: `${index * 50}ms` }}>
                    <FlightResultCard
                      {...flight}
                      currency="$"
                      onBookNow={handleBookNow}
                    />
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && totalPages > 1 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Math.max(1, currentPage - 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={currentPage === 1 ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <PaginationItem key={pageNum}>
                          <PaginationLink
                            href="#"
                            isActive={currentPage === pageNum}
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(pageNum);
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                          >
                            {pageNum}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Math.min(totalPages, currentPage + 1));
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }}
                        className={currentPage === totalPages ? "pointer-events-none opacity-50" : ""}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
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
