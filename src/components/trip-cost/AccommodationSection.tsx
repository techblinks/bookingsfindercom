import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TripCostSectionCard } from "./TripCostSectionCard";
import { MoneyInput } from "./MoneyInput";
import { formatCurrencyCompact } from "./tripCostFormatting";
import { ACCOMMODATION_TYPES } from "./tripCostConfig";
import { calculateNights } from "./tripCostCalculations";
import type { AccommodationCosts, AccommodationType, ValidationError, SupportedCurrency } from "./types";
import { cn } from "@/lib/utils";

interface AccommodationSectionProps {
  accommodationCosts: AccommodationCosts;
  departureDate: string;
  returnDate: string;
  currency: SupportedCurrency;
  accommodationSubtotal: number;
  onUpdate: (patch: Partial<AccommodationCosts>) => void;
  onSetNights: (nights: number) => void;
  onUseTripDates: () => void;
  errors: ValidationError[];
  touched: Set<string>;
  onTouch: (field: string) => void;
}

function errFor(field: string, errors: ValidationError[], touched: Set<string>): string | null {
  if (!touched.has(field)) return null;
  const e = errors.find(e => e.field === field);
  return e ? e.message : null;
}

export function AccommodationSection({
  accommodationCosts, departureDate, returnDate, currency, accommodationSubtotal,
  onUpdate, onSetNights, onUseTripDates, errors, touched, onTouch,
}: AccommodationSectionProps) {
  const derivedNights = calculateNights(departureDate, returnDate);
  const hasValidDates = derivedNights !== undefined;
  const isManual = accommodationCosts.nightsManuallyOverridden;

  return (
    <TripCostSectionCard
      title="Accommodation"
      description="Accommodation nights follow your trip dates until you edit them manually."
    >
      <div className="space-y-5">
        {/* Accommodation type */}
        <div>
          <Label htmlFor="accomType">Accommodation type</Label>
          <Select
            value={accommodationCosts.type}
            onValueChange={(v) => onUpdate({ type: v as AccommodationType })}
          >
            <SelectTrigger id="accomType" className="h-12 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOMMODATION_TYPES.map(t => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Cost per night + Nights */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="costPerNight">Cost per night</Label>
            <MoneyInput
              id="costPerNight"
              value={accommodationCosts.costPerNight}
              onChange={v => { onUpdate({ costPerNight: v }); onTouch("accommodationCosts.costPerNight"); }}
              onBlur={() => onTouch("accommodationCosts.costPerNight")}
              aria-invalid={!!errFor("accommodationCosts.costPerNight", errors, touched)}
              aria-describedby={errFor("accommodationCosts.costPerNight", errors, touched) ? "err-costPerNight" : undefined}
              step="0.01"
            />
            {errFor("accommodationCosts.costPerNight", errors, touched) && (
              <p id="err-costPerNight" className="text-xs text-destructive mt-1">
                {errFor("accommodationCosts.costPerNight", errors, touched)}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="nights">Number of nights</Label>
            <input
              id="nights"
              type="number"
              inputMode="numeric"
              min={0}
              max={365}
              step={1}
              value={accommodationCosts.nights}
              onChange={e => {
                const raw = e.target.value;
                if (raw === "") { onSetNights(0); }
                else {
                  const n = Number(raw);
                  if (!isNaN(n) && isFinite(n) && Number.isInteger(n)) {
                    onSetNights(n);
                  }
                }
                onTouch("accommodationCosts.nights");
              }}
              onBlur={() => onTouch("accommodationCosts.nights")}
              aria-invalid={!!errFor("accommodationCosts.nights", errors, touched)}
              className="h-12 rounded-xl border border-input bg-background px-3 py-2 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {/* Override status + action */}
            <div className="flex items-center justify-between mt-1.5">
              <span className={cn(
                "text-xs",
                isManual ? "text-amber-600" : "text-muted-foreground"
              )}>
                {isManual ? "Custom accommodation nights" : hasValidDates ? "Using trip dates" : "No trip dates set"}
              </span>
              {hasValidDates && (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto p-0 text-xs underline underline-offset-2"
                  onClick={onUseTripDates}
                >
                  Use trip dates
                </Button>
              )}
            </div>
            {errFor("accommodationCosts.nights", errors, touched) && (
              <p className="text-xs text-destructive mt-1">{errFor("accommodationCosts.nights", errors, touched)}</p>
            )}
          </div>
        </div>

        {/* Fixed fees */}
        <fieldset>
          <legend className="text-sm font-medium text-foreground mb-3">Additional fees</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { key: "taxes" as const, label: "Accommodation taxes" },
              { key: "cleaningFee" as const, label: "Cleaning fee" },
              { key: "resortFee" as const, label: "Resort fee" },
              { key: "bookingFee" as const, label: "Booking fee" },
              { key: "otherCosts" as const, label: "Other accommodation costs" },
            ]).map(({ key, label }) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <MoneyInput
                  id={key}
                  value={accommodationCosts[key]}
                  onChange={v => { onUpdate({ [key]: v }); onTouch(`accommodationCosts.${key}`); }}
                  onBlur={() => onTouch(`accommodationCosts.${key}`)}
                  aria-invalid={!!errFor(`accommodationCosts.${key}`, errors, touched)}
                  aria-describedby={errFor(`accommodationCosts.${key}`, errors, touched) ? `err-${key}` : undefined}
                  step="0.01"
                />
                {errFor(`accommodationCosts.${key}`, errors, touched) && (
                  <p id={`err-${key}`} className="text-xs text-destructive mt-1">
                    {errFor(`accommodationCosts.${key}`, errors, touched)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        {/* Subtotal */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Accommodation subtotal</span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatCurrencyCompact(accommodationSubtotal, currency)} {currency}
          </span>
        </div>
      </div>
    </TripCostSectionCard>
  );
}
