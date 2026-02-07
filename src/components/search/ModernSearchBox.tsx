import { useState, useEffect } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import ModernFlightSearch from "./ModernFlightSearch";
import ModernHotelSearch from "./ModernHotelSearch";

type SearchType = "flights" | "hotels";

interface ModernSearchBoxProps {
  showFlights?: boolean;
  showHotels?: boolean;
}

const ModernSearchBox = ({ showFlights = true, showHotels = true }: ModernSearchBoxProps) => {
  const getDefaultTab = (): SearchType => {
    if (showFlights) return "flights";
    if (showHotels) return "hotels";
    return "flights";
  };

  const [searchType, setSearchType] = useState<SearchType>(getDefaultTab());

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

  if (tabs.length === 0) {
    return (
      <div className="w-full max-w-4xl mx-auto">
        <ModernFlightSearch />
      </div>
    );
  }

  const showTabs = tabs.length > 1;

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Tab Navigation - Google Flights style */}
      {showTabs && (
        <div className="flex gap-1 mb-5 p-1 bg-muted/50 rounded-xl w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSearchType(tab.id)}
              className={cn(
                "relative flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
                searchType === tab.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {searchType === tab.id && (
                <motion.div
                  layoutId="search-tab-bg"
                  className="absolute inset-0 bg-card rounded-lg shadow-sm"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Search Content */}
      <div className="min-h-[140px]">
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
