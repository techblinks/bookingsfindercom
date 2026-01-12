import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
  const lastUpdated = "January 12, 2026";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto px-4 py-12">
        <article className="max-w-3xl mx-auto">
          <header className="mb-8">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Privacy Policy
            </h1>
            <p className="text-muted-foreground">
              Last updated: {lastUpdated}
            </p>
          </header>

          <div className="prose prose-lg max-w-none space-y-8">
            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Introduction
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to TravelSearch ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our travel comparison services.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Information We Collect
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may collect information about you in various ways, including:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Personal Data:</strong> Name, email address, phone number, and billing information when you create an account or make a booking.
                </li>
                <li>
                  <strong className="text-foreground">Search Data:</strong> Travel search queries including destinations, dates, passenger numbers, and preferences.
                </li>
                <li>
                  <strong className="text-foreground">Usage Data:</strong> Browser type, IP address, pages visited, time spent on pages, and other diagnostic data.
                </li>
                <li>
                  <strong className="text-foreground">Cookies:</strong> Small data files stored on your device to enhance your browsing experience.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                How We Use Your Information
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We use the information we collect for the following purposes:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>To provide and maintain our travel search and comparison services</li>
                <li>To process your bookings and send confirmations</li>
                <li>To personalize your experience and show relevant travel options</li>
                <li>To communicate with you about promotions, updates, and customer service</li>
                <li>To analyze usage patterns and improve our services</li>
                <li>To detect and prevent fraud and security threats</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Information Sharing
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                We may share your information with:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>
                  <strong className="text-foreground">Travel Partners:</strong> Airlines, hotels, and other travel providers when you choose to book through our platform.
                </li>
                <li>
                  <strong className="text-foreground">Service Providers:</strong> Third-party companies that help us operate our website and services.
                </li>
                <li>
                  <strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our rights and safety.
                </li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We do not sell your personal information to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Cookies and Tracking
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience. You can control cookie preferences through your browser settings. Note that disabling cookies may limit certain features of our website.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Data Security
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement industry-standard security measures including SSL encryption, secure servers, and regular security audits to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Your Rights
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Depending on your location, you may have the following rights:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                <li>Access and receive a copy of your personal data</li>
                <li>Correct inaccurate personal data</li>
                <li>Request deletion of your personal data</li>
                <li>Object to or restrict processing of your data</li>
                <li>Data portability</li>
                <li>Withdraw consent at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Children's Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                Our services are not intended for children under 16 years of age. We do not knowingly collect personal information from children. If you believe we have collected information from a child, please contact us immediately.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Changes to This Policy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-foreground mb-3">
                Contact Us
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about this Privacy Policy or our data practices, please contact us at:
              </p>
              <div className="bg-secondary/50 rounded-lg p-4 mt-4">
                <p className="text-foreground font-medium">TravelSearch Privacy Team</p>
                <p className="text-muted-foreground">Email: privacy@travelsearch.com</p>
                <p className="text-muted-foreground">Address: 123 Travel Street, Suite 100, City, Country</p>
              </div>
            </section>
          </div>

          <nav className="mt-12 pt-8 border-t border-border">
            <p className="text-sm text-muted-foreground mb-4">Related Pages:</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/terms" className="text-primary hover:underline text-sm">
                Terms & Conditions
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

export default PrivacyPolicy;
