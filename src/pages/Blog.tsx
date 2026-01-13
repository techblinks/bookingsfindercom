import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, User, ArrowRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

const Blog = () => {
  const { data: posts, isLoading } = useQuery({
    queryKey: ['blog-posts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('blog_posts')
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
        <title>Blog | BookingsFinder - Travel Tips & Guides</title>
        <meta name="description" content="Discover travel tips, destination guides, and money-saving strategies from the BookingsFinder team." />
      </Helmet>

      <div className="min-h-screen flex flex-col bg-background">
        <Header />

        <main className="flex-1">
          {/* Hero */}
          <section className="bg-gradient-to-b from-primary/10 to-background py-16 md:py-24">
            <div className="container text-center">
              <h1 className="text-4xl md:text-5xl font-bold mb-6">Travel Blog</h1>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Tips, guides, and inspiration for your next adventure. Learn how to travel smarter and save money.
              </p>
            </div>
          </section>

          {/* Blog Posts */}
          <section className="py-16">
            <div className="container">
              {isLoading ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i}>
                      <Skeleton className="h-48 w-full rounded-t-lg" />
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2 mt-2" />
                      </CardHeader>
                      <CardContent>
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-full mt-2" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : posts && posts.length > 0 ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {posts.map((post) => (
                    <Card key={post.id} className="overflow-hidden group">
                      {post.featured_image && (
                        <div className="aspect-video overflow-hidden">
                          <img 
                            src={post.featured_image} 
                            alt={post.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      )}
                      <CardHeader>
                        <div className="flex items-center gap-2 mb-2">
                          {post.category && (
                            <Badge variant="secondary">{post.category}</Badge>
                          )}
                        </div>
                        <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors">
                          <Link to={`/blog/${post.slug}`}>{post.title}</Link>
                        </CardTitle>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {post.author_name}
                          </span>
                          {post.published_at && (
                            <span className="flex items-center gap-1">
                              <Calendar className="h-4 w-4" />
                              {format(new Date(post.published_at), 'MMM d, yyyy')}
                            </span>
                          )}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {post.excerpt && (
                          <p className="text-muted-foreground line-clamp-3 mb-4">{post.excerpt}</p>
                        )}
                        <Link 
                          to={`/blog/${post.slug}`}
                          className="text-primary font-medium inline-flex items-center gap-1 hover:gap-2 transition-all"
                        >
                          Read More <ArrowRight className="h-4 w-4" />
                        </Link>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <p className="text-muted-foreground text-lg">No blog posts yet. Check back soon!</p>
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

export default Blog;
