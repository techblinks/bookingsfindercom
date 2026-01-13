import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Globe, Award, Heart } from "lucide-react";

const AboutUs = () => {
  return (
    <>
      <Helmet>
        <title>About Us | BookingsFinder</title>
        <meta name="description" content="Learn about BookingsFinder - your trusted travel comparison platform helping millions find the best deals on flights and hotels worldwide." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
            <div className="container text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">About BookingsFinder</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                We're on a mission to make travel accessible to everyone by helping you find the best deals across hundreds of airlines and hotels.
              </p>
            </div>
          </section>

          {/* Our Story */}
          <section className="py-16">
            <div className="container">
              <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold mb-6">Our Story</h2>
                <p className="text-muted-foreground mb-4">
                  BookingsFinder was founded with a simple idea: travel should be affordable and accessible to everyone. We noticed how difficult it was to compare prices across different travel sites, spending hours switching between tabs just to find the best deal.
                </p>
                <p className="text-muted-foreground mb-4">
                  That's why we built BookingsFinder - a single platform that aggregates prices from over 500 airlines and more than 1 million hotels worldwide. Our technology searches across multiple providers in real-time, ensuring you always get the best available price.
                </p>
                <p className="text-muted-foreground">
                  Today, we help millions of travelers save time and money on their journeys. Whether you're planning a budget backpacking trip or a luxury getaway, we're here to help you find the perfect deal.
                </p>
              </div>
            </div>
          </section>

          {/* Values */}
          <section className="py-16 bg-muted/50">
            <div className="container">
              <h2 className="text-3xl font-bold text-center mb-12">Our Values</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Customer First</h3>
                    <p className="text-sm text-muted-foreground">
                      Every decision we make starts with how it benefits our users.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Globe className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Global Reach</h3>
                    <p className="text-sm text-muted-foreground">
                      We connect you with travel options from every corner of the world.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Award className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Transparency</h3>
                    <p className="text-sm text-muted-foreground">
                      No hidden fees or surprises. What you see is what you pay.
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6 text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Heart className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">Passion for Travel</h3>
                    <p className="text-sm text-muted-foreground">
                      We're travelers ourselves and understand your needs.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </section>

          {/* Stats */}
          <section className="py-16">
            <div className="container">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">500+</p>
                  <p className="text-muted-foreground">Airlines</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">1M+</p>
                  <p className="text-muted-foreground">Hotels</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">50M+</p>
                  <p className="text-muted-foreground">Happy Travelers</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary mb-2">190+</p>
                  <p className="text-muted-foreground">Countries</p>
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

export default AboutUs;
