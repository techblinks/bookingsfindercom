import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, SlidersHorizontal, X, Grid, List, Building2 } from "lucide-react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";
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
import { HotelSearchForm } from "@/components/hotels/HotelSearchForm";
import { trackAffiliateEvent } from "@/services/travelApi";
import {
  Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/components/ui/pagination";
import { searchHotels, getRedirectUrl, HotelResult } from "@/services/travelApi";
import { useAds } from "@/hooks/useAds";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { toast } from "sonner";

const HotelResults = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [sortOption, setSortOption] = useState("recommended");

  const destination = searchParams.get("destination") || "";
  const checkIn = searchParams.get("checkIn") || "";
  const checkOut = searchParams.get("checkOut") || "";
  const guests = searchParams.get("guests") || "2";
  const rooms = searchParams.get("rooms") || "1";
  const hasSearchParams = !!(destination && checkIn && checkOut);

  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [selectedStars, setSelectedStars] = useState<number[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [guestRating, setGuestRating] = useState(0);

  const { ads, trackImpression, trackClick } = useAds('hotels');
  const { geoData } = useGeoLocation();
  const currencyCode = geoData?.currency || "USD";
  const currencySymbol = geoData?.currencySymbol || "$";

  const handleFormSubmit = useCallback((values: { destination: string; checkIn: string; checkOut: string; adults: number; rooms: number }) => {
    const qs = new URLSearchParams();
    qs.set("destination", values.destination.trim());
    qs.set("checkIn", values.checkIn);
    qs.set("checkOut", values.checkOut);
    qs.set("guests", String(values.adults));
    qs.set("rooms", String(values.rooms));
    trackAffiliateEvent({ type: "hotel", action: "search", destination: values.destination.trim(), departureDate: values.checkIn, returnDate: values.checkOut, sourcePage: "hotel_results" });
    navigate(`/hotels?${qs.toString()}`);
  }, [navigate]);

  useEffect(() => {
    if (!hasSearchParams) { setIsLoading(false); return; }
    setIsLoading(true);
    const fetchHotels = async () => {
      try {
        const result = await searchHotels({ destination, checkIn, checkOut, guests: parseInt(guests), rooms: parseInt(rooms) });
        if (result.success) setHotels(result.results);
        else toast.error(result.error || "Failed to search hotels");
      } catch (error) {
        console.error("Hotel search error:", error);
        toast.error("An error occurred while searching for hotels");
      } finally { setIsLoading(false); }
    };
    fetchHotels();
  }, [destination, checkIn, checkOut, guests, rooms, hasSearchParams]);

  const clearFilters = () => { setPriceRange([0, 1000]); setSelectedStars([]); setSelectedAmenities([]); setGuestRating(0); };

  const filteredHotels = hotels.filter((hotel) => {
    if (hotel.price < priceRange[0] || hotel.price > priceRange[1]) return false;
    if (selectedStars.length > 0 && !selectedStars.includes(hotel.stars)) return false;
    if (guestRating > 0 && hotel.guestScore < guestRating) return false;
    return true;
  });

  const handleViewDeal = async (hotelId: string) => {
    const hotel = hotels.find(h => h.id === hotelId);
    if (!hotel) return;
    trackAffiliateEvent({ type: "hotel", action: "click", destination, hotelId: hotel.hotelId?.toString(), price: hotel.price, currency: hotel.currency, sourcePage: "hotel_results", placement: "hotel_result_card" });
    try {
      let affiliateUrl = hotel.link;
      if (!affiliateUrl) {
        const result = await getRedirectUrl({ id: hotelId, type: "hotel", destination, checkIn, checkOut, guests: parseInt(guests), hotelId: hotel.hotelId?.toString() });
        if (result.success && result.redirectUrl) affiliateUrl = result.redirectUrl;
        else { toast.error("Could not generate booking link"); return; }
      }
      window.location.href = `/redirect?url=${encodeURIComponent(affiliateUrl)}`;
    } catch (error) { console.error("Redirect error:", error); toast.error("An error occurred"); }
  };

  const totalResults = filteredHotels.length;
  const formatDate = (dateStr: string) => { if (!dateStr) return ""; return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" }); };
  const cheapestPrice = filteredHotels.length > 0 ? Math.min(...filteredHotels.map(h => h.price)) : undefined;

  // ── Pre-search state ──
  if (!hasSearchParams) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container max-w-2xl mx-auto px-4 py-12">
          <div className="text-center mb-8">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Building2 className="h-8 w-8 text-primary" aria-hidden="true" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Search hotels for your trip</h1>
            <p className="text-base text-muted-foreground max-w-md mx-auto">Compare accommodation options with our travel partner.</p>
          </div>
          <div className="bg-card rounded-2xl border border-border p-6">
            <HotelSearchForm onSubmit={handleFormSubmit} />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // ── Results state ──
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <HotelSearchSchema destination={destination} checkIn={checkIn} checkOut={checkOut} guests={parseInt(guests)} rooms={parseInt(rooms)} lowestPrice={cheapestPrice} currency={currencyCode} totalResults={totalResults} />
      <Header />
      <div className="bg-card border-b border-border">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/hotels"><Button variant="ghost" size="sm" className="gap-2"><ArrowLeft className="h-4 w-4" /><span className="hidden sm:inline">Back</span></Button></Link>
              <div>
                <h1 className="text-lg font-semibold text-foreground">Hotels in {destination}</h1>
                <p className="text-sm text-muted-foreground">{formatDate(checkIn)} - {formatDate(checkOut)} · {guests} {parseInt(guests) === 1 ? "Guest" : "Guests"} · {rooms} {parseInt(rooms) === 1 ? "Room" : "Rooms"}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center border border-border rounded-lg p-1">
                <Button variant={viewMode === "list" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("list")}><List className="h-4 w-4" /></Button>
                <Button variant={viewMode === "grid" ? "secondary" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("grid")}><Grid className="h-4 w-4" /></Button>
              </div>
              <Link to="/hotels"><Button variant="outline" size="sm">Modify Search</Button></Link>
            </div>
          </div>
        </div>
      </div>
      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="flex gap-6">
          <aside className="hidden lg:block w-72 flex-shrink-0"><div className="sticky top-6"><HotelFilters priceRange={priceRange} onPriceChange={setPriceRange} selectedStars={selectedStars} onStarsChange={setSelectedStars} selectedAmenities={selectedAmenities} onAmenitiesChange={setSelectedAmenities} guestRating={guestRating} onGuestRatingChange={setGuestRating} /></div></aside>
          <div className="lg:hidden fixed bottom-20 left-1/2 -translate-x-1/2 z-40 flex gap-2"><Button onClick={() => setShowMobileFilters(true)} className="shadow-lg gap-2"><SlidersHorizontal className="h-4 w-4" />Filters</Button><select value={sortOption} onChange={(e) => setSortOption(e.target.value)} className="h-10 px-3 bg-primary text-primary-foreground text-sm font-medium rounded-md shadow-lg appearance-none cursor-pointer"><option value="recommended">Sort</option><option value="price-low">Price ↑</option><option value="price-high">Price ↓</option><option value="rating">Rating</option></select></div>
          {showMobileFilters && (<div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/50" onClick={() => setShowMobileFilters(false)} /><div className="absolute right-0 top-0 bottom-0 w-full max-w-sm bg-background overflow-y-auto"><div className="sticky top-0 bg-background border-b border-border p-4 flex items-center justify-between"><h2 className="font-semibold">Filters</h2><Button variant="ghost" size="icon" onClick={() => setShowMobileFilters(false)}><X className="h-5 w-5" /></Button></div><div className="p-4"><HotelFilters priceRange={priceRange} onPriceChange={setPriceRange} selectedStars={selectedStars} onStarsChange={setSelectedStars} selectedAmenities={selectedAmenities} onAmenitiesChange={setSelectedAmenities} guestRating={guestRating} onGuestRatingChange={setGuestRating} /></div><div className="sticky bottom-0 bg-background border-t border-border p-4 flex gap-3"><Button variant="outline" className="flex-1" onClick={clearFilters}>Clear All</Button><Button className="flex-1" onClick={() => setShowMobileFilters(false)}>Show Results</Button></div></div></div>)}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4"><p className="text-sm text-muted-foreground">{isLoading ? "Searching for hotels..." : (<span><span className="font-semibold text-foreground">{totalResults}</span> properties found</span>)}</p></div>
            {!isLoading && filteredHotels.length > 0 && (<div className="mb-4"><HotelQuickSelect hotels={filteredHotels} currency={currencySymbol} onSelect={(id) => { const el = document.getElementById(`hotel-${id}`); el?.scrollIntoView({ behavior: "smooth", block: "center" }); }} /></div>)}
            <div className={viewMode === "grid" ? "grid md:grid-cols-2 gap-4" : "space-y-4"}>
              {isLoading ? Array.from({ length: 4 }).map((_, index) => (<HotelCardSkeleton key={index} />)) : filteredHotels.length === 0 ? (<EnhancedEmptyHotelResults onClearFilters={clearFilters} destination={destination} checkIn={checkIn} checkOut={checkOut} guests={parseInt(guests)} rooms={parseInt(rooms)} />) : (<>{filteredHotels.map((hotel, index) => (<div key={hotel.id} id={`hotel-${hotel.id}`}><HotelResultCard {...hotel} currency={currencySymbol} onViewDeal={handleViewDeal} />{index === 2 && ads.after_result_3 && (<div className="mt-4"><AdSlot ad={ads.after_result_3} onImpression={trackImpression} onClick={trackClick} /></div>)}</div>))}{ads.bottom && filteredHotels.length > 0 && (<div className="mt-4"><AdSlot ad={ads.bottom} onImpression={trackImpression} onClick={trackClick} /></div>)}</>)}
            </div>
            {!isLoading && filteredHotels.length > 0 && (<div className="mt-8"><Pagination><PaginationContent><PaginationItem><PaginationPrevious href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(Math.max(1, currentPage - 1)); }} /></PaginationItem><PaginationItem><PaginationLink href="#" isActive={currentPage === 1} onClick={(e) => { e.preventDefault(); setCurrentPage(1); }}>1</PaginationLink></PaginationItem><PaginationItem><PaginationNext href="#" onClick={(e) => { e.preventDefault(); setCurrentPage(currentPage + 1); }} /></PaginationItem></PaginationContent></Pagination></div>)}
            {!isLoading && filteredHotels.length > 0 && (<p className="mt-6 text-xs text-muted-foreground leading-relaxed text-center max-w-xl mx-auto">Prices and availability are confirmed by the booking provider. BookingsFinder may earn a commission when you use a partner link, at no extra cost to you.</p>)}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HotelResults;
