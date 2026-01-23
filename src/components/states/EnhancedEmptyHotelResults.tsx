import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Building2, Calendar, MapPin, Search, TrendingUp, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useGeoLocation } from "@/hooks/useGeoLocation";

interface EnhancedEmptyHotelResultsProps {
  onClearFilters?: () => void;
  destination?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  rooms?: number;
  message?: string;
}

interface AlternativeDestination {
  name: string;
  code: string;
}

const EnhancedEmptyHotelResults = ({
  onClearFilters,
  destination = "",
  checkIn = "",
  checkOut = "",
  guests = 2,
  rooms = 1,
  message = "No hotels found matching your criteria",
}: EnhancedEmptyHotelResultsProps) => {
  const { geoData, regionConfig } = useGeoLocation();

  // Get alternative dates
  const getAlternativeDates = () => {
    if (!checkIn) return [];
    
    const dates = [];
    const base = new Date(checkIn);
    
    // Add dates -3, -2, -1, +1, +2, +3 days
    for (let i = -3; i <= 3; i++) {
      if (i === 0) continue;
      const date = new Date(base);
      date.setDate(date.getDate() + i);
      
      // Calculate corresponding checkout date
      const checkOutDate = new Date(checkOut || checkIn);
      checkOutDate.setDate(checkOutDate.getDate() + i);
      
      dates.push({
        checkIn: date.toISOString().split('T')[0],
        checkOut: checkOutDate.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        diff: i,
      });
    }
    
    return dates;
  };

  // Get nearby/popular destinations based on user location
  const getPopularDestinations = (): AlternativeDestination[] => {
    const countryCode = geoData?.countryCode || 'DEFAULT';
    
    const destinationsByCountry: Record<string, AlternativeDestination[]> = {
      AU: [
        { name: "Sydney", code: "sydney" },
        { name: "Melbourne", code: "melbourne" },
        { name: "Brisbane", code: "brisbane" },
        { name: "Gold Coast", code: "gold-coast" },
        { name: "Cairns", code: "cairns" },
      ],
      US: [
        { name: "New York", code: "new-york" },
        { name: "Los Angeles", code: "los-angeles" },
        { name: "Las Vegas", code: "las-vegas" },
        { name: "Miami", code: "miami" },
        { name: "San Francisco", code: "san-francisco" },
      ],
      IN: [
        { name: "Mumbai", code: "mumbai" },
        { name: "Delhi", code: "delhi" },
        { name: "Goa", code: "goa" },
        { name: "Bangalore", code: "bangalore" },
        { name: "Jaipur", code: "jaipur" },
      ],
      DEFAULT: [
        { name: "London", code: "london" },
        { name: "Paris", code: "paris" },
        { name: "Dubai", code: "dubai" },
        { name: "Singapore", code: "singapore" },
        { name: "Bangkok", code: "bangkok" },
      ],
    };
    
    return destinationsByCountry[countryCode] || destinationsByCountry.DEFAULT;
  };

  const alternativeDates = getAlternativeDates();
  const popularDestinations = getPopularDestinations().filter(
    d => d.name.toLowerCase() !== destination.toLowerCase()
  ).slice(0, 4);

  const getHotelSearchUrl = (params: { 
    destination?: string; 
    checkIn?: string; 
    checkOut?: string;
  }) => {
    const searchParams = new URLSearchParams({
      destination: params.destination || destination,
      checkIn: params.checkIn || checkIn,
      checkOut: params.checkOut || checkOut,
      guests: String(guests),
      rooms: String(rooms),
    });
    return `/hotels?${searchParams.toString()}`;
  };

  return (
    <div className="space-y-8">
      {/* Main Empty State Card */}
      <Card className="border-border">
        <CardContent className="p-8 md:p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-muted flex items-center justify-center">
            <Building2 className="h-10 w-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-semibold text-foreground mb-2">
            No Hotels Found
          </h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">{message}</p>

          {/* Suggestions */}
          <div className="bg-muted/50 rounded-lg p-4 mb-6 max-w-md mx-auto text-left">
            <p className="text-sm font-medium text-foreground mb-3">Try these suggestions:</p>
            <ul className="text-sm text-muted-foreground space-y-2">
              <li className="flex items-start gap-2">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Choose different check-in/check-out dates</span>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Try a nearby city or region</span>
              </li>
              <li className="flex items-start gap-2">
                <Search className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
                <span>Adjust your filters (price, stars, amenities)</span>
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
      {alternativeDates.length > 0 && checkIn && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <Calendar className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Try Different Dates</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Hotels might be available on nearby dates
            </p>
            <div className="flex flex-wrap gap-2">
              {alternativeDates.map((date) => (
                <Link 
                  key={date.checkIn} 
                  to={getHotelSearchUrl({ checkIn: date.checkIn, checkOut: date.checkOut })}
                >
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

      {/* Popular Destinations */}
      {popularDestinations.length > 0 && (
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-foreground">Popular Destinations</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Consider these popular alternatives
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {popularDestinations.map((dest) => (
                <Link 
                  key={dest.code}
                  to={getHotelSearchUrl({ destination: dest.name })}
                >
                  <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3">
                      <Building2 className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                      <span className="font-medium text-sm">{dest.name}</span>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* General Tips Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                Hotel Booking Tips
              </h3>
              <p className="text-sm text-muted-foreground">
                For the best availability and prices, try booking at least 2-3 weeks in advance. 
                Consider flexible dates if your schedule allows, and expand your search to include 
                nearby areas for more options.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedEmptyHotelResults;
