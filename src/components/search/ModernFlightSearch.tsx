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
import { validateFlightSearch, type FlightSearchFormValues } from "@/lib/flightSearchValidation";
import { CABIN_CLASS_OPTIONS, CABIN_CLASS_LABELS } from "@/lib/cabinClasses";
import { logSearch as logAnalyticsSearch } from "@/lib/analytics";
import { resolveLocationDisplay, resolveLocationLabel } from "@/lib/locationResolution";
import { recordActivity } from "@/lib/recentActivity";

/*
 * Only what the search engine actually performs.
 *
 * Multi-city used to be offered here and was submitted as a round trip, and
 * "Flexible dates (±3 days)" / "Include nearby airports" wrote query parameters
 * that no consumer reads. A visible option must change the search, so all three
 * are gone until they are genuinely implemented.
 */
type TripType = "roundtrip" | "oneway";

interface ModernFlightSearchProps {
  /** Prefill values from URL params (for Edit flow and /flights form mode). */
  prefill?: Partial<FlightSearchFormValues>;
  /**
   * Presentation only. The trip-type pills sit outside the white search card,
   * so on a dark surface (the homepage product band) they need light-on-dark
   * treatment. Every field, popover and behaviour is unchanged, and every
   * existing call site keeps the default light styling.
   */
  onDark?: boolean;
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

const ModernFlightSearch = ({ prefill, onDark = false }: ModernFlightSearchProps = {}) => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { geoData } = useGeoLocation();
  const [tripType, setTripType] = useState<TripType>(
    prefill?.tripType ?? "roundtrip"
  );

  // Form state — initialised from prefill, then geo location fallback
  const [flightFrom, setFlightFrom] = useState(prefill?.origin ?? "");
  const [flightFromDisplay, setFlightFromDisplay] = useState(
    prefill?.origin ? resolveLocationDisplay(prefill.origin) : ""
  );
  const [flightTo, setFlightTo] = useState(prefill?.destination ?? "");
  const [flightToDisplay, setFlightToDisplay] = useState(
    prefill?.destination ? resolveLocationDisplay(prefill.destination) : ""
  );

