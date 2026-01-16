import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SITE_URL = "https://bookingsfinder.com";

// Static pages with their priorities and change frequencies
const staticPages = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/flights", priority: "0.9", changefreq: "daily" },
  { path: "/hotels", priority: "0.9", changefreq: "daily" },
  { path: "/how-it-works", priority: "0.7", changefreq: "monthly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/careers", priority: "0.5", changefreq: "monthly" },
  { path: "/press", priority: "0.6", changefreq: "weekly" },
  { path: "/blog", priority: "0.8", changefreq: "daily" },
  { path: "/help", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "monthly" },
  { path: "/faqs", priority: "0.6", changefreq: "monthly" },
  { path: "/privacy", priority: "0.3", changefreq: "yearly" },
  { path: "/terms", priority: "0.3", changefreq: "yearly" },
  { path: "/cookies", priority: "0.3", changefreq: "yearly" },
  { path: "/affiliate-disclosure", priority: "0.3", changefreq: "yearly" },
  { path: "/my-alerts", priority: "0.4", changefreq: "weekly" },
];

// Hardcoded destination landing pages (from destinationData.ts)
const destinationPages = [
  { slug: "flights-sydney-to-kathmandu", priority: "0.8", changefreq: "weekly" },
  { slug: "hotels-in-sydney", priority: "0.8", changefreq: "weekly" },
];

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
}

function generateUrlEntry(
  loc: string,
  lastmod: string,
  changefreq: string,
  priority: string
): string {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = formatDate(new Date());
    const urls: string[] = [];

    // Add static pages
    for (const page of staticPages) {
      urls.push(generateUrlEntry(
        `${SITE_URL}${page.path}`,
        today,
        page.changefreq,
        page.priority
      ));
    }

    // Add destination landing pages
    for (const dest of destinationPages) {
      urls.push(generateUrlEntry(
        `${SITE_URL}/d/${dest.slug}`,
        today,
        dest.changefreq,
        dest.priority
      ));
    }

    // Fetch published blog posts from database
    const { data: blogPosts, error: blogError } = await supabase
      .from("blog_posts")
      .select("slug, updated_at, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (!blogError && blogPosts) {
      for (const post of blogPosts) {
        const lastmod = formatDate(post.updated_at || post.published_at || new Date());
        urls.push(generateUrlEntry(
          `${SITE_URL}/blog/${post.slug}`,
          lastmod,
          "monthly",
          "0.7"
        ));
      }
    }

    // Fetch published press releases from database
    const { data: pressReleases, error: pressError } = await supabase
      .from("press_releases")
      .select("slug, updated_at, published_at")
      .eq("is_published", true)
      .order("published_at", { ascending: false });

    if (!pressError && pressReleases) {
      for (const release of pressReleases) {
        const lastmod = formatDate(release.updated_at || release.published_at || new Date());
        urls.push(generateUrlEntry(
          `${SITE_URL}/press/${release.slug}`,
          lastmod,
          "monthly",
          "0.6"
        ));
      }
    }

    // Generate the sitemap XML
    const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

    return new Response(sitemap, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/xml; charset=utf-8",
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
      },
    });
  } catch (error) {
    console.error("Sitemap generation error:", error);
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_URL}/</loc>
    <lastmod>${formatDate(new Date())}</lastmod>
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
