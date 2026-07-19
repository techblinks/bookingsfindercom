import { Link } from "react-router-dom";
import { ArrowRight, Calendar } from "lucide-react";
import { SectionContainer } from "./SectionContainer";
import { SectionHeading } from "./SectionHeading";
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
    <SectionContainer className="bg-muted/50">
      <SectionHeading
        headline="Every booking, document and deadline in one place."
        supporting="Keep flights, accommodation, documents, tasks and departure information organised around your trip."
      />

      <div className="max-w-lg mx-auto">
        {/* Preview label */}
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide text-center mb-4">
          Example workspace
        </p>

        {/* Workspace card */}
        <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          {/* Trip header */}
          <div className="px-5 py-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Calendar className="h-5 w-5 text-accent" aria-hidden="true" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Sydney to Bali</p>
                <p className="text-xs text-muted-foreground">
                  Aug 15 – Aug 22, 2026 · Example countdown: 12 days
                </p>
              </div>
            </div>
            {/* Progress bar */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                <div className="h-full bg-success rounded-full" style={{ width: "43%" }} />
              </div>
              <span className="text-xs font-medium text-muted-foreground tabular-nums">3/7</span>
            </div>
          </div>

          {/* Timeline items */}
          <ul className="divide-y divide-border" aria-label="Example trip workspace timeline">
            {exampleWorkspaceItems.map((item) => {
              const Icon = workspaceIconMap[item.icon];
              return (
                <li key={item.label} className="px-5 py-3 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />}
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

          {/* Disclaimer */}
          <div className="px-5 py-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              This is a preview example. Trip workspaces are coming soon.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-6 text-center">
          <Link
            to="/plan"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:bg-primary-hover transition-colors"
          >
            Create a trip workspace
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </SectionContainer>
  );
}
