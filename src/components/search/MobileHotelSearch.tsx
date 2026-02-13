import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, ChevronDown, Search, Minus, Plus, Building } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import NativeDatePicker from "./NativeDatePicker";
import { X } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from "@/components/ui/drawer";

const popularDestinations = [
  { name: "New York", country: "USA" },
  { name: "Paris", country: "France" },
  { name: "London", country: "UK" },
  { name: "Tokyo", country: "Japan" },
  { name: "Dubai", country: "UAE" },
  { name: "Barcelona", country: "Spain" },
];

const MobileHotelSearch = () => {
  const navigate = useNavigate();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);

  const [destinationSheetOpen, setDestinationSheetOpen] = useState(false);
  const [checkInDateOpen, setCheckInDateOpen] = useState(false);
  const [checkOutDateOpen, setCheckOutDateOpen] = useState(false);
  const [guestsDrawerOpen, setGuestsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleCheckInSelect = (date: Date) => {
    setCheckIn(date);
    if (checkOut && date >= checkOut) {
      setCheckOut(undefined);
    }
  };

  const handleCheckOutSelect = (date: Date) => {
    setCheckOut(date);
  };

  const handleSearch = () => {
    if (!destination || !checkIn || !checkOut) {
      toast.error("Please fill in all fields");
      return;
    }

    const params = new URLSearchParams({
      destination,
      checkIn: format(checkIn, "yyyy-MM-dd"),
      checkOut: format(checkOut, "yyyy-MM-dd"),
      guests: String(guests),
      rooms: String(rooms),
    });

    navigate(`/hotels?${params.toString()}`);
  };

  return (
    <div className="w-full space-y-4">
      {/* Destination Field */}
      <div>
        <label className="text-xs font-medium text-primary-foreground/60 mb-1 block">Destination</label>
        <button
          onClick={() => setDestinationSheetOpen(true)}
          className="w-full flex items-center gap-3 px-4 py-3.5 bg-primary-foreground/95 rounded-xl text-left native-press min-h-[52px]"
        >
          <MapPin className="h-5 w-5 text-primary shrink-0" />
          <span className={cn(
            "text-base font-medium truncate",
            destination ? "text-foreground" : "text-muted-foreground"
          )}>
            {destination || "Where are you going?"}
          </span>
        </button>
      </div>

      {/* Native Destination Picker */}
      <AnimatePresence>
        {destinationSheetOpen && (
          <motion.div
            initial={{ opacity: 0, y: "100%" }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 bg-background"
          >
            <div className="flex flex-col h-full safe-area-inset">
              <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card">
                <button
                  onClick={() => setDestinationSheetOpen(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full native-press"
                >
                  <X className="h-5 w-5 text-foreground" />
                </button>
                <h2 className="text-lg font-semibold text-foreground flex-1">Where are you staying?</h2>
              </div>

              <div className="px-4 py-3 border-b border-border bg-card">
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search city, hotel, or landmark..."
                    className="w-full h-14 pl-12 pr-12 bg-secondary rounded-xl text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    autoFocus
                    autoComplete="off"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-4 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center rounded-full bg-muted"
                    >
                      <X className="h-3 w-3 text-muted-foreground" />
                    </button>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-auto">
                <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Popular Destinations
                </div>
                <div className="divide-y divide-border">
                  {popularDestinations
                    .filter(d =>
                      !searchQuery ||
                      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                      d.country.toLowerCase().includes(searchQuery.toLowerCase())
                    )
                    .map((dest, index) => (
                      <motion.button
                        key={dest.name}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                        onClick={() => {
                          setDestination(dest.name);
                          setDestinationSheetOpen(false);
                          setSearchQuery("");
                        }}
                        className="w-full flex items-center gap-4 px-4 py-4 native-press transition-colors text-left min-h-[56px]"
                      >
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Building className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-foreground text-base">{dest.name}</div>
                          <div className="text-sm text-muted-foreground">{dest.country}</div>
                        </div>
                      </motion.button>
                    ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Date Fields - Side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-primary-foreground/60 mb-1 block">Check-in</label>
          <button
            onClick={() => setCheckInDateOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-3.5 bg-primary-foreground/95 rounded-xl text-left native-press min-h-[52px]"
          >
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span className={cn(
              "text-sm font-medium",
              checkIn ? "text-foreground" : "text-muted-foreground"
            )}>
              {checkIn ? format(checkIn, "d MMMM") : "Select"}
            </span>
          </button>
        </div>

        <div>
          <label className="text-xs font-medium text-primary-foreground/60 mb-1 block">Check-out</label>
          <button
            onClick={() => setCheckOutDateOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-3.5 bg-primary-foreground/95 rounded-xl text-left native-press min-h-[52px]"
          >
            <Calendar className="h-4 w-4 text-primary shrink-0" />
            <span className={cn(
              "text-sm font-medium",
              checkOut ? "text-foreground" : "text-muted-foreground"
            )}>
              {checkOut ? format(checkOut, "d MMMM") : "Select"}
            </span>
          </button>
        </div>
      </div>

      <NativeDatePicker
        isOpen={checkInDateOpen}
        onClose={() => setCheckInDateOpen(false)}
        onSelect={handleCheckInSelect}
        selected={checkIn}
        title="Select Check-in Date"
      />

      <NativeDatePicker
        isOpen={checkOutDateOpen}
        onClose={() => setCheckOutDateOpen(false)}
        onSelect={handleCheckOutSelect}
        selected={checkOut}
        minDate={checkIn}
        title="Select Check-out Date"
      />

      {/* Guests & Rooms - Side by side */}
      <div className="grid grid-cols-2 gap-3">
        <Drawer open={guestsDrawerOpen} onOpenChange={setGuestsDrawerOpen}>
          <DrawerTrigger asChild>
            <div>
              <label className="text-xs font-medium text-primary-foreground/60 mb-1 block">Guests</label>
              <button className="w-full flex items-center gap-2 px-4 py-3.5 bg-primary-foreground/95 rounded-xl text-left native-press min-h-[52px]">
                <Users className="h-4 w-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground">{guests}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
              </button>
            </div>
          </DrawerTrigger>
          <DrawerContent>
            <DrawerHeader>
              <DrawerTitle>Guests & Rooms</DrawerTitle>
            </DrawerHeader>
            <div className="px-4 pb-6 space-y-6">
              <div className="flex items-center justify-between min-h-[56px]">
                <div>
                  <div className="font-medium">Guests</div>
                  <div className="text-sm text-muted-foreground">Total travelers</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    disabled={guests <= 1}
                    className="w-12 h-12 rounded-full border border-border flex items-center justify-center disabled:opacity-30 native-press"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">{guests}</span>
                  <button
                    onClick={() => setGuests(Math.min(10, guests + 1))}
                    disabled={guests >= 10}
                    className="w-12 h-12 rounded-full border border-border flex items-center justify-center disabled:opacity-30 native-press"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between min-h-[56px]">
                <div>
                  <div className="font-medium">Rooms</div>
                  <div className="text-sm text-muted-foreground">Number of rooms</div>
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => setRooms(Math.max(1, rooms - 1))}
                    disabled={rooms <= 1}
                    className="w-12 h-12 rounded-full border border-border flex items-center justify-center disabled:opacity-30 native-press"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="w-6 text-center font-semibold">{rooms}</span>
                  <button
                    onClick={() => setRooms(Math.min(5, rooms + 1))}
                    disabled={rooms >= 5}
                    className="w-12 h-12 rounded-full border border-border flex items-center justify-center disabled:opacity-30 native-press"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
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

        {/* Rooms display */}
        <div>
          <label className="text-xs font-medium text-primary-foreground/60 mb-1 block">Rooms</label>
          <button
            onClick={() => setGuestsDrawerOpen(true)}
            className="w-full flex items-center gap-2 px-4 py-3.5 bg-primary-foreground/95 rounded-xl text-left native-press min-h-[52px]"
          >
            <span className="text-sm font-medium text-foreground">{rooms} room{rooms > 1 ? 's' : ''}</span>
            <ChevronDown className="h-3.5 w-3.5 text-muted-foreground ml-auto shrink-0" />
          </button>
        </div>
      </div>

      {/* Search Button */}
      <Button
        onClick={handleSearch}
        className="w-full h-14 text-base font-semibold rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground native-button"
        size="lg"
      >
        <Search className="h-5 w-5 mr-2" />
        Search Hotels
      </Button>
    </div>
  );
};

export default MobileHotelSearch;
