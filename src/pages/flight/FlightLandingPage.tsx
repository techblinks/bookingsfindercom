import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Shield, Search, ArrowRight, ExternalLink,
  Calculator, PiggyBank, FileCheck, Globe, ClipboardCheck, DollarSign, Plane,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import type { FlightSearchFormValues, ValidationError } from "@/lib/flightSearchValidation";
import { cn } from "@/lib/utils";

// ── IATA code → city name lookup (local, no API call needed) ──

const KNOWN_AIRPORTS: Record<string, string> = {
  BNE: "Brisbane", SYD: "Sydney", MEL: "Melbourne", PER: "Perth",
  ADL: "Adelaide", OOL: "Gold Coast", CNS: "Cairns", HBA: "Hobart",
  AKL: "Auckland", CHC: "Christchurch", WLG: "Wellington",
  JFK: "New York", LAX: "Los Angeles", SFO: "San Francisco",
  ORD: "Chicago", MIA: "Miami", BOS: "Boston", ATL: "Atlanta",
  DFW: "Dallas", DEN: "Denver", SEA: "Seattle", LAS: "Las Vegas",
  LHR: "London", CDG: "Paris", FRA: "Frankfurt", AMS: "Amsterdam",
  MAD: "Madrid", BCN: "Barcelona", FCO: "Rome", DXB: "Dubai",
  SIN: "Singapore", HKG: "Hong Kong", NRT: "Tokyo", ICN: "Seoul",
  DEL: "Delhi", BOM: "Mumbai", KTM: "Kathmandu", BKK: "Bangkok",
  KUL: "Kuala Lumpur", CGK: "Jakarta", MNL: "Manila",
  DOH: "Doha", AUH: "Abu Dhabi", IST: "Istanbul",
  YYZ: "Toronto", YVR: "Vancouver", MEX: "Mexico City",
  GRU: "São Paulo", EZE: "Buenos Aires", SCL: "Santiago",
  JNB: "Johannesburg", CPT: "Cape Town", CAI: "Cairo", NBO: "Nairobi",
};

function getCityName(code: string): string | null {
  return KNOWN_AIRPORTS[code.toUpperCase()] ?? null;
}

// ── Popular routes ──

