import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Plane, MapPin, TrendingUp, Clock, ArrowRight, Globe } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

interface DestinationRoute {
  origin: string;
  originName: string;
  destination: string;
  destinationName: string;
  price: number | null;
  isLoading: boolean;
  isCached: boolean;
}

// Extended route data for different regions
const REGIONAL_TOP_ROUTES: Record<string, Array<{ origin: string; originName: string; destination: string; destinationName: string }>> = {
  AU: [
    { origin: "SYD", originName: "Sydney", destination: "MEL", destinationName: "Melbourne" },
    { origin: "SYD", originName: "Sydney", destination: "BNE", destinationName: "Brisbane" },
    { origin: "MEL", originName: "Melbourne", destination: "SYD", destinationName: "Sydney" },
    { origin: "SYD", originName: "Sydney", destination: "PER", destinationName: "Perth" },
    { origin: "SYD", originName: "Sydney", destination: "GC", destinationName: "Gold Coast" },
    { origin: "MEL", originName: "Melbourne", destination: "BNE", destinationName: "Brisbane" },
    { origin: "SYD", originName: "Sydney", destination: "ADL", destinationName: "Adelaide" },
    { origin: "SYD", originName: "Sydney", destination: "DPS", destinationName: "Bali" },
    { origin: "MEL", originName: "Melbourne", destination: "DPS", destinationName: "Bali" },
    { origin: "SYD", originName: "Sydney", destination: "SIN", destinationName: "Singapore" },
    { origin: "SYD", originName: "Sydney", destination: "AKL", destinationName: "Auckland" },
    { origin: "MEL", originName: "Melbourne", destination: "SIN", destinationName: "Singapore" },
    { origin: "SYD", originName: "Sydney", destination: "HNL", destinationName: "Honolulu" },
    { origin: "SYD", originName: "Sydney", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "BNE", originName: "Brisbane", destination: "SYD", destinationName: "Sydney" },
    { origin: "MEL", originName: "Melbourne", destination: "PER", destinationName: "Perth" },
    { origin: "SYD", originName: "Sydney", destination: "NRT", destinationName: "Tokyo" },
    { origin: "MEL", originName: "Melbourne", destination: "AKL", destinationName: "Auckland" },
    { origin: "SYD", originName: "Sydney", destination: "LHR", destinationName: "London" },
    { origin: "PER", originName: "Perth", destination: "SYD", destinationName: "Sydney" },
  ],
  US: [
    { origin: "LAX", originName: "Los Angeles", destination: "JFK", destinationName: "New York" },
    { origin: "LAX", originName: "Los Angeles", destination: "SFO", destinationName: "San Francisco" },
    { origin: "JFK", originName: "New York", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "ORD", originName: "Chicago", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "LAX", originName: "Los Angeles", destination: "LAS", destinationName: "Las Vegas" },
    { origin: "JFK", originName: "New York", destination: "MIA", destinationName: "Miami" },
    { origin: "LAX", originName: "Los Angeles", destination: "SEA", destinationName: "Seattle" },
    { origin: "JFK", originName: "New York", destination: "LHR", destinationName: "London" },
    { origin: "LAX", originName: "Los Angeles", destination: "HNL", destinationName: "Honolulu" },
    { origin: "SFO", originName: "San Francisco", destination: "JFK", destinationName: "New York" },
    { origin: "ORD", originName: "Chicago", destination: "JFK", destinationName: "New York" },
    { origin: "DFW", originName: "Dallas", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "MIA", originName: "Miami", destination: "JFK", destinationName: "New York" },
    { origin: "LAX", originName: "Los Angeles", destination: "NRT", destinationName: "Tokyo" },
    { origin: "JFK", originName: "New York", destination: "CDG", destinationName: "Paris" },
    { origin: "LAX", originName: "Los Angeles", destination: "CUN", destinationName: "Cancun" },
    { origin: "DEN", originName: "Denver", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "SEA", originName: "Seattle", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "ATL", originName: "Atlanta", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "BOS", originName: "Boston", destination: "LAX", destinationName: "Los Angeles" },
  ],
  IN: [
    { origin: "DEL", originName: "Delhi", destination: "BOM", destinationName: "Mumbai" },
    { origin: "BOM", originName: "Mumbai", destination: "DEL", destinationName: "Delhi" },
    { origin: "DEL", originName: "Delhi", destination: "BLR", destinationName: "Bangalore" },
    { origin: "BOM", originName: "Mumbai", destination: "BLR", destinationName: "Bangalore" },
    { origin: "DEL", originName: "Delhi", destination: "GOI", destinationName: "Goa" },
    { origin: "BOM", originName: "Mumbai", destination: "GOI", destinationName: "Goa" },
    { origin: "DEL", originName: "Delhi", destination: "HYD", destinationName: "Hyderabad" },
    { origin: "BLR", originName: "Bangalore", destination: "DEL", destinationName: "Delhi" },
    { origin: "DEL", originName: "Delhi", destination: "MAA", destinationName: "Chennai" },
    { origin: "BOM", originName: "Mumbai", destination: "DXB", destinationName: "Dubai" },
    { origin: "DEL", originName: "Delhi", destination: "DXB", destinationName: "Dubai" },
    { origin: "BLR", originName: "Bangalore", destination: "BOM", destinationName: "Mumbai" },
    { origin: "DEL", originName: "Delhi", destination: "CCU", destinationName: "Kolkata" },
    { origin: "HYD", originName: "Hyderabad", destination: "DEL", destinationName: "Delhi" },
    { origin: "BOM", originName: "Mumbai", destination: "SIN", destinationName: "Singapore" },
    { origin: "DEL", originName: "Delhi", destination: "SIN", destinationName: "Singapore" },
    { origin: "BOM", originName: "Mumbai", destination: "LHR", destinationName: "London" },
    { origin: "DEL", originName: "Delhi", destination: "LHR", destinationName: "London" },
    { origin: "BOM", originName: "Mumbai", destination: "BKK", destinationName: "Bangkok" },
    { origin: "DEL", originName: "Delhi", destination: "BKK", destinationName: "Bangkok" },
  ],
  DEFAULT: [
    { origin: "LHR", originName: "London", destination: "JFK", destinationName: "New York" },
    { origin: "CDG", originName: "Paris", destination: "JFK", destinationName: "New York" },
    { origin: "LHR", originName: "London", destination: "DXB", destinationName: "Dubai" },
    { origin: "SIN", originName: "Singapore", destination: "BKK", destinationName: "Bangkok" },
    { origin: "DXB", originName: "Dubai", destination: "LHR", destinationName: "London" },
    { origin: "HKG", originName: "Hong Kong", destination: "NRT", destinationName: "Tokyo" },
    { origin: "SIN", originName: "Singapore", destination: "KUL", destinationName: "Kuala Lumpur" },
    { origin: "AMS", originName: "Amsterdam", destination: "LHR", destinationName: "London" },
    { origin: "FRA", originName: "Frankfurt", destination: "LHR", destinationName: "London" },
    { origin: "LHR", originName: "London", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "CDG", originName: "Paris", destination: "LHR", destinationName: "London" },
    { origin: "SIN", originName: "Singapore", destination: "SYD", destinationName: "Sydney" },
    { origin: "DXB", originName: "Dubai", destination: "DEL", destinationName: "Delhi" },
    { origin: "BKK", originName: "Bangkok", destination: "SIN", destinationName: "Singapore" },
    { origin: "NRT", originName: "Tokyo", destination: "LAX", destinationName: "Los Angeles" },
    { origin: "ICN", originName: "Seoul", destination: "NRT", destinationName: "Tokyo" },
    { origin: "MNL", originName: "Manila", destination: "SIN", destinationName: "Singapore" },
    { origin: "JKT", originName: "Jakarta", destination: "SIN", destinationName: "Singapore" },
    { origin: "KUL", originName: "Kuala Lumpur", destination: "SIN", destinationName: "Singapore" },
    { origin: "DPS", originName: "Bali", destination: "SIN", destinationName: "Singapore" },
  ],
};

