import { useState } from "react";
import { Plane, Building2, Car, MapPin, Calendar, Users, Search, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchType = "flights" | "hotels" | "cars";

const SearchBox = () => {
  const [searchType, setSearchType] = useState<SearchType>("flights");

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane },
    { id: "hotels" as const, label: "Hotels", icon: Building2 },
    { id: "cars" as const, label: "Cars", icon: Car },
  ];

  return (
    <div className="search-container">
      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSearchType(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
              searchType === tab.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Fields */}
      {searchType === "flights" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 flex items-center gap-2">
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="From where?"
                className="pl-10 h-12"
              />
            </div>
            <Button variant="ghost" size="icon" className="shrink-0">
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
            <div className="flex-1 relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="To where?"
                className="pl-10 h-12"
              />
            </div>
          </div>
          <div className="md:col-span-3 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Departure - Return"
              className="pl-10 h-12"
            />
          </div>
          <div className="md:col-span-2 relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="1 Adult"
              className="pl-10 h-12"
            />
          </div>
          <div className="md:col-span-2">
            <Button variant="search" size="lg" className="w-full h-12">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      )}

      {searchType === "hotels" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="City, hotel, or destination"
              className="pl-10 h-12"
            />
          </div>
          <div className="md:col-span-3 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Check-in - Check-out"
              className="pl-10 h-12"
            />
          </div>
          <div className="md:col-span-3 relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="2 Guests, 1 Room"
              className="pl-10 h-12"
            />
          </div>
          <div className="md:col-span-2">
            <Button variant="search" size="lg" className="w-full h-12">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      )}

      {searchType === "cars" && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-5 relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pick-up location"
              className="pl-10 h-12"
            />
          </div>
          <div className="md:col-span-5 relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Pick-up - Drop-off dates"
              className="pl-10 h-12"
            />
          </div>
          <div className="md:col-span-2">
            <Button variant="search" size="lg" className="w-full h-12">
              <Search className="h-4 w-4" />
              Search
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchBox;
