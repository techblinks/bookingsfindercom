/**
 * Pure sitemap composition logic for bookingsfinder.com.
 *
 * Kept free of Deno globals and remote imports so it can be unit-tested by the
 * repo's vitest suite; `index.ts` is the thin edge-function shell that supplies
 * environment, database access and the HTTP response.
 *
 * ── Route-page indexing rule (Phase 1.5) ──────────────────────────────────
 * `/flights/:slug` is rendered by src/pages/RoutePage.tsx, which queries
 * `seo_route_pages` with `.eq('slug', slug).eq('is_published', true)` and emits
 * `noindex,follow` whenever that returns nothing.
 *
 * The sitemap must not contradict that. It therefore advertises a route URL
 * only when the SAME condition holds — a published `seo_route_pages` row whose
 * slug is a well-formed route slug. There is deliberately no second definition
 * of "published": `generation_status` is not consulted.
 *
 * BF-0R-3: `is_published` is authoritative on its own, and more strictly so
 * than before — supabase/functions/generate-route-page/index.ts NEVER sets it
 * true. AI generation can only reach `generation_status: 'generated_pending_
 * review'` (content passed the provenance gate) or `'failed_validation'`
 * (content asserted an unsourced fact and was discarded). `is_published`
 * flips to true exclusively via an explicit human publish action gated by the
 * "Admins can manage route pages" RLS policy (see
 * src/pages/AdminRouteGenerator.tsx). A row can therefore never enter this
 * sitemap merely because a generation call completed.
 */

export const SITE_URL = "https://bookingsfinder.com";

/** Static pages with their priorities and change frequencies. */
export const staticPages = [
  { path: "/", priority: "1.0", changefreq: "daily" },
  { path: "/flights", priority: "0.9", changefreq: "daily" },
  { path: "/hotels", priority: "0.9", changefreq: "daily" },
  // Audited in Phase 2.1: both are public, substantive and self-canonical.
  { path: "/things-to-do", priority: "0.9", changefreq: "daily" },
  { path: "/trip-cost", priority: "0.8", changefreq: "monthly" },
  { path: "/how-it-works", priority: "0.7", changefreq: "monthly" },
  { path: "/about", priority: "0.6", changefreq: "monthly" },
  { path: "/careers", priority: "0.5", changefreq: "monthly" },
  { path: "/press", priority: "0.6", changefreq: "weekly" },
  { path: "/blog", priority: "0.8", changefreq: "daily" },
  { path: "/help", priority: "0.5", changefreq: "monthly" },
  { path: "/contact", priority: "0.5", changefreq: "monthly" },
  { path: "/faqs", priority: "0.6", changefreq: "monthly" },
  { path: "/why-we-dont-sell-tickets", priority: "0.6", changefreq: "monthly" },
  { path: "/top-flight-destinations", priority: "0.9", changefreq: "daily" },
  { path: "/top-hotel-destinations", priority: "0.9", changefreq: "daily" },
  { path: "/flight-deals-guide", priority: "0.8", changefreq: "weekly" },
  { path: "/hotel-booking-guide", priority: "0.8", changefreq: "weekly" },
  { path: "/privacy", priority: "0.4", changefreq: "yearly" },
  { path: "/terms", priority: "0.4", changefreq: "yearly" },
  { path: "/cookies", priority: "0.4", changefreq: "yearly" },
  { path: "/affiliate-disclosure", priority: "0.4", changefreq: "yearly" },
  /*
   * /my-alerts is deliberately absent. It is an account utility: the page is
   * an email-lookup form for managing your own saved price alerts, with no
   * standalone content for a search result. It fails the same "account-only /
   * thin" bar this list is meant to enforce.
   */
];

/** Hardcoded destination landing pages (from destinationData.ts). */
export const destinationPages = [
  { slug: "flights-sydney-to-kathmandu", priority: "0.8", changefreq: "weekly" },
  { slug: "hotels-in-sydney", priority: "0.8", changefreq: "weekly" },
];

/**
 * Lowercase hyphen-separated words. Mirrors SLUG_RE in
 * src/lib/flightDestinations.ts — that constant is module-private and lives in
 * the browser bundle, which this Deno function cannot import across the runtime
 * boundary, so the pattern is restated rather than falsely "shared".
 */
const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * A route slug must also be parseable by RoutePage's `parseRouteSlug`, which
 * splits on the first "-to-" and renders "Route Not Found" when either side is
 * empty. Advertising such a URL would point crawlers at a dead page.
 */
