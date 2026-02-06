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
}

const MobileHeroSearch = ({ showFlights = true, showHotels = true }: MobileHeroSearchProps) => {
  const getDefaultTab = (): SearchType => {
    if (showFlights) return "flights";
    if (showHotels) return "hotels";
    return "flights";
  };

  const [searchType, setSearchType] = useState<SearchType>(getDefaultTab());
  const [direction, setDirection] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

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

  const switchTab = (newTab: SearchType) => {
    if (newTab === searchType) return;
    setDirection(newTab === "hotels" ? 1 : -1);
    setSearchType(newTab);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = () => {
    if (tabs.length < 2) return;
    const swipeThreshold = 50;
    const diff = touchStartX.current - touchEndX.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && searchType === "flights" && showHotels) {
        switchTab("hotels");
      } else if (diff < 0 && searchType === "hotels" && showFlights) {
        switchTab("flights");
      }
    }

    touchStartX.current = 0;
    touchEndX.current = 0;
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
    <div className="w-full safe-area-bottom">
      {/* Tab bar */}
      <div className="flex gap-4 mb-6 relative">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => switchTab(tab.id)}
            className={cn(
              "relative flex items-center gap-2 pb-3 text-base font-medium transition-colors native-touch",
              searchType === tab.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="h-5 w-5" />
            {tab.label}
            {searchType === tab.id && (
              <motion.div
                layoutId="tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Animated content */}
      <div
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative overflow-hidden"
      >
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
