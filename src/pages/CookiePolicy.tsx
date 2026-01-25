import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const CookiePolicy = () => {
  const lastUpdated = "January 25, 2026";

  return (
    <>
      <Helmet>
        <title>Cookie Policy | BookingsFinder</title>
        <meta name="description" content="Learn about how BookingsFinder uses cookies and similar technologies to improve your browsing experience, provide analytics, and display relevant advertisements." />
        <link rel="canonical" href="https://bookingsfinder.com/cookies" />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-16">
          <div className="container max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">Cookie Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: {lastUpdated}</p>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">What Are Cookies?</h2>
                <p className="text-muted-foreground">
                  Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently, provide a better user experience, and give website owners useful information about how their sites are used.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">How We Use Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  BookingsFinder uses cookies for the following purposes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Essential cookies:</strong> These are necessary for the website to function properly. They enable basic functions like page navigation, access to secure areas, and remembering your search preferences.</li>
                  <li><strong className="text-foreground">Analytics cookies:</strong> We use these to understand how visitors interact with our website, which pages are most popular, and how we can improve our services. We use Google Analytics for this purpose.</li>
                  <li><strong className="text-foreground">Preference cookies:</strong> These remember your settings and preferences, such as your preferred currency, language, and recent searches.</li>
                  <li><strong className="text-foreground">Advertising cookies:</strong> These are used to track visitors across websites and display relevant advertisements. We use Google AdSense and other advertising partners.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Google AdSense and Advertising</h2>
                <p className="text-muted-foreground mb-4">
                  BookingsFinder uses Google AdSense to display advertisements. Google uses cookies to serve ads based on your prior visits to our website and other websites on the Internet.
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li>Google's use of advertising cookies enables it and its partners to serve ads based on your visit to BookingsFinder and/or other sites on the Internet.</li>
                  <li>You may opt out of personalized advertising by visiting <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ads Settings</a>.</li>
                  <li>Alternatively, you can opt out of third-party vendor cookies by visiting the <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Network Advertising Initiative opt-out page</a>.</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Third-party vendors, including Google, use cookies to serve ads based on your prior visits to this website or other websites. You can opt out of personalized advertising at any time.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Types of Cookies We Use</h2>
                
                <h3 className="text-xl font-medium mb-3 mt-6">Session Cookies</h3>
                <p className="text-muted-foreground">
                  These temporary cookies are deleted when you close your browser. They help us track your movements from page to page so you don't get asked for the same information during a single visit.
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">Persistent Cookies</h3>
                <p className="text-muted-foreground">
                  These remain on your device for a set period or until you delete them. They help us remember you for future visits and maintain your preferences.
                </p>

                <h3 className="text-xl font-medium mb-3 mt-6">Third-Party Cookies</h3>
                <p className="text-muted-foreground">
                  Some cookies are placed by third-party services that appear on our pages, such as Google Analytics, Google AdSense, and our affiliate partners.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Specific Cookies We Use</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left font-semibold">Cookie Name</th>
                        <th className="border border-border p-3 text-left font-semibold">Provider</th>
                        <th className="border border-border p-3 text-left font-semibold">Purpose</th>
                        <th className="border border-border p-3 text-left font-semibold">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr>
                        <td className="border border-border p-3">_session</td>
                        <td className="border border-border p-3">BookingsFinder</td>
                        <td className="border border-border p-3">Session management and authentication</td>
                        <td className="border border-border p-3">Session</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">preferences</td>
                        <td className="border border-border p-3">BookingsFinder</td>
                        <td className="border border-border p-3">Store user preferences (currency, search history)</td>
                        <td className="border border-border p-3">1 year</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">_ga, _gid</td>
                        <td className="border border-border p-3">Google Analytics</td>
                        <td className="border border-border p-3">Distinguish users and sessions for analytics</td>
                        <td className="border border-border p-3">2 years / 24 hours</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">_gat</td>
                        <td className="border border-border p-3">Google Analytics</td>
                        <td className="border border-border p-3">Throttle request rate</td>
                        <td className="border border-border p-3">1 minute</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">__gads</td>
                        <td className="border border-border p-3">Google AdSense</td>
                        <td className="border border-border p-3">Measure ad interactions and prevent duplicate ads</td>
                        <td className="border border-border p-3">13 months</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">__gpi</td>
                        <td className="border border-border p-3">Google AdSense</td>
                        <td className="border border-border p-3">Collect browsing data for personalized ads</td>
                        <td className="border border-border p-3">13 months</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">NID</td>
                        <td className="border border-border p-3">Google</td>
                        <td className="border border-border p-3">Store preferences and serve personalized ads</td>
                        <td className="border border-border p-3">6 months</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Managing Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  You can control and manage cookies in various ways:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong className="text-foreground">Browser settings:</strong> Most browsers allow you to refuse or accept cookies, delete existing cookies, and set preferences for certain websites. Check your browser's help section for instructions.</li>
                  <li><strong className="text-foreground">Google Ads opt-out:</strong> Visit <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Google Ads Settings</a> to opt out of personalized advertising.</li>
                  <li><strong className="text-foreground">Third-party opt-outs:</strong> You can opt out of third-party cookies through industry programs like the <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Digital Advertising Alliance</a> or <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Network Advertising Initiative</a>.</li>
                  <li><strong className="text-foreground">Private browsing:</strong> Most browsers offer a private or incognito mode that doesn't store cookies after your session ends.</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Please note that blocking cookies may affect your experience on our website and limit certain features, such as remembering your search preferences.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Cookie Policy from time to time to reflect changes in our practices or for legal, operational, or regulatory reasons. We will notify you of any material changes by posting the new policy on this page with an updated revision date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about our use of cookies, please contact us at:
                </p>
                <div className="bg-secondary/50 rounded-lg p-4 mt-4">
                  <p className="text-foreground font-medium">BookingsFinder Privacy Team</p>
                  <p className="text-muted-foreground">Email: privacy@bookingsfinder.com</p>
                  <p className="text-muted-foreground">Address: 13 Wildflower Street, Yarrabilba, 4207, Brisbane, Australia</p>
                </div>
              </section>

              <nav className="mt-8 pt-8 border-t border-border">
                <p className="text-sm text-muted-foreground mb-4">Related Pages:</p>
                <div className="flex flex-wrap gap-4">
                  <Link to="/privacy" className="text-primary hover:underline text-sm">
                    Privacy Policy
                  </Link>
                  <Link to="/terms" className="text-primary hover:underline text-sm">
                    Terms & Conditions
                  </Link>
                  <Link to="/affiliate-disclosure" className="text-primary hover:underline text-sm">
                    Affiliate Disclosure
                  </Link>
                </div>
              </nav>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CookiePolicy;
