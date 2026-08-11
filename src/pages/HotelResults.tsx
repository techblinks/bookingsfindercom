import { useState, useCallback } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Building2, Search, Check, ArrowRight,
  Calculator, Plane, MapPin, Shield, Calendar, ExternalLink, Clock,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import TripComHotelWidget from "@/components/hotels/TripComHotelWidget";
import MobileStaysDialog from "@/components/hotels/MobileStaysDialog";
import HeroMediaCollage from "@/components/hero/HeroMediaCollage";
import { useHeroMedia } from "@/hooks/useHeroMedia";
import { logInternalNavigation } from "@/lib/analytics";
import { ctaPrimary, ctaSecondaryLight } from "@/components/ui/button";

const track = (l: string, h: string) => { try { logInternalNavigation({ label: l, source: "stays", href: h }); } catch (_) {} };

const TRUST = [
  "Current availability from Trip.com",
  "No booking fee from BookingsFinder",
  "Clear handoff to the provider",
  "Booking and payment completed with Trip.com",
];

const DESTINATIONS = [
  { name: "Sydney", desc: "Harbour City", bg: "from-[#01367F] to-[#4C78B1]" },
  { name: "Melbourne", desc: "Cultural Capital", bg: "from-[#4C78B1] to-[#718096]" },
  { name: "Brisbane", desc: "River City", bg: "from-[#01367F] to-[#001D45]" },
  { name: "Gold Coast", desc: "Surf & Sand", bg: "from-[#D64A2A] to-[#B83D22]" },
  { name: "Bali", desc: "Island Escape", bg: "from-[#01367F] to-[#012B66]" },
  { name: "Kathmandu", desc: "Mountain Gateway", bg: "from-[#001D45] to-[#01367F]" },
];

const WHY_CARDS = [
  { icon: Calculator, title: "Plan before booking", desc: "Estimate accommodation, flights, transfers and daily spending before you commit." },
  { icon: Plane, title: "Keep your trip together", desc: "Move between flights, stays, trip costs and itinerary planning from one place." },
  { icon: Shield, title: "Transparent partner handoff", desc: "Pricing, payment, booking conditions and cancellations are handled by Trip.com." },
  { icon: Calendar, title: "Understand the full cost", desc: "Add accommodation costs to the Trip Cost Planner and see the complete travel budget." },
];

const TOOLS = [
  { icon: Calculator, title: "Trip Cost Planner", desc: "Build a complete travel budget for your trip.", href: "/trip-cost" },
  { icon: Plane, title: "Compare Flights", desc: "Search and compare available flight options.", href: "/flights" },
  { icon: MapPin, title: "Smart Trip Optimizer", desc: "Plan multi-city routes efficiently.", href: "/optimizer" },
];

const FAQ_ITEMS = [
  { q: "Does BookingsFinder book accommodation directly?", a: "No. BookingsFinder is a travel planning platform. We connect you with Trip.com for accommodation. Bookings and payments are completed directly with the provider." },
  { q: "Why does the accommodation search use Trip.com?", a: "Trip.com is a global travel provider that shows current prices, availability and booking terms for millions of properties. BookingsFinder integrates their search so you can plan from one place." },
  { q: "Does BookingsFinder charge a booking fee?", a: "No. BookingsFinder does not add booking fees. Any charges are handled and communicated by Trip.com." },
  { q: "Who handles payments and cancellations?", a: "Payment, booking changes, cancellation policies and refunds are handled by Trip.com. Review their terms before completing your reservation." },
  { q: "Are prices and availability guaranteed?", a: "Current prices and availability are shown at search time by Trip.com. Final prices are confirmed on the provider's booking page." },
  { q: "Can I add accommodation to my trip budget?", a: "Yes. Use the Trip Cost Planner to include accommodation alongside flights, transfers and daily expenses." },
];

/** Conditionally renders backend hero or SVG/gradient fallback for Stays. */
function StaysHeroImage() {
  const { isUsingFallback } = useHeroMedia("stays");
  if (!isUsingFallback) {
    return <HeroMediaCollage pageKey="stays" />;
  }
  // SVG accommodation fallback
  return (
    <div className="hidden lg:grid grid-cols-2 gap-3 w-[420px] shrink-0" aria-hidden="true">
      <div className="col-span-2 rounded-2xl overflow-hidden h-[200px] bg-gradient-to-br from-[#01367F] to-[#4C78B1] flex items-center justify-center">
        <Building2 className="h-12 w-12 text-white/20" />
      </div>
      <div className="rounded-2xl overflow-hidden h-[140px] bg-gradient-to-br from-[#4C78B1] to-[#718096] flex items-center justify-center">
        <Building2 className="h-8 w-8 text-white/20" />
      </div>
      <div className="rounded-2xl overflow-hidden h-[140px] bg-gradient-to-br from-[#01367F] to-[#001D45] flex items-center justify-center">
        <Building2 className="h-8 w-8 text-white/20" />
      </div>
    </div>
  );
}

