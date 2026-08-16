/**
 * Things V2 (T2D-B1) — activity resolver service + Edge Function contract.
 *
 * Part 1 — frontend service (supabase client mocked): exact slug pair only,
 * typed states, infrastructure failure != not-found, no provider calls.
 *
 * Part 2 — Edge Function source-contract checks (repo convention; no Deno
 * runner in vitest): read-only, no provider calls, no service-role leakage,
 * 404/400 mapping, archived fail-closed.
 *
 * Part 3 — regression guards: sitemap untouched, Rome unchanged (511),
 * Viator pageSize cap 20, VIATOR_PUBLIC_ENABLED unchanged, no render-time
 * canonical-URL manufacture from provider search results.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";

const readRoot = (rel: string) => readFileSync(rel, "utf8");

// ═══════════════════════════════════════════════════════════════
// Part 1 — frontend resolver service
// ═══════════════════════════════════════════════════════════════

const mockInvoke = vi.fn();
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => mockInvoke(...args) } },
}));

import { resolveThingsActivityDetail } from "@/services/thingsActivityDetail";
import { getThingsActivityBySlug } from "@/lib/thingsActivities";
import { createActivitySlug } from "@/lib/thingsActivitySlug";
import { THINGS_DESTINATIONS } from "@/data/thingsDestinations";
import { activityDetailHref } from "@/lib/thingsActivities";
import type { ExperienceProduct } from "@/types/experiences";

const DEST = "rome";
const SLUG = "vatican-museums-sistine-chapel-guided-tour";

const RESOLVED_PAYLOAD = {
  status: "available",
  activity: {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    destinationSlug: "rome",
    slug: "vatican-museums-sistine-chapel-guided-tour",
    canonicalTitle: "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
    publicationStatus: "draft",
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
  },
  offers: [
    {
      activityId: "a1b2c3d4-0000-4000-8000-000000000001",
      provider: "viator",
      providerProductId: "3731VATICAN",
      providerUrl: "https://www.viator.com/tours/Rome/vatican-museums-sistine-chapel",
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
      title: "Vatican Museums & Sistine Chapel",
      description: "Genuine provider description.",
      rating: 4.8,
      reviewCount: 1243,
      price: 59,
      currency: "AUD",
      freeCancellation: true,
    },
  ],
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("resolveThingsActivityDetail — frontend service contract", () => {
  it("invokes things-activity-public with the EXACT slug pair and action resolve", async () => {
    mockInvoke.mockResolvedValue({ data: RESOLVED_PAYLOAD, error: null });
    await resolveThingsActivityDetail(DEST, SLUG);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [functionName, options] = mockInvoke.mock.calls[0] as [
      string,
      { body: Record<string, unknown> },
    ];
    expect(functionName).toBe("things-activity-public");
    expect(options.body).toEqual({ action: "resolve", destinationSlug: "rome", activitySlug: SLUG });
  });

  it("U. the ONLY function call is the resolver — never a provider function", async () => {
    mockInvoke.mockResolvedValue({ data: RESOLVED_PAYLOAD, error: null });
    await resolveThingsActivityDetail(DEST, SLUG);
    expect(mockInvoke).toHaveBeenCalledTimes(1);
    const [functionName] = mockInvoke.mock.calls[0] as [string];
    expect(functionName).toBe("things-activity-public");
  });

  it("returns resolved state with canonical activity, destination summary and offers", async () => {
    mockInvoke.mockResolvedValue({ data: RESOLVED_PAYLOAD, error: null });
    const result = await resolveThingsActivityDetail(DEST, SLUG);
    expect(result.state).toBe("resolved");
    if (result.state !== "resolved") return;
    expect(result.detail.activity.slug).toBe(SLUG);
    expect(result.detail.activity.canonicalTitle).toContain("Vatican Museums");
    // Destination summary comes from the canonical registry, not the resolver.
    expect(result.detail.destination?.displayName).toBe("Rome");
    expect(result.detail.destination?.countryName).toBe("Italy");
    expect(result.detail.offers).toHaveLength(1);
    expect(result.detail.offers[0].provider).toBe("viator");
    expect(result.detail.offers[0].price).toBe(59);
  });

  it("V. HTTP 404 (context.status) maps to not-found", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { context: { status: 404 } },
    });
    const result = await resolveThingsActivityDetail(DEST, SLUG);
    expect(result).toEqual({ state: "not-found" });
  });

  it("a not_found body maps to not-found even without an HTTP error", async () => {
    mockInvoke.mockResolvedValue({ data: { status: "not_found" }, error: null });
    const result = await resolveThingsActivityDetail(DEST, SLUG);
    expect(result).toEqual({ state: "not-found" });
  });

  it("F. a network failure (no HTTP status) maps to unavailable, NOT not-found", async () => {
    mockInvoke.mockResolvedValue({ data: null, error: new Error("fetch failed") });
    const result = await resolveThingsActivityDetail(DEST, SLUG);
    expect(result).toEqual({ state: "unavailable" });
  });

  it("F. a 5xx infrastructure failure maps to unavailable, NOT not-found", async () => {
    mockInvoke.mockResolvedValue({
      data: null,
      error: { context: { status: 500 } },
    });
    const result = await resolveThingsActivityDetail(DEST, SLUG);
    expect(result).toEqual({ state: "unavailable" });
  });

  it("an invalid response body maps to unavailable", async () => {
    mockInvoke.mockResolvedValue({ data: { status: "available" }, error: null });
    expect((await resolveThingsActivityDetail(DEST, SLUG)).state).toBe("unavailable");

    mockInvoke.mockResolvedValue({ data: null, error: null });
    expect((await resolveThingsActivityDetail(DEST, SLUG)).state).toBe("unavailable");
  });

  it("an identity-mismatched response maps to unavailable (never trusts a different slug)", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ...RESOLVED_PAYLOAD,
        activity: { ...RESOLVED_PAYLOAD.activity, slug: "some-other-activity" },
      },
      error: null,
    });
    const result = await resolveThingsActivityDetail(DEST, SLUG);
    expect(result.state).toBe("unavailable");
  });

  it("skips malformed offers rather than inventing them", async () => {
    mockInvoke.mockResolvedValue({
      data: {
        ...RESOLVED_PAYLOAD,
        offers: [
          RESOLVED_PAYLOAD.offers[0],
          { provider: "viator" }, // missing identity fields
          null,
        ],
      },
      error: null,
    });
    const result = await resolveThingsActivityDetail(DEST, SLUG);
    expect(result.state).toBe("resolved");
    if (result.state === "resolved") {
      expect(result.detail.offers).toHaveLength(1);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 2 — Edge Function source contract
// ═══════════════════════════════════════════════════════════════

const indexSrc = readRoot("supabase/functions/things-activity-public/index.ts");
const coreSrc = readRoot("supabase/functions/things-activity-public/things-activity-core.ts");
// Normalize line endings: the repo is checked out with CRLF on Windows, while
// the multi-line source-contract assertion below expects a literal LF string.
// Normalizing keeps the identical contract on LF and CRLF checkouts.
const serviceSrc = readRoot("src/services/thingsActivityDetail.ts").replace(/\r\n/g, "\n");

describe("things-activity-public Edge Function — read-only resolver", () => {
  it("is POST-only and supports exactly the resolve action", () => {
    expect(indexSrc).toContain('if (req.method !== "POST")');
    expect(indexSrc).toContain('action !== "resolve"');
    expect(indexSrc).toMatch(/action is required \(resolve\)/);
  });

  it("uses the service-role client for server-side reads", () => {
    expect(indexSrc).toContain('Deno.env.get("SUPABASE_URL")');
    expect(indexSrc).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(indexSrc).toContain(".from(");
  });

  it("U. performs NO provider API calls and reads no provider keys", () => {
    expect(indexSrc).not.toContain("VIATOR_API_KEY");
    expect(indexSrc).not.toContain("TIQETS_API_KEY");
    expect(indexSrc).not.toMatch(/fetch\(/);
    expect(indexSrc).not.toContain("tiqets-client");
    expect(indexSrc).not.toContain("viator-client");
    // The core module has no network surface at all.
    expect(coreSrc).not.toMatch(/fetch\(/);
    expect(coreSrc).not.toContain("Deno.");
    expect(coreSrc).not.toMatch(/^import\s/m); // no import statements
  });

  it("reads exactly the three fixed tables — no arbitrary query passthrough", () => {
    expect(indexSrc).toContain('from("things_activities")');
    expect(indexSrc).toContain('from("things_activity_offers")');
    expect(indexSrc).toContain('from("experience_products")');
    expect(indexSrc).not.toMatch(/\.from\(\s*[^)]*\$\{/); // no templated table names
    expect(indexSrc).not.toMatch(/\.rpc\(/);
    expect(indexSrc).not.toContain("supabaseAdmin.from(\"select\"");
  });

  it("X. never exposes service-role credentials or internal error details", () => {
    // Key is read from the environment only; never logged or returned.
    expect(indexSrc).not.toMatch(/console\.(log|error)\([^)]*SERVICE_ROLE/);
    expect(indexSrc).not.toMatch(/console\.(log|error)\([^)]*supabaseAdmin/);
    // Public error responses are fixed strings, never internal details.
    expect(indexSrc).toMatch(/publicError\("Unable to resolve activity", 500/);
    expect(indexSrc).toMatch(/publicError\("An unexpected error occurred", 500/);
    expect(indexSrc).not.toMatch(/publicError\([^)]*err\./);
  });

  it("V. unknown activity fails closed with HTTP 404 and status not_found", () => {
    expect(indexSrc).toMatch(/json\(buildNotFoundBody\(\), 404, headers\)/);
    expect(coreSrc).toContain('return { status: "not_found" }');
  });

  it("Y. archived activities fail closed as not_found", () => {
    expect(indexSrc).toContain("isArchivedStatus(activity.publication_status)");
    expect(indexSrc).toMatch(/if \(isArchivedStatus[\s\S]{0,120}buildNotFoundBody\(\), 404/);
  });

  it("W. invalid input returns HTTP 400", () => {
    expect(indexSrc).toMatch(/publicError\(validated\.error, 400, headers\)/);
  });

  it("V/W. no fabricated identity: slugs must resolve in the database or fail closed", () => {
    expect(indexSrc).toContain("maybeSingle()");
    expect(indexSrc).toContain("if (!activity)");
    expect(indexSrc).toContain('json(buildNotFoundBody(), 404, headers)');
  });

  it("CORS uses the same restricted origins as existing public Things functions", () => {
    expect(indexSrc).toContain("https://bookingsfinder.com");
    expect(indexSrc).toContain("https://www.bookingsfinder.com");
    expect(indexSrc).toContain("bookingsfindercom.workers.dev");
    expect(indexSrc).toContain("http://localhost:8080");
    expect(indexSrc).toContain("http://localhost:8081");
  });

  it("the function is not deployed in this phase (documented local-only)", () => {
    expect(indexSrc).toMatch(/DO NOT DEPLOY in T2D-B1/i);
  });
});

describe("frontend resolver service — source contract", () => {
  it("calls only things-activity-public with action resolve (no provider calls)", () => {
    expect(serviceSrc).toContain('invoke(\n    "things-activity-public",');
    expect(serviceSrc).toContain('action: "resolve"');
    expect(serviceSrc).not.toContain('invoke("viator');
    expect(serviceSrc).not.toContain('invoke("tiqets');
  });

  it("keeps infrastructure failure distinct from not-found in source", () => {
    expect(serviceSrc).toContain('state: "not-found"');
    expect(serviceSrc).toContain('state: "unavailable"');
    expect(serviceSrc).toContain('state: "resolved"');
  });
});

// ═══════════════════════════════════════════════════════════════
// Part 3 — regression guards
// ═══════════════════════════════════════════════════════════════

describe("Z. activity URLs remain absent from the sitemap", () => {
  it("the sitemap builder contains no activity detail paths", () => {
    const core = readRoot("supabase/functions/sitemap/sitemap-core.ts");
    // The hub /things-to-do is fine; no /things-to-do/<dest>/<slug> entries.
    expect(core).not.toMatch(/things-to-do\/\$?\{?[^}]*\}\/\$\{/);
    expect(core).toContain('{ path: "/things-to-do"');
  });

  it("the sitemap function never queries activity tables", () => {
    const sitemap = readRoot("supabase/functions/sitemap/index.ts");
    expect(sitemap).not.toContain("things_activities");
    expect(sitemap).not.toContain("things_activity_offers");
  });
});

describe("AA/AB. Rome route and destination identity remain unchanged", () => {
  it("AA. /things-to-do/rome still renders ThingsToDo via the canonical registry", () => {
    const page = readRoot("src/pages/ThingsToDoDestinationPage.tsx");
    expect(page).toContain("getThingsDestinationBySlug");
    expect(page).toContain("<ThingsToDo destination={destination} />");
    expect(page).toContain("/things-to-do/:destinationSlug");
  });

  it("AB. Rome destinationId 511 is unchanged in the canonical registry", () => {
    const rome = THINGS_DESTINATIONS.find((d) => d.slug === "rome");
    expect(rome?.providerRefs.viator).toBe("511");
  });

  it("AB. no activity detail URL is added to the destination page or hub route", () => {
    const hub = readRoot("src/pages/ThingsToDoHubRoute.tsx");
    const dest = readRoot("src/pages/ThingsToDoDestinationPage.tsx");
    expect(hub).not.toContain("activityDetailHref");
    expect(dest).not.toContain("activityDetailHref");
  });
});

describe("AC/AD. provider boundaries remain unchanged", () => {
  it("AC. the Viator adapter pageSize cap remains 20", () => {
    const experiences = readRoot("src/services/experiences.ts");
    expect(experiences).toContain("const VIATOR_MAX_PAGE_SIZE = 20");
    expect(experiences).toContain("Math.min(filters.pageSize || 10, VIATOR_MAX_PAGE_SIZE)");
  });

  it("AC. viator-public still caps pageSize at 20", () => {
    const viator = readRoot("supabase/functions/viator-public/index.ts");
    expect(viator).toMatch(/pageSize[\s\S]{0,120}\.max\(\s*20\s*\)/);
  });

  it("AD. VIATOR_PUBLIC_ENABLED remains a server-side kill switch", () => {
    const viator = readRoot("supabase/functions/viator-public/index.ts");
    expect(viator).toContain('Deno.env.get("VIATOR_PUBLIC_ENABLED") === "true"');
    const experiences = readRoot("src/services/experiences.ts");
    expect(experiences).not.toContain("VIATOR_PUBLIC_ENABLED = false");
  });
});

describe("AE. provider search results cannot manufacture canonical URLs", () => {
  it("a slug derived from a provider title does not resolve against the empty registry", () => {
    const derived = createActivitySlug("Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour");
    expect(derived).toBe("vatican-museums-sistine-chapel-and-st-peters-basilica-guided-tour");
    // No persistence exists: the canonical registry is empty, so even a
    // perfect title-derived slug resolves to null (fail closed).
    expect(getThingsActivityBySlug("rome", derived)).toBeNull();
  });

  it("activityDetailHref refuses provider products by construction", () => {
    const product: ExperienceProduct = {
      provider: "viator",
      providerProductId: "3731VATICAN",
      title: "Vatican Museums",
      description: null,
      tagline: null,
      city: "Rome",
      country: null,
      destinationId: 511,
      imageUrl: null,
      imageAlt: null,
      imageCredit: null,
      rating: null,
      reviewCount: null,
      price: null,
      currency: null,
      saleStatus: null,
      features: {
        freeCancellation: null,
        skipLine: null,
        smartphoneTicket: null,
        instantConfirmation: null,
        wheelchairAccessible: null,
        likelyToSellOut: null,
      },
      outboundUrl: null,
      attributionRequired: true,
    };
    // @ts-expect-error — a provider product is NOT canonical activity identity.
    activityDetailHref(product);
    expect(true).toBe(true);
  });

  it("the Things search page performs no render-time canonical-URL manufacture", () => {
    const things = readRoot("src/pages/ThingsToDo.tsx");
    expect(things).not.toContain("createActivitySlug");
    expect(things).not.toContain("activityDetailHref");
    // No two-segment /things-to-do/<dest>/<slug> path is ever assembled.
    // (A one-segment destination canonical, /things-to-do/${slug}, is the
    // pre-existing, legitimate destination-page canonical.)
    expect(things).not.toMatch(/things-to-do\/\$\{[^}]*\}\/\$\{/);
  });
});
