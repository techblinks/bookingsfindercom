import { useState } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import CleanFlightSearch from "@/components/search/CleanFlightSearch";
import CleanHotelSearch from "@/components/search/CleanHotelSearch";

type SearchType = "flights" | "hotels";

interface HeroSectionProps {
  showFlights?: boolean;
  showHotels?: boolean;
}

const HeroSection = ({ showFlights = true, showHotels = true }: HeroSectionProps) => {
  const getDefaultTab = (): SearchType => {
    if (showFlights) return "flights";
    if (showHotels) return "hotels";
    return "flights";
  };

  const [searchType, setSearchType] = useState<SearchType>(getDefaultTab());

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane, enabled: showFlights },
    { id: "hotels" as const, label: "Hotels", icon: Building2, enabled: showHotels },
  ].filter(tab => tab.enabled);

  const showTabs = tabs.length > 1;

  return (
    <section className="bg-primary min-h-[60vh] md:min-h-[50vh] flex flex-col">
      {/* Hero Content */}
      <div className="flex-1 flex flex-col justify-center px-4 py-8 md:py-12">
        <div className="max-w-3xl mx-auto w-full text-center mb-8 md:mb-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-3 md:mb-4 tracking-tight leading-tight">
            Find the Best Flights & Hotels Worldwide
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-primary-foreground/80 max-w-xl mx-auto">
            Compare prices from trusted booking partners
          </p>
        </div>

        {/* Search Container */}
        <div className="max-w-3xl mx-auto w-full">
          {/* Tabs */}
          {showTabs && (
            <div className="flex justify-center mb-4">
              <div className="inline-flex bg-primary-foreground/10 rounded-full p-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setSearchType(tab.id)}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-all",
                      searchType === tab.id
                        ? "bg-card text-foreground shadow-sm"
                        : "text-primary-foreground/90 hover:text-primary-foreground"
                    )}
                  >
                    <tab.icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Search Card */}
          <div className="bg-card rounded-xl md:rounded-2xl shadow-modal overflow-hidden">
            {searchType === "flights" && showFlights ? (
              <CleanFlightSearch />
            ) : searchType === "hotels" && showHotels ? (
              <CleanHotelSearch />
            ) : showFlights ? (
              <CleanFlightSearch />
            ) : (
              <CleanHotelSearch />
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
