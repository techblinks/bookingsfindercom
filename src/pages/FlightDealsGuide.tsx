import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Plane, Building2, Search, Bell, ExternalLink, TrendingUp, Shield, 
  Clock, CheckCircle, HelpCircle, ArrowRight, DollarSign, Zap
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";

const GUIDE_FAQS = [
  {
    question: "What is a travel meta-search engine?",
    answer: "A meta-search engine like BookingsFinder searches and compares prices from multiple travel booking sites simultaneously. Instead of visiting each site individually, you see all available options in one place and can compare prices, times, and providers instantly.",
  },
  {
    question: "Why should I use BookingsFinder instead of booking directly?",
    answer: "BookingsFinder saves you time by comparing prices from 500+ airlines and 1M+ hotels in seconds. The same flight or hotel can have different prices on different sites, and we help you find the best deal without the hours of research.",
  },
  {
    question: "Do you charge any booking fees?",
    answer: "No, BookingsFinder is completely free to use. We earn a small commission from booking sites when you click through and complete a reservation, but this doesn't affect the price you pay.",
  },
  {
    question: "Are the prices shown accurate?",
    answer: "Prices are provided in real-time by our partner sites. While we strive for accuracy, prices can change quickly due to demand. We recommend clicking through to verify the final price before booking.",
  },
  {
    question: "What happens when I click 'View Deal'?",
    answer: "You'll be redirected to the airline, hotel, or travel agency's website where you can complete your booking directly with them. Your reservation and payment are processed by that provider, not by BookingsFinder.",
  },
  {
    question: "How do price alerts work?",
    answer: "Set up a price alert for any route and we'll monitor prices for you. When prices drop below your target or change significantly, we'll send you an email notification so you never miss a deal.",
  },
  {
    question: "Can you help with cancellations or refunds?",
    answer: "Since bookings are made directly with airlines, hotels, or travel agencies, you'll need to contact them for any cancellation or refund requests. We recommend reviewing the provider's cancellation policy before booking.",
  },
  {
    question: "Do you sell travel insurance?",
    answer: "No, we don't sell travel insurance or any travel products. We focus solely on helping you compare and find the best prices. Some booking sites may offer insurance during checkout.",
  },
];

const SEARCH_TIPS = [
  {
    icon: TrendingUp,
    title: "Be Flexible with Dates",
    description: "Flying mid-week (Tuesday-Thursday) is often cheaper than weekends. Use our flexible date search to compare prices across different days.",
  },
  {
    icon: Clock,
    title: "Book at the Right Time",
    description: "For domestic flights, book 1-3 months ahead. For international, 2-8 months is typically optimal. Last-minute deals exist but are unpredictable.",
  },
  {
    icon: Bell,
    title: "Set Price Alerts",
    description: "Track prices on your favorite routes and get notified when they drop. Perfect for flexible travelers who can wait for the best deal.",
  },
  {
    icon: Search,
    title: "Compare All Options",
    description: "Check nearby airports, consider connecting flights, and compare different booking sites. Small differences can lead to big savings.",
  },
  {
    icon: Zap,
    title: "Act Fast on Good Deals",
    description: "Great prices don't last long. When you find a deal that works, book it. Prices can increase within hours due to demand.",
  },
  {
    icon: DollarSign,
    title: "Watch for Hidden Fees",
    description: "Compare the total cost including baggage fees, seat selection, and other extras. A cheap base fare might not be the best deal overall.",
  },
];

