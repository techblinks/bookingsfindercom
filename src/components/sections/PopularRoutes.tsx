import { useState, useEffect, useRef } from "react";
import { Plane, ArrowRight, TrendingUp, ChevronLeft, ChevronRight, Globe, Bell } from "lucide-react";
import { motion } from "framer-motion";
import PopularRoutesSkeleton from "@/components/skeletons/PopularRoutesSkeleton";
import { format, addDays } from "date-fns";
import { Link, useNavigate } from "react-router-dom";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { PriceAlertDialog } from "@/components/flights/PriceAlertDialog";

interface RouteData {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  price?: number | null;
  loading?: boolean;
  cached?: boolean;
}

const PopularRoutes = () => {
  const { geoData, regionConfig, loading: geoLoading } = useGeoLocation();
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [currency, setCurrency] = useState({ code: 'USD', symbol: '$' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  // Update currency when geo data is available
  useEffect(() => {
    if (regionConfig.currency && regionConfig.currencySymbol) {
      setCurrency({ code: regionConfig.currency, symbol: regionConfig.currencySymbol });
    }
  }, [regionConfig]);

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

  const hasLoadingRoutes = routes.some(r => r.loading);

  // Fetch prices when routes are set with loading=true
  useEffect(() => {
    const fetchPrices = async () => {
      if (routes.length === 0) return;
      
      const loadingRoutes = routes.filter(r => r.loading);
      if (loadingRoutes.length === 0 || pricesLoading) return;

      setPricesLoading(true);

      try {
        const batchSize = 6;
        const allPrices: { origin: string; destination: string; price: number | null; cached?: boolean }[] = [];
        
        for (let i = 0; i < routes.length; i += batchSize) {
          const batch = routes.slice(i, i + batchSize);
          const routeRequests = batch.map((route) => ({
            origin: route.origin,
            destination: route.destination,
            departureDate,
            returnDate,
          }));

          const { data, error } = await supabase.functions.invoke("get-route-prices", {
            body: { routes: routeRequests, currency: currency.code },
          });

          if (!error && data?.prices) {
            allPrices.push(...data.prices);
          }
        }

        setRoutes((prev) =>
          prev.map((route) => {
            const priceData = allPrices.find(
              (p) => p.origin === route.origin && p.destination === route.destination
            );
            return {
              ...route,
              price: priceData?.price ?? null,
              cached: priceData?.cached ?? false,
              loading: false,
            };
          })
        );
      } catch (error) {
        console.error("Error fetching prices:", error);
        setRoutes((prev) => prev.map((route) => ({ ...route, loading: false })));
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, [routes.length, hasLoadingRoutes, departureDate, returnDate, currency.code]);

  // Format price with currency symbol
  const formatPrice = (price: number | null | undefined) => {
    if (!price) return "—";
    // Format based on currency
    return `${currency.symbol}${price.toLocaleString()}`;
  };

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
    return <PopularRoutesSkeleton />;
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
            <motion.div
              key={`${route.origin}-${route.destination}-${index}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: index * 0.06, ease: "easeOut" }}
              whileHover={{ y: -6, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className={cn(
                "flex-shrink-0 w-[280px] md:w-[300px]",
                "bg-card rounded-2xl border border-border p-5",
                "hover:border-primary/50 hover:shadow-lg transition-colors duration-300",
                "group relative cursor-pointer",
              )}
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Price Alert Button - Top Right */}
              <div className="absolute top-3 right-3 z-10">
                <PriceAlertDialog
                  origin={route.origin}
                  destination={route.destination}
                  departureDate={departureDate}
                  returnDate={returnDate}
                  passengers={1}
                  cabinClass="economy"
                  currentLowestPrice={route.price || undefined}
                  currency="USD"
                  trigger={
                    <motion.button
                      whileHover={{ scale: 1.2 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-2 rounded-full bg-muted/80 hover:bg-primary/10 hover:text-primary transition-colors"
                      title="Set price alert"
                    >
                      <Bell className="h-4 w-4" />
                    </motion.button>
                  }
                />
              </div>

              {/* Clickable content area */}
              <a href={getBookingUrl(route)} className="block">
                {/* Route Header */}
                <div className="flex items-center gap-3 mb-4">
                  <motion.div
                    className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors"
                    whileHover={{ rotate: 12 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Plane className="h-5 w-5 text-primary" />
                  </motion.div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-foreground text-base">
                        {route.origin}
                      </span>
                      <motion.span
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, repeatDelay: 2 }}
                      >
                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </motion.span>
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
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs text-muted-foreground">Round trip from</p>
                      {!route.loading && route.price && (
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded-full",
                            route.cached
                              ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                              : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                          )}
                        >
                          {route.cached ? "Cached" : "Live"}
                        </span>
                      )}
                    </div>
                    {route.loading ? (
                      <div className="flex items-center gap-2 h-9">
                        <div className="w-20 h-8 bg-muted animate-pulse rounded" />
                      </div>
                    ) : (
                      <motion.p
                        key={route.price}
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="text-2xl md:text-3xl font-bold text-primary"
                      >
                        {formatPrice(route.price)}
                      </motion.p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="flex items-center gap-1 text-sm font-medium text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>View</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </div>
              </a>
            </motion.div>
          ))}

          {/* See All Routes Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: routes.length * 0.06, ease: "easeOut" }}
            whileHover={{ y: -6, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            style={{ scrollSnapAlign: "start" }}
          >
            <Link
              to="/flights"
              className={cn(
                "flex-shrink-0 w-[280px] md:w-[300px] h-full",
                "bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl border border-primary/20 p-5",
                "hover:border-primary/40 hover:shadow-lg transition-colors duration-300",
                "group flex flex-col items-center justify-center text-center",
              )}
            >
              <motion.div
                className="flex items-center justify-center w-14 h-14 rounded-full bg-primary/10 group-hover:bg-primary/20 transition-colors mb-4"
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.6 }}
              >
                <Globe className="h-7 w-7 text-primary" />
              </motion.div>
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
          </motion.div>
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