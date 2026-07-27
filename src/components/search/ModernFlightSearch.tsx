import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plane,
  ArrowRightLeft,
  Calendar,
  ChevronRight,
  Search,
  Users,
  ChevronDown,
  Settings2,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
import LocationCombobox from "./LocationCombobox";
import { PassengerCount } from "./PassengerPicker";
import { useIsMobile } from "@/hooks/use-mobile";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { validateFlightSearch, type FlightSearchFormValues } from "@/lib/flightSearchValidation";
import { logSearch as logAnalyticsSearch } from "@/lib/analytics";

type TripType = "roundtrip" | "oneway" | "multicity";

interface ModernFlightSearchProps {
  /** Prefill values from URL params (for Edit flow and /flights form mode). */
  prefill?: Partial<FlightSearchFormValues>;
}

// Dedup window for analytics: prevent duplicate search events within 3 seconds for identical params
const SEARCH_DEDUP_WINDOW_MS = 3000;

function getDedupKey(params: string): string {
  return `bf_search_dedup_${params}`;
}

function isDuplicateSubmission(params: string): boolean {
  try {
    const key = getDedupKey(params);
    const lastSubmit = sessionStorage.getItem(key);
    if (lastSubmit) {
      const elapsed = Date.now() - parseInt(lastSubmit, 10);
      if (elapsed < SEARCH_DEDUP_WINDOW_MS) return true;
    }
    sessionStorage.setItem(key, String(Date.now()));
  } catch {
    // Storage access failure — allow the submission (analytics is best-effort)
  }
  return false;
}

