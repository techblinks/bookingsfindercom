import { useState } from "react";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { Link } from "react-router-dom";
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

// Mock flight data - ready for API injection
const mockFlights = [
  {
    id: "fl-1",
    airline: "Delta Air Lines",
    departureTime: "06:30",
    arrivalTime: "09:45",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 15m",
    stops: 0,
    price: 289,
    currency: "$",
    isDeal: true,
  },
  {
    id: "fl-2",
    airline: "United Airlines",
    departureTime: "08:15",
    arrivalTime: "14:30",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "6h 15m",
    stops: 1,
    price: 245,
    currency: "$",
    isDeal: false,
  },
  {
    id: "fl-3",
    airline: "American Airlines",
    departureTime: "10:00",
    arrivalTime: "13:20",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 20m",
    stops: 0,
    price: 312,
    currency: "$",
    isDeal: false,
  },
  {
    id: "fl-4",
    airline: "Southwest",
    departureTime: "14:45",
    arrivalTime: "21:15",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "6h 30m",
    stops: 1,
    price: 198,
    currency: "$",
    isDeal: true,
  },
  {
    id: "fl-5",
    airline: "JetBlue",
    departureTime: "16:30",
    arrivalTime: "19:50",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 20m",
    stops: 0,
    price: 329,
    currency: "$",
    isDeal: false,
  },
  {
    id: "fl-6",
    airline: "Delta Air Lines",
    departureTime: "19:00",
    arrivalTime: "22:25",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 25m",
    stops: 0,
    price: 275,
    currency: "$",
    isDeal: false,
  },
];

// Placeholder redirect function - ready for implementation
const handleBookNow = (flightId: string) => {
  console.log(`Redirecting to booking page for flight: ${flightId}`);
  // TODO: Implement actual redirect logic
  // window.location.href = `/booking/${flightId}`;
};

const FlightResults = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000]);
  const [selectedAirlines, setSelectedAirlines] = useState<string[]>([]);
  const [selectedStops, setSelectedStops] = useState<number[]>([]);
  const [selectedDepartureTimes, setSelectedDepartureTimes] = useState<string[]>([]);

  // Simulate empty state for testing - set to true to see empty state
  const [showEmptyState] = useState(false);

  const clearFilters = () => {
    setPriceRange([0, 2000]);
    setSelectedAirlines([]);
    setSelectedStops([]);
    setSelectedDepartureTimes([]);
  };

  const flights = showEmptyState ? [] : mockFlights;
  const totalResults = flights.length;

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
                  New York (JFK) → Los Angeles (LAX)
                </h1>
                <p className="text-sm text-muted-foreground">
                  Mon, Jan 15 · 1 Adult · Economy
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm">
              Modify Search
            </Button>
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
              ) : flights.length === 0 ? (
                // Empty state
                <EmptyFlightResults onClearFilters={clearFilters} />
              ) : (
                // Flight results
                flights.map((flight) => (
                  <FlightResultCard
                    key={flight.id}
                    {...flight}
                    onBookNow={handleBookNow}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && flights.length > 0 && (
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
                      <PaginationLink
                        href="#"
                        isActive={currentPage === 2}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(2);
                        }}
                      >
                        2
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationLink
                        href="#"
                        isActive={currentPage === 3}
                        onClick={(e) => {
                          e.preventDefault();
                          setCurrentPage(3);
                        }}
                      >
                        3
                      </PaginationLink>
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationEllipsis />
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
