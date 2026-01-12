import { useState } from "react";
import { ArrowLeft, SlidersHorizontal, X, Grid, List } from "lucide-react";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HotelFilters from "@/components/filters/HotelFilters";
import HotelResultCard from "@/components/cards/HotelResultCard";
import HotelCardSkeleton from "@/components/skeletons/HotelCardSkeleton";
import EmptyHotelResults from "@/components/states/EmptyHotelResults";
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

// Mock hotel data - ready for API injection
const mockHotels = [
  {
    id: "ht-1",
    name: "The Grand Plaza Hotel",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    location: "Downtown Los Angeles, 0.5 mi from center",
    stars: 5,
    guestScore: 9.2,
    reviewCount: 2341,
    price: 289,
    originalPrice: 349,
    currency: "$",
    amenities: ["wifi", "parking", "breakfast", "gym", "pool"],
    isDeal: true,
  },
  {
    id: "ht-2",
    name: "Oceanview Resort & Spa",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    location: "Santa Monica Beach, 2.1 mi from center",
    stars: 4,
    guestScore: 8.8,
    reviewCount: 1892,
    price: 245,
    currency: "$",
    amenities: ["wifi", "parking", "pool", "restaurant"],
    isDeal: false,
  },
  {
    id: "ht-3",
    name: "Urban Boutique Suites",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    location: "Hollywood, 1.8 mi from center",
    stars: 4,
    guestScore: 8.4,
    reviewCount: 967,
    price: 159,
    currency: "$",
    amenities: ["wifi", "breakfast"],
    isDeal: false,
  },
  {
    id: "ht-4",
    name: "Sunset Tower Hotel",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
    location: "West Hollywood, 1.2 mi from center",
    stars: 5,
    guestScore: 9.5,
    reviewCount: 3156,
    price: 425,
    originalPrice: 499,
    currency: "$",
    amenities: ["wifi", "parking", "breakfast", "gym", "pool", "restaurant"],
    isDeal: true,
  },
  {
    id: "ht-5",
    name: "Marina Bay Inn",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
    location: "Marina del Rey, 3.5 mi from center",
    stars: 3,
    guestScore: 7.8,
    reviewCount: 542,
    price: 119,
    currency: "$",
    amenities: ["wifi", "parking"],
    isDeal: false,
  },
  {
    id: "ht-6",
    name: "Beverly Hills Luxury Suites",
    image: "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=800&q=80",
    location: "Beverly Hills, 4.2 mi from center",
    stars: 5,
    guestScore: 9.1,
    reviewCount: 1823,
    price: 599,
    currency: "$",
    amenities: ["wifi", "parking", "breakfast", "gym", "pool", "restaurant"],
    isDeal: false,
  },
];

// Placeholder redirect function - ready for implementation
const handleViewDeal = (hotelId: string) => {
  console.log(`Redirecting to hotel details page: ${hotelId}`);
  // TODO: Implement actual redirect logic
  // window.location.href = `/hotels/${hotelId}`;
};

const HotelResults = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  // Filter states
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [guestRating, setGuestRating] = useState(0);

  // Simulate empty state for testing - set to true to see empty state
  const [showEmptyState] = useState(false);

  const clearFilters = () => {
    setPriceRange([0, 1000]);
    setSelectedStars([]);
    setSelectedAmenities([]);
    setGuestRating(0);
  };

  const hotels = showEmptyState ? [] : mockHotels;
  const totalResults = hotels.length;

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
                  Hotels in Los Angeles
                </h1>
                <p className="text-sm text-muted-foreground">
                  Jan 15 - Jan 18 · 2 Guests · 1 Room
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
              <Button variant="outline" size="sm">
                Modify Search
              </Button>
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
              ) : hotels.length === 0 ? (
                // Empty state
                <EmptyHotelResults onClearFilters={clearFilters} />
              ) : (
                // Hotel results
                hotels.map((hotel) => (
                  <HotelResultCard
                    key={hotel.id}
                    {...hotel}
                    onViewDeal={handleViewDeal}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && hotels.length > 0 && (
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

export default HotelResults;
