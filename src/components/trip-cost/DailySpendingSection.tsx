import { Label } from "@/components/ui/label";
import { TripCostSectionCard } from "./TripCostSectionCard";
import { MoneyInput } from "./MoneyInput";
import { formatCurrencyCompact } from "./tripCostFormatting";
import { calculateDays } from "./tripCostCalculations";
import type { DailySpending, ValidationError, SupportedCurrency } from "./types";

const CATEGORIES = [
  { key: "foodDrinks" as const, label: "Food and drinks, per day" },
  { key: "localTransport" as const, label: "Local transport, per day" },
  { key: "shopping" as const, label: "Shopping, per day" },
  { key: "entertainment" as const, label: "Entertainment, per day" },
  { key: "miscellaneous" as const, label: "Miscellaneous, per day" },
];

interface DailySpendingSectionProps {
  dailySpending: DailySpending;
  departureDate: string;
  returnDate: string;
  currency: SupportedCurrency;
  dailySubtotal: number;
  onUpdate: (catKey: string, dailyAmount: number) => void;
  errors: ValidationError[];
  touched: Set<string>;
  onTouch: (field: string) => void;
}

function errFor(field: string, errors: ValidationError[], touched: Set<string>): string | null {
  if (!touched.has(field)) return null;
  const e = errors.find(e => e.field === field);
  return e ? e.message : null;
}

export function DailySpendingSection({
  dailySpending, departureDate, returnDate, currency, dailySubtotal,
  onUpdate, errors, touched, onTouch,
}: DailySpendingSectionProps) {
  const tripDays = calculateDays(departureDate, returnDate);
  const hasValidDates = tripDays !== undefined && tripDays > 0;
  const combinedDaily = CATEGORIES.reduce((sum, c) => sum + (dailySpending[c.key].dailyAmount || 0), 0);
  const daysValue = (hasValidDates ? tripDays : (dailySpending.foodDrinks.days || 0));

  return (
    <TripCostSectionCard
      title="Daily spending"
      description="Enter the estimated amount for the whole trip per day, not per traveller."
    >
      <div className="space-y-5">
        {/* Category inputs */}
        <fieldset>
          <legend className="text-sm font-medium text-foreground mb-3">Per-day spending categories</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CATEGORIES.map(({ key, label }) => {
              const fieldPath = `dailySpending.${key}.dailyAmount`;
              return (
                <div key={key}>
                  <Label htmlFor={key}>{label}</Label>
                  <MoneyInput
                    id={key}
                    value={dailySpending[key].dailyAmount}
                    onChange={v => { onUpdate(key, v); onTouch(fieldPath); }}
                    onBlur={() => onTouch(fieldPath)}
                    aria-invalid={!!errFor(fieldPath, errors, touched)}
                    aria-describedby={errFor(fieldPath, errors, touched) ? `err-${key}` : undefined}
                    step="0.01"
                  />
                  {errFor(fieldPath, errors, touched) && (
                    <p id={`err-${key}`} className="text-xs text-destructive mt-1">
                      {errFor(fieldPath, errors, touched)}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </fieldset>

        {/* Summary row */}
        <div className="border-t border-border pt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Combined daily amount</span>
            <span className="font-medium text-foreground tabular-nums">
              {formatCurrencyCompact(combinedDaily, currency)} {currency}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Trip duration</span>
            <span className="font-medium text-foreground">
              {hasValidDates ? `${tripDays} day${tripDays !== 1 ? "s" : ""}` : "No valid trip dates"}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-2">
            <span className="text-sm font-semibold text-foreground">Daily spending total</span>
            <span className="text-sm font-bold text-foreground tabular-nums">
              {formatCurrencyCompact(dailySubtotal, currency)} {currency}
            </span>
          </div>
          {!hasValidDates && (
            <p className="text-xs text-muted-foreground pt-1">
              Add valid trip dates to calculate total daily spending.
            </p>
          )}
        </div>
      </div>
    </TripCostSectionCard>
  );
}
