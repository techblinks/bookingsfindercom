import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  AlertTriangle, Search, ArrowRight,
  Calculator, Plane, ClipboardCheck,
} from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { FlightHero, TrustPoints } from "@/components/flight-landing";
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

// ── Explore routes (renamed from "Popular" — factual heading) ──

const EXPLORE_ROUTES = [
  { origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney" },
  { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne" },
  { origin: "BNE", originName: "Brisbane", destination: "MEL", destinationName: "Melbourne" },
  { origin: "OOL", originName: "Gold Coast", destination: "SYD", destinationName: "Sydney" },
  { origin: "SYD", originName: "Sydney", destination: "KTM", destinationName: "Kathmandu" },
  { origin: "MEL", originName: "Melbourne", destination: "DEL", destinationName: "Delhi" },
];

// ── Compact value cards (reduced from 4 to 2 genuinely differentiated items) ──

const VALUE_CARDS = [
  {
    icon: Calculator,
    title: "Plan your full trip cost",
    description: "Estimate flights, accommodation, transfers and daily spending with our Trip Cost Planner.",
    route: "/trip-cost",
  },
  {
    icon: ClipboardCheck,
    title: "Keep your trip organised",
    description: "Forward your confirmation emails and we'll build a structured overview of your travel plans.",
    route: "/trips",
  },
];

// ── FAQ (reduced from 6 to 4 — removed redundant trust questions) ──

const FLIGHT_FAQS = [
  {
    q: "How does flight comparison on BookingsFinder work?",
    a: "Enter your route, dates and traveller details. BookingsFinder searches available fares from our travel partners and displays them side by side. You can compare prices, schedules, stops, and baggage options before selecting an offer. When you're ready, you continue to the provider's website to complete your booking.",
  },
  {
    q: "Why can the price change when I continue to a provider?",
    a: "Flight availability and pricing are controlled by airlines and booking systems. A fare that was available when we showed it may sell out, or the provider may update the price based on remaining seat availability. The final price is always confirmed on the provider's website before you pay.",
  },
  {
    q: "Can I filter flights by airline, stops or baggage?",
    a: "Yes. Our flight results show the number of stops for each flight and include baggage information where available from the provider. You can use the filter panel on the results page to narrow results by airline, number of stops, departure time, and price range.",
  },
  {
    q: "How can I estimate the full cost of my trip?",
    a: (
      <>
        Use our{" "}
        <Link to="/trip-cost" className="underline underline-offset-2 hover:text-foreground transition-colors">
          Trip Cost Planner
        </Link>{" "}
        to estimate flights, bags, accommodation, transfers and daily spending in one view. It helps you understand the total cost before you book.
      </>
    ),
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
// Structured Data (landing page — no fabricated Flight/Offer data)
// ════════════════════════════════════════════════════════════

const LANDING_SCHEMA = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://bookingsfinder.com/#organization",
      name: "BookingsFinder",
      url: "https://bookingsfinder.com",
      description: "Travel planning and comparison platform. Compare flight options from multiple travel partners.",
    },
    {
      "@type": "WebSite",
      "@id": "https://bookingsfinder.com/#website",
      name: "BookingsFinder",
      url: "https://bookingsfinder.com",
      publisher: { "@id": "https://bookingsfinder.com/#organization" },
    },
    {
      "@type": "WebPage",
      "@id": "https://bookingsfinder.com/flights/#webpage",
      name: "Compare Flights | BookingsFinder",
      description: "Search and compare flight options from travel partners. Compare schedules, stops and baggage. BookingsFinder helps you find the right flight.",
      url: "https://bookingsfinder.com/flights",
      isPartOf: { "@id": "https://bookingsfinder.com/#website" },
      about: { "@id": "https://bookingsfinder.com/#organization" },
      breadcrumb: { "@id": "https://bookingsfinder.com/flights/#breadcrumb" },
    },
    {
      "@type": "BreadcrumbList",
      "@id": "https://bookingsfinder.com/flights/#breadcrumb",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://bookingsfinder.com",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Flights",
          item: "https://bookingsfinder.com/flights",
        },
      ],
    },
  ],
};

