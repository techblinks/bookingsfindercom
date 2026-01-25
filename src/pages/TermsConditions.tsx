import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const TermsConditions = () => {
  const lastUpdated = "January 25, 2026";

  return (
    <>
      <Helmet>
        <title>Terms & Conditions | BookingsFinder</title>
        <meta name="description" content="Read BookingsFinder's Terms & Conditions. Understand your rights and responsibilities when using our travel comparison and meta-search platform." />
        <link rel="canonical" href="https://bookingsfinder.com/terms" />
      </Helmet>

      <div className="min-h-screen bg-background flex flex-col">
        <Header />

        <main className="flex-1 container mx-auto px-4 py-12">
          <article className="max-w-3xl mx-auto">
            <header className="mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                Terms & Conditions
              </h1>
              <p className="text-muted-foreground">
                Last updated: {lastUpdated}
              </p>
            </header>

            <div className="prose prose-lg max-w-none space-y-8">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  1. Acceptance of Terms
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  By accessing and using BookingsFinder ("the Service"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. We reserve the right to modify these terms at any time, and your continued use of the Service constitutes acceptance of any changes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  2. Description of Service
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  BookingsFinder is a <strong>travel meta-search and comparison platform</strong> that allows users to search, compare, and discover flights, hotels, and other travel services from various third-party providers.
                </p>
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 my-4">
                  <p className="text-foreground font-medium mb-2">Important: We Do Not Sell Travel Products</p>
                  <p className="text-muted-foreground text-sm">
                    BookingsFinder does not sell flights, hotels, or any travel products directly. We act as an information aggregator and comparison tool. All bookings are made directly with third-party travel providers (airlines, hotels, online travel agencies) through their own websites. We are not a party to any booking transaction.
                  </p>
                </div>
                <p className="text-muted-foreground leading-relaxed">
                  For more information about how our service works, please visit our <Link to="/how-it-works" className="text-primary hover:underline">How It Works</Link> and <Link to="/why-we-dont-sell-tickets" className="text-primary hover:underline">Why We Don't Sell Tickets</Link> pages.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  3. User Responsibilities
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  As a user of our Service, you agree to:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Provide accurate and complete information when using our services</li>
                  <li>Use the Service only for lawful purposes and in accordance with these Terms</li>
                  <li>Not attempt to gain unauthorized access to any part of the Service</li>
                  <li>Not use automated systems or software to extract data from our website</li>
                  <li>Not interfere with or disrupt the Service or servers</li>
                  <li>Comply with all applicable laws and regulations</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  4. Third-Party Travel Providers
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  When you click through to a travel provider from our platform:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>You enter into a contract directly with that travel provider (airline, hotel, OTA), not with BookingsFinder</li>
                  <li>You are responsible for reviewing and accepting the provider's terms and conditions, privacy policy, and cancellation policies</li>
                  <li>All prices displayed are provided by our partners and may change without notice</li>
                  <li>We are not responsible for errors in pricing or availability displayed on our platform</li>
                  <li>Payment processing is handled entirely by the travel provider or their designated payment processor</li>
                  <li>Any issues with bookings must be resolved directly with the travel provider</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  5. Cancellations and Refunds
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Cancellation and refund policies are determined entirely by the individual travel providers. <strong>BookingsFinder does not process bookings, payments, cancellations, or refunds.</strong> For any booking-related issues, please contact the travel provider where you made your purchase. We recommend reviewing the provider's cancellation policy before completing any booking.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  6. Price Alerts and Notifications
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  If you sign up for price alerts or notifications, you agree to receive emails from BookingsFinder about price changes and travel deals. You can unsubscribe at any time by clicking the unsubscribe link in any email or by managing your preferences on our <Link to="/my-alerts" className="text-primary hover:underline">My Alerts</Link> page.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  7. Advertising
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  BookingsFinder displays advertisements, including those served by Google AdSense, to support our free service. These advertisements are clearly distinguishable from our editorial content. Our search results are based on relevance and price, not on advertising relationships. For more information, see our <Link to="/affiliate-disclosure" className="text-primary hover:underline">Affiliate Disclosure</Link>.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  8. Intellectual Property
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  All content on BookingsFinder, including text, graphics, logos, icons, images, and software, is the property of BookingsFinder or its content suppliers and is protected by international copyright laws. You may not reproduce, modify, distribute, or republish any content without our prior written consent.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  9. Limitation of Liability
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  To the fullest extent permitted by law:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>BookingsFinder is not liable for any indirect, incidental, special, or consequential damages</li>
                  <li>We do not guarantee the accuracy, completeness, or reliability of any information on our platform</li>
                  <li>We are not responsible for any issues arising from your interaction with travel providers</li>
                  <li>We are not responsible for the quality, safety, or legality of services provided by third-party travel providers</li>
                  <li>Our liability shall not exceed the amount you paid to us (if any) for using our services</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  10. Disclaimer of Warranties
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. We disclaim all warranties, including implied warranties of merchantability and fitness for a particular purpose.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  11. Third-Party Links
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  Our Service contains links to third-party websites and services, including airlines, hotels, and online travel agencies. These links are provided for your convenience. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites. We encourage you to review the terms and privacy policies of any third-party sites you visit.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  12. Indemnification
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  You agree to indemnify and hold harmless BookingsFinder, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  13. Governing Law
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  These Terms shall be governed by and construed in accordance with the laws of Queensland, Australia, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of Queensland, Australia.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  14. Contact Information
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  For questions about these Terms & Conditions, please contact us:
                </p>
                <div className="bg-secondary/50 rounded-lg p-4 mt-4">
                  <p className="text-foreground font-medium">BookingsFinder Legal Team</p>
                  <p className="text-muted-foreground">Email: legal@bookingsfinder.com</p>
                  <p className="text-muted-foreground">Address: 13 Wildflower Street, Yarrabilba, 4207, Brisbane, Australia</p>
                </div>
              </section>
            </div>

            <nav className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">Related Pages:</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/privacy" className="text-primary hover:underline text-sm">
                  Privacy Policy
                </Link>
                <Link to="/cookies" className="text-primary hover:underline text-sm">
                  Cookie Policy
                </Link>
                <Link to="/affiliate-disclosure" className="text-primary hover:underline text-sm">
                  Affiliate Disclosure
                </Link>
              </div>
            </nav>
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default TermsConditions;
