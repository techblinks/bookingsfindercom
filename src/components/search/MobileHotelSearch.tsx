import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapPin, Calendar, Users, ChevronRight, ChevronDown, Search, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";

const MobileHotelSearch = () => {
  const navigate = useNavigate();
  
  // Form state
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  
  // Sheet/modal states
  const [destinationSheetOpen, setDestinationSheetOpen] = useState(false);
  const [dateDrawerOpen, setDateDrawerOpen] = useState(false);
  const [guestsDrawerOpen, setGuestsDrawerOpen] = useState(false);
  const [selectingCheckout, setSelectingCheckout] = useState(false);

  const handleDateSelect = (date: Date | undefined) => {
    if (selectingCheckout) {
      setCheckOut(date);
      setDateDrawerOpen(false);
    } else {
      setCheckIn(date);
      setSelectingCheckout(true);
    }
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
    <div className="w-full space-y-3">
      {/* Destination Field */}
      <Sheet open={destinationSheetOpen} onOpenChange={setDestinationSheetOpen}>
        <SheetTrigger asChild>
          <button className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left active:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-muted-foreground">Destination</div>
              <div className={cn(
                "text-base font-medium truncate",
                !destination && "text-muted-foreground"
              )}>
                {destination || "Where are you going?"}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <SheetTitle>Where are you staying?</SheetTitle>
          </SheetHeader>
          <div className="px-1">
            <Input
              placeholder="Search city, hotel, or landmark..."
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              autoFocus
              className="h-12"
            />
            {/* Popular destinations */}
            <div className="mt-6">
              <div className="text-sm font-medium text-muted-foreground mb-3">Popular destinations</div>
              <div className="grid grid-cols-2 gap-2">
                {["New York", "Paris", "London", "Tokyo", "Dubai", "Barcelona"].map((city) => (
                  <button
                    key={city}
                    onClick={() => {
                      setDestination(city);
                      setDestinationSheetOpen(false);
                    }}
                    className="p-3 text-left rounded-xl bg-secondary hover:bg-muted transition-colors"
                  >
                    <div className="font-medium">{city}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Dates Field */}
      <Drawer open={dateDrawerOpen} onOpenChange={(open) => {
        setDateDrawerOpen(open);
        if (!open) setSelectingCheckout(false);
      }}>
        <DrawerTrigger asChild>
          <button 
            className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left active:bg-muted transition-colors"
            onClick={() => setSelectingCheckout(false)}
          >
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Check-in – Check-out</div>
              <div className={cn(
                "text-base font-medium",
                !checkIn && "text-muted-foreground"
              )}>
                {checkIn ? (
                  checkOut 
                    ? `${format(checkIn, "MMM d")} – ${format(checkOut, "MMM d")}`
                    : `${format(checkIn, "MMM d")} – Select check-out`
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
              {selectingCheckout ? "Select check-out date" : "Select check-in date"}
            </DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-auto">
            {/* Quick date chips */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
              {[
                { label: "Tonight", date: new Date() },
                { label: "Tomorrow", date: addDays(new Date(), 1) },
                { label: "This weekend", date: addDays(new Date(), 5) },
                { label: "Next week", date: addDays(new Date(), 7) },
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
              selected={selectingCheckout ? checkOut : checkIn}
              onSelect={handleDateSelect}
              disabled={(date) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                if (selectingCheckout && checkIn) {
                  return date <= checkIn;
                }
                return date < today;
              }}
              className="pointer-events-auto mx-auto"
              numberOfMonths={1}
            />
            {checkIn && !selectingCheckout && (
              <p className="text-center text-sm text-muted-foreground mt-3">
                Select check-in, then check-out date
              </p>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Guests & Rooms */}
      <Drawer open={guestsDrawerOpen} onOpenChange={setGuestsDrawerOpen}>
        <DrawerTrigger asChild>
          <button className="w-full flex items-center gap-3 p-4 bg-card border border-border rounded-xl text-left active:bg-muted transition-colors">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-xs text-muted-foreground">Guests & Rooms</div>
              <div className="text-base font-medium">
                {guests} guest{guests > 1 ? 's' : ''}, {rooms} room{rooms > 1 ? 's' : ''}
              </div>
            </div>
            <ChevronDown className="h-5 w-5 text-muted-foreground shrink-0" />
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Guests & Rooms</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 space-y-6">
            {/* Guests */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Guests</div>
                <div className="text-sm text-muted-foreground">Total travelers</div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setGuests(Math.max(1, guests - 1))}
                  disabled={guests <= 1}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 active:bg-muted transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-semibold">{guests}</span>
                <button
                  onClick={() => setGuests(Math.min(10, guests + 1))}
                  disabled={guests >= 10}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 active:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Rooms */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium">Rooms</div>
                <div className="text-sm text-muted-foreground">Number of rooms</div>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setRooms(Math.max(1, rooms - 1))}
                  disabled={rooms <= 1}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 active:bg-muted transition-colors"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center font-semibold">{rooms}</span>
                <button
                  onClick={() => setRooms(Math.min(5, rooms + 1))}
                  disabled={rooms >= 5}
                  className="w-10 h-10 rounded-full border border-border flex items-center justify-center disabled:opacity-30 active:bg-muted transition-colors"
                >
                  <Plus className="h-4 w-4" />
                </button>
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

      {/* Search Button */}
      <Button 
        onClick={handleSearch}
        className="w-full h-14 text-base font-semibold rounded-xl mt-4"
        size="lg"
      >
        <Search className="h-5 w-5 mr-2" />
        Search hotels
      </Button>
    </div>
  );
};

export default MobileHotelSearch;
