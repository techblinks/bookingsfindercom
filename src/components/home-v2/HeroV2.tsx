import { Link } from "react-router-dom";
import { ArrowRight, Compass } from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import worldMapPattern from "@/assets/world-map-pattern.png";

export function HeroV2() {
  const prefersReducedMotion = useReducedMotion();

  return (
    <section className="relative bg-primary-gradient py-12 md:py-24 overflow-hidden [&_*:focus-visible]:!ring-white/70 [&_*:focus-visible]:!ring-offset-0">
      {/* World map pattern overlay — subtle depth */}
      <div
        className="absolute inset-0 bg-cover bg-center opacity-[0.08] pointer-events-none"
        style={{ backgroundImage: `url(${worldMapPattern})` }}
        aria-hidden="true"
      />
      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/10" aria-hidden="true" />

      <div className="container max-w-6xl mx-auto px-4 relative">
        <div className="max-w-2xl">
          {/* Label */}
          <div className="flex items-center gap-2 mb-6">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary-foreground/10 text-primary-foreground/80 text-sm font-medium border border-primary-foreground/15">
              <Compass className="h-3.5 w-3.5" />
              Travel planning platform
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4 tracking-tight leading-tight text-balance">
            Everything you need to be ready for your next trip.
          </h1>

          {/* Supporting copy */}
          <p className="text-base md:text-lg text-primary-foreground/75 mb-8 max-w-xl leading-relaxed">
            Plan your journey, understand the real cost, check what you need, and
            keep every booking and deadline in one place.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              asChild
              size="lg"
              className={cn(
                "h-12 px-8 text-base font-semibold rounded-xl",
                "bg-accent hover:bg-accent/90 text-accent-foreground",
                "shadow-lg shadow-accent/25"
              )}
            >
              <Link to="/plan">
                Plan a trip
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className={cn(
                "h-12 px-8 text-base font-medium rounded-xl",
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
          <p className="mt-6 text-sm text-primary-foreground/60 max-w-md">
            We earn commission from our travel partners at no extra cost to you.{" "}
            <Link to="/affiliate-disclosure" className="underline underline-offset-2 hover:text-primary-foreground/80">
              Learn more
            </Link>
          </p>
        </div>

        {/* Decorative visual — subtle trip timeline illustration */}
        {!prefersReducedMotion && (
          <div
            className="hidden lg:block absolute right-0 top-1/2 -translate-y-1/2 w-72 opacity-30"
            aria-hidden="true"
          >
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />
                  <div className="h-0.5 bg-primary-foreground/20 rounded flex-1" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
