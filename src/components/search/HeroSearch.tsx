import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Building2, MapPin, Calendar, Users, Search, ArrowLeftRight, ArrowRight, Plus, X, CalendarRange, MapPinned } from "lucide-react";
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
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format, addDays, subDays } from "date-fns";
import { toast } from "sonner";
import LocationCombobox from "./LocationCombobox";
import PassengerPicker, { PassengerCount } from "./PassengerPicker";

type SearchType = "flights" | "hotels";
type TripType = "roundtrip" | "oneway" | "multicity";

interface FlightLeg {
  id: string;
  from: string;
  fromDisplay: string;
  to: string;
  toDisplay: string;
  date: string;
}

// Mock flexible date prices (in production, this would come from an API)
const getFlexibleDatePrice = (date: Date, basePrice: number = 299): number | null => {
  const dayOfWeek = date.getDay();
  const variance = Math.random() * 0.4 - 0.15; // -15% to +25%
  
  // Weekends are more expensive
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return Math.round(basePrice * (1.2 + variance));
  }
  // Tuesdays and Wednesdays are cheaper
  if (dayOfWeek === 2 || dayOfWeek === 3) {
    return Math.round(basePrice * (0.85 + variance));
  }
  return Math.round(basePrice * (1 + variance));
};

const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<SearchType>("flights");
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [isLoading, setIsLoading] = useState(false);
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

  // Multi-city legs
  const [multiCityLegs, setMultiCityLegs] = useState<FlightLeg[]>([
    { id: "leg-1", from: "", fromDisplay: "", to: "", toDisplay: "", date: "" },
    { id: "leg-2", from: "", fromDisplay: "", to: "", toDisplay: "", date: "" },
  ]);

  // Hotel form state
  const [hotelDestination, setHotelDestination] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [guestsRooms, setGuestsRooms] = useState("2-1");

  const tabs = [
    { id: "flights" as const, label: "Flights", icon: Plane },
    { id: "hotels" as const, label: "Hotels", icon: Building2 },
  ];

  const swapLocations = () => {
    const tempCode = flightFrom;
    const tempDisplay = flightFromDisplay;
    setFlightFrom(flightTo);
    setFlightFromDisplay(flightToDisplay);
    setFlightTo(tempCode);
    setFlightToDisplay(tempDisplay);
  };

  // Clear return date when switching to one-way
  const handleTripTypeChange = (type: TripType) => {
    setTripType(type);
    if (type === "oneway") {
      setReturnDate(undefined);
    }
  };

  const addMultiCityLeg = () => {
    if (multiCityLegs.length >= 5) {
      toast.error("Maximum 5 flight legs allowed");
      return;
    }
    const lastLeg = multiCityLegs[multiCityLegs.length - 1];
    setMultiCityLegs([
      ...multiCityLegs,
      { 
        id: `leg-${Date.now()}`, 
        from: lastLeg?.to || "", 
        fromDisplay: lastLeg?.toDisplay || "",
        to: "", 
        toDisplay: "",
        date: "" 
      },
    ]);
  };

  const removeMultiCityLeg = (legId: string) => {
    if (multiCityLegs.length <= 2) {
      toast.error("Minimum 2 flight legs required");
      return;
    }
    setMultiCityLegs(multiCityLegs.filter(leg => leg.id !== legId));
  };

  const updateMultiCityLeg = (legId: string, field: keyof FlightLeg, value: string) => {
    setMultiCityLegs(multiCityLegs.map(leg => 
      leg.id === legId ? { ...leg, [field]: value } : leg
    ));
  };

  const handleFlightSearch = () => {
    const totalPassengers = passengers.adults + passengers.children + passengers.infants;
    
    if (tripType === "multicity") {
      // Validate multi-city
      const invalidLegs = multiCityLegs.filter(leg => !leg.from || !leg.to || !leg.date);
      if (invalidLegs.length > 0) {
        toast.error("Please fill in all flight legs");
        return;
      }
      
      // For multi-city, we'd typically send to a special results page
      // For now, we'll search the first leg
      const firstLeg = multiCityLegs[0];
      const params = new URLSearchParams({
        origin: firstLeg.from.toUpperCase(),
        destination: firstLeg.to.toUpperCase(),
        departureDate: firstLeg.date,
        passengers: String(totalPassengers),
        adults: String(passengers.adults),
        children: String(passengers.children),
        infants: String(passengers.infants),
        cabinClass,
        tripType: "multicity",
      });
      if (nearbyAirports) {
        params.append("nearbyAirports", "true");
      }
      navigate(`/flights?${params.toString()}`);
      return;
    }

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

  // Generate price modifiers for flexible dates calendar
  const getPriceModifier = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (date < today) return null;
    
    const price = getFlexibleDatePrice(date);
    if (!price) return null;
    
    // Determine if it's a good deal
    if (price < 270) return { price, type: "low" as const };
    if (price > 350) return { price, type: "high" as const };
    return { price, type: "normal" as const };
  };

  return (
    <div className="search-container w-full max-w-5xl mx-auto">
      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-border">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSearchType(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-all border-b-2 -mb-px ${
              searchType === tab.id
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Flight Search Form */}
      {searchType === "flights" && (
        <div className="space-y-4">
          {/* Trip Type Toggle */}
          <div className="flex items-center gap-1 p-1 bg-secondary/50 rounded-lg w-fit">
            <button
              onClick={() => handleTripTypeChange("roundtrip")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tripType === "roundtrip"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowLeftRight className="h-4 w-4" />
              Round Trip
            </button>
            <button
              onClick={() => handleTripTypeChange("oneway")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tripType === "oneway"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowRight className="h-4 w-4" />
              One Way
            </button>
            <button
              onClick={() => handleTripTypeChange("multicity")}
              className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                tripType === "multicity"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Plus className="h-4 w-4" />
              Multi-City
            </button>
          </div>

          {/* Standard Search (Round-trip / One-way) */}
          {tripType !== "multicity" && (
            <>
              {/* Row 1: From/To */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="relative flex items-center">
                  <div className="flex-1">
                    <LocationCombobox
                      value={flightFromDisplay}
                      onChange={(code, airport) => {
                        setFlightFrom(code);
                        setFlightFromDisplay(airport ? `${airport.city} (${airport.code})` : code);
                      }}
                      placeholder="From (e.g., JFK, NYC)"
                    />
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-1/2 translate-x-1/2 z-10 bg-card border border-border rounded-full h-8 w-8 hidden md:flex"
                    onClick={swapLocations}
                  >
                    <ArrowLeftRight className="h-4 w-4" />
                  </Button>
                </div>
                <div>
                  <LocationCombobox
                    value={flightToDisplay}
                    onChange={(code, airport) => {
                      setFlightTo(code);
                      setFlightToDisplay(airport ? `${airport.city} (${airport.code})` : code);
                    }}
                    placeholder="To (e.g., LAX, Los Angeles)"
                  />
                </div>
              </div>

              {/* Row 2: Dates, Passengers, Class */}
              <div className={`grid grid-cols-1 gap-3 ${
                tripType === "roundtrip" 
                  ? "sm:grid-cols-2 lg:grid-cols-4" 
                  : "sm:grid-cols-2 lg:grid-cols-3"
              }`}>
                {/* Departure Date Picker */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-12 justify-start text-left font-normal",
                        !departureDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {departureDate ? format(departureDate, "MMM d, yyyy") : "Departure"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    {flexibleDates ? (
                      <div className="p-3">
                        <div className="text-sm font-medium mb-2 flex items-center gap-2">
                          <CalendarRange className="h-4 w-4 text-primary" />
                          Flexible Dates - Prices shown
                        </div>
                        <div className="flex gap-2 text-xs mb-3">
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-green-500" /> Low
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-yellow-500" /> Normal
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-3 h-3 rounded-full bg-red-500" /> High
                          </span>
                        </div>
                        <CalendarComponent
                          mode="single"
                          selected={departureDate}
                          onSelect={setDepartureDate}
                          disabled={(date) => date < new Date()}
                          initialFocus
                          className="pointer-events-auto"
                          modifiers={{
                            lowPrice: (date) => getPriceModifier(date)?.type === "low",
                            highPrice: (date) => getPriceModifier(date)?.type === "high",
                          }}
                          modifiersClassNames={{
                            lowPrice: "!bg-green-100 dark:!bg-green-900/30 !text-green-700 dark:!text-green-400",
                            highPrice: "!bg-red-100 dark:!bg-red-900/30 !text-red-700 dark:!text-red-400",
                          }}
                          components={{
                            DayContent: ({ date }) => {
                              const modifier = getPriceModifier(date);
                              return (
                                <div className="flex flex-col items-center">
                                  <span>{date.getDate()}</span>
                                  {modifier && (
                                    <span className="text-[9px] font-medium leading-none opacity-75">
                                      ${modifier.price}
                                    </span>
                                  )}
                                </div>
                              );
                            },
                          }}
                        />
                      </div>
                    ) : (
                      <CalendarComponent
                        mode="single"
                        selected={departureDate}
                        onSelect={setDepartureDate}
                        disabled={(date) => date < new Date()}
                        initialFocus
                        className="p-3 pointer-events-auto"
                      />
                    )}
                  </PopoverContent>
                </Popover>

                {/* Return Date Picker (only for round-trip) */}
                {tripType === "roundtrip" && (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "h-12 justify-start text-left font-normal",
                          !returnDate && "text-muted-foreground"
                        )}
                      >
                        <Calendar className="mr-2 h-4 w-4" />
                        {returnDate ? format(returnDate, "MMM d, yyyy") : "Return"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      {flexibleDates ? (
                        <div className="p-3">
                          <div className="text-sm font-medium mb-2 flex items-center gap-2">
                            <CalendarRange className="h-4 w-4 text-primary" />
                            Flexible Dates - Prices shown
                          </div>
                          <CalendarComponent
                            mode="single"
                            selected={returnDate}
                            onSelect={setReturnDate}
                            disabled={(date) => date < (departureDate || new Date())}
                            initialFocus
                            className="pointer-events-auto"
                            modifiers={{
                              lowPrice: (date) => getPriceModifier(date)?.type === "low",
                              highPrice: (date) => getPriceModifier(date)?.type === "high",
                            }}
                            modifiersClassNames={{
                              lowPrice: "!bg-green-100 dark:!bg-green-900/30 !text-green-700 dark:!text-green-400",
                              highPrice: "!bg-red-100 dark:!bg-red-900/30 !text-red-700 dark:!text-red-400",
                            }}
                            components={{
                              DayContent: ({ date }) => {
                                const modifier = getPriceModifier(date);
                                return (
                                  <div className="flex flex-col items-center">
                                    <span>{date.getDate()}</span>
                                    {modifier && (
                                      <span className="text-[9px] font-medium leading-none opacity-75">
                                        ${modifier.price}
                                      </span>
                                    )}
                                  </div>
                                );
                              },
                            }}
                          />
                        </div>
                      ) : (
                        <CalendarComponent
                          mode="single"
                          selected={returnDate}
                          onSelect={setReturnDate}
                          disabled={(date) => date < (departureDate || new Date())}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      )}
                    </PopoverContent>
                  </Popover>
                )}

                <PassengerPicker value={passengers} onChange={setPassengers} />
                <Select value={cabinClass} onValueChange={setCabinClass}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Cabin class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium">Premium Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search Options */}
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {/* Flexible Dates Toggle */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="flexible-dates"
                    checked={flexibleDates}
                    onCheckedChange={(checked) => setFlexibleDates(checked === true)}
                  />
                  <label
                    htmlFor="flexible-dates"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                  >
                    <CalendarRange className="h-4 w-4 text-primary" />
                    Flexible dates with prices
                  </label>
                </div>

                {/* Nearby Airports Toggle */}
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="nearby-airports"
                    checked={nearbyAirports}
                    onCheckedChange={(checked) => setNearbyAirports(checked === true)}
                  />
                  <label
                    htmlFor="nearby-airports"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                  >
                    <MapPinned className="h-4 w-4 text-primary" />
                    Include nearby airports
                  </label>
                </div>
              </div>
            </>
          )}

          {/* Multi-City Search */}
          {tripType === "multicity" && (
            <>
              <div className="space-y-3">
                {multiCityLegs.map((leg, index) => (
                  <div key={leg.id} className="flex items-start gap-3">
                    <div className="flex items-center justify-center w-6 h-12 text-sm font-semibold text-muted-foreground">
                      {index + 1}
                    </div>
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <LocationCombobox
                        value={leg.fromDisplay}
                        onChange={(code, airport) => {
                          updateMultiCityLeg(leg.id, "from", code);
                          updateMultiCityLeg(leg.id, "fromDisplay", airport ? `${airport.city} (${airport.code})` : code);
                        }}
                        placeholder="From"
                      />
                      <LocationCombobox
                        value={leg.toDisplay}
                        onChange={(code, airport) => {
                          updateMultiCityLeg(leg.id, "to", code);
                          updateMultiCityLeg(leg.id, "toDisplay", airport ? `${airport.city} (${airport.code})` : code);
                        }}
                        placeholder="To"
                      />
                      <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="date"
                          className="pl-10 h-12"
                          value={leg.date}
                          onChange={(e) => updateMultiCityLeg(leg.id, "date", e.target.value)}
                        />
                      </div>
                    </div>
                    {multiCityLegs.length > 2 && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-12 w-12 shrink-0"
                        onClick={() => removeMultiCityLeg(leg.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {/* Add Flight Button */}
              {multiCityLegs.length < 5 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addMultiCityLeg}
                  className="ml-9"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add another flight
                </Button>
              )}

              {/* Passengers and Class */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 ml-9">
                <PassengerPicker value={passengers} onChange={setPassengers} />
                <Select value={cabinClass} onValueChange={setCabinClass}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Cabin class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="economy">Economy</SelectItem>
                    <SelectItem value="premium">Premium Economy</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="first">First Class</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Nearby Airports Toggle */}
              <div className="flex items-center gap-2 ml-9">
                <Checkbox
                  id="nearby-airports-multi"
                  checked={nearbyAirports}
                  onCheckedChange={(checked) => setNearbyAirports(checked === true)}
                />
                <label
                  htmlFor="nearby-airports-multi"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-2 cursor-pointer"
                >
                  <MapPinned className="h-4 w-4 text-primary" />
                  Include nearby airports
                </label>
              </div>
            </>
          )}

          {/* Search Button */}
          <div className="pt-2">
            <Button 
              variant="search" 
              size="lg" 
              className="w-full sm:w-auto h-12 px-12"
              onClick={handleFlightSearch}
              disabled={isLoading}
            >
              <Search className="h-4 w-4" />
              Search Flights
            </Button>
          </div>
        </div>
      )}

      {/* Hotel Search Form */}
      {searchType === "hotels" && (
        <div className="space-y-4">
          {/* Row 1: Destination */}
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Where are you going? (e.g., Paris, New York)"
              className="pl-10 h-12"
              value={hotelDestination}
              onChange={(e) => setHotelDestination(e.target.value)}
            />
          </div>

          {/* Row 2: Dates, Guests */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
          <div className="pt-2">
            <Button 
              variant="search" 
              size="lg" 
              className="w-full sm:w-auto h-12 px-12"
              onClick={handleHotelSearch}
              disabled={isLoading}
            >
              <Search className="h-4 w-4" />
              Search Hotels
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HeroSearch;
