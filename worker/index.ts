/**
 * Cloudflare Worker entry for bookingsfinder.com.
 *
 * Everything is served from the static asset bundle (the built SPA) except
 * /sitemap.xml, which is proxied server-side to the Supabase `sitemap` edge
 * function.
 *
 * Why this exists:
 *  - robots.txt advertises https://bookingsfinder.com/sitemap.xml, but the
 *    asset router's single-page-application fallback answered that path with
 *    index.html, so crawlers received HTML where XML was promised.
 *  - The Supabase gateway rewrites the function's own
 *    `application/xml` response header to `text/plain`, so the content type is
 *    restored here, at the only hop that controls what the crawler actually
 *    sees.
 *
 * This is a server-side proxy, not a redirect: the canonical public URL stays
 * /sitemap.xml and the crawler gets XML in one hop. No credentials are involved
 * — the sitemap function is public (`verify_jwt = false`).
 */

interface Env {
  ASSETS: Fetcher;
  /** Public Supabase project URL (not a secret). Set in wrangler.jsonc vars. */
  SUPABASE_URL: string;
}

const SITEMAP_PATH = "/sitemap.xml";
const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === SITEMAP_PATH) {
      if (request.method !== "GET" && request.method !== "HEAD") {
        return new Response("Method Not Allowed", { status: 405 });
      }

      try {
        const upstream = await fetch(`${env.SUPABASE_URL}/functions/v1/sitemap`, {
          method: "GET",
          headers: { accept: "application/xml" },
        });

        if (!upstream.ok) {
          // Surface the failure rather than letting the SPA shell masquerade
          // as a sitemap; a 502 tells the crawler to retry later.
          return new Response("Sitemap temporarily unavailable", {
            status: 502,
            headers: { "content-type": "text/plain; charset=utf-8" },
          });
        }

        return new Response(upstream.body, {
          status: 200,
          headers: {
            "content-type": "application/xml; charset=utf-8",
            "cache-control": CACHE_CONTROL,
            "x-robots-tag": "noindex",
          },
        });
      } catch {
        return new Response("Sitemap temporarily unavailable", {
          status: 502,
          headers: { "content-type": "text/plain; charset=utf-8" },
        });
      }
    }

    // Everything else keeps the existing static-asset + SPA-fallback behaviour.
    return env.ASSETS.fetch(request);
  },
};
