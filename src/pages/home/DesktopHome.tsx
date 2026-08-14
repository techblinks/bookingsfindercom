import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";
import { buttonVariants, ctaPrimary, ctaSecondary } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plane, Building2, Compass, MapPin, ArrowRight, Search, ClipboardCheck, ExternalLink, Shield, HeartHandshake, Library, Calculator, Ticket } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import { SectionContainer } from "@/components/home-v2/SectionContainer";
import { SectionHeading } from "@/components/home-v2/SectionHeading";
import { logInternalNavigation } from "@/lib/analytics";
import DesktopRecentActivitySection from "./DesktopRecentActivitySection";

const safeTrack = (label: string, href: string) => {
  try { logInternalNavigation({ label, source: "homepage", href }); } catch (_) {}
};

/** Category entry points. Every one is a real route that already exists. */
const TRAVEL_CATEGORIES = [
  { label: "Flights", href: "/flights", icon: Plane, analyticsLabel: "category_flights" },
  { label: "Stays", href: "/hotels", icon: Building2, analyticsLabel: "category_stays" },
  { label: "Things to do", href: "/things-to-do", icon: Ticket, analyticsLabel: "category_things" },
];

const PRODUCT_CARDS = [
  { title: "Compare flights", desc: "Search and compare available flight options from participating travel providers.", href: "/flights", icon: Plane },
  { title: "Find stays", desc: "Browse hotel options and compare accommodation for your trip.", href: "/hotels", icon: Building2 },
  { title: "Estimate trip costs", desc: "Plan your budget with our interactive trip cost planner.", href: "/trip-cost", icon: Compass },
  { title: "Optimize your itinerary", desc: "Plan multi-city routes and find the most efficient travel path.", href: "/optimizer", icon: MapPin },
  { title: "Discover things to do", desc: "Explore attractions, museums, tours and experiences for your trip.", href: "/things-to-do", icon: Ticket },
];

const HOW_IT_WORKS_STEPS = [
  { step: 1, title: "Search and compare", desc: "Search available travel options using BookingsFinder's supported tools and partners.", icon: Search },
  { step: 2, title: "Plan the full trip", desc: "Estimate trip costs, organise travel details and refine your itinerary.", icon: ClipboardCheck },
  { step: 3, title: "Continue with the provider", desc: "Review current prices, availability and booking terms on the provider's website.", icon: ExternalLink },
];

import { TRUST_ITEMS } from "@/components/shared/TrustContent";

