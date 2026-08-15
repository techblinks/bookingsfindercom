/**
 * Sitemap route-eligibility contract (Phase 1.5).
 *
 * The sitemap used to emit ~80 hardcoded /flights/<slug> URLs unconditionally,
 * while RoutePage.tsx marks any route without published `seo_route_pages`
 * content as `noindex,follow`. These tests lock the two together: a route URL
 * is advertised only when a published row genuinely exists.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  buildSitemap,
  selectPublishedRoutes,
  isValidRouteSlug,
  staticPages,
  SITE_URL,
} from "../sitemap-core.ts";

const TODAY = "2026-08-11";

/** Every /flights/<slug> URL in a generated document (excludes static /flights). */
function routeUrls(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => m[1])
    .filter((loc) => loc.startsWith(`${SITE_URL}/flights/`));
}

function build(routeRows: Parameters<typeof buildSitemap>[0]["routeRows"]) {
  return buildSitemap({ today: TODAY, routeRows });
}

const PUBLISHED_ROW = { slug: "london-to-dubai", updated_at: "2026-07-01T10:00:00Z" };

describe("Route eligibility — published content only", () => {
  it("includes a published route", () => {
    const xml = build([PUBLISHED_ROW]);
    expect(routeUrls(xml)).toEqual([`${SITE_URL}/flights/london-to-dubai`]);
  });

  it("excludes a route with no published row (the unpublished case)", () => {
    // The query filters `is_published = true`, so an unpublished route simply
    // never reaches the builder. An empty result must yield zero route URLs.
    expect(routeUrls(build([]))).toEqual([]);
  });

  it("excludes routes that are merely missing from the result set", () => {
    const xml = build([PUBLISHED_ROW]);
    expect(xml).not.toContain("/flights/paris-to-rome");
    expect(xml).not.toContain("/flights/new-york-to-london");
  });

  it("emits a duplicated published slug exactly once", () => {
    const xml = build([
      PUBLISHED_ROW,
      { slug: "london-to-dubai", updated_at: "2026-07-05T10:00:00Z" },
    ]);
    expect(routeUrls(xml)).toEqual([`${SITE_URL}/flights/london-to-dubai`]);
  });

  it("orders routes deterministically regardless of row order", () => {
    const rows = [
      { slug: "paris-to-rome" },
      { slug: "london-to-dubai" },
      { slug: "delhi-to-bangkok" },
    ];
    const a = routeUrls(build(rows));
    const b = routeUrls(build([...rows].reverse()));
    expect(a).toEqual(b);
    expect(a).toEqual([
      `${SITE_URL}/flights/delhi-to-bangkok`,
      `${SITE_URL}/flights/london-to-dubai`,
      `${SITE_URL}/flights/paris-to-rome`,
    ]);
  });
});

describe("Slug validation", () => {
  it.each([
    ["london-to-dubai", true],
    ["new-york-to-los-angeles", true],
    ["", false],
    ["   ", false],
    [null, false],
    [undefined, false],
    [42, false],
    ["London-To-Dubai", false], // uppercase
    ["london_to_dubai", false], // underscores
    ["london-to-", false], // empty destination
    ["-to-dubai", false], // empty origin
    ["londondubai", false], // no separator
    ["london to dubai", false], // spaces
    ["london-to-dubai?x=1", false], // query injection
    ["../../etc/passwd", false], // traversal
    ["london-to-dubai/extra", false], // path injection
  ])("isValidRouteSlug(%p) === %s", (slug, expected) => {
    expect(isValidRouteSlug(slug)).toBe(expected);
  });

  it("drops malformed and empty slugs from generated output", () => {
    const xml = build([
      PUBLISHED_ROW,
      { slug: "" },
      { slug: "   " },
      { slug: null },
      { slug: "not a slug" },
      { slug: "london-to-dubai?evil=1" },
      { slug: "../../secret" },
    ]);
    expect(routeUrls(xml)).toEqual([`${SITE_URL}/flights/london-to-dubai`]);
  });

  it("never emits characters that would need URL escaping", () => {
    const xml = build([PUBLISHED_ROW, { slug: "delhi-to-bangkok" }]);
    for (const url of routeUrls(xml)) {
      expect(url).toMatch(/^https:\/\/bookingsfinder\.com\/flights\/[a-z0-9-]+$/);
    }
  });
});

