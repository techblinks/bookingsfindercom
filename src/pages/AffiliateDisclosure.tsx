import { Link } from "react-router-dom";
import { Info, DollarSign, Handshake, Shield } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const AffiliateDisclosure = () => {
  const lastUpdated = "January 12, 2026";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Affiliate Disclosure
            </h1>
            <p className="text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </header>

          {/* Transparency Notice */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 mb-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Info className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground mb-2">
                  Our Commitment to Transparency
                </h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  At BookingsFinder, we believe in complete transparency with our users. This disclosure explains how we earn revenue while providing you with free travel comparison services.
                </p>
              </div>
            </div>
          </div>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Participation in Affiliate Programs
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                BookingsFinder participates in various travel affiliate programs and partnerships with airlines, hotels, online travel agencies (OTAs), and other travel service providers. These partnerships allow us to offer our travel comparison services free of charge while earning a commission on bookings made through our platform.
              </p>
            </section>

            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <DollarSign className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  How We Earn Revenue
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you click on a link to a travel provider and make a purchase or booking, we may earn a commission from that provider. This is at no additional cost to you—the price you pay is the same whether you use our links or go directly to the provider.
              </p>
              <p className="text-muted-foreground leading-relaxed">
                Our commission-based earnings model allows us to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground mt-4">
                <li>Provide free access to our travel comparison tools</li>
                <li>Maintain and improve our search technology</li>
                <li>Expand our coverage of airlines, hotels, and destinations</li>
                <li>Offer customer support and travel resources</li>
              </ul>
            </section>

            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <Handshake className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Our Partner Network
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We work with a wide range of travel partners, including but not limited to:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Major international airlines and low-cost carriers</li>
                <li>Hotel chains and independent properties</li>
                <li>Online travel agencies (Booking.com, Expedia, etc.)</li>
                <li>Car rental companies</li>
                <li>Travel insurance providers</li>
                <li>Tour and activity operators</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                The presence or absence of an affiliate relationship does not influence which results we show or how they are ranked. Our algorithms are designed to show you the best options based on your search criteria, not our commission rates.
              </p>
            </section>

            <section className="bg-card rounded-xl border border-border p-6">
              <div className="flex items-center gap-3 mb-4">
                <Shield className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-semibold text-foreground">
                  Our Editorial Independence
                </h2>
              </div>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We are committed to maintaining editorial independence:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Unbiased Results:</strong> Our search results are based on price, timing, and relevance—not commission rates
                </li>
                <li>
                  <strong className="text-foreground">Honest Reviews:</strong> Any reviews or recommendations we provide are based on genuine evaluation
                </li>
                <li>
                  <strong className="text-foreground">Clear Labeling:</strong> Sponsored content or promoted listings are clearly identified
                </li>
                <li>
                  <strong className="text-foreground">User First:</strong> Our primary goal is to help you find the best travel deals
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Your Choice Matters
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You are never obligated to use our affiliate links. You can always go directly to a travel provider's website if you prefer. However, using our links helps support our free service and allows us to continue providing valuable travel comparison tools to millions of users.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                FTC Compliance
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                This disclosure is made in accordance with the Federal Trade Commission's (FTC) guidelines on affiliate marketing and endorsements. We are committed to full compliance with all applicable advertising and disclosure regulations.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Questions?
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about our affiliate relationships or how we earn revenue, please don't hesitate to contact us:
              </p>
              <div className="bg-secondary/50 rounded-lg p-4 mt-4">
                <p className="text-foreground font-medium">BookingsFinder Partnerships Team</p>
                <p className="text-muted-foreground">Email: partnerships@bookingsfinder.com</p>
              </div>
            </section>

            <section className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 rounded-xl p-6">
              <p className="text-green-700 dark:text-green-400 font-medium mb-2">
                Thank You for Your Support
              </p>
              <p className="text-green-600 dark:text-green-500 text-sm leading-relaxed">
                By using BookingsFinder and our affiliate links, you help us continue to provide free, comprehensive travel comparison services. We appreciate your trust and are committed to helping you find the best travel deals possible.
              </p>
            </section>
          </div>

          <nav className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Related Pages:</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/privacy" className="text-primary hover:underline text-sm">
                Privacy Policy
              </Link>
              <Link to="/terms" className="text-primary hover:underline text-sm">
                Terms & Conditions
              </Link>
            </div>
          </nav>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default AffiliateDisclosure;
