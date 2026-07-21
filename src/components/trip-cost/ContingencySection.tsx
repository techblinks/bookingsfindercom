import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { TripCostSectionCard } from "./TripCostSectionCard";
import { MoneyInput } from "./MoneyInput";
import { formatCurrencyCompact } from "./tripCostFormatting";
import { CONTINGENCY_MODES } from "./tripCostConfig";
import type { ContingencyConfig, ContingencyMode, ValidationError, SupportedCurrency } from "./types";

interface ContingencySectionProps {
  contingency: ContingencyConfig;
  currency: SupportedCurrency;
  contingencyAmount: number;
  subtotal: number;
  onUpdate: (patch: Partial<ContingencyConfig>) => void;
  errors: ValidationError[];
  touched: Set<string>;
  onTouch: (field: string) => void;
}

function errFor(field: string, errors: ValidationError[], touched: Set<string>): string | null {
  if (!touched.has(field)) return null;
  const e = errors.find(e => e.field === field);
  return e ? e.message : null;
}

export function ContingencySection({
  contingency, currency, contingencyAmount, subtotal,
  onUpdate, errors, touched, onTouch,
}: ContingencySectionProps) {
  const showCustomPct = contingency.mode === "pct-custom";
  const showCustomFixed = contingency.mode === "fixed";

  return (
    <TripCostSectionCard
      title="Contingency"
      description="Contingency adds a buffer for unexpected costs. Percentage options are calculated from your subtotal before contingency."
    >
      <div className="space-y-5">
        {/* Mode selector */}
        <RadioGroup
          value={contingency.mode}
          onValueChange={(v) => {
            onUpdate({ mode: v as ContingencyMode });
            onTouch("contingency.mode");
          }}
        >
          {CONTINGENCY_MODES.map(m => (
            <label
              key={m.mode}
              htmlFor={`cont-${m.mode}`}
              className="flex items-center gap-3 py-1.5 cursor-pointer"
            >
              <RadioGroupItem id={`cont-${m.mode}`} value={m.mode} />
              <span className="text-sm text-foreground">{m.label}</span>
            </label>
          ))}
        </RadioGroup>

        {/* Custom percentage input */}
        {showCustomPct && (
          <div>
            <Label htmlFor="customPct">Custom percentage (%)</Label>
            <input
              id="customPct"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.1"
              value={contingency.customPercentage}
              onChange={e => {
                const v = e.target.value === "" ? 0 : Number(e.target.value);
                if (!isNaN(v) && isFinite(v)) onUpdate({ customPercentage: v });
                onTouch("contingency.customPercentage");
              }}
              onBlur={() => onTouch("contingency.customPercentage")}
              aria-invalid={!!errFor("contingency.customPercentage", errors, touched)}
              aria-describedby={errFor("contingency.customPercentage", errors, touched) ? "err-customPct" : undefined}
              className="h-12 rounded-xl border border-input bg-background px-3 py-2 w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
            {errFor("contingency.customPercentage", errors, touched) && (
              <p id="err-customPct" className="text-xs text-destructive mt-1">
                {errFor("contingency.customPercentage", errors, touched)}
              </p>
            )}
          </div>
        )}

        {/* Custom fixed amount input */}
        {showCustomFixed && (
          <div>
            <Label htmlFor="customFixed">Fixed amount</Label>
            <MoneyInput
              id="customFixed"
              value={contingency.customFixedAmount}
              onChange={v => { onUpdate({ customFixedAmount: v }); onTouch("contingency.customFixedAmount"); }}
              onBlur={() => onTouch("contingency.customFixedAmount")}
              aria-invalid={!!errFor("contingency.customFixedAmount", errors, touched)}
              aria-describedby={errFor("contingency.customFixedAmount", errors, touched) ? "err-customFixed" : undefined}
              step="0.01"
            />
            {errFor("contingency.customFixedAmount", errors, touched) && (
              <p id="err-customFixed" className="text-xs text-destructive mt-1">
                {errFor("contingency.customFixedAmount", errors, touched)}
              </p>
            )}
          </div>
        )}

        {/* Live contingency amount */}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <span className="text-sm text-muted-foreground">
            Contingency amount ({formatCurrencyCompact(subtotal, currency)} {currency} subtotal)
          </span>
          <span className="text-sm font-bold text-foreground tabular-nums">
            {formatCurrencyCompact(contingencyAmount, currency)} {currency}
          </span>
        </div>
      </div>
    </TripCostSectionCard>
  );
}
