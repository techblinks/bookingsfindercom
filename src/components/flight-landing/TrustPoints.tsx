/**
 * TrustPoints — compact, honest trust row for the flight landing page.
 *
 * Intentionally lightweight (Phase 1 constraint): NO large trust cards.
 *  - Desktop: one narrow, single-line row of three inline points.
 *  - Mobile: three small stacked rows.
 *
 * Copy is claim-safe — no price, savings, or "guaranteed" language.
 */

import { Check } from "lucide-react";

const TRUST_POINTS = [
  "Compare available flight options",
  "Clear and simple search",
  "Continue securely to the selected provider",
] as const;

const TrustPoints = () => {
  return (
    <section aria-labelledby="flight-trust-heading" className="border-y border-border bg-background">
      <h2 id="flight-trust-heading" className="sr-only">
        Why search with BookingsFinder
      </h2>
      <div className="mx-auto max-w-6xl px-4 py-4 md:py-3">
        <ul
          data-testid="trust-points"
          className="flex flex-col gap-3 md:flex-row md:items-center md:justify-center md:gap-x-8 md:gap-y-0"
        >
          {TRUST_POINTS.map((point) => (
            <li key={point} className="flex items-center gap-2.5">
              <span
                aria-hidden="true"
                className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-success/10"
              >
                <Check className="h-3.5 w-3.5 text-success" />
              </span>
              <span className="text-sm font-medium text-foreground">{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};

export default TrustPoints;
