import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSearch from "@/components/search/HeroSearch";
import DestinationCard from "@/components/cards/DestinationCard";
import WhyBookWithUs from "@/components/sections/WhyBookWithUs";
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
                Find your next adventure
              </h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Compare prices from hundreds of airlines and hotels to get the best deals.
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

        {/* Why Book With Us */}
        <WhyBookWithUs />

        {/* Deals Section Placeholder */}
        <section id="deals" className="py-12 md:py-16 bg-secondary/30">
          <div className="container">
            <div className="text-center mb-8">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-1">
                Today's Best Deals
              </h2>
              <p className="text-muted-foreground">
                Limited time offers on flights and hotels
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="grid md:grid-cols-2 gap-0">
                <div className="aspect-video md:aspect-auto relative">
                  <img
                    src="https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=1200&q=80"
                    alt="Flash sale destination"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-4 left-4">
                    <span className="deal-badge text-sm px-3 py-1">Flash Sale</span>
                  </div>
                </div>
                <div className="p-6 md:p-8 flex flex-col justify-center">
                  <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                    Tokyo & Kyoto Adventure
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    7 nights including round-trip flights and premium hotels
                  </p>
                  <div className="flex items-baseline gap-3 mb-6">
                    <span className="text-3xl font-bold text-foreground">$1,299</span>
                    <span className="text-lg text-muted-foreground line-through">$1,899</span>
                    <span className="text-sm font-medium text-success">Save 32%</span>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button className="inline-flex items-center justify-center h-12 px-6 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors">
                      View Deal
                    </button>
                    <p className="text-sm text-muted-foreground self-center">
                      Offer ends in 2 days
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

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
