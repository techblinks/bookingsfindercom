import { Link } from "react-router-dom";
import { ArrowRight, Shield, FileCheck, Plane, Heart, CalendarCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const previewChecks = [
  { icon: Shield, label: "Passport", status: "valid" as const, detail: "Valid until Feb 2027 — 8 months beyond return" },
  { icon: FileCheck, label: "Visa and entry", status: "pending" as const, detail: "Visa on arrival available — bring USD $35 cash" },
  { icon: Plane, label: "Bookings", status: "done" as const, detail: "Flight and hotel confirmed — 2 items" },
  { icon: Heart, label: "Travel insurance", status: "pending" as const, detail: "Not yet arranged — compare options now" },
  { icon: CalendarCheck, label: "Departure tasks", status: "pending" as const, detail: "Check-in Aug 12, 2pm — pack adapter Type C/F" },
];

function StatusIcon({ status }: { status: "valid" | "done" | "pending" }) {
  if (status === "valid" || status === "done") {
    return (
      <div className="w-5 h-5 rounded-full bg-success/20 flex items-center justify-center shrink-0">
        <svg className="w-3 h-3 text-success" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-5 h-5 rounded-full bg-warning/20 flex items-center justify-center shrink-0">
      <span className="text-[10px] text-warning font-bold">!</span>
    </div>
  );
}

export function ReadinessPreview() {
  return (
    <section className="py-16 md:py-22 bg-muted/50">
      <div className="container max-w-7xl mx-auto px-4">
        <div className="grid lg:grid-cols-[5fr_7fr] gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight leading-tight text-balance">
              Never board a flight wondering if you forgot something.
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground leading-relaxed">
              BookingsFinder checks your passport, visas, bookings, and deadlines — then tells you exactly what to do and when.
            </p>
            <div className="mt-6 space-y-3">
              {[
                "Passport validity and visa requirements",
                "Booking confirmations for flights and hotels",
                "Insurance status and departure checklist",
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Preview card */}
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-3">
              Example trip — Sydney to Bali
            </p>
            <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <div className="flex items-baseline gap-3">
                  <p className="text-3xl font-bold text-foreground tabular-nums">
                    65<span className="text-xl text-muted-foreground">%</span>
                  </p>
                  <p className="text-sm text-muted-foreground">travel ready — 3 items need attention</p>
                </div>
                <div className="mt-3 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-warning rounded-full" style={{ width: "65%" }} />
                </div>
              </div>

              <div className="px-5 py-3 space-y-1">
                {previewChecks.map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className={cn(
                      "flex items-start gap-3 py-2.5 px-2 -mx-2 rounded-lg",
                      (item.status === "valid" || item.status === "done") && "opacity-80"
                    )}>
                      <StatusIcon status={item.status} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="text-sm font-medium text-foreground">{item.label}</p>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{item.detail}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="px-5 py-3 border-t border-border bg-muted/30">
                <p className="text-xs text-muted-foreground mb-3">
                  This is a preview example. We don't replace official sources — we help you find them.
                </p>
                <Button asChild variant="outline" size="sm" className="w-full h-10 text-sm font-medium rounded-lg">
                  <Link to="/plan">
                    See how it works for your trip
                    <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
