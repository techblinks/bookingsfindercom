/**
 * Phase 2.1 — canonical/indexability contract for sitemap-listed public pages.
 *
 * Two real defects motivated these:
 *
 *  1. index.html carried a hardcoded <link rel="canonical" href="…com">.
 *     react-helmet only replaces tags it owns (data-rh), so that tag was never
 *     overwritten: pages with their own canonical rendered TWO, and pages
 *     without one (notably /hotels, which is in the sitemap) had exactly one —
 *     pointing at the homepage, telling crawlers to ignore the listed URL.
 *
 *  2. /things-to-do canonicalised to www.bookingsfinder.com while the sitemap,
 *     robots.txt and its own JSON-LD all use the bare host.
 *
 * A sitemap entry must canonicalise to itself, so these are locked here.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";

const read = (p: string) => readFileSync(p, "utf-8");

const SITE = "https://bookingsfinder.com";

describe("index.html must not pin a site-wide canonical", () => {
  const html = read("index.html");

  it("declares no static canonical", () => {
    expect(html).not.toMatch(/<link[^>]+rel="canonical"/);
  });

  it("still ships the default robots directive", () => {
    expect(html).toMatch(/<meta name="robots" content="index, follow"/);
  });
});

describe("Sitemap-listed pages canonicalise to themselves", () => {
  it.each([
    ["src/pages/TripCostPlannerPage.tsx", "/trip-cost"],
    ["src/pages/ThingsToDo.tsx", "/things-to-do"],
    ["src/pages/HotelResults.tsx", "/hotels"],
  ])("%s -> %s", (file, path) => {
    const source = read(file);
    expect(source).toContain(`<link rel="canonical" href="${SITE}${path}" />`);
  });

  it.each([
    ["src/pages/TripCostPlannerPage.tsx"],
    ["src/pages/ThingsToDo.tsx"],
    ["src/pages/HotelResults.tsx"],
  ])("%s uses the bare host, never www", (file) => {
    expect(read(file)).not.toContain("www.bookingsfinder.com");
  });

  it("no page in the repo reintroduces a www canonical", () => {
    for (const file of [
      "src/pages/TripCostPlannerPage.tsx",
      "src/pages/ThingsToDo.tsx",
      "src/pages/HotelResults.tsx",
      "src/pages/flight/FlightLandingPage.tsx",
    ]) {
      expect(read(file)).not.toMatch(/rel="canonical"[^>]*www\./);
    }
  });
});

describe("Sitemap-listed pages are not noindex", () => {
  it.each([
    ["src/pages/TripCostPlannerPage.tsx"],
    ["src/pages/ThingsToDo.tsx"],
    ["src/pages/HotelResults.tsx"],
  ])("%s emits no noindex directive", (file) => {
    expect(read(file)).not.toMatch(/noindex/i);
  });

  it("RoutePage keeps its intentional noindex for unpublished routes", () => {
    // Phase 1.5's gate must survive: thin route pages stay out of the index
    // and out of the sitemap.
    expect(read("src/pages/RoutePage.tsx")).toMatch(/content="noindex,follow"/);
  });
});

describe("Pages added to the sitemap carry real metadata", () => {
  it.each([
    ["src/pages/TripCostPlannerPage.tsx"],
    ["src/pages/ThingsToDo.tsx"],
    ["src/pages/HotelResults.tsx"],
  ])("%s declares a title and description", (file) => {
    const source = read(file);
    expect(source).toMatch(/<title>/);
    expect(source).toMatch(/name="description"/);
  });

  it("the accommodation page does not claim guaranteed prices", () => {
    const source = read("src/pages/HotelResults.tsx");
    expect(source).not.toMatch(/guaranteed (lowest|best|cheapest)/i);
    // It must keep saying prices are confirmed by the provider.
    expect(source).toMatch(/confirmed on the provider/i);
  });

  it("the trip planner does not present its output as live pricing", () => {
    const source = read("src/pages/TripCostPlannerPage.tsx");
    expect(source).toMatch(/does not provide live prices/i);
  });
});
