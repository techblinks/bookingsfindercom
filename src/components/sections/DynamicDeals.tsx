import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plane, ArrowRight, TrendingDown, Sparkles, Loader2 } from "lucide-react";
import { format, addDays } from "date-fns";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface DealRoute {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  price?: number | null;
  loading?: boolean;
}

const DynamicDeals = () => {
  const { geoData, regionConfig, loading: geoLoading } = useGeoLocation();
  const [deals, setDeals] = useState<DealRoute[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);

  // Calculate departure date (2 weeks from now)
  const departureDate = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const returnDate = format(addDays(new Date(), 21), "yyyy-MM-dd");

  useEffect(() => {
    // Set initial deals from region config
    const initialDeals = regionConfig.popularRoutes.map((route) => ({
      ...route,
      loading: true,
      price: null,
    }));
    setDeals(initialDeals);
  }, [regionConfig]);

  // Fetch live prices when deals are set
  useEffect(() => {
    const fetchPrices = async () => {
      if (deals.length === 0 || pricesLoading) return;
      
      // Check if we already have prices loaded
      const hasLoadingDeals = deals.some(d => d.loading);
      if (!hasLoadingDeals) return;

      setPricesLoading(true);

      try {
        const routes = deals.map((deal) => ({
          origin: deal.origin,
          destination: deal.destination,
          departureDate,
          returnDate,
        }));

        const { data, error } = await supabase.functions.invoke("get-route-prices", {
          body: { routes },
        });

        if (error) {
          console.error("Error fetching prices:", error);
          setDeals((prev) =>
            prev.map((deal) => ({ ...deal, loading: false }))
          );
          return;
        }

        if (data?.prices) {
          setDeals((prev) =>
            prev.map((deal) => {
              const priceData = data.prices.find(
                (p: { origin: string; destination: string; price: number | null }) =>
                  p.origin === deal.origin && p.destination === deal.destination
              );
              return {
                ...deal,
                price: priceData?.price ?? null,
                loading: false,
              };
            })
          );
        }
      } catch (error) {
        console.error("Error fetching prices:", error);
        setDeals((prev) =>
          prev.map((deal) => ({ ...deal, loading: false }))
        );
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, [deals.length, departureDate, returnDate]);

  const getSearchUrl = (deal: DealRoute) => {
    return `/flights?origin=${deal.origin}&destination=${deal.destination}&departureDate=${departureDate}&returnDate=${returnDate}&passengers=1&cabinClass=economy`;
  };

  if (geoLoading) {
    return (
      <section className="py-12 md:py-16 bg-secondary/30">
        <div className="container">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-secondary/30">
      <div className="container">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-sm font-medium text-primary">
                {geoData?.city ? `Popular from ${geoData.city}` : "Popular routes"}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
              Trending Deals
            </h2>
            <p className="text-muted-foreground">
              Top flight routes with great prices
            </p>
          </div>
          <Link
            to="/flights"
            className="hidden sm:flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            View all deals
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {deals.map((deal, index) => (
            <Link
              key={`${deal.origin}-${deal.destination}-${index}`}
              to={getSearchUrl(deal)}
              className="group bg-card rounded-xl border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {deal.origin}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {deal.originName}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 px-2 shrink-0">
                      <div className="w-6 h-px bg-border" />
                      <Plane className="h-4 w-4 text-primary rotate-90 shrink-0" />
                      <div className="w-6 h-px bg-border" />
                    </div>
                    <div className="text-left min-w-0">
                      <p className="font-semibold text-foreground truncate">
                        {deal.destination}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {deal.destinationName}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="text-right shrink-0 ml-3">
                  {deal.loading ? (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  ) : deal.price ? (
                    <>
                      <p className="text-lg font-bold text-foreground">
                        ${deal.price}
                      </p>
                      <div className="flex items-center gap-1 text-xs text-green-600">
                        <TrendingDown className="h-3 w-3" />
                        Great deal
                      </div>
                    </>
                  ) : (
                    <span className="text-sm text-primary font-medium">
                      View prices
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Round trip • {format(addDays(new Date(), 14), "MMM d")}
                </span>
                <span className="text-xs font-medium text-primary group-hover:underline flex items-center gap-1">
                  Search flights
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          ))}
        </div>

        <div className="mt-6 text-center sm:hidden">
          <Link
            to="/flights"
            className="text-sm font-medium text-primary hover:underline"
          >
            View all deals →
          </Link>
        </div>
      </div>
    </section>
  );
};

export default DynamicDeals;
