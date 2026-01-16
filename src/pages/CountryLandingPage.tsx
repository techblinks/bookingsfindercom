import { useParams, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { Plane, Building2, ChevronRight, Home, MapPin, Lightbulb } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useCountryPage } from "@/hooks/useCountryPage";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import ModernHotelSearch from "@/components/search/ModernHotelSearch";

const CountryLandingPage = () => {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading, error } = useCountryPage(slug);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-3/4 mb-4" />
          <Skeleton className="h-6 w-1/2 mb-8" />
          <Skeleton className="h-64 w-full mb-8" />
          <Skeleton className="h-48 w-full" />
        </main>
        <Footer />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-12 text-center">
          <h1 className="text-3xl font-bold text-foreground mb-4">Page Not Found</h1>
          <p className="text-muted-foreground mb-6">The page you're looking for doesn't exist.</p>
          <Link to="/" className="text-primary hover:underline">Return to homepage</Link>
        </main>
        <Footer />
      </div>
    );
  }

  const isFlights = data.type === "flights";

  // FAQPage JSON-LD Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": data.faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer
      }
    }))
  };

  // WebPage JSON-LD Schema
  const webPageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": data.title,
    "description": data.meta_description,
    "url": `https://bookingsfinder.com/${data.slug}`,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://bookingsfinder.com/" },
        { "@type": "ListItem", "position": 2, "name": isFlights ? "Flights" : "Hotels", "item": `https://bookingsfinder.com/${isFlights ? "flights" : "hotels"}` },
        { "@type": "ListItem", "position": 3, "name": data.h1_title }
      ]
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{data.title}</title>
        <meta name="description" content={data.meta_description} />
        <link rel="canonical" href={`https://bookingsfinder.com/${data.slug}`} />
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
        <script type="application/ld+json">{JSON.stringify(webPageSchema)}</script>
      </Helmet>

      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <header className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-4 py-8 md:py-12">
            {/* Breadcrumb */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-sm flex-wrap">
                <li>
                  <Link to="/" className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1">
                    <Home className="h-4 w-4" />
                    <span>Home</span>
                  </Link>
                </li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <li>
                  <Link to={isFlights ? "/flights" : "/hotels"} className="text-muted-foreground hover:text-primary transition-colors">
                    {isFlights ? "Flights" : "Hotels"}
                  </Link>
                </li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <li>
                  <span className="text-foreground font-medium">{data.country_name}</span>
                </li>
              </ol>
            </nav>

            {/* H1 Title */}
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                {isFlights ? (
                  <Plane className="h-7 w-7 text-primary" />
                ) : (
                  <Building2 className="h-7 w-7 text-primary" />
                )}
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                  {data.h1_title}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {data.intro_paragraph}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Search Form */}
        <section className="container mx-auto px-4 py-8">
          <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              {isFlights ? `Search Flights from ${data.country_name}` : `Find Hotels in ${data.country_name}`}
            </h2>
            {isFlights ? (
              <ModernFlightSearch />
            ) : (
              <ModernHotelSearch />
            )}
          </div>
        </section>

        {/* Main Content */}
        <article className="container mx-auto px-4 py-8">
          <div className="prose prose-lg max-w-none mb-12">
            {data.main_content.split('\n\n').map((paragraph, index) => (
              <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                {paragraph}
              </p>
            ))}
          </div>

          {/* Popular Cities */}
          {data.popular_cities.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <MapPin className="h-6 w-6 text-primary" />
                {isFlights ? `Popular Destinations from ${data.country_name}` : `Top Cities in ${data.country_name}`}
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {data.popular_cities.map((city, index) => (
                  <Link
                    key={index}
                    to={city.slug ? `/${city.slug}` : isFlights ? "/flights" : "/hotels"}
                    className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all group"
                  >
                    <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                      {city.name}
                    </h3>
                    {city.code && (
                      <span className="text-sm text-muted-foreground">{city.code}</span>
                    )}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Popular Routes (for flights) */}
          {isFlights && data.popular_routes.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Plane className="h-6 w-6 text-primary" />
                Popular Flight Routes from {data.country_name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.popular_routes.map((route, index) => (
                  <Link
                    key={index}
                    to={route.slug ? `/d/${route.slug}` : "/flights"}
                    className="bg-card rounded-xl border border-border p-4 hover:border-primary/50 hover:shadow-md transition-all group flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Plane className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {route.from} → {route.to}
                      </h3>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Travel Tips */}
          {data.travel_tips.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
                <Lightbulb className="h-6 w-6 text-primary" />
                Travel Tips for {data.country_name}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {data.travel_tips.map((tip, index) => (
                  <div key={index} className="bg-card rounded-xl border border-border p-6">
                    <h3 className="font-semibold text-foreground mb-2">{tip.title}</h3>
                    <p className="text-muted-foreground">{tip.content}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* FAQs */}
          {data.faqs.length > 0 && (
            <section className="mb-12">
              <h2 className="text-2xl font-bold text-foreground mb-6">
                Frequently Asked Questions
              </h2>
              <Accordion type="single" collapsible className="bg-card rounded-xl border border-border">
                {data.faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`faq-${index}`} className="border-b border-border last:border-0">
                    <AccordionTrigger className="px-6 hover:no-underline">
                      <span className="text-left font-medium text-foreground">{faq.question}</span>
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4">
                      <p className="text-muted-foreground">{faq.answer}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          )}

          {/* CTA */}
          <section className="bg-card rounded-2xl border border-border p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Ready to Explore {data.country_name}?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {isFlights 
                ? `Compare prices from top airlines and find the best deals on flights from ${data.country_name}.`
                : `Browse hundreds of hotels across ${data.country_name} and find your perfect accommodation.`
              }
            </p>
            <Link to={isFlights ? "/flights" : "/hotels"}>
              <button className="inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground font-semibold px-8 py-3 rounded-lg hover:bg-primary/90 transition-colors">
                {isFlights ? "Search All Flights" : "View All Hotels"}
                <ChevronRight className="h-4 w-4" />
              </button>
            </Link>
          </section>
        </article>
      </main>

      <Footer />
    </div>
  );
};

export default CountryLandingPage;
