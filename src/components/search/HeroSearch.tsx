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
import { useIsMobile } from "@/hooks/use-mobile";
import ModernSearchBox from "./ModernSearchBox";

type SearchType = "flights" | "hotels";
type TripType = "roundtrip" | "oneway" | "multicity";

interface FlightLeg {
  id: string;
  from: string;
  fromDisplay: string;
  to: string;
  toDisplay: string;
  date: string;
// REMOVED: getFlexibleDatePrice - was Math.random() mock prices (orphaned return cleaned 2026-07-20)
}

const HeroSearch = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [searchType, setSearchType] = useState<SearchType>("flights");
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  const [isLoading, setIsLoading] = useState(false);
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

  // HeroSearch component retained for potential reuse — no JSX in current V2 architecture
  return null;
};

export default HeroSearch;
