import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Plane, Hotel, CreditCard, AlertCircle, Clock, Mail } from "lucide-react";

const HelpCenter = () => {
  const categories = [
    {
      icon: Plane,
      title: "Flights",
      description: "Booking, cancellations, and flight-related questions",
      articles: 12,
    },
    {
      icon: Hotel,
      title: "Hotels",
      description: "Reservations, check-in, and accommodation issues",
      articles: 10,
    },
    {
      icon: CreditCard,
      title: "Payments",
      description: "Billing, refunds, and payment methods",
      articles: 8,
    },
    {
      icon: AlertCircle,
      title: "Troubleshooting",
      description: "Common issues and how to resolve them",
      articles: 15,
    },
  ];

  const popularArticles = [
    "How do I change or cancel my booking?",
    "What is BookingsFinder and how does it work?",
    "Why is the price different when I click through?",
    "How do I set up a price alert?",
    "What payment methods are accepted?",
    "How do I contact customer support?",
  ];

  return (
    <>
      <Helmet>
        <title>Help Center | BookingsFinder</title>
        <meta name="description" content="Get help with your BookingsFinder questions. Browse our knowledge base or contact support for assistance with flights, hotels, and bookings." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
            <div className="container text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">How can we help you?</h1>
              <div className="max-w-xl mx-auto relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                  placeholder="Search for help articles..." 
                  className="pl-12 h-12 text-lg"
                />
              </div>
            </div>
          </section>

          {/* Categories */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-2xl font-bold mb-8">Browse by Category</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                {categories.map((category, index) => (
                  <Card key={index} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                        <category.icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle>{category.title}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-2">{category.description}</p>
                      <p className="text-sm text-primary">{category.articles} articles</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </section>

          {/* Popular Articles */}
          <section className="py-16 bg-muted/50">
            <div className="container">
              <h2 className="text-2xl font-bold mb-8">Popular Articles</h2>
              <div className="max-w-2xl">
                <ul className="space-y-4">
                  {popularArticles.map((article, index) => (
                    <li key={index}>
                      <a href="#" className="flex items-center gap-3 p-4 bg-background rounded-lg hover:shadow-sm transition-shadow">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <span className="text-sm font-medium text-primary">{index + 1}</span>
                        </div>
                        <span className="text-foreground hover:text-primary transition-colors">{article}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Contact */}
          <section className="py-16">
            <div className="container">
              <div className="max-w-2xl mx-auto text-center">
                <h2 className="text-2xl font-bold mb-4">Still need help?</h2>
                <p className="text-muted-foreground mb-8">
                  Our support team is here to assist you with any questions or issues.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link to="/contact">
                    <Button size="lg">
                      <Mail className="h-4 w-4 mr-2" />
                      Contact Support
                    </Button>
                  </Link>
                  <Link to="/faqs">
                    <Button variant="outline" size="lg">
                      <Clock className="h-4 w-4 mr-2" />
                      View FAQs
                    </Button>
                  </Link>
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

export default HelpCenter;
