import { useState } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import ModernFlightSearch from "./ModernFlightSearch";
import ModernHotelSearch from "./ModernHotelSearch";

type SearchType = "flights" | "hotels";

const ModernSearchBox = () => {
  const [searchType, setSearchType] = useState<SearchType>("flights");
  const isMobile = useIsMobile();

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane },
    { id: "hotels" as const, label: "Hotels", icon: Building2 },
  ];

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Clean Tab Navigation */}
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

      {/* Search Content */}
      <div className="min-h-[200px]">
        {searchType === "flights" ? (
          <ModernFlightSearch />
        ) : (
          <ModernHotelSearch />
        )}
      </div>
    </div>
  );
};

export default ModernSearchBox;
