import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Search, ExternalLink, Shield, DollarSign, CheckCircle, HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What exactly does BookingsFinder do?",
    a: "BookingsFinder is a travel meta-search engine. We aggregate flight and hotel prices from hundreds of travel websites, airlines, and booking platforms so you can compare them all in one place. When you find a deal you like, we redirect you directly to the travel provider's website to complete your booking."
  },
  {
    q: "Why don't you sell tickets directly?",
    a: "We believe in transparency and giving you the best choice. By not selling tickets ourselves, we can remain completely impartial and show you the genuine lowest prices from across the web. We're not incentivized to push you toward any particular provider – our only goal is helping you find the best deal."
  },
  {
    q: "Is BookingsFinder really free to use?",
    a: "Yes, 100% free. We earn a small commission from our partner sites when you complete a booking through one of our links. This commission comes from the partner, not from you – you pay the same price you would if you'd gone directly to their site."
  },
  {
    q: "Where does my payment go when I book?",
    a: "Your payment goes directly to the airline, hotel, or travel agency you choose to book with. BookingsFinder never handles your payment information. All financial transactions happen on secure, verified partner websites."
  },
  {
    q: "Who do I contact if I have issues with my booking?",
    a: "Since your booking is made directly with the travel provider (airline, hotel, or booking site), they are responsible for all aspects of your reservation including changes, cancellations, and customer support. We recommend keeping your booking confirmation and contacting them directly."
  },
  {
    q: "How do you make money if your service is free?",
    a: "We earn affiliate commissions from our travel partners when users complete bookings through our links. This is a standard practice in the travel industry and doesn't affect the price you pay. Think of us as a helpful comparison tool that gets a small referral fee."
  },
  {
    q: "Are the prices I see accurate?",
    a: "We work hard to display accurate, up-to-date prices by refreshing data from our partners regularly. However, prices can change rapidly in the travel industry. The final price you pay is always shown on the booking partner's site before you complete your purchase."
  },
  {
    q: "Do you have partnerships with specific airlines or hotels?",
    a: "We partner with hundreds of travel sites, airlines, and booking platforms. Our search results are based on availability and price, not on which partners pay us more. We show you all available options so you can make the best choice for your needs."
  }
];

// JSON-LD schema for FAQ page
const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqs.map(faq => ({
    "@type": "Question",
    "name": faq.q,
    "acceptedAnswer": {
      "@type": "Answer",
      "text": faq.a
    }
  }))
};

const howItWorks = [
  {
    icon: Search,
    title: "1. Search & Compare",
    description: "Enter your travel details and we'll search hundreds of sites instantly to find all available options."
  },
  {
    icon: DollarSign,
    title: "2. Find the Best Price",
    description: "Compare prices side by side with no bias. We show you the genuine lowest prices from verified partners."
  },
  {
    icon: ExternalLink,
    title: "3. Book Directly",
    description: "Click through to your chosen provider and book directly on their secure website."
  },
  {
    icon: Shield,
    title: "4. Travel with Confidence",
    description: "Your booking is with a verified travel partner. All payments and support are handled by them."
  }
];

const WhyWeDontSellTickets = () => {
  return (
    <>
      <Helmet>
        <title>Why We Don't Sell Tickets | BookingsFinder</title>
        <meta 
          name="description" 
          content="Learn why BookingsFinder is a travel meta-search platform that compares prices instead of selling tickets directly. Discover how our free service works." 
        />
        <link rel="canonical" href="https://bookingsfinder.com/why-we-dont-sell-tickets" />
        <script type="application/ld+json">
          {JSON.stringify(faqSchema)}
        </script>
      </Helmet>

      <Header />

      <main className="min-h-screen bg-background">
        {/* Hero Section */}
        <section className="bg-primary py-12 md:py-16">
          <div className="container text-center">
            <div className="max-w-3xl mx-auto">
              <div className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-primary-foreground/10 flex items-center justify-center">
                  <HelpCircle className="h-8 w-8 text-primary-foreground" />
                </div>
              </div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
                Why We Don't Sell Tickets
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/80">
                Understanding how BookingsFinder works as a travel meta-search platform
              </p>
            </div>
          </div>
        </section>

        {/* Main Explanation */}
        <section className="py-12 md:py-16">
          <div className="container">
            <div className="max-w-4xl mx-auto">
              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-12">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-foreground mb-2">
                      We're a Comparison Site, Not a Travel Agency
                    </h2>
                    <p className="text-muted-foreground leading-relaxed">
                      BookingsFinder is a <strong>travel meta-search engine</strong>. We help you compare prices 
                      from hundreds of airlines, hotels, and travel booking sites – all in one place. When you 
                      find a deal you like, we send you directly to the provider's website where you complete 
                      your booking and payment.
                    </p>
                  </div>
                </div>
                
                <div className="bg-muted/50 rounded-xl p-4 border border-border">
                  <p className="text-sm text-muted-foreground text-center">
                    <strong className="text-foreground">Important:</strong> BookingsFinder does not sell flights, 
                    hotels, or any travel products. All bookings and payments are processed directly by our 
                    verified travel partners.
                  </p>
                </div>
              </div>

              {/* How It Works */}
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
                How BookingsFinder Works
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {howItWorks.map((step, index) => (
                  <div 
                    key={index}
                    className="bg-card rounded-xl border border-border p-6 hover:border-primary/20 transition-colors"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <step.icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground mb-1">{step.title}</h3>
                        <p className="text-sm text-muted-foreground">{step.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Benefits */}
              <div className="bg-card rounded-2xl border border-border p-6 md:p-8 mb-12">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Benefits of Our Meta-Search Model
                </h2>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Unbiased Comparison:</strong>
                      <span className="text-muted-foreground ml-1">
                        We show you all available options without favoring any particular provider.
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">No Hidden Fees:</strong>
                      <span className="text-muted-foreground ml-1">
                        We don't add any markup. You pay the same price as going directly to the booking site.
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">More Choices:</strong>
                      <span className="text-muted-foreground ml-1">
                        Access prices from hundreds of providers instantly, saving you hours of searching.
                      </span>
                    </div>
                  </li>
                  <li className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-success shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-foreground">Direct Booking Benefits:</strong>
                      <span className="text-muted-foreground ml-1">
                        Earn airline miles, hotel points, and enjoy direct customer support from your provider.
                      </span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* FAQ Section */}
              <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center">
                Frequently Asked Questions
              </h2>
              
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, index) => (
                  <AccordionItem 
                    key={index} 
                    value={`faq-${index}`}
                    className="bg-card border border-border rounded-xl px-6 data-[state=open]:border-primary/20"
                  >
                    <AccordionTrigger className="text-left font-semibold hover:no-underline py-4">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground pb-4">
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>

              {/* Contact CTA */}
              <div className="mt-12 text-center">
                <p className="text-muted-foreground mb-4">
                  Have more questions about how BookingsFinder works?
                </p>
                <a 
                  href="/contact" 
                  className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
                >
                  Contact our team
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
};

export default WhyWeDontSellTickets;
