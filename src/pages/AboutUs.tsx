import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Globe, Award, Heart, Search, ExternalLink, Shield, DollarSign, Info } from "lucide-react";

const AboutUs = () => {
  return (
    <>
      <Helmet>
        <title>About Us | BookingsFinder - Travel Comparison Platform</title>
        <meta name="description" content="Learn about BookingsFinder - Australia's trusted travel meta-search platform. We compare prices from 500+ airlines and 1M+ hotels to help you find the best deals. We don't sell tickets - we help you compare." />
        <link rel="canonical" href="https://bookingsfinder.com/about" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
            <div className="container text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">About BookingsFinder</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're a travel meta-search platform helping millions find the best deals by comparing prices across hundreds of airlines and hotels — all in one place.
              </p>
            </div>
          </section>

          {/* What We Do - Meta-Search Explanation */}
          <section className="py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Search className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-foreground mb-2">
                        What is a Travel Meta-Search Platform?
                      </h2>
                      <p className="text-muted-foreground leading-relaxed">
                        BookingsFinder is a <strong>travel comparison and meta-search platform</strong>. Unlike online travel agencies that sell tickets directly, we aggregate and compare prices from multiple airlines, hotels, and online travel agencies (OTAs) to show you the best available options. When you find a deal you like, we redirect you to the travel provider's website to complete your booking directly with them.
                      </p>
                    </div>
                  </div>
                </div>

                <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                <p className="text-muted-foreground mb-4">
                  BookingsFinder was founded in Brisbane, Australia with a simple idea: travel should be affordable and accessible to everyone. We noticed how difficult it was to compare prices across different travel sites, spending hours switching between tabs just to find the best deal.
                </p>
                <p className="text-muted-foreground mb-4">
                  That's why we built BookingsFinder — a single platform that aggregates prices from over 500 airlines and more than 1 million hotels worldwide. Our technology searches across multiple providers in real-time, ensuring you always see the best available prices to help you make informed decisions.
                </p>
                <p className="text-muted-foreground mb-4">
                  Today, we help millions of travelers save time and money on their journeys. Whether you're planning a budget backpacking trip or a luxury getaway, we're here to help you compare options and find the perfect deal.
                </p>
                <p className="text-muted-foreground">
                  <strong className="text-foreground">Important:</strong> We do not sell flights, hotels, or any travel products directly. All bookings are made through our partner travel providers. Learn more on our <Link to="/why-we-dont-sell-tickets" className="text-primary hover:underline">Why We Don't Sell Tickets</Link> page.
                </p>
              </div>
            </div>
          </section>

          {/* How It Works */}
          <section className="py-16 bg-muted/30">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">How BookingsFinder Works</h2>
              <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Search className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">1. Search & Compare</h3>
                  <p className="text-sm text-muted-foreground">
                    Enter your travel details and we search hundreds of sites simultaneously to find the best prices.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">2. Review Options</h3>
                  <p className="text-sm text-muted-foreground">
                    Compare prices, times, and details side-by-side to find the option that works best for you.
                  </p>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ExternalLink className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">3. Book with Provider</h3>
                  <p className="text-sm text-muted-foreground">
                    Click through to complete your booking directly with the airline, hotel, or travel agency.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Affiliate & Ads Disclosure */}
          <section className="py-16">
            <div className="container">
              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-2 gap-6">
                  <Card className="border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <DollarSign className="h-6 w-6 text-primary" />
                        <h3 className="font-semibold">How We Make Money</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        BookingsFinder is free to use. We earn money through:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Affiliate commissions:</strong> When you click through and book with our partner travel providers, we may receive a small commission at no extra cost to you.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span><strong>Advertising:</strong> We display relevant ads from Google AdSense and other advertising partners to help support our free service.</span>
                        </li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-4">
                        <Link to="/affiliate-disclosure" className="text-primary hover:underline">Read our full Affiliate Disclosure →</Link>
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="border-primary/20">
                    <CardContent className="p-6">
                      <div className="flex items-center gap-3 mb-4">
                        <Shield className="h-6 w-6 text-primary" />
                        <h3 className="font-semibold">Your Privacy & Cookies</h3>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        We respect your privacy and are committed to transparency:
                      </p>
                      <ul className="text-sm text-muted-foreground space-y-2">
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>We use cookies to improve your experience and for analytics.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>Third-party advertisers may use cookies to serve personalized ads.</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <span className="text-primary">•</span>
                          <span>You can manage your cookie preferences in your browser settings.</span>
                        </li>
                      </ul>
                      <p className="text-xs text-muted-foreground mt-4">
                        <Link to="/cookies" className="text-primary hover:underline">Read our Cookie Policy →</Link>
                      </p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </section>

          {/* Values */}
          <section className="py-16 bg-muted/50">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">User First</h3>
                    <p className="text-sm text-muted-foreground">
                      Every decision we make starts with how it benefits our users and helps them save.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Global Reach</h3>
                    <p className="text-sm text-muted-foreground">
                      We connect you with travel options from every corner of the world.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Transparency</h3>
                    <p className="text-sm text-muted-foreground">
                      We're upfront about how we work and how we earn revenue.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Passion for Travel</h3>
                    <p className="text-sm text-muted-foreground">
                      We're travelers ourselves and understand your needs.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="py-16">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">500+</p>
                  <p className="text-muted-foreground">Airlines Compared</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">1M+</p>
                  <p className="text-muted-foreground">Hotels Compared</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">50M+</p>
                  <p className="text-muted-foreground">Price Comparisons</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">190+</p>
                  <p className="text-muted-foreground">Countries</p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact CTA */}
          <section className="py-16 bg-muted/30">
            <div className="container text-center">
              <h2 className="text-2xl font-bold mb-4">Have Questions?</h2>
              <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
                We're here to help. Reach out to our team for any questions about how BookingsFinder works.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link to="/contact" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2">
                  Contact Us
                </Link>
                <Link to="/faqs" className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                  View FAQs
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

export default AboutUs;
