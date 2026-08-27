import { useState, useEffect, useMemo } from "react";
import { Helmet } from "react-helmet-async";
import { useParams, Link, useNavigate } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plane, ArrowRight, Search, Star, ExternalLink, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { fallbackRouteTips, fallbackRouteFaqQuestion, fallbackRouteFaqAnswer } from "./routePageFallbackCopy";
import { resolveLocation, type ResolvedLocation } from "@/lib/airportResolution";

// BF1-C: slug parsing + the route-support decision moved to a pure,
// unit-tested module. The previous inline cityToIATA map plus getIATA()'s
// `cityName.substring(0,3).toUpperCase()` fallback FABRICATED IATA codes for
// arbitrary slugs (e.g. wollongong -> "WOL") and shipped them into live
// searches. That behaviour is removed: slugs must now resolve against real
// BF1-B reference data (or an explicitly published seo_route_pages row), or
// the page renders an honest "route not supported" state.
import { parseRouteSlug, describeRouteSupport } from "@/lib/routePageResolution";

const RoutePage = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const route = useMemo(() => (slug ? parseRouteSlug(slug) : null), [slug]);
  const [dbContent, setDbContent] = useState<any>(null);
  const [isLoadingContent, setIsLoadingContent] = useState(true);
  const [originRes, setOriginRes] = useState<ResolvedLocation | null>(null);
  const [destRes, setDestRes] = useState<ResolvedLocation | null>(null);

  // Fetch published route content from DB
  useEffect(() => {
    if (!slug) return;
    const fetchContent = async () => {
      setIsLoadingContent(true);
      const { data } = await supabase
        .from('seo_route_pages' as any)
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      setDbContent(data);
      setIsLoadingContent(false);
    };
    fetchContent();
  }, [slug]);

  // BF1-C: resolve slug city names against real reference data. Published rows
  // that already carry IATA codes skip this work entirely (see gating below).
  useEffect(() => {
    if (!route) return;
    let cancelled = false;
    setOriginRes(null);
    setDestRes(null);
    const run = async () => {
      const [o, d] = await Promise.all([
        resolveLocation(route.originCity),
        resolveLocation(route.destinationCity),
      ]);
      if (!cancelled) {
        setOriginRes(o);
        setDestRes(d);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [route?.originSlug, route?.destinationSlug]);

  if (!route) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Route Not Found</h1>
          <p className="text-muted-foreground mb-6">We couldn't find the route you're looking for.</p>
          <Button asChild><Link to="/flights">Search Flights</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  // Fail-closed support decision: search is only offered when BOTH endpoints
  // carry a real reference-backed or published IATA code. Unknown slugs never
  // receive an invented code.
  const support = describeRouteSupport({
    publishedOriginIata: dbContent?.origin_iata,
    publishedDestinationIata: dbContent?.destination_iata,
    originResolution: originRes,
    destinationResolution: destRes,
  });
  const canSearch = support.status === "ready";

  const today = new Date();
  const searchDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  // A route page is "thin" when there is no published DB content.
  const isThinPage = !dbContent;

  const handleSearch = () => {
    if (!canSearch) return;
    navigate(`/flights?origin=${support.originCode}&destination=${support.destinationCode}&departureDate=${searchDate}&passengers=1&cabinClass=economy`);
  };

  // Page metadata — never fabricate prices or airport codes.
  const pageTitle = dbContent?.title || `Compare Flights from ${route.originCity} to ${route.destinationCity}`;
  const pageDescription = dbContent?.meta_description || `Search live flight options from ${route.originCity} to ${route.destinationCity}. Compare schedules, stops and baggage from trusted travel partners on BookingsFinder.`;
  const h1Title = dbContent?.h1_title || `Flights from ${route.originCity} to ${route.destinationCity}`;
  const introText = dbContent?.intro_paragraph
    || (canSearch
      ? `Search and compare flight options from ${route.originCity} (${support.originCode}) to ${route.destinationCity} (${support.destinationCode}). View live fares from our travel partners when you search.`
      : `Search and compare flight options from ${route.originCity} to ${route.destinationCity}. View live fares from our travel partners when you search.`);
  const mainContent = dbContent?.main_content || null;
  const dbTips = dbContent?.travel_tips as any[] | null;
  const dbFaqs = dbContent?.faqs as any[] | null;
  const dbRelated = dbContent?.related_routes as any[] | null;

  // Build FAQ schema from DB or honest defaults (no fabricated prices)
  const faqItems = dbFaqs && dbFaqs.length > 0
    ? dbFaqs.map((f: any) => ({
        "@type": "Question" as const,
        name: f.question,
        acceptedAnswer: { "@type": "Answer" as const, text: f.answer },
      }))
    : [
        {
          "@type": "Question",
          name: `How can I find the best flights from ${route.originCity} to ${route.destinationCity}?`,
          acceptedAnswer: {
            "@type": "Answer" as const,
            text: `Use BookingsFinder's flight search to compare live fares from multiple travel partners. Enter your travel dates to see available options side by side.`,
          },
        },
        {
          "@type": "Question",
          name: fallbackRouteFaqQuestion(route.originCity, route.destinationCity),
          acceptedAnswer: {
            "@type": "Answer" as const,
            text: fallbackRouteFaqAnswer,
          },
        },
        {
          "@type": "Question",
          name: `Which airlines serve the ${route.originCity} to ${route.destinationCity} route?`,
          acceptedAnswer: {
            "@type": "Answer" as const,
            text: `Multiple airlines may serve this route. Use our flight comparison tool to see all available options with real-time pricing from partner booking sites.`,
          },
        },
      ];

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems,
  };

  // Loading state
  if (isLoadingContent) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container py-16 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <Footer />
      </div>
    );
  }

  // Honest unsupported state (BF1-C): the slug parsed as cities but neither
  // reference data nor a published row can back both endpoints. No invented
  // codes, no search CTA, and kept out of indexes.
  if (isThinPage && !canSearch) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Helmet>
          <title>Route Not Supported | BookingsFinder</title>
          <meta name="robots" content="noindex,follow" />
        </Helmet>
        <Header />
        <main className="flex-1 container py-16 text-center max-w-2xl">
          <h1 className="text-2xl font-bold text-foreground mb-4">
            Route not supported
          </h1>
          <p className="text-muted-foreground mb-2">
            We couldn't verify flight search coverage for {route.originCity} to{" "}
            {route.destinationCity}.
          </p>
          <p className="text-sm text-muted-foreground mb-6">
            This route isn't recognized in our airport reference data yet, so we
            won't pretend to search it. Try searching your airports directly.
          </p>
          <Button asChild>
            <Link to="/flights">Search Flights</Link>
          </Button>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{pageTitle} | BookingsFinder</title>
        <meta name="description" content={pageDescription} />
        <link rel="canonical" href={`https://bookingsfinder.com/flights/${slug}`} />
        {/* Thin/unpublished route pages must not be indexed. */}
        {isThinPage && <meta name="robots" content="noindex,follow" />}
        <script type="application/ld+json">{JSON.stringify(faqSchema)}</script>
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-br from-primary/10 via-background to-primary/5 py-12 md:py-16">
            <div className="container max-w-4xl">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                <Link to="/" className="hover:text-foreground transition-colors">Home</Link>
                <span>/</span>
                <span>Flights</span>
                <span>/</span>
                <span className="text-foreground">{route.originCity} to {route.destinationCity}</span>
              </div>

              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground mb-4">
                {h1Title}
              </h1>
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl">
                {introText}
              </p>

              {/* Search CTA — only with verified endpoint codes; no fabricated price */}
              {canSearch && (
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <Button size="lg" onClick={handleSearch} className="gap-2">
                    <Search className="h-4 w-4" />
                    Search flights
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Content body */}
          <section className="py-10 md:py-14">
            <div className="container max-w-4xl">
              {/* Route overview - use published content if available */}
              <div className="prose prose-sm max-w-none mb-10">
                <h2 className="text-2xl font-bold text-foreground">
                  {route.originCity} to {route.destinationCity} Flight Guide
                </h2>
                {mainContent ? (
                  <div 
                    className="text-muted-foreground leading-relaxed prose-headings:text-foreground prose-headings:font-semibold prose-h2:text-lg prose-h2:mt-6 prose-h2:mb-3"
                    dangerouslySetInnerHTML={{ __html: mainContent.replace(/\n/g, '<br/>').replace(/## /g, '</p><h2>').replace(/\n\n/g, '</h2><p>') }}
                  />
                ) : (
                  <>
                    <p className="text-muted-foreground leading-relaxed">
                      Looking for flight options from {route.originCity} to {route.destinationCity}?
                      BookingsFinder compares available fares from travel partners to help you find
                      the right flight. Whether you're planning a holiday, business trip, or last-minute
                      getaway, our comparison tool lets you view options side by side before choosing
                      a provider.
                    </p>
                    <p className="text-muted-foreground leading-relaxed">
                      The {route.originCity} to {route.destinationCity} route may be served by multiple airlines
                      offering both direct and connecting flights. Fares vary depending on the season,
                      class, and how far in advance you book. Search for your dates to see live prices
                      from our travel partners.
                    </p>
                  </>
                )}
              </div>

              {/* Tips cards - use DB tips if available */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-foreground mb-4 flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" />
                  Travel Tips for This Route
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(dbTips && dbTips.length > 0 ? dbTips : fallbackRouteTips).map((tip: any, i: number) => (
                    <Card key={i} className="border-border">
                      <CardContent className="p-4">
                        {tip.title && <p className="text-sm font-medium text-foreground mb-1">{tip.title}</p>}
                        <p className="text-sm text-muted-foreground">{tip.content || tip}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Quick search CTA — only with verified endpoint codes */}
              {canSearch && (
                <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent mb-10">
                  <CardContent className="p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Plane className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">Ready to compare options?</p>
                        <p className="text-sm text-muted-foreground">
                          Search live fares from {route.originCity} ({support.originCode}) to {route.destinationCity} ({support.destinationCode})
                        </p>
                      </div>
                    </div>
                    <Button onClick={handleSearch} className="gap-2 shrink-0">
                      Compare flight options
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* FAQ Section */}
              <div className="mb-10">
                <h2 className="text-xl font-bold text-foreground mb-4">
                  Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                  {faqItems.map((faq, i) => (
                    <Card key={i} className="border-border">
                      <CardContent className="p-5">
                        <h3 className="font-semibold text-foreground mb-2">{faq.name}</h3>
                        <p className="text-sm text-muted-foreground">{faq.acceptedAnswer.text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Related routes - use DB if available */}
              <div>
                <h2 className="text-xl font-bold text-foreground mb-4">Related Routes</h2>
                <div className="flex flex-wrap gap-2">
                  {(dbRelated && dbRelated.length > 0
                    ? dbRelated.map((r: any) => r.slug)
                    : [
                        `${route.destinationSlug}-to-${route.originSlug}`,
                        `${route.originSlug}-to-paris`,
                        `${route.originSlug}-to-dubai`,
                        `${route.destinationSlug}-to-london`,
                        `${route.destinationSlug}-to-new-york`,
                      ]
                  )
                    .filter((r: string) => r !== slug)
                    .slice(0, 4)
                    .map((routeSlug: string) => {
                      const parsed = parseRouteSlug(routeSlug);
                      if (!parsed) return null;
                      return (
                        <Link
                          key={routeSlug}
                          to={`/flights/${routeSlug}`}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-card text-sm text-foreground hover:bg-muted transition-colors"
                        >
                          {parsed.originCity}
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          {parsed.destinationCity}
                        </Link>
                      );
                    })}
                </div>
              </div>
            </div>
          </section>

          {/* Disclaimer */}
          <div className="py-6 bg-muted/50">
            <div className="container">
              <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto">
                BookingsFinder provides travel comparison. Bookings are completed with the selected provider.
                Fares and availability are confirmed on the provider's website before you pay.
              </p>
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default RoutePage;
