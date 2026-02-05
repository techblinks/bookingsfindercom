import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, ArrowRightLeft, Calendar, ChevronRight, Search, X, Users, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
 import { format } from "date-fns";
import { toast } from "sonner";
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

type TripType = "roundtrip" | "oneway" | "multicity";

interface FlightLeg {
  id: string;
  from: string;
  fromDisplay: string;
  to: string;
  toDisplay: string;
  date: string;
}

const MobileFlightSearch = () => {
  const navigate = useNavigate();
  const [tripType, setTripType] = useState<TripType>("roundtrip");
  
  // Form state
  const [flightFrom, setFlightFrom] = useState("");
  const [flightFromDisplay, setFlightFromDisplay] = useState("");
  const [flightTo, setFlightTo] = useState("");
  const [flightToDisplay, setFlightToDisplay] = useState("");
  const [departureDate, setDepartureDate] = useState<Date | undefined>();
  const [returnDate, setReturnDate] = useState<Date | undefined>();
  const [passengers, setPassengers] = useState<PassengerCount>({ adults: 1, children: 0, infants: 0 });
  const [cabinClass, setCabinClass] = useState("economy");
  
  // Sheet/modal states
  const [fromSheetOpen, setFromSheetOpen] = useState(false);
  const [toSheetOpen, setToSheetOpen] = useState(false);
   const [departureDateOpen, setDepartureDateOpen] = useState(false);
   const [returnDateOpen, setReturnDateOpen] = useState(false);
  const [optionsDrawerOpen, setOptionsDrawerOpen] = useState(false);
  
  // Multi-city legs
  const [multiCityLegs, setMultiCityLegs] = useState<FlightLeg[]>([
    { id: "leg-1", from: "", fromDisplay: "", to: "", toDisplay: "", date: "" },
    { id: "leg-2", from: "", fromDisplay: "", to: "", toDisplay: "", date: "" },
  ]);

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
    const parts = [];
    if (passengers.adults > 0) parts.push(`${passengers.adults} Adult${passengers.adults > 1 ? 's' : ''}`);
    if (passengers.children > 0) parts.push(`${passengers.children} Child${passengers.children > 1 ? 'ren' : ''}`);
    if (passengers.infants > 0) parts.push(`${passengers.infants} Infant${passengers.infants > 1 ? 's' : ''}`);
    return parts.join(', ') || '1 Adult';
  };

  const getCabinLabel = () => {
    const labels: Record<string, string> = {
      economy: "Economy",
      premium: "Premium",
      business: "Business",
      first: "First"
    };
    return labels[cabinClass] || "Economy";
  };

   const handleDepartureDateSelect = (date: Date) => {
     setDepartureDate(date);
     // Clear return date if it's before new departure
     if (returnDate && date > returnDate) {
       setReturnDate(undefined);
     }
   };
 
   const handleReturnDateSelect = (date: Date) => {
     setReturnDate(date);
  };

  const handleSearch = () => {
    if (!flightFrom || !flightTo || !departureDate) {
      toast.error("Please fill in all required fields");
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

    navigate(`/flights?${params.toString()}`);
  };

  const updatePassengerCount = (type: keyof PassengerCount, increment: boolean) => {
    setPassengers(prev => {
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
      {/* Location Fields - Stacked */}
      <div className="relative">
        {/* From Field */}
         <button 
           onClick={() => setFromSheetOpen(true)}
           className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-t-xl text-left native-press min-h-[72px]"
         >
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
             <Plane className="h-6 w-6 text-primary -rotate-45" />
           </div>
           <div className="flex-1 min-w-0">
             <div className="text-xs text-muted-foreground font-medium">From</div>
             <div className={cn(
               "text-base font-semibold truncate",
               !flightFromDisplay && "text-muted-foreground font-medium"
             )}>
               {flightFromDisplay || "Select departure city"}
             </div>
           </div>
           <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
         </button>

         <NativeLocationPicker
           isOpen={fromSheetOpen}
           onClose={() => setFromSheetOpen(false)}
           onSelect={(code: string, airport: Airport) => {
             setFlightFrom(code);
             setFlightFromDisplay(`${airport.city} (${airport.code})`);
           }}
           title="Where from?"
           placeholder="Search airports or cities..."
         />

        {/* Swap Button */}
        <button
          onClick={swapLocations}
           className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-12 h-12 bg-card border border-border rounded-full flex items-center justify-center shadow-sm native-touch"
        >
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground rotate-90" />
        </button>

        {/* To Field */}
         <button 
           onClick={() => setToSheetOpen(true)}
           className="w-full flex items-center gap-3 p-4 bg-card border border-border border-t-0 rounded-b-xl text-left native-press min-h-[72px]"
         >
           <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
             <Plane className="h-6 w-6 text-accent rotate-45" />
           </div>
           <div className="flex-1 min-w-0">
             <div className="text-xs text-muted-foreground font-medium">To</div>
             <div className={cn(
               "text-base font-semibold truncate",
               !flightToDisplay && "text-muted-foreground font-medium"
             )}>
               {flightToDisplay || "Select destination city"}
             </div>
           </div>
           <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
         </button>

         <NativeLocationPicker
           isOpen={toSheetOpen}
           onClose={() => setToSheetOpen(false)}
           onSelect={(code: string, airport: Airport) => {
             setFlightTo(code);
             setFlightToDisplay(`${airport.city} (${airport.code})`);
           }}
           title="Where to?"
           placeholder="Search airports or cities..."
         />
      </div>

       {/* Date Fields - Separate for departure and return */}
       <div className={cn(
         "grid gap-2",
         tripType === "roundtrip" ? "grid-cols-2" : "grid-cols-1"
       )}>
         {/* Departure Date */}
         <button 
           onClick={() => setDepartureDateOpen(true)}
           className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left native-press min-h-[72px]"
         >
           <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
             <Calendar className="h-6 w-6 text-primary" />
           </div>
           <div className="flex-1">
             <div className="text-xs text-muted-foreground font-medium">Depart</div>
             <div className={cn(
               "text-base font-semibold",
               !departureDate && "text-muted-foreground font-medium"
             )}>
               {departureDate ? format(departureDate, "MMM d, yyyy") : "Select date"}
             </div>
           </div>
         </button>

         {/* Return Date (only for roundtrip) */}
         {tripType === "roundtrip" && (
           <button 
             onClick={() => setReturnDateOpen(true)}
             className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left native-press min-h-[72px]"
           >
             <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
               <Calendar className="h-6 w-6 text-accent" />
             </div>
             <div className="flex-1">
               <div className="text-xs text-muted-foreground font-medium">Return</div>
               <div className={cn(
                 "text-base font-semibold",
                 !returnDate && "text-muted-foreground font-medium"
               )}>
                 {returnDate ? format(returnDate, "MMM d, yyyy") : "Select date"}
               </div>
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
         onSelect={handleReturnDateSelect}
         selected={returnDate}
         minDate={departureDate}
         title="Select Return Date"
       />

      {/* Travelers & Class - Combined field with progressive disclosure */}
      <Drawer open={optionsDrawerOpen} onOpenChange={setOptionsDrawerOpen}>
        <DrawerTrigger asChild>
           <button className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left native-press min-h-[72px]">
             <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
               <Users className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1">
               <div className="text-xs text-muted-foreground font-medium">Travelers & Class</div>
               <div className="text-base font-semibold">
                {totalPassengers} traveler{totalPassengers > 1 ? 's' : ''}, {getCabinLabel()}
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
              <div className="text-sm font-medium text-muted-foreground mb-3">Trip type</div>
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
                       "py-4 px-4 rounded-xl text-sm font-semibold transition-colors min-h-[52px]",
                      tripType === type.value
                        ? "bg-primary text-primary-foreground"
                         : "bg-secondary text-secondary-foreground native-press"
                    )}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Passenger Counts */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-muted-foreground">Travelers</div>
              
              {/* Adults */}
               <div className="flex items-center justify-between min-h-[56px]">
                <div>
                  <div className="font-medium">Adults</div>
                  <div className="text-sm text-muted-foreground">Age 12+</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => updatePassengerCount("adults", false)}
                    disabled={passengers.adults <= 1}
                     className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{passengers.adults}</span>
                  <button
                    onClick={() => updatePassengerCount("adults", true)}
                    disabled={totalPassengers >= 9}
                     className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Children */}
               <div className="flex items-center justify-between min-h-[56px]">
                <div>
                  <div className="font-medium">Children</div>
                  <div className="text-sm text-muted-foreground">Age 2-11</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => updatePassengerCount("children", false)}
                    disabled={passengers.children <= 0}
                     className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{passengers.children}</span>
                  <button
                    onClick={() => updatePassengerCount("children", true)}
                    disabled={totalPassengers >= 9}
                     className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Infants */}
               <div className="flex items-center justify-between min-h-[56px]">
                <div>
                  <div className="font-medium">Infants</div>
                  <div className="text-sm text-muted-foreground">Under 2, on lap</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => updatePassengerCount("infants", false)}
                    disabled={passengers.infants <= 0}
                     className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                  >
                    −
                  </button>
                  <span className="w-6 text-center font-semibold">{passengers.infants}</span>
                  <button
                    onClick={() => updatePassengerCount("infants", true)}
                    disabled={passengers.infants >= passengers.adults || totalPassengers >= 9}
                     className="w-12 h-12 rounded-full border border-border flex items-center justify-center text-lg font-semibold disabled:opacity-30 native-press"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Cabin Class */}
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

      {/* Search Button - Full width, prominent */}
      <Button 
        onClick={handleSearch}
         className="w-full h-16 text-base font-semibold rounded-xl mt-4 native-button"
        size="lg"
      >
        <Search className="h-5 w-5 mr-2" />
        Search flights
      </Button>
    </div>
  );
};

export default MobileFlightSearch;
