import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const PrivacyPolicy = () => {
  const lastUpdated = "January 25, 2026";

  return (
    <>
      <Helmet>
        <title>Privacy Policy | BookingsFinder</title>
        <meta name="description" content="BookingsFinder's Privacy Policy explains how we collect, use, and protect your personal information when you use our travel comparison services." />
        <link rel="canonical" href="https://bookingsfinder.com/privacy" />
      </Helmet>

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
                  Welcome to BookingsFinder ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our travel comparison and meta-search services.
                </p>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  <strong className="text-foreground">Important:</strong> BookingsFinder is a travel meta-search platform. We do not sell flights, hotels, or any travel products directly. We compare prices from third-party travel providers and redirect you to their websites to complete bookings. For more information, see our <Link to="/affiliate-disclosure" className="text-primary hover:underline">Affiliate Disclosure</Link>.
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
                    <strong className="text-foreground">Personal Data:</strong> Name and email address when you sign up for price alerts or contact us.
                  </li>
                  <li>
                    <strong className="text-foreground">Search Data:</strong> Travel search queries including destinations, dates, passenger numbers, and preferences to provide you with relevant results.
                  </li>
                  <li>
                    <strong className="text-foreground">Usage Data:</strong> Browser type, IP address, pages visited, time spent on pages, referring URLs, and other diagnostic data.
                  </li>
                  <li>
                    <strong className="text-foreground">Location Data:</strong> Approximate geographic location to show relevant regional deals and currency.
                  </li>
                  <li>
                    <strong className="text-foreground">Cookies:</strong> Small data files stored on your device to enhance your browsing experience and for analytics purposes.
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
                  <li>To provide and maintain our travel search and price comparison services</li>
                  <li>To send you price alerts and notifications you've subscribed to</li>
                  <li>To personalize your experience and show relevant travel options</li>
                  <li>To communicate with you about our services and respond to inquiries</li>
                  <li>To analyze usage patterns and improve our platform</li>
                  <li>To detect and prevent fraud and security threats</li>
                  <li>To display relevant advertisements through Google AdSense and other advertising partners</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  Advertising and Third-Party Services
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4">
                  We use third-party advertising services, including Google AdSense, to display advertisements on our website. These services may use cookies and similar technologies to serve ads based on your prior visits to our website or other websites.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Google AdSense:</strong> Google uses cookies to serve ads based on your visit to BookingsFinder and other sites on the Internet. You can opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ads Settings</a>.
                  </li>
                  <li>
                    <strong className="text-foreground">Analytics:</strong> We use Google Analytics to understand how visitors interact with our website. Google Analytics uses cookies to collect anonymous usage data.
                  </li>
                  <li>
                    <strong className="text-foreground">Affiliate Partners:</strong> When you click through to travel providers, they may set their own cookies and collect data according to their privacy policies.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  For more information about cookies, please see our <Link to="/cookies" className="text-primary hover:underline">Cookie Policy</Link>.
                </p>
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
                    <strong className="text-foreground">Travel Partners:</strong> When you click through to a travel provider, your search parameters are shared to display relevant results.
                  </li>
                  <li>
                    <strong className="text-foreground">Service Providers:</strong> Third-party companies that help us operate our website and services (hosting, analytics, email delivery).
                  </li>
                  <li>
                    <strong className="text-foreground">Advertising Partners:</strong> Third-party advertising networks to serve relevant ads.
                  </li>
                  <li>
                    <strong className="text-foreground">Legal Requirements:</strong> When required by law or to protect our rights and safety.
                  </li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  We do not sell your personal information to third parties for their direct marketing purposes.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  Data Security
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We implement industry-standard security measures including SSL/TLS encryption, secure servers, and regular security audits to protect your personal information. However, no method of transmission over the Internet is 100% secure, and we cannot guarantee absolute security.
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
                  <li>Opt out of personalized advertising</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed mt-4">
                  To exercise these rights, please contact us at <a href="mailto:privacy@bookingsfinder.com" className="text-primary hover:underline">privacy@bookingsfinder.com</a>.
                </p>
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
                  International Data Transfers
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  BookingsFinder is based in Australia. If you access our services from outside Australia, your information may be transferred to and processed in Australia or other countries where our service providers are located. By using our services, you consent to such transfers.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">
                  Changes to This Policy
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                  We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
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
                  <p className="text-foreground font-medium">BookingsFinder Privacy Team</p>
                  <p className="text-muted-foreground">Email: privacy@bookingsfinder.com</p>
                  <p className="text-muted-foreground">Address: 13 Wildflower Street, Yarrabilba, 4207, Brisbane, Australia</p>
                </div>
              </section>
            </div>

            <nav className="mt-12 pt-8 border-t border-border">
              <p className="text-sm text-muted-foreground mb-4">Related Pages:</p>
              <div className="flex flex-wrap gap-4">
                <Link to="/terms" className="text-primary hover:underline text-sm">
                  Terms & Conditions
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

export default PrivacyPolicy;
