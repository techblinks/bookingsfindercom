import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { 
  MapPin, 
  Calendar, 
  Users, 
  ArrowRightLeft, 
  Search,
  SlidersHorizontal,
  ChevronDown,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";
import LocationCombobox from "./LocationCombobox";
import { toast } from "sonner";

type TripType = "oneway" | "roundtrip" | "multicity";
type CabinClass = "economy" | "premium_economy" | "business" | "first";

const cabinOptions: { value: CabinClass; label: string }[] = [
  { value: "economy", label: "Economy" },
  { value: "premium_economy", label: "Premium Economy" },
  { value: "business", label: "Business" },
  { value: "first", label: "First Class" },
];

const CleanFlightSearch = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Core search state
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [departDate, setDepartDate] = useState<Date>();
  const [returnDate, setReturnDate] = useState<Date>();
  const [passengers, setPassengers] = useState({ adults: 1, children: 0, infants: 0 });
  
  // Advanced options
  const [tripType, setTripType] = useState<TripType>("oneway");
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [nearbyAirports, setNearbyAirports] = useState(false);
  const [directOnly, setDirectOnly] = useState(false);
  
  // UI state
  const [fromOpen, setFromOpen] = useState(false);
  const [toOpen, setToOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [passengersOpen, setPassengersOpen] = useState(false);
  const [moreOptionsOpen, setMoreOptionsOpen] = useState(false);

  const swapLocations = () => {
    const temp = from;
    setFrom(to);
    setTo(temp);
  };

  const getTotalPassengers = () => passengers.adults + passengers.children + passengers.infants;

  const getPassengerLabel = () => {
    const total = getTotalPassengers();
    return `${total} ${total === 1 ? 'Traveler' : 'Travelers'}`;
  };

  const handleSearch = () => {
    if (!from) {
      toast.error("Please select a departure city");
      return;
    }
    if (!to) {
      toast.error("Please select a destination");
      return;
    }
    if (!departDate) {
      toast.error("Please select a departure date");
      return;
    }

    const params = new URLSearchParams({
      origin: from,
      destination: to,
      departDate: format(departDate, "yyyy-MM-dd"),
      adults: passengers.adults.toString(),
      children: passengers.children.toString(),
      infants: passengers.infants.toString(),
      cabinClass,
      tripType,
    });

    if (tripType === "roundtrip" && returnDate) {
      params.append("returnDate", format(returnDate, "yyyy-MM-dd"));
    }

    navigate(`/flights?${params.toString()}`);
  };

  const updatePassenger = (type: keyof typeof passengers, delta: number) => {
    setPassengers(prev => {
      const newValue = prev[type] + delta;
      if (type === "adults" && newValue < 1) return prev;
      if (newValue < 0) return prev;
      if (type === "infants" && newValue > prev.adults) return prev;
      const total = prev.adults + prev.children + prev.infants + delta;
      if (total > 9) return prev;
      return { ...prev, [type]: newValue };
    });
  };

  // Mobile field component
  const MobileField = ({ 
    label, 
    value, 
    icon: Icon, 
    onClick, 
    placeholder 
  }: { 
    label: string; 
    value?: string; 
    icon: React.ElementType; 
    onClick: () => void;
    placeholder: string;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-3 w-full p-4 text-left border-b border-border last:border-b-0 active:bg-muted/50 transition-colors"
    >
      <Icon className="h-5 w-5 text-muted-foreground shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-muted-foreground mb-0.5">{label}</div>
        <div className={cn(
          "text-sm font-medium truncate",
          value ? "text-foreground" : "text-muted-foreground"
        )}>
          {value || placeholder}
        </div>
      </div>
      <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
    </button>
  );

  // Passenger counter component
  const PassengerCounter = ({ 
    label, 
    sublabel, 
    value, 
    onIncrease, 
    onDecrease,
    minValue = 0
  }: {
    label: string;
    sublabel: string;
    value: number;
    onIncrease: () => void;
    onDecrease: () => void;
    minValue?: number;
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div>
        <div className="font-medium text-foreground">{label}</div>
        <div className="text-sm text-muted-foreground">{sublabel}</div>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onDecrease}
          disabled={value <= minValue}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
        >
          −
        </button>
        <span className="w-6 text-center font-medium">{value}</span>
        <button
          type="button"
          onClick={onIncrease}
          disabled={getTotalPassengers() >= 9}
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-lg disabled:opacity-30 disabled:cursor-not-allowed hover:bg-muted transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );

  // More Options Content
  const MoreOptionsContent = () => (
    <div className="p-4 space-y-6">
      {/* Trip Type */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">Trip Type</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "oneway", label: "One Way" },
            { value: "roundtrip", label: "Round Trip" },
            { value: "multicity", label: "Multi-city" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTripType(option.value as TripType)}
              className={cn(
                "py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                tripType === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Cabin Class */}
      <div>
        <Label className="text-sm font-medium text-foreground mb-3 block">Cabin Class</Label>
        <div className="grid grid-cols-2 gap-2">
          {cabinOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setCabinClass(option.value)}
              className={cn(
                "py-2.5 px-3 rounded-lg text-sm font-medium transition-all border",
                cabinClass === option.value
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card border-border text-foreground hover:bg-muted"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Checkboxes */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Checkbox 
            id="flexibleDates" 
            checked={flexibleDates} 
            onCheckedChange={(checked) => setFlexibleDates(!!checked)}
          />
          <Label htmlFor="flexibleDates" className="text-sm cursor-pointer">Flexible dates (±3 days)</Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox 
            id="nearbyAirports" 
            checked={nearbyAirports} 
            onCheckedChange={(checked) => setNearbyAirports(!!checked)}
          />
          <Label htmlFor="nearbyAirports" className="text-sm cursor-pointer">Include nearby airports</Label>
        </div>
        <div className="flex items-center gap-3">
          <Checkbox 
            id="directOnly" 
            checked={directOnly} 
            onCheckedChange={(checked) => setDirectOnly(!!checked)}
          />
          <Label htmlFor="directOnly" className="text-sm cursor-pointer">Direct flights only</Label>
        </div>
      </div>
    </div>
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <div>
        {/* From Field */}
        <MobileField
          label="From"
          value={from}
          icon={MapPin}
          onClick={() => setFromOpen(true)}
          placeholder="Select departure city"
        />

        {/* Swap Button - inline between fields */}
        <div className="relative h-0">
          <button
            type="button"
            onClick={swapLocations}
            className="absolute -top-5 right-4 z-10 h-10 w-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground rotate-90" />
          </button>
        </div>

        {/* To Field */}
        <MobileField
          label="To"
          value={to}
          icon={MapPin}
          onClick={() => setToOpen(true)}
          placeholder="Select destination"
        />

        {/* Date Field */}
        <MobileField
          label={tripType === "roundtrip" ? "Dates" : "Departure Date"}
          value={departDate ? (tripType === "roundtrip" && returnDate 
            ? `${format(departDate, "MMM d")} - ${format(returnDate, "MMM d")}`
            : format(departDate, "EEE, MMM d")
          ) : undefined}
          icon={Calendar}
          onClick={() => setDateOpen(true)}
          placeholder={tripType === "roundtrip" ? "Select dates" : "Select date"}
        />

        {/* Passengers Field */}
        <MobileField
          label="Travelers"
          value={getPassengerLabel()}
          icon={Users}
          onClick={() => setPassengersOpen(true)}
          placeholder="Add travelers"
        />

        {/* More Options Button */}
        <button
          type="button"
          onClick={() => setMoreOptionsOpen(true)}
          className="flex items-center gap-2 w-full p-4 text-left text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <SlidersHorizontal className="h-4 w-4" />
          <span>More options</span>
          {(tripType !== "oneway" || cabinClass !== "economy" || flexibleDates || nearbyAirports || directOnly) && (
            <span className="ml-auto text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
              Active
            </span>
          )}
        </button>

        {/* Search Button */}
        <div className="p-4 pt-0">
          <Button 
            onClick={handleSearch}
            className="w-full h-12 text-base font-semibold gap-2"
            size="lg"
          >
            <Search className="h-5 w-5" />
            Search Deals
          </Button>
        </div>

        {/* From Sheet */}
        <Sheet open={fromOpen} onOpenChange={setFromOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle>Departure City</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <LocationCombobox
                value={from}
                onChange={(value) => {
                  setFrom(value);
                  if (value.length === 3) setFromOpen(false);
                }}
                placeholder="Search city or airport"
                className="border border-border rounded-lg px-4 py-3 bg-muted/30"
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* To Sheet */}
        <Sheet open={toOpen} onOpenChange={setToOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle>Destination</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <LocationCombobox
                value={to}
                onChange={(value) => {
                  setTo(value);
                  if (value.length === 3) setToOpen(false);
                }}
                placeholder="Search city or airport"
                className="border border-border rounded-lg px-4 py-3 bg-muted/30"
              />
            </div>
          </SheetContent>
        </Sheet>

        {/* Date Drawer */}
        <Drawer open={dateOpen} onOpenChange={setDateOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b border-border">
              <DrawerTitle>{tripType === "roundtrip" ? "Select Dates" : "Select Departure Date"}</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 flex justify-center overflow-y-auto">
              {tripType === "roundtrip" ? (
                <CalendarComponent
                  mode="range"
                  selected={{ from: departDate, to: returnDate }}
                  onSelect={(value) => {
                    setDepartDate(value?.from);
                    setReturnDate(value?.to);
                    if (value?.from && value?.to) setDateOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  numberOfMonths={1}
                  className="pointer-events-auto"
                />
              ) : (
                <CalendarComponent
                  mode="single"
                  selected={departDate}
                  onSelect={(value) => {
                    setDepartDate(value);
                    if (value) setDateOpen(false);
                  }}
                  disabled={(date) => date < new Date()}
                  numberOfMonths={1}
                  className="pointer-events-auto"
                />
              )}
            </div>
          </DrawerContent>
        </Drawer>

        {/* Passengers Drawer */}
        <Drawer open={passengersOpen} onOpenChange={setPassengersOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b border-border">
              <DrawerTitle>Travelers</DrawerTitle>
            </DrawerHeader>
            <div className="p-4">
              <PassengerCounter
                label="Adults"
                sublabel="Age 12+"
                value={passengers.adults}
                onIncrease={() => updatePassenger("adults", 1)}
                onDecrease={() => updatePassenger("adults", -1)}
                minValue={1}
              />
              <PassengerCounter
                label="Children"
                sublabel="Age 2-11"
                value={passengers.children}
                onIncrease={() => updatePassenger("children", 1)}
                onDecrease={() => updatePassenger("children", -1)}
              />
              <PassengerCounter
                label="Infants"
                sublabel="Under 2"
                value={passengers.infants}
                onIncrease={() => updatePassenger("infants", 1)}
                onDecrease={() => updatePassenger("infants", -1)}
              />
              <Button 
                onClick={() => setPassengersOpen(false)}
                className="w-full mt-4"
              >
                Done
              </Button>
            </div>
          </DrawerContent>
        </Drawer>

        {/* More Options Drawer */}
        <Drawer open={moreOptionsOpen} onOpenChange={setMoreOptionsOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b border-border">
              <DrawerTitle>More Options</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto">
              <MoreOptionsContent />
              <div className="p-4 pt-0">
                <Button 
                  onClick={() => setMoreOptionsOpen(false)}
                  className="w-full"
                >
                  Done
                </Button>
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    );
  }

  // Desktop Layout
  return (
    <div className="p-4 md:p-6">
      {/* Search Fields Row */}
      <div className="flex flex-wrap gap-3 items-end">
        {/* From */}
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">From</label>
          <div className="relative border border-border rounded-lg hover:border-primary/50 transition-colors bg-muted/30">
            <LocationCombobox
              value={from}
              onChange={setFrom}
              placeholder="City or airport"
              className="h-12 px-4"
            />
          </div>
        </div>

        {/* Swap Button */}
        <button
          type="button"
          onClick={swapLocations}
          className="h-12 w-12 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors shrink-0"
        >
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
        </button>

        {/* To */}
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">To</label>
          <div className="relative border border-border rounded-lg hover:border-primary/50 transition-colors bg-muted/30">
            <LocationCombobox
              value={to}
              onChange={setTo}
              placeholder="City or airport"
              className="h-12 px-4"
            />
          </div>
        </div>

        {/* Date */}
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">
            {tripType === "roundtrip" ? "Dates" : "Depart"}
          </label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 h-12 px-4 w-full border border-border rounded-lg hover:border-primary/50 transition-colors text-left bg-muted/30",
                  !departDate && "text-muted-foreground"
                )}
              >
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">
                  {departDate 
                    ? (tripType === "roundtrip" && returnDate 
                      ? `${format(departDate, "MMM d")} - ${format(returnDate, "MMM d")}`
                      : format(departDate, "MMM d, yyyy")
                    )
                    : "Add date"
                  }
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              {tripType === "roundtrip" ? (
                <CalendarComponent
                  mode="range"
                  selected={{ from: departDate, to: returnDate }}
                  onSelect={(value) => {
                    setDepartDate(value?.from);
                    setReturnDate(value?.to);
                  }}
                  disabled={(date) => date < new Date()}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              ) : (
                <CalendarComponent
                  mode="single"
                  selected={departDate}
                  onSelect={(value) => {
                    setDepartDate(value);
                  }}
                  disabled={(date) => date < new Date()}
                  numberOfMonths={2}
                  className="pointer-events-auto"
                />
              )}
            </PopoverContent>
          </Popover>
        </div>

        {/* Passengers */}
        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Travelers</label>
          <Popover open={passengersOpen} onOpenChange={setPassengersOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 h-12 px-4 w-full border border-border rounded-lg hover:border-primary/50 transition-colors text-left bg-muted/30"
              >
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{getPassengerLabel()}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72" align="start">
              <div className="space-y-1">
                <PassengerCounter
                  label="Adults"
                  sublabel="Age 12+"
                  value={passengers.adults}
                  onIncrease={() => updatePassenger("adults", 1)}
                  onDecrease={() => updatePassenger("adults", -1)}
                  minValue={1}
                />
                <PassengerCounter
                  label="Children"
                  sublabel="Age 2-11"
                  value={passengers.children}
                  onIncrease={() => updatePassenger("children", 1)}
                  onDecrease={() => updatePassenger("children", -1)}
                />
                <PassengerCounter
                  label="Infants"
                  sublabel="Under 2"
                  value={passengers.infants}
                  onIncrease={() => updatePassenger("infants", 1)}
                  onDecrease={() => updatePassenger("infants", -1)}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* Search Button */}
        <Button 
          onClick={handleSearch}
          className="h-12 px-8 gap-2 font-semibold"
          size="lg"
        >
          <Search className="h-5 w-5" />
          Search Deals
        </Button>
      </div>

      {/* More Options Row */}
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <SlidersHorizontal className="h-4 w-4" />
              <span>More options</span>
              {(tripType !== "oneway" || cabinClass !== "economy" || flexibleDates || nearbyAirports || directOnly) && (
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start">
            <MoreOptionsContent />
          </PopoverContent>
        </Popover>

        {/* Quick Trip Type Toggle */}
        <div className="hidden sm:flex items-center gap-2">
          {[
            { value: "oneway", label: "One Way" },
            { value: "roundtrip", label: "Round Trip" },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTripType(option.value as TripType)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-all",
                tripType === option.value
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CleanFlightSearch;
