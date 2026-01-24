import { useState, useRef, useEffect } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MobileFlightSearch from "./MobileFlightSearch";
import MobileHotelSearch from "./MobileHotelSearch";

type SearchType = "flights" | "hotels";

interface MobileHeroSearchProps {
  showFlights?: boolean;
  showHotels?: boolean;
}

const MobileHeroSearch = ({ showFlights = true, showHotels = true }: MobileHeroSearchProps) => {
  // Determine default tab based on what's enabled
  const getDefaultTab = (): SearchType => {
    if (showFlights) return "flights";
    if (showHotels) return "hotels";
    return "flights";
  };

  const [searchType, setSearchType] = useState<SearchType>(getDefaultTab());
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  // Update search type if current tab becomes disabled
  useEffect(() => {
    if (searchType === "flights" && !showFlights && showHotels) {
      setSearchType("hotels");
    } else if (searchType === "hotels" && !showHotels && showFlights) {
      setSearchType("flights");
    }
  }, [showFlights, showHotels, searchType]);

  const allTabs = [
    { id: "flights" as const, label: "Flights", icon: Plane, enabled: showFlights },
    { id: "hotels" as const, label: "Hotels", icon: Building2, enabled: showHotels },
  ];

  const tabs = allTabs.filter(tab => tab.enabled);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (tabs.length < 2) return; // No swiping if only one tab
    
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && searchType === "flights" && showHotels) {
        setSearchType("hotels");
      } else if (diff < 0 && searchType === "hotels" && showFlights) {
        setSearchType("flights");
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
  };

  // If no tabs are enabled, show flights as fallback
  if (tabs.length === 0) {
    return (
      <div className="w-full">
        <MobileFlightSearch />
      </div>
    );
  }

  // If only one tab, show that search directly without tabs
  if (tabs.length === 1) {
    return (
      <div className="w-full">
        {showFlights ? <MobileFlightSearch /> : <MobileHotelSearch />}
      </div>
    );
  }

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

      {/* Content Area - Only render active form to prevent focus conflicts */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative"
      >
        {searchType === "flights" ? (
          <MobileFlightSearch />
        ) : (
          <MobileHotelSearch />
        )}
      </div>
    </div>
  );
};

export default MobileHeroSearch;
