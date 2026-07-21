import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TripCostSectionCard } from "./TripCostSectionCard";
import { getTotalTravellers } from "./tripCostCalculations";
import { MAX_TRAVELLERS } from "./tripCostConfig";
import type { Travellers, ValidationError } from "./types";

interface TravellersSectionProps {
  travellers: Travellers;
  onUpdate: (patch: Partial<Travellers>) => void;
  errors: ValidationError[];
  touched: Set<string>;
  onTouch: (field: string) => void;
}

function errFor(field: string, errors: ValidationError[], touched: Set<string>): string | null {
  const e = errors.find(e => e.field === field);
  if (!e) return null;
  if (!touched.has(field)) return null;
  return e.message;
}

export function TravellersSection({ travellers, onUpdate, errors, touched, onTouch }: TravellersSectionProps) {
  const total = getTotalTravellers(travellers);

  // Section-level errors
  const sectionError = errors.find(e => e.field === "travellers" && touched.has("travellers"));

  return (
    <TripCostSectionCard
      title="Travellers"
      description="Who is coming? All travellers count toward the cost-per-person calculation."
    >
      <div className="space-y-5">
        {/* Traveller inputs in a row */}
        <div className="grid grid-cols-3 gap-4">
          {([
            { key: "adults" as const, label: "Adults" },
            { key: "children" as const, label: "Children" },
            { key: "infants" as const, label: "Infants" },
          ]).map(({ key, label }) => (
            <div key={key}>
              <Label htmlFor={key}>{label}</Label>
              <Input
                id={key}
                type="number"
                inputMode="numeric"
                min={0}
                max={MAX_TRAVELLERS}
                step={1}
                value={travellers[key]}
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === "") { onUpdate({ [key]: 0 }); }
                  else {
                    const n = Number(raw);
                    // Only commit valid whole numbers — fractional values stay
                    // as transient display until the user corrects them
                    if (!isNaN(n) && isFinite(n) && Number.isInteger(n)) {
                      onUpdate({ [key]: n });
                    }
                  }
                  onTouch(`travellers.${key}`);
                  onTouch("travellers");
                }}
                onBlur={() => { onTouch(`travellers.${key}`); onTouch("travellers"); }}
                aria-invalid={!!errFor(`travellers.${key}`, errors, touched)}
                aria-describedby={
                  errFor(`travellers.${key}`, errors, touched) ? `err-${key}` : `total-travellers`
                }
                className="h-12 rounded-xl"
              />
              {errFor(`travellers.${key}`, errors, touched) && (
                <p id={`err-${key}`} className="text-xs text-destructive mt-1">
                  {errFor(`travellers.${key}`, errors, touched)}
                </p>
              )}
            </div>
          ))}
        </div>

        {/* Total + section error */}
        <div className="flex items-center justify-between text-sm">
          <p id="total-travellers" className="text-muted-foreground">
            Total travellers: <span className="font-semibold text-foreground">{total}</span>
          </p>
          {sectionError && (
            <p className="text-destructive text-xs">{sectionError.message}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">
          All travellers are included in the cost-per-traveller calculation. Other costs are not automatically adjusted by age.
        </p>
      </div>
    </TripCostSectionCard>
  );
}
