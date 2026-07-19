import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HeroV2 } from "@/components/home-v2/HeroV2";
import { IntentSelector } from "@/components/home-v2/IntentSelector";
import { ReadinessPreview } from "@/components/home-v2/ReadinessPreview";
import { SectionContainer } from "@/components/home-v2/SectionContainer";
import { SectionHeading } from "@/components/home-v2/SectionHeading";
import PopularRoutes from "@/components/sections/PopularRoutes";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>BookingsFinder — Plan, Prepare, and Travel Ready</title>
        <meta
          name="description"
          content="Plan your trip, understand the real cost, check visa and passport requirements, and keep every booking organised. BookingsFinder helps you travel ready."
        />
        <meta property="og:title" content="BookingsFinder — Plan, Prepare, and Travel Ready" />
        <meta property="og:description" content="One place to plan, prepare, and manage every trip. Know what you need, what it costs, and when to act." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://bookingsfinder.com" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "BookingsFinder",
            "url": "https://bookingsfinder.com",
            "description": "Plan, prepare, and manage every trip. Know what you need, what it costs, and when to act.",
            "potentialAction": {
              "@type": "SearchAction",
              "target": {
                "@type": "EntryPoint",
                "urlTemplate": "https://bookingsfinder.com/flights?origin={origin}&destination={destination}"
              },
              "query-input": "required name=origin,destination"
            }
          })}
        </script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        {/* Skip to main content — visually hidden until focused */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:px-4 focus:py-3 focus:bg-background focus:text-foreground focus:rounded-lg focus:shadow-lg focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none focus:text-sm focus:font-medium"
        >
          Skip to main content
        </a>

        <Header />

        <main id="main-content" className="flex-1">
          {/* 1. Hero V2 */}
          <HeroV2 />

          {/* 2. Intent Selector */}
          <IntentSelector />

          {/* 3. Readiness Preview */}
          <ReadinessPreview />

          {/* 4. Destination Discovery — keep legacy PopularRoutes for now, updated */}
          <SectionContainer className="bg-background">
            <SectionHeading
              headline="Not sure where to go?"
              supporting="Browse popular routes and see indicative flight prices from your nearest airport."
            />
            <PopularRoutes />
          </SectionContainer>

          {/* 5. Flight Search handoff — compact section */}
          <SectionContainer className="bg-muted/50">
            <SectionHeading
              headline="Search flights with our travel partners"
              supporting="Compare prices across airlines. We'll connect you to our booking partner to complete your booking."
            />
            <div className="max-w-xl mx-auto text-center">
              <Link
                to="/flights"
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-primary text-primary-foreground rounded-xl text-base font-semibold hover:bg-primary-hover transition-colors"
              >
                Search flights
              </Link>
              <p className="mt-3 text-sm text-muted-foreground">
                We earn a commission from our travel partners at no extra cost to you.
              </p>
            </div>
          </SectionContainer>

          {/* 6. Trust and transparency */}
          <SectionContainer className="bg-background">
            <SectionHeading
              headline="How we work"
              supporting="BookingsFinder is a travel planning platform. We help you plan, prepare, and compare — then connect you to our booking partners. We earn a commission when you book through our partners, at no extra cost to you."
            />
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto text-center">
              {[
                { title: "Compare with partners", description: "We work with travel booking partners to show you available offers." },
                { title: "Plan in one place", description: "Organise every trip, booking, and deadline in a single workspace." },
                { title: "Travel ready", description: "Know exactly what you need before you go — visas, documents, insurance." },
              ].map((item) => (
                <div key={item.title} className="p-6 rounded-xl bg-card border border-border">
                  <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </SectionContainer>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
