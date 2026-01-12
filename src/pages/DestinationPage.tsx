import { useParams } from "react-router-dom";
import { Plane, Building2, ChevronRight, Home } from "lucide-react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { CheapestMonthTable, PopularProviders, TravelTipsSection } from "@/components/destination/DestinationSections";
import EmbeddedSearchForm from "@/components/destination/EmbeddedSearchForm";
import { getDestinationBySlug, flightDestinationData, hotelDestinationData } from "@/data/destinationData";
import { Link } from "react-router-dom";

const DestinationPage = () => {
  const { slug } = useParams<{ slug: string }>();
  
  // Get data based on slug, fallback to flight data for demo
  const data = slug ? getDestinationBySlug(slug) : null;
  const pageData = data || (slug?.includes("hotels") ? hotelDestinationData : flightDestinationData);

  const isFlights = pageData.type === "flights";

  // Generate JSON-LD structured data
  const structuredData = {
    "@context": "https://schema.org",
    "@type": isFlights ? "FAQPage" : "Hotel",
    ...(isFlights ? {
      "mainEntity": pageData.travelTips.map(tip => ({
        "@type": "Question",
        "name": tip.title,
        "acceptedAnswer": {
          "@type": "Answer",
          "text": tip.content
        }
      }))
    } : {
      "name": pageData.title,
      "description": pageData.metaDescription,
      "address": {
        "@type": "PostalAddress",
        "addressLocality": pageData.destination
      }
    })
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      {/* Schema.org JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <main className="flex-1">
        {/* Hero Section */}
        <header className="bg-gradient-to-br from-primary/10 via-primary/5 to-background border-b border-border">
          <div className="container mx-auto px-4 py-8 md:py-12">
            {/* Breadcrumb Navigation */}
            <nav aria-label="Breadcrumb" className="mb-6">
              <ol className="flex items-center gap-2 text-sm" itemScope itemType="https://schema.org/BreadcrumbList">
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <Link 
                    to="/" 
                    className="text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
                    itemProp="item"
                  >
                    <Home className="h-4 w-4" />
                    <span itemProp="name">Home</span>
                  </Link>
                  <meta itemProp="position" content="1" />
                </li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <Link 
                    to={isFlights ? "/flights" : "/hotels"} 
                    className="text-muted-foreground hover:text-primary transition-colors"
                    itemProp="item"
                  >
                    <span itemProp="name">{isFlights ? "Flights" : "Hotels"}</span>
                  </Link>
                  <meta itemProp="position" content="2" />
                </li>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <li itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem">
                  <span className="text-foreground font-medium" itemProp="name">
                    {isFlights 
                      ? `${pageData.origin} to ${pageData.destination}`
                      : `Hotels in ${pageData.destination}`
                    }
                  </span>
                  <meta itemProp="position" content="3" />
                </li>
              </ol>
            </nav>

            {/* Page Title */}
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
                  {pageData.title}
                </h1>
                <p className="text-lg text-muted-foreground">
                  {isFlights 
                    ? `Find the best flight deals from ${pageData.origin} to ${pageData.destination}`
                    : `Discover and book the perfect stay in ${pageData.destination}`
                  }
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <article className="container mx-auto px-4 py-8 md:py-12">
          {/* Intro Section */}
          <section className="mb-12" aria-labelledby="intro-heading">
            <h2 id="intro-heading" className="sr-only">Introduction</h2>
            <div className="prose prose-lg max-w-none">
              {pageData.introText.split('\n\n').map((paragraph, index) => (
                <p key={index} className="text-muted-foreground leading-relaxed mb-4">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          {/* Embedded Search Form */}
          <EmbeddedSearchForm
            type={pageData.type}
            defaultOrigin={pageData.origin}
            defaultDestination={pageData.destination}
          />

          {/* Cheapest Month Table */}
          <CheapestMonthTable months={pageData.cheapestMonths} type={pageData.type} />

          {/* Popular Providers */}
          <PopularProviders providers={pageData.popularProviders} type={pageData.type} />

          {/* Travel Tips */}
          <TravelTipsSection tips={pageData.travelTips} destination={pageData.destination} />

          {/* Secondary CTA */}
          <section className="bg-card rounded-2xl border border-border p-8 text-center">
            <h2 className="text-2xl font-bold text-foreground mb-3">
              Ready to Book Your {isFlights ? "Flight" : "Hotel"}?
            </h2>
            <p className="text-muted-foreground mb-6 max-w-2xl mx-auto">
              {isFlights 
                ? `Compare prices from multiple airlines and find the best deals on flights from ${pageData.origin} to ${pageData.destination}.`
                : `Browse through hundreds of hotels in ${pageData.destination} and find the perfect accommodation for your trip.`
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

export default DestinationPage;
