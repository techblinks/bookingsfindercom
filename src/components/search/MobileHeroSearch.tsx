import { useState, useRef, useEffect } from "react";
import { Plane, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import MobileFlightSearch from "./MobileFlightSearch";
import MobileHotelSearch from "./MobileHotelSearch";

type SearchType = "flights" | "hotels";

interface MobileHeroSearchProps {
  showFlights?: boolean;
  showHotels?: boolean;
  defaultTab?: SearchType;
}

const MobileHeroSearch = ({ showFlights = true, showHotels = true, defaultTab }: MobileHeroSearchProps) => {
  const getDefaultTab = (): SearchType => {
    if (defaultTab) return defaultTab;
    if (showFlights) return "flights";
    if (showHotels) return "hotels";
    return "flights";
  };

  const [searchType, setSearchType] = useState<SearchType>(getDefaultTab());
  const [direction, setDirection] = useState(0);

  // Respond to defaultTab changes (from bottom nav)
  useEffect(() => {
    if (defaultTab && defaultTab !== searchType) {
      setDirection(defaultTab === "hotels" ? 1 : -1);
      setSearchType(defaultTab);
    }
  }, [defaultTab]);

  const allTabs = [
    { id: "flights" as const, label: "Flights", icon: Plane, enabled: showFlights },
    { id: "hotels" as const, label: "Hotels", icon: Building2, enabled: showHotels },
  ];

  const tabs = allTabs.filter(tab => tab.enabled);

  const switchTab = (newTab: SearchType) => {
    if (newTab === searchType) return;
    setDirection(newTab === "hotels" ? 1 : -1);
    setSearchType(newTab);
  };

  if (tabs.length === 0) {
    return <div className="w-full"><MobileFlightSearch /></div>;
  }

  if (tabs.length === 1) {
    return <div className="w-full">{showFlights ? <MobileFlightSearch /> : <MobileHotelSearch />}</div>;
  }

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="w-full">
      {/* Tab bar - compact pill style */}
      <div className="flex bg-primary-foreground/15 rounded-full p-1 w-fit mb-4">
        {tabs.map((tab) => (
          <motion.button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            whileTap={{ scale: 0.93 }}
            className={cn(
              "relative flex items-center gap-2 px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 native-touch",
              searchType === tab.id
                ? "bg-primary-foreground text-primary shadow-sm"
                : "text-primary-foreground/80"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </motion.button>
        ))}
      </div>

      {/* Animated content */}
      <div className="relative overflow-hidden">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={searchType}
            custom={direction}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.2, ease: "easeOut" }}
          >
            {searchType === "flights" ? <MobileFlightSearch /> : <MobileHotelSearch />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MobileHeroSearch;
