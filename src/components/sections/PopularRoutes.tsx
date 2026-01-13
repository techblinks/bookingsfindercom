import { useState, useEffect } from "react";
import { Plane, ArrowRight, Loader2, TrendingUp } from "lucide-react";
import { format, addDays } from "date-fns";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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

  if (geoLoading) {
    return (
      <section className="py-10 md:py-14">
        <div className="container max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-10 md:py-14">
      <div className="container max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Top Searched Routes
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Popular flights from {geoData?.city || geoData?.country || "your region"} • Updated live
          </p>
        </div>

        {/* Routes List */}
        <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
          {routes.map((route, index) => (
            <a
              key={`${route.origin}-${route.destination}-${index}`}
              href={getBookingUrl(route)}
              className={cn(
                "flex items-center justify-between px-4 py-3.5 md:px-5 md:py-4",
                "hover:bg-muted/50 transition-colors duration-200",
                "animate-fade-in",
                index !== routes.length - 1 && "border-b border-border"
              )}
              style={{ animationDelay: `${index * 50}ms` }}
            >
              {/* Route info */}
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="hidden sm:flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 flex-shrink-0">
                  <Plane className="h-4 w-4 text-primary" />
                </div>
                
                <div className="flex items-center gap-1.5 md:gap-2 min-w-0 flex-1">
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground text-sm md:text-base">
                      {route.originName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                      ({route.origin})
                    </span>
                  </div>
                  
                  <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  
                  <div className="min-w-0">
                    <span className="font-semibold text-foreground text-sm md:text-base">
                      {route.destinationName}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1 hidden sm:inline">
                      ({route.destination})
                    </span>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="flex-shrink-0 ml-3 text-right">
                {route.loading ? (
                  <div className="flex items-center gap-1.5">
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground hidden sm:inline">Loading</span>
                  </div>
                ) : route.price ? (
                  <div className="flex items-baseline gap-1">
                    <span className="text-xs text-muted-foreground">from</span>
                    <span className="text-lg md:text-xl font-bold text-[#003680]">
                      ${route.price}
                    </span>
                  </div>
                ) : (
                  <span className="text-sm text-primary font-medium whitespace-nowrap">
                    View prices <ArrowRight className="h-3 w-3 inline ml-0.5" />
                  </span>
                )}
              </div>
            </a>
          ))}
        </div>

        {/* Footer note */}
        <p className="text-xs text-muted-foreground text-center mt-4">
          Prices shown are for round-trip economy flights. Click any route to see all options.
        </p>
      </div>
    </section>
  );
};

export default PopularRoutes;