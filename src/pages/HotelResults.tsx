import { useState, useEffect } from "react";
import { ArrowLeft, SlidersHorizontal, X, Grid, List } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HotelFilters from "@/components/filters/HotelFilters";
import HotelResultCard from "@/components/cards/HotelResultCard";
import HotelCardSkeleton from "@/components/skeletons/HotelCardSkeleton";
import EmptyHotelResults from "@/components/states/EmptyHotelResults";
import HotelSearchSchema from "@/components/seo/HotelSearchSchema";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { searchHotels, getRedirectUrl, HotelResult } from "@/services/travelApi";
import { toast } from "sonner";

const HotelResults = () => {
  const [searchParams] = useSearchParams();
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Search params
  const destination = searchParams.get("destination") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = searchParams.get("guests") || "2";
  const rooms = searchParams.get("rooms") || "1";

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [guestRating, setGuestRating] = useState(0);

  useEffect(() => {
    const fetchHotels = async () => {
      if (!destination || !checkIn || !checkOut) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const result = await searchHotels({
          destination,
          checkIn,
          checkOut,
          guests: parseInt(guests),
          rooms: parseInt(rooms),
        });

        if (result.success) {
          setHotels(result.results);
        } else {
          toast.error(result.error || "Failed to search hotels");
        }
      } catch (error) {
        console.error("Hotel search error:", error);
        toast.error("An error occurred while searching for hotels");
      } finally {
        setIsLoading(false);
      }
    };

    fetchHotels();
  }, [destination, checkIn, checkOut, guests, rooms]);

  const clearFilters = () => {
    setPriceRange([0, 1000]);
    setSelectedStars([]);
    setSelectedAmenities([]);
    setGuestRating(0);
  };

  // Apply filters
  const filteredHotels = hotels.filter((hotel) => {
    // Price filter
    if (hotel.price < priceRange[0] || hotel.price > priceRange[1]) {
      return false;
    }
    // Stars filter
    if (selectedStars.length > 0 && !selectedStars.includes(hotel.stars)) {
      return false;
    }
    // Guest rating filter
    if (guestRating > 0 && hotel.guestScore < guestRating) {
      return false;
    }
    return true;
  });

  const handleViewDeal = async (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId);
    if (!hotel) return;

    try {
      // If the API returned a direct link, use it
      if (hotel.link) {
        window.open(hotel.link, '_blank');
        return;
      }

      // Fallback: build redirect URL with search params
      const result = await getRedirectUrl({
        id: hotelId,
        type: 'hotel',
        destination,
        checkIn,
        checkOut,
        guests: parseInt(guests),
        hotelId: hotel.hotelId?.toString(),
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

  const totalResults = filteredHotels.length;

  // Format date for display
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  // Get cheapest price for SEO
  const cheapestPrice = filteredHotels.length > 0 
    ? Math.min(...filteredHotels.map(h => h.price))
    : undefined;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* SEO Schema Markup */}
      <HotelSearchSchema
        destination={destination}
        checkIn={checkIn}
        checkOut={checkOut}
        guests={parseInt(guests)}
        rooms={parseInt(rooms)}
        lowestPrice={cheapestPrice}
        currency="USD"
        totalResults={totalResults}
      />

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
                  Hotels in {destination}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {formatDate(checkIn)} - {formatDate(checkOut)} · {guests} {parseInt(guests) === 1 ? "Guest" : "Guests"} · {rooms} {parseInt(rooms) === 1 ? "Room" : "Rooms"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center border border-border rounded-lg p-1">
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setViewMode("grid")}
                >
                  <Grid className="h-4 w-4" />
                </Button>
              </div>
              <Link to="/">
                <Button variant="outline" size="sm">
                  Modify Search
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Desktop Sidebar Filters */}
          <aside className="hidden lg:block w-72 flex-shrink-0">
            <div className="sticky top-6">
              <HotelFilters
                priceRange={priceRange}
                onPriceChange={setPriceRange}
                selectedStars={selectedStars}
                onStarsChange={setSelectedStars}
                selectedAmenities={selectedAmenities}
                onAmenitiesChange={setSelectedAmenities}
                guestRating={guestRating}
                onGuestRatingChange={setGuestRating}
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
                  <HotelFilters
                    priceRange={priceRange}
                    onPriceChange={setPriceRange}
                    selectedStars={selectedStars}
                    onStarsChange={setSelectedStars}
                    selectedAmenities={selectedAmenities}
                    onAmenitiesChange={setSelectedAmenities}
                    guestRating={guestRating}
                    onGuestRatingChange={setGuestRating}
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
                  "Searching for hotels..."
                ) : (
                  <span>
                    <span className="font-semibold text-foreground">
                      {totalResults}
                    </span>{" "}
                    properties found
                  </span>
                )}
              </p>
              <select className="text-sm border border-border rounded-lg px-3 py-2 bg-background text-foreground">
                <option>Sort by: Recommended</option>
                <option>Price: Low to High</option>
                <option>Price: High to Low</option>
                <option>Guest Rating</option>
                <option>Star Rating</option>
              </select>
            </div>

            {/* Hotel Cards */}
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 4 }).map((_, index) => (
                  <HotelCardSkeleton key={index} />
                ))
              ) : filteredHotels.length === 0 ? (
                // Empty state
                <EmptyHotelResults onClearFilters={clearFilters} />
              ) : (
                // Hotel results
                filteredHotels.map((hotel) => (
                  <HotelResultCard
                    key={hotel.id}
                    {...hotel}
                    currency="$"
                    onViewDeal={handleViewDeal}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && filteredHotels.length > 0 && (
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

export default HotelResults;
