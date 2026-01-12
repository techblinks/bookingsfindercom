import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const TermsConditions = () => {
  const lastUpdated = "January 12, 2026";

  return (
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
                By accessing and using TravelSearch ("the Service"), you accept and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services. We reserve the right to modify these terms at any time, and your continued use of the Service constitutes acceptance of any changes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                2. Description of Service
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                TravelSearch is a travel comparison platform that allows users to search, compare, and discover flights, hotels, and other travel services from various third-party providers. We act as an intermediary and do not directly provide travel services. All bookings are made with and fulfilled by our partner travel providers.
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
                4. Booking and Purchases
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                When you make a booking through our platform:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>You enter into a contract directly with the travel provider (airline, hotel, etc.), not with TravelSearch</li>
                <li>You are responsible for reviewing and accepting the provider's terms and conditions</li>
                <li>All prices displayed are provided by our partners and may change without notice</li>
                <li>We are not responsible for errors in pricing or availability displayed on our platform</li>
                <li>Payment processing is handled by the travel provider or their designated payment processor</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                5. Cancellations and Refunds
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Cancellation and refund policies are determined by the individual travel providers. TravelSearch does not process refunds directly. For any cancellation or refund requests, please contact the travel provider where you made your booking. We recommend reviewing the provider's cancellation policy before completing any booking.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                6. Intellectual Property
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on TravelSearch, including text, graphics, logos, icons, images, and software, is the property of TravelSearch or its content suppliers and is protected by international copyright laws. You may not reproduce, modify, distribute, or republish any content without our prior written consent.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                7. Limitation of Liability
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                To the fullest extent permitted by law:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>TravelSearch is not liable for any indirect, incidental, special, or consequential damages</li>
                <li>We do not guarantee the accuracy, completeness, or reliability of any information on our platform</li>
                <li>We are not responsible for any issues arising from your interaction with travel providers</li>
                <li>Our liability shall not exceed the amount you paid to us (if any) for using our services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                8. Disclaimer of Warranties
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not warrant that the Service will be uninterrupted, error-free, or free of viruses or other harmful components. We disclaim all warranties, including implied warranties of merchantability and fitness for a particular purpose.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                9. Third-Party Links
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our Service may contain links to third-party websites or services. These links are provided for your convenience only. We have no control over and assume no responsibility for the content, privacy policies, or practices of any third-party sites. We encourage you to review the terms and privacy policies of any third-party sites you visit.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                10. Indemnification
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                You agree to indemnify and hold harmless TravelSearch, its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service, violation of these Terms, or infringement of any third-party rights.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                11. Governing Law
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TravelSearch operates, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be resolved in the courts of that jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                12. Contact Information
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms & Conditions, please contact us:
              </p>
              <div className="bg-secondary/50 rounded-lg p-4 mt-4">
                <p className="text-foreground font-medium">TravelSearch Legal Team</p>
                <p className="text-muted-foreground">Email: legal@travelsearch.com</p>
                <p className="text-muted-foreground">Address: 123 Travel Street, Suite 100, City, Country</p>
              </div>
            </section>
          </div>

          <nav className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Related Pages:</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/privacy" className="text-primary hover:underline text-sm">
                Privacy Policy
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
  );
};

export default TermsConditions;
