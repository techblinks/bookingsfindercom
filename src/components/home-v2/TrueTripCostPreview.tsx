import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SectionContainer } from "./SectionContainer";
import { SectionHeading } from "./SectionHeading";
import { exampleTripCostCategories, exampleTripCostTotal, costIconMap } from "./homeV2Config";

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export function TrueTripCostPreview() {
  return (
    <SectionContainer className="bg-background">
      <SectionHeading
        headline="Know the real cost before you book."
        supporting="Flights are only part of the total. See accommodation, transport, insurance, connectivity and everyday spending together."
      />

      <div className="max-w-2xl mx-auto">
        {/* Preview label */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center mb-4">
          Example trip budget — Sydney to Bali, 7 nights
        </p>

        {/* Cost breakdown card */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          {/* Category rows */}
          <ul className="divide-y divide-border" aria-label="Example trip cost breakdown">
            {exampleTripCostCategories.map((category) => {
              const Icon = costIconMap[category.icon];
              return (
                <li key={category.label} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{category.label}</p>
                      {category.note && (
                        <p className="text-xs text-muted-foreground truncate">{category.note}</p>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground tabular-nums shrink-0 ml-4">
                    {formatCurrency(category.amount)}
                  </span>
                </li>
              );
            })}
          </ul>

          {/* Total */}
          <div className="px-5 py-4 bg-muted/30 border-t border-border">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold text-foreground">Estimated total</span>
              <span className="text-xl font-bold text-foreground tabular-nums">
                {formatCurrency(exampleTripCostTotal)}
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1.5">
              This is a preview example — not a live estimate. Actual costs vary by season, provider, and booking timing.
            </p>
          </div>
        </div>

        {/* Educational note */}
        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The flight price is only one part of the journey. Accommodation, transport, insurance, connectivity and daily spending can significantly change the total cost.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <Link
            to="/trip-cost"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Estimate a trip cost
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </SectionContainer>
  );
}
