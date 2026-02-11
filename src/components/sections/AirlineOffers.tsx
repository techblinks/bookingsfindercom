import { motion } from "framer-motion";
import { Plane, ArrowRight, Clock, ExternalLink, Tag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useSpecialOffers, SpecialOffer } from "@/hooks/useSpecialOffers";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { getAirlineLogo, getAirlineName } from "@/lib/airlineLogos";
import { formatDistanceToNow } from "date-fns";
import { Link } from "react-router-dom";

function OfferSkeleton() {
  return (
    <Card className="min-w-[280px] max-w-[320px] flex-shrink-0">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8 rounded" />
          <Skeleton className="h-4 w-24" />
        </div>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  );
}

function OfferCard({ offer, currency, currencySymbol, index }: { offer: SpecialOffer; currency: string; currencySymbol: string; index: number }) {
  const airlineName = getAirlineName(offer.airline);
  const airlineLogo = getAirlineLogo(offer.airline);
  const departureDate = offer.departure_date ? new Date(offer.departure_date).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "";
  const foundAgo = offer.found_at ? formatDistanceToNow(new Date(offer.found_at), { addSuffix: true }) : "";

  const searchUrl = `/flights?origin=${offer.origin}&destination=${offer.destination}&date=${offer.departure_date || ""}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -4, scale: 1.02 }}
      className="min-w-[280px] max-w-[320px] flex-shrink-0"
    >
      <Card className="h-full border-border hover:border-primary/30 transition-colors">
        <CardContent className="p-4 flex flex-col gap-3">
          {/* Airline */}
          <div className="flex items-center gap-2">
            <img
              src={airlineLogo}
              alt={airlineName}
              className="h-6 w-6 rounded object-contain"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            <span className="text-xs text-muted-foreground truncate">{airlineName}</span>
            {offer.stops === 0 && (
              <span className="ml-auto text-[10px] font-medium bg-accent text-accent-foreground px-1.5 py-0.5 rounded">Direct</span>
            )}
          </div>

          {/* Route */}
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <span>{offer.origin}</span>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{offer.destination}</span>
          </div>

          {/* Price */}
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-primary">{currencySymbol}{Math.round(offer.price).toLocaleString()}</span>
            <span className="text-xs text-muted-foreground">{currency}</span>
          </div>

          {/* Meta */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {departureDate && (
              <span className="flex items-center gap-1">
                <Plane className="h-3 w-3" />
                {departureDate}
              </span>
            )}
            {offer.stops > 0 && (
              <span>{offer.stops} stop{offer.stops > 1 ? "s" : ""}</span>
            )}
            {foundAgo && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Found {foundAgo}
              </span>
            )}
          </div>

          {/* CTA */}
          <Link to={searchUrl} className="mt-auto">
            <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs">
              <ExternalLink className="h-3 w-3" />
              View Live Prices
            </Button>
          </Link>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function AirlineOffers() {
  const { geoData, loading: geoLoading } = useGeoLocation();
  const origin = geoData?.defaultOrigin || "LHR";
  const currency = geoData?.currency || "USD";
  const currencySymbol = geoData?.currencySymbol || "$";
  const { offers, loading, error } = useSpecialOffers(origin, currency);

  const isLoading = geoLoading || loading;

  if (!isLoading && (!offers || offers.length === 0) && !error) return null;

  return (
    <section className="py-10 md:py-14">
      <div className="container">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 rounded-lg bg-primary/10">
            <Tag className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">
              Airline Special Offers
            </h2>
            <p className="text-sm text-muted-foreground">
              Live deals from {geoData?.defaultOriginName || "your location"} · Updated in real-time
            </p>
          </div>
        </div>

        {/* Scrollable cards */}
        <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <OfferSkeleton key={i} />)
            : offers.map((offer, i) => (
                <OfferCard key={offer.id} offer={offer} currency={currency} currencySymbol={currencySymbol} index={i} />
              ))
          }
        </div>

        {error && (
          <p className="text-xs text-muted-foreground text-center mt-2">Unable to load offers right now.</p>
        )}
      </div>
    </section>
  );
}
