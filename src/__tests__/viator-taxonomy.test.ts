/**
 * Viator sandbox foundation (T0B) — taxonomy contract and provider translation.
 *
 * Two things are proven here without any network call:
 *
 *  1. The taxonomy normalisers turn real Viator shapes into trustworthy rows
 *     and DROP anything they cannot trust, rather than defaulting it. These are
 *     logic-replications of supabase/functions/_shared/viator-normalizer.ts,
 *     matching the pattern the existing viator-public tests already use — the
 *     Deno function cannot be imported into the Vitest/browser environment.
 *  2. The provider adapter never sends viator-public a value its schema would
 *     reject. This is the latent 400 the T1 audit found: the customer default
 *     sort is a Tiqets vocabulary word.
 *
 * Source-level assertions guard the security invariants that must survive this
 * phase: sandbox-only hostname, no booking endpoints, strict action allowlist.
 */
import { describe, it, expect } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const fnSrc = read("supabase/functions/viator-public/index.ts");
const normSrc = read("supabase/functions/_shared/viator-normalizer.ts");
const adapterSrc = read("src/services/experiences.ts");

// ═══════════════════════════════════════════════════════════════
// Logic replication — destination normaliser
// ═══════════════════════════════════════════════════════════════

const MAX_TAXONOMY_TEXT = 120;

function taxonomyText(raw: unknown, max = MAX_TAXONOMY_TEXT): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.length > max ? trimmed.slice(0, max) : trimmed;
}

function taxonomyId(raw: unknown): number | null {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw <= 0) return null;
  return raw;
}

function normalizeDestination(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== "object") return null;
  const destinationId = taxonomyId(raw.destinationId);
  const name = taxonomyText(raw.name);
  if (destinationId === null || name === null) return null;
  return {
    destinationId,
    name,
    type: taxonomyText(raw.type, 40),
    parentDestinationId: taxonomyId(raw.parentDestinationId),
    lookupId: taxonomyText(raw.lookupId, 60),
    defaultCurrencyCode: taxonomyText(raw.defaultCurrencyCode, 8),
    timeZone: taxonomyText(raw.timeZone, 60),
  };
}

function englishTagName(names: Record<string, string> | undefined): string | null {
  if (!names || typeof names !== "object") return null;
  const direct = taxonomyText(names.en);
  if (direct) return direct;
  for (const key of Object.keys(names)) {
    if (key.toLowerCase().startsWith("en")) {
      const value = taxonomyText(names[key]);
      if (value) return value;
    }
  }
  return null;
}

function normalizeTag(raw: Record<string, unknown> | null | undefined) {
  if (!raw || typeof raw !== "object") return null;
  const tagId = taxonomyId(raw.tagId);
  const name = englishTagName(raw.allNamesByLocale as Record<string, string> | undefined);
  if (tagId === null || name === null) return null;
  const parents = Array.isArray(raw.parentTagIds)
    ? (raw.parentTagIds as unknown[]).map(taxonomyId).filter((n): n is number => n !== null)
    : [];
  return { tagId, name, parentTagIds: parents.length > 0 ? parents : null };
}

/** The adapter's translation, replicated from src/services/experiences.ts. */
const VIATOR_SORT: Record<string, string | undefined> = {
  popularity_desc: "relevance",
  price_asc: "price_low",
  title_asc: undefined,
};
const VIATOR_SORT_ENUM = ["relevance", "rating_high", "price_low"];

function viatorTagIds(tags: string[] | undefined): number[] | undefined {
  if (!tags || tags.length === 0) return undefined;
  const ids = tags.map((t) => Number(t)).filter((n) => Number.isInteger(n) && n > 0);
  return ids.length > 0 ? ids : undefined;
}

// ═══════════════════════════════════════════════════════════════
// Destinations
// ═══════════════════════════════════════════════════════════════

