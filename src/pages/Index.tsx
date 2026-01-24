import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowRight, Plane } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import PopularRoutes from "@/components/sections/PopularRoutes";
import HowItWorks from "@/components/sections/HowItWorks";
import WhyBookWithUs from "@/components/sections/WhyBookWithUs";
import TopDeals from "@/components/sections/TopDeals";
import { useHomeAds } from "@/hooks/useHomeAds";
import { HomeAdSlot } from "@/components/ads/HomeAdSlot";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Index = () => {
  const { ads, trackImpression, trackClick } = useHomeAds();
  const { homepageSections, heroSearchTabs, isLoading: settingsLoading } = useSiteSettings();

  return (
    <>
      <Helmet>
        <title>BookingsFinder - Compare Cheap Flights & Hotels | Best Travel Deals</title>
        <meta 
          name="description" 
          content="Search and compare cheap flights from 500+ airlines. Find the best hotel deals worldwide. BookingsFinder helps you save money on travel bookings." 
        />
        <meta name="keywords" content="cheap flights, flight comparison, hotel deals, travel booking, airfare, vacation deals" />
        <meta property="og:title" content="BookingsFinder - Compare Cheap Flights & Hotels" />
        <meta property="og:description" content="Search and compare cheap flights from 500+ airlines. Find the best hotel deals worldwide." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://bookingsfinder.com" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebSite",
            "name": "BookingsFinder",
            "url": "https://bookingsfinder.com",
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
        <Header />

        <main className="flex-1">
          {/* Hero Section with Search - Pass settings for tab visibility */}
          <HeroSection showFlights={heroSearchTabs.flights} showHotels={heroSearchTabs.hotels} />

          {/* Ad Slot: Below Hero - High visibility placement */}
          <HomeAdSlot 
            ad={ads['hero_below']} 
            placement="hero_below"
            onImpression={trackImpression}
            onClick={trackClick}
          />

          {/* Popular Routes - Dynamic location-based top searches */}
          {homepageSections.popular_routes && <PopularRoutes />}

          {/* Ad Slot: Between Sections - Contextual placement */}
          <HomeAdSlot 
            ad={ads['between_sections']} 
            placement="between_sections"
            onImpression={trackImpression}
            onClick={trackClick}
          />

          {/* How It Works Banner */}
          {homepageSections.how_it_works && <HowItWorks />}

          {/* Why Book With Us */}
          {homepageSections.why_book && <WhyBookWithUs />}

          {/* Top Flight Destinations CTA */}
          <section className="py-12 md:py-16 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5">
            <div className="container">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-6 md:p-8 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Plane className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">
                      Explore Top Flight Destinations
                    </h2>
                    <p className="text-muted-foreground mt-1">
                      Discover the 20 most popular routes with the best deals from your location
                    </p>
                  </div>
                </div>
                <Link 
                  to="/top-flight-destinations"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-full font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
                >
                  View Top 20 Routes
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </section>

          {/* Top Deals */}
          {homepageSections.top_deals && <TopDeals />}

          {/* Ad Slot: Above Footer - Last chance placement */}
          <HomeAdSlot 
            ad={ads['footer_above']} 
            placement="footer_above"
            onImpression={trackImpression}
            onClick={trackClick}
          />

          {/* Trust Stats */}
          {homepageSections.trust_stats && (
            <section className="py-12 md:py-16 bg-muted/50">
              <div className="container">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
                  <div className="p-6">
                    <p className="text-3xl md:text-4xl font-bold text-primary mb-2">500+</p>
                    <p className="text-sm text-muted-foreground">Airlines</p>
                  </div>
                  <div className="p-6">
                    <p className="text-3xl md:text-4xl font-bold text-primary mb-2">1M+</p>
                    <p className="text-sm text-muted-foreground">Hotels</p>
                  </div>
                  <div className="p-6">
                    <p className="text-3xl md:text-4xl font-bold text-primary mb-2">50M+</p>
                    <p className="text-sm text-muted-foreground">Happy Travelers</p>
                  </div>
                  <div className="p-6">
                    <p className="text-3xl md:text-4xl font-bold text-primary mb-2">24/7</p>
                    <p className="text-sm text-muted-foreground">Customer Support</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
