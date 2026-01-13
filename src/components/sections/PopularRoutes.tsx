import { useState, useEffect, useRef } from "react";
import { Plane, ArrowRight, Loader2, TrendingUp, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { format, addDays } from "date-fns";
import { Link } from "react-router-dom";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface RouteData {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  price?: number | null;
  loading?: boolean;
}

const PopularRoutes = () => {
  const { geoData, regionConfig, loading: geoLoading } = useGeoLocation();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const departureDate = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const returnDate = format(addDays(new Date(), 21), "yyyy-MM-dd");

  // Initialize routes from config
  useEffect(() => {
    const initialRoutes = regionConfig.popularRoutes.slice(0, 10).map((route) => ({
      ...route,
      loading: true,
      price: null,
    }));
    setRoutes(initialRoutes);
  }, [regionConfig]);

  // Fetch prices
  useEffect(() => {
    const fetchPrices = async () => {
      if (routes.length === 0 || pricesLoading) return;
      
      const hasLoadingRoutes = routes.some(r => r.loading);
      if (!hasLoadingRoutes) return;

      setPricesLoading(true);

      try {
        const routeRequests = routes.map((route) => ({
          origin: route.origin,
          destination: route.destination,
          departureDate,
          returnDate,
        }));

        const { data, error } = await supabase.functions.invoke("get-route-prices", {
          body: { routes: routeRequests },
        });

        if (error) {
          console.error("Error fetching prices:", error);
          setRoutes((prev) => prev.map((route) => ({ ...route, loading: false })));
          return;
        }

        if (data?.prices) {
          setRoutes((prev) =>
            prev.map((route) => {
              const priceData = data.prices.find(
                (p: { origin: string; destination: string; price: number | null }) =>
                  p.origin === route.origin && p.destination === route.destination
              );
              return {
                ...route,
                price: priceData?.price ?? null,
                loading: false,
              };
            })
          );
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
        setRoutes((prev) => prev.map((route) => ({ ...route, loading: false })));
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, [routes.length, departureDate, returnDate]);

  const getBookingUrl = (route: RouteData) => {
    const params = new URLSearchParams({
      origin: route.origin,
      destination: route.destination,
      departureDate,
      returnDate,
      passengers: "1",
      cabinClass: "economy",
    });
    return `/flights?${params.toString()}`;
  };

  const updateScrollButtons = () => {
    if (scrollRef.current) {
      const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
      setCanScrollLeft(scrollLeft > 0);
      setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
    }
  };

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = 320;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    updateScrollButtons();
    const container = scrollRef.current;
    if (container) {
      container.addEventListener("scroll", updateScrollButtons);
      window.addEventListener("resize", updateScrollButtons);
      return () => {
        container.removeEventListener("scroll", updateScrollButtons);
        window.removeEventListener("resize", updateScrollButtons);
      };
    }
  }, [routes]);

  if (geoLoading) {
    return (
      <section className="py-10 md:py-14">
        <div className="container">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-14 overflow-hidden">
      {/* Header */}
      <div className="container mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h2 className="text-xl md:text-2xl font-bold text-foreground">
                Top Searched Routes
              </h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Popular flights from {geoData?.city || geoData?.country || "your region"} • Live prices
            </p>
          </div>

          {/* Navigation arrows - desktop only */}
          <div className="hidden md:flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Carousel */}
      <div className="relative">
        <div
          ref={scrollRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide px-4 md:px-[max(1rem,calc((100vw-1280px)/2+1rem))] pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {routes.map((route, index) => (
            <a
              key={`${route.origin}-${route.destination}-${index}`}
              href={getBookingUrl(route)}
              className={cn(
                "flex-shrink-0 w-[280px] md:w-[300px]",
                "bg-card rounded-2xl border border-border p-5",
                "hover:border-primary/50 hover:shadow-lg transition-all duration-300",
                "animate-fade-in group",
              )}
              style={{ 
                animationDelay: `${index * 50}ms`,
                scrollSnapAlign: "start"
              }}
            >
              {/* Route Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-base">
                      {route.origin}
                    </span>
                    <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <span className="font-bold text-foreground text-base">
                      {route.destination}
                    </span>
                  </div>
                </div>
              </div>

              {/* Route Names */}
              <div className="mb-4">
                <p className="text-sm text-muted-foreground truncate">
                  {route.originName} → {route.destinationName}
                </p>
              </div>

              {/* Divider */}
              <div className="border-t border-border mb-4" />

              {/* Price Section */}
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Round trip from</p>
                  {route.loading ? (
                    <div className="flex items-center gap-2 h-9">
                      <div className="w-20 h-8 bg-muted animate-pulse rounded" />
                    </div>
                  ) : (
                    <p className="text-2xl md:text-3xl font-bold text-[#003680]">
                      {route.price ? `$${route.price}` : "—"}
                    </p>
                  )}
                </div>

                {/* CTA */}
                <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                  <span>View</span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </a>
          ))}

          {/* See All Routes Card */}
          <Link
            to="/flights"
            className={cn(
              "flex-shrink-0 w-[280px] md:w-[300px]",
              "bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5",
              "hover:border-primary/40 hover:shadow-lg transition-all duration-300",
              "animate-fade-in group flex flex-col items-center justify-center text-center",
            )}
            style={{ 
              animationDelay: `${routes.length * 50}ms`,
              scrollSnapAlign: "start"
            }}
          >
            <div className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4">
              <Globe className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-bold text-foreground text-lg mb-2">
              Explore All Routes
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              Discover flights to 500+ destinations worldwide
            </p>
            <div className="flex items-center gap-2 text-primary font-semibold group-hover:gap-3 transition-all">
              <span>See all routes</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </Link>
        </div>

        {/* Gradient overlays for scroll indication - desktop */}
        <div
          className={cn(
            "hidden md:block absolute left-0 top-0 bottom-4 w-16 bg-gradient-to-r from-background to-transparent pointer-events-none transition-opacity",
            canScrollLeft ? "opacity-100" : "opacity-0"
          )}
        />
        <div
          className={cn(
            "hidden md:block absolute right-0 top-0 bottom-4 w-16 bg-gradient-to-l from-background to-transparent pointer-events-none transition-opacity",
            canScrollRight ? "opacity-100" : "opacity-0"
          )}
        />
      </div>

      {/* Footer note */}
      <p className="text-xs text-muted-foreground text-center mt-4 px-4">
        Swipe to explore more routes • Prices updated in real-time
      </p>
    </section>
  );
};

export default PopularRoutes;