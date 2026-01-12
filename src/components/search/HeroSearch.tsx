import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Building2, MapPin, Calendar, Users, Search, ArrowLeftRight, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import LocationCombobox from "./LocationCombobox";

type SearchType = "flights" | "hotels";
type TripType = "roundtrip" | "oneway";

const HeroSearch = () => {
  const navigate = useNavigate();
  const [searchType, setSearchType] = useState<SearchType>("flights");
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [isLoading, setIsLoading] = useState(false);

  // Flight form state
  const [flightFrom, setFlightFrom] = useState("");
  const [flightFromDisplay, setFlightFromDisplay] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightToDisplay, setFlightToDisplay] = useState("");
  const [departureDate, setDepartureDate] = useState("");
  const [returnDate, setReturnDate] = useState("");
  const [passengers, setPassengers] = useState("1");
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
      setReturnDate("");
    }
  };

  const handleFlightSearch = () => {
    if (!flightFrom || !flightTo || !departureDate) {
      toast.error("Please fill in origin, destination, and departure date");
      return;
    }

    const params = new URLSearchParams({
      origin: flightFrom.toUpperCase(),
      destination: flightTo.toUpperCase(),
      departureDate,
      passengers,
      cabinClass,
    });

    if (returnDate) {
      params.append("returnDate", returnDate);
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
          </div>

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
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="date"
                placeholder="Departure"
                className="pl-10 h-12"
                value={departureDate}
                onChange={(e) => setDepartureDate(e.target.value)}
              />
            </div>
            {tripType === "roundtrip" && (
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Return"
                  className="pl-10 h-12"
                  value={returnDate}
                  min={departureDate || undefined}
                  onChange={(e) => setReturnDate(e.target.value)}
                />
              </div>
            )}
            <div className="relative">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
              <Select value={passengers} onValueChange={setPassengers}>
                <SelectTrigger className="pl-10 h-12">
                  <SelectValue placeholder="Passengers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Passenger</SelectItem>
                  <SelectItem value="2">2 Passengers</SelectItem>
                  <SelectItem value="3">3 Passengers</SelectItem>
                  <SelectItem value="4">4 Passengers</SelectItem>
                  <SelectItem value="5">5+ Passengers</SelectItem>
                </SelectContent>
              </Select>
            </div>
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
