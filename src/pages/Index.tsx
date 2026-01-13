import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSearch from "@/components/search/HeroSearch";
import DestinationCard from "@/components/cards/DestinationCard";
import WhyBookWithUs from "@/components/sections/WhyBookWithUs";
import PopularRoutes from "@/components/sections/PopularRoutes";
import TopDeals from "@/components/sections/TopDeals";
import { destinations } from "@/data/placeholderData";
const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-12 md:py-20 bg-gradient-to-b from-primary/5 via-primary/5 to-background">
          <div className="container">
            <div className="text-center mb-8 md:mb-10">
              <h1 className="text-3xl md:text-5xl font-bold text-foreground mb-4 tracking-tight">
                Compare & Save on Travel
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Search hundreds of travel sites at once. Find the best deals on flights and hotels.
              </p>
            </div>

            <HeroSearch />
          </div>
        </section>

        {/* Popular Destinations Section */}
        <section id="destinations" className="py-12 md:py-16">
          <div className="container">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                  Popular Destinations
                </h2>
                <p className="text-muted-foreground">
                  Explore trending destinations loved by travelers
                </p>
              </div>
              <a 
                href="#" 
                className="hidden sm:inline-flex text-sm font-medium text-primary hover:underline"
              >
                View all destinations →
              </a>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {destinations.map((destination) => (
                <DestinationCard
                  key={destination.id}
                  city={destination.city}
                  country={destination.country}
                  image={destination.image}
                  price={destination.price}
                  currency={destination.currency}
                />
              ))}
            </div>

            <div className="mt-6 text-center sm:hidden">
              <a href="#" className="text-sm font-medium text-primary hover:underline">
                View all destinations →
              </a>
            </div>
          </div>
        </section>

        {/* Popular Routes */}
        <PopularRoutes />

        {/* Why Book With Us */}
        <WhyBookWithUs />

        {/* Top Deals */}
        <TopDeals />

        {/* Trust Stats */}
        <section className="py-12 md:py-16">
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
  );
};

export default Index;
