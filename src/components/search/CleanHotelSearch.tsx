import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, addDays } from "date-fns";
import { 
  MapPin, 
  Calendar, 
  Users, 
  Search,
  ChevronDown
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
import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";

const CleanHotelSearch = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  
  // Core search state
  const [destination, setDestination] = useState("");
  const [checkIn, setCheckIn] = useState<Date>();
  const [checkOut, setCheckOut] = useState<Date>();
  const [guests, setGuests] = useState(2);
  const [rooms, setRooms] = useState(1);
  
  // UI state
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [guestsOpen, setGuestsOpen] = useState(false);

  const handleSearch = () => {
    if (!destination) {
      toast.error("Please enter a destination");
      return;
    }
    if (!checkIn || !checkOut) {
      toast.error("Please select check-in and check-out dates");
      return;
    }

    const params = new URLSearchParams({
      destination,
      checkIn: format(checkIn, "yyyy-MM-dd"),
      checkOut: format(checkOut, "yyyy-MM-dd"),
      guests: guests.toString(),
      rooms: rooms.toString(),
    });

    navigate(`/hotels?${params.toString()}`);
  };

  const handleDateSelect = (range: { from?: Date; to?: Date } | undefined) => {
    setCheckIn(range?.from);
    setCheckOut(range?.to);
    if (range?.from && range?.to) {
      setDateOpen(false);
    }
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

  // Counter component
  const Counter = ({ 
    label, 
    sublabel, 
    value, 
    onIncrease, 
    onDecrease,
    minValue = 1
  }: {
    label: string;
    sublabel?: string;
    value: number;
    onIncrease: () => void;
    onDecrease: () => void;
    minValue?: number;
  }) => (
    <div className="flex items-center justify-between py-4 border-b border-border last:border-b-0">
      <div>
        <div className="font-medium text-foreground">{label}</div>
        {sublabel && <div className="text-sm text-muted-foreground">{sublabel}</div>}
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
          className="h-9 w-9 rounded-full border border-border flex items-center justify-center text-lg hover:bg-muted transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );

  // Mobile Layout
  if (isMobile) {
    return (
      <div>
        {/* Destination Field */}
        <MobileField
          label="Destination"
          value={destination}
          icon={MapPin}
          onClick={() => setDestinationOpen(true)}
          placeholder="Where are you going?"
        />

        {/* Dates Field */}
        <MobileField
          label="Dates"
          value={checkIn && checkOut ? `${format(checkIn, "MMM d")} - ${format(checkOut, "MMM d")}` : undefined}
          icon={Calendar}
          onClick={() => setDateOpen(true)}
          placeholder="Check-in — Check-out"
        />

        {/* Guests Field */}
        <MobileField
          label="Guests & Rooms"
          value={`${guests} ${guests === 1 ? 'Guest' : 'Guests'}, ${rooms} ${rooms === 1 ? 'Room' : 'Rooms'}`}
          icon={Users}
          onClick={() => setGuestsOpen(true)}
          placeholder="Add guests"
        />

        {/* Search Button */}
        <div className="p-4">
          <Button 
            onClick={handleSearch}
            className="w-full h-12 text-base font-semibold gap-2"
            size="lg"
          >
            <Search className="h-5 w-5" />
            Search Hotels
          </Button>
        </div>

        {/* Destination Sheet */}
        <Sheet open={destinationOpen} onOpenChange={setDestinationOpen}>
          <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle>Destination</SheetTitle>
            </SheetHeader>
            <div className="p-4">
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="City, hotel name, or landmark"
                className="h-12"
                autoFocus
              />
              <div className="mt-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Popular Destinations</p>
                <div className="space-y-1">
                  {["Paris, France", "London, UK", "New York, USA", "Tokyo, Japan", "Dubai, UAE"].map((city) => (
                    <button
                      key={city}
                      type="button"
                      onClick={() => {
                        setDestination(city);
                        setDestinationOpen(false);
                      }}
                      className="flex items-center gap-3 w-full p-3 rounded-lg hover:bg-muted transition-colors text-left"
                    >
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">{city}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        {/* Date Drawer */}
        <Drawer open={dateOpen} onOpenChange={setDateOpen}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="border-b border-border">
              <DrawerTitle>Select Dates</DrawerTitle>
            </DrawerHeader>
            <div className="p-4 flex justify-center overflow-y-auto">
              <CalendarComponent
                mode="range"
                selected={{ from: checkIn, to: checkOut }}
                onSelect={handleDateSelect as any}
                disabled={(date) => date < new Date()}
                numberOfMonths={1}
                className="pointer-events-auto"
              />
            </div>
          </DrawerContent>
        </Drawer>

        {/* Guests Drawer */}
        <Drawer open={guestsOpen} onOpenChange={setGuestsOpen}>
          <DrawerContent>
            <DrawerHeader className="border-b border-border">
              <DrawerTitle>Guests & Rooms</DrawerTitle>
            </DrawerHeader>
            <div className="p-4">
              <Counter
                label="Guests"
                value={guests}
                onIncrease={() => setGuests(prev => Math.min(prev + 1, 10))}
                onDecrease={() => setGuests(prev => Math.max(prev - 1, 1))}
              />
              <Counter
                label="Rooms"
                value={rooms}
                onIncrease={() => setRooms(prev => Math.min(prev + 1, 5))}
                onDecrease={() => setRooms(prev => Math.max(prev - 1, 1))}
              />
              <Button 
                onClick={() => setGuestsOpen(false)}
                className="w-full mt-4"
              >
                Done
              </Button>
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
        {/* Destination */}
        <div className="flex-1 min-w-[220px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Destination</label>
          <div className="relative border border-border rounded-lg hover:border-primary/50 transition-colors bg-muted/30">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              placeholder="City, hotel, or landmark"
              className="h-12 pl-10 border-0 bg-transparent focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Check-in */}
        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Check-in</label>
          <Popover open={dateOpen} onOpenChange={setDateOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex items-center gap-2 h-12 px-4 w-full border border-border rounded-lg hover:border-primary/50 transition-colors text-left bg-muted/30",
                  !checkIn && "text-muted-foreground"
                )}
              >
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm truncate">
                  {checkIn ? format(checkIn, "MMM d, yyyy") : "Add date"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <CalendarComponent
                mode="range"
                selected={{ from: checkIn, to: checkOut }}
                onSelect={handleDateSelect as any}
                disabled={(date) => date < new Date()}
                numberOfMonths={2}
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Check-out */}
        <div className="min-w-[140px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Check-out</label>
          <button
            type="button"
            onClick={() => setDateOpen(true)}
            className={cn(
              "flex items-center gap-2 h-12 px-4 w-full border border-border rounded-lg hover:border-primary/50 transition-colors text-left bg-muted/30",
              !checkOut && "text-muted-foreground"
            )}
          >
            <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
            <span className="text-sm truncate">
              {checkOut ? format(checkOut, "MMM d, yyyy") : "Add date"}
            </span>
          </button>
        </div>

        {/* Guests & Rooms */}
        <div className="min-w-[160px]">
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Guests & Rooms</label>
          <Popover open={guestsOpen} onOpenChange={setGuestsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 h-12 px-4 w-full border border-border rounded-lg hover:border-primary/50 transition-colors text-left bg-muted/30"
              >
                <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                <span className="text-sm">{guests} Guests, {rooms} Room</span>
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64" align="start">
              <div className="space-y-1">
                <Counter
                  label="Guests"
                  value={guests}
                  onIncrease={() => setGuests(prev => Math.min(prev + 1, 10))}
                  onDecrease={() => setGuests(prev => Math.max(prev - 1, 1))}
                />
                <Counter
                  label="Rooms"
                  value={rooms}
                  onIncrease={() => setRooms(prev => Math.min(prev + 1, 5))}
                  onDecrease={() => setRooms(prev => Math.max(prev - 1, 1))}
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
          Search Hotels
        </Button>
      </div>
    </div>
  );
};

export default CleanHotelSearch;
