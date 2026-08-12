import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Plane, Building2, Ticket, Search, ShieldCheck } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useTrip } from "@/context/TripContext";
import { TripRibbon } from "@/components/trip/TripRibbon";
import { logInternalNavigation } from "@/lib/analytics";
import { formatDateRangeDisplay, formatTravellers } from "@/lib/displayFormatters";
import { TRUST_LINE_ITEMS } from "@/components/shared/TrustContent";

const safeTrack = (label: string, href: string) => {
  try { logInternalNavigation({ label, source: "homepage-mobile", href }); } catch (_) {}
};

/**
 * Mobile V2 — Phase 1.
 *
 * Value proposition, one compact trust line, the destination search and three
 * travel actions all inside the first viewport. Trip Cost gets its own
 * product-value section in Phase 2, so it is not a quick action here.
 */
const QUICK_ACTIONS = [
  { label: "Flights", href: "/flights", icon: Plane },
  { label: "Stays", href: "/hotels", icon: Building2 },
  { label: "Things", href: "/things-to-do", icon: Ticket },
];

const HOW_IT_WORKS = [
  "Search across providers",
  "Compare openly",
  "Book with the provider",
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

      <div className="min-h-screen flex flex-col bg-background">
        <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 focus:bg-[#001D45] focus:text-white focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-[#01367F] focus:ring-offset-2 focus:outline-none focus:text-sm focus:font-medium">Skip to main content</a>

        <Header />

        <main id="main-content" className="flex-1 px-4 pt-4">
          <TripRibbon />

          {/* Hero — value proposition */}
          <section aria-labelledby="mobile-hero-heading">
            <h1 id="mobile-hero-heading" className="text-[24px] leading-[30px] font-bold tracking-tight text-foreground">
              Plan the whole trip,<br />not just the flight.
            </h1>
            <p className="mt-3 text-[15px] leading-[22px] text-[hsl(var(--text-secondary))]">
              Compare flights, stays and things to do in one place, and see what the whole trip is likely to cost.
            </p>

            {/* Compact trust line */}
            <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[12px] leading-[16px] text-[hsl(var(--text-secondary))]">
              <ShieldCheck className="h-[14px] w-[14px] shrink-0 text-primary" aria-hidden="true" />
              {TRUST_LINE_ITEMS.map((item, i) => (
                <span key={item} className="whitespace-nowrap">
                  {item}
                  {i < TRUST_LINE_ITEMS.length - 1 && (
                    <span aria-hidden="true" className="ml-1.5 text-border">·</span>
                  )}
                </span>
              ))}
            </p>
          </section>

          {/* Destination search */}
          <section className="mt-6" aria-labelledby="mobile-search-heading">
            <h2 id="mobile-search-heading" className="text-[13px] leading-[18px] font-semibold text-foreground">
              Where are you going?
            </h2>
            <Link
              to="/flights"
              onClick={() => safeTrack("search_destination", "/flights")}
              className="mt-2 flex h-[56px] w-full items-center gap-3 rounded-[14px] border border-strong bg-card px-4 text-left shadow-sm motion-safe:transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <Search className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="text-[15px] leading-[22px] text-muted-foreground">Search a city or destination</span>
            </Link>
            <p className="mt-2 text-[13px] leading-[18px] text-[hsl(var(--text-secondary))]">
              Pick a destination to start planning your trip.
            </p>
          </section>

          {/* Quick travel actions */}
          <section className="mt-6" aria-labelledby="mobile-actions-heading">
            <h2 id="mobile-actions-heading" className="sr-only">Start with</h2>
            <ul className="grid grid-cols-3 gap-2">
              {QUICK_ACTIONS.map(action => (
                <li key={action.label}>
                  <Link
                    to={action.href}
                    onClick={() => safeTrack(action.label, action.href)}
                    className="flex min-h-[48px] flex-col items-center justify-center gap-1 rounded-[12px] bg-primary/[0.07] px-2 py-2 text-[13px] leading-[18px] font-semibold text-primary motion-safe:transition-colors hover:bg-primary/[0.12] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <action.icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    {action.label}
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Continue planning — only when trip context exists */}
          {hasTrip && (
            <section className="mt-8 p-4 trip-rule" aria-labelledby="trip-context-heading">
              <h2 id="trip-context-heading" className="text-[12px] leading-[16px] font-semibold uppercase tracking-wide text-primary">Continue planning</h2>
              <div className="mt-2 space-y-1">
                {trip.destination?.name && (
                  <p className="text-[15px] leading-[22px] font-semibold text-foreground">{trip.destination.name}</p>
                )}
                {(trip.dates?.departureDate || trip.travellers) && (
                  <p className="text-[13px] leading-[18px] text-[hsl(var(--text-secondary))]">
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
            </section>
          )}

          {/* How it works — compact 3 steps */}
          <section className="mt-8" aria-labelledby="how-it-works-heading">
            <h2 id="how-it-works-heading" className="text-[18px] leading-[24px] font-bold text-foreground">
              How it works
            </h2>
            <ol className="mt-3 space-y-2">
              {HOW_IT_WORKS.map((step, i) => (
                <li key={step} className="flex items-center gap-3">
                  <span
                    aria-hidden="true"
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground"
                  >
                    {i + 1}
                  </span>
                  <span className="text-[15px] leading-[22px] text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
}