const POPULAR_ROUTES = [
  { origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney" },
  { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne" },
  { origin: "BNE", originName: "Brisbane", destination: "MEL", destinationName: "Melbourne" },
  { origin: "OOL", originName: "Gold Coast", destination: "SYD", destinationName: "Sydney" },
  { origin: "SYD", originName: "Sydney", destination: "KTM", destinationName: "Kathmandu" },
  { origin: "MEL", originName: "Melbourne", destination: "DEL", destinationName: "Delhi" },
];

// ── Value cards ──

const VALUE_CARDS = [
  { icon: Search, title: "Compare before choosing", description: "See fares from multiple airlines and booking partners side by side so you can make an informed decision." },
  { icon: ExternalLink, title: "Transparent partner handoff", description: "When you're ready to book, we direct you to the provider. Your booking and payment happen with them." },
  { icon: Calculator, title: "Plan the full trip cost", description: "Use our Trip Cost Planner to estimate flights, bags, accommodation, transfers and daily spending." },
  { icon: DollarSign, title: "Keep travel details organised", description: "Forward your confirmation emails and we'll build a structured overview of your trip." },
];

// ── Verified working tools ──

const WORKING_TOOLS = [
  { label: "Trip Cost Planner", description: "Estimate every category of travel spending in one view.", icon: Calculator, route: "/trip-cost" },
];

// ── Trust items ──

const TRUST_ITEMS = [
  { label: "Compare live partner fares", icon: Search },
  { label: "Secure partner handoff", icon: Shield },
  { label: "No fee from BookingsFinder", icon: DollarSign },
  { label: "Multiple booking providers", icon: ExternalLink },
];

// ── FAQ ──

const FLIGHT_FAQS = [
  {
    q: "Does BookingsFinder sell flight tickets?",
    a: "No. BookingsFinder is a flight comparison service. We search across our travel partners to help you find available fares. When you choose an offer, we redirect you to the airline or booking site to complete your purchase. Your booking, payment and ticket are handled entirely by that provider.",
  },
  {
    q: "How does flight comparison work?",
    a: "Enter your route, dates and traveller details. BookingsFinder searches live fares from our travel partners and displays them side by side. You can compare prices, schedules, stops, and baggage options before selecting an offer. Clicking through takes you to the provider's website to complete your booking.",
  },
  {
    q: "Why can prices change after I click through?",
    a: "Flight availability and pricing are controlled by airlines and booking systems. A fare that was available when we showed it may sell out, or the provider may update the price based on remaining seat availability. The final price is always confirmed on the provider's website before you pay.",
  },
  {
    q: "Do you charge a booking fee?",
    a: "No. BookingsFinder does not charge travellers any booking or service fee. We may earn an affiliate commission from the travel provider when you complete a booking through our links. This does not increase the price you pay.",
  },
  {
    q: "Where do I complete my booking?",
    a: "BookingsFinder shows you available flight options. When you click View Deal or Select, you are redirected to the airline, travel agency or booking platform that is offering that fare. All booking details, payment, changes and cancellations are managed by that provider.",
  },
  {
    q: "Can I compare baggage and stop options?",
    a: "Yes. Our flight results show the number of stops for each flight. Many results also include baggage information where it is available from the provider. You can use the filter panel on the results page to narrow results by number of stops.",
  },
];

// ── Helpers ──

function buildRouteDisplayName(origin?: string, destination?: string): string | null {
  if (!origin || !destination) return null;
  const originCity = getCityName(origin);
  const destCity = getCityName(destination);
  if (originCity && destCity) return `${originCity} to ${destCity}`;
  // Fallback to codes when city names are unavailable
  if (originCity) return `${originCity} to ${destination}`;
  if (destCity) return `${origin} to ${destCity}`;
  return `${origin} to ${destination}`;
}

// ════════════════════════════════════════════════════════════
// Props
// ════════════════════════════════════════════════════════════

interface FlightLandingPageProps {
  prefill: Partial<FlightSearchFormValues>;
  validationErrors: ValidationError[];
  /** The raw search params, used to determine which fields the user explicitly provided. */
  suppliedSearchParams: URLSearchParams;
}

// ════════════════════════════════════════════════════════════

export function FlightLandingPage({ prefill, validationErrors, suppliedSearchParams }: FlightLandingPageProps) {
  const hasPrefill = Object.entries(prefill).some(
    ([key, val]) => key !== "cabinClass" && val !== undefined
  );
  // Determine which fields the user explicitly provided in the URL.
  // A field is "supplied" if it exists in searchParams (even if invalid).
  const KNOWN_PARAMS = ["origin", "destination", "departureDate", "returnDate", "adults", "children", "infants", "cabinClass"];
  const suppliedFields = new Set(
    KNOWN_PARAMS.filter(p => suppliedSearchParams.get(p) !== null)
  );
  const relevantErrors = validationErrors.filter(e => suppliedFields.has(e.field));
  const hasErrors = relevantErrors.length > 0;
  const routeName = buildRouteDisplayName(prefill.origin, prefill.destination);

  const pageTitle = routeName
    ? `Compare ${routeName} Flights | BookingsFinder`
    : "Compare Flights | BookingsFinder";
  const pageDescription = routeName
    ? `Search live flight fares for ${routeName}. Compare prices, schedules, stops and baggage options from trusted airlines and booking partners.`
    : "Compare flight options from trusted airlines and booking partners. Search by route, dates, travellers and cabin class with BookingsFinder.";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <link rel="canonical" href="https://bookingsfinder.com/flights" />
      </Helmet>

      <Header />

      <main id="main-content" className="flex-1">
        {/* ── 1. Hero + Search Form ── */}
        <section className="relative py-10 md:py-20 bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-foreground tracking-tight text-balance mb-4">
                {routeName
                  ? `Compare flights from ${routeName}`
                  : "Compare flights with BookingsFinder"}
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Search live fares from trusted airlines and booking partners.
                Compare prices, schedules, stops and baggage options before choosing.
              </p>
              <p className="mt-3 text-xs font-medium text-muted-foreground/70 uppercase tracking-wider">
                Independent travel comparison
              </p>

              {/* Validation error banner — only when invalid URL params exist */}
              {hasErrors && hasPrefill && (
                <div role="alert" className="mt-5 inline-flex items-start gap-3 px-5 py-3 bg-amber-50 border border-amber-200 rounded-xl text-left max-w-lg mx-auto">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="text-sm text-amber-800">
                    <p className="font-semibold mb-1">Please review the search details.</p>
                    <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                      {relevantErrors.slice(0, 3).map((err, i) => (
                        <li key={i}>{err.message}</li>
                      ))}
                      {relevantErrors.length > 3 && (
                        <li>…and {relevantErrors.length - 3} more issue{relevantErrors.length - 3 > 1 ? 's' : ''}</li>
                      )}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Search form card */}
            <div className="max-w-3xl mx-auto bg-card rounded-2xl border border-border p-4 md:p-6 shadow-sm">
              <ModernFlightSearch prefill={hasPrefill ? prefill : undefined} hideMultiCity />
            </div>
          </div>
        </section>

        {/* ── 2. Trust Strip ── */}
        <section className="py-6 md:py-8 bg-background">
          <div className="max-w-[1100px] mx-auto px-4">
            <div className="bg-muted/40 border border-border/60 rounded-2xl px-6 py-5 md:px-10 md:py-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8">
                {TRUST_ITEMS.map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <item.icon className="h-4 w-4 text-primary" aria-hidden="true" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. Popular Routes ── */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                Popular flight routes
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Select a route to prefill the search form above. Add your travel dates to compare live fares.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {POPULAR_ROUTES.map((route) => {
                const routeParamString = `origin=${route.origin}&destination=${route.destination}`;
                const isSameRoute = prefill.origin === route.origin && prefill.destination === route.destination;
                return (
                  <Link
                    key={`${route.origin}-${route.destination}`}
                    to={`/flights?${routeParamString}`}
                    className={cn(
                      "group flex items-center gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:shadow-sm transition-all",
                      isSameRoute && "border-primary/30 bg-primary/5"
                    )}
                  >
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary/20 transition-colors">
                      <Plane className="h-5 w-5 text-primary" aria-hidden="true" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <span className="font-mono uppercase">{route.origin}</span>
                        <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                        <span className="font-mono uppercase">{route.destination}</span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {route.originName} → {route.destinationName}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" aria-hidden="true" />
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. Why BookingsFinder ── */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                Why use BookingsFinder
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                We help you find the right flight and then step out of the way for booking.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
              {VALUE_CARDS.map((card) => (
                <div key={card.title} className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                    <card.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. Helpful Tools (only verified working) ── */}
        {WORKING_TOOLS.length > 0 && (
          <section className="py-12 md:py-16 bg-background">
            <div className="container max-w-5xl mx-auto px-4">
              <div className="text-center mb-8 md:mb-10">
                <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                  Helpful trip-planning tools
                </h2>
                <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                  Prepare every detail of your trip with these free planning tools.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
                {WORKING_TOOLS.map((tool) => (
                  <Link
                    key={tool.label}
                    to={tool.route}
                    className="flex items-start gap-4 p-5 rounded-xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all group"
                  >
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-accent/20 transition-colors">
                      <tool.icon className="h-5 w-5 text-accent" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-semibold text-foreground mb-1">{tool.label}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{tool.description}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-2" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── 6. FAQ ── */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                Frequently asked questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {FLIGHT_FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-5 bg-card">
                  <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline py-4">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* ── 7. Affiliate Disclosure ── */}
        <section className="py-10 bg-background">
          <div className="container max-w-3xl mx-auto px-4 text-center">
            <p className="text-xs text-muted-foreground leading-relaxed max-w-xl mx-auto">
              BookingsFinder is a flight comparison service. We search across our travel partners to help you find available fares.
              When you click through and complete a booking, we may earn an affiliate commission at no extra cost to you.
              Your booking and payment are handled entirely by the provider you choose.{" "}
              <Link to="/affiliate-disclosure" className="underline underline-offset-2 hover:text-foreground transition-colors">
                Learn more
              </Link>
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
