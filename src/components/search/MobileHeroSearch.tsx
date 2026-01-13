import { useState, useRef } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileFlightSearch from "./MobileFlightSearch";
import MobileHotelSearch from "./MobileHotelSearch";

type SearchType = "flights" | "hotels";

const MobileHeroSearch = () => {
  const [searchType, setSearchType] = useState<SearchType>("flights");
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane },
    { id: "hotels" as const, label: "Hotels", icon: Building2 },
  ];

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && searchType === "flights") {
        // Swipe left → go to Hotels
        setSearchType("hotels");
      } else if (diff < 0 && searchType === "hotels") {
        // Swipe right → go to Flights
        setSearchType("flights");
      }
    }

    // Reset
    touchStartX.current = 0;
    touchEndX.current = 0;
  };

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

      {/* Swipeable Content Area */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative overflow-hidden"
      >
        <div
          className={cn(
            "flex transition-transform duration-300 ease-out",
            searchType === "hotels" ? "-translate-x-1/2" : "translate-x-0"
          )}
          style={{ width: "200%" }}
        >
          <div className="w-1/2 shrink-0">
            <MobileFlightSearch />
          </div>
          <div className="w-1/2 shrink-0">
            <MobileHotelSearch />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileHeroSearch;
