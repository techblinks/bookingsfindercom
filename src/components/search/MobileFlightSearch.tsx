import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, ArrowRightLeft, Calendar, Search, Users, ChevronDown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import NativeDatePicker from "./NativeDatePicker";
import NativeLocationPicker from "./NativeLocationPicker";
import { PassengerCount } from "./PassengerPicker";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

interface Airport {
  code: string;
  city: string;
  country: string;
  name: string;
}

type TripType = "roundtrip" | "oneway";

interface RecentFlightSearch {
  from: string;
  fromDisplay: string;
  to: string;
  toDisplay: string;
  timestamp: number;
}

const RECENT_FLIGHTS_KEY = "bf_recent_flight_searches";
const MAX_RECENT = 3;

const getRecentSearches = (): RecentFlightSearch[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_FLIGHTS_KEY) || "[]");
  } catch { return []; }
};

const saveRecentSearch = (search: RecentFlightSearch) => {
  const recent = getRecentSearches().filter(
    s => !(s.from === search.from && s.to === search.to)
  );
  recent.unshift(search);
  localStorage.setItem(RECENT_FLIGHTS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const MobileFlightSearch = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [swapRotation, setSwapRotation] = useState(0);

  const [flightFrom, setFlightFrom] = useState("");
  const [flightFromDisplay, setFlightFromDisplay] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightToDisplay, setFlightToDisplay] = useState("");
  const [departureDate, setDepartureDate] = useState<Date | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [passengers, setPassengers] = useState<PassengerCount>({ adults: 1, children: 0, infants: 0 });
  const [cabinClass, setCabinClass] = useState("economy");

  const [fromSheetOpen, setFromSheetOpen] = useState(false);
  const [toSheetOpen, setToSheetOpen] = useState(false);
  const [departureDateOpen, setDepartureDateOpen] = useState(false);
  const [returnDateOpen, setReturnDateOpen] = useState(false);
  const [optionsDrawerOpen, setOptionsDrawerOpen] = useState(false);

  const swapLocations = () => {
    setSwapRotation(prev => prev + 180);
    const tempCode = flightFrom;
    const tempDisplay = flightFromDisplay;
    setFlightFrom(flightTo);
    setFlightFromDisplay(flightToDisplay);
    setFlightTo(tempCode);
    setFlightToDisplay(tempDisplay);
  };

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const getCabinLabel = () => {
    const labels: Record<string, string> = {
      economy: "Economy",
      premium: "Premium",
      business: "Business",
      first: "First",
    };
    return labels[cabinClass] || "Economy";
  };

  const handleDepartureDateSelect = (date: Date) => {
    setDepartureDate(date);
    if (returnDate && date > returnDate) {
      setReturnDate(undefined);
    }
  };

  const handleSearch = () => {
    if (!flightFrom || !flightTo || !departureDate) {
      toast.error("Please fill in all required fields");
      return;
    }

    saveRecentSearch({
      from: flightFrom,
      fromDisplay: flightFromDisplay,
      to: flightTo,
      toDisplay: flightToDisplay,
      timestamp: Date.now(),
    });

    const params = new URLSearchParams({
      origin: flightFrom.toUpperCase(),
      destination: flightTo.toUpperCase(),
      departureDate: format(departureDate, "yyyy-MM-dd"),
      passengers: String(totalPassengers),
      adults: String(passengers.adults),
      children: String(passengers.children),
      infants: String(passengers.infants),
      cabinClass,
    });

    if (returnDate && tripType === "roundtrip") {
      params.append("returnDate", format(returnDate, "yyyy-MM-dd"));
    }

    navigate(`/flights?${params.toString()}`);
  };

  const updatePassengerCount = (type: keyof PassengerCount, increment: boolean) => {
    setPassengers((prev) => {
      const newCount = increment ? prev[type] + 1 : prev[type] - 1;
      const total = prev.adults + prev.children + prev.infants + (increment ? 1 : -1);

      if (type === "adults" && newCount < 1) return prev;
      if (newCount < 0) return prev;
      if (total > 9) return prev;
      if (type === "infants" && newCount > prev.adults) return prev;

      return { ...prev, [type]: newCount };
    });
  };

  return (
    <div className="w-full space-y-3">
      {/* Trip Type + Flexible - Single compact row */}
      <div className="flex items-center gap-2">
        <div className="flex bg-primary-foreground/15 rounded-full p-0.5">
          {[
            { value: "roundtrip" as const, label: "Round" },
            { value: "oneway" as const, label: "One Way" },
          ].map((type) => (
            <button
              key={type.value}
              onClick={() => {
                setTripType(type.value);
                if (type.value === "oneway") setReturnDate(undefined);
              }}
              className={cn(
                "px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                tripType === type.value
                  ? "bg-primary-foreground text-primary shadow-sm"
                  : "text-primary-foreground/80"
              )}
            >
              {type.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setFlexibleDates(!flexibleDates)}
          className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-full text-[11px] font-semibold transition-all duration-200 border",
            flexibleDates
              ? "bg-accent/20 border-accent text-accent-foreground"
              : "border-primary-foreground/20 text-primary-foreground/70"
          )}
        >
          <Zap className="h-3 w-3" />
          ±3d
        </button>
      </div>

      {/* Stacked From/To card */}
      <div className="relative bg-primary-foreground/95 rounded-2xl overflow-hidden">
        {/* From */}
        <button
          onClick={() => setFromSheetOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left native-press border-b border-border/30"
        >
          <Plane className="h-4 w-4 text-primary -rotate-45 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">From</div>
            <span className={cn(
              "text-sm font-medium truncate block",
              flightFromDisplay ? "text-foreground" : "text-muted-foreground"
            )}>
              {flightFromDisplay || "Select city"}
            </span>
          </div>
        </button>

        {/* Swap Button */}
        <motion.button
          onClick={swapLocations}
          animate={{ rotate: swapRotation }}
          transition={{ duration: 0.3, ease: "easeInOut" }}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md border-2 border-background native-touch"
        >
          <ArrowRightLeft className="h-3 w-3 text-primary-foreground rotate-90" />
        </motion.button>

        {/* To */}
        <button
          onClick={() => setToSheetOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left native-press"
        >
          <Plane className="h-4 w-4 text-primary rotate-45 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">To</div>
            <span className={cn(
              "text-sm font-medium truncate block",
              flightToDisplay ? "text-foreground" : "text-muted-foreground"
            )}>
              {flightToDisplay || "Select city"}
            </span>
          </div>
        </button>
      </div>

      <NativeLocationPicker
        isOpen={fromSheetOpen}
        onClose={() => setFromSheetOpen(false)}
        onSelect={(code: string, airport: Airport) => {
          setFlightFrom(code);
          setFlightFromDisplay(`${airport.city}`);
        }}
        title="Where from?"
        placeholder="Search airports or cities..."
      />

      <NativeLocationPicker
        isOpen={toSheetOpen}
        onClose={() => setToSheetOpen(false)}
        onSelect={(code: string, airport: Airport) => {
          setFlightTo(code);
          setFlightToDisplay(`${airport.city}`);
        }}
        title="Where to?"
        placeholder="Search airports or cities..."
      />

      {/* Date Fields */}
      <div className={cn(
        "grid gap-2",
        tripType === "roundtrip" ? "grid-cols-2" : "grid-cols-1"
      )}>
        <button
          onClick={() => setDepartureDateOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-primary-foreground/95 rounded-xl text-left native-press"
        >
          <Calendar className="h-4 w-4 text-primary shrink-0" />
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Depart</div>
            <span className={cn(
              "text-sm font-medium",
              departureDate ? "text-foreground" : "text-muted-foreground"
            )}>
              {departureDate ? format(departureDate, "d MMM") : "Select"}
            </span>
          </div>
        </button>

        {tripType === "roundtrip" && (
          <button
            onClick={() => setReturnDateOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-primary-foreground/95 rounded-xl text-left native-press"
          >
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <div>
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Return</div>
              <span className={cn(
                "text-sm font-medium",
                returnDate ? "text-foreground" : "text-muted-foreground"
              )}>
                {returnDate ? format(returnDate, "d MMM") : "Select"}
              </span>
            </div>
          </button>
        )}
      </div>

      <NativeDatePicker
        isOpen={departureDateOpen}
        onClose={() => setDepartureDateOpen(false)}
        onSelect={handleDepartureDateSelect}
        selected={departureDate}
        title="Select Departure Date"
      />

      <NativeDatePicker
        isOpen={returnDateOpen}
        onClose={() => setReturnDateOpen(false)}
        onSelect={(date: Date) => setReturnDate(date)}
        selected={returnDate}
        minDate={departureDate}
        title="Select Return Date"
      />

      {/* Passengers & Class - Compact row */}
      <div className="grid grid-cols-2 gap-2">
        <Drawer open={optionsDrawerOpen} onOpenChange={setOptionsDrawerOpen}>
          <DrawerTrigger asChild>
            <button className="flex items-center gap-2 px-4 py-3 bg-primary-foreground/95 rounded-xl text-left native-press">
              <Users className="h-4 w-4 text-primary shrink-0" />
              <div>
                <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Travelers</div>
                <span className="text-sm font-medium text-foreground">{totalPassengers}</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Travelers & Class</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-6">
              <div className="space-y-4">
                {([
                  { type: "adults" as const, label: "Adults", sub: "Age 12+", min: 1 },
                  { type: "children" as const, label: "Children", sub: "Age 2-11", min: 0 },
                  { type: "infants" as const, label: "Infants", sub: "Under 2", min: 0 },
                ] as const).map((row) => (
                  <div key={row.type} className="flex items-center justify-between min-h-[56px]">
                    <div>
                      <div className="font-medium">{row.label}</div>
                      <div className="text-sm text-muted-foreground">{row.sub}</div>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={() => updatePassengerCount(row.type, false)}
                        disabled={passengers[row.type] <= row.min}
                        className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                      >
                        −
                      </button>
                      <span className="w-6 text-center font-semibold">{passengers[row.type]}</span>
                      <button
                        onClick={() => updatePassengerCount(row.type, true)}
                        disabled={row.type === "infants" ? passengers.infants >= passengers.adults || totalPassengers >= 9 : totalPassengers >= 9}
                        className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">Cabin class</div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { value: "economy", label: "Economy" },
                    { value: "premium", label: "Premium" },
                    { value: "business", label: "Business" },
                    { value: "first", label: "First" },
                  ].map((cabin) => (
                    <button
                      key={cabin.value}
                      onClick={() => setCabinClass(cabin.value)}
                      className={cn(
                        "py-4 px-4 rounded-xl text-sm font-semibold transition-colors min-h-[52px]",
                        cabinClass === cabin.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground native-press"
                      )}
                    >
                      {cabin.label}
                    </button>
                  ))}
                </div>
              </div>

              <DrawerClose asChild>
                <Button className="w-full h-14 mt-4 native-button" size="lg">
                  Done
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>

        <button
          onClick={() => setOptionsDrawerOpen(true)}
          className="flex items-center gap-2 px-4 py-3 bg-primary-foreground/95 rounded-xl text-left native-press"
        >
          <div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Class</div>
            <span className="text-sm font-medium text-foreground">{getCabinLabel()}</span>
          </div>
          <ChevronDown className="h-3 w-3 text-muted-foreground ml-auto shrink-0" />
        </button>
      </div>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        className="w-full h-13 text-base font-semibold rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground native-button"
        size="lg"
      >
        <Search className="h-5 w-5 mr-2" />
        Search Flights
        {flexibleDates && (
          <span className="ml-2 px-2 py-0.5 bg-primary-foreground/20 rounded-full text-xs">
            ± 3 days
          </span>
        )}
      </Button>
    </div>
  );
};

export default MobileFlightSearch;
