// Dynamic sitemap generator for bookingsfinder.com
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildSitemap, formatDate, SITE_URL } from "./sitemap-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const today = formatDate(new Date())!;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    /*
     * Published SEO route pages.
     *
     * `is_published = true` is the same condition RoutePage.tsx uses to decide
     * whether a /flights/:slug page is indexable, so the sitemap and the page's
     * robots meta can never disagree. The service role bypasses RLS, so the
     * filter must be explicit here rather than relying on the
     * "Anyone can view published route pages" policy.
     *
     * On failure we deliberately advertise NO route URLs — the previous
     * hardcoded 80-slug array was an indexing bypass and is not a fallback.
     */
    const { data: routeRows, error: routeError } = await supabase
      .from("seo_route_pages")
      .select("slug, updated_at")
      .eq("is_published", true);

    if (routeError) {
      console.error("Sitemap: published route query failed, omitting route URLs:", routeError.message);
    }

    const { data: blogPosts, error: blogError } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (blogError) {
      console.error("Sitemap: blog query failed, omitting blog URLs:", blogError.message);
    }

    // Fetch published press releases from database
    const { data: pressReleases, error: pressError } = await supabase
      .from("press_releases")
      .select("slug, updated_at, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (pressError) {
      console.error("Sitemap: press query failed, omitting press URLs:", pressError.message);
    }

    // Fetch published country landing pages from database
    const { data: countryPages, error: countryError } = await supabase
      .from("country_landing_pages")
      .select("slug, updated_at")
      .eq("is_published", true)
      .order("updated_at", { ascending: false });

    if (countryError) {
      console.error("Sitemap: country query failed, omitting country URLs:", countryError.message);
    }

    const sitemap = buildSitemap({
      today,
      routeRows: routeError ? null : routeRows,
      blogPosts: blogError ? null : blogPosts,
      pressReleases: pressError ? null : pressReleases,
      countryPages: countryError ? null : countryPages,
    });

    return new Response(sitemap, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    // Never leak connection strings or keys — message only.
    console.error("Sitemap generation error:", error instanceof Error ? error.message : "unknown error");
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`,
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/xml; charset=utf-8",
        },
      }
    );
  }
});