export function isValidRouteSlug(slug: unknown): slug is string {
  if (typeof slug !== "string") return false;
  const trimmed = slug.trim();
  if (trimmed.length === 0) return false;
  if (!SLUG_RE.test(trimmed)) return false;

  const toIndex = trimmed.indexOf("-to-");
  if (toIndex <= 0) return false;
  const destination = trimmed.substring(toIndex + 4);
  return destination.length > 0;
}

export interface RouteRow {
  slug?: unknown;
  updated_at?: unknown;
}

export interface PublishedRoute {
  slug: string;
  /** Omitted when the row carries no trustworthy timestamp. */
  lastmod?: string;
}

/** Format a timestamp as YYYY-MM-DD, or null when it is not usable. */
export function formatDate(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  const d = new Date(value as string | number | Date);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

/**
 * Turn raw `seo_route_pages` rows into the routes the sitemap may advertise.
 *
 * Callers must already have filtered on `is_published = true`; this function
 * enforces the remaining guarantees: valid slugs only, de-duplicated, and
 * deterministically ordered so repeated requests produce identical XML.
 * Never fabricates a slug or a timestamp.
 */
export function selectPublishedRoutes(rows: RouteRow[] | null | undefined): PublishedRoute[] {
  if (!Array.isArray(rows)) return [];

  const bySlug = new Map<string, PublishedRoute>();
  for (const row of rows) {
    if (!row || !isValidRouteSlug(row.slug)) continue;
    const slug = row.slug.trim();
    if (bySlug.has(slug)) continue; // first occurrence wins
    const lastmod = formatDate(row.updated_at);
    bySlug.set(slug, lastmod ? { slug, lastmod } : { slug });
  }

  return [...bySlug.values()].sort((a, b) => a.slug.localeCompare(b.slug));
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** `lastmod` is omitted entirely when we have no trustworthy date. */
export function generateUrlEntry(
  loc: string,
  lastmod: string | null | undefined,
  changefreq: string,
  priority: string,
): string {
  const lastmodLine = lastmod ? `\n    <lastmod>${lastmod}</lastmod>` : "";
  return `  <url>
    <loc>${escapeXml(loc)}</loc>${lastmodLine}
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export interface DatedRow {
  slug?: unknown;
  updated_at?: unknown;
  published_at?: unknown;
}

export interface SitemapInput {
  /** Today's date as YYYY-MM-DD, used for static pages (unchanged behaviour). */
  today: string;
  /**
   * Published `seo_route_pages` rows, or null when the query failed.
   * Null yields NO route URLs — there is deliberately no hardcoded fallback.
   */
  routeRows: RouteRow[] | null;
  blogPosts?: DatedRow[] | null;
  pressReleases?: DatedRow[] | null;
  countryPages?: DatedRow[] | null;
}

/** Compose the full sitemap XML document. */
export function buildSitemap(input: SitemapInput): string {
  const { today, routeRows, blogPosts, pressReleases, countryPages } = input;
  const urls: string[] = [];

  for (const page of staticPages) {
    urls.push(generateUrlEntry(`${SITE_URL}${page.path}`, today, page.changefreq, page.priority));
  }

  for (const dest of destinationPages) {
    urls.push(generateUrlEntry(`${SITE_URL}/d/${dest.slug}`, today, dest.changefreq, dest.priority));
  }

  // Published SEO route pages only. A failed query (null) contributes nothing.
  for (const route of selectPublishedRoutes(routeRows)) {
    urls.push(generateUrlEntry(`${SITE_URL}/flights/${route.slug}`, route.lastmod ?? null, "weekly", "0.7"));
  }

  if (Array.isArray(blogPosts)) {
    for (const post of blogPosts) {
      if (typeof post?.slug !== "string" || post.slug.length === 0) continue;
      const lastmod = formatDate(post.updated_at) ?? formatDate(post.published_at) ?? today;
      urls.push(generateUrlEntry(`${SITE_URL}/blog/${post.slug}`, lastmod, "monthly", "0.7"));
    }
  }

  if (Array.isArray(pressReleases)) {
    for (const release of pressReleases) {
      if (typeof release?.slug !== "string" || release.slug.length === 0) continue;
      const lastmod = formatDate(release.updated_at) ?? formatDate(release.published_at) ?? today;
      urls.push(generateUrlEntry(`${SITE_URL}/press/${release.slug}`, lastmod, "monthly", "0.6"));
    }
  }

  if (Array.isArray(countryPages)) {
    for (const page of countryPages) {
      if (typeof page?.slug !== "string" || page.slug.length === 0) continue;
      const lastmod = formatDate(page.updated_at) ?? today;
      urls.push(generateUrlEntry(`${SITE_URL}/${page.slug}`, lastmod, "weekly", "0.8"));
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}
