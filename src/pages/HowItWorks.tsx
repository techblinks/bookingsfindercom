import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { 
  Search, 
  Bell, 
  CreditCard, 
  Shield, 
  Clock, 
  Plane, 
  TrendingDown, 
  Mail, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Globe,
  Users,
  Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const HowItWorks = () => {
  const steps = [
    {
      number: "01",
      icon: Search,
      title: "Search & Compare",
      description: "Enter your travel details and we instantly scan 900+ airlines and travel sites to find every available option.",
      details: [
        "Compare prices across all major airlines",
        "See multiple booking options side-by-side",
        "Filter by price, duration, stops & more",
        "View flexible date options to find the cheapest days"
      ],
      color: "from-blue-500 to-cyan-500"
    },
    {
      number: "02",
      icon: TrendingDown,
      title: "Track Prices",
      description: "Set up price alerts and we'll monitor your routes 24/7. Get notified instantly when prices drop.",
      details: [
        "Real-time price monitoring",
        "Customizable price drop thresholds",
        "Historical price charts",
        "Predictions for best booking times"
      ],
      color: "from-purple-500 to-pink-500"
    },
    {
      number: "03",
      icon: Mail,
      title: "Get Notified",
      description: "Receive instant email alerts when prices drop for your saved routes. Never miss a deal again!",
      details: [
        "Instant email notifications",
        "Weekly deals digest",
        "Flash sale alerts",
        "Personalized recommendations"
      ],
      color: "from-orange-500 to-red-500"
    },
    {
      number: "04",
      icon: CreditCard,
      title: "Book Direct",
      description: "Found the perfect deal? Click through to book directly with the airline or hotel. No hidden fees!",
      details: [
        "Book directly with providers",
        "No booking fees from us",
        "Secure redirect to official sites",
        "Earn airline loyalty points"
      ],
      color: "from-green-500 to-emerald-500"
    }
  ];

  const features = [
    {
      icon: Shield,
      title: "100% Free Service",
      description: "We never charge you a booking fee. Our service is completely free to use."
    },
    {
      icon: Globe,
      title: "900+ Airlines",
      description: "We search across hundreds of airlines and travel sites to find you the best deals."
    },
    {
      icon: Clock,
      title: "24/7 Monitoring",
      description: "Our systems continuously track prices so you don't have to."
    },
    {
      icon: Zap,
      title: "Instant Alerts",
      description: "Get notified within seconds when prices drop for your saved routes."
    },
    {
      icon: Users,
      title: "2M+ Happy Travelers",
      description: "Join millions of travelers who've saved money with our platform."
    },
    {
      icon: Sparkles,
      title: "No Hidden Fees",
      description: "What you see is what you pay. We redirect you directly to book."
    }
  ];

  const faqs = [
    {
      question: "How does BookingsFinder make money?",
      answer: "We earn a small commission from airlines and travel sites when you book through our links. This doesn't affect the price you pay – you'll pay the same as if you went directly to the airline."
    },
    {
      question: "Is my data safe?",
      answer: "Absolutely. We only store your email for price alerts and never share your information with third parties. You can unsubscribe at any time."
    },
    {
      question: "How often do you check prices?",
      answer: "We monitor prices continuously, 24 hours a day, 7 days a week. When a price drops, you'll be notified immediately via email."
    },
    {
      question: "Can I book hotels too?",
      answer: "Yes! We compare prices across major hotel booking sites to help you find the best accommodation deals alongside your flights."
    },
    {
      question: "What if I find a lower price elsewhere?",
      answer: "We strive to show the lowest available prices, but we encourage you to compare. If you find a better deal, please let us know!"
    }
  ];

  return (
    <>
      <Helmet>
        <title>How It Works | BookingsFinder - Free Flight & Hotel Search</title>
        <meta 
          name="description" 
          content="Learn how BookingsFinder helps you find the cheapest flights and hotels. Search, compare, set price alerts, and book directly with no hidden fees." 
        />
        <meta name="keywords" content="how it works, flight search, price alerts, cheap flights, hotel deals, travel booking" />
        <link rel="canonical" href="https://bookingsfinder.com/how-it-works" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Header />
        
        <main>
          {/* Hero Section */}
          <section className="relative py-16 md:py-24 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-purple-500/5" />
            <div className="container relative">
              <div className="text-center max-w-3xl mx-auto">
                <div className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-2 text-sm font-medium mb-6">
                  <Plane className="h-4 w-4" />
                  Free flight & hotel search
                </div>
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground mb-6">
                  Find Cheap Flights in{" "}
                  <span className="bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                    4 Simple Steps
                  </span>
                </h1>
                <p className="text-lg md:text-xl text-muted-foreground mb-8">
                  We search 900+ airlines to find the cheapest flights. Set price alerts, 
                  get notified when prices drop, and book directly with no hidden fees.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button size="lg" asChild>
                    <Link to="/">
                      Start Searching
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/faqs">Read FAQs</Link>
                  </Button>
                </div>
              </div>
            </div>
          </section>

          {/* Steps Section */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  How It Works
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  From search to booking, we make finding cheap flights effortless.
                </p>
              </div>

              <div className="space-y-12 md:space-y-24">
                {steps.map((step, index) => (
                  <div 
                    key={step.number}
                    className={`flex flex-col ${index % 2 === 1 ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-8 md:gap-16`}
                  >
                    {/* Visual */}
                    <div className="flex-1 w-full">
                      <div className={`relative bg-gradient-to-br ${step.color} rounded-3xl p-8 md:p-12 aspect-square md:aspect-video flex items-center justify-center`}>
                        <div className="absolute top-6 left-6 text-white/30 text-6xl md:text-8xl font-bold">
                          {step.number}
                        </div>
                        <step.icon className="h-24 w-24 md:h-32 md:w-32 text-white" strokeWidth={1.5} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center`}>
                          <step.icon className="h-6 w-6 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                          Step {step.number}
                        </span>
                      </div>
                      <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-4">
                        {step.title}
                      </h3>
                      <p className="text-lg text-muted-foreground mb-6">
                        {step.description}
                      </p>
                      <ul className="space-y-3">
                        {step.details.map((detail, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                            <span className="text-foreground">{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* Features Grid */}
          <section className="py-16 md:py-24">
            <div className="container">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Why Travelers Love Us
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  We're on a mission to make travel affordable for everyone.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {features.map((feature) => (
                  <div 
                    key={feature.title}
                    className="bg-card rounded-2xl p-6 border border-border hover:shadow-lg transition-all duration-300 hover:-translate-y-1"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <feature.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">
                      {feature.title}
                    </h3>
                    <p className="text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* FAQ Section */}
          <section className="py-16 md:py-24 bg-muted/30">
            <div className="container">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Frequently Asked Questions
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Got questions? We've got answers.
                </p>
              </div>

              <div className="max-w-3xl mx-auto space-y-6">
                {faqs.map((faq, index) => (
                  <div 
                    key={index}
                    className="bg-card rounded-xl p-6 border border-border"
                  >
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {faq.question}
                    </h3>
                    <p className="text-muted-foreground">
                      {faq.answer}
                    </p>
                  </div>
                ))}
              </div>

              <div className="text-center mt-12">
                <Button variant="outline" size="lg" asChild>
                  <Link to="/faqs">
                    View All FAQs
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          {/* CTA Section */}
          <section className="py-16 md:py-24">
            <div className="container">
              <div className="bg-gradient-to-br from-primary via-purple-500 to-pink-500 rounded-3xl p-8 md:p-16 text-center">
                <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                  Ready to Find Your Next Adventure?
                </h2>
                <p className="text-lg text-white/80 mb-8 max-w-2xl mx-auto">
                  Join over 2 million travelers who've saved money with BookingsFinder. 
                  Start searching now – it's completely free!
                </p>
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/">
                    Search Flights Now
                    <Plane className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default HowItWorks;
