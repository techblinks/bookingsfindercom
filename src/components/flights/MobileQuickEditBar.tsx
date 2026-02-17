import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plane, Search, X, ArrowRightLeft, Calendar, Users, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import NativeDatePicker from "@/components/search/NativeDatePicker";
import NativeLocationPicker from "@/components/search/NativeLocationPicker";

interface MobileQuickEditBarProps {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate: string;
  passengers: number;
  cabinClass: string;
  cheapestPrice?: number;
  currencySymbol: string;
  isLoading: boolean;
  formatDate: (dateStr: string) => string;
}

interface Airport {
  code: string;
  city: string;
  country: string;
  name: string;
}

const MobileQuickEditBar = ({
  origin,
  destination,
  departureDate,
  returnDate,
  passengers,
  cabinClass,
  cheapestPrice,
  currencySymbol,
  isLoading,
  formatDate,
}: MobileQuickEditBarProps) => {
  const navigate = useNavigate();
  const [isExpanded, setIsExpanded] = useState(false);

  // Editable state, initialized from props
  const [editOrigin, setEditOrigin] = useState(origin);
  const [editOriginDisplay, setEditOriginDisplay] = useState(origin);
  const [editDestination, setEditDestination] = useState(destination);
  const [editDestDisplay, setEditDestDisplay] = useState(destination);
  const [editDepartDate, setEditDepartDate] = useState<Date | undefined>(
    departureDate ? new Date(departureDate + "T00:00:00") : undefined
  );
  const [editReturnDate, setEditReturnDate] = useState<Date | undefined>(
    returnDate ? new Date(returnDate + "T00:00:00") : undefined
  );
  const [editPassengers, setEditPassengers] = useState(passengers);

  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [toPickerOpen, setToPickerOpen] = useState(false);
  const [departPickerOpen, setDepartPickerOpen] = useState(false);
  const [returnPickerOpen, setReturnPickerOpen] = useState(false);

  const handleExpand = () => {
    // Reset editable state from current search params
    setEditOrigin(origin);
    setEditOriginDisplay(origin);
    setEditDestination(destination);
    setEditDestDisplay(destination);
    setEditDepartDate(departureDate ? new Date(departureDate + "T00:00:00") : undefined);
    setEditReturnDate(returnDate ? new Date(returnDate + "T00:00:00") : undefined);
    setEditPassengers(passengers);
    setIsExpanded(true);
  };

  const handleSearch = () => {
    if (!editOrigin || !editDestination || !editDepartDate) return;

    const params = new URLSearchParams({
      origin: editOrigin.toUpperCase(),
      destination: editDestination.toUpperCase(),
      departureDate: format(editDepartDate, "yyyy-MM-dd"),
      passengers: String(editPassengers),
      adults: String(editPassengers),
      children: "0",
      infants: "0",
      cabinClass,
    });
    if (editReturnDate) {
      params.append("returnDate", format(editReturnDate, "yyyy-MM-dd"));
    }
    setIsExpanded(false);
    navigate(`/flights?${params.toString()}`);
  };

  const swapLocations = () => {
    const tmpCode = editOrigin;
    const tmpDisplay = editOriginDisplay;
    setEditOrigin(editDestination);
    setEditOriginDisplay(editDestDisplay);
    setEditDestination(tmpCode);
    setEditDestDisplay(tmpDisplay);
  };

  return (
    <>
      {/* Collapsed bar */}
      <div
        className="bg-card border border-border shadow-lg rounded-2xl px-4 py-2.5 flex items-center gap-3 native-touch cursor-pointer"
        onClick={handleExpand}
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Search className="h-4 w-4 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-foreground flex items-center gap-1.5">
            <span className="truncate">{origin}</span>
            <Plane className="h-3 w-3 text-muted-foreground shrink-0 rotate-90" />
            <span className="truncate">{destination}</span>
          </div>
          <p className="text-[11px] text-muted-foreground truncate">
            {formatDate(departureDate)}
            {returnDate && ` – ${formatDate(returnDate)}`}
            {" · "}{passengers} pax
          </p>
        </div>
        {!isLoading && cheapestPrice && cheapestPrice > 0 && (
          <div className="shrink-0 bg-primary/10 rounded-full px-2.5 py-1">
            <span className="text-xs font-bold text-primary">{currencySymbol}{cheapestPrice}</span>
          </div>
        )}
      </div>

      {/* Expanded quick-edit overlay */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50"
          >
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50 backdrop-blur-sm"
              onClick={() => setIsExpanded(false)}
            />

            {/* Edit panel */}
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="absolute top-0 left-0 right-0 bg-card rounded-b-3xl shadow-2xl p-4 pt-[env(safe-area-inset-top,0px)] space-y-3"
            >
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-base font-semibold text-foreground">Edit Search</h3>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center native-touch"
                >
                  <X className="h-4 w-4 text-foreground" />
                </button>
              </div>

              {/* Origin & Destination */}
              <div className="relative space-y-2">
                <button
                  onClick={() => setFromPickerOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl text-left native-press min-h-[48px]"
                >
                  <Plane className="h-4 w-4 text-primary -rotate-45 shrink-0" />
                  <span className={cn(
                    "text-sm font-medium truncate",
                    editOriginDisplay ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {editOriginDisplay || "From"}
                  </span>
                </button>

                {/* Swap button */}
                <button
                  onClick={swapLocations}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-primary rounded-full flex items-center justify-center shadow-md native-touch"
                >
                  <ArrowRightLeft className="h-3 w-3 text-primary-foreground rotate-90" />
                </button>

                <button
                  onClick={() => setToPickerOpen(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-secondary rounded-xl text-left native-press min-h-[48px]"
                >
                  <Plane className="h-4 w-4 text-primary rotate-45 shrink-0" />
                  <span className={cn(
                    "text-sm font-medium truncate",
                    editDestDisplay ? "text-foreground" : "text-muted-foreground"
                  )}>
                    {editDestDisplay || "To"}
                  </span>
                </button>
              </div>

              {/* Dates & Passengers row */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setDepartPickerOpen(true)}
                  className="flex flex-col items-start px-3 py-2.5 bg-secondary rounded-xl native-press min-h-[48px]"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">Depart</span>
                  <span className="text-xs font-semibold text-foreground">
                    {editDepartDate ? format(editDepartDate, "d MMM") : "Select"}
                  </span>
                </button>

                <button
                  onClick={() => setReturnPickerOpen(true)}
                  className="flex flex-col items-start px-3 py-2.5 bg-secondary rounded-xl native-press min-h-[48px]"
                >
                  <span className="text-[10px] font-medium text-muted-foreground">Return</span>
                  <span className="text-xs font-semibold text-foreground">
                    {editReturnDate ? format(editReturnDate, "d MMM") : "—"}
                  </span>
                </button>

                <div className="flex flex-col px-3 py-2.5 bg-secondary rounded-xl min-h-[48px]">
                  <span className="text-[10px] font-medium text-muted-foreground">Travelers</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      onClick={() => setEditPassengers(Math.max(1, editPassengers - 1))}
                      disabled={editPassengers <= 1}
                      className="w-6 h-6 rounded-full border border-border flex items-center justify-center disabled:opacity-30 native-touch"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="text-xs font-semibold text-foreground w-4 text-center">{editPassengers}</span>
                    <button
                      onClick={() => setEditPassengers(Math.min(9, editPassengers + 1))}
                      disabled={editPassengers >= 9}
                      className="w-6 h-6 rounded-full border border-border flex items-center justify-center disabled:opacity-30 native-touch"
                    >
                      <span className="text-xs font-semibold">+</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Search button */}
              <Button
                onClick={handleSearch}
                className="w-full h-12 text-sm font-semibold rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground native-button"
              >
                <Search className="h-4 w-4 mr-2" />
                Update Search
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Location Pickers */}
      <NativeLocationPicker
        isOpen={fromPickerOpen}
        onClose={() => setFromPickerOpen(false)}
        onSelect={(code: string, airport: Airport) => {
          setEditOrigin(code);
          setEditOriginDisplay(airport.city);
        }}
        title="Where from?"
        placeholder="Search airports or cities..."
      />

      <NativeLocationPicker
        isOpen={toPickerOpen}
        onClose={() => setToPickerOpen(false)}
        onSelect={(code: string, airport: Airport) => {
          setEditDestination(code);
          setEditDestDisplay(airport.city);
        }}
        title="Where to?"
        placeholder="Search airports or cities..."
      />

      {/* Date Pickers */}
      <NativeDatePicker
        isOpen={departPickerOpen}
        onClose={() => setDepartPickerOpen(false)}
        onSelect={(date: Date) => {
          setEditDepartDate(date);
          if (editReturnDate && date > editReturnDate) {
            setEditReturnDate(undefined);
          }
        }}
        selected={editDepartDate}
        title="Select Departure Date"
      />

      <NativeDatePicker
        isOpen={returnPickerOpen}
        onClose={() => setReturnPickerOpen(false)}
        onSelect={(date: Date) => setEditReturnDate(date)}
        selected={editReturnDate}
        minDate={editDepartDate}
        title="Select Return Date"
      />
    </>
  );
};

export default MobileQuickEditBar;
