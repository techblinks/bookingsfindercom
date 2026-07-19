import { Link } from "react-router-dom";
import { ArrowRight, Plane } from "lucide-react";
import { SectionContainer } from "./SectionContainer";
import { SectionHeading } from "./SectionHeading";

export function FlightHandoff() {
  return (
    <SectionContainer className="bg-background">
      <SectionHeading
        headline="Ready to compare flights?"
        supporting="Search available partner offers, then return to BookingsFinder to organise the rest of your trip."
      />

      <div className="max-w-xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-5 py-3 bg-card rounded-2xl border border-border shadow-card mb-5">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Plane className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-foreground">Flight comparison</p>
            <p className="text-xs text-muted-foreground">Search and compare across partner airlines</p>
          </div>
        </div>

        <Link
          to="/flights"
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-base font-semibold hover:bg-primary-hover transition-colors"
        >
          Search flights
          <ArrowRight className="h-4 w-4" />
        </Link>

        <p className="mt-4 text-sm text-muted-foreground max-w-md mx-auto">
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
