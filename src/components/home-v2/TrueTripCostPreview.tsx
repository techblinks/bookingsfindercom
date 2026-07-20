import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { exampleTripCostCategories, exampleTripCostTotal, costIconMap } from "./homeV2Config";

function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

export function TrueTripCostPreview() {
  return (
    <section className="py-16 md:py-22 bg-background">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-[7fr_5fr] gap-12 lg:gap-16 items-start">
          {/* Left: Cost breakdown */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Example trip budget — Sydney to Bali, 7 nights
            </p>
            <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
              <ul className="divide-y divide-border" aria-label="Example trip cost breakdown">
                {exampleTripCostCategories.map((category) => {
                  const Icon = costIconMap[category.icon];
                  return (
                    <li key={category.label} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          {Icon && <Icon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />}
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
              <div className="px-5 py-4 bg-muted/30 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold text-foreground">Estimated total</span>
                  <span className="text-xl font-bold text-foreground tabular-nums">
                    {formatCurrency(exampleTripCostTotal)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">
                  This is a preview example — not a live estimate. Actual costs vary.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Explanation */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight text-balance">
              Know the real cost before you book.
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              Flights are only part of the total. See accommodation, transport, insurance, connectivity and everyday spending together.
            </p>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              The flight price is only one part of the journey. Accommodation, transport, insurance, connectivity and daily spending can significantly change the total cost.
            </p>
            <div className="mt-6">
              <Link
                to="/trip-cost"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-semibold hover:bg-primary-hover transition-colors"
              >
                Estimate a trip cost
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
