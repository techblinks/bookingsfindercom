import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building2, Search, Star, MapPin, TrendingUp, Clock, 
  CheckCircle, HelpCircle, ArrowRight, DollarSign, Wifi, Coffee
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ModernHotelSearch from "@/components/search/ModernHotelSearch";

const HOTEL_GUIDE_FAQS = [
  {
    question: "How does BookingsFinder find hotel prices?",
    answer: "We search and compare prices from major booking sites including Booking.com, Expedia, Hotels.com, Agoda, and direct hotel websites. Our technology aggregates results to show you the best available rates from multiple sources.",
  },
  {
    question: "Does BookingsFinder book hotels directly?",
    answer: "No, we're a comparison platform. We show you prices from various booking sites and hotels, then redirect you to their website to complete your reservation. Your booking is directly with that provider.",
  },
  {
    question: "Why are there different prices for the same hotel?",
    answer: "Different booking sites negotiate different rates with hotels. They also have different fee structures and may include different amenities. That's why comparing prices across multiple sites can save you money.",
  },
  {
    question: "How do I know if a hotel deal is good?",
    answer: "Check the average price for that hotel across multiple dates. Look at what's included (breakfast, cancellation policy). Read recent guest reviews. Compare with similar hotels in the area. Use our price alerts to track rates over time.",
  },
  {
    question: "What should I look for in hotel reviews?",
    answer: "Focus on recent reviews (within 6 months), look for patterns in feedback, check reviews from travelers similar to you (business, family, solo), and pay attention to comments about cleanliness, location, and service.",
  },
  {
    question: "When is the best time to book hotels?",
    answer: "For popular destinations, book 2-4 weeks ahead for best prices and availability. For major events or peak seasons, book 2-3 months ahead. Last-minute deals exist but availability may be limited.",
  },
  {
    question: "What if I need to cancel my hotel reservation?",
    answer: "Cancellation policies are set by each hotel or booking site. Check the policy before booking—many offer free cancellation up to 24-48 hours before check-in. For cancellation issues, contact the booking provider directly.",
  },
  {
    question: "Are hotel prices on BookingsFinder final?",
    answer: "Prices shown are provided by our partner sites and may not include all taxes and fees. Always verify the final total on the booking site before completing your reservation.",
  },
];

const HOTEL_TIPS = [
  {
    icon: DollarSign,
    title: "Compare Total Costs",
    description: "Look beyond the nightly rate. Check for resort fees, parking charges, and whether breakfast or WiFi is included.",
  },
  {
    icon: TrendingUp,
    title: "Book Refundable When Unsure",
    description: "If plans might change, book a refundable rate. You can often find a cheaper non-refundable rate closer to your trip.",
  },
  {
    icon: MapPin,
    title: "Check the Location",
    description: "A cheaper hotel far from attractions might cost more in transportation. Check the map and transit options.",
  },
  {
    icon: Star,
    title: "Read Recent Reviews",
    description: "Hotels can change quickly. Focus on reviews from the past 3-6 months to get an accurate picture.",
  },
  {
    icon: Clock,
    title: "Consider Check-in Times",
    description: "Early arrivals or late check-outs may incur fees. Some hotels offer free early check-in if rooms are available.",
  },
  {
    icon: Wifi,
    title: "Check Amenities",
    description: "Confirm WiFi is free (not all hotels include it), and check for gym, pool, or spa access if important to you.",
  },
];

