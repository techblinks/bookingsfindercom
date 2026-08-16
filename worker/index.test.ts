/**
 * Focused behavioural tests for the Worker's server-level SEO safety contract.
 *
 * Covers the HTTP-layer X-Robots-Tag guard for activity detail routes, the
 * structural route-shape predicate, preservation of the asset response, and
 * the unchanged /sitemap.xml proxy behaviour.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import worker, {
  ACTIVITY_DETAIL_ROBOTS,
  isThingsActivityDetailPath,
} from "./index";

const ORIGIN = "https://bookingsfinder.com";
const SPA_BODY = "<html><body>SPA shell</body></html>";

/** A canned static-asset response carrying headers that must survive the guard. */
function makeAssetResponse(): Response {
  return new Response(SPA_BODY, {
    status: 200,
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=3600",
      "x-asset-marker": "kept",
    },
  });
}

function makeEnv(
  assetsFetch: ReturnType<typeof vi.fn> = vi.fn(async () => makeAssetResponse()),
): { ASSETS: { fetch: typeof assetsFetch }; SUPABASE_URL: string } {
  return {
    ASSETS: { fetch: assetsFetch },
    SUPABASE_URL: "https://placeholder.supabase.co",
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// ═══ ROUTE-SHAPE PREDICATE ═══
describe("isThingsActivityDetailPath", () => {
  it.each([
    // TRUE: activity detail, with and without trailing slash
    ["/things-to-do/rome/example", true],
    ["/things-to-do/rome/example/", true],
    ["/things-to-do/paris/eiffel-tower-ticket", true],
    ["/things-to-do/paris/eiffel-tower-ticket/", true],
    // FALSE: non-activity routes
    ["/", false],
    ["/things-to-do", false],
    ["/things-to-do/", false],
    ["/things-to-do/rome", false],
    ["/things-to-do/rome/", false],
    ["/things-to-do/rome/example/extra", false],
    ["/things-to-do/rome/example/extra/", false],
    ["/flights", false],
    ["/sitemap.xml", false],
    ["/static/logo.webp", false],
  ])("classifies %s as %s", (pathname, expected) => {
    expect(isThingsActivityDetailPath(pathname)).toBe(expected);
  });
});

// ═══ ACTIVITY DETAIL NOINDEX GUARD ═══
describe("activity detail X-Robots-Tag guard", () => {
  it("adds the activity noindex header to a two-segment activity URL (A)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/rome/example-activity`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBe(ACTIVITY_DETAIL_ROBOTS);
  });

  it("adds the header to a trailing-slash activity URL (B)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/rome/example-activity/`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBe(ACTIVITY_DETAIL_ROBOTS);
  });

  it("does NOT add the header to a destination page (C)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/rome`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBeNull();
  });

  it("does NOT add the header to the Things hub (D)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBeNull();
  });

  it("does NOT add the header to the homepage (E)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBeNull();
  });

  it("does NOT match a deep extra-segment route (F)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/rome/example/extra`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBeNull();
  });

  it("is unaffected by query parameters (G)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/rome/example?ref=test`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBe(ACTIVITY_DETAIL_ROBOTS);
  });

  it("preserves status, body and content-type of the asset response (H)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/rome/example`),
      makeEnv() as never,
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("text/html; charset=utf-8");
    await expect(res.text()).resolves.toBe(SPA_BODY);
  });

  it("preserves other existing headers and keeps non-activity responses untouched (I)", async () => {
    const assetsFetch = vi.fn(async () => makeAssetResponse());
    const env = makeEnv(assetsFetch);

    // Activity path: existing headers survive alongside the new directive.
    const activityRes = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/rome/example`),
      env as never,
    );
    expect(activityRes.headers.get("x-asset-marker")).toBe("kept");
    expect(activityRes.headers.get("cache-control")).toBe(
      "public, max-age=3600",
    );
    expect(activityRes.headers.get("x-robots-tag")).toBe(
      ACTIVITY_DETAIL_ROBOTS,
    );

    // Non-activity path: response passes through with headers unchanged.
    const flightsRes = await worker.fetch(
      new Request(`${ORIGIN}/flights`),
      env as never,
    );
    expect(flightsRes.headers.get("x-asset-marker")).toBe("kept");
    expect(flightsRes.headers.get("content-type")).toBe(
      "text/html; charset=utf-8",
    );
    expect(flightsRes.headers.get("x-robots-tag")).toBeNull();
  });

  it("guards an unresolved activity URL fail-closed (no existence inference)", async () => {
    const res = await worker.fetch(
      new Request(`${ORIGIN}/things-to-do/anywhere/does-not-exist-yet`),
      makeEnv() as never,
    );
    expect(res.headers.get("x-robots-tag")).toBe(ACTIVITY_DETAIL_ROBOTS);
  });
});

// ═══ SITEMAP CONTRACT (unchanged) ═══
describe("sitemap", () => {
  it("still proxies /sitemap.xml to Supabase and does not pass through the SPA shell (J)", async () => {
    const upstreamFetch = vi.fn(
      async () =>
        new Response(
          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>',
          { status: 200, headers: { "content-type": "application/xml" } },
        ),
    );
    vi.stubGlobal("fetch", upstreamFetch);
    const assetsFetch = vi.fn();
    const env = makeEnv(assetsFetch);

    const res = await worker.fetch(
      new Request(`${ORIGIN}/sitemap.xml`),
      env as never,
    );

    expect(upstreamFetch).toHaveBeenCalledWith(
      "https://placeholder.supabase.co/functions/v1/sitemap",
      expect.objectContaining({ method: "GET" }),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/xml");
    expect(res.headers.get("x-robots-tag")).toBe("noindex");
    await expect(res.text()).resolves.toContain("<urlset");
    // The SPA asset router must never answer /sitemap.xml.
    expect(assetsFetch).not.toHaveBeenCalled();
  });

  it("keeps the 502 fallback when the upstream sitemap fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 503 })));
    const res = await worker.fetch(
      new Request(`${ORIGIN}/sitemap.xml`),
      makeEnv() as never,
    );
    expect(res.status).toBe(502);
    expect(res.headers.get("content-type")).toContain("text/plain");
  });
});