describe("Database failure behaviour", () => {
  it("emits NO route URLs when the route query failed", () => {
    expect(routeUrls(build(null))).toEqual([]);
  });

  it("does not restore the old hardcoded route list on failure", () => {
    const xml = build(null);
    // Representative members of the removed ~80-slug array.
    for (const slug of [
      "london-to-dubai",
      "new-york-to-london",
      "paris-to-rome",
      "sydney-to-bali",
      "lima-to-new-york",
    ]) {
      expect(xml).not.toContain(`/flights/${slug}`);
    }
  });

  it("still returns the rest of the sitemap when routes are unavailable", () => {
    const xml = build(null);
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/flights</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/hotels</loc>`);
  });
});

describe("Static pages are preserved", () => {
  it("emits every configured static page", () => {
    const xml = build([PUBLISHED_ROW]);
    for (const page of staticPages) {
      expect(xml).toContain(`<loc>${SITE_URL}${page.path}</loc>`);
    }
  });

  it("keeps the key public surfaces", () => {
    const xml = build([]);
    for (const path of ["/", "/flights", "/hotels", "/help", "/blog", "/press", "/about"]) {
      expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
    }
  });

  it("static page count is unchanged by route filtering", () => {
    // Guards against a future route-eligibility change quietly dropping a
    // static URL. Phase 2.1: 21 - /my-alerts + /trip-cost + /things-to-do.
    expect(staticPages).toHaveLength(22);
    const withRoutes = build([PUBLISHED_ROW]);
    const withoutRoutes = build(null);
    for (const page of staticPages) {
      expect(withRoutes).toContain(`<loc>${SITE_URL}${page.path}</loc>`);
      expect(withoutRoutes).toContain(`<loc>${SITE_URL}${page.path}</loc>`);
    }
  });

  /*
   * Phase 2.1 — audited public pages.
   *
   * Inclusion requires the page to be public, substantive and to canonicalise
   * to exactly the URL listed here. Pages that are account-only or thin stay
   * out no matter that the route exists.
   */
  it("includes the audited public pages", () => {
    const xml = build([]);
    for (const path of ["/trip-cost", "/things-to-do", "/hotels"]) {
      expect(xml).toContain(`<loc>${SITE_URL}${path}</loc>`);
    }
  });

  it("excludes the account-only alerts page", () => {
    expect(staticPages.some((p) => p.path === "/my-alerts")).toBe(false);
    expect(build([])).not.toContain(`<loc>${SITE_URL}/my-alerts</loc>`);
  });

  it("lists every static path exactly once", () => {
    const paths = staticPages.map((p) => p.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it("every static entry canonicalises cleanly — no slash or query drift", () => {
    for (const page of staticPages) {
      if (page.path === "/") continue;
      expect(page.path).toMatch(/^\/[a-z0-9-]+$/);
      expect(page.path).not.toMatch(/\?|#|\/$/);
    }
  });

  it("keeps destination landing pages", () => {
    const xml = build([]);
    expect(xml).toContain(`<loc>${SITE_URL}/d/flights-sydney-to-kathmandu</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/d/hotels-in-sydney</loc>`);
  });
});

describe("lastmod is genuine or absent", () => {
  it("uses updated_at when present", () => {
    const xml = build([PUBLISHED_ROW]);
    expect(xml).toContain("<lastmod>2026-07-01</lastmod>");
  });

  it("omits lastmod entirely when the row has no timestamp", () => {
    const xml = build([{ slug: "delhi-to-bangkok" }]);
    const entry = xml.split("<url>").find((u) => u.includes("/flights/delhi-to-bangkok"))!;
    expect(entry).not.toContain("<lastmod>");
  });

  it("omits lastmod when the timestamp is unusable rather than inventing one", () => {
    const xml = build([{ slug: "delhi-to-bangkok", updated_at: "not-a-date" }]);
    const entry = xml.split("<url>").find((u) => u.includes("/flights/delhi-to-bangkok"))!;
    expect(entry).not.toContain("<lastmod>");
  });

  it("selectPublishedRoutes reports no lastmod rather than a fabricated one", () => {
    expect(selectPublishedRoutes([{ slug: "delhi-to-bangkok" }])).toEqual([
      { slug: "delhi-to-bangkok" },
    ]);
  });
});

describe("XML validity", () => {
  const parse = (xml: string) => new DOMParser().parseFromString(xml, "application/xml");

  it("produces a well-formed document with a published route", () => {
    const doc = parse(build([PUBLISHED_ROW, { slug: "delhi-to-bangkok" }]));
    expect(doc.querySelector("parsererror")).toBeNull();
    expect(doc.documentElement.nodeName).toBe("urlset");
  });

  it("produces a well-formed document when routes are unavailable", () => {
    const doc = parse(build(null));
    expect(doc.querySelector("parsererror")).toBeNull();
  });

  it("every <url> has a <loc>, <changefreq> and <priority>", () => {
    const doc = parse(build([PUBLISHED_ROW]));
    const urls = [...doc.getElementsByTagName("url")];
    expect(urls.length).toBeGreaterThan(0);
    for (const u of urls) {
      expect(u.getElementsByTagName("loc").length).toBe(1);
      expect(u.getElementsByTagName("changefreq").length).toBe(1);
      expect(u.getElementsByTagName("priority").length).toBe(1);
    }
  });

  it("contains no duplicate <loc> values", () => {
    const xml = build([PUBLISHED_ROW, { slug: "london-to-dubai" }, { slug: "paris-to-rome" }]);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    expect(new Set(locs).size).toBe(locs.length);
  });
});

/**
 * Source-contract checks, following the convention in
 * src/lib/__tests__/brandConversion.test.ts — they guard the edge-function
 * shell, which cannot be imported here because it uses Deno globals and a
 * remote esm.sh import.
 */
describe("Edge function source contract", () => {
  const source = readFileSync("supabase/functions/sitemap/index.ts", "utf-8");

  it("filters routes on is_published, matching RoutePage", () => {
    expect(source).toContain('.from("seo_route_pages")');
    expect(source).toContain('.eq("is_published", true)');
  });

  it("no longer contains a hardcoded flight-route array", () => {
    expect(source).not.toContain("routePages");
    for (const slug of ["london-to-dubai", "sydney-to-bali", "lima-to-new-york"]) {
      expect(source).not.toContain(slug);
    }
  });

  it("passes null to the builder when the route query fails", () => {
    expect(source).toContain("routeError ? null : routeRows");
  });

  it("does not log secret environment values", () => {
    expect(source).not.toMatch(/console\.(log|error)\([^)]*supabaseKey/);
    expect(source).not.toMatch(/console\.(log|error)\([^)]*SERVICE_ROLE/);
  });
});

describe("Things destinations stay out of the sitemap", () => {
  it("never advertises the draft Rome destination URL", () => {
    const xml = build([]);
    expect(xml).not.toContain("/things-to-do/rome");
  });

  it("static hub /things-to-do remains the only Things sitemap entry", () => {
    const xml = build([]);
    const things = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .filter((loc) => loc.includes("/things-to-do"));
    expect(things).toEqual([`${SITE_URL}/things-to-do`]);
  });
});
