import { Link } from "react-router-dom";
import { ArrowRight, Plane, CheckCircle } from "lucide-react";
import { SectionContainer } from "./SectionContainer";
import { SectionHeading } from "./SectionHeading";

export function FlightHandoff() {
  return (
    <SectionContainer className="bg-background">
      <SectionHeading
        headline="Ready to compare flights?"
        supporting="Search available partner offers, then return to BookingsFinder to organise the rest of your trip."
      />

      <div className="max-w-2xl mx-auto text-center">
        {/* Feature card with available badge */}
        <div className="relative inline-flex items-center gap-3 px-6 py-4 bg-card rounded-2xl border border-border shadow-card mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plane className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-base font-semibold text-foreground">Flight comparison</p>
            <p className="text-sm text-muted-foreground">Search and compare across partner airlines</p>
          </div>
          {/* Available now badge */}
          <span className="absolute -top-2.5 -right-2.5 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-success/10 text-success border border-success/20">
            <CheckCircle className="h-3 w-3" />
            Available now
          </span>
        </div>

        <Link
          to="/flights"
          className="inline-flex items-center gap-2 px-12 py-4.5 bg-primary text-primary-foreground rounded-xl text-lg font-semibold hover:bg-primary-hover transition-colors shadow-md shadow-primary/15"
        >
          Search flights
          <ArrowRight className="h-5 w-5" />
        </Link>

        <p className="mt-5 text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
          We connect you to our travel partners to complete your booking.{" "}
          <Link to="/affiliate-disclosure" className="underline underline-offset-2 hover:text-foreground">
            We earn a commission
          </Link>{" "}
          from partners at no extra cost to you. Checkout occurs with the selected provider.
        </p>
      </div>
    </SectionContainer>
  );
}
