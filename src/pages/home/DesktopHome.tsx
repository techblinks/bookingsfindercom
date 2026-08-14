import { Helmet } from "react-helmet-async";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Plane, Building2, ArrowRight, Search, ClipboardCheck, ExternalLink, Calculator, Route, Ticket } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import { logInternalNavigation } from "@/lib/analytics";
import { TRUST_ITEMS } from "@/components/shared/TrustContent";
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

/**
 * The two planning tools that have no entry point in the band above, and that
 * a visitor is least likely to know exist. They lead the lower page because
 * they are the part of BookingsFinder that is genuinely not a search box.
 *
 * Both descriptions are written from the shipped product, not from ambition.
 * The planner totals amounts the traveller enters — it has no live pricing, so
 * it can only ever "estimate". The optimizer analyses ONE route (cost
 * breakdown, timing, layover risk); it does not build multi-city itineraries,
 * which is what the previous "Plan multi-city routes and find the most
 * efficient travel path" card claimed.
 */
const PLANNING_TOOLS = [
  {
    title: "Estimate your trip cost",
    desc: "Add flights, stays, daily spending and everything else to build a full trip budget from the amounts you enter.",
    action: "Open the trip cost planner",
    href: "/trip-cost",
    icon: Calculator,
    analyticsLabel: "plan_trip_cost",
  },
  {
    title: "Check a route before you book",
    desc: "See a cost breakdown, timing advice and layover risks for a route you are considering.",
    action: "Open the optimizer",
    href: "/optimizer",
    icon: Route,
    analyticsLabel: "plan_optimizer",
  },
];

/**
 * The three search products. They already have pills in the band above, so
 * here they are one divided strip rather than three more cards — enough to
 * keep the internal links and their crawlable descriptions, not enough to
 * repeat the navigation as a feature grid.
 */
const PRODUCT_LINKS = [
  // Kept short enough to hold one line in a third of a tablet row — a wrap here
  // pushes the Flights title off the baseline its two neighbours sit on.
  { label: "Flights", desc: "Compare fares", href: "/flights", icon: Plane, analyticsLabel: "plan_flights" },
  { label: "Stays", desc: "Browse hotel options", href: "/hotels", icon: Building2, analyticsLabel: "plan_stays" },
  { label: "Things to do", desc: "Find tours and tickets", href: "/things-to-do", icon: Ticket, analyticsLabel: "plan_things" },
];

