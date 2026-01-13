import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSection from "@/components/home/HeroSection";
import PopularDestinations from "@/components/sections/PopularDestinations";
import HowItWorks from "@/components/sections/HowItWorks";
import WhyBookWithUs from "@/components/sections/WhyBookWithUs";
import TopDeals from "@/components/sections/TopDeals";

const Index = () => {
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
          {/* Hero Section with Search */}
          <HeroSection />

          {/* Popular Destinations */}
          <PopularDestinations />

          {/* How It Works Banner */}
          <HowItWorks />

          {/* Why Book With Us */}
          <WhyBookWithUs />

          {/* Top Deals */}
          <TopDeals />

          {/* Trust Stats */}
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
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Index;