const DesktopHome = () => (
  <>
    <Helmet>
      <title>BookingsFinder - Compare Flights and Plan Your Trip</title>
      <meta name="description" content="Compare flights, find stays, estimate trip costs and use practical travel-planning tools with BookingsFinder." />
      <meta property="og:title" content="BookingsFinder - Compare Flights and Plan Your Trip" />
      <meta property="og:description" content="Compare flights, find stays, estimate trip costs and use practical travel-planning tools with BookingsFinder." />
      <meta property="og:type" content="website" />
      <link rel="canonical" href="https://bookingsfinder.com" />
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org", "@type": "WebSite", "name": "BookingsFinder",
        "url": "https://bookingsfinder.com",
        "description": "Compare flights, find stays, estimate trip costs and use practical travel-planning tools with BookingsFinder.",
        "potentialAction": { "@type": "SearchAction", "target": { "@type": "EntryPoint", "urlTemplate": "https://bookingsfinder.com/flights?origin={origin}&destination={destination}" }, "query-input": "required name=origin,destination" }
      })}</script>
    </Helmet>

    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      <main id="main-content" className="flex-1">
        {/*
          * Product band — the first viewport IS the product.
          *
          * Positioning, category entry points and the real flight search share
          * one navy surface, so a visitor can operate the search on arrival.
          * The previous composition put a 576px marketing hero above a separate
          * search section, which pushed the Search flights CTA to y≈996 — below
          * the fold at every desktop width. The decorative collage and the two
          * hero CTAs (whose only job was to scroll down to the search) are gone
          * with it.
          *
          * Keeps id="flight-search" so the existing lower-page anchors still land here.
          */}
        <section id="flight-search" className="relative overflow-hidden bg-[#001D45]" aria-labelledby="hero-heading">
          <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true">
            <svg width="100%" height="100%" viewBox="0 0 1440 700" preserveAspectRatio="none"><path d="M-100,400 Q200,200 500,380 T1440,200" fill="none" stroke="white" strokeWidth="1.5"/><path d="M-100,500 Q400,700 800,350 T1440,450" fill="none" stroke="white" strokeWidth="1" opacity="0.5"/><circle cx="300" cy="380" r="4" fill="white" opacity="0.3"/><circle cx="900" cy="300" r="5" fill="white" opacity="0.2"/></svg>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 pt-9 pb-8 lg:pt-11 lg:pb-10">
            <h1
              id="hero-heading"
              className="text-[26px] leading-[32px] sm:text-[30px] sm:leading-[36px] lg:text-[34px] lg:leading-[42px] font-extrabold tracking-tight text-white"
            >
              Plan the whole trip, not just the flight.
            </h1>
            <p className="mt-2.5 max-w-2xl text-[15px] leading-[22px] lg:text-base lg:leading-[24px] text-white/70">
              Compare flights, stays and things to do — then estimate what the trip may cost.
            </p>

            {/* Real product destinations, not tabs that pretend to swap the form */}
            <nav aria-label="Travel categories" className="mt-5 flex flex-wrap items-center gap-2">
              {TRAVEL_CATEGORIES.map(category => {
                const isCurrent = category.href === "/flights";
                return (
                  <Link
                    key={category.label}
                    to={category.href}
                    aria-current={isCurrent ? "page" : undefined}
                    onClick={() => safeTrack(category.analyticsLabel, category.href)}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
                      isCurrent
                        ? "bg-white text-[#001D45] shadow-sm"
                        : "bg-white/[0.08] text-white/85 hover:bg-white/[0.16] hover:text-white",
                    )}
                  >
                    <category.icon className="h-4 w-4" aria-hidden="true" />
                    {category.label}
                  </Link>
                );
              })}
            </nav>

            {/* The search sits directly on the band — its own shell is the card */}
            <div className="mt-4">
              <ModernFlightSearch onDark />
            </div>

            {/*
              * No trust line is repeated here. The existing trust strip sits
              * immediately below this band and is inside the first viewport at
              * every tested width, so it already is the one concise line near
              * the search — duplicating its wording would create a second
              * source of the same truth. D4 owns restyling that strip.
              */}
          </div>
        </section>

        {/* Trust Strip */}
        <div className="bg-white border-b border-[#D8E0E7]" aria-label="Why use BookingsFinder">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm font-semibold text-[#41536A]">
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#01367F" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Compare travel options</span>
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#01367F" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>No booking fee from BookingsFinder</span>
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#01367F" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Continue with the selected provider</span>
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#01367F" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Useful planning tools in one place</span>
            </div>
          </div>
        </div>

        {/* Pick up where you left off — renders itself only when there is genuine recent activity */}
        <DesktopRecentActivitySection />

        {/* Product Cards */}
        <section className="py-16 sm:py-20 bg-white" aria-labelledby="products-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="products-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#0F172A] text-center">Everything you need to plan your trip</h2>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PRODUCT_CARDS.map(card => (
                <Link key={card.title} to={card.href} onClick={() => safeTrack(card.title, card.href)} className="group flex flex-col p-6 rounded-2xl border border-[#D8E0E7] hover:border-[#01367F]/40 hover:shadow-lg hover:shadow-[#01367F]/5 transition-all bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01367F]">
                  <div className="w-11 h-11 rounded-xl bg-[#EDF4FC] flex items-center justify-center mb-4 group-hover:bg-[#01367F]/10 transition-colors">
                    <card.icon className="w-5 h-5 text-[#01367F]" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A] mb-2">{card.title}</h3>
                  <p className="text-sm text-[#41536A] leading-relaxed flex-1">{card.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#01367F] group-hover:gap-2.5 transition-all">Learn more <ArrowRight className="w-4 h-4" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* SECTION 1: How BookingsFinder Works */}
        <SectionContainer className="bg-[#EDF4FC]" aria-labelledby="how-works-heading">
          <SectionHeading
            headline="How BookingsFinder works"
            supporting="Search, plan and continue to trusted travel providers from one place."
          />
          <div className="max-w-5xl mx-auto mt-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {HOW_IT_WORKS_STEPS.map((step) => (
                <div key={step.step} className="flex flex-col items-center text-center p-6">
                  <div className="w-14 h-14 rounded-2xl bg-[#01367F]/10 flex items-center justify-center mb-5" aria-hidden="true">
                    <step.icon className="w-7 h-7 text-[#01367F]" />
                  </div>
                  <div className="text-xs font-bold text-[#01367F] uppercase tracking-[0.1em] mb-2">Step {step.step}</div>
                  <h3 className="text-lg font-bold text-[#0F172A] mb-2">{step.title}</h3>
                  <p className="text-sm text-[#41536A] leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </SectionContainer>

        {/* SECTION 2: Trust and Transparency */}
        <SectionContainer className="bg-white" aria-labelledby="trust-heading">
          <SectionHeading
            headline="Trust and transparency"
            supporting="We believe you should know how BookingsFinder works and how we support our service."
          />
          <div className="max-w-3xl mx-auto">
            <div className="space-y-4">
              {TRUST_ITEMS.map((item, i) => (
                <div key={i} className="flex items-start gap-4 p-4 rounded-xl bg-[#EDF4FC] border border-[#D8E0E7]">
                  <div className="w-9 h-9 rounded-lg bg-[#01367F]/10 flex items-center justify-center shrink-0 mt-0.5" aria-hidden="true">
                    <item.icon className="w-4.5 h-4.5 text-[#01367F]" />
                  </div>
                  <p className="text-sm text-[#41536A] leading-relaxed pt-1">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap justify-center gap-3 mt-8">
              <Link to="/affiliate-disclosure" className="text-sm text-[#01367F] underline underline-offset-2 hover:text-[#012B66] transition-colors font-medium">
                Affiliate disclosure
              </Link>
              <span className="text-[#D8E0E7] hidden sm:inline">·</span>
              <Link to="/privacy" className="text-sm text-[#01367F] underline underline-offset-2 hover:text-[#012B66] transition-colors font-medium">
                Privacy policy
              </Link>
              <span className="text-[#D8E0E7] hidden sm:inline">·</span>
              <Link to="/terms" className="text-sm text-[#01367F] underline underline-offset-2 hover:text-[#012B66] transition-colors font-medium">
                Terms of service
              </Link>
            </div>

            <p className="text-xs text-[#41536A] text-center max-w-xl mx-auto mt-6 leading-relaxed">
              Travel requirements can change. Always confirm critical information with the relevant government, airline or provider before travelling.
            </p>
          </div>
        </SectionContainer>

        {/* SECTION 3: Final CTA */}
        <section className="bg-[#001D45] py-14 sm:py-16" aria-labelledby="cta-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 id="cta-heading" className="text-2xl sm:text-3xl font-bold text-white mb-3">Ready to start planning?</h2>
            <p className="text-[#718096] text-base max-w-xl mx-auto mb-8">Search available flights or estimate the full cost of your next trip.</p>
            <div className="flex flex-wrap justify-center gap-4 items-center">
              <a
                href="#flight-search"
                onClick={() => safeTrack("cta_search_flights", "#flight-search")}
                className={ctaPrimary}
              >
                <Plane className="w-[18px] h-[18px]" />
                Search flights
              </a>
              <Link
                to="/trip-cost"
                onClick={() => safeTrack("cta_plan_costs", "/trip-cost")}
                className={ctaSecondary}
              >
                <Calculator className="w-[18px] h-[18px]" />
                Plan trip costs
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  </>
);

export default DesktopHome;
