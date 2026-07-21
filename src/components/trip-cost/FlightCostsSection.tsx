import { Label } from "@/components/ui/label";
import { TripCostSectionCard } from "./TripCostSectionCard";
import { MoneyInput } from "./MoneyInput";
import { formatCurrencyCompact } from "./tripCostFormatting";
import { getTotalTravellers } from "./tripCostCalculations";
import type { FlightCosts, ValidationError, SupportedCurrency } from "./types";

interface FlightCostsSectionProps {
  flightCosts: FlightCosts;
  travellers: { adults: number; children: number; infants: number };
  currency: SupportedCurrency;
  flightsSubtotal: number;
  onUpdate: (patch: Partial<FlightCosts>) => void;
  errors: ValidationError[];
  touched: Set<string>;
  onTouch: (field: string) => void;
}

function errFor(field: string, errors: ValidationError[], touched: Set<string>): string | null {
  if (!touched.has(field)) return null;
  const e = errors.find(e => e.field === field);
  return e ? e.message : null;
}

export function FlightCostsSection({ flightCosts, travellers, currency, flightsSubtotal, onUpdate, errors, touched, onTouch }: FlightCostsSectionProps) {
  const total = getTotalTravellers(travellers);

  return (
    <TripCostSectionCard
      title="Flights and airport costs"
      description="Passenger fares are multiplied by the matching traveller count. Other amounts are treated as totals for the whole trip."
    >
      <div className="space-y-5">
        {/* Passenger fares */}
        <fieldset>
          <legend className="text-sm font-medium text-foreground mb-3">Passenger fares</legend>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {([
              { key: "adultAirfare" as const, label: "Adult airfare, per adult", count: travellers.adults },
              { key: "childAirfare" as const, label: "Child airfare, per child", count: travellers.children },
              { key: "infantAirfare" as const, label: "Infant airfare, per infant", count: travellers.infants },
            ]).map(({ key, label, count }) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <MoneyInput
                  id={key}
                  value={flightCosts[key]}
                  onChange={v => { onUpdate({ [key]: v }); onTouch(`flightCosts.${key}`); }}
                  onBlur={() => onTouch(`flightCosts.${key}`)}
                  aria-invalid={!!errFor(`flightCosts.${key}`, errors, touched)}
                  aria-describedby={errFor(`flightCosts.${key}`, errors, touched) ? `err-${key}` : undefined}
                  step="0.01"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {count > 0 ? `× ${count}` : "No travellers"}
                </p>
                {errFor(`flightCosts.${key}`, errors, touched) && (
                  <p id={`err-${key}`} className="text-xs text-destructive mt-1">
                    {errFor(`flightCosts.${key}`, errors, touched)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        {/* Fixed extras */}
        <fieldset>
          <legend className="text-sm font-medium text-foreground mb-3">Fixed trip totals</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {([
              { key: "checkedBaggage" as const, label: "Checked baggage, trip total" },
              { key: "seatSelection" as const, label: "Seat selection, trip total" },
              { key: "airportParking" as const, label: "Airport parking, trip total" },
              { key: "departureTransfer" as const, label: "Departure airport transfer, trip total" },
              { key: "arrivalTransfer" as const, label: "Arrival airport transfer, trip total" },
              { key: "otherFlightCosts" as const, label: "Other flight costs, trip total" },
            ]).map(({ key, label }) => (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <MoneyInput
                  id={key}
                  value={flightCosts[key]}
                  onChange={v => { onUpdate({ [key]: v }); onTouch(`flightCosts.${key}`); }}
                  onBlur={() => onTouch(`flightCosts.${key}`)}
                  aria-invalid={!!errFor(`flightCosts.${key}`, errors, touched)}
                  aria-describedby={errFor(`flightCosts.${key}`, errors, touched) ? `err-${key}` : undefined}
                  step="0.01"
                />
                {errFor(`flightCosts.${key}`, errors, touched) && (
                  <p id={`err-${key}`} className="text-xs text-destructive mt-1">
                    {errFor(`flightCosts.${key}`, errors, touched)}
                  </p>
                )}
              </div>
            ))}
          </div>
        </fieldset>

        {/* Subtotal */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Flights subtotal</span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatCurrencyCompact(flightsSubtotal, currency)} {currency}
          </span>
        </div>
      </div>
    </TripCostSectionCard>
  );
}
