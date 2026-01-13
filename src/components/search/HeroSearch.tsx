import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Plane, 
  Building2, 
  MapPin, 
  Calendar, 
  Users, 
  Search, 
  ArrowLeftRight, 
  ChevronDown,
  Settings2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import LocationCombobox from "./LocationCombobox";
import PassengerPicker, { PassengerCount } from "./PassengerPicker";
import { useIsMobile } from "@/hooks/use-mobile";
import MobileHeroSearch from "./MobileHeroSearch";

type SearchType = "flights" | "hotels";
type TripType = "roundtrip" | "oneway" | "multicity";

const HeroSearch = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchType, setSearchType] = useState<SearchType>("flights");
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [isLoading, setIsLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [flexibleDates, setFlexibleDates] = useState(false);
  const [nearbyAirports, setNearbyAirports] = useState(false);

  // Flight form state
  const [flightFrom, setFlightFrom] = useState("");
  const [flightFromDisplay, setFlightFromDisplay] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightToDisplay, setFlightToDisplay] = useState("");
  const [departureDate, setDepartureDate] = useState<Date | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [passengers, setPassengers] = useState<PassengerCount>({ adults: 1, children: 0, infants: 0 });
  const [cabinClass, setCabinClass] = useState("economy");

  // Hotel form state
  const [hotelDestination, setHotelDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsRooms, setGuestsRooms] = useState("2-1");

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane },
    { id: "hotels" as const, label: "Hotels", icon: Building2 },
  ];

  const tripTypes = [
    { value: "roundtrip" as const, label: "Round trip" },
    { value: "oneway" as const, label: "One way" },
    { value: "multicity" as const, label: "Multi-city" },
  ];

  const cabinClasses = [
    { value: "economy", label: "Economy" },
    { value: "premium", label: "Premium Economy" },
    { value: "business", label: "Business" },
    { value: "first", label: "First Class" },
  ];

  const swapLocations = () => {
    const tempCode = flightFrom;
    const tempDisplay = flightFromDisplay;
    setFlightFrom(flightTo);
    setFlightFromDisplay(flightToDisplay);
    setFlightTo(tempCode);
    setFlightToDisplay(tempDisplay);
  };

  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    if (type === "oneway") {
      setReturnDate(undefined);
    }
  };

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const getTravelersLabel = () => {
    const cabin = cabinClasses.find(c => c.value === cabinClass)?.label || "Economy";
    return `${totalPassengers} traveler${totalPassengers > 1 ? 's' : ''}, ${cabin}`;
  };

  const handleFlightSearch = () => {
    if (!flightFrom || !flightTo || !departureDate) {
      toast.error("Please fill in origin, destination, and departure date");
      return;
    }

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

    if (flexibleDates) {
      params.append("flexibleDates", "true");
    }

    if (nearbyAirports) {
      params.append("nearbyAirports", "true");
    }

    navigate(`/flights?${params.toString()}`);
  };

  const handleHotelSearch = () => {
    if (!hotelDestination || !checkIn || !checkOut) {
      toast.error("Please fill in destination, check-in, and check-out dates");
      return;
    }

    const [guests, rooms] = guestsRooms.split("-");

    const params = new URLSearchParams({
      destination: hotelDestination,
      checkIn,
      checkOut,
      guests,
      rooms,
    });

    navigate(`/hotels?${params.toString()}`);
  };

  // Render mobile-optimized search for mobile devices
  if (isMobile) {
    return <MobileHeroSearch />;
  }

  return (
    <div className="search-container w-full">
      {/* Tabs - Clean and minimal */}
      <div className="flex gap-1 p-1.5 bg-muted/50 rounded-xl mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSearchType(tab.id)}
            className={cn(
              "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all",
              searchType === tab.id
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Flight Search Form */}
      {searchType === "flights" && (
        <div className="space-y-4">
          {/* Trip Type - Compact dropdown */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm font-medium">
                  {tripTypes.find(t => t.value === tripType)?.label}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                {tripTypes.map((type) => (
                  <DropdownMenuItem 
                    key={type.value}
                    onClick={() => handleTripTypeChange(type.value)}
                    className={cn(tripType === type.value && "bg-accent")}
                  >
                    {type.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-muted-foreground">•</span>

            {/* Travelers & Class - Combined */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-sm font-medium">
                  <Users className="h-3.5 w-3.5" />
                  {getTravelersLabel()}
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-4" align="start">
                <div className="space-y-4">
                  {/* Passenger counts */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">Adults</div>
                        <div className="text-xs text-muted-foreground">12+ years</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPassengers(p => ({ ...p, adults: Math.max(1, p.adults - 1) }))}
                          disabled={passengers.adults <= 1}
                        >
                          −
                        </Button>
                        <span className="w-4 text-center font-medium">{passengers.adults}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPassengers(p => ({ ...p, adults: Math.min(9, p.adults + 1) }))}
                          disabled={totalPassengers >= 9}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">Children</div>
                        <div className="text-xs text-muted-foreground">2-11 years</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPassengers(p => ({ ...p, children: Math.max(0, p.children - 1) }))}
                          disabled={passengers.children <= 0}
                        >
                          −
                        </Button>
                        <span className="w-4 text-center font-medium">{passengers.children}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPassengers(p => ({ ...p, children: Math.min(8, p.children + 1) }))}
                          disabled={totalPassengers >= 9}
                        >
                          +
                        </Button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-sm">Infants</div>
                        <div className="text-xs text-muted-foreground">Under 2, on lap</div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPassengers(p => ({ ...p, infants: Math.max(0, p.infants - 1) }))}
                          disabled={passengers.infants <= 0}
                        >
                          −
                        </Button>
                        <span className="w-4 text-center font-medium">{passengers.infants}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setPassengers(p => ({ ...p, infants: Math.min(passengers.adults, p.infants + 1) }))}
                          disabled={passengers.infants >= passengers.adults}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Cabin class */}
                  <div className="pt-3 border-t">
                    <div className="text-sm font-medium mb-2">Cabin class</div>
                    <div className="grid grid-cols-2 gap-2">
                      {cabinClasses.map((cabin) => (
                        <button
                          key={cabin.value}
                          onClick={() => setCabinClass(cabin.value)}
                          className={cn(
                            "px-3 py-2 text-sm rounded-lg border transition-colors",
                            cabinClass === cabin.value
                              ? "border-primary bg-primary/5 text-primary"
                              : "border-border hover:bg-muted"
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

          {/* Main Search Row */}
          <div className="grid grid-cols-12 gap-2">
            {/* From */}
            <div className="col-span-12 md:col-span-3">
              <LocationCombobox
                value={flightFromDisplay}
                onChange={(code, airport) => {
                  setFlightFrom(code);
                  setFlightFromDisplay(airport ? `${airport.city} (${airport.code})` : code);
                }}
                placeholder="From"
              />
            </div>

            {/* Swap Button */}
            <div className="hidden md:flex col-span-1 items-center justify-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-10 w-10 rounded-full border"
                onClick={swapLocations}
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
            </div>

            {/* To */}
            <div className="col-span-12 md:col-span-3">
              <LocationCombobox
                value={flightToDisplay}
                onChange={(code, airport) => {
                  setFlightTo(code);
                  setFlightToDisplay(airport ? `${airport.city} (${airport.code})` : code);
                }}
                placeholder="To"
              />
            </div>

            {/* Departure Date */}
            <div className={cn(
              "col-span-6",
              tripType === "roundtrip" ? "md:col-span-2" : "md:col-span-3"
            )}>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full h-12 justify-start text-left font-normal",
                      !departureDate && "text-muted-foreground"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {departureDate ? format(departureDate, "MMM d") : "Depart"}
                  </Button>
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

            {/* Return Date (only for round-trip) */}
            {tripType === "roundtrip" && (
              <div className="col-span-6 md:col-span-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full h-12 justify-start text-left font-normal",
                        !returnDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {returnDate ? format(returnDate, "MMM d") : "Return"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
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
              </div>
            )}

            {/* Search Button */}
            <div className="col-span-12 md:col-span-1">
              <Button 
                className="w-full h-12"
                onClick={handleFlightSearch}
                disabled={isLoading}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <div className="flex items-center gap-4 pt-1">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors"
            >
              <Settings2 className="h-4 w-4" />
              More options
              <ChevronDown className={cn(
                "h-3.5 w-3.5 transition-transform",
                showAdvanced && "rotate-180"
              )} />
            </button>
          </div>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-2 pb-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="flexible-dates"
                  checked={flexibleDates}
                  onCheckedChange={(checked) => setFlexibleDates(checked === true)}
                />
                <label
                  htmlFor="flexible-dates"
                  className="text-sm font-medium cursor-pointer"
                >
                  Flexible dates
                </label>
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="nearby-airports"
                  checked={nearbyAirports}
                  onCheckedChange={(checked) => setNearbyAirports(checked === true)}
                />
                <label
                  htmlFor="nearby-airports"
                  className="text-sm font-medium cursor-pointer"
                >
                  Nearby airports
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hotel Search Form */}
      {searchType === "hotels" && (
        <div className="space-y-4">
          {/* Main Search Row */}
          <div className="grid grid-cols-12 gap-2">
            {/* Destination */}
            <div className="col-span-12 md:col-span-4">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Where are you going?"
                  className="pl-10 h-12"
                  value={hotelDestination}
                  onChange={(e) => setHotelDestination(e.target.value)}
                />
              </div>
            </div>

            {/* Check-in */}
            <div className="col-span-6 md:col-span-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Check-in"
                  className="pl-10 h-12"
                  value={checkIn}
                  onChange={(e) => setCheckIn(e.target.value)}
                />
              </div>
            </div>

            {/* Check-out */}
            <div className="col-span-6 md:col-span-2">
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Check-out"
                  className="pl-10 h-12"
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>

            {/* Guests & Rooms */}
            <div className="col-span-12 md:col-span-3">
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                <Select value={guestsRooms} onValueChange={setGuestsRooms}>
                  <SelectTrigger className="pl-10 h-12">
                    <SelectValue placeholder="Guests" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1-1">1 Guest, 1 Room</SelectItem>
                    <SelectItem value="2-1">2 Guests, 1 Room</SelectItem>
                    <SelectItem value="3-1">3 Guests, 1 Room</SelectItem>
                    <SelectItem value="4-2">4 Guests, 2 Rooms</SelectItem>
                    <SelectItem value="6-3">6 Guests, 3 Rooms</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Search Button */}
            <div className="col-span-12 md:col-span-1">
              <Button 
                className="w-full h-12"
                onClick={handleHotelSearch}
                disabled={isLoading}
              >
                <Search className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSearch;