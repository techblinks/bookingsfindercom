import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { exampleWorkspaceItems, workspaceIconMap } from "./homeV2Config";
import { cn } from "@/lib/utils";

function StatusBadge({ status }: { status: "confirmed" | "pending" | "attention" }) {
  const config = {
    confirmed: { label: "Confirmed", className: "bg-success/10 text-success border-success/20" },
    pending: { label: "To do", className: "bg-muted text-muted-foreground border-border" },
    attention: { label: "Attention", className: "bg-warning/10 text-warning border-warning/20" },
  };
  const { label, className } = config[status];
  return (
    <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium border", className)}>
      {label}
    </span>
  );
}

export function TripWorkspacePreview() {
  return (
    <section className="py-16 md:py-22 bg-muted/50">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-[7fr_5fr] gap-12 lg:gap-16 items-start">
          {/* Left: Workspace card */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Example workspace
            </p>
            <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                    <Calendar className="h-[22px] w-[22px] text-accent" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Sydney to Bali</p>
                    <p className="text-xs text-muted-foreground">Aug 15 – Aug 22, 2026 · Example countdown: 12 days</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-success rounded-full" style={{ width: "43%" }} />
                  </div>
                  <span className="text-xs font-medium text-muted-foreground tabular-nums">3/7</span>
                </div>
              </div>

              <ul className="divide-y divide-border" aria-label="Example trip workspace timeline">
                {exampleWorkspaceItems.map((item) => {
                  const Icon = workspaceIconMap[item.icon];
                  return (
                    <li key={item.label} className="px-5 py-3 flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                        {Icon && <Icon className="h-[18px] w-[18px] text-muted-foreground" aria-hidden="true" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                          <StatusBadge status={item.status} />
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="px-5 py-3 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground">This is a preview example. Trip workspaces are coming soon.</p>
              </div>
            </div>
          </div>

          {/* Right: Explanation */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight text-balance">
              Every booking, document and deadline in one place.
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              Keep flights, accommodation, documents, tasks and departure information organised around your trip.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "Flight and accommodation confirmations",
                "Passport, visa and insurance reminders",
                "Departure checklist and last-minute tasks",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link
                to="/plan"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-base font-semibold hover:bg-primary-hover transition-colors"
              >
                Create a trip workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