  /*
   * City names, tracked alongside the combobox display strings.
   *
   * The visible display is "City (CODE)" — right for an input the traveller is
   * reading back, wrong for recent activity, which renders "Brisbane → Kathmandu"
   * and would otherwise show "Brisbane (BNE) → Kathmandu (KTM)". Rather than
   * parsing the code back out of a display string, the city is kept as the
   * traveller actually chose it: airport.city when picked from the autocomplete,
   * the resolved label for a prefilled code, the geo name for a geo default.
   *
   * Undefined is a legitimate value. An airport outside the resolver's map has
   * no city name here, and recentActivity falls back to the IATA code — the
   * existing safe behaviour. Nothing is inferred from a code.
   */
  const [flightFromCity, setFlightFromCity] = useState<string | undefined>(
    resolveLocationLabel(prefill?.origin) ?? undefined
  );
  const [flightToCity, setFlightToCity] = useState<string | undefined>(
    resolveLocationLabel(prefill?.destination) ?? undefined
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

  /*
   * Sync route-derived origin/destination prefill on same-page navigation.
   *
   * React Router keeps this component mounted when only the query string
   * changes (/flights -> /flights?origin=SYD&destination=MOW), so useState
   * initialisation alone misses the update. These effects deliberately touch
   * ONLY origin/destination - dates, travellers and cabin class survive a
   * route-card change untouched.
   */
  const prefilledOrigin = prefill?.origin?.trim().toUpperCase();
  const prefilledDestination = prefill?.destination?.trim().toUpperCase();

  useEffect(() => {
    if (!prefilledOrigin) return;
    setFlightFrom(prefilledOrigin);
    setFlightFromDisplay(resolveLocationDisplay(prefilledOrigin));
    setFlightFromCity(resolveLocationLabel(prefilledOrigin) ?? undefined);
  }, [prefilledOrigin]);

  useEffect(() => {
    if (!prefilledDestination) return;
    setFlightTo(prefilledDestination);
    setFlightToDisplay(resolveLocationDisplay(prefilledDestination));
    setFlightToCity(resolveLocationLabel(prefilledDestination) ?? undefined);
  }, [prefilledDestination]);

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
      setFlightFromCity(geoData.defaultOriginName);
    }
  }, [geoData, flightFrom, prefill]);

  const swapLocations = () => {
    const tempCode = flightFrom;
    const tempDisplay = flightFromDisplay;
    const tempCity = flightFromCity;
    setFlightFrom(flightTo);
    setFlightFromDisplay(flightToDisplay);
    setFlightFromCity(flightToCity);
    setFlightTo(tempCode);
    setFlightToDisplay(tempDisplay);
    setFlightToCity(tempCity);
  };

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const getPassengerLabel = () => {
    return `${totalPassengers} Traveler${totalPassengers > 1 ? "s" : ""}`;
  };

  const getCabinLabel = () => {
    return CABIN_CLASS_LABELS[cabinClass as keyof typeof CABIN_CLASS_LABELS] || "Economy";
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
      tripType,
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
        tripType,
        landingPage: window.location.pathname,
      }).catch(() => {});
    }

    /*
     * Recent activity — parity with MobileFlightSearch, which has recorded here
     * since Phase 2A. Desktop recorded nothing, so a traveller who searched only
     * on desktop could never produce the flight continuation the desktop
     * "Pick up where you left off" surface reads.
     *
     * This is the single submit boundary for every ModernFlightSearch host, and
     * it is reached only after validateFlightSearch passes and only from an
     * explicit Search flights click — never on mount, prefill, URL hydration or
     * an invalid submit. Values come from the committed form, not the URL about
     * to be built. recordActivity swallows its own storage failures, so it can
     * never block the navigation below.
     */
    recordActivity({
      kind: "flight",
      origin: flightFrom.toUpperCase(),
      destination: flightTo.toUpperCase(),
      originLabel: flightFromCity || undefined,
      destinationLabel: flightToCity || undefined,
      departureDate: format(departureDate!, "yyyy-MM-dd"),
      // One way never carries a return date, even if one was picked before the
      // trip type changed.
      returnDate: tripType === "roundtrip" && returnDate ? format(returnDate, "yyyy-MM-dd") : undefined,
      travellers: {
        adults: passengers.adults,
        children: passengers.children,
        infants: passengers.infants,
      },
      cabinClass,
    });

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
                    setFlightFromCity(airport?.city);
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
            aria-label="Swap origin and destination"
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-card border border-border rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground rotate-90" aria-hidden="true" />
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
                    setFlightToCity(airport?.city);
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
                    { value: "roundtrip", label: "Round trip" },{ value: "oneway", label: "One way" },
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
                  {CABIN_CLASS_OPTIONS.map((cabin) => (
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

        {/*
          * The "More options" disclosure held only the flexible-date and
          * nearby-airport toggles. With those gone it would have opened onto
          * nothing, so the control went with them.
          */}

        {/* Search Button */}
        <Button
          variant="conversion"
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
    <div className="space-y-4 max-w-[1100px]">
      {/* Trip Type Pills */}
      <div
        className={cn(
          "flex items-center gap-1 p-1 rounded-xl w-fit",
          onDark ? "bg-white/10" : "bg-secondary/50",
        )}
      >
        {[
          { value: "roundtrip", label: "Round trip" },{ value: "oneway", label: "One way" },
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
                ? onDark
                  ? "bg-white text-[#001D45] shadow-sm"
                  : "bg-card text-foreground shadow-sm"
                : onDark
                  ? "text-white/75 hover:text-white"
                  : "text-muted-foreground hover:text-foreground"
            )}
          >
            {type.label}
          </button>
        ))}
      </div>

      {/* Main Search Container — two rows */}
      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-visible">
        {/* Row 1: Origin → Destination */}
        <div className="flex items-stretch border-b border-border">
          {/* From */}
          <div className="flex-1 min-w-0">
            <div className="px-5 py-4">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">From</div>
              <LocationCombobox
                value={flightFromDisplay}
                onChange={(code, airport) => {
                  setFlightFrom(code);
                  setFlightFromDisplay(
                    airport ? airport.city + " (" + airport.code + ")" : code
                  );
                  setFlightFromCity(airport?.city);
                }}
                placeholder="City or airport"
                className="text-[15px] font-semibold"
              />
            </div>
          </div>

          {/* Swap Button — dedicated column */}
          <div className="flex items-center px-0.5">
            <button
              onClick={swapLocations}
              aria-label="Swap origin and destination"
              className="w-9 h-9 rounded-full border border-border bg-card hover:bg-muted flex items-center justify-center shrink-0 transition-colors"
            >
              <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>

          {/* To */}
          <div className="flex-1 min-w-0">
            <div className="px-5 py-4">
              <div className="text-xs font-medium text-muted-foreground mb-1.5">To</div>
              <LocationCombobox
                value={flightToDisplay}
                onChange={(code, airport) => {
                  setFlightTo(code);
                  setFlightToDisplay(
                    airport ? airport.city + " (" + airport.code + ")" : code
                  );
                  setFlightToCity(airport?.city);
                }}
                placeholder="City or airport"
                className="text-[15px] font-semibold"
              />
            </div>
          </div>
        </div>

        {/* Row 2: Dates, Travellers, Search */}
        <div className="grid items-stretch max-lg:grid-cols-2 max-lg:gap-0" style={{ gridTemplateColumns: 'minmax(140px,0.9fr) minmax(140px,0.9fr) minmax(250px,1.5fr) 170px' }}>
          {/* Departure Date */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full h-full px-5 py-4 text-left hover:bg-muted/50 transition-colors border-r border-border">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Depart</div>
                <div className={cn(
                  "text-[15px] font-semibold flex items-center gap-2 whitespace-nowrap",
                  !departureDate && "text-muted-foreground font-normal"
                )}>
                  <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                  {departureDate ? format(departureDate, "EEE, d MMM") : "Add date"}
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
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

          {/* Return Date (Round Trip only) */}
          {tripType === "roundtrip" && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="w-full h-full px-5 py-4 text-left hover:bg-muted/50 transition-colors border-r border-border">
                  <div className="text-xs font-medium text-muted-foreground mb-1.5">Return</div>
                  <div className={cn(
                    "text-[15px] font-semibold flex items-center gap-2 whitespace-nowrap",
                    !returnDate && "text-muted-foreground font-normal"
                  )}>
                    <Calendar className="h-4 w-4 shrink-0 text-muted-foreground" />
                    {returnDate ? format(returnDate, "EEE, d MMM") : "Add date"}
                  </div>
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start" sideOffset={8}>
                <CalendarComponent
                  mode="single"
                  selected={returnDate}
                  onSelect={setReturnDate}
                  disabled={(date) => date < (departureDate || new Date())}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          )}

          {/* Travelers */}
          <Popover>
            <PopoverTrigger asChild>
              <button className="w-full h-full px-5 py-4 text-left hover:bg-muted/50 transition-colors border-r border-border">
                <div className="text-xs font-medium text-muted-foreground mb-1.5">Travellers &amp; Class</div>
                <div className="text-[15px] font-semibold flex items-center gap-2 min-w-0">
                  <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="truncate">{getPassengerLabel()} &middot; {getCabinLabel()}</span>
                </div>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end" sideOffset={8}>
              <div className="space-y-4 p-1">
                <div className="text-sm font-semibold">Travellers</div>
                <div className="flex items-center justify-between">
                  <div><div className="font-medium">Adults</div><div className="text-xs text-muted-foreground">Age 12+</div></div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updatePassengerCount("adults", false)} disabled={passengers.adults <= 1} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors">{String.fromCharCode(8722)}</button>
                    <span className="w-4 text-center font-medium">{passengers.adults}</span>
                    <button onClick={() => updatePassengerCount("adults", true)} disabled={totalPassengers >= 9} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div><div className="font-medium">Children</div><div className="text-xs text-muted-foreground">Age 2-11</div></div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updatePassengerCount("children", false)} disabled={passengers.children <= 0} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors">{String.fromCharCode(8722)}</button>
                    <span className="w-4 text-center font-medium">{passengers.children}</span>
                    <button onClick={() => updatePassengerCount("children", true)} disabled={totalPassengers >= 9} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors">+</button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div><div className="font-medium">Infants</div><div className="text-xs text-muted-foreground">Under 2, on lap</div></div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => updatePassengerCount("infants", false)} disabled={passengers.infants <= 0} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors">{String.fromCharCode(8722)}</button>
                    <span className="w-4 text-center font-medium">{passengers.infants}</span>
                    <button onClick={() => updatePassengerCount("infants", true)} disabled={totalPassengers >= 9 || passengers.infants >= passengers.adults} className="w-8 h-8 rounded-full border border-border flex items-center justify-center disabled:opacity-30 hover:bg-muted transition-colors">+</button>
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <div className="text-sm font-semibold mb-3">Cabin class</div>
                  <div className="grid grid-cols-2 gap-2">
                    {CABIN_CLASS_OPTIONS.map((cabin) => (
                      <button key={cabin.value} onClick={() => setCabinClass(cabin.value)} className={cn("py-2.5 px-3 rounded-lg text-sm font-medium transition-colors", cabinClass === cabin.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-muted")}>{cabin.label}</button>
                    ))}
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Search Button */}
          <div className="p-2 flex items-stretch">
            <Button
              variant="conversion"
              onClick={handleSearch}
              size="lg"
              className="w-full h-full px-5 rounded-xl text-base font-semibold whitespace-nowrap flex items-center justify-center gap-2"
            >
              <Search className="h-5 w-5 shrink-0" />
              Search flights
            </Button>
          </div>
        </div>
      </div>

    </div>
  );
};

export default ModernFlightSearch;