const HOTEL_TYPES = [
  {
    name: "Luxury Hotels (5-Star)",
    description: "Premium properties with exceptional service, fine dining, spas, and prime locations. Expect personalized service and high-end amenities.",
    priceRange: "$$$$$",
    bestFor: "Special occasions, business travelers, luxury seekers",
  },
  {
    name: "Boutique Hotels",
    description: "Unique, independently-owned properties with distinctive character and personalized service. Often feature trendy design and local flair.",
    priceRange: "$$$-$$$$",
    bestFor: "Design lovers, couples, travelers seeking unique experiences",
  },
  {
    name: "Business Hotels",
    description: "Professional amenities like meeting rooms, business centers, and reliable WiFi. Convenient locations near business districts.",
    priceRange: "$$$",
    bestFor: "Business travelers, conferences, professionals",
  },
  {
    name: "Resort Hotels",
    description: "Full-service properties with multiple restaurants, pools, activities, and often all-inclusive options. Destinations in themselves.",
    priceRange: "$$$-$$$$$",
    bestFor: "Families, vacation travelers, beach destinations",
  },
  {
    name: "Mid-Range Hotels",
    description: "Reliable comfort with essential amenities at reasonable prices. Well-known chains offer consistency across locations.",
    priceRange: "$$-$$$",
    bestFor: "Most travelers, families, value seekers",
  },
  {
    name: "Budget Hotels",
    description: "Basic, clean accommodation at affordable prices. May have fewer amenities but meet essential needs.",
    priceRange: "$-$$",
    bestFor: "Budget travelers, short stays, backpackers",
  },
];