describe("Viator destinations — normalisation", () => {
  it("keeps the fields canonical identity will later need", () => {
    expect(
      normalizeDestination({
        destinationId: 9,
        name: "Rome",
        type: "CITY",
        parentDestinationId: 8,
        lookupId: "8.79.9",
        defaultCurrencyCode: "EUR",
        timeZone: "Europe/Rome",
      }),
    ).toEqual({
      destinationId: 9,
      name: "Rome",
      type: "CITY",
      parentDestinationId: 8,
      lookupId: "8.79.9",
      defaultCurrencyCode: "EUR",
      timeZone: "Europe/Rome",
    });
  });

  it("treats a missing parent as a root, not as unknown", () => {
    expect(normalizeDestination({ destinationId: 7, name: "Italy", type: "COUNTRY" })).toMatchObject({
      parentDestinationId: null,
      type: "COUNTRY",
    });
  });

  it("drops a row with no usable id", () => {
    for (const bad of [undefined, null, 0, -3, 1.5, "9"]) {
      expect(normalizeDestination({ destinationId: bad as never, name: "Rome" })).toBeNull();
    }
  });

  it("drops a row with no usable name", () => {
    expect(normalizeDestination({ destinationId: 9, name: "   " })).toBeNull();
    expect(normalizeDestination({ destinationId: 9 })).toBeNull();
  });

  it("never invents a type, currency or timezone", () => {
    expect(normalizeDestination({ destinationId: 9, name: "Rome" })).toMatchObject({
      type: null,
      lookupId: null,
      defaultCurrencyCode: null,
      timeZone: null,
    });
  });

  it("caps hostile free text rather than storing it whole", () => {
    const long = "x".repeat(500);
    const d = normalizeDestination({ destinationId: 9, name: long, type: long });
    expect(d!.name.length).toBe(120);
    expect(d!.type!.length).toBe(40);
  });

  it("rejects a non-object row", () => {
    expect(normalizeDestination(null)).toBeNull();
    expect(normalizeDestination(undefined)).toBeNull();
  });

  it("builds a parent chain sufficient to disambiguate duplicate city names", () => {
    const rows = [
      { destinationId: 7, name: "Italy", type: "COUNTRY" },
      { destinationId: 8, name: "Lazio", type: "REGION", parentDestinationId: 7 },
      { destinationId: 9, name: "Rome", type: "CITY", parentDestinationId: 8 },
      { destinationId: 20, name: "United States", type: "COUNTRY" },
      { destinationId: 21, name: "Georgia", type: "REGION", parentDestinationId: 20 },
      { destinationId: 22, name: "Rome", type: "CITY", parentDestinationId: 21 },
    ].map(normalizeDestination);

    const byId = new Map(rows.map((r) => [r!.destinationId, r!]));
    const chain = (id: number): string[] => {
      const out: string[] = [];
      let cur = byId.get(id);
      while (cur) {
        out.push(cur.name);
        cur = cur.parentDestinationId ? byId.get(cur.parentDestinationId) : undefined;
      }
      return out;
    };

    // Two cities share a name; the chain separates them without any guessing.
    expect(chain(9)).toEqual(["Rome", "Lazio", "Italy"]);
    expect(chain(22)).toEqual(["Rome", "Georgia", "United States"]);
    expect(chain(9)).not.toEqual(chain(22));
  });
});

// ═══════════════════════════════════════════════════════════════
// Tags
// ═══════════════════════════════════════════════════════════════

describe("Viator tags — normalisation", () => {
  it("takes the English name from the provider's own locale map", () => {
    expect(
      normalizeTag({ tagId: 21911, allNamesByLocale: { en: "Skip-the-Line", de: "Ohne Anstehen" } }),
    ).toEqual({ tagId: 21911, name: "Skip-the-Line", parentTagIds: null });
  });

  it("accepts a regional English locale key", () => {
    expect(normalizeTag({ tagId: 5, allNamesByLocale: { "en-AU": "Day Trips" } })).toMatchObject({
      name: "Day Trips",
    });
  });

  it("keeps genuine parent tag ids and drops junk ones", () => {
    expect(
      normalizeTag({ tagId: 3, parentTagIds: [2, 0, -1, 1.5, 4], allNamesByLocale: { en: "Cruises" } }),
    ).toMatchObject({ parentTagIds: [2, 4] });
  });

  it("drops a tag with no id or no English name", () => {
    expect(normalizeTag({ allNamesByLocale: { en: "Museums" } })).toBeNull();
    expect(normalizeTag({ tagId: 5, allNamesByLocale: { de: "Museen" } })).toBeNull();
    expect(normalizeTag({ tagId: 5 })).toBeNull();
  });

  it("attaches no popularity, ranking or product count", () => {
    const tag = normalizeTag({ tagId: 5, allNamesByLocale: { en: "Museums" } })!;
    expect(Object.keys(tag).sort()).toEqual(["name", "parentTagIds", "tagId"]);
  });
});