const ModernFlightSearch = ({ prefill }: ModernFlightSearchProps = {}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { geoData } = useGeoLocation();
  const [tripType, setTripType] = useState<TripType>(
    prefill?.tripType ?? "roundtrip"
  );

  // Form state — initialised from prefill, then geo location fallback
  const [flightFrom, setFlightFrom] = useState(prefill?.origin ?? "");
  const [flightFromDisplay, setFlightFromDisplay] = useState(
    prefill?.origin ? `${prefill.origin}` : ""
  );
  const [flightTo, setFlightTo] = useState(prefill?.destination ?? "");
  const [flightToDisplay, setFlightToDisplay] = useState(
    prefill?.destination ? `${prefill.destination}` : ""
  );
  const [departureDate, setDepartureDate] = useState<Date | undefined>(
    prefill?.departureDate
  );
  const [returnDate, setReturnDate] = useState<Date | undefined>(
    prefill?.returnDate
  );
  const [passengers, setPassengers] = useState<PassengerCount>({
    adults: prefill?.adults ?? 1,
    children: prefill?.children ?? 0,
    infants: prefill?.infants ?? 0,
  });
  const [cabinClass, setCabinClass] = useState(prefill?.cabinClass ?? "economy");

  // Advanced options
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [nearbyAirports, setNearbyAirports] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  // UI states
  const [fromSheetOpen, setFromSheetOpen] = useState(false);
  const [toSheetOpen, setToSheetOpen] = useState(false);
  const [dateDrawerOpen, setDateDrawerOpen] = useState(false);
  const [optionsDrawerOpen, setOptionsDrawerOpen] = useState(false);
  const [selectingReturn, setSelectingReturn] = useState(false);

  // Set default origin based on geo location (only if no prefill)
  useEffect(() => {
    if (geoData && !flightFrom && !prefill?.origin) {
      setFlightFrom(geoData.defaultOrigin);
      setFlightFromDisplay(`${geoData.defaultOriginName} (${geoData.defaultOrigin})`);
    }
  }, [geoData, flightFrom, prefill]);

  const swapLocations = () => {
    const tempCode = flightFrom;
    const tempDisplay = flightFromDisplay;
    setFlightFrom(flightTo);
    setFlightFromDisplay(flightToDisplay);
    setFlightTo(tempCode);
    setFlightToDisplay(tempDisplay);
  };

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const getPassengerLabel = () => {
    return `${totalPassengers} Traveler${totalPassengers > 1 ? "s" : ""}`;
  };

  const getCabinLabel = () => {
    const labels: Record<string, string> = {
      economy: "Economy",
      premium: "Premium Economy",
      business: "Business",
      first: "First Class",
    };
    return labels[cabinClass] || "Economy";
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (selectingReturn) {
      setReturnDate(date);
      if (isMobile) setDateDrawerOpen(false);
    } else {
      setDepartureDate(date);
      if (tripType === "roundtrip") {
        setSelectingReturn(true);
      } else if (isMobile) {
        setDateDrawerOpen(false);
      }
    }
  };

  const handleSearch = () => {
    // Phase 7A: Use shared validator (single source of truth)
    const values: FlightSearchFormValues = {
      origin: flightFrom,
      destination: flightTo,
      departureDate,
      returnDate,
      adults: passengers.adults,
      children: passengers.children,
      infants: passengers.infants,
      cabinClass,
      tripType: tripType === "multicity" ? "roundtrip" : tripType,
    };

    const errors = validateFlightSearch(values);
    if (errors.length > 0) {
      // Show the first error as a toast
      toast.error(errors[0].message);
      return;
    }

    const params = new URLSearchParams({
      origin: flightFrom.toUpperCase(),
      destination: flightTo.toUpperCase(),
      departureDate: format(departureDate!, "yyyy-MM-dd"),
      passengers: String(totalPassengers),
      adults: String(passengers.adults),
      children: String(passengers.children),
      infants: String(passengers.infants),
      cabinClass,
    });

    if (returnDate && tripType === "roundtrip") {
      params.append("returnDate", format(returnDate, "yyyy-MM-dd"));
    }

    if (flexibleDates) {
      params.append("flexibleDates", "true");
    }

    if (nearbyAirports) {
      params.append("nearbyAirports", "true");
    }

    const paramString = params.toString();

    // Phase 7A: Exactly-once analytics — fire-and-forget, deduped by sessionStorage
    if (!isDuplicateSubmission(paramString)) {
      void logAnalyticsSearch({
        origin: flightFrom.toUpperCase(),
        destination: flightTo.toUpperCase(),
        departureDate: format(departureDate!, "yyyy-MM-dd"),
        returnDate: returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
        adults: passengers.adults,
        children: passengers.children,
        infants: passengers.infants,
        cabinClass,
        tripType: tripType === "multicity" ? "roundtrip" : tripType,
        landingPage: window.location.pathname,
      }).catch(() => {});
    }

    navigate(`/flights?${paramString}`);
  };

  const updatePassengerCount = (
    type: keyof PassengerCount,
    increment: boolean
  ) => {
    setPassengers((prev) => {
      const newCount = increment ? prev[type] + 1 : prev[type] - 1;
      const total =
        prev.adults + prev.children + prev.infants + (increment ? 1 : -1);

      if (type === "adults" && newCount < 1) return prev;
      if (newCount < 0) return prev;
      if (total > 9) return prev;
      if (type === "infants" && newCount > prev.adults) return prev;

      return { ...prev, [type]: newCount };
    });
  };

  // Mobile Layout
  if (isMobile) {
    return (
      <div className="w-full space-y-3">
        {/* Location Fields - Stacked */}
        <div className="relative">
          {/* From Field */}
          <Sheet open={fromSheetOpen} onOpenChange={setFromSheetOpen}>
            <SheetTrigger asChild>
              <button className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-t-xl text-left active:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Plane className="h-5 w-5 text-primary -rotate-45" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">From</div>
                  <div
                    className={cn(
                      "text-base font-medium truncate",
                      !flightFromDisplay && "text-muted-foreground"
                    )}
                  >
                    {flightFromDisplay || "Select departure city"}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Where from?</SheetTitle>
              </SheetHeader>
              <div className="px-1">
                <LocationCombobox
                  value={flightFromDisplay}
                  onChange={(code, airport) => {
                    setFlightFrom(code);
                    setFlightFromDisplay(
                      airport ? `${airport.city} (${airport.code})` : code
                    );
                    setFromSheetOpen(false);
                  }}
                  placeholder="Search airports or cities..."
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Swap Button */}
          <button
            onClick={swapLocations}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground rotate-90" />
          </button>

          {/* To Field */}
          <Sheet open={toSheetOpen} onOpenChange={setToSheetOpen}>
            <SheetTrigger asChild>
              <button className="w-full flex items-center gap-3 p-4 bg-card border border-border border-t-0 rounded-b-xl text-left active:bg-muted transition-colors">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-muted-foreground">To</div>
                  <div
                    className={cn(
                      "text-base font-medium truncate",
                      !flightToDisplay && "text-muted-foreground"
                    )}
                  >
                    {flightToDisplay || "Select destination city"}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
              <SheetHeader className="pb-4">
                <SheetTitle>Where to?</SheetTitle>
              </SheetHeader>
              <div className="px-1">
                <LocationCombobox
                  value={flightToDisplay}
                  onChange={(code, airport) => {
                    setFlightTo(code);
                    setFlightToDisplay(
                      airport ? `${airport.city} (${airport.code})` : code
                    );
                    setToSheetOpen(false);
                  }}
                  placeholder="Search airports or cities..."
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Date Field */}
        <Drawer
          open={dateDrawerOpen}
          onOpenChange={(open) => {
            setDateDrawerOpen(open);
            if (!open) setSelectingReturn(false);
          }}
        >
          <DrawerTrigger asChild>
            <button
              className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left active:bg-muted transition-colors"
              onClick={() => setSelectingReturn(false)}
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  {tripType === "roundtrip" ? "Departure – Return" : "Departure"}
                </div>
                <div
                  className={cn(
                    "text-base font-medium",
                    !departureDate && "text-muted-foreground"
                  )}
                >
                  {departureDate ? (
                    tripType === "roundtrip" ? (
                      returnDate
                        ? `${format(departureDate, "MMM d")} – ${format(
                            returnDate,
                            "MMM d"
                          )}`
                        : `${format(departureDate, "MMM d")} – Select return`
                    ) : (
                      format(departureDate, "EEE, MMM d, yyyy")
                    )
                  ) : (
                    "Select dates"
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          </DrawerTrigger>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="pb-2">
              <DrawerTitle>
                {selectingReturn
                  ? "Select return date"
                  : "Select departure date"}
              </DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 overflow-auto">
              {/* Quick date chips */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
                {[
                  { label: "Today", date: new Date() },
                  { label: "Tomorrow", date: addDays(new Date(), 1) },
                  { label: "+3 days", date: addDays(new Date(), 3) },
                  { label: "+1 week", date: addDays(new Date(), 7) },
                  { label: "+2 weeks", date: addDays(new Date(), 14) },
                ].map((quick) => (
                  <button
                    key={quick.label}
                    onClick={() => handleDateSelect(quick.date)}
                    className="shrink-0 px-4 py-2 text-sm font-medium bg-secondary rounded-full active:bg-primary active:text-primary-foreground transition-colors"
                  >
                    {quick.label}
                  </button>
                ))}
              </div>
              <CalendarComponent
                mode="single"
                selected={selectingReturn ? returnDate : departureDate}
                onSelect={handleDateSelect}
                disabled={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  if (selectingReturn && departureDate) {
                    return date < departureDate;
                  }
                  return date < today;
                }}
                className="pointer-events-auto mx-auto"
                numberOfMonths={1}
              />
              {tripType === "roundtrip" && departureDate && !selectingReturn && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  Select departure, then return date
                </p>
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Travelers & Class */}
        <Drawer open={optionsDrawerOpen} onOpenChange={setOptionsDrawerOpen}>
          <DrawerTrigger asChild>
            <button className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left active:bg-muted transition-colors">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1">
                <div className="text-xs text-muted-foreground">
                  Travelers & Class
                </div>
                <div className="text-base font-medium">
                  {getPassengerLabel()}, {getCabinLabel()}
                </div>
              </div>
              <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
            </button>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Travelers & Class</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-6">
              {/* Trip Type Selection */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  Trip type
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "roundtrip", label: "Round trip" },
                    { value: "oneway", label: "One way" },
                    { value: "multicity", label: "Multi-city" },
                  ].map((type) => (
                    <button
                      key={type.value}
                      onClick={() => {
                        setTripType(type.value as TripType);
                        if (type.value === "oneway") setReturnDate(undefined);
                      }}
                      className={cn(
                        "py-3 px-4 rounded-xl text-sm font-medium transition-colors",
                        tripType === type.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground active:bg-muted"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Passenger Counts */}
              <div className="space-y-4">
                <div className="text-sm font-medium text-muted-foreground">
                  Travelers
                </div>

                {/* Adults */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Adults</div>
                    <div className="text-sm text-muted-foreground">Age 12+</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updatePassengerCount("adults", false)}
                      disabled={passengers.adults <= 1}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 active:bg-muted transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">
                      {passengers.adults}
                    </span>
                    <button
                      onClick={() => updatePassengerCount("adults", true)}
                      disabled={totalPassengers >= 9}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 active:bg-muted transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Children */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Children</div>
                    <div className="text-sm text-muted-foreground">Age 2-11</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updatePassengerCount("children", false)}
                      disabled={passengers.children <= 0}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 active:bg-muted transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">
                      {passengers.children}
                    </span>
                    <button
                      onClick={() => updatePassengerCount("children", true)}
                      disabled={totalPassengers >= 9}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 active:bg-muted transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Infants */}
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Infants</div>
                    <div className="text-sm text-muted-foreground">
                      Under 2, on lap
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <button
                      onClick={() => updatePassengerCount("infants", false)}
                      disabled={passengers.infants <= 0}
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 active:bg-muted transition-colors"
                    >
                      −
                    </button>
                    <span className="w-6 text-center font-semibold">
                      {passengers.infants}
                    </span>
                    <button
                      onClick={() => updatePassengerCount("infants", true)}
                      disabled={
                        totalPassengers >= 9 ||
                        passengers.infants >= passengers.adults
                      }
                      className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-lg font-medium disabled:opacity-30 active:bg-muted transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* Cabin Class */}
              <div>
                <div className="text-sm font-medium text-muted-foreground mb-3">
                  Cabin class
                </div>
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
                        "py-3 px-4 rounded-xl text-sm font-medium transition-colors",
                        cabinClass === cabin.value
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-secondary-foreground active:bg-muted"
                      )}
                    >
                      {cabin.label}
                    </button>
                  ))}
                </div>
              </div>

              <DrawerClose asChild>
                <Button className="w-full h-12 mt-4" size="lg">
                  Done
                </Button>
              </DrawerClose>
            </div>
          </DrawerContent>
        </Drawer>

        {/* More Options - Expandable */}
        <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-center gap-2 py-3 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <Settings2 className="h-4 w-4" />
              More options
              <ChevronDown
                className={cn(
                  "h-4 w-4 transition-transform",
                  advancedOpen && "rotate-180"
                )}
              />
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-3 pb-2">
            <label className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer">
              <Checkbox
                checked={flexibleDates}
                onCheckedChange={(checked) =>
                  setFlexibleDates(checked as boolean)
                }
              />
              <div>
                <div className="text-sm font-medium">Flexible dates</div>
                <div className="text-xs text-muted-foreground">
                  Show prices for nearby dates
                </div>
              </div>
            </label>
            <label className="flex items-center gap-3 p-3 bg-card border border-border rounded-xl cursor-pointer">
              <Checkbox
                checked={nearbyAirports}
                onCheckedChange={(checked) =>
                  setNearbyAirports(checked as boolean)
                }
              />
              <div>
                <div className="text-sm font-medium">Include nearby airports</div>
                <div className="text-xs text-muted-foreground">
                  Search airports within 100km
                </div>
              </div>
            </label>
          </CollapsibleContent>
        </Collapsible>

        {/* Search Button */}
        <Button
          onClick={handleSearch}
          className="w-full h-14 text-base font-semibold rounded-xl"
          size="lg"
        >
          <Search className="h-5 w-5 mr-2" />
          Search flights
        </Button>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="space-y-6">
      {/* Trip Type Pills */}
      <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-xl w-fit">
        {[
          { value: "roundtrip", label: "Round trip" },
          { value: "oneway", label: "One way" },
          { value: "multicity", label: "Multi-city" },
        ].map((type) => (
          <button
            key={type.value}
            onClick={() => {
              setTripType(type.value as TripType);
              if (type.value === "oneway") setReturnDate(undefined);
            }}
            className={cn(
              "px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              tripType === type.value
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Main Search Container */}
      <div className="bg-card border border-border rounded-2xl p-2 shadow-sm">
        <div className="flex items-stretch gap-0">
          {/* From */}
          <div className="flex-[1.2] min-w-[180px] border-r border-border">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">From</div>
              <LocationCombobox
                value={flightFromDisplay}
                onChange={(code, airport) => {
                  setFlightFrom(code);
                  setFlightFromDisplay(
                    airport ? `${airport.city} (${airport.code})` : code
                  );
                }}
                placeholder="City or airport"
                className="text-sm"
              />
            </div>
          </div>

          {/* Swap Button */}
          <div className="flex items-center justify-center px-1 -mx-4 z-10">
            <Button
              variant="outline"
              size="icon"
              className="rounded-full h-8 w-8 bg-card hover:bg-muted border-border shadow-sm"
              onClick={swapLocations}
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* To */}
          <div className="flex-[1.2] min-w-[180px] border-r border-border">
            <div className="px-4 py-3">
              <div className="text-xs font-medium text-muted-foreground mb-1">To</div>
              <LocationCombobox
                value={flightToDisplay}
                onChange={(code, airport) => {
                  setFlightTo(code);
                  setFlightToDisplay(
                    airport ? `${airport.city} (${airport.code})` : code
                  );
                }}
                placeholder="City or airport"
                className="text-sm"
              />
            </div>
          </div>

          {/* Departure Date */}
          <div className={cn("border-r border-border", tripType === "roundtrip" ? "w-36" : "w-44")}>
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full h-full px-4 py-3 text-left hover:bg-muted/50 transition-colors">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Depart</div>
                  <div className={cn(
                    "text-sm font-medium flex items-center gap-2",
                    !departureDate && "text-muted-foreground"
                  )}>
                    <Calendar className="h-4 w-4 shrink-0" />
                    {departureDate ? format(departureDate, "EEE, MMM d") : "Add date"}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComponent
                  mode="single"
                  selected={departureDate}
                  onSelect={setDepartureDate}
                  disabled={(date) => date < new Date()}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Return Date (Round Trip only) */}
          {tripType === "roundtrip" && (
            <div className="w-36 border-r border-border">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="w-full h-full px-4 py-3 text-left hover:bg-muted/50 transition-colors">
                    <div className="text-xs font-medium text-muted-foreground mb-1">Return</div>
                    <div className={cn(
                      "text-sm font-medium flex items-center gap-2",
                      !returnDate && "text-muted-foreground"
                    )}>
                      <Calendar className="h-4 w-4 shrink-0" />
                      {returnDate ? format(returnDate, "EEE, MMM d") : "Add date"}
                    </div>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="single"
                    selected={returnDate}
                    onSelect={setReturnDate}
                    disabled={(date) =>
                      date < (departureDate || new Date())
                    }
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Travelers */}
          <div className="w-44">
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full h-full px-4 py-3 text-left hover:bg-muted/50 transition-colors">
                  <div className="text-xs font-medium text-muted-foreground mb-1">Travelers & Class</div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="truncate">{getPassengerLabel()}</span>
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4 p-1">
                  <div className="text-sm font-semibold">Travelers</div>

                  {/* Adults */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Adults</div>
                      <div className="text-xs text-muted-foreground">Age 12+</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updatePassengerCount("adults", false)}
                        disabled={passengers.adults <= 1}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-medium">{passengers.adults}</span>
                      <button
                        onClick={() => updatePassengerCount("adults", true)}
                        disabled={totalPassengers >= 9}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Children */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Children</div>
                      <div className="text-xs text-muted-foreground">Age 2-11</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updatePassengerCount("children", false)}
                        disabled={passengers.children <= 0}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-medium">{passengers.children}</span>
                      <button
                        onClick={() => updatePassengerCount("children", true)}
                        disabled={totalPassengers >= 9}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Infants */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Infants</div>
                      <div className="text-xs text-muted-foreground">Under 2, on lap</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => updatePassengerCount("infants", false)}
                        disabled={passengers.infants <= 0}
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        −
                      </button>
                      <span className="w-4 text-center font-medium">{passengers.infants}</span>
                      <button
                        onClick={() => updatePassengerCount("infants", true)}
                        disabled={
                          totalPassengers >= 9 ||
                          passengers.infants >= passengers.adults
                        }
                        className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Cabin Class */}
                  <div className="pt-4 border-t">
                    <div className="text-sm font-semibold mb-3">Cabin class</div>
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
                            "py-2.5 px-3 rounded-lg text-sm font-medium transition-colors",
                            cabinClass === cabin.value
                              ? "bg-primary text-primary-foreground"
                              : "bg-secondary text-secondary-foreground hover:bg-muted"
                          )}
                        >
                          {cabin.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Search Button */}
          <div className="pl-2">
            <Button 
              onClick={handleSearch} 
              size="lg" 
              className="h-full px-8 rounded-xl text-base font-semibold"
            >
              <Search className="h-5 w-5 mr-2" />
              Search
            </Button>
          </div>
        </div>
      </div>

      {/* Advanced Options */}
      <div className="flex items-center gap-6 px-1">
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox
            checked={flexibleDates}
            onCheckedChange={(checked) => setFlexibleDates(checked as boolean)}
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Flexible dates (±3 days)
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer group">
          <Checkbox
            checked={nearbyAirports}
            onCheckedChange={(checked) =>
              setNearbyAirports(checked as boolean)
            }
          />
          <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
            Include nearby airports
          </span>
        </label>
      </div>
    </div>
  );
};

export default ModernFlightSearch;
