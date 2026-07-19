import { Helmet } from "react-helmet-async";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const FAQs = () => {
  const faqs = [
    {
      category: "General",
      questions: [
        {
          q: "What is BookingsFinder?",
          a: "BookingsFinder is a travel comparison platform that helps you find available deals on flights and hotels by searching across our travel partners. We don't sell tickets or make bookings directly – we help you compare prices and then redirect you to the booking site of your choice.",
        },
        {
          q: "Is BookingsFinder free to use?",
          a: "Yes, BookingsFinder is completely free for travelers. We earn a small commission from travel sites when you make a booking through our links, which allows us to keep our service free for everyone.",
        },
        {
          q: "How does BookingsFinder make money?",
          a: "We earn affiliate commissions from travel sites when users click through our links and complete bookings. This doesn't affect the price you pay – in fact, we often help you find lower prices than booking directly.",
        },
      ],
    },
    {
      category: "Flights",
      questions: [
        {
          q: "Why are flight prices different when I click through?",
          a: "Flight prices can change rapidly due to demand, seat availability, and airline pricing algorithms. The price may also vary based on your location, device, or browsing history. We always try to show the most accurate prices, but the final price is determined by the airline or booking site.",
        },
        {
          q: "Can I book multi-city or open-jaw flights?",
          a: "Currently, we support one-way and round-trip flights. For complex itineraries like multi-city trips, we recommend searching each leg separately or visiting an airline's website directly.",
        },
        {
          q: "How do price alerts work?",
          a: "When you set up a price alert, we monitor the price for your selected route and send you an email notification when the price drops. You can manage your alerts from the 'My Alerts' page.",
        },
      ],
    },
    {
      category: "Hotels",
      questions: [
        {
          q: "Are the hotel prices shown per night or for the total stay?",
          a: "We show prices per night by default, but the total price for your stay is always displayed before you click through to book. Make sure to check the number of nights and any additional fees on the booking site.",
        },
        {
          q: "Can I see reviews for hotels?",
          a: "We show aggregate ratings from multiple sources. For detailed reviews, we recommend checking the booking site or dedicated review platforms like TripAdvisor.",
        },
      ],
    },
    {
      category: "Bookings & Payments",
      questions: [
        {
          q: "Does BookingsFinder store my payment information?",
          a: "No, we never handle your payment information. All payments are processed directly by the airline, hotel, or booking site you choose. We simply help you find and compare prices.",
        },
        {
          q: "I have a problem with my booking. Who should I contact?",
          a: "Since bookings are made directly with airlines, hotels, or booking sites, you should contact them for any issues with your reservation. We don't have access to your booking details. However, if you have questions about our service, feel free to contact us.",
        },
        {
          q: "Can I cancel or modify my booking through BookingsFinder?",
          a: "No, you'll need to contact the airline, hotel, or booking site where you made your reservation. They handle all changes and cancellations according to their own policies.",
        },
      ],
    },
    {
      category: "Technical",
      questions: [
        {
          q: "Why am I seeing different prices on different devices?",
          a: "Some travel sites may show different prices based on your location, device, or browsing history. Using incognito/private browsing mode can sometimes help you see more consistent prices.",
        },
        {
          q: "The website isn't working properly. What should I do?",
          a: "Try clearing your browser cache and cookies, or try a different browser. If the problem persists, please contact us with details about the issue and we'll investigate.",
        },
      ],
    },
  ];

  return (
    <>
      <Helmet>
        <title>FAQs | BookingsFinder</title>
        <meta name="description" content="Find answers to frequently asked questions about BookingsFinder, including how we work, booking inquiries, and technical support." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
            <div className="container text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Frequently Asked Questions</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Find answers to common questions about BookingsFinder and how our travel comparison service works.
              </p>
            </div>
          </section>

          {/* FAQ Sections */}
          <section className="py-16">
            <div className="container max-w-3xl">
              {faqs.map((section, sectionIndex) => (
                <div key={sectionIndex} className="mb-12">
                  <h2 className="text-2xl font-bold mb-6">{section.category}</h2>
                  <Accordion type="single" collapsible className="space-y-4">
                    {section.questions.map((faq, faqIndex) => (
                      <AccordionItem 
                        key={faqIndex} 
                        value={`${sectionIndex}-${faqIndex}`}
                        className="border rounded-lg px-6"
                      >
                        <AccordionTrigger className="text-left hover:no-underline">
                          {faq.q}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground">
                          {faq.a}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </div>
              ))}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default FAQs;