const HOW_IT_WORKS_STEPS = [
  { step: 1, title: "Search and compare", desc: "Search flights, stays and things to do from one place.", icon: Search },
  { step: 2, title: "Plan the full trip", desc: "Estimate what the trip may cost and organise the details.", icon: ClipboardCheck },
  { step: 3, title: "Continue with the provider", desc: "Check current prices and booking terms on the provider's site.", icon: ExternalLink },
];

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

        {/*
          * D4 — Plan the rest of your trip.
          *
          * Replaces the five-card "Everything you need to plan your trip" grid,
          * which put every capability in an identical box, dropped a fifth card
          * onto a lonely second row at lg, and re-advertised Flights/Stays/
          * Things that already have pills in the band above.
          *
          * The hierarchy now matches how much of this a visitor already knows:
          * the two planning tools nobody has seen lead, and the three search
          * products sit under them as one divided strip. Same five destinations,
          * three surfaces instead of five, and no orphan row at any width.
          *
          * Keeps id="products-heading" — the recent-activity ordering test and
          * any in-page reference still resolve.
          */}
        <section className="bg-white py-12 lg:py-14" aria-labelledby="products-heading">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
            <h2 id="products-heading" className="text-[24px] leading-[30px] lg:text-[28px] lg:leading-[34px] font-bold tracking-tight text-[#0F172A]">
              Plan the rest of your trip
            </h2>
            <p className="mt-2 max-w-2xl text-[15px] leading-[22px] text-[#41536A]">
              A flight is only one part of the trip. These tools help with everything around it.
            </p>

            <div className="mt-6 grid gap-4 lg:grid-cols-2">
              {PLANNING_TOOLS.map(tool => (
                <Link
                  key={tool.href}
                  to={tool.href}
                  onClick={() => safeTrack(tool.analyticsLabel, tool.href)}
                  className="group flex gap-4 rounded-2xl border border-[#D8E0E7] bg-white p-5 lg:p-6 motion-safe:transition-colors hover:border-[#01367F]/40 hover:bg-[#01367F]/[0.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01367F]"
                >
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#EDF4FC] motion-safe:transition-colors group-hover:bg-[#01367F]/10">
                    <tool.icon className="h-5 w-5 text-[#01367F]" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <h3 className="text-[17px] leading-[24px] font-bold text-[#0F172A]">{tool.title}</h3>
                    <p className="mt-1.5 text-[14px] leading-[21px] text-[#41536A]">{tool.desc}</p>
                    <span className="mt-2.5 inline-flex items-center gap-1.5 text-[14px] leading-[20px] font-semibold text-[#01367F]">
                      {tool.action}
                      <ArrowRight className="h-4 w-4 shrink-0 motion-safe:transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </span>
                </Link>
              ))}
            </div>

            {/* One strip, divided — not three more cards */}
            <ul className="mt-4 grid overflow-hidden rounded-2xl border border-[#D8E0E7] sm:grid-cols-3 sm:divide-x divide-y sm:divide-y-0 divide-[#D8E0E7]">
              {PRODUCT_LINKS.map(product => (
                <li key={product.href}>
                  <Link
                    to={product.href}
                    onClick={() => safeTrack(product.analyticsLabel, product.href)}
                    className="group flex h-full items-center gap-3 px-5 py-4 motion-safe:transition-colors hover:bg-[#EDF4FC]/60 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#01367F]"
                  >
                    <product.icon className="h-[18px] w-[18px] shrink-0 text-[#01367F]" aria-hidden="true" />
                    <span className="min-w-0">
                      <span className="block text-[15px] leading-[21px] font-semibold text-[#0F172A]">{product.label}</span>
                      <span className="block text-[13px] leading-[18px] text-[#41536A]">{product.desc}</span>
                    </span>
                    <ArrowRight className="ml-auto h-4 w-4 shrink-0 text-[#8FA3BC] motion-safe:transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/*
          * D4 — How it works, and why you can trust it. One band, two sections.
          *
          * These were two full-height SectionContainers (py-14 md:py-20 each,
          * with 40-56px heading gaps) carrying about six sentences between
          * them. Three centred step columns and five individually-boxed trust
          * paragraphs cost roughly 900px to say something supporting. They are
          * now one tinted band: steps read horizontally, and every one of the
          * five approved trust statements is preserved verbatim — compressed,
          * not edited, so no disclosure is weakened.
          */}
        <div className="border-y border-[#D8E0E7] bg-[#F5F9FD]">
          <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 py-12 lg:py-14">
            <section aria-labelledby="how-works-heading">
              <h2 id="how-works-heading" className="text-[20px] leading-[26px] font-bold tracking-tight text-[#0F172A]">
                How BookingsFinder works
              </h2>

              <ol className="mt-5 grid gap-x-8 gap-y-5 md:grid-cols-3">
                {HOW_IT_WORKS_STEPS.map(step => (
                  <li key={step.step} className="flex gap-3.5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#01367F]/[0.08]">
                      <step.icon className="h-[18px] w-[18px] text-[#01367F]" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <h3 className="text-[15px] leading-[21px] font-bold text-[#0F172A]">
                        <span className="text-[#01367F]">{step.step}.</span> {step.title}
                      </h3>
                      <p className="mt-1 text-[13px] leading-[19px] text-[#41536A]">{step.desc}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="trust-heading" className="mt-9 border-t border-[#D8E0E7] pt-8">
              <h2 id="trust-heading" className="text-[20px] leading-[26px] font-bold tracking-tight text-[#0F172A]">
                Trust and transparency
              </h2>

              {/*
                * Column flow, not a two-column grid: five items into a grid
                * leaves the last one alone in a row, and the one statement that
                * wraps to two lines opens a hole beside it. Columns just fill.
                */}
              <ul className="mt-4 md:columns-2 md:gap-x-10">
                {TRUST_ITEMS.map(item => (
                  <li key={item.text} className="mb-2.5 flex break-inside-avoid gap-2.5">
                    <item.icon className="mt-[3px] h-4 w-4 shrink-0 text-[#01367F]" aria-hidden="true" />
                    <span className="text-[13px] leading-[19px] text-[#41536A]">{item.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2">
                <Link to="/affiliate-disclosure" className="text-[13px] font-medium text-[#01367F] underline underline-offset-2 transition-colors hover:text-[#012B66] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01367F]">
                  Affiliate disclosure
                </Link>
                <span className="text-[#C3D2E0]" aria-hidden="true">·</span>
                <Link to="/privacy" className="text-[13px] font-medium text-[#01367F] underline underline-offset-2 transition-colors hover:text-[#012B66] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01367F]">
                  Privacy policy
                </Link>
                <span className="text-[#C3D2E0]" aria-hidden="true">·</span>
                <Link to="/terms" className="text-[13px] font-medium text-[#01367F] underline underline-offset-2 transition-colors hover:text-[#012B66] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01367F]">
                  Terms of service
                </Link>
              </div>

              <p className="mt-4 max-w-3xl text-[12px] leading-[18px] text-[#5A6C85]">
                Travel requirements can change. Always confirm critical information with the relevant government, airline or provider before travelling.
              </p>
            </section>
          </div>
        </div>

        {/*
          * The "Ready to start planning?" band is gone.
          *
          * Its primary button scrolled to #flight-search — back to the top of
          * this same page, where D1 already put an operable search in the first
          * viewport. Its only other action, the trip cost planner, now leads the
          * planning section above. What remained was ~230px of navy repeating an
          * offer the visitor had already scrolled past, plus a second "Search
          * flights" CTA competing with the real one.
          *
          * id="flight-search" stays on the band, so deep links to /#flight-search
          * and the flights page's own scroll target are unaffected.
          */}
      </main>

      <Footer />
    </div>
  </>
);

export default DesktopHome;