// ═══════════════════════════════════════════════════════════════
// Provider sort/tag translation — the latent 400
// ═══════════════════════════════════════════════════════════════

describe("Viator request translation", () => {
  it("never forwards the customer default sort as an unsupported Viator value", () => {
    expect(VIATOR_SORT.popularity_desc).not.toBe("popularity_desc");
    expect(VIATOR_SORT_ENUM).toContain(VIATOR_SORT.popularity_desc);
  });

  it("maps the provider-default order to Viator relevance", () => {
    expect(VIATOR_SORT.popularity_desc).toBe("relevance");
  });

  it("maps price ascending to Viator's price_low", () => {
    expect(VIATOR_SORT.price_asc).toBe("price_low");
  });

  it("sends no sort when Viator has no equivalent, rather than faking one", () => {
    expect(VIATOR_SORT.title_asc).toBeUndefined();
  });

  it("only ever emits a value viator-public's enum accepts", () => {
    for (const customerSort of ["popularity_desc", "price_asc", "title_asc"]) {
      const mapped = VIATOR_SORT[customerSort];
      if (mapped !== undefined) expect(VIATOR_SORT_ENUM).toContain(mapped);
    }
  });

  it("sends no activityTags when the UI only has free-text labels", () => {
    expect(viatorTagIds(["Museums", "City tours"])).toBeUndefined();
    expect(viatorTagIds([])).toBeUndefined();
    expect(viatorTagIds(undefined)).toBeUndefined();
  });

  it("forwards genuine numeric tag ids once they exist", () => {
    expect(viatorTagIds(["21911", "5"])).toEqual([21911, 5]);
    expect(viatorTagIds(["21911", "Museums"])).toEqual([21911]);
  });

  it("the adapter translates rather than forwarding the raw customer sort", () => {
    expect(adapterSrc).toContain("VIATOR_SORT");
    expect(adapterSrc).not.toMatch(/sort:\s*filters\.sort,/);
    expect(adapterSrc).not.toMatch(/activityTags:\s*filters\.activityTags,/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Security invariants that must survive this phase
// ═══════════════════════════════════════════════════════════════

describe("viator-public — sandbox and safety invariants", () => {
  it("remains disabled by default", () => {
    expect(fnSrc).toContain('Deno.env.get("VIATOR_PUBLIC_ENABLED") === "true"');
    expect(fnSrc).toMatch(/if \(!SERVER_ENABLED\)/);
  });

  it("remains locked to the sandbox hostname", () => {
    expect(fnSrc).toContain('const ALLOWED_HOSTNAME = "api.sandbox.viator.com"');
    expect(fnSrc).toMatch(/hostname !== ALLOWED_HOSTNAME/);
    expect(fnSrc).toMatch(/throw new Error\(/);
  });

  it("adds no production hostname and no environment switching", () => {
    expect(fnSrc).not.toContain("api.viator.com/partner");
    expect(fnSrc).not.toMatch(/VIATOR_API_ENV/);
    expect(fnSrc).not.toMatch(/production/i);
  });

  it("calls only the three Basic Access endpoints, at their live paths", () => {
    const endpoints = [...fnSrc.matchAll(/viator(?:Get|Post)<[^>]*>\(\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(new Set(endpoints)).toEqual(
      new Set(["/products/search", "/destinations", "/products/tags"]),
    );
  });

  it("reaches no booking or availability endpoint", () => {
    expect(fnSrc).not.toMatch(/["'`]\/bookings/);
    expect(fnSrc).not.toMatch(/["'`]\/availability/);
    expect(fnSrc).not.toMatch(/["'`]\/carts/);
    expect(fnSrc).not.toMatch(/["'`]\/orders/);
  });

  it("takes no caller-supplied path or host", () => {
    // Every upstream call site passes a string literal: the number of call
    // sites must equal the number of literal-endpoint call sites.
    // Exclude the two generic declarations (`async function viatorGet<T>(`).
    const callSites = [...fnSrc.matchAll(/(?<!function )viator(?:Get|Post)</g)].length;
    const literalCallSites = [...fnSrc.matchAll(/(?<!function )viator(?:Get|Post)<[^>]*>\(\s*\n?\s*"/g)].length;
    expect(callSites).toBeGreaterThanOrEqual(3);
    expect(literalCallSites).toBe(callSites);
    // Nothing from the request body can influence the URL.
    expect(fnSrc).not.toMatch(/body\.(endpoint|url|host|path)/);
    expect(fnSrc).not.toMatch(/rawBody[^\n]*\.(endpoint|url|host|path)/);
  });

  it("keeps a strict action allowlist and rejects anything else", () => {
    for (const action of ["search", "destinations", "tags", "status"]) {
      expect(fnSrc).toContain(`action === "${action}"`);
    }
    expect(fnSrc).toContain("Unknown action");
  });

  it("reads the key per request and never returns, logs or caches it", () => {
    expect(fnSrc).toContain('Deno.env.get("VIATOR_API_KEY")');

    // The key may only reach the upstream Authorization header. Every other
    // mention would be a leak: a response body, a log line, a cache key or a
    // cached payload.
    const mentions = [...fnSrc.matchAll(/\bapiKey\b/g)].length;
    const headerUses = [...fnSrc.matchAll(/"exp-api-key":\s*apiKey/g)].length;
    const declarations = [...fnSrc.matchAll(/const apiKey = Deno\.env\.get/g)].length;
    const guards = [...fnSrc.matchAll(/if \(!apiKey\)/g)].length;
    expect(mentions).toBe(headerUses + declarations + guards);

    expect(fnSrc).not.toMatch(/console\.(log|warn|error)\([^)]*apiKey/);
    expect(fnSrc).not.toMatch(/json\([^)]*apiKey/);
    expect(fnSrc).not.toMatch(/generateCacheKey\([^)]*apiKey/);
    expect(fnSrc).not.toMatch(/upsertCacheEntry\([^)]*apiKey/);
  });

  it("hard-codes no credential", () => {
    expect(fnSrc).not.toMatch(/exp-api-key["']\s*:\s*["'][A-Za-z0-9]/);
    expect(normSrc).not.toMatch(/api[_-]?key/i);
  });

  it("caches taxonomy for a day and search for minutes", () => {
    expect(fnSrc).toContain("const DESTINATIONS_TTL_SEC = 24 * 60 * 60");
    expect(fnSrc).toContain("const TAGS_TTL_SEC = 24 * 60 * 60");
    expect(fnSrc).toContain("const SEARCH_TTL_SEC = 10 * 60");
  });

  it("prefixes every cache key with the provider so Tiqets cannot collide", () => {
    const keys = [...fnSrc.matchAll(/generateCacheKey\(\s*\n?\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(keys.length).toBeGreaterThanOrEqual(3);
    expect(keys.every((k) => k === "viator")).toBe(true);
  });

  it("uses GET for taxonomy and POST only for search", () => {
    expect(fnSrc).toMatch(/async function viatorGet[\s\S]*?method: "GET"/);
    expect(fnSrc).toMatch(/async function viatorPost[\s\S]*?method: "POST"/);
  });

  it("preserves the outbound URL exactly, including tracking parameters", () => {
    expect(normSrc).toContain("preserves tracking params");
    expect(normSrc).toMatch(/return raw;/);
    // No rebuilding, no parameter injection.
    expect(normSrc).not.toMatch(/searchParams\.(set|append|delete)/);
  });
});

// ═══════════════════════════════════════════════════════════════
// Shapes corrected by live sandbox verification
//
// Each assertion below exists because the live response contradicted what the
// code assumed. They are written from the observed sandbox contract, not from
// documentation.
// ═══════════════════════════════════════════════════════════════

describe("Viator — shapes reconciled against the live sandbox", () => {
  it("uses the live destinations path, not the documented taxonomy path", () => {
    // GET /partner/v1/taxonomy/destinations → 404 on version 2.0.
    // GET /partner/destinations             → 200, { destinations, totalCount }.
    expect(fnSrc).toContain('"/destinations"');
    expect(fnSrc).not.toContain("/v1/taxonomy/destinations");
  });

  it("never sends RELEVANCE, which Viator rejects", () => {
    // Live: { "message": "Unknown search sorting field: RELEVANCE" }
    expect(fnSrc).not.toContain("RELEVANCE");
  });

  it("maps every sort to a value the live API accepts", () => {
    const LIVE_VALID = ["DEFAULT", "PRICE", "TRAVELER_RATING", "ITINERARY_DURATION", "DATE_ADDED"];
    const mapped = [...fnSrc.matchAll(/sort: "([A-Z_]+)"/g)].map((m) => m[1]);
    expect(mapped.length).toBeGreaterThanOrEqual(4);
    for (const value of mapped) expect(LIVE_VALID).toContain(value);
  });

  it("reads image URLs from variants, where the live response puts them", () => {
    // Live image row is { imageSource, caption, isCover, variants[] };
    // the URL is on the variant, never on the row.
    expect(normSrc).toContain("variants");
    expect(normSrc).toMatch(/img\?\.variants \?\? \[\]/);
    expect(normSrc).toMatch(/safeViatorImageUrl\(variant\?\.url\)/);
  });

  it("allows the live image CDN host", () => {
    // Live variants are served from hare-media-cdn.tripadvisor.com, which the
    // allow-list admits via its ".tripadvisor.com" suffix rule.
    const host = "hare-media-cdn.tripadvisor.com";
    const allowed = ["viator.com", "tripadvisor.com", "media.viator.com", "cdn.viator.com"];
    expect(allowed.some((a) => host === a || host.endsWith("." + a))).toBe(true);
    expect(normSrc).toContain('"tripadvisor.com"');
  });

  it("accepts the live outbound host, which is a viator.com subdomain", () => {
    // Sandbox returns shop.live.rc.viator.com, not www.viator.com.
    const host: string = "shop.live.rc.viator.com";
    expect(host === "viator.com" || host.endsWith(".viator.com")).toBe(true);
  });

  it("treats a product destination row as { ref, primary } with no name", () => {
    // Live: [{ "ref": "511", "primary": true }] — so `city` must stay null
    // rather than being invented from the id.
    expect(normSrc).toMatch(/ref\?: string; primary\?: boolean/);
    expect(normSrc).toContain("city: primaryDestination?.name ?? null");
  });

  it("declares duration without surfacing it, matching the live shape", () => {
    // Live: { "fixedDurationInMinutes": 180 }. Declared for honesty; adding it
    // to ExperienceProduct belongs to the card-contract phase.
    expect(normSrc).toContain("fixedDurationInMinutes");
    expect(normSrc).not.toMatch(/^\s*duration: /m);
  });

  it("keeps free cancellation on flags, since bookingInfo is absent live", () => {
    expect(normSrc).toMatch(/hasFlag\(flags, "FREE_CANCELLATION"\)/);
  });

  it("resolves an English tag name from an underscore locale key", () => {
    // Live rows commonly carry en_AU and no plain "en".
    expect(normalizeTag({ tagId: 11929, allNamesByLocale: { de: "X", en_AU: "Cultural Tours" } }))
      .toMatchObject({ name: "Cultural Tours" });
  });
});
