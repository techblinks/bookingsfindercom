import { useState, useEffect } from "react";
import { Plane, ArrowRight, Clock, Loader2, MapPin } from "lucide-react";
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

const TopDealsOfTheDay = () => {
  const { geoData, regionConfig, loading: geoLoading } = useGeoLocation();
  const [deals, setDeals] = useState<DealRoute[]>([]);
  const [pricesLoading, setPricesLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Calculate departure date (2 weeks from now)
  const departureDate = format(addDays(new Date(), 14), "yyyy-MM-dd");
  const returnDate = format(addDays(new Date(), 21), "yyyy-MM-dd");

  // Update time every minute for the clock display
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const initialDeals = regionConfig.popularRoutes.map((route) => ({
      ...route,
      loading: true,
      price: null,
    }));
    setDeals(initialDeals);
  }, [regionConfig]);

  // Fetch live prices
  useEffect(() => {
    const fetchPrices = async () => {
      if (deals.length === 0 || pricesLoading) return;
      
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
          setDeals((prev) => prev.map((deal) => ({ ...deal, loading: false })));
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
        setDeals((prev) => prev.map((deal) => ({ ...deal, loading: false })));
      } finally {
        setPricesLoading(false);
      }
    };

    fetchPrices();
  }, [deals.length, departureDate, returnDate]);

  const getBookingUrl = (deal: DealRoute) => {
    // Use branded redirect for affiliate tracking
    const params = new URLSearchParams({
      type: 'flight',
      origin: deal.origin,
      destination: deal.destination,
      departureDate,
      returnDate,
    });
    return `/flights?${params.toString()}&passengers=1&cabinClass=economy`;
  };

  if (geoLoading) {
    return (
      <section className="py-12 md:py-16 bg-card">
        <div className="container">
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="py-12 md:py-16 bg-card border-y border-border">
      <div className="container">
        {/* Header with airport-style display */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-primary/10 rounded-full">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">
                  {geoData?.city || geoData?.country || "Your Location"}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span className="text-sm font-mono">
                  {format(currentTime, "HH:mm")}
                </span>
              </div>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-foreground tracking-tight">
              Top Deals of the Day
            </h2>
            <p className="text-muted-foreground mt-1">
              Best prices from your location • Updated live
            </p>
          </div>
          
          <a
            href="/flights"
            className="hidden md:flex items-center gap-2 text-sm font-medium text-primary hover:underline whitespace-nowrap"
          >
            View all flights
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>

        {/* Airport-style departure board */}
        <div className="bg-secondary/50 rounded-2xl border border-border overflow-hidden">
          {/* Board header */}
          <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-muted/50 border-b border-border text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            <div className="col-span-2">From</div>
            <div className="col-span-3">Destination</div>
            <div className="col-span-2">Departure</div>
            <div className="col-span-2">Type</div>
            <div className="col-span-2 text-right">Price</div>
            <div className="col-span-1"></div>
          </div>

          {/* Deal rows */}
          <div className="divide-y divide-border">
            {deals.map((deal, index) => (
              <a
                key={`${deal.origin}-${deal.destination}-${index}`}
                href={getBookingUrl(deal)}
                className={cn(
                  "block transition-all duration-200 hover:bg-primary/5",
                  "animate-fade-in"
                )}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                {/* Desktop row */}
                <div className="hidden md:grid grid-cols-12 gap-4 px-6 py-5 items-center">
                  {/* Origin */}
                  <div className="col-span-2">
                    <p className="text-2xl font-bold text-foreground font-mono tracking-wide">
                      {deal.origin}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {deal.originName}
                    </p>
                  </div>

                  {/* Destination with plane icon */}
                  <div className="col-span-3 flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-px bg-border" />
                      <Plane className="h-5 w-5 text-primary shrink-0" />
                      <div className="w-8 h-px bg-border" />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground font-mono tracking-wide">
                        {deal.destination}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {deal.destinationName}
                      </p>
                    </div>
                  </div>

                  {/* Departure date */}
                  <div className="col-span-2">
                    <p className="text-sm font-medium text-foreground">
                      {format(addDays(new Date(), 14), "EEE, MMM d")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      in 2 weeks
                    </p>
                  </div>

                  {/* Trip type */}
                  <div className="col-span-2">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-primary/10 text-xs font-medium text-primary">
                      Round Trip
                    </span>
                  </div>

                  {/* Price */}
                  <div className="col-span-2 text-right">
                    {deal.loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground ml-auto" />
                    ) : deal.price ? (
                      <div>
                        <p className="text-2xl font-bold text-success font-mono">
                          ${deal.price}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          per person
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        Check price
                      </span>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="col-span-1 text-right">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors">
                      <ArrowRight className="h-5 w-5" />
                    </span>
                  </div>
                </div>

                {/* Mobile card */}
                <div className="md:hidden p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground font-mono">
                          {deal.origin}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {deal.originName.split(',')[0]}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 px-2">
                        <div className="w-4 h-px bg-border" />
                        <Plane className="h-4 w-4 text-primary" />
                        <div className="w-4 h-px bg-border" />
                      </div>
                      <div className="text-center">
                        <p className="text-xl font-bold text-foreground font-mono">
                          {deal.destination}
                        </p>
                        <p className="text-[10px] text-muted-foreground uppercase">
                          {deal.destinationName.split(',')[0]}
                        </p>
                      </div>
                    </div>

                    {deal.loading ? (
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    ) : deal.price ? (
                      <p className="text-xl font-bold text-success font-mono">
                        ${deal.price}
                      </p>
                    ) : (
                      <span className="text-sm font-medium text-primary">
                        View
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span>{format(addDays(new Date(), 14), "MMM d")}</span>
                      <span className="text-border">•</span>
                      <span>Round Trip</span>
                    </div>
                    <span className="text-primary font-medium flex items-center gap-1">
                      Book now
                      <ArrowRight className="h-3 w-3" />
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Mobile view all link */}
        <div className="mt-6 text-center md:hidden">
          <a
            href="/flights"
            className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
          >
            View all flights
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </section>
  );
};

export default TopDealsOfTheDay;
