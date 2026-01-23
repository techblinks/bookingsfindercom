import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plane, Calendar, MapPin, Search, TrendingUp, ArrowRight, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PriceAlertDialog } from "@/components/flights/PriceAlertDialog";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";

interface EnhancedEmptyFlightResultsProps {
  onClearFilters?: () => void;
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  message?: string;
}

interface AlternativeRoute {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  price: number | null;
  isLoading: boolean;
}

const EnhancedEmptyFlightResults = ({
  onClearFilters,
  origin = "",
  destination = "",
  departureDate = "",
  returnDate = "",
  message = "No flights found matching your criteria",
}: EnhancedEmptyFlightResultsProps) => {
  const { regionConfig } = useGeoLocation();
  const [alternativeRoutes, setAlternativeRoutes] = useState<AlternativeRoute[]>([]);
  const [isLoadingAlternatives, setIsLoadingAlternatives] = useState(true);

  // Generate alternative dates
  const getAlternativeDates = () => {
    if (!departureDate) return [];
    
    const dates = [];
    const base = new Date(departureDate);
    
    // Add dates -3, -2, -1, +1, +2, +3 days from original
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue; // Skip original date
      const date = new Date(base);
      date.setDate(date.getDate() + i);
      dates.push({
        date: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        diff: i,
      });
    }
    
    return dates;
  };

  // Get nearby airports based on origin
  const getNearbyAirports = (airportCode: string) => {
    const nearbyMap: Record<string, Array<{ code: string; name: string }>> = {
      SYD: [{ code: "MEL", name: "Melbourne" }, { code: "BNE", name: "Brisbane" }],
      MEL: [{ code: "SYD", name: "Sydney" }, { code: "ADL", name: "Adelaide" }],
      LAX: [{ code: "SFO", name: "San Francisco" }, { code: "SNA", name: "Orange County" }],
      JFK: [{ code: "EWR", name: "Newark" }, { code: "LGA", name: "LaGuardia" }],
      LHR: [{ code: "LGW", name: "Gatwick" }, { code: "STN", name: "Stansted" }],
      DEL: [{ code: "BOM", name: "Mumbai" }, { code: "JAI", name: "Jaipur" }],
      BOM: [{ code: "DEL", name: "Delhi" }, { code: "PNQ", name: "Pune" }],
    };
    return nearbyMap[airportCode] || [];
  };

  // Fetch popular routes from same origin
  useEffect(() => {
    if (!origin) {
      setIsLoadingAlternatives(false);
      return;
    }

    const fetchAlternatives = async () => {
      setIsLoadingAlternatives(true);
      
      // Get popular destinations from the user's origin
      const popularDestinations = [
        { dest: "SIN", name: "Singapore" },
        { dest: "DXB", name: "Dubai" },
        { dest: "LHR", name: "London" },
        { dest: "LAX", name: "Los Angeles" },
        { dest: "NRT", name: "Tokyo" },
        { dest: "BKK", name: "Bangkok" },
      ].filter(d => d.dest !== destination).slice(0, 4);

      const routes: AlternativeRoute[] = popularDestinations.map(d => ({
        origin,
        originName: origin,
        destination: d.dest,
        destinationName: d.name,
        price: null,
        isLoading: true,
      }));

      setAlternativeRoutes(routes);

      // Try to fetch prices
      try {
        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        const dateStr = futureDate.toISOString().split('T')[0];

        const routeRequests = routes.map(r => ({
          origin: r.origin,
          destination: r.destination,
          departureDate: dateStr,
          currency: regionConfig?.currency || 'USD',
        }));

        const { data } = await supabase.functions.invoke('get-route-prices', {
          body: { routes: routeRequests },
        });

        if (data?.prices) {
          setAlternativeRoutes(prev => prev.map((route, index) => ({
            ...route,
            price: data.prices[index]?.price || null,
            isLoading: false,
          })));
        } else {
          setAlternativeRoutes(prev => prev.map(r => ({ ...r, isLoading: false })));
        }
      } catch {
        setAlternativeRoutes(prev => prev.map(r => ({ ...r, isLoading: false })));
      } finally {
        setIsLoadingAlternatives(false);
      }
    };

    fetchAlternatives();
  }, [origin, destination, regionConfig?.currency]);

  const alternativeDates = getAlternativeDates();
  const nearbyAirports = getNearbyAirports(origin);
  const currency = regionConfig?.currencySymbol || '$';

  const getFlightSearchUrl = (params: { origin?: string; destination?: string; date?: string }) => {
    const searchParams = new URLSearchParams({
      origin: params.origin || origin,
      destination: params.destination || destination,
      departureDate: params.date || departureDate,
      ...(returnDate && { returnDate }),
      passengers: '1',
      cabinClass: 'economy',
    });
    return `/flights?${searchParams.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Main Empty State Card */}
      <Card className="border-border">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Plane className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No Flights Found
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>

          {/* Suggestions */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
            <p className="text-sm font-medium text-foreground mb-3">Try these suggestions:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Choose different travel dates (flexible by a few days)</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Try nearby airports (within 100 miles)</span>
              </li>
              <li className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Adjust your filters to see more results</span>
              </li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            {onClearFilters && (
              <Button variant="outline" onClick={onClearFilters}>
                Clear All Filters
              </Button>
            )}
            <Link to="/">
              <Button className="gap-2">
                <Search className="h-4 w-4" />
                Modify Search
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Alternative Dates Section */}
      {alternativeDates.length > 0 && departureDate && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Try Different Dates</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Flights might be available on nearby dates
            </p>
            <div className="flex flex-wrap gap-2">
              {alternativeDates.map((date) => (
                <Link key={date.date} to={getFlightSearchUrl({ date: date.date })}>
                  <Button variant="outline" size="sm" className="gap-1">
                    {date.label}
                    <Badge variant="secondary" className="ml-1 text-xs">
                      {date.diff > 0 ? `+${date.diff}` : date.diff} days
                    </Badge>
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Nearby Airports Section */}
      {nearbyAirports.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Try Nearby Airports</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Flying from a different airport might have more options
            </p>
            <div className="flex flex-wrap gap-2">
              {nearbyAirports.map((airport) => (
                <Link key={airport.code} to={getFlightSearchUrl({ origin: airport.code })}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <span>{airport.name}</span>
                    <Badge variant="secondary">{airport.code}</Badge>
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular Routes from Same Origin */}
      {alternativeRoutes.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-foreground">Popular Flights from {origin}</h3>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Consider these popular destinations instead
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {alternativeRoutes.map((route, index) => (
                <Link 
                  key={`${route.origin}-${route.destination}-${index}`}
                  to={getFlightSearchUrl({ destination: route.destination })}
                >
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Plane className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <div>
                        <p className="font-medium text-sm">{route.destinationName}</p>
                        <p className="text-xs text-muted-foreground">{route.destination}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {route.isLoading ? (
                        <Skeleton className="h-5 w-16" />
                      ) : route.price ? (
                        <span className="font-semibold text-primary">
                          {currency}{route.price.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-sm text-muted-foreground">View prices</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Price Alert CTA */}
      {origin && destination && departureDate && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Get Notified When Flights Become Available
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Set up a price alert and we'll email you when flights from {origin} to {destination} become available or when prices drop.
                </p>
                <PriceAlertDialog
                  origin={origin}
                  destination={destination}
                  departureDate={departureDate}
                  returnDate={returnDate}
                  passengers={1}
                  cabinClass="economy"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default EnhancedEmptyFlightResults;
