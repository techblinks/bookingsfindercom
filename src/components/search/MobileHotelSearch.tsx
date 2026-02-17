import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, ChevronDown, Search, Minus, Plus, Building, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format, addDays, startOfWeek, nextFriday, nextSunday } from "date-fns";
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
  { name: "New York", country: "USA", flag: "🇺🇸" },
  { name: "Paris", country: "France", flag: "🇫🇷" },
  { name: "London", country: "UK", flag: "🇬🇧" },
  { name: "Tokyo", country: "Japan", flag: "🇯🇵" },
  { name: "Dubai", country: "UAE", flag: "🇦🇪" },
  { name: "Barcelona", country: "Spain", flag: "🇪🇸" },
  { name: "Rome", country: "Italy", flag: "🇮🇹" },
  { name: "Bangkok", country: "Thailand", flag: "🇹🇭" },
  { name: "Amsterdam", country: "Netherlands", flag: "🇳🇱" },
  { name: "Istanbul", country: "Turkey", flag: "🇹🇷" },
];

interface RecentHotelSearch {
  destination: string;
  timestamp: number;
}

const RECENT_HOTELS_KEY = "bf_recent_hotel_searches";
const MAX_RECENT = 3;

const getRecentSearches = (): RecentHotelSearch[] => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_HOTELS_KEY) || "[]");
  } catch { return []; }
};

const saveRecentSearch = (search: RecentHotelSearch) => {
  const recent = getRecentSearches().filter(s => s.destination !== search.destination);
  recent.unshift(search);
  localStorage.setItem(RECENT_HOTELS_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const guestPresets = [
  { label: "Solo", guests: 1, rooms: 1 },
  { label: "Couple", guests: 2, rooms: 1 },
  { label: "Family", guests: 4, rooms: 2 },
];

const MobileHotelSearch = () => {
  const navigate = useNavigate();

  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  const [recentSearches, setRecentSearches] = useState<RecentHotelSearch[]>([]);

  const [destinationSheetOpen, setDestinationSheetOpen] = useState(false);
  const [checkInDateOpen, setCheckInDateOpen] = useState(false);
  const [checkOutDateOpen, setCheckOutDateOpen] = useState(false);
  const [guestsDrawerOpen, setGuestsDrawerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setRecentSearches(getRecentSearches());
  }, []);

  const handleCheckInSelect = (date: Date) => {
    setCheckIn(date);
    if (checkOut && date >= checkOut) {
      setCheckOut(undefined);
    }
  };

  const handleCheckOutSelect = (date: Date) => {
    setCheckOut(date);
  };

  const applyQuickDate = (type: "tonight" | "weekend" | "nextweek") => {
    const today = new Date();
    if (type === "tonight") {
      setCheckIn(today);
      setCheckOut(addDays(today, 1));
    } else if (type === "weekend") {
      const fri = nextFriday(today);
      setCheckIn(fri);
      setCheckOut(nextSunday(fri));
    } else {
      const nextMon = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });
      setCheckIn(nextMon);
      setCheckOut(addDays(nextMon, 4));
    }
  };

  const applyGuestPreset = (preset: typeof guestPresets[0]) => {
    setGuests(preset.guests);
    setRooms(preset.rooms);
  };

  const handleSearch = () => {
    if (!destination || !checkIn || !checkOut) {
      toast.error("Please fill in all fields");
      return;
    }

    saveRecentSearch({ destination, timestamp: Date.now() });

    const params = new URLSearchParams({
      destination,
      checkIn: format(checkIn, "yyyy-MM-dd"),
      checkOut: format(checkOut, "yyyy-MM-dd"),
      guests: String(guests),
      rooms: String(rooms),
    });

    navigate(`/hotels?${params.toString()}`);
  };

  const activeGuestPreset = guestPresets.find(p => p.guests === guests && p.rooms === rooms);

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
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-lg">
                          {dest.flag}
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

      {/* Quick Date Presets */}
      <div className="flex gap-2">
        {[
          { id: "tonight" as const, label: "Tonight" },
          { id: "weekend" as const, label: "This Weekend" },
          { id: "nextweek" as const, label: "Next Week" },
        ].map((preset) => (
          <button
            key={preset.id}
            onClick={() => applyQuickDate(preset.id)}
            className="flex-1 px-3 py-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-full text-xs font-semibold text-primary-foreground/80 transition-colors native-touch text-center"
          >
            {preset.label}
          </button>
        ))}
      </div>

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

      {/* Guest Presets */}
      <div className="flex gap-2">
        {guestPresets.map((preset) => (
          <button
            key={preset.label}
            onClick={() => applyGuestPreset(preset)}
            className={cn(
              "flex-1 px-3 py-2 rounded-full text-xs font-semibold transition-colors native-touch text-center",
              activeGuestPreset?.label === preset.label
                ? "bg-accent/20 text-accent-foreground border border-accent"
                : "bg-primary-foreground/10 text-primary-foreground/80 hover:bg-primary-foreground/20 border border-transparent"
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>

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

      {/* Recent Searches */}
      {recentSearches.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium text-primary-foreground/50 flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Recent searches
          </p>
          <div className="flex flex-wrap gap-2">
            {recentSearches.map((s, i) => (
              <button
                key={i}
                onClick={() => setDestination(s.destination)}
                className="flex items-center gap-1.5 px-3 py-2 bg-primary-foreground/10 hover:bg-primary-foreground/20 rounded-full text-xs font-medium text-primary-foreground/80 transition-colors native-touch"
              >
                <Building className="h-3 w-3" />
                {s.destination}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileHotelSearch;
