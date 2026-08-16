/**
 * BookingsFinder Things fact chip (T3B).
 *
 * PRESENTATION ONLY - a single factual "Good to know" item with a success
 * check icon. It receives an ALREADY-GATED, customer-visible fact label
 * (e.g. from `getActivityLevelFacts` + `THINGS_ACTIVITY_FACT_LABELS`). It
 * never decides whether a fact is true, whether provider evidence exists, or
 * whether `null` means false - the gating lives upstream.
 *
 * Visual (design system §29.21, Rome spec §13.3): `surface-card`,
 * `border-default`, `rounded-lg`, success check icon, `small` label in
 * `text-secondary`.
 */
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThingsFactChipProps {
  /** Already-gated, customer-visible fact label. */
  fact: string;
  className?: string;
}

const ThingsFactChip = ({ fact, className }: ThingsFactChipProps) => (
  <li
    data-testid="things-fact-chip"
    className={cn(
      "flex items-center gap-2 rounded-lg border border-things-border bg-things-surface-card px-3 py-2.5 text-sm text-things-text-secondary",
      className,
    )}
  >
    <CheckCircle2
      className="h-4 w-4 shrink-0 text-things-success"
      aria-hidden="true"
    />
    {fact}
  </li>
);

export default ThingsFactChip;
