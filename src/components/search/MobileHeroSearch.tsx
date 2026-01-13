import { useState } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileFlightSearch from "./MobileFlightSearch";
import MobileHotelSearch from "./MobileHotelSearch";

type SearchType = "flights" | "hotels";

const MobileHeroSearch = () => {
  const [searchType, setSearchType] = useState<SearchType>("flights");

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane },
    { id: "hotels" as const, label: "Hotels", icon: Building2 },
  ];

  return (
    <div className="w-full">
      {/* Minimal Tabs */}
      <div className="flex gap-4 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSearchType(tab.id)}
            className={cn(
              "flex items-center gap-2 pb-3 text-base font-medium transition-all border-b-2",
              searchType === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground"
            )}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search Forms */}
      {searchType === "flights" ? (
        <MobileFlightSearch />
      ) : (
        <MobileHotelSearch />
      )}
    </div>
  );
};

export default MobileHeroSearch;