const FlightDealsGuide = () => {
  const faqSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: GUIDE_FAQS.map(faq => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  }), []);

  const articleSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Find Cheap Flight Deals in 2026 - Complete Guide",
    description: "Learn expert tips for finding the best flight deals. Compare prices from 500+ airlines and save money on your next trip.",
    author: {
      "@type": "Organization",
      name: "BookingsFinder",
      url: "https://bookingsfinder.com",
    },
    publisher: {
      "@type": "Organization",
      name: "BookingsFinder",
      url: "https://bookingsfinder.com",
    },
    datePublished: "2026-01-01",
    dateModified: "2026-01-25",
  }), []);

  return (
    <>
      <Helmet>
        <title>How to Find Cheap Flight Deals in 2026 | Complete Guide | BookingsFinder</title>
        <meta name="description" content="Learn expert tips for finding the best flight deals in 2026. Compare prices from 500+ airlines, set price alerts, and save money on your next trip with our comprehensive guide." />
        <link rel="canonical" href="https://bookingsfinder.com/flight-deals-guide" />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border py-16 md:py-20">
            <div className="container">
              <div className="max-w-3xl mx-auto text-center">
                <div className="flex justify-center mb-4">
                  <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium">
                    <Plane className="h-4 w-4" />
                    <span>2026 Flight Deals Guide</span>
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  How to Find Cheap Flight Deals
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Expert tips and strategies for finding the best flight prices. Learn how to compare, track, and book flights at the lowest rates using BookingsFinder.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/flights">
                    <Button size="lg" className="gap-2">
                      <Search className="h-4 w-4" />
                      Search Flights Now
                    </Button>
                  </Link>
                  <Link to="/my-alerts">
                    <Button variant="outline" size="lg" className="gap-2">
                      <Bell className="h-4 w-4" />
                      Set Price Alerts
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* What is BookingsFinder */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">What is BookingsFinder?</h2>
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    BookingsFinder is a <strong className="text-foreground">travel meta-search and comparison platform</strong> that helps you find the best prices on flights and hotels. Unlike online travel agencies (OTAs) that sell travel products directly, we aggregate and compare prices from hundreds of booking sites to show you all available options in one place.
                  </p>
                  
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    Think of us as a search engine for travel deals. When you search on BookingsFinder, we query multiple airlines, travel agencies, and booking sites simultaneously, then present the results sorted by price, duration, or other factors you choose. When you find a deal you like, we redirect you to the provider's website where you complete your booking directly with them.
                  </p>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 not-prose mb-8">
                    <div className="flex items-start gap-4">
                      <Shield className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">Important Disclosure</h3>
                        <p className="text-sm text-muted-foreground">
                          <strong>BookingsFinder does not sell flights, hotels, or any travel products.</strong> We're a comparison service that helps you find the best prices. All bookings, payments, and customer service are handled by the travel provider you choose to book with. We may earn a commission when you click through and complete a booking, at no extra cost to you.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* How It Works Steps */}
                <h3 className="text-xl font-semibold mb-6">How BookingsFinder Works</h3>
                <div className="grid md:grid-cols-4 gap-4 mb-8">
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-bold">1</div>
                      <h4 className="font-semibold mb-1">Search</h4>
                      <p className="text-sm text-muted-foreground">Enter your travel dates and destination</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-bold">2</div>
                      <h4 className="font-semibold mb-1">Compare</h4>
                      <p className="text-sm text-muted-foreground">See prices from 500+ airlines instantly</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-bold">3</div>
                      <h4 className="font-semibold mb-1">Choose</h4>
                      <p className="text-sm text-muted-foreground">Pick the best deal for your needs</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-primary text-primary-foreground rounded-full flex items-center justify-center mx-auto mb-3 font-bold">4</div>
                      <h4 className="font-semibold mb-1">Book</h4>
                      <p className="text-sm text-muted-foreground">Complete booking on provider's site</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Embedded Search */}
          <section className="py-8 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-center">Try a Flight Search</h2>
                <Card>
                  <CardContent className="p-6">
                    <ModernFlightSearch />
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Search Tips */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Expert Tips for Finding Cheap Flights</h2>
                <p className="text-muted-foreground mb-8">
                  Follow these proven strategies to maximize your savings on flight bookings.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {SEARCH_TIPS.map((tip, index) => (
                    <Card key={index}>
                      <CardContent className="p-5">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                            <tip.icon className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <h3 className="font-semibold mb-1">{tip.title}</h3>
                            <p className="text-sm text-muted-foreground">{tip.description}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Detailed Guide Content */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto prose prose-lg">
                <h2 className="text-2xl font-bold mb-6">Understanding Flight Pricing</h2>
                
                <p className="text-muted-foreground leading-relaxed">
                  Flight prices are determined by complex algorithms that consider demand, competition, time until departure, day of the week, seasonality, and many other factors. Understanding these dynamics can help you find better deals.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">Best Time to Book Flights</h3>
                
                <p className="text-muted-foreground leading-relaxed mb-4">
                  There's no magic formula, but research suggests:
                </p>
                
                <ul className="text-muted-foreground space-y-2 mb-6">
                  <li><strong className="text-foreground">Domestic flights:</strong> Book 1-3 months before departure for the best balance of price and availability.</li>
                  <li><strong className="text-foreground">International flights:</strong> The sweet spot is typically 2-8 months ahead, depending on the route.</li>
                  <li><strong className="text-foreground">Peak travel seasons:</strong> Book earlier (3-6 months) for holidays and summer travel.</li>
                  <li><strong className="text-foreground">Last-minute deals:</strong> Possible but risky. Better to plan ahead unless you're very flexible.</li>
                </ul>

                <h3 className="text-xl font-semibold mt-8 mb-4">Cheapest Days to Fly</h3>
                
                <p className="text-muted-foreground leading-relaxed mb-4">
                  Generally, Tuesday, Wednesday, and Saturday are the cheapest days to fly. Friday and Sunday are typically the most expensive due to business and leisure travel patterns. However, this varies by route—always compare specific dates on BookingsFinder.
                </p>

                <h3 className="text-xl font-semibold mt-8 mb-4">How to Use Price Alerts Effectively</h3>
                
                <p className="text-muted-foreground leading-relaxed mb-4">
                  BookingsFinder's price alert feature monitors your chosen routes and notifies you when prices change. Here's how to use it effectively:
                </p>
                
                <ol className="text-muted-foreground space-y-2 mb-6">
                  <li><strong className="text-foreground">Set alerts early:</strong> Start tracking 3-6 months before your travel dates.</li>
                  <li><strong className="text-foreground">Set a target price:</strong> Research typical prices for your route and set a realistic target.</li>
                  <li><strong className="text-foreground">Be ready to book:</strong> When you get an alert for a good price, act quickly.</li>
                  <li><strong className="text-foreground">Track multiple dates:</strong> If you're flexible, set alerts for different date combinations.</li>
                </ol>

                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 not-prose mt-8">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="h-5 w-5 text-primary" />
                    <h4 className="font-semibold">Before You Book</h4>
                  </div>
                  <ul className="text-sm text-muted-foreground space-y-2">
                    <li>• Verify the final price including all taxes and fees on the booking site</li>
                    <li>• Check baggage allowance and fees for your ticket type</li>
                    <li>• Review the airline's cancellation and change policies</li>
                    <li>• Ensure passport validity and visa requirements for your destination</li>
                    <li>• Consider travel insurance for international trips</li>
                  </ul>
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
                  {GUIDE_FAQS.map((faq, index) => (
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

          {/* Related Links */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold mb-6">Explore More</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <Link to="/top-flight-destinations" className="group">
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <Plane className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Top Flight Destinations</h3>
                        <p className="text-sm text-muted-foreground">See the 20 most popular flight routes with live prices.</p>
                        <span className="text-sm text-primary mt-2 inline-flex items-center gap-1">
                          Explore <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/top-hotel-destinations" className="group">
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <Building2 className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Top Hotel Destinations</h3>
                        <p className="text-sm text-muted-foreground">Compare hotels in the world's most popular cities.</p>
                        <span className="text-sm text-primary mt-2 inline-flex items-center gap-1">
                          Explore <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/how-it-works" className="group">
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <Search className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">How It Works</h3>
                        <p className="text-sm text-muted-foreground">Learn more about BookingsFinder's comparison technology.</p>
                        <span className="text-sm text-primary mt-2 inline-flex items-center gap-1">
                          Learn more <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="py-12 bg-primary/5">
            <div className="container text-center">
              <h2 className="text-2xl font-bold mb-4">Ready to Find Your Next Flight Deal?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Compare prices from 500+ airlines and start saving on your next trip.
              </p>
              <Link to="/flights">
                <Button size="lg" className="gap-2">
                  <Search className="h-4 w-4" />
                  Search Flights Now
                </Button>
              </Link>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FlightDealsGuide;
