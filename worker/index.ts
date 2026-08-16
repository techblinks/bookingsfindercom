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
 *
 * Activity-detail noindex (HTTP layer):
 *  - Activity detail pages are currently published as `draft`, and the
 *    client-side page contract already emits `<meta name="robots"
 *    content="noindex,follow">` once React runs.
 *  - Before React runs, the initial HTTP document is the generic SPA shell,
 *    which carries no activity-specific robots state. To keep draft activities
 *    out of search indexes, every URL matching the activity-detail route shape
 *    (`/things-to-do/:destinationSlug/:activitySlug`) is also stamped with an
 *    HTTP-level `X-Robots-Tag: noindex, follow` on the original response, so
 *    the directive exists before any JavaScript executes.
 *  - IMPORTANT: this is a FAIL-CLOSED TEMPORARY publication safety boundary.
 *    Activity detail pages remain server-level noindex until a future
 *    server-aware publication gate can distinguish publishable activities.
 *    The guard is deliberately structural (route shape only): it does not
 *    query Supabase, does not inspect publication status, and must not be
 *    relaxed while draft activities are reachable at public URLs.
 */

interface Env {
  ASSETS: Fetcher;
  /** Public Supabase project URL (not a secret). Set in wrangler.jsonc vars. */
  SUPABASE_URL: string;
}

const SITEMAP_PATH = "/sitemap.xml";
const CACHE_CONTROL = "public, max-age=3600, s-maxage=3600";

/**
 * Server-level robots directive for activity detail URLs.
 *
 * This is the HTTP-layer half of the defence-in-depth noindex contract; the
 * client-side page also renders `<meta name="robots" content="noindex,follow">`
 * once React mounts. Both express the same restriction, so there is no
 * conflict.
 */
export const ACTIVITY_DETAIL_ROBOTS = "noindex, follow";

const THINGS_TO_DO_PREFIX = "/things-to-do/";

/**
 * Structural route-shape predicate for activity detail pages.
 *
 * Recognizes EXACTLY:
 *
 *   /things-to-do/<destination-slug>/<activity-slug>
 *
 * with an optional single trailing slash.
 *
 * TRUE:
 *   /things-to-do/rome/example
 *   /things-to-do/rome/example/
 *
 * FALSE:
 *   /things-to-do
 *   /things-to-do/
 *   /things-to-do/rome
 *   /things-to-do/rome/
 *   /things-to-do/rome/example/extra
 *   /
 *
 * Callers pass `url.pathname`, so query parameters never affect classification.
 * This is intentionally structural: it does NOT infer activity existence or
 * publication status, and even an unresolved two-segment activity URL fails
 * closed to noindex.
 */
export function isThingsActivityDetailPath(pathname: string): boolean {
  if (!pathname.startsWith(THINGS_TO_DO_PREFIX)) return false;

  const rest = pathname.slice(THINGS_TO_DO_PREFIX.length);
  // Allow exactly one trailing slash; anything deeper is a different route.
  const trimmed = rest.endsWith("/") ? rest.slice(0, -1) : rest;
  if (trimmed.length === 0) return false; // /things-to-do/

  const segments = trimmed.split("/");
  return (
    segments.length === 2 &&
    segments[0].length > 0 &&
    segments[1].length > 0
  );
}

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
    const assetResponse = await env.ASSETS.fetch(request);

    if (!isThingsActivityDetailPath(url.pathname)) {
      return assetResponse;
    }

    // Fail-closed publication safety boundary (see header comment): stamp the
    // HTTP response with the server-level noindex directive before the SPA
    // shell is delivered. Asset responses are immutable, so build a mutable
    // Response that preserves body, status, statusText and every existing
    // header, then add the robots directive.
    const guarded = new Response(assetResponse.body, {
      status: assetResponse.status,
      statusText: assetResponse.statusText,
      headers: assetResponse.headers,
    });
    guarded.headers.set("x-robots-tag", ACTIVITY_DETAIL_ROBOTS);
    return guarded;
  },
};
