import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Plane, Building2, Ticket, Search, Calculator } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useTrip } from "@/context/TripContext";
import { TripRibbon } from "@/components/trip/TripRibbon";
import { logInternalNavigation } from "@/lib/analytics";
import { formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";
import { TRUST_ITEMS, TRUST_LEGAL_LINKS } from "@/components/shared/TrustContent";

const safeTrack = (label: string, href: string) => {
  try { logInternalNavigation({ label, source: "homepage-mobile", href }); } catch (_) {}
};

const QUICK_ACTIONS = [
  { label: "Flights", href: "/flights", icon: Plane },
  { label: "Stays", href: "/hotels", icon: Building2 },
  { label: "Things", href: "/things-to-do", icon: Ticket },
  { label: "Trip Cost", href: "/trip-cost", icon: Calculator },
];

export default function MobileHome() {
  const { trip, hasTrip } = useTrip();

  return (
    <>
      <Helmet>
        <title>BookingsFinder - Compare Flights and Plan Your Trip</title>
        <meta name="description" content="Compare flights, find stays, estimate trip costs and use practical travel-planning tools with BookingsFinder." />
        <meta property="og:title" content="BookingsFinder - Compare Flights and Plan Your Trip" />
        <meta property="og:description" content="Compare flights, find stays, estimate trip costs and use practical travel-planning tools with BookingsFinder." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://bookingsfinder.com" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background pb-16">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 focus:bg-[#001D45] focus:text-white focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-[#01367F] focus:ring-offset-2 focus:outline-none focus:text-sm focus:font-medium">Skip to main content</a>

        <Header />

        <main id="main-content" className="flex-1 px-4 pt-4">
          {/* Trip Ribbon */}
          <TripRibbon />

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Bookings Finder</h1>
            <p className="text-sm text-muted-foreground">Where are you going?</p>
          </div>

          {/* Destination Search CTA */}
          <Link
            to="/flights"
            onClick={() => safeTrack("search_destination", "/flights")}
            className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl bg-card border border-border shadow-sm text-left mb-6 hover:border-primary/20 hover:shadow-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Search className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground text-sm">Search a city or destination</span>
          </Link>

          {/* Trip Context (if exists) — V0: Trip Rule + friendly dates */}
          {hasTrip && (
            <section className="mb-6 p-4 trip-rule" aria-labelledby="trip-context-heading">
              <h2 id="trip-context-heading" className="text-xs font-semibold text-primary uppercase tracking-wide mb-3">Continue planning</h2>
              <div className="space-y-1 mb-4">
                {trip.destination?.name && (
                  <p className="text-base font-semibold text-foreground">{trip.destination.name}</p>
                )}
                {(trip.dates?.departureDate || trip.travellers) && (
                  <p className="text-sm text-muted-foreground">
                    {trip.dates?.departureDate && (
                      <span>{formatDateRangeDisplay(trip.dates.departureDate, trip.dates.returnDate)}</span>
                    )}
                    {trip.travellers && (
                      <span>
                        {trip.dates?.departureDate ? " · " : ""}
                        {formatTravellers(trip.travellers.adults, trip.travellers.children, trip.travellers.infants)}
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {QUICK_ACTIONS.map(action => (
                  <Link
                    key={action.label}
                    to={action.href}
                    onClick={() => safeTrack(action.label, action.href)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-background border border-border hover:border-primary/30 transition-colors text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <action.icon className="w-4 h-4 text-primary" aria-hidden="true" />
                    {action.label}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Quick Product Launcher — V0: only when NO trip (avoids duplication) */}
          {!hasTrip && (
            <section className="mb-6" aria-labelledby="plan-heading">
              <h2 id="plan-heading" className="text-sm font-semibold text-foreground mb-3">Plan your trip</h2>
              <div className="grid grid-cols-2 gap-3">
                {QUICK_ACTIONS.map(action => (
                  <Link
                    key={action.label}
                    to={action.href}
                    onClick={() => safeTrack(action.label, action.href)}
                    className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-card border border-border shadow-sm hover:border-primary/20 hover:shadow-md transition-all min-h-[88px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <action.icon className="w-5 h-5 text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-xs font-semibold text-foreground text-center leading-tight">{action.label}</span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Trust / How it works — V0: shared trust content */}
          <section className="mb-8" aria-labelledby="trust-mobile-heading">
            <h2 id="trust-mobile-heading" className="text-sm font-semibold text-foreground mb-3">How Bookings Finder works</h2>
            <div className="space-y-2">
              {TRUST_ITEMS.map((item, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-card border border-border/50">
                  <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <item.icon className="w-3.5 h-3.5 text-primary" aria-hidden="true" />
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed pt-0.5">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-4">
              {TRUST_LEGAL_LINKS.map(link => (
                <Link key={link.href} to={link.href} className="text-xs text-primary underline underline-offset-2">
                  {link.label}
                </Link>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
