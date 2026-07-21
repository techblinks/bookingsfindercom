import { Link } from "react-router-dom";
import { ArrowRight, Compass, Plane, MapPin, Calendar } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import worldMapPattern from "@/assets/world-map-pattern.png";

export function HeroV2() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative bg-primary-gradient pt-16 md:pt-24 pb-16 md:pb-24 overflow-hidden [&_*:focus-visible]:!ring-white/70 [&_*:focus-visible]:!ring-offset-0">
      {/* World map pattern overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.06] pointer-events-none"
        style={{ backgroundImage: `url(${worldMapPattern})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" aria-hidden="true" />

      <div className="container max-w-7xl mx-auto px-4 relative">
        <div className="max-w-3xl lg:max-w-[55%]">
          {/* Label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary-foreground/10 text-primary-foreground/80 text-sm font-medium border border-primary-foreground/15">
              <Compass className="h-4 w-4" />
              Travel planning platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-5 tracking-tight leading-[1.1] text-balance">
            Everything you need to be ready for your next trip.
          </h1>

          {/* Supporting copy */}
          <p className="text-base sm:text-lg lg:text-xl text-primary-foreground/75 mb-8 max-w-xl leading-relaxed">
            Plan your journey, understand the real cost, check what you need, and
            keep every booking and deadline in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mb-8">
            <Button
              asChild
              size="lg"
              className={cn(
                "h-13 px-10 text-base font-semibold rounded-xl",
                "bg-accent hover:bg-accent/90 text-accent-foreground",
                "shadow-lg shadow-accent/25"
              )}
            >
              <Link to="/plan">
                Plan a trip
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                "h-13 px-10 text-base font-medium rounded-xl",
                "bg-primary-foreground/10 hover:bg-primary-foreground/15",
                "text-primary-foreground border-primary-foreground/20",
                "hover:border-primary-foreground/30"
              )}
            >
              <Link to="/plan?import=true">
                I already booked
              </Link>
            </Button>
          </div>

          {/* Trust line */}
          <p className="text-sm text-primary-foreground/55 max-w-md">
            We earn commission from our travel partners at no extra cost to you.{" "}
            <Link to="/affiliate-disclosure" className="underline underline-offset-2 hover:text-primary-foreground/80">
              Learn more
            </Link>
          </p>
        </div>

        {/* Decorative product illustration — right side */}
        {!prefersReducedMotion && (
          <div className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-[400px]" aria-hidden="true">
            <div className="bg-primary-foreground/5 rounded-3xl border border-primary-foreground/10 p-8 space-y-4">
              {[
                { icon: MapPin, label: "Choose destination", active: true },
                { icon: Calendar, label: "Set your dates", active: false },
                { icon: Plane, label: "Compare flights", active: false },
              ].map((step, i) => (
                <div key={step.label} className={cn(
                  "flex items-center gap-4 px-4 py-3 rounded-xl transition-all",
                  step.active ? "bg-primary-foreground/10" : "bg-primary-foreground/5"
                )}>
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    step.active ? "bg-accent/80" : "bg-primary-foreground/12"
                  )}>
                    <step.icon className={cn("h-5 w-5", step.active ? "text-white" : "text-primary-foreground/70")} />
                  </div>
                  <div className="flex-1">
                    <p className={cn("text-sm font-semibold", step.active ? "text-primary-foreground" : "text-primary-foreground/65")}>
                      {step.label}
                    </p>
                    {step.active && (
                      <p className="text-xs text-primary-foreground/60">Plan, prepare, and travel ready</p>
                    )}
                  </div>
                  {i < 2 && <div className="ml-auto h-8 w-px bg-primary-foreground/15" />}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
