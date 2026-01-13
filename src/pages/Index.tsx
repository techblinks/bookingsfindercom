import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import HeroSearch from "@/components/search/HeroSearch";
import { Shield, Clock, Sparkles } from "lucide-react";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />

      <main className="flex-1">
        {/* Hero Section - Minimal and focused */}
        <section className="relative py-16 md:py-24 lg:py-32">
          <div className="container max-w-4xl mx-auto px-4">
            {/* Headline */}
            <div className="text-center mb-10 md:mb-12">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
                Find the best travel deals
              </h1>
              <p className="text-base md:text-lg text-muted-foreground max-w-xl mx-auto">
                Compare prices across 500+ airlines and millions of hotels
              </p>
            </div>

            {/* Search Box */}
            <HeroSearch />
          </div>
        </section>

        {/* Trust Indicators - Minimal */}
        <section className="py-12 md:py-16 border-t border-border">
          <div className="container max-w-4xl mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-12">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Best prices guaranteed</h3>
                  <p className="text-sm text-muted-foreground">
                    We compare prices from hundreds of travel sites to find you the lowest fares
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Search in seconds</h3>
                  <p className="text-sm text-muted-foreground">
                    Find and compare flights and hotels in one simple search
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">Trusted by millions</h3>
                  <p className="text-sm text-muted-foreground">
                    Join over 50 million travelers who trust us to find their perfect trip
                  </p>
                </div>
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