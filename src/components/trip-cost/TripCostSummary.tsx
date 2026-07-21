import { formatCurrency } from "./tripCostFormatting";
import { getTotalTravellers, calculateNights } from "./tripCostCalculations";
import type { TripCostPlannerState, TripCostSummary, SupportedCurrency } from "./types";

interface TripCostSummaryPanelProps {
  state: TripCostPlannerState;
  summary: TripCostSummary;
}

function dashIfUndefined(v: number | undefined, currency: SupportedCurrency): string {
  if (v === undefined) return "—";
  return formatCurrency(v, currency);
}

export function TripCostSummaryPanel({ state, summary }: TripCostSummaryPanelProps) {
  const currency = state.tripDetails.currency;
  const dest = state.tripDetails.destinationCity || state.tripDetails.tripName || "Your trip";

  return (
    <div className="bg-card rounded-2xl border border-border p-6 sticky top-[72px]">
      <h2 className="text-base font-semibold text-foreground mb-4">Trip summary</h2>

      {/* Trip info */}
      <div className="space-y-2 text-sm mb-4 pb-4 border-b border-border">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Destination</span>
          <span className="font-medium text-foreground">{dest}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Currency</span>
          <span className="font-medium text-foreground">{currency}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Dates</span>
          <span className="font-medium text-foreground">
            {state.tripDetails.departureDate && state.tripDetails.returnDate
              ? `${state.tripDetails.departureDate} → ${state.tripDetails.returnDate}`
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Duration</span>
          <span className="font-medium text-foreground">
            {summary.tripNights !== undefined
              ? `${summary.tripNights} night${summary.tripNights !== 1 ? "s" : ""} · ${summary.tripDays} day${summary.tripDays !== 1 ? "s" : ""}` 
              : "—"}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Travellers</span>
          <span className="font-medium text-foreground">{summary.totalTravellers}</span>
        </div>
      </div>

      {/* Cost categories */}
      <div className="space-y-2 text-sm">
        {[
          ["Flights", summary.flightsSubtotal],
          ["Accommodation", summary.accommodationSubtotal],
          ["Daily spending", summary.dailySpendingSubtotal],
          ["Insurance & prep", summary.preparationSubtotal],
          ["Activities", summary.activitiesSubtotal],
        ].map(([label, amount]) => (
          <div key={label} className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrency(amount, currency)}
            </span>
          </div>
        ))}
      </div>

      {/* Separator + subtotal */}
      <div className="border-t border-border mt-3 pt-3 space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span className="font-semibold text-foreground tabular-nums">
            {formatCurrency(summary.subtotalBeforeContingency, currency)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Contingency</span>
          <span className="font-medium text-foreground tabular-nums">
            {formatCurrency(summary.contingencyAmount, currency)}
          </span>
        </div>
      </div>

      {/* Total */}
      <div className="border-t border-border mt-3 pt-3">
        <div className="flex justify-between items-baseline">
          <span className="text-base font-bold text-foreground">Total trip cost</span>
          <span className="text-xl font-bold text-primary tabular-nums">
            {formatCurrency(summary.total, currency)}
          </span>
        </div>
      </div>

      {/* Per-unit */}
      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Per traveller</span>
          <span className="tabular-nums">{dashIfUndefined(summary.costPerTraveller, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Per trip day</span>
          <span className="tabular-nums">{dashIfUndefined(summary.costPerDay, currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Per traveller / day</span>
          <span className="tabular-nums">{dashIfUndefined(summary.costPerTravellerPerDay, currency)}</span>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="mt-4 text-xs text-muted-foreground leading-relaxed border-t border-border pt-3">
        Your total is an estimate based on your entries. Confirm actual prices and fees with the relevant provider before booking.
      </p>
    </div>
  );
}