const HotelBookingGuide = () => {
  const faqSchema = useMemo(() => ({
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOTEL_GUIDE_FAQS.map(faq => ({
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
    headline: "Hotel Booking Guide 2026 - How to Find the Best Deals",
    description: "Complete guide to finding the best hotel deals. Learn how to compare prices, read reviews, and book with confidence.",
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
        <title>Hotel Booking Guide 2026 | How to Find Best Hotel Deals | BookingsFinder</title>
        <meta name="description" content="Complete guide to finding the best hotel deals in 2026. Learn how to compare prices from 1M+ hotels, read reviews effectively, and book with confidence." />
        <link rel="canonical" href="https://bookingsfinder.com/hotel-booking-guide" />
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
                    <Building2 className="h-4 w-4" />
                    <span>2026 Hotel Guide</span>
                  </div>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold mb-6">
                  Hotel Booking Guide
                </h1>
                <p className="text-lg text-muted-foreground mb-8">
                  Everything you need to know about finding, comparing, and booking the best hotels. Tips from industry experts to help you save money and find the perfect accommodation.
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  <Link to="/hotels">
                    <Button size="lg" className="gap-2">
                      <Search className="h-4 w-4" />
                      Compare Hotels Now
                    </Button>
                  </Link>
                  <Link to="/top-hotel-destinations">
                    <Button variant="outline" size="lg">
                      Top Destinations
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* What is BookingsFinder for Hotels */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">How BookingsFinder Helps You Find Hotels</h2>
                
                <div className="prose prose-lg max-w-none">
                  <p className="text-muted-foreground leading-relaxed mb-4">
                    BookingsFinder compares hotel prices from over <strong className="text-foreground">1 million properties worldwide</strong> across major booking platforms including Booking.com, Expedia, Hotels.com, Agoda, and many others. Instead of checking each site individually, you see all available options in one search.
                  </p>
                  
                  <p className="text-muted-foreground leading-relaxed mb-6">
                    The same hotel room can have different prices on different booking sites due to their individual agreements with hotels and fee structures. By comparing across multiple sites, you can often find significant savings—sometimes 20-30% or more on the same room.
                  </p>

                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 not-prose mb-8">
                    <div className="flex items-start gap-4">
                      <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                      <div>
                        <h3 className="font-semibold text-foreground mb-2">How It Works</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          When you search for hotels on BookingsFinder, we query multiple booking sites and aggregate the results. When you find a hotel you like, clicking "View Deal" takes you directly to that booking site where you complete your reservation and payment with them—not with us.
                        </p>
                        <p className="text-sm text-muted-foreground">
                          <strong>Important:</strong> BookingsFinder doesn't book hotels, process payments, or handle customer service for reservations. We're a comparison tool that helps you find the best prices before you book elsewhere.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Embedded Search */}
          <section className="py-8 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold mb-4 text-center">Try a Hotel Search</h2>
                <Card>
                  <CardContent className="p-6">
                    <ModernHotelSearch />
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Tips Section */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Smart Hotel Booking Tips</h2>
                <p className="text-muted-foreground mb-8">
                  Use these strategies to find the best hotel deals and avoid common mistakes.
                </p>

                <div className="grid md:grid-cols-2 gap-6">
                  {HOTEL_TIPS.map((tip, index) => (
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

          {/* Hotel Types Guide */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-2">Understanding Hotel Types</h2>
                <p className="text-muted-foreground mb-8">
                  Different hotel types suit different needs and budgets. Here's what to expect.
                </p>

                <div className="grid gap-4">
                  {HOTEL_TYPES.map((type, index) => (
                    <Card key={index}>
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row md:items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="font-semibold">{type.name}</h3>
                              <span className="text-xs text-primary font-medium">{type.priceRange}</span>
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">{type.description}</p>
                            <p className="text-xs text-muted-foreground">
                              <strong className="text-foreground">Best for:</strong> {type.bestFor}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Booking Checklist */}
          <section className="py-12 md:py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-2xl font-bold mb-6">Before You Book: Essential Checklist</h2>
                
                <div className="grid md:grid-cols-2 gap-6">
                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-primary" />
                        Price & Value
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>✓ Compare the same hotel across multiple sites</li>
                        <li>✓ Check what's included (breakfast, WiFi, parking)</li>
                        <li>✓ Look for hidden fees (resort fees, service charges)</li>
                        <li>✓ Verify the final price including taxes</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Location
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>✓ Check the exact location on a map</li>
                        <li>✓ Assess distance to attractions and transport</li>
                        <li>✓ Read reviews about the neighborhood</li>
                        <li>✓ Consider transportation costs to/from hotel</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Star className="h-5 w-5 text-primary" />
                        Reviews & Ratings
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>✓ Focus on recent reviews (last 3-6 months)</li>
                        <li>✓ Look for patterns in feedback</li>
                        <li>✓ Check reviews from similar travelers</li>
                        <li>✓ Note how management responds to issues</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-5">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Coffee className="h-5 w-5 text-primary" />
                        Policies & Amenities
                      </h3>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li>✓ Review cancellation policy carefully</li>
                        <li>✓ Confirm check-in and check-out times</li>
                        <li>✓ Check room size and bed configuration</li>
                        <li>✓ Verify any special requirements you have</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-12 bg-muted/30">
            <div className="container">
              <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-2 mb-6">
                  <HelpCircle className="h-6 w-6 text-primary" />
                  <h2 className="text-2xl font-bold">Frequently Asked Questions</h2>
                </div>
                
                <Accordion type="single" collapsible className="w-full">
                  {HOTEL_GUIDE_FAQS.map((faq, index) => (
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
          <section className="py-12">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <h2 className="text-xl font-semibold mb-6">Related Guides</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  <Link to="/top-hotel-destinations" className="group">
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <Building2 className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Top Hotel Destinations</h3>
                        <p className="text-sm text-muted-foreground">Explore the 20 most popular hotel destinations worldwide.</p>
                        <span className="text-sm text-primary mt-2 inline-flex items-center gap-1">
                          View destinations <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/flight-deals-guide" className="group">
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <Search className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">Flight Deals Guide</h3>
                        <p className="text-sm text-muted-foreground">Tips for finding cheap flights to your hotel destination.</p>
                        <span className="text-sm text-primary mt-2 inline-flex items-center gap-1">
                          Read guide <ArrowRight className="h-3 w-3" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                  <Link to="/how-it-works" className="group">
                    <Card className="h-full hover:border-primary/50 transition-colors">
                      <CardContent className="p-5">
                        <TrendingUp className="h-6 w-6 text-primary mb-3" />
                        <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">How BookingsFinder Works</h3>
                        <p className="text-sm text-muted-foreground">Learn about our comparison technology.</p>
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
              <h2 className="text-2xl font-bold mb-4">Ready to Find Your Perfect Hotel?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                Compare prices from over 1 million hotels worldwide and find the best deal for your next trip.
              </p>
              <Link to="/hotels">
                <Button size="lg" className="gap-2">
                  <Search className="h-4 w-4" />
                  Compare Hotels Now
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

export default HotelBookingGuide;
