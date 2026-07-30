import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { HeroV2 } from "@/components/home-v2/HeroV2";
import { IntentSelector } from "@/components/home-v2/IntentSelector";
import { ReadinessPreview } from "@/components/home-v2/ReadinessPreview";
import { TrueTripCostPreview } from "@/components/home-v2/TrueTripCostPreview";
import { TripWorkspacePreview } from "@/components/home-v2/TripWorkspacePreview";
import { TravelToolsGrid } from "@/components/home-v2/TravelToolsGrid";
import { FlightHandoff } from "@/components/home-v2/FlightHandoff";
import { TrustTransparency } from "@/components/home-v2/TrustTransparency";
import { SectionContainer } from "@/components/home-v2/SectionContainer";
import { SectionHeading } from "@/components/home-v2/SectionHeading";
import { PopularDestinationsCards } from "@/components/sections/PopularDestinationsCards";
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

          {/* 4. True Trip Cost Preview */}
          <TrueTripCostPreview />

          {/* 5. Trip Workspace Preview */}
          <TripWorkspacePreview />

          {/* 6. Travel Tools Grid */}
          <TravelToolsGrid />

          {/* 7. Flight Search Handoff */}
          <FlightHandoff />

          {/* 8. Popular Destinations — curated custom cards */}
          <PopularDestinationsCards />

          {/* 9. Popular Routes */}
          <SectionContainer className="bg-muted/50">
            <SectionHeading
              headline="Popular flight routes"
              supporting="Explore commonly searched routes and continue to compare available flight options."
            />
            <PopularRoutes showHeading={false} />
          </SectionContainer>

          {/* 10. Trust and Transparency */}
          <TrustTransparency />
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
