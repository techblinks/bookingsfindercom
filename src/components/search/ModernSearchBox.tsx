import { useState, useEffect } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ModernFlightSearch from "./ModernFlightSearch";
import ModernHotelSearch from "./ModernHotelSearch";

type SearchType = "flights" | "hotels";

interface ModernSearchBoxProps {
  showFlights?: boolean;
  showHotels?: boolean;
}

const ModernSearchBox = ({ showFlights = true, showHotels = true }: ModernSearchBoxProps) => {
  // Determine default tab based on what's enabled
  const getDefaultTab = (): SearchType => {
    if (showFlights) return "flights";
    if (showHotels) return "hotels";
    return "flights";
  };

  const [searchType, setSearchType] = useState<SearchType>(getDefaultTab());
  const isMobile = useIsMobile();

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

  // If no tabs are enabled, show flights as fallback
  if (tabs.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <ModernFlightSearch />
      </div>
    );
  }

  // If only one tab, don't show tab navigation
  const showTabs = tabs.length > 1;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Clean Tab Navigation */}
      {showTabs && (
        <div className="flex gap-6 mb-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchType(tab.id)}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium transition-all border-b-2 -mb-px",
                searchType === tab.id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Search Content */}
      <div className="min-h-[200px]">
        {searchType === "flights" && showFlights ? (
          <ModernFlightSearch />
        ) : searchType === "hotels" && showHotels ? (
          <ModernHotelSearch />
        ) : showFlights ? (
          <ModernFlightSearch />
        ) : (
          <ModernHotelSearch />
        )}
      </div>
    </div>
  );
};

export default ModernSearchBox;
