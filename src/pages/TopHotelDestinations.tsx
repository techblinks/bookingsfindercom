import { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Star, MapPin, TrendingUp, Search, ExternalLink, HelpCircle } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useGeoLocation } from "@/hooks/useGeoLocation";
import { addDays, format } from "date-fns";

interface HotelDestination {
  city: string;
  country: string;
  countryCode: string;
  avgPrice: number;
  rating: number;
  description: string;
}

// Regional hotel destination data
const REGIONAL_HOTEL_DESTINATIONS: Record<string, HotelDestination[]> = {
  AU: [
    { city: "Bali", country: "Indonesia", countryCode: "ID", avgPrice: 85, rating: 4.5, description: "Tropical paradise with stunning beaches and temples" },
    { city: "Tokyo", country: "Japan", countryCode: "JP", avgPrice: 120, rating: 4.7, description: "Vibrant metropolis blending tradition and modernity" },
    { city: "Bangkok", country: "Thailand", countryCode: "TH", avgPrice: 55, rating: 4.4, description: "Cultural hub with amazing street food and temples" },
    { city: "Singapore", country: "Singapore", countryCode: "SG", avgPrice: 180, rating: 4.8, description: "Modern city-state with world-class attractions" },
    { city: "Sydney", country: "Australia", countryCode: "AU", avgPrice: 195, rating: 4.6, description: "Iconic harbour city with beautiful beaches" },
    { city: "Melbourne", country: "Australia", countryCode: "AU", avgPrice: 165, rating: 4.5, description: "Cultural capital with vibrant arts scene" },
    { city: "Auckland", country: "New Zealand", countryCode: "NZ", avgPrice: 145, rating: 4.4, description: "City of sails with stunning natural beauty" },
    { city: "Queenstown", country: "New Zealand", countryCode: "NZ", avgPrice: 175, rating: 4.7, description: "Adventure capital surrounded by mountains" },
    { city: "Phuket", country: "Thailand", countryCode: "TH", avgPrice: 65, rating: 4.3, description: "Beach paradise with crystal-clear waters" },
    { city: "Ho Chi Minh City", country: "Vietnam", countryCode: "VN", avgPrice: 45, rating: 4.2, description: "Dynamic city with rich history and cuisine" },
    { city: "Hanoi", country: "Vietnam", countryCode: "VN", avgPrice: 40, rating: 4.3, description: "Historic capital with charming old quarter" },
    { city: "Seoul", country: "South Korea", countryCode: "KR", avgPrice: 110, rating: 4.5, description: "Tech-forward city with ancient palaces" },
    { city: "Kuala Lumpur", country: "Malaysia", countryCode: "MY", avgPrice: 70, rating: 4.4, description: "Diverse city with iconic twin towers" },
    { city: "Manila", country: "Philippines", countryCode: "PH", avgPrice: 60, rating: 4.1, description: "Gateway to stunning Philippine islands" },
    { city: "Hong Kong", country: "Hong Kong", countryCode: "HK", avgPrice: 150, rating: 4.6, description: "Vibrant city with amazing skyline views" },
    { city: "Taipei", country: "Taiwan", countryCode: "TW", avgPrice: 90, rating: 4.4, description: "Modern city with night markets and temples" },
    { city: "Dubai", country: "UAE", countryCode: "AE", avgPrice: 140, rating: 4.7, description: "Luxury destination with iconic architecture" },
    { city: "Fiji", country: "Fiji", countryCode: "FJ", avgPrice: 200, rating: 4.6, description: "Tropical island paradise in the Pacific" },
    { city: "Maldives", country: "Maldives", countryCode: "MV", avgPrice: 350, rating: 4.9, description: "Overwater bungalows in turquoise waters" },
    { city: "Colombo", country: "Sri Lanka", countryCode: "LK", avgPrice: 55, rating: 4.2, description: "Coastal city with colonial charm" },
  ],
  US: [
    { city: "Cancun", country: "Mexico", countryCode: "MX", avgPrice: 120, rating: 4.5, description: "Caribbean beaches with all-inclusive resorts" },
    { city: "Paris", country: "France", countryCode: "FR", avgPrice: 180, rating: 4.7, description: "City of lights with iconic landmarks" },
    { city: "London", country: "UK", countryCode: "GB", avgPrice: 200, rating: 4.6, description: "Historic city with world-class museums" },
    { city: "Rome", country: "Italy", countryCode: "IT", avgPrice: 140, rating: 4.5, description: "Ancient history meets Italian charm" },
    { city: "Barcelona", country: "Spain", countryCode: "ES", avgPrice: 130, rating: 4.6, description: "Gaudí architecture and Mediterranean beaches" },
    { city: "Amsterdam", country: "Netherlands", countryCode: "NL", avgPrice: 170, rating: 4.5, description: "Canals, museums, and vibrant nightlife" },
    { city: "Tokyo", country: "Japan", countryCode: "JP", avgPrice: 150, rating: 4.7, description: "Unique blend of ancient and ultra-modern" },
    { city: "Las Vegas", country: "USA", countryCode: "US", avgPrice: 95, rating: 4.3, description: "Entertainment capital of the world" },
    { city: "Miami", country: "USA", countryCode: "US", avgPrice: 180, rating: 4.4, description: "Art Deco architecture and beautiful beaches" },
    { city: "New York City", country: "USA", countryCode: "US", avgPrice: 250, rating: 4.6, description: "The city that never sleeps" },
    { city: "Orlando", country: "USA", countryCode: "US", avgPrice: 110, rating: 4.4, description: "Theme park capital with family fun" },
    { city: "Punta Cana", country: "Dominican Republic", countryCode: "DO", avgPrice: 100, rating: 4.3, description: "All-inclusive Caribbean paradise" },
    { city: "San Juan", country: "Puerto Rico", countryCode: "PR", avgPrice: 140, rating: 4.4, description: "Historic old town and tropical beaches" },
    { city: "Aruba", country: "Aruba", countryCode: "AW", avgPrice: 180, rating: 4.5, description: "One happy island with perfect weather" },
    { city: "Turks & Caicos", country: "Turks and Caicos", countryCode: "TC", avgPrice: 350, rating: 4.8, description: "Pristine beaches and luxury resorts" },
    { city: "Costa Rica", country: "Costa Rica", countryCode: "CR", avgPrice: 110, rating: 4.4, description: "Eco-tourism and adventure activities" },
    { city: "Iceland", country: "Iceland", countryCode: "IS", avgPrice: 200, rating: 4.6, description: "Northern lights and dramatic landscapes" },
    { city: "Dublin", country: "Ireland", countryCode: "IE", avgPrice: 160, rating: 4.4, description: "Historic pubs and friendly culture" },
    { city: "Lisbon", country: "Portugal", countryCode: "PT", avgPrice: 110, rating: 4.5, description: "Charming city with historic trams" },
    { city: "Prague", country: "Czech Republic", countryCode: "CZ", avgPrice: 80, rating: 4.5, description: "Fairy-tale architecture and great beer" },
  ],
  DEFAULT: [
    { city: "Paris", country: "France", countryCode: "FR", avgPrice: 180, rating: 4.7, description: "City of lights with iconic landmarks" },
    { city: "Tokyo", country: "Japan", countryCode: "JP", avgPrice: 120, rating: 4.7, description: "Vibrant metropolis blending tradition and modernity" },
    { city: "Bali", country: "Indonesia", countryCode: "ID", avgPrice: 85, rating: 4.5, description: "Tropical paradise with stunning beaches and temples" },
    { city: "London", country: "UK", countryCode: "GB", avgPrice: 200, rating: 4.6, description: "Historic city with world-class museums" },
    { city: "Barcelona", country: "Spain", countryCode: "ES", avgPrice: 130, rating: 4.6, description: "Gaudí architecture and Mediterranean beaches" },
    { city: "Dubai", country: "UAE", countryCode: "AE", avgPrice: 140, rating: 4.7, description: "Luxury destination with iconic architecture" },
    { city: "Rome", country: "Italy", countryCode: "IT", avgPrice: 140, rating: 4.5, description: "Ancient history meets Italian charm" },
    { city: "Bangkok", country: "Thailand", countryCode: "TH", avgPrice: 55, rating: 4.4, description: "Cultural hub with amazing street food" },
    { city: "New York City", country: "USA", countryCode: "US", avgPrice: 250, rating: 4.6, description: "The city that never sleeps" },
    { city: "Singapore", country: "Singapore", countryCode: "SG", avgPrice: 180, rating: 4.8, description: "Modern city-state with attractions" },
    { city: "Amsterdam", country: "Netherlands", countryCode: "NL", avgPrice: 170, rating: 4.5, description: "Canals, museums, and culture" },
    { city: "Sydney", country: "Australia", countryCode: "AU", avgPrice: 195, rating: 4.6, description: "Iconic harbour and beaches" },
    { city: "Maldives", country: "Maldives", countryCode: "MV", avgPrice: 350, rating: 4.9, description: "Overwater bungalows paradise" },
    { city: "Phuket", country: "Thailand", countryCode: "TH", avgPrice: 65, rating: 4.3, description: "Beach paradise with clear waters" },
    { city: "Prague", country: "Czech Republic", countryCode: "CZ", avgPrice: 80, rating: 4.5, description: "Fairy-tale architecture" },
    { city: "Cancun", country: "Mexico", countryCode: "MX", avgPrice: 120, rating: 4.5, description: "Caribbean beaches and resorts" },
    { city: "Istanbul", country: "Turkey", countryCode: "TR", avgPrice: 75, rating: 4.4, description: "Where East meets West" },
    { city: "Lisbon", country: "Portugal", countryCode: "PT", avgPrice: 110, rating: 4.5, description: "Charming coastal capital" },
    { city: "Seoul", country: "South Korea", countryCode: "KR", avgPrice: 110, rating: 4.5, description: "Tech-forward with palaces" },
    { city: "Marrakech", country: "Morocco", countryCode: "MA", avgPrice: 70, rating: 4.3, description: "Exotic souks and riads" },
  ],
};

