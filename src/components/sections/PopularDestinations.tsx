import { useState, useEffect } from "react";
import { Plane, ArrowRight, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import FlipBoard from "@/components/ui/FlipBoard";

interface DestinationDeal {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  country: string;
  price?: number | null;
  loading?: boolean;
  image: string;
}

// Destination images mapping
const destinationImages: Record<string, string> = {
  // Popular destinations
  "BOM": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?w=800&q=80", // Mumbai
  "DEL": "https://images.unsplash.com/photo-1587474260584-136574528ed5?w=800&q=80", // Delhi
  "BLR": "https://images.unsplash.com/photo-1596176530529-78163a4f7af2?w=800&q=80", // Bangalore
  "MAA": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?w=800&q=80", // Chennai
  "CCU": "https://images.unsplash.com/photo-1558431382-27e303142255?w=800&q=80", // Kolkata
  "GOI": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?w=800&q=80", // Goa
  "SYD": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=800&q=80", // Sydney
  "MEL": "https://images.unsplash.com/photo-1514395462725-fb4566210144?w=800&q=80", // Melbourne
  "SIN": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?w=800&q=80", // Singapore
  "BKK": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=800&q=80", // Bangkok
  "HKT": "https://images.unsplash.com/photo-1589394815804-964ed0be2eb5?w=800&q=80", // Phuket
  "DXB": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=800&q=80", // Dubai
  "LON": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80", // London
  "LHR": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800&q=80", // London Heathrow
  "CDG": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&q=80", // Paris
  "JFK": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=800&q=80", // New York
  "LAX": "https://images.unsplash.com/photo-1534190760961-74e8c1c5c3da?w=800&q=80", // Los Angeles
  "MIA": "https://images.unsplash.com/photo-1506966953602-c20cc11f75e3?w=800&q=80", // Miami
  "NRT": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800&q=80", // Tokyo
  "ICN": "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=800&q=80", // Seoul
  "KTM": "https://images.unsplash.com/photo-1558799401-1dcba79f0f5b?w=800&q=80", // Kathmandu
  "AKL": "https://images.unsplash.com/photo-1507699622108-4be3abd695ad?w=800&q=80", // Auckland
  "FJI": "https://images.unsplash.com/photo-1581974944026-5d6ed762f617?w=800&q=80", // Fiji
  "HNL": "https://images.unsplash.com/photo-1507876466758-bc54f384809c?w=800&q=80", // Honolulu
  "BCN": "https://images.unsplash.com/photo-1583422409516-2895a77efded?w=800&q=80", // Barcelona
  "ROM": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80", // Rome
  "FCO": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=800&q=80", // Rome
  "AMS": "https://images.unsplash.com/photo-1534351590666-13e3e96b5017?w=800&q=80", // Amsterdam
};

const getDestinationImage = (code: string): string => {
  return destinationImages[code] || "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?w=800&q=80";
};

const getCountryFromCity = (cityName: string): string => {
  const parts = cityName.split(", ");
  return parts[parts.length - 1] || cityName;
};

const PopularDestinations = () => {
  const { geoData, regionConfig, loading: geoLoading } = useGeoLocation();
  const [destinations, setDestinations] = useState<DestinationDeal[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [scrollPosition, setScrollPosition] = useState(0);

  const departureDate = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const returnDate = format(addDays(new Date(), 21), "yyyy-MM-dd");

  useEffect(() => {
    const initialDestinations = regionConfig.popularRoutes.map((route) => ({
      ...route,
      country: getCountryFromCity(route.destinationName),
      loading: true,
      price: null,
      image: getDestinationImage(route.destination),
    }));
    setDestinations(initialDestinations);
  }, [regionConfig]);

  useEffect(() => {
    const fetchPrices = async () => {
      if (destinations.length === 0 || pricesLoading) return;
      
      const hasLoadingDestinations = destinations.some(d => d.loading);
      if (!hasLoadingDestinations) return;

      setPricesLoading(true);

      try {
        const routes = destinations.map((dest) => ({
          origin: dest.origin,
          destination: dest.destination,
          departureDate,
          returnDate,
        }));

        const { data, error } = await supabase.functions.invoke("get-route-prices", {
          body: { routes },
        });

        if (error) {
          console.error("Error fetching prices:", error);
          setDestinations((prev) => prev.map((dest) => ({ ...dest, loading: false })));
          return;
        }

        if (data?.prices) {
          setDestinations((prev) =>
            prev.map((dest) => {
              const priceData = data.prices.find(
                (p: { origin: string; destination: string; price: number | null }) =>
                  p.origin === dest.origin && p.destination === dest.destination
              );
              return {
                ...dest,
                price: priceData?.price ?? null,
                loading: false,
              };
            })
          );
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
        setDestinations((prev) => prev.map((dest) => ({ ...dest, loading: false })));
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, [destinations.length, departureDate, returnDate]);

  const getBookingUrl = (dest: DestinationDeal) => {
    const params = new URLSearchParams({
      origin: dest.origin,
      destination: dest.destination,
      departureDate,
      returnDate,
      passengers: "1",
      cabinClass: "economy",
    });
    return `/flights?${params.toString()}`;
  };

  const scroll = (direction: "left" | "right") => {
    const container = document.getElementById("destinations-scroll");
    if (container) {
      const scrollAmount = 320;
      const newPosition = direction === "left" 
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
      container.scrollTo({ left: newPosition, behavior: "smooth" });
      setScrollPosition(newPosition);
    }
  };

  if (geoLoading) {
    return (
      <section className="py-12 md:py-16">
        <div className="container">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16">
      <div className="container">
        <div className="bg-card rounded-2xl p-6 md:p-8 shadow-lg border border-border">
          {/* Header */}
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Popular destinations
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                from {geoData?.city || geoData?.country || "your location"}
              </p>
            </div>
            
            {/* Navigation arrows */}
            <div className="hidden md:flex items-center gap-2">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 rounded-full"
                onClick={() => scroll("left")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-9 w-9 rounded-full"
                onClick={() => scroll("right")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Destinations grid/scroll */}
          <div 
            id="destinations-scroll"
            className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:grid md:grid-cols-4 md:overflow-visible md:pb-0"
            onScroll={(e) => setScrollPosition((e.target as HTMLDivElement).scrollLeft)}
          >
            {destinations.map((dest, index) => (
              <a
                key={`${dest.origin}-${dest.destination}-${index}`}
                href={getBookingUrl(dest)}
                className={cn(
                  "group flex-shrink-0 w-[200px] md:w-auto",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Image */}
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden mb-3">
                  <img
                    src={dest.image}
                    alt={dest.destinationName}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                </div>

                {/* Info */}
                <div>
                  <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                    {dest.country}
                  </h3>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
                    <Plane className="h-3.5 w-3.5" />
                    {dest.loading ? (
                      <span className="text-muted-foreground">Loading...</span>
                    ) : dest.price ? (
                      <span>
                        from <span className="font-semibold text-success">${dest.price}</span>
                      </span>
                    ) : (
                      <span>View prices</span>
                    )}
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* All destinations button */}
          <div className="mt-6 text-center">
            <Button variant="outline" className="w-full md:w-auto" asChild>
              <a href="/flights">All destinations</a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PopularDestinations;
