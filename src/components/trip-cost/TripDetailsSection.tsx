import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TripCostSectionCard } from "./TripCostSectionCard";
import { SUPPORTED_CURRENCIES } from "./tripCostConfig";
import { calculateNights } from "./tripCostCalculations";
import type { TripDetails, SupportedCurrency, ValidationError } from "./types";
import { cn } from "@/lib/utils";

interface TripDetailsSectionProps {
  tripDetails: TripDetails;
  onUpdate: (patch: Partial<TripDetails>) => void;
  onSetCurrency: (currency: SupportedCurrency) => void;
  errors: ValidationError[];
  touched: Set<string>;
  onTouch: (field: string) => void;
}

function errFor(field: string, errors: ValidationError[], touched: Set<string>): string | null {
  if (!touched.has(field)) return null;
  const e = errors.find(e => e.field === field);
  return e ? e.message : null;
}

export function TripDetailsSection({ tripDetails, onUpdate, onSetCurrency, errors, touched, onTouch }: TripDetailsSectionProps) {
  const nights = calculateNights(tripDetails.departureDate, tripDetails.returnDate);
  const days = nights !== undefined ? nights + 1 : undefined;

  const dateStatus = (() => {
    if (!tripDetails.departureDate && !tripDetails.returnDate) return "Enter both dates to calculate trip length.";
    if (!tripDetails.departureDate || !tripDetails.returnDate) return "Enter both dates to calculate trip length.";
    const dateErr = errors.find(e => e.code === "date_order" || e.code === "departure_past");
    if (dateErr && touched.has("tripDetails.returnDate") || touched.has("tripDetails.departureDate")) return dateErr.message;
    return `${nights} night${nights !== 1 ? "s" : ""} · ${days} day${days !== 1 ? "s" : ""}`;
  })();

  const hasDateError = touched.has("tripDetails.returnDate") && errors.some(e => e.code === "date_order" || e.code === "departure_past");

  return (
    <TripCostSectionCard
      title="Trip details"
      description="Where are you going, and when? All fields are optional while you plan."
    >
      <div className="space-y-5">
        {/* Row 1: Trip name + Currency */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="tripName">Trip name (optional)</Label>
            <Input
              id="tripName"
              value={tripDetails.tripName}
              onChange={e => { onUpdate({ tripName: e.target.value }); onTouch("tripDetails.tripName"); }}
              onBlur={() => onTouch("tripDetails.tripName")}
              placeholder="e.g. Bali 2026"
              maxLength={100}
              className="h-12 rounded-xl"
              aria-invalid={!!errFor("tripDetails.tripName", errors, touched)}
            />
            {errFor("tripDetails.tripName", errors, touched) && (
              <p className="text-xs text-destructive mt-1">{errFor("tripDetails.tripName", errors, touched)}</p>
            )}
          </div>
          <div>
            <Label htmlFor="currency">Currency</Label>
            <Select value={tripDetails.currency} onValueChange={(v) => onSetCurrency(v as SupportedCurrency)}>
              <SelectTrigger id="currency" className="h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map(c => (
                  <SelectItem key={c.code} value={c.code}>{c.name} ({c.code})</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">Enter all costs in the selected currency. Currency conversion is not included.</p>
          </div>
        </div>

        {/* Row 2: Departure */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="depCountry">Departure country</Label>
            <Input
              id="depCountry"
              value={tripDetails.departureCountry}
              onChange={e => { onUpdate({ departureCountry: e.target.value }); }}
              onBlur={() => onTouch("tripDetails.departureCountry")}
              placeholder="e.g. Australia"
              maxLength={100}
              className="h-12 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="depCity">Departure city</Label>
            <Input
              id="depCity"
              value={tripDetails.departureCity}
              onChange={e => { onUpdate({ departureCity: e.target.value }); }}
              onBlur={() => onTouch("tripDetails.departureCity")}
              placeholder="e.g. Sydney"
              maxLength={100}
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        {/* Row 3: Destination */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="destCountry">Destination country</Label>
            <Input
              id="destCountry"
              value={tripDetails.destinationCountry}
              onChange={e => { onUpdate({ destinationCountry: e.target.value }); }}
              onBlur={() => onTouch("tripDetails.destinationCountry")}
              placeholder="e.g. Indonesia"
              maxLength={100}
              className="h-12 rounded-xl"
            />
          </div>
          <div>
            <Label htmlFor="destCity">Destination city</Label>
            <Input
              id="destCity"
              value={tripDetails.destinationCity}
              onChange={e => { onUpdate({ destinationCity: e.target.value }); }}
              onBlur={() => onTouch("tripDetails.destinationCity")}
              placeholder="e.g. Denpasar"
              maxLength={100}
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        {/* Row 4: Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="depDate">Departure date</Label>
            <Input
              id="depDate"
              type="date"
              value={tripDetails.departureDate}
              onChange={e => { onUpdate({ departureDate: e.target.value }); onTouch("tripDetails.departureDate"); }}
              onBlur={() => onTouch("tripDetails.departureDate")}
              aria-invalid={!!errFor("tripDetails.departureDate", errors, touched) || hasDateError}
              className="h-12 rounded-xl"
            />
            {errFor("tripDetails.departureDate", errors, touched) && (
              <p className="text-xs text-destructive mt-1">{errFor("tripDetails.departureDate", errors, touched)}</p>
            )}
          </div>
          <div>
            <Label htmlFor="retDate">Return date</Label>
            <Input
              id="retDate"
              type="date"
              value={tripDetails.returnDate}
              onChange={e => { onUpdate({ returnDate: e.target.value }); onTouch("tripDetails.returnDate"); }}
              onBlur={() => onTouch("tripDetails.returnDate")}
              aria-invalid={hasDateError}
              className="h-12 rounded-xl"
            />
          </div>
        </div>

        {/* Date status */}
        <p className={cn("text-sm", hasDateError ? "text-destructive" : "text-muted-foreground")}>
          {dateStatus}
        </p>
      </div>
    </TripCostSectionCard>
  );
}
