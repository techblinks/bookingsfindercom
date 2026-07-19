import { Link } from "react-router-dom";
import { SectionContainer } from "./SectionContainer";
import { SectionHeading } from "./SectionHeading";
import { trustPrinciples } from "./homeV2Config";

export function TrustTransparency() {
  return (
    <SectionContainer className="bg-background">
      <SectionHeading
        headline="Clear information. Honest recommendations."
        supporting="We show what is available, what is still being built and when a partner may pay us a commission."
      />

      <div className="max-w-3xl mx-auto space-y-5">
        {/* Trust principles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trustPrinciples.map((principle) => (
            <div key={principle.title} className="p-5 rounded-xl bg-card border border-border">
              <h3 className="text-sm font-semibold text-foreground mb-1.5">{principle.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{principle.description}</p>
            </div>
          ))}
        </div>

        {/* Important links */}
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Link to="/affiliate-disclosure" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
            Affiliate disclosure
          </Link>
          <span className="text-border hidden sm:inline">·</span>
          <Link to="/privacy" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
            Privacy policy
          </Link>
          <span className="text-border hidden sm:inline">·</span>
          <Link to="/terms" className="text-sm text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors">
            Terms of service
          </Link>
        </div>

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center max-w-lg mx-auto pt-2">
          Travel requirements can change. Always confirm critical information with the relevant government, airline or provider before travelling.
        </p>
      </div>
    </SectionContainer>
  );
}