// FAQ structured data (visible on the landing page)
function buildFaqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FLIGHT_FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: typeof faq.a === "string" ? faq.a : "Use the Trip Cost Planner on BookingsFinder to estimate every category of travel spending.",
      },
    })),
  };
}

// ════════════════════════════════════════════════════════════

export function FlightLandingPage({ prefill, validationErrors, suppliedSearchParams }: FlightLandingPageProps) {
  const hasPrefill = Object.entries(prefill).some(
    ([key, val]) => key !== "cabinClass" && val !== undefined
  );
  // Determine which fields the user explicitly provided in the URL.
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
    ? `Search live flight options for ${routeName}. Compare schedules, stops and baggage from trusted travel partners on BookingsFinder.`
    : "Search and compare flight options from travel partners. Compare schedules, stops and baggage. BookingsFinder helps you find the right flight.";

  // Route-aware heading (preserves existing behaviour); default is the Phase 1 headline.
  const heroHeading = routeName
    ? `Compare flights from ${routeName}`
    : "Compare flights for your next journey";

  // Validation banner — shown only when the user supplied invalid URL params.
  const errorBanner =
    hasErrors && hasPrefill ? (
      <div
        role="alert"
        className="mt-5 flex max-w-lg items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-3 text-left"
      >
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden="true" />
        <div className="text-sm text-amber-800">
          <p className="mb-1 font-semibold">Please review the search details.</p>
          <ul className="list-inside list-disc space-y-0.5 text-amber-700">
            {relevantErrors.slice(0, 3).map((err, i) => (
              <li key={i}>{err.message}</li>
            ))}
            {relevantErrors.length > 3 && (
              <li>
                …and {relevantErrors.length - 3} more issue
                {relevantErrors.length - 3 > 1 ? "s" : ""}
              </li>
            )}
          </ul>
        </div>
      </div>
    ) : null;

  return (
    <div className="flights-landing min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href="https://bookingsfinder.com/flights" />

        {/* Open Graph */}
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://bookingsfinder.com/flights" />
        <meta property="og:image" content="https://bookingsfinder.com/og-image.png" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />

        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={pageTitle} />
        <meta name="twitter:description" content={pageDescription} />
        <meta name="twitter:image" content="https://bookingsfinder.com/og-image.png" />

        {/* Structured Data */}
        <script type="application/ld+json">
          {JSON.stringify([LANDING_SCHEMA, buildFaqSchema()])}
        </script>
      </Helmet>

      <Header />

      <main id="main-content" className="flex-1">
        {/* ── 1. Hero + Search Form ── */}
        <FlightHero
          heading={heroHeading}
          prefill={prefill}
          hasPrefill={hasPrefill}
          errorBanner={errorBanner}
        />

        {/* ── 2. Trust Row (compact) ── */}
        <TrustPoints />

        {/* ── 3. Explore Flight Routes ── */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                Explore flight routes
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Select a route to prefill the search form above. Add your travel dates to compare live fares.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
              {EXPLORE_ROUTES.map((route) => {
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

        {/* ── 4. Compact Why BookingsFinder ── */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container max-w-5xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                Why use BookingsFinder
              </h2>
              <p className="text-sm text-muted-foreground max-w-lg mx-auto">
                Plan with confidence. Compare flight options, then complete your booking with the provider you choose.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-4xl mx-auto">
              {VALUE_CARDS.map((card) => (
                <Link
                  key={card.title}
                  to={card.route}
                  className="flex items-start gap-4 p-5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-primary/20 transition-colors">
                    <card.icon className="h-5 w-5 text-primary" aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">{card.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{card.description}</p>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 opacity-0 group-hover:opacity-100 transition-opacity mt-2" aria-hidden="true" />
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. FAQ (4 questions) ── */}
        <section className="py-12 md:py-16 bg-background">
          <div className="container max-w-3xl mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight mb-3">
                Frequently asked questions
              </h2>
            </div>

            <Accordion type="single" collapsible className="space-y-3">
              {FLIGHT_FAQS.map((faq, i) => (
                <AccordionItem key={i} value={`faq-${i}`} className="border rounded-lg px-5 bg-card">
                  <AccordionTrigger className="text-left text-sm font-semibold text-foreground hover:no-underline py-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary rounded-md">
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
      </main>

      <Footer />
    </div>
  );
}
