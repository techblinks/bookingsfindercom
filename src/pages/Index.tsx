import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Plane, Building2, Compass, MapPin, ArrowRight } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import { logInternalNavigation } from "@/lib/analytics";

const safeTrack = (label: string, href: string) => {
  try { logInternalNavigation({ label, source: "homepage", href }); } catch (_) {}
};

const PRODUCT_CARDS = [
  { title: "Compare flights", desc: "Search and compare available flight options from participating travel providers.", href: "/flights", icon: Plane },
  { title: "Find stays", desc: "Browse hotel options and compare accommodation for your trip.", href: "/hotels", icon: Building2 },
  { title: "Estimate trip costs", desc: "Plan your budget with our interactive trip cost planner.", href: "/trip-cost", icon: Compass },
  { title: "Optimize your itinerary", desc: "Plan multi-city routes and find the most efficient travel path.", href: "/optimizer", icon: MapPin },
];

const Index = () => (
  <>
    <Helmet>
      <title>BookingsFinder — Compare Flights and Plan Your Trip</title>
      <meta name="description" content="Compare flights, find stays, estimate trip costs and use practical travel-planning tools with BookingsFinder." />
      <meta property="og:title" content="BookingsFinder — Compare Flights and Plan Your Trip" />
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
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 focus:bg-[#0A1F44] focus:text-white focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-[#2878F0] focus:ring-offset-2 focus:outline-none focus:text-sm focus:font-medium">Skip to main content</a>

      <Header />

      <main id="main-content" className="flex-1">
        <section className="relative overflow-hidden bg-[#0A1F44]" aria-labelledby="hero-heading">
          <div className="absolute inset-0 opacity-[0.06]" aria-hidden="true">
            <svg width="100%" height="100%" viewBox="0 0 1440 700" preserveAspectRatio="none"><path d="M-100,400 Q200,200 500,380 T1440,200" fill="none" stroke="white" strokeWidth="1.5"/><path d="M-100,500 Q400,700 800,350 T1440,450" fill="none" stroke="white" strokeWidth="1" opacity="0.5"/><circle cx="300" cy="380" r="4" fill="white" opacity="0.3"/><circle cx="900" cy="300" r="5" fill="white" opacity="0.2"/></svg>
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20 lg:py-28">
            <p className="text-[#2878F0] text-sm font-bold tracking-[0.14em] uppercase mb-4">Plan smarter. Travel better.</p>
            <h1 id="hero-heading" className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.08] max-w-3xl">Find, compare and plan your whole trip.</h1>
            <p className="mt-5 text-lg sm:text-xl text-[#94A3B8] max-w-2xl leading-relaxed">Compare flights, estimate trip costs and use practical travel tools from one place.</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a href="#flight-search" onClick={() => safeTrack("hero_search", "#flight-search")} className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#E6532F] hover:bg-[#CC4428] text-white font-semibold rounded-xl text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878F0] shadow-lg shadow-[#E6532F]/25">Search flights <Plane className="w-5 h-5" /></a>
              <Link to="/trip-cost" onClick={() => safeTrack("hero_explore_tools", "/trip-cost")} className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-xl text-base transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white border border-white/20">Explore tools <ArrowRight className="w-5 h-5" /></Link>
            </div>
          </div>
        </section>

        <section id="flight-search" className="bg-[#F2F6F9] py-10 sm:py-14" aria-labelledby="flight-search-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto">
              <h2 id="flight-search-heading" className="text-2xl sm:text-3xl font-bold text-[#101828] text-center mb-2">Search available flights</h2>
              <p className="text-[#475467] text-center mb-8">Compare options from participating travel providers.</p>
              <div className="bg-white rounded-2xl shadow-md border border-[#DDE5EC] p-5 sm:p-7">
                <ModernFlightSearch />
              </div>
            </div>
          </div>
        </section>

        <div className="bg-white border-b border-[#DDE5EC]" aria-label="Why use BookingsFinder">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
            <div className="flex flex-wrap justify-center gap-x-10 gap-y-3 text-sm font-semibold text-[#475467]">
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#0B747A" strokeWidth="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>Compare travel options</span>
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#0B747A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>No booking fee from BookingsFinder</span>
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#0B747A" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>Continue with the selected provider</span>
              <span className="flex items-center gap-2"><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="#0B747A" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>Useful planning tools in one place</span>
            </div>
          </div>
        </div>

        <section className="py-16 sm:py-20 bg-white" aria-labelledby="products-heading">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h2 id="products-heading" className="text-2xl sm:text-3xl lg:text-4xl font-bold text-[#101828] text-center">Everything you need to plan your trip</h2>
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {PRODUCT_CARDS.map(card => (
                <Link key={card.title} to={card.href} onClick={() => safeTrack(card.title, card.href)} className="group flex flex-col p-6 rounded-2xl border border-[#DDE5EC] hover:border-[#2878F0]/40 hover:shadow-lg hover:shadow-[#2878F0]/5 transition-all bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2878F0]">
                  <div className="w-11 h-11 rounded-xl bg-[#F2F6F9] flex items-center justify-center mb-4 group-hover:bg-[#2878F0]/10 transition-colors">
                    <card.icon className="w-5 h-5 text-[#2878F0]" aria-hidden="true" />
                  </div>
                  <h3 className="text-base font-bold text-[#101828] mb-2">{card.title}</h3>
                  <p className="text-sm text-[#475467] leading-relaxed flex-1">{card.desc}</p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-[#2878F0] group-hover:gap-2.5 transition-all">Learn more <ArrowRight className="w-4 h-4" /></span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  </>
);

export default Index;
