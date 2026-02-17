import { useState, useEffect } from "react";
import { ArrowLeft, SlidersHorizontal, X, Grid, List, ArrowUpDown } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HotelFilters from "@/components/filters/HotelFilters";
import HotelResultCard from "@/components/cards/HotelResultCard";
import HotelCardSkeleton from "@/components/skeletons/HotelCardSkeleton";
import EnhancedEmptyHotelResults from "@/components/states/EnhancedEmptyHotelResults";
import HotelSearchSchema from "@/components/seo/HotelSearchSchema";
import { AdSlot } from "@/components/ads/AdSlot";
import { Button } from "@/components/ui/button";
import HotelQuickSelect from "@/components/hotels/HotelQuickSelect";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { searchHotels, getRedirectUrl, HotelResult } from "@/services/travelApi";
import { useAds } from "@/hooks/useAds";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { toast } from "sonner";

const HotelResults = () => {
  const [searchParams] = useSearchParams();
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortOption, setSortOption] = useState("recommended");

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

  // Fetch ads (lazy loaded, non-blocking)
  const { ads, trackImpression, trackClick } = useAds('hotels');

  // Get geo-based currency
  const { geoData } = useGeoLocation();
  const currencyCode = geoData?.currency || "USD";
  const currencySymbol = geoData?.currencySymbol || "$";

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
      let affiliateUrl = hotel.link;
      
      // If no direct link, get one from the API
      if (!affiliateUrl) {
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
          affiliateUrl = result.redirectUrl;
        } else {
          toast.error("Could not generate booking link");
          return;
        }
      }

      // Always route through the interstitial page (production-safe)
      const interstitialUrl = `/redirect?url=${encodeURIComponent(affiliateUrl)}`;
      window.location.href = interstitialUrl;
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
        currency={currencyCode}
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

          {/* Mobile Filter & Sort Buttons - positioned above bottom nav */}
          <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex gap-2">
            <Button
              onClick={() => setShowMobileFilters(true)}
              className="shadow-lg gap-2"
            >
              <SlidersHorizontal className="h-4 w-4" />
              Filters
            </Button>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className="h-10 px-3 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow-lg appearance-none cursor-pointer"
            >
              <option value="recommended">Sort</option>
              <option value="price-low">Price ↑</option>
              <option value="price-high">Price ↓</option>
              <option value="rating">Rating</option>
            </select>
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

            {/* Quick Select: Best Rated / Cheapest / Best Value */}
            {!isLoading && filteredHotels.length > 0 && (
              <div className="mb-4">
                <HotelQuickSelect
                  hotels={filteredHotels}
                  currency={currencySymbol}
                  onSelect={(id) => {
                    const el = document.getElementById(`hotel-${id}`);
                    el?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                />
              </div>
            )}

            {/* Hotel Cards */}
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
              {isLoading ? (
                // Loading skeletons
                Array.from({ length: 4 }).map((_, index) => (
                  <HotelCardSkeleton key={index} />
                ))
              ) : filteredHotels.length === 0 ? (
                // Enhanced empty state
                <EnhancedEmptyHotelResults 
                  onClearFilters={clearFilters}
                  destination={destination}
                  checkIn={checkIn}
                  checkOut={checkOut}
                  guests={parseInt(guests)}
                  rooms={parseInt(rooms)}
                />
              ) : (
                // Hotel results with ad placements
                <>
                  {filteredHotels.map((hotel, index) => (
                    <div key={hotel.id} id={`hotel-${hotel.id}`}>
                      <HotelResultCard
                        {...hotel}
                        currency={currencySymbol}
                        onViewDeal={handleViewDeal}
                      />
                      
                      {/* Ad after 3rd result */}
                      {index === 2 && ads.after_result_3 && (
                        <div className="mt-4">
                          <AdSlot
                            ad={ads.after_result_3}
                            onImpression={trackImpression}
                            onClick={trackClick}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Bottom ad placement */}
                  {ads.bottom && filteredHotels.length > 0 && (
                    <div className="mt-4">
                      <AdSlot
                        ad={ads.bottom}
                        onImpression={trackImpression}
                        onClick={trackClick}
                      />
                    </div>
                  )}
                </>
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
