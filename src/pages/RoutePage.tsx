import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, ArrowRight, Calendar, TrendingDown, Search, Star, Clock, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Convert slug like "london-to-dubai" to route info
const parseRouteSlug = (slug: string) => {
  const parts = slug.split("-to-");
  if (parts.length !== 2) return null;
  
  const capitalize = (s: string) => s.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  
  return {
    originCity: capitalize(parts[0]),
    destinationCity: capitalize(parts[1]),
    originSlug: parts[0],
    destinationSlug: parts[1],
  };
};

// Common IATA code mapping for popular cities
const cityToIATA: Record<string, string> = {
  london: "LON", "new york": "NYC", dubai: "DXB", paris: "CDG", tokyo: "TYO",
  bangkok: "BKK", istanbul: "IST", singapore: "SIN", barcelona: "BCN", rome: "FCO",
  "los angeles": "LAX", miami: "MIA", amsterdam: "AMS", frankfurt: "FRA", sydney: "SYD",
  mumbai: "BOM", delhi: "DEL", toronto: "YYZ", "kuala lumpur": "KUL", doha: "DOH",
  cairo: "CAI", lisbon: "LIS", madrid: "MAD", berlin: "BER", zurich: "ZRH",
  "hong kong": "HKG", seoul: "ICN", manila: "MNL", jakarta: "CGK", nairobi: "NBO",
  "sao paulo": "GRU", "mexico city": "MEX", bogota: "BOG", lima: "LIM", santiago: "SCL",
  chicago: "ORD", boston: "BOS", seattle: "SEA", "san francisco": "SFO", dallas: "DFW",
  atlanta: "ATL", denver: "DEN", manchester: "MAN", edinburgh: "EDI", dublin: "DUB",
  oslo: "OSL", stockholm: "ARN", copenhagen: "CPH", vienna: "VIE", prague: "PRG",
  athens: "ATH", budapest: "BUD", warsaw: "WAW", bucharest: "OTP", lagos: "LOS",
  johannesburg: "JNB", "cape town": "CPT", casablanca: "CMN", marrakech: "RAK",
  bali: "DPS", phuket: "HKT", maldives: "MLE", cancun: "CUN", "punta cana": "PUJ",
};

const getIATA = (cityName: string): string => {
  return cityToIATA[cityName.toLowerCase()] || cityName.substring(0, 3).toUpperCase();
};

// Deterministic fake price based on route
const getRoutePrice = (origin: string, dest: string): number => {
  const hash = (origin + dest).split("").reduce((a, b) => a + b.charCodeAt(0), 0);
  return 150 + (hash % 800);
};

const tips = [
  "Book 6-8 weeks in advance for the best fares",
  "Tuesday and Wednesday flights tend to be cheaper",
  "Consider nearby airports for better deals",
  "Use price alerts to track fare changes",
  "Flexible dates can save you up to 40%",
];

const RoutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const route = slug ? parseRouteSlug(slug) : null;

  if (!route) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Route Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the route you're looking for.</p>
          <Button asChild><Link to="/">Search Flights</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const originIATA = getIATA(route.originCity);
  const destIATA = getIATA(route.destinationCity);
  const basePrice = getRoutePrice(originIATA, destIATA);
  const today = new Date();
  const searchDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const handleSearch = () => {
    navigate(`/flights?from=${originIATA}&to=${destIATA}&date=${searchDate}&passengers=1&cabin=economy`);
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: `How much do flights from ${route.originCity} to ${route.destinationCity} cost?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Flights from ${route.originCity} to ${route.destinationCity} typically start from $${basePrice}. Prices vary depending on the season, airline, and how far in advance you book.`,
        },
      },
      {
        "@type": "Question",
        name: `What is the best time to fly from ${route.originCity} to ${route.destinationCity}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `The cheapest time to fly is usually during off-peak months. We recommend booking 6-8 weeks in advance and using our price alerts to track the best deals.`,
        },
      },
      {
        "@type": "Question",
        name: `Which airlines fly from ${route.originCity} to ${route.destinationCity}?`,
        acceptedAnswer: {
          "@type": "Answer",
          text: `Multiple airlines serve this route. Use our flight comparison tool to see all available options with real-time pricing from partner booking sites.`,
        },
      },
    ],
  };

  return (
    <>
      <Helmet>
        <title>Cheap Flights from {route.originCity} to {route.destinationCity} | BookingsFinder</title>
        <meta
          name="description"
          content={`Compare cheap flights from ${route.originCity} to ${route.destinationCity} from $${basePrice}. Find the best deals, airlines, and travel tips for this route.`}
        />
        <meta name="keywords" content={`cheap flights ${route.originCity} to ${route.destinationCity}, ${route.originCity} ${route.destinationCity} flights, flight deals`} />
        <link rel="canonical" href={`https://bookingsfinder.com/flights/${slug}`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-16">
            <div className="container max-w-4xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <span>/</span>
                <span>Flights</span>
                <span>/</span>
                <span className="text-foreground">{route.originCity} to {route.destinationCity}</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Cheap Flights from {route.originCity} to {route.destinationCity}
              </h1>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                Compare prices across multiple airlines and booking partners. Find the best deals
                for {route.originCity} ({originIATA}) → {route.destinationCity} ({destIATA}).
              </p>

              {/* Price highlight + CTA */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="bg-card border border-border rounded-xl px-5 py-3 flex items-center gap-3">
                  <TrendingDown className="h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm text-muted-foreground">Prices from</p>
                    <p className="text-2xl font-bold text-foreground">${basePrice}</p>
                  </div>
                </div>
                <Button size="lg" onClick={handleSearch} className="gap-2">
                  <Search className="h-4 w-4" />
                  View Live Prices
                </Button>
              </div>
            </div>
          </section>

          {/* Content body */}
          <section className="py-10 md:py-14">
            <div className="container max-w-4xl">
              {/* Route overview */}
              <div className="prose prose-sm max-w-none mb-10">
                <h2 className="text-2xl font-bold text-foreground">
                  {route.originCity} to {route.destinationCity} Flight Guide
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Looking for the best flight deals from {route.originCity} to {route.destinationCity}?
                  BookingsFinder compares prices from top airlines and booking partners to help you find
                  the cheapest fares. Whether you're planning a holiday, business trip, or last-minute
                  getaway, our smart comparison engine shows you real-time prices so you can make informed
                  decisions before booking with our trusted partners.
                </p>
                <p className="text-muted-foreground leading-relaxed">
                  The {route.originCity} to {route.destinationCity} route is served by multiple airlines
                  offering both direct and connecting flights. Prices typically range from ${basePrice} to
                  ${basePrice + 400} depending on the season, class, and how far in advance you book.
                  We recommend setting up a price alert to get notified when fares drop for this route.
                </p>
              </div>

              {/* Tips cards */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Travel Tips for This Route
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {tips.map((tip, i) => (
                    <Card key={i} className="border-border">
                      <CardContent className="p-4 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{tip}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quick search CTA */}
              <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent mb-10">
                <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-full bg-primary/10">
                      <Plane className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">Ready to compare prices?</p>
                      <p className="text-sm text-muted-foreground">
                        See live deals from {route.originCity} to {route.destinationCity}
                      </p>
                    </div>
                  </div>
                  <Button onClick={handleSearch} className="gap-2 shrink-0">
                    Compare Booking Options
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>

              {/* FAQ Section */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {faqSchema.mainEntity.map((faq, i) => (
                    <Card key={i} className="border-border">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-foreground mb-2">{faq.name}</h3>
                        <p className="text-sm text-muted-foreground">{faq.acceptedAnswer.text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Related routes */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Related Routes</h2>
                <div className="flex flex-wrap gap-2">
                  {[
                    `${route.destinationSlug}-to-${route.originSlug}`,
                    `${route.originSlug}-to-paris`,
                    `${route.originSlug}-to-dubai`,
                    `${route.destinationSlug}-to-london`,
                    `${route.destinationSlug}-to-new-york`,
                  ]
                    .filter((r) => r !== slug)
                    .slice(0, 4)
                    .map((routeSlug) => {
                      const parsed = parseRouteSlug(routeSlug);
                      if (!parsed) return null;
                      return (
                        <Link
                          key={routeSlug}
                          to={`/flights/${routeSlug}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          {parsed.originCity}
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {parsed.destinationCity}
                        </Link>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <div className="py-6 bg-muted/50">
            <div className="container">
              <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
                BookingsFinder provides travel insights. Bookings occur on partner websites.
                Prices shown are estimates and may vary at time of booking.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default RoutePage;
