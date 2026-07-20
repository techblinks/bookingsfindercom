import { Label } from "@/components/ui/label";
import { TripCostSectionCard } from "./TripCostSectionCard";
import { MoneyInput } from "./MoneyInput";
import { formatCurrencyCompact } from "./tripCostFormatting";
import type { PreparationCosts, ValidationError, SupportedCurrency } from "./types";

const FIELDS = [
  { key: "travelInsurance" as const, label: "Travel insurance, trip total" },
  { key: "visaFees" as const, label: "Visa costs, trip total" },
  { key: "passportCosts" as const, label: "Passport costs, trip total" },
  { key: "vaccinations" as const, label: "Vaccinations and medication, trip total" },
  { key: "esimMobileData" as const, label: "SIM or eSIM, trip total" },
  { key: "roaming" as const, label: "Roaming charges, trip total" },
  { key: "otherCosts" as const, label: "Other preparation costs, trip total" },
];

interface PreparationCostsSectionProps {
  preparationCosts: PreparationCosts;
  currency: SupportedCurrency;
  preparationSubtotal: number;
  onUpdate: (patch: Partial<PreparationCosts>) => void;
  errors: ValidationError[];
  touched: Set<string>;
  onTouch: (field: string) => void;
}

function errFor(field: string, errors: ValidationError[], touched: Set<string>): string | null {
  if (!touched.has(field)) return null;
  const e = errors.find(e => e.field === field);
  return e ? e.message : null;
}

export function PreparationCostsSection({
  preparationCosts, currency, preparationSubtotal,
  onUpdate, errors, touched, onTouch,
}: PreparationCostsSectionProps) {
  return (
    <TripCostSectionCard
      title="Insurance and preparation"
      description="These are total preparation costs for the whole trip, not per traveller unless you enter the combined amount."
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {FIELDS.map(({ key, label }) => {
            const fieldPath = `preparationCosts.${key}`;
            return (
              <div key={key}>
                <Label htmlFor={key}>{label}</Label>
                <MoneyInput
                  id={key}
                  value={preparationCosts[key]}
                  onChange={v => { onUpdate({ [key]: v }); onTouch(fieldPath); }}
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

        {/* Subtotal */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm font-semibold text-foreground">Preparation subtotal</span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatCurrencyCompact(preparationSubtotal, currency)} {currency}
          </span>
        </div>
      </div>
    </TripCostSectionCard>
  );
}