const HotelResults = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const openMobile = useCallback(() => { setMobileOpen(true); track("open_stay_search", "#stay-search"); }, []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);
  const toggleFaq = (i: number) => setFaqOpen(p => p === i ? null : i);
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <>
      {/*
        This page has always been in the sitemap but carried no metadata of its
        own, so it inherited index.html's head and canonicalised itself to the
        homepage — telling crawlers to ignore the very URL the sitemap listed.
      */}
      <Helmet>
        <title>Compare Accommodation and Plan Your Stay | BookingsFinder</title>
        <meta
          name="description"
          content="Search accommodation for your trip with current availability from Trip.com, then add the cost to your trip budget. Booking and payment are completed with the provider."
        />
        <meta property="og:title" content="Compare Accommodation and Plan Your Stay | BookingsFinder" />
        <meta
          property="og:description"
          content="Search accommodation for your trip and plan the full cost of your stay with BookingsFinder."
        />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://bookingsfinder.com/hotels" />
      </Helmet>

      <div className="min-h-screen bg-[#EDF4FC] flex flex-col">
      <Header />

      <main className="flex-1">
        {/* ── 1. HERO ── */}
        <section className="bg-white border-b border-[#D8E0E7]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 sm:py-16 lg:py-20">
            <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
              {/* Copy */}
              <div className="flex-1 text-center lg:text-left">
                <p className="text-[#01367F] text-sm font-bold tracking-[0.14em] uppercase mb-3">Stay Planning</p>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-[#0F172A] tracking-tight leading-[1.12] mb-4">
                  Find the right stay for your next trip
                </h1>
                <p className="text-base sm:text-lg text-[#41536A] max-w-xl leading-relaxed mb-6">
                  Search accommodation with our travel partner and keep your flights, budget and itinerary planning in one place.
                </p>
                <div className="flex flex-wrap gap-3 justify-center lg:justify-start items-center">
                  <a href="#stay-search" onClick={() => track("hero_search_stays", "#stay-search")}
                    className={ctaPrimary}
                  >
                    <Search className="w-[18px] h-[18px]" /> Search stays
                  </a>
                  <Link to="/trip-cost" onClick={() => track("hero_plan_costs", "/trip-cost")}
                    className={ctaSecondaryLight}
                  >
                    <Calculator className="w-[18px] h-[18px]" /> Plan trip costs
                  </Link>
                </div>
              </div>
              <StaysHeroImage />
            </div>
          </div>
        </section>

        {/* ── 2. SEARCH SECTION ── */}
        <section id="stay-search" className="py-12 sm:py-16">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Search accommodation for your trip</h2>
              <p className="mt-2 text-base text-[#41536A] max-w-[720px] mx-auto">Current prices, availability and booking conditions are provided by Trip.com.</p>
            </div>

            {/* Desktop: inline widget */}
            <div className="hidden lg:block">
              <div className="bg-card rounded-[20px] border border-[#D8E0E7] shadow-sm mx-auto max-w-[1200px] p-4">
                <TripComHotelWidget variant="desktop" />
              </div>
            </div>

            {/* Mobile: trigger card */}
            <div className="lg:hidden bg-card rounded-[20px] border border-[#D8E0E7] shadow-sm p-6 text-center max-w-[400px] mx-auto">
              <div className="mx-auto w-14 h-14 rounded-2xl bg-[#01367F]/10 flex items-center justify-center mb-4">
                <Building2 className="h-7 w-7 text-[#01367F]" aria-hidden="true" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] mb-2">Search current stays</h3>
              <p className="text-sm text-[#41536A] mb-5">Search hotels, apartments and more with our accommodation partner.</p>
              <button onClick={openMobile}
                className={ctaPrimary}
              >
                <Search className="w-5 h-5" /> Open stay search
              </button>
              <p className="mt-4 text-xs text-[#718096]">Search provided by Trip.com</p>
            </div>
          </div>
        </section>

        <MobileStaysDialog open={mobileOpen} onClose={closeMobile} />

        {/* ── 3. TRUST STRIP ── */}
        <section className="bg-white border-b border-[#D8E0E7]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-4">
            <div className="flex flex-wrap justify-center gap-x-8 gap-y-2 text-sm font-semibold text-[#41536A]">
              {TRUST.map(t => (
                <span key={t} className="inline-flex items-center gap-2">
                  <Check className="h-4 w-4 text-[#01367F]" aria-hidden="true" /> {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. POPULAR DESTINATIONS ── */}
        <section className="py-14 sm:py-20 bg-white">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A]">Popular stay destinations</h2>
              <p className="mt-2 text-base text-[#41536A] max-w-[720px] mx-auto">Choose a destination and continue to the accommodation search.</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {DESTINATIONS.map(d => (
                <button key={d.name} onClick={() => { if (isDesktop) { document.getElementById("stay-search")?.scrollIntoView({ behavior: "smooth" }); } else { openMobile(); } track(`dest_${d.name}`, "#stay-search"); }}
                  className="group p-0 rounded-[16px] border border-[#D8E0E7] bg-card text-left hover:border-[#01367F]/40 hover:shadow-md transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#01367F] overflow-hidden"
                >
                  <div className={`h-[100px] bg-gradient-to-br ${d.bg} flex items-end p-3`} aria-hidden="true">
                    <MapPin className="h-5 w-5 text-white/40" />
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-[#0F172A]">{d.name}</p>
                    <p className="text-xs text-[#718096]">{d.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. WHY USE BOOKINGSFINDER ── */}
        <section className="py-14 sm:py-20 bg-[#EDF4FC]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] text-center mb-10">Why plan stays with BookingsFinder</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {WHY_CARDS.map(c => (
                <div key={c.title} className="p-6 rounded-[16px] border border-[#D8E0E7] bg-card">
                  <div className="w-10 h-10 rounded-xl bg-[#01367F]/10 flex items-center justify-center mb-3">
                    <c.icon className="h-5 w-5 text-[#01367F]" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A] mb-2">{c.title}</h3>
                  <p className="text-sm text-[#41536A] leading-relaxed">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. HELPFUL TOOLS ── */}
        <section className="py-14 sm:py-20 bg-white">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] text-center mb-10">Helpful trip-planning tools</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-[960px] mx-auto">
              {TOOLS.map(c => (
                <Link key={c.title} to={c.href} onClick={() => track(c.title, c.href)}
                  className="group p-6 rounded-[16px] border border-[#D8E0E7] hover:border-[#01367F]/40 hover:shadow-sm transition-all bg-card"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#01367F]/10 flex items-center justify-center mb-3 group-hover:bg-[#01367F]/20 transition-colors">
                    <c.icon className="h-5 w-5 text-[#01367F]" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-[#0F172A] mb-1">{c.title}</h3>
                  <p className="text-sm text-[#41536A] leading-relaxed">{c.desc}</p>
                  <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[#01367F] group-hover:gap-2.5 transition-all">Go <ArrowRight className="h-4 w-4" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. FAQ ── */}
        <section className="py-14 sm:py-20 bg-[#EDF4FC]">
          <div className="max-w-[760px] mx-auto px-4 sm:px-6">
            <h2 className="text-2xl sm:text-3xl font-bold text-[#0F172A] text-center mb-10">Frequently asked questions</h2>
            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
                <div key={i} className="bg-card rounded-[16px] border border-[#D8E0E7] overflow-hidden">
                  <button onClick={() => toggleFaq(i)} aria-expanded={faqOpen === i}
                    className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span className="text-sm font-semibold text-[#0F172A]">{item.q}</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                      className={`text-[#718096] transition-transform shrink-0 ${faqOpen === i ? "rotate-180" : ""}`} aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {faqOpen === i && (
                    <div className="px-5 pb-4 text-sm text-[#41536A] leading-relaxed">{item.a}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 8. DISCLOSURE ── */}
        <section className="bg-white py-10 border-t border-[#D8E0E7]">
          <div className="max-w-[760px] mx-auto px-4 sm:px-6">
            <p className="text-xs text-[#718096] text-center leading-relaxed">
              BookingsFinder helps you plan and search for accommodation. Current prices, availability, payment and booking conditions are provided by Trip.com. BookingsFinder may earn a commission at no additional cost to you.
            </p>
          </div>
        </section>
      </main>

      <Footer />
      </div>
    </>
  );
};

export default HotelResults;