const HOTEL_FAQS = [
  {
    question: "How does BookingsFinder find hotel deals?",
    answer: "We search and compare prices from hundreds of hotel booking sites, online travel agencies, and direct hotel websites simultaneously. Our technology aggregates results to show you the best available rates for your chosen destination and dates.",
  },
  {
    question: "Do you book hotels directly?",
    answer: "No, BookingsFinder is a comparison and meta-search platform. We help you find and compare hotel prices, then redirect you to the booking site or hotel's website where you complete your reservation directly with them.",
  },
  {
    question: "Are the prices shown guaranteed?",
    answer: "Prices are provided in real-time by our partner sites and are subject to change. We recommend clicking through to verify the final price and complete your booking promptly when you find a good deal.",
  },
  {
    question: "How can I get the best hotel deal?",
    answer: "Compare prices across multiple dates if your schedule is flexible. Book in advance for popular destinations, consider mid-week stays for better rates, and sign up for price alerts to get notified when prices drop.",
  },
  {
    question: "What should I check before booking a hotel?",
    answer: "Review the cancellation policy, check if breakfast or parking is included, read recent guest reviews, verify the location on a map, and confirm any additional fees or taxes that may apply.",
  },
];

const TopHotelDestinations = () => {
  const { geoData, loading: geoLoading } = useGeoLocation();
  const countryCode = geoData?.countryCode || "DEFAULT";
  const [destinations, setDestinations] = useState<HotelDestination[]>([]);

  const getCheckInDate = () => format(addDays(new Date(), 30), "yyyy-MM-dd");
  const getCheckOutDate = () => format(addDays(new Date(), 33), "yyyy-MM-dd");

  useEffect(() => {
    if (!geoLoading) {
      const regionDestinations = REGIONAL_HOTEL_DESTINATIONS[countryCode] || REGIONAL_HOTEL_DESTINATIONS.DEFAULT;
      setDestinations(regionDestinations);
    }
  }, [countryCode, geoLoading]);

  const getSearchUrl = (destination: HotelDestination) => {
    const params = new URLSearchParams({
      destination: destination.city,
      checkIn: getCheckInDate(),
      checkOut: getCheckOutDate(),
      guests: "2",
      rooms: "1",
    });
    return `/hotels?${params.toString()}`;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const faqSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOTEL_FAQS.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }), []);

  const pageSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Top 20 Hotel Destinations 2026",
    description: "Discover the best hotel destinations worldwide with price comparisons from hundreds of booking sites.",
    url: "https://bookingsfinder.com/top-hotel-destinations",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: 20,
      itemListElement: destinations.slice(0, 20).map((dest, index) => ({
        "@type": "ListItem",
        position: index + 1,
        item: {
          "@type": "Hotel",
          name: `Hotels in ${dest.city}`,
          address: {
            "@type": "PostalAddress",
            addressCountry: dest.countryCode,
            addressLocality: dest.city,
          },
        },
      })),
    },
  }), [destinations]);

  return (
    <>
      <Helmet>
        <title>Top 20 Hotel Destinations 2026 | Best Places to Stay | BookingsFinder</title>
        <meta name="description" content="Discover the top 20 hotel destinations for 2026. Compare prices from 1M+ hotels worldwide and find the best deals on accommodation in popular cities." />
        <link rel="canonical" href="https://bookingsfinder.com/top-hotel-destinations" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(pageSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border py-16 md:py-20">
            <div className="container text-center">
              <div className="flex justify-center mb-4">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                  <Building2 className="h-4 w-4" />
                  <span>2026 Hotel Guide</span>
                </div>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold mb-6">
                Top 20 Hotel Destinations
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-8">
                Compare hotel prices from over 1 million properties worldwide. Find the best accommodation deals personalized for travelers from your region.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/hotels">
                  <Button size="lg" className="gap-2">
                    <Search className="h-4 w-4" />
                    Search All Hotels
                  </Button>
                </Link>
                <Link to="/my-alerts">
                  <Button variant="outline" size="lg">
                    Set Price Alerts
                  </Button>
                </Link>
              </div>
            </div>
          </section>

          {/* Destinations Grid */}
          <section className="py-12 md:py-16">
            <div className="container">
              <h2 className="text-2xl font-bold mb-2">Popular Hotel Destinations</h2>
              <p className="text-muted-foreground mb-8">
                {geoLoading ? "Loading personalized recommendations..." : "Curated destinations based on your location with average nightly rates."}
              </p>

              {geoLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Array.from({ length: 20 }).map((_, i) => (
                    <Card key={i}>
                      <CardContent className="p-4">
                        <Skeleton className="h-5 w-3/4 mb-2" />
                        <Skeleton className="h-4 w-1/2 mb-3" />
                        <Skeleton className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {destinations.map((dest, index) => (
                    <Card key={index} className="hover:border-primary/50 hover:shadow-md transition-all group">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                              {dest.city}
                            </h3>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {dest.country}
                            </p>
                          </div>
                          <div className="flex items-center gap-1 text-sm bg-primary/10 text-primary px-2 py-0.5 rounded">
                            <Star className="h-3 w-3 fill-current" />
                            {dest.rating}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                          {dest.description}
                        </p>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-xs text-muted-foreground">From</span>
                            <p className="font-bold text-primary">{formatPrice(dest.avgPrice)}<span className="text-xs font-normal text-muted-foreground">/night</span></p>
                          </div>
                          <Link to={getSearchUrl(dest)}>
                            <Button size="sm" variant="outline" className="gap-1">
                              Compare <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>

          {/* SEO Content Section */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto prose prose-lg">
                <h2 className="text-2xl font-bold mb-6">How to Find the Best Hotel Deals in 2026</h2>
                
                <p className="text-muted-foreground leading-relaxed">
                  Finding the perfect hotel at the best price doesn't have to be stressful. BookingsFinder compares prices from over 1 million hotels worldwide, including major booking sites like Booking.com, Expedia, Hotels.com, Agoda, and direct hotel websites. Our comparison technology helps you see all available options in one place, saving you hours of research.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">Tips for Booking Hotels at the Best Price</h3>
                
                <div className="grid md:grid-cols-2 gap-6 not-prose">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <TrendingUp className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Book in Advance</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        For popular destinations, booking 2-3 months ahead typically offers the best rates and availability.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Search className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Compare Multiple Sites</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        The same hotel can have different prices on different sites. BookingsFinder shows you all options.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Building2 className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Consider Mid-Week Stays</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Tuesday, Wednesday, and Thursday nights are often cheaper than weekend stays.
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3 mb-2">
                        <Star className="h-5 w-5 text-primary" />
                        <h4 className="font-semibold">Check Reviews</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Read recent guest reviews to ensure the hotel meets your expectations before booking.
                      </p>
                    </CardContent>
                  </Card>
                </div>

                <h3 className="text-xl font-semibold mt-8 mb-4">Understanding Hotel Pricing</h3>
                
                <p className="text-muted-foreground leading-relaxed">
                  Hotel prices fluctuate based on demand, seasonality, local events, and how far in advance you book. The prices shown on BookingsFinder are starting rates from our partner sites and may vary based on your specific dates, room type, and number of guests. We always recommend clicking through to verify the final price and check what's included (breakfast, parking, etc.) before completing your reservation.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">Popular Hotel Types to Consider</h3>
                
                <ul className="text-muted-foreground space-y-2">
                  <li><strong className="text-foreground">Luxury Hotels (5-star):</strong> Premium amenities, exceptional service, often with spas, fine dining, and prime locations.</li>
                  <li><strong className="text-foreground">Boutique Hotels:</strong> Unique, stylish properties with personalized service and distinctive character.</li>
                  <li><strong className="text-foreground">Business Hotels:</strong> Convenient locations with work-friendly amenities like meeting rooms and fast WiFi.</li>
                  <li><strong className="text-foreground">Resort Hotels:</strong> All-inclusive or amenity-rich properties ideal for vacation stays.</li>
                  <li><strong className="text-foreground">Budget Hotels:</strong> Affordable options that provide comfortable, no-frills accommodation.</li>
                </ul>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mt-8 not-prose">
                  <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">Please Note:</strong> BookingsFinder is a travel comparison platform. We do not book hotels or process payments. When you find a hotel you like, we redirect you to the booking site or hotel's website where you complete your reservation directly with them. For booking inquiries, cancellations, or refunds, please contact the booking provider directly.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  {HOTEL_FAQS.map((faq, index) => (
                    <AccordionItem key={index} value={`faq-${index}`}>
                      <AccordionTrigger className="text-left font-medium">
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
          <section className="py-12 bg-primary/5">
            <div className="container text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Find Your Perfect Hotel?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Compare prices from over 1 million hotels and find the best deals for your next trip.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/hotels">
                  <Button size="lg" className="gap-2">
                    <Search className="h-4 w-4" />
                    Compare Hotel Prices
                  </Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="outline" size="lg">
                    Learn How It Works
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TopHotelDestinations;