// SEO FAQs for the page
const FLIGHT_FAQS = [
  {
    question: "How do I find the cheapest flights?",
    answer: "To find the cheapest flights, we recommend booking 4-6 weeks in advance for domestic flights and 2-3 months for international. Use our comparison tool to see prices across multiple airlines, and consider flexible dates - flying mid-week (Tuesday/Wednesday) is often cheaper than weekends."
  },
  {
    question: "What is the best time to book flights?",
    answer: "The best time to book depends on your destination. For domestic flights, booking 1-3 months ahead typically offers the best prices. For international flights, 2-4 months is ideal. Avoid booking too close to your travel date as prices usually increase."
  },
  {
    question: "Are flight prices shown the final price?",
    answer: "The prices displayed on BookingsFinder are starting prices from our partner airlines and travel providers. Final prices may vary based on availability, selected travel dates, and any additional services you choose when booking with our partners."
  },
  {
    question: "How does BookingsFinder work?",
    answer: "BookingsFinder is a travel meta-search platform that compares flight prices across hundreds of airlines and booking sites. We help you find the best deals, then redirect you to the airline or travel provider's website where you complete your booking directly with them."
  },
  {
    question: "Can I set price alerts for flight routes?",
    answer: "Yes! BookingsFinder offers free price alerts. Simply search for your desired route and click the bell icon to set up an alert. We'll notify you by email when prices drop for your selected route."
  },
];

