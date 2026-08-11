import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpDown, Calendar, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import NativeLocationPicker from "./NativeLocationPicker";
import NativeDatePicker from "./NativeDatePicker";
import { PassengerPickerSheet } from "./PassengerPickerSheet";
import { useTrip } from "@/context/TripContext";
import { formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";
import { resolveLocationLabel } from "@/lib/locationResolution";
import type { PassengerCount } from "./PassengerPicker";

/* Flights-scoped local colour tokens */
const RAIL = { empty: "#C2CEDC", mid: "#B9C7D8", complete: null } as const;

interface Airport { code: string; city: string; country: string; name: string; }
type TripType = "roundtrip" | "oneway";
type CabinClass = "economy" | "premium" | "business" | "first";

const CABIN_LABELS: Record<CabinClass, string> = {
  economy: "Economy", premium: "Premium Economy", business: "Business", first: "First",
};

/* City name typography ladder */
function cityTextClass(name: string): string {
  const len = name.length;
  if (len <= 14) return "text-[21px] font-semibold leading-tight";
  if (len <= 18) return "text-[20px] font-semibold leading-tight";
  if (len <= 24) return "text-[18px] font-semibold leading-tight line-clamp-2";
  return "text-[18px] font-semibold leading-tight line-clamp-2";
}

interface PrefillState { fromTrip: boolean; userEdited: boolean; }

const IATA_RE = /^[A-Z]{3}$/;

/** Accept only well-formed IATA/city codes; everything else stays null. */
function parseIata(value: string | null): string | null {
  if (!value) return null;
  const v = value.trim().toUpperCase();
  return IATA_RE.test(v) ? v : null;
}

export default function MobileFlightSearch() {
  const navigate = useNavigate();

  /*
   * URL prefill wins over TripContext:
   *   explicit URL origin/destination -> TripContext -> geo/default fallback.
   * An Explore-route URL such as /flights?origin=SYD&destination=MOW must
   * override stale trip values; when the URL carries nothing, TripContext
   * behaves exactly as before.
   */
  const [searchParams] = useSearchParams();
  const urlOrigin = parseIata(searchParams.get("origin"));
  const urlDestination = parseIata(searchParams.get("destination"));
  const { trip, hasTrip } = useTrip();

  const tripOrigin = hasTrip ? trip.origin : null;
  const tripDestination = hasTrip ? trip.destination : null;
  const tripDepDate = hasTrip ? trip.dates?.departureDate : undefined;
  const tripRetDate = hasTrip ? trip.dates?.returnDate : undefined;
  const tripAdults = hasTrip ? trip.travellers?.adults : undefined;
  const tripChildren = hasTrip ? trip.travellers?.children : undefined;
  const tripInfants = hasTrip ? trip.travellers?.infants : undefined;

  /* Default: Round trip on fresh load, one-way only if explicitly from context */
  const [tripType, setTripType] = useState<TripType>(
    tripDepDate && !tripRetDate ? "oneway" : "roundtrip"
  );
  const [flightFrom, setFlightFrom] = useState(urlOrigin ?? tripOrigin?.airportCode ?? "");
  const [flightFromDisplay, setFlightFromDisplay] = useState(urlOrigin ? (resolveLocationLabel(urlOrigin) ?? urlOrigin) : (tripOrigin?.name ?? ""));
  const [flightTo, setFlightTo] = useState(urlDestination ?? tripDestination?.airportCode ?? "");
  const [flightToDisplay, setFlightToDisplay] = useState(urlDestination ? (resolveLocationLabel(urlDestination) ?? urlDestination) : (tripDestination?.name ?? ""));

  const initialDepDate = useMemo(() => {
    if (tripDepDate) { const d = new Date(tripDepDate + "T00:00:00"); return isNaN(d.getTime()) ? undefined : d; }
    return undefined;
  }, [tripDepDate]);
  const initialRetDate = useMemo(() => {
    if (tripRetDate) { const d = new Date(tripRetDate + "T00:00:00"); return isNaN(d.getTime()) ? undefined : d; }
    return undefined;
  }, [tripRetDate]);

  const [departureDate, setDepartureDate] = useState<Date | undefined>(initialDepDate);
  const [returnDate, setReturnDate] = useState<Date | undefined>(initialRetDate);
  const [passengers, setPassengers] = useState<PassengerCount>({ adults: tripAdults ?? 1, children: tripChildren ?? 0, infants: tripInfants ?? 0 });
  const [cabinClass, setCabinClass] = useState<CabinClass>("economy");

  const [fromPrefill, setFromPrefill] = useState<PrefillState>({ fromTrip: !urlOrigin && !!tripOrigin, userEdited: false });
  const [toPrefill, setToPrefill] = useState<PrefillState>({ fromTrip: !urlDestination && !!tripDestination, userEdited: false });
  const [departurePrefill, setDeparturePrefill] = useState<PrefillState>({ fromTrip: !!tripDepDate, userEdited: false });
  const [returnPrefill, setReturnPrefill] = useState<PrefillState>({ fromTrip: !!tripRetDate, userEdited: false });
  const [travellersPrefill, setTravellersPrefill] = useState<PrefillState>({ fromTrip: !!(tripAdults || tripChildren || tripInfants), userEdited: false });

  /*
   * Same-page URL hydration: when the query string changes while this form is
   * mounted, re-apply explicit URL origin/destination. TripContext is used only
   * when the URL carries no valid code. Dates/travellers/cabin are untouched.
   */
  useEffect(() => {
    if (urlOrigin) {
      setFlightFrom(urlOrigin);
      setFlightFromDisplay(resolveLocationLabel(urlOrigin) ?? urlOrigin);
      setFromPrefill({ fromTrip: false, userEdited: false });
    } else if (tripOrigin) {
      // airportCode is OPTIONAL on TripDestination — a trip set from Stays or
      // the planner can carry a city name with no code. The state initialiser
      // has always coalesced to ""; without it `flightFrom` becomes undefined
      // and the code badge below crashes on .toUpperCase().
      setFlightFrom(tripOrigin.airportCode ?? "");
      setFlightFromDisplay(tripOrigin.name ?? "");
      setFromPrefill({ fromTrip: true, userEdited: false });
    } else {
      setFlightFrom("");
      setFlightFromDisplay("");
      setFromPrefill({ fromTrip: false, userEdited: false });
    }
  }, [urlOrigin, tripOrigin]);

  useEffect(() => {
    if (urlDestination) {
      setFlightTo(urlDestination);
      setFlightToDisplay(resolveLocationLabel(urlDestination) ?? urlDestination);
      setToPrefill({ fromTrip: false, userEdited: false });
    } else if (tripDestination) {
      // Same optional-airportCode guard as the origin effect above.
      setFlightTo(tripDestination.airportCode ?? "");
      setFlightToDisplay(tripDestination.name ?? "");
      setToPrefill({ fromTrip: true, userEdited: false });
    } else {
      setFlightTo("");
      setFlightToDisplay("");
      setToPrefill({ fromTrip: false, userEdited: false });
    }
  }, [urlDestination, tripDestination]);

  const [fromSheetOpen, setFromSheetOpen] = useState(false);
  const [toSheetOpen, setToSheetOpen] = useState(false);
  const [dateSheetOpen, setDateSheetOpen] = useState(false);
  const [travellersSheetOpen, setTravellersSheetOpen] = useState(false);
  const [swapping, setSwapping] = useState(false);

  /* Track whether user has explicitly attempted submission (for validation display) */
  const [hasAttempted, setHasAttempted] = useState(false);

  const swapLocations = useCallback(() => {
    setSwapping(true);
    setFlightFrom(flightTo); setFlightFromDisplay(flightToDisplay);
    setFlightTo(flightFrom); setFlightToDisplay(flightFromDisplay);
    setFromPrefill(toPrefill); setToPrefill(fromPrefill);
    setTimeout(() => setSwapping(false), 300);
  }, [flightFrom, flightTo, flightFromDisplay, flightToDisplay, fromPrefill, toPrefill]);

  const startFresh = useCallback(() => {
    setFlightFrom(""); setFlightFromDisplay(""); setFlightTo(""); setFlightToDisplay("");
    setDepartureDate(undefined); setReturnDate(undefined);
    setPassengers({ adults: 1, children: 0, infants: 0 }); setCabinClass("economy");
    setFromPrefill({ fromTrip: false, userEdited: false }); setToPrefill({ fromTrip: false, userEdited: false });
    setDeparturePrefill({ fromTrip: false, userEdited: false }); setReturnPrefill({ fromTrip: false, userEdited: false });
    setTravellersPrefill({ fromTrip: false, userEdited: false });
    setHasAttempted(false);
  }, []);

  const totalPassengers = passengers.adults + passengers.children + passengers.infants;

  const handleDateSelect = useCallback((dep: Date, ret?: Date) => {
    setDepartureDate(dep); setDeparturePrefill(prev => ({ ...prev, userEdited: true }));
    if (ret) { setReturnDate(ret); setTripType("roundtrip"); setReturnPrefill(prev => ({ ...prev, userEdited: true })); }
    else if (tripType === "roundtrip") setReturnDate(undefined);
    setDateSheetOpen(false);
  }, [tripType]);

  const handleTripTypeChange = useCallback((type: TripType) => {
    setTripType(type);
    if (type === "oneway") setReturnDate(undefined);
  }, []);

  /* Validation A�?" only after explicit submit attempt */
  const errors = useMemo(() => {
    if (!hasAttempted) return [];
    const e: string[] = [];
    if (!flightFrom) e.push("origin");
    else if (!flightTo) e.push("destination");
    else if (flightFrom.toUpperCase() === flightTo.toUpperCase()) e.push("same");
    if (!departureDate) e.push("departure");
    if (tripType === "roundtrip" && !returnDate) e.push("return");
    return e;
  }, [hasAttempted, flightFrom, flightTo, departureDate, returnDate, tripType]);

  const errorMessages: Record<string, string> = {
    origin: "Choose where you're flying from.",
    destination: "Choose where you're flying to.",
    same: "Origin and destination must be different.",
    departure: "Select a departure date.",
    return: "Select a return date.",
  };

  const handleSearch = useCallback(() => {
    setHasAttempted(true);
    if (!flightFrom) { toast.error("Choose where you're flying from."); return; }
    if (!flightTo) { toast.error("Choose where you're flying to."); return; }
    if (flightFrom.toUpperCase() === flightTo.toUpperCase()) { toast.error("Origin and destination must be different."); return; }
    if (!departureDate) { toast.error("Select a departure date."); return; }
    if (tripType === "roundtrip" && !returnDate) { toast.error("Select a return date."); return; }

    const params = new URLSearchParams({
      origin: flightFrom.toUpperCase(), destination: flightTo.toUpperCase(),
      departureDate: formatLocalDate(departureDate!), passengers: String(totalPassengers),
      adults: String(passengers.adults), children: String(passengers.children), infants: String(passengers.infants),
      cabinClass,
    });
    if (returnDate && tripType === "roundtrip") params.append("returnDate", formatLocalDate(returnDate));
    navigate(`/flights?${params.toString()}`);
  }, [hasAttempted, flightFrom, flightTo, departureDate, returnDate, tripType, totalPassengers, passengers, cabinClass, navigate]);

  /* Route rail state */
  const railState: "empty" | "origin" | "complete" =
    !flightFromDisplay && !flightToDisplay ? "empty" : flightFromDisplay && !flightToDisplay ? "origin" : "complete";

  return (
    <div className="w-full space-y-4 pb-4">
      {/* Trip Type Toggle */}
      <div className="flex items-center gap-2">
        <div className="flex bg-muted rounded-full p-0.5">
          {(["roundtrip", "oneway"] as const).map((type) => (
            <button key={type} onClick={() => handleTripTypeChange(type)}
              className={cn("px-4 py-1.5 rounded-full text-xs font-semibold transition-all duration-200",
                tripType === type ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}>
              {type === "roundtrip" ? "Round trip" : "One way"}
            </button>
          ))}
        </div>
        {hasTrip && (
          <button onClick={startFresh} className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground ml-auto">
            Start fresh
          </button>
        )}
      </div>

      {/* ROUTE CARD */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        {/* From row */}
        <div className="relative flex items-stretch min-h-[56px]">
          {/* Rail column A�?" 56px */}
          <div className="w-[56px] flex-shrink-0 flex flex-col items-center pt-[22px]">
            <div className={cn("w-[10px] h-[10px] rounded-full border-2 z-10 bg-card",
              flightFromDisplay ? "border-primary" : "border-[#C2CEDC]")} />
            <div className={cn("w-[2px] flex-1 min-h-[24px]",
              railState === "complete" ? "bg-primary" : railState === "origin" ? "bg-[#B9C7D8]" : "bg-[#C2CEDC]")} />
          </div>
          {/* From content */}
          <button onClick={() => setFromSheetOpen(true)} className="flex-1 flex items-center pr-4 py-3 text-left min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">From</div>
              {flightFromDisplay ? (
                <div className="flex items-end justify-between">
                  <span className={cn("block", cityTextClass(flightFromDisplay))}>{flightFromDisplay}</span>
                  <span className="text-[15px] font-semibold text-primary font-mono shrink-0 ml-2">{flightFrom.toUpperCase()}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Select departure</span>
              )}
            </div>
          </button>
          {fromPrefill.fromTrip && !fromPrefill.userEdited && flightFromDisplay && (
            <div className="absolute top-2 right-12"><span className="text-[10px] text-primary/70 italic">from your trip</span></div>
          )}
        </div>

        {/* Divider with swap ON the rail */}
        <div className="relative flex items-center h-0">
          <div className="absolute left-0 right-0 border-t border-[#C2CEDC]/50" />
          {/* Swap button A�?" centred on rail at x=28px, 40A-40 visible, >=44A-44 touch */}
          <button onClick={swapLocations}
            className="absolute w-10 h-10 rounded-full bg-card border border-border shadow-sm flex items-center justify-center z-10 hover:border-primary/40 transition-colors"
            style={{ left: "8px", top: "50%", transform: `translateY(-50%) rotate(${swapping ? 180 : 0}deg)`, transition: "transform 0.3s ease" }}
            aria-label="Swap departure and arrival">
            <ArrowUpDown className="h-[15px] w-[15px] text-muted-foreground" strokeWidth={1.7} />
          </button>
        </div>

        {/* To row */}
        <div className="relative flex items-stretch min-h-[56px]">
          <div className="w-[56px] flex-shrink-0 flex flex-col items-center pb-2">
            <div className={cn("w-[10px] h-[10px] rounded-full border-2 z-10 bg-card mt-1",
              flightToDisplay ? "border-primary" : "border-[#C2CEDC]")} />
          </div>
          <button onClick={() => setToSheetOpen(true)} className="flex-1 flex items-center pr-4 py-3 text-left min-w-0">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">To</div>
              {flightToDisplay ? (
                <div className="flex items-end justify-between">
                  <span className={cn("block", cityTextClass(flightToDisplay))}>{flightToDisplay}</span>
                  <span className="text-[15px] font-semibold text-primary font-mono shrink-0 ml-2">{flightTo.toUpperCase()}</span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">Select arrival</span>
              )}
            </div>
          </button>
          {toPrefill.fromTrip && !toPrefill.userEdited && flightToDisplay && (
            <div className="absolute top-2 right-12"><span className="text-[10px] text-primary/70 italic">from your trip</span></div>
          )}
        </div>
      </div>

      {/* Validation A�?" below route card, only after attempt */}
      {hasAttempted && errors.length > 0 && (
        <div className="-mt-3 px-1">
          {errors.map((e) => (
            <p key={e} className="text-xs text-destructive/90 leading-relaxed" role="alert">{errorMessages[e]}</p>
          ))}
        </div>
      )}

      {/* TRIP DETAILS CARD */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <button onClick={() => setDateSheetOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
              {tripType === "roundtrip" ? "Dates" : "Departure"}
            </div>
            {departureDate ? (
              <span className="text-sm font-medium text-foreground">
                {tripType === "roundtrip" && returnDate
                  ? formatDateRangeDisplay(formatLocalDate(departureDate), formatLocalDate(returnDate))
                  : formatDateRangeDisplay(formatLocalDate(departureDate))}
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">{tripType === "roundtrip" ? "Add dates" : "Add date"}</span>
            )}
          </div>
          {departurePrefill.fromTrip && !departurePrefill.userEdited && departureDate && (
            <span className="text-[10px] text-primary/70 italic shrink-0">from your trip</span>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
        <div className="border-t border-border" />
        <button onClick={() => setTravellersSheetOpen(true)} className="w-full flex items-center gap-3 px-4 py-3.5 text-left">
          <Calendar className="h-5 w-5 text-muted-foreground shrink-0 opacity-0" />
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Travellers & Cabin</div>
            <span className="text-sm font-medium text-foreground">
              {formatTravellers(passengers.adults, passengers.children, passengers.infants)}
              {" \u00b7 "}
              {CABIN_LABELS[cabinClass]}
            </span>
          </div>
          {travellersPrefill.fromTrip && !travellersPrefill.userEdited && (
            <span className="text-[10px] text-primary/70 italic shrink-0">from your trip</span>
          )}
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </div>

      {/* SEARCH CTA */}
      <Button onClick={handleSearch} variant="conversion"
        className="w-full h-[52px] text-base font-semibold rounded-[12px] mt-1">
        Search flights
      </Button>

      {/* SHEETS */}
      <NativeLocationPicker isOpen={fromSheetOpen} onClose={() => setFromSheetOpen(false)}
        onSelect={(code: string, airport: Airport) => { setFlightFrom(code); setFlightFromDisplay(airport.city); setFromPrefill({ fromTrip: false, userEdited: true }); }}
        title="Where from?" placeholder="Search airports or cities..." />
      <NativeLocationPicker isOpen={toSheetOpen} onClose={() => setToSheetOpen(false)}
        onSelect={(code: string, airport: Airport) => { setFlightTo(code); setFlightToDisplay(airport.city); setToPrefill({ fromTrip: false, userEdited: true }); }}
        title="Where to?" placeholder="Search airports or cities..." />
      <NativeDatePicker isOpen={dateSheetOpen} onClose={() => setDateSheetOpen(false)}
        onRangeSelect={handleDateSelect} selected={departureDate} returnSelected={returnDate} tripType={tripType}
        title={tripType === "roundtrip" ? "Select dates" : "Select departure date"} />
      <PassengerPickerSheet isOpen={travellersSheetOpen} onClose={() => setTravellersSheetOpen(false)}
        passengers={passengers} cabinClass={cabinClass}
        onPassengersChange={(p) => { setPassengers(p); setTravellersPrefill(prev => ({ ...prev, userEdited: true })); }}
        onCabinChange={setCabinClass} />
    </div>
  );
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
