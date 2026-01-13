import { Helmet } from "react-helmet-async";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, ArrowLeft, Share2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { toast } from "sonner";

const PressRelease = () => {
  const { slug } = useParams();

  const { data: release, isLoading } = useQuery({
    queryKey: ['press-release', slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('press_releases')
        .select('*')
        .eq('slug', slug)
        .eq('is_published', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!slug,
  });

  const handleShare = async () => {
    try {
      await navigator.share({
        title: release?.title,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copied to clipboard!');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16">
          <div className="container max-w-3xl">
            <Skeleton className="h-8 w-32 mb-8" />
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-6 w-64 mb-8" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full mt-2" />
            <Skeleton className="h-4 w-3/4 mt-2" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!release) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 py-16">
          <div className="container text-center">
            <h1 className="text-2xl font-bold mb-4">Press Release Not Found</h1>
            <p className="text-muted-foreground mb-8">The press release you're looking for doesn't exist.</p>
            <Link to="/press">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Press
              </Button>
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{release.title} | BookingsFinder Press</title>
        <meta name="description" content={release.excerpt || release.title} />
        <meta property="og:title" content={release.title} />
        <meta property="og:description" content={release.excerpt || release.title} />
        {release.featured_image && <meta property="og:image" content={release.featured_image} />}
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1 py-16">
          <article className="container max-w-3xl">
            {/* Back Link */}
            <Link 
              to="/press"
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Press
            </Link>

            {/* Header */}
            <header className="mb-8">
              <Badge variant="outline" className="mb-4">Press Release</Badge>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">{release.title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                {release.published_at && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(new Date(release.published_at), 'MMMM d, yyyy')}
                  </span>
                )}
                {release.source && (
                  <Badge variant="secondary">{release.source}</Badge>
                )}
                <Button variant="ghost" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              </div>
            </header>

            {/* Featured Image */}
            {release.featured_image && (
              <div className="aspect-video rounded-lg overflow-hidden mb-8">
                <img 
                  src={release.featured_image} 
                  alt={release.title}
                  className="w-full h-full object-cover"
                />
              </div>
            )}

            {/* Content */}
            <div 
              className="prose prose-neutral dark:prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: release.content }}
            />

            {/* Media Contact */}
            <div className="mt-12 pt-8 border-t">
              <h3 className="font-semibold mb-2">Media Contact</h3>
              <p className="text-muted-foreground">
                For media inquiries, please contact press@bookingsfinder.com
              </p>
            </div>
          </article>
        </main>

        <Footer />
      </div>
    </>
  );
};

export default PressRelease;
