import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";

const CookiePolicy = () => {
  return (
    <>
      <Helmet>
        <title>Cookie Policy | BookingsFinder</title>
        <meta name="description" content="Learn about how BookingsFinder uses cookies and similar technologies to improve your browsing experience." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-16">
          <div className="container max-w-3xl">
            <h1 className="text-4xl font-bold mb-8">Cookie Policy</h1>
            <p className="text-muted-foreground mb-8">Last updated: January 13, 2026</p>

            <div className="prose prose-neutral dark:prose-invert max-w-none space-y-8">
              <section>
                <h2 className="text-2xl font-semibold mb-4">What Are Cookies?</h2>
                <p className="text-muted-foreground">
                  Cookies are small text files that are placed on your computer or mobile device when you visit a website. They are widely used to make websites work more efficiently and to provide information to the website owners.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">How We Use Cookies</h2>
                <p className="text-muted-foreground mb-4">
                  BookingsFinder uses cookies for the following purposes:
                </p>
                <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
                  <li><strong>Essential cookies:</strong> These are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas.</li>
                  <li><strong>Analytics cookies:</strong> We use these to understand how visitors interact with our website, helping us improve our services.</li>
                  <li><strong>Preference cookies:</strong> These remember your settings and preferences, such as your preferred currency or language.</li>
                  <li><strong>Marketing cookies:</strong> These are used to track visitors across websites to display relevant advertisements.</li>
                </ul>
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
                  Some cookies are placed by third-party services that appear on our pages, such as analytics providers and advertising networks.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Specific Cookies We Use</h2>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-border">
                    <thead>
                      <tr className="bg-muted">
                        <th className="border border-border p-3 text-left">Cookie Name</th>
                        <th className="border border-border p-3 text-left">Purpose</th>
                        <th className="border border-border p-3 text-left">Duration</th>
                      </tr>
                    </thead>
                    <tbody className="text-muted-foreground">
                      <tr>
                        <td className="border border-border p-3">_session</td>
                        <td className="border border-border p-3">Session management</td>
                        <td className="border border-border p-3">Session</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">preferences</td>
                        <td className="border border-border p-3">User preferences</td>
                        <td className="border border-border p-3">1 year</td>
                      </tr>
                      <tr>
                        <td className="border border-border p-3">_ga</td>
                        <td className="border border-border p-3">Google Analytics</td>
                        <td className="border border-border p-3">2 years</td>
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
                  <li><strong>Browser settings:</strong> Most browsers allow you to refuse or accept cookies, delete existing cookies, and set preferences for certain websites.</li>
                  <li><strong>Third-party opt-outs:</strong> You can opt out of third-party cookies through industry programs like the Digital Advertising Alliance.</li>
                  <li><strong>Private browsing:</strong> Most browsers offer a private or incognito mode that doesn't store cookies after your session ends.</li>
                </ul>
                <p className="text-muted-foreground mt-4">
                  Please note that blocking cookies may affect your experience on our website and limit certain features.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Changes to This Policy</h2>
                <p className="text-muted-foreground">
                  We may update this Cookie Policy from time to time. We will notify you of any changes by posting the new policy on this page with an updated revision date.
                </p>
              </section>

              <section>
                <h2 className="text-2xl font-semibold mb-4">Contact Us</h2>
                <p className="text-muted-foreground">
                  If you have any questions about our use of cookies, please contact us at privacy@bookingsfinder.com.
                </p>
              </section>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default CookiePolicy;
