import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Press = () => {
  const { data: releases, isLoading } = useQuery({
    queryKey: ['press-releases'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('press_releases')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  return (
    <>
      <Helmet>
        <title>Press | BookingsFinder - News & Media</title>
        <meta name="description" content="Read the latest news and press releases from BookingsFinder. Stay updated on company announcements and media coverage." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
            <div className="container text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Press & Media</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                The latest news, announcements, and media coverage about BookingsFinder.
              </p>
            </div>
          </section>

          {/* Press Contact */}
          <section className="py-8 border-b">
            <div className="container">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div>
                  <h2 className="font-semibold">Media Inquiries</h2>
                  <p className="text-muted-foreground">For press inquiries, please contact press@bookingsfinder.com</p>
                </div>
                <Badge variant="outline" className="px-4 py-2">
                  Download Press Kit
                </Badge>
              </div>
            </div>
          </section>

          {/* Press Releases */}
          <section className="py-16">
            <div className="container">
              <h2 className="text-2xl font-bold mb-8">Press Releases</h2>
              
              {isLoading ? (
                <div className="space-y-6">
                  {[...Array(4)].map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/4 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : releases && releases.length > 0 ? (
                <div className="space-y-6">
                  {releases.map((release) => (
                    <Card key={release.id} className="group">
                      <CardHeader>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <CardTitle className="text-xl group-hover:text-primary transition-colors">
                              <Link to={`/press/${release.slug}`}>{release.title}</Link>
                            </CardTitle>
                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                              {release.published_at && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-4 w-4" />
                                  {format(new Date(release.published_at), 'MMMM d, yyyy')}
                                </span>
                              )}
                              {release.source && (
                                <Badge variant="outline">{release.source}</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        {release.excerpt && (
                          <p className="text-muted-foreground mb-4">{release.excerpt}</p>
                        )}
                        <Link 
                          to={`/press/${release.slug}`}
                          className="text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                        >
                          Read Full Release <ArrowRight className="h-4 w-4" />
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">No press releases yet. Check back soon!</p>
                </div>
              )}
            </div>
          </section>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default Press;
