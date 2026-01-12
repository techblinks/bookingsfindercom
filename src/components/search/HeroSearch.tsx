import { useState } from "react";
import { Plane, Building2, MapPin, Calendar, Users, Search, ArrowLeftRight, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type SearchType = "flights" | "hotels";

const HeroSearch = () => {
  const [searchType, setSearchType] = useState<SearchType>("flights");

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane },
    { id: "hotels" as const, label: "Hotels", icon: Building2 },
  ];

  return (
    <div className="search-container w-full max-w-5xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSearchType(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              searchType === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Flight Search Form */}
      {searchType === "flights" && (
        <div className="space-y-4">
          {/* Row 1: From/To */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="relative flex items-center">
              <div className="flex-1 relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="From (city or airport)"
                  className="pl-10 h-12"
                  defaultValue=""
                />
              </div>
              <Button variant="ghost" size="icon" className="absolute right-1/2 translate-x-1/2 z-10 bg-card border border-border rounded-full h-8 w-8 hidden md:flex">
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="To (city or airport)"
                className="pl-10 h-12"
                defaultValue=""
              />
            </div>
          </div>

          {/* Row 2: Dates, Passengers, Class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Departure"
                className="pl-10 h-12"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Return"
                className="pl-10 h-12"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Select defaultValue="1">
                <SelectTrigger className="pl-10 h-12">
                  <SelectValue placeholder="Passengers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Passenger</SelectItem>
                  <SelectItem value="2">2 Passengers</SelectItem>
                  <SelectItem value="3">3 Passengers</SelectItem>
                  <SelectItem value="4">4 Passengers</SelectItem>
                  <SelectItem value="5">5+ Passengers</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Select defaultValue="economy">
              <SelectTrigger className="h-12">
                <SelectValue placeholder="Cabin class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="economy">Economy</SelectItem>
                <SelectItem value="premium">Premium Economy</SelectItem>
                <SelectItem value="business">Business</SelectItem>
                <SelectItem value="first">First Class</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Search Button */}
          <div className="pt-2">
            <Button variant="search" size="lg" className="w-full sm:w-auto h-12 px-12">
              <Search className="h-4 w-4" />
              Search Flights
            </Button>
          </div>
        </div>
      )}

      {/* Hotel Search Form */}
      {searchType === "hotels" && (
        <div className="space-y-4">
          {/* Row 1: Destination */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Where are you going? (city, hotel, or destination)"
              className="pl-10 h-12"
              defaultValue=""
            />
          </div>

          {/* Row 2: Dates, Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Check-in"
                className="pl-10 h-12"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Check-out"
                className="pl-10 h-12"
              />
            </div>
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Select defaultValue="2-1">
                <SelectTrigger className="pl-10 h-12">
                  <SelectValue placeholder="Guests" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-1">1 Guest, 1 Room</SelectItem>
                  <SelectItem value="2-1">2 Guests, 1 Room</SelectItem>
                  <SelectItem value="3-1">3 Guests, 1 Room</SelectItem>
                  <SelectItem value="4-2">4 Guests, 2 Rooms</SelectItem>
                  <SelectItem value="6-3">6 Guests, 3 Rooms</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Search Button */}
          <div className="pt-2">
            <Button variant="search" size="lg" className="w-full sm:w-auto h-12 px-12">
              <Search className="h-4 w-4" />
              Search Hotels
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSearch;
