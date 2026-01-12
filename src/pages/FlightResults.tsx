import { useState, useEffect } from "react";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import FlightFilters from "@/components/filters/FlightFilters";
import FlightResultCard from "@/components/cards/FlightResultCard";
import FlightCardSkeleton from "@/components/skeletons/FlightCardSkeleton";
import EmptyFlightResults from "@/components/states/EmptyFlightResults";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { searchFlights, getRedirectUrl, FlightResult } from "@/services/travelApi";
import { toast } from "sonner";

const FlightResults = () => {
  const [searchParams] = useSearchParams();
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
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
    setPriceRange([0, 2000]);
    setSelectedAirlines([]);
    setSelectedStops([]);
    setSelectedDepartureTimes([]);
  };

  // Apply filters
  const filteredFlights = flights.filter((flight) => {
    // Price filter
    if (flight.price < priceRange[0] || flight.price > priceRange[1]) {
      return false;
    }
    // Airlines filter
    if (selectedAirlines.length > 0 && !selectedAirlines.includes(flight.airline)) {
      return false;
    }
    // Stops filter
    if (selectedStops.length > 0 && !selectedStops.includes(flight.stops)) {
      return false;
    }
    return true;
  });

  const handleBookNow = async (flightId: string) => {
    const flight = flights.find(f => f.id === flightId);
    if (!flight) return;

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

  const totalResults = filteredFlights.length;

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  };

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
              <div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background overflow-y-auto">
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
                    Show Results
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Results */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="flex items-center justify-between mb-4">
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
              <select className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground">
                <option>Sort by: Best</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Duration: Shortest</option>
                <option>Departure: Earliest</option>
              </select>
            </div>

            {/* Flight Cards */}
            <div className="space-y-4">
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 5 }).map((_, index) => (
                  <FlightCardSkeleton key={index} />
                ))
              ) : filteredFlights.length === 0 ? (
                // Empty state
                <EmptyFlightResults onClearFilters={clearFilters} />
              ) : (
                // Flight results
                filteredFlights.map((flight) => (
                  <FlightResultCard
                    key={flight.id}
                    {...flight}
                    currency="$"
                    onBookNow={handleBookNow}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && filteredFlights.length > 0 && (
              <div className="mt-8">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(Math.max(1, currentPage - 1));
                        }}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === 1}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(1);
                        }}
                      >
                        1
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(currentPage + 1);
                        }}
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