const TopFlightDestinations = () => {
  const { geoData, loading: geoLoading, regionConfig } = useGeoLocation();
  const [routes, setRoutes] = useState<DestinationRoute[]>([]);
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);

  // Get routes based on user's country
  const getRoutesForRegion = (countryCode: string) => {
    return REGIONAL_TOP_ROUTES[countryCode] || REGIONAL_TOP_ROUTES.DEFAULT;
  };

  // Calculate departure date (2 weeks from now)
  const getDepartureDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 14);
    return date.toISOString().split('T')[0];
  };

  // Calculate return date (3 weeks from now)
  const getReturnDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 21);
    return date.toISOString().split('T')[0];
  };

  // Initialize routes when geo data is available
  useEffect(() => {
    if (!geoLoading && geoData) {
      const countryCode = geoData.countryCode || 'DEFAULT';
      const regionRoutes = getRoutesForRegion(countryCode);
      
      setRoutes(regionRoutes.map(route => ({
        ...route,
        price: null,
        isLoading: true,
        isCached: false,
      })));
    }
  }, [geoLoading, geoData]);

  // Fetch prices for all routes
  useEffect(() => {
    if (routes.length === 0) return;

    const fetchPrices = async () => {
      setIsLoadingPrices(true);
      const departureDate = getDepartureDate();
      const returnDate = getReturnDate();
      const currency = regionConfig?.currency || 'USD';

      try {
        // Batch fetch prices
        const routeRequests = routes.map(r => ({
          origin: r.origin,
          destination: r.destination,
          departureDate,
          returnDate,
          currency,
        }));

        const { data, error } = await supabase.functions.invoke('get-route-prices', {
          body: { routes: routeRequests },
        });

        if (!error && data?.prices) {
          setRoutes(prev => prev.map((route, index) => ({
            ...route,
            price: data.prices[index]?.price || null,
            isLoading: false,
            isCached: data.prices[index]?.cached || false,
          })));
        } else {
          // Set all as not loading even if error
          setRoutes(prev => prev.map(route => ({
            ...route,
            isLoading: false,
          })));
        }
      } catch (err) {
        console.error("Error fetching route prices:", err);
        setRoutes(prev => prev.map(route => ({
          ...route,
          isLoading: false,
        })));
      } finally {
        setIsLoadingPrices(false);
      }
    };

    fetchPrices();
  }, [routes.length > 0, regionConfig?.currency]);

  // Generate search URL for a route
  const getSearchUrl = (route: DestinationRoute) => {
    const params = new URLSearchParams({
      origin: route.origin,
      destination: route.destination,
      departureDate: getDepartureDate(),
      returnDate: getReturnDate(),
      passengers: '1',
      cabinClass: 'economy',
    });
    return `/flights?${params.toString()}`;
  };

  // Format price with currency
  const formatPrice = (price: number | null) => {
    if (price === null) return 'View prices';
    const symbol = regionConfig?.currencySymbol || '$';
    return `${symbol}${price.toLocaleString()}`;
  };

  // Determine user's location for dynamic content
  const userCity = geoData?.city || 'your location';
  const userCountry = geoData?.country || 'your country';

  // Generate JSON-LD schemas
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FLIGHT_FAQS.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: `Top 20 Flight Destinations from ${userCity}`,
    description: `Discover the top 20 most popular flight destinations from ${userCity}. Compare prices across airlines and find the best deals.`,
    url: "https://bookingsfinder.com/top-flight-destinations",
    mainEntity: {
      "@type": "ItemList",
      name: "Top Flight Destinations",
      numberOfItems: 20,
      itemListElement: routes.slice(0, 20).map((route, index) => ({
          "@type": "ListItem",
          position: index + 1,
          item: {
            "@type": "Flight",
            name: `${route.originName} to ${route.destinationName}`,
            departureAirport: { "@type": "Airport", iataCode: route.origin, name: route.originName },
            arrivalAirport: { "@type": "Airport", iataCode: route.destination, name: route.destinationName },
            ...(route.price && {
              offers: {
                "@type": "Offer",
                price: route.price,
                priceCurrency: regionConfig?.currency || 'USD',
              },
            }),
          },
        })),
    },
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Top 20 Flight Destinations from {userCity} | BookingsFinder</title>
        <meta 
          name="description" 
          content={`Compare prices for the top 20 most popular flight routes from ${userCity}. Find cheap flights, set price alerts, and discover the best deals on flights to popular destinations.`}
        />
        <meta name="keywords" content={`cheap flights, flight deals, ${userCity} flights, flight comparison, airline tickets, travel deals`} />
        <link rel="canonical" href="https://bookingsfinder.com/top-flight-destinations" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-primary/10 to-background py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto text-center">
              <Badge variant="secondary" className="mb-4">
                <Globe className="h-3 w-3 mr-1" />
                Personalized for {userCountry}
              </Badge>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                Top 20 Flight Destinations from {userCity}
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Discover the most popular flight routes from your location. Compare prices across airlines and find the best deals for your next trip.
              </p>
            </div>
          </div>
        </section>

        {/* Routes Grid */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground">Popular Routes</h2>
                <p className="text-muted-foreground">Prices shown are starting from, for round-trip flights</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                Prices updated hourly
              </div>
            </div>

            {geoLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <Skeleton key={i} className="h-32 rounded-xl" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {routes.map((route, index) => (
                  <Link key={`${route.origin}-${route.destination}-${index}`} to={getSearchUrl(route)}>
                    <Card className="h-full hover:shadow-lg transition-all duration-200 hover:-translate-y-1 cursor-pointer group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-xs font-bold text-primary">#{index + 1}</span>
                            </div>
                            <Plane className="h-4 w-4 text-primary" />
                          </div>
                          {route.isCached && (
                            <Badge variant="outline" className="text-xs">Live</Badge>
                          )}
                        </div>
                        
                        <div className="space-y-1 mb-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{route.originName}</span>
                            <span className="text-muted-foreground">→</span>
                            <span className="text-sm font-medium">{route.destinationName}</span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {route.origin} → {route.destination}
                          </div>
                        </div>

                        <div className="flex items-center justify-between">
                          {route.isLoading ? (
                            <Skeleton className="h-6 w-20" />
                          ) : (
                            <span className="text-lg font-bold text-primary">
                              {formatPrice(route.price)}
                            </span>
                          )}
                          <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* SEO Content Section */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="max-w-4xl mx-auto prose prose-slate dark:prose-invert">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Finding the Best Flight Deals from {userCity}
              </h2>
              
              <p className="text-muted-foreground leading-relaxed mb-6">
                Whether you're planning a quick domestic getaway or an international adventure, finding affordable flights is key to maximizing your travel budget. At BookingsFinder, we've analyzed millions of flight searches to bring you the top 20 most popular destinations from {userCity}, complete with real-time pricing from leading airlines and travel providers.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-4">
                Why Compare Flight Prices?
              </h3>
              
              <p className="text-muted-foreground leading-relaxed mb-6">
                Flight prices can vary significantly between airlines and booking platforms - sometimes by hundreds of dollars for the exact same route. Our meta-search technology scans multiple sources simultaneously, ensuring you see the full range of options available. This transparency helps travelers make informed decisions and often leads to substantial savings.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-4">
                Tips for Booking Cheap Flights
              </h3>
              
              <ul className="list-disc list-inside text-muted-foreground space-y-2 mb-6">
                <li><strong>Be flexible with dates:</strong> Flying mid-week (Tuesday to Thursday) is typically cheaper than weekends.</li>
                <li><strong>Book in advance:</strong> For domestic flights, 1-3 months ahead is ideal. For international, aim for 2-4 months.</li>
                <li><strong>Set price alerts:</strong> Use our free alert feature to track price drops on your preferred routes.</li>
                <li><strong>Consider nearby airports:</strong> Sometimes flying into a neighboring city can save significantly.</li>
                <li><strong>Compare across airlines:</strong> Budget carriers often have competitive base fares, but watch for add-on fees.</li>
              </ul>

              <h3 className="text-xl font-semibold text-foreground mb-4">
                Popular Destinations from {userCountry}
              </h3>
              
              <p className="text-muted-foreground leading-relaxed mb-6">
                The routes shown above represent the most searched flight paths from your region. These include a mix of domestic routes perfect for quick trips, regional destinations for longer getaways, and international hotspots for those seeking adventure abroad. Each destination has been selected based on search volume, booking patterns, and traveler feedback.
              </p>

              <h3 className="text-xl font-semibold text-foreground mb-4">
                How Our Price Comparison Works
              </h3>
              
              <p className="text-muted-foreground leading-relaxed mb-6">
                BookingsFinder aggregates flight information from hundreds of sources, including major airlines, low-cost carriers, and online travel agencies. When you click "View Deals," you're redirected directly to the provider's website where you can complete your booking. We don't sell tickets ourselves - we simply help you find and compare the best options available.
              </p>

              <div className="bg-primary/5 rounded-lg p-6 mt-8">
                <div className="flex items-start gap-4">
                  <TrendingUp className="h-6 w-6 text-primary shrink-0 mt-1" />
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Pro Tip: Set Up Price Alerts</h4>
                    <p className="text-muted-foreground text-sm">
                      Don't miss out on price drops! Click on any route above, then use the bell icon to create a free price alert. We'll email you when prices change for your selected route.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground text-center mb-8">
                Frequently Asked Questions
              </h2>
              
              <Accordion type="single" collapsible className="w-full">
                {FLIGHT_FAQS.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`}>
                    <AccordionTrigger className="text-left text-foreground hover:text-primary">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-12 md:py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">
              Ready to Find Your Perfect Flight?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Start comparing prices now and discover why millions of travelers trust BookingsFinder to find the best deals.
            </p>
            <Link to="/">
              <Button size="lg" variant="secondary" className="gap-2">
                <Plane className="h-5 w-5" />
                Search All Flights
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TopFlightDestinations;
