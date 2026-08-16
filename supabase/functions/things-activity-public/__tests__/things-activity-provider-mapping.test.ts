/**
 * things-activity-public — provider → canonical activity mapping tests
 * (T2D-B2B-5A).
 *
 * The Edge Function runs in Deno; this repo's vitest convention (same as
 * sitemap-core) imports the pure core module directly and locks the HTTP
 * shell contract with source-contract assertions (readFileSync of index.ts).
 *
 * Coverage map (T2D-B2B-5A matrix):
 *   VALIDATION        A–J
 *   MAPPING           K–T
 *   HTTP / SOURCE     U–Y
 *   QUERY SECURITY    §14
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  buildProviderMappingBody,
  buildProviderMappingPayload,
  canonicalActivityPath,
  mapProviderProductsToCanonical,
  MAX_MAPPING_BATCH_SIZE,
  MAX_PROVIDER_PRODUCT_ID_LENGTH,
  PROVIDER_PRODUCT_ID_RE,
  SUPPORTED_MAPPING_PROVIDERS,
  validateProviderMappingInput,
} from "../things-activity-core.ts";

// ── Fixtures (the 1111450 / Rome example belongs in fixtures, never in
//    production source — the DB is the only source of truth) ────────────

const ACTIVITY_UUID = "11111111-1111-4111-8111-111111111111";
const OFFER_UUID = "22222222-2222-4222-8222-222222222222";

const TIQETS_OFFER_1111450 = {
  id: OFFER_UUID,
  activity_id: ACTIVITY_UUID,
  provider: "tiqets",
  provider_product_id: "1111450",
  provider_url: "https://www.tiqets.com/en/rome-vatican-museums/l1111450",
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
};

const VATICAN_ACTIVITY_DRAFT = {
  id: ACTIVITY_UUID,
  destination_slug: "rome",
  slug: "vatican-museums-sistine-chapel-fast-track-ticket",
  canonical_title: "Vatican Museums & Sistine Chapel Fast-Track Ticket",
  publication_status: "draft",
  verification: { evidence: "provider-catalog", internal: "never-leak" },
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
};

const viatorOffer = (productId: string, activityId = ACTIVITY_UUID) => ({
  id: `offer-${productId}`,
  activity_id: activityId,
  provider: "viator",
  provider_product_id: productId,
  provider_url: "https://www.viator.com/tours/Rome/example",
  created_at: "2026-08-16T00:00:00.000Z",
  updated_at: "2026-08-16T00:00:00.000Z",
});

// ═══════════════════════════════════════════════════════════════
// VALIDATION (A–J)
// ═══════════════════════════════════════════════════════════════

describe("validateProviderMappingInput — strict batch contract", () => {
  it("A. accepts a single valid Tiqets item (canonical production example)", () => {
    const result = validateProviderMappingInput([
      { provider: "tiqets", providerProductId: "1111450" },
    ]);
    expect(result).toEqual({
      ok: true,
      items: [{ provider: "tiqets", providerProductId: "1111450" }],
    });
  });

  it("B. accepts a valid alphanumeric Viator product ID", () => {
    const result = validateProviderMappingInput([
      { provider: "viator", providerProductId: "3731VATICAN" },
      { provider: "viator", providerProductId: "11489P12" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.items.map((i) => i.providerProductId)).toEqual([
        "3731VATICAN",
        "11489P12",
      ]);
    }
  });

  it("C. trims surrounding whitespace from providerProductId", () => {
    const result = validateProviderMappingInput([
      { provider: "tiqets", providerProductId: "  1111450  " },
    ]);
    expect(result).toEqual({
      ok: true,
      items: [{ provider: "tiqets", providerProductId: "1111450" }],
    });
  });

  it("D. rejects empty items", () => {
    expect(validateProviderMappingInput([]).ok).toBe(false);
    expect(validateProviderMappingInput(undefined).ok).toBe(false);
    expect(validateProviderMappingInput({}).ok).toBe(false);
    expect(validateProviderMappingInput("items").ok).toBe(false);
  });

  it("E. rejects more than the maximum batch size", () => {
    expect(MAX_MAPPING_BATCH_SIZE).toBe(50);
    const items = Array.from({ length: MAX_MAPPING_BATCH_SIZE + 1 }, (_, i) => ({
      provider: "tiqets",
      providerProductId: String(1000000 + i),
    }));
    const result = validateProviderMappingInput(items);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("at most");
    // Boundary: exactly 50 is accepted.
    const ok = validateProviderMappingInput(items.slice(0, MAX_MAPPING_BATCH_SIZE));
    expect(ok.ok).toBe(true);
  });

  it("F. rejects an unsupported provider (never silently repaired)", () => {
    expect(
      validateProviderMappingInput([{ provider: "getyourguide", providerProductId: "x" }]).ok,
    ).toBe(false);
    expect(
      validateProviderMappingInput([{ provider: "Tiqets", providerProductId: "1111450" }]).ok,
    ).toBe(false);
    expect(
      validateProviderMappingInput([{ provider: 42, providerProductId: "x" }]).ok,
    ).toBe(false);
    expect(
      validateProviderMappingInput([{ provider: null, providerProductId: "x" }]).ok,
    ).toBe(false);
    expect(SUPPORTED_MAPPING_PROVIDERS).toEqual(["tiqets", "viator"]);
  });

  it("G. rejects empty or non-string product IDs", () => {
    expect(
      validateProviderMappingInput([{ provider: "tiqets", providerProductId: "" }]).ok,
    ).toBe(false);
    expect(
      validateProviderMappingInput([{ provider: "tiqets", providerProductId: "   " }]).ok,
    ).toBe(false);
    expect(
      validateProviderMappingInput([{ provider: "tiqets", providerProductId: 42 }]).ok,
    ).toBe(false);
    expect(
      validateProviderMappingInput([{ provider: "tiqets", providerProductId: null }]).ok,
    ).toBe(false);
    expect(
      validateProviderMappingInput([{ provider: "tiqets" }]).ok,
    ).toBe(false);
  });

  it("H. rejects malformed / control-character / over-length product IDs", () => {
    const bad = [
      "1111\n450", // internal control/newline
      "abc;drop table", // SQL metacharacter + space
      "abc' OR '1'='1", // quote — must never become SQL syntax
      "abc def", // whitespace
      "123,456", // comma
      "café", // non-ASCII
      "\u0001", // raw control char
      "-leading", // must start alphanumeric
    ];
    for (const id of bad) {
      const result = validateProviderMappingInput([{ provider: "tiqets", providerProductId: id }]);
      expect(result.ok, `expected rejection for ${JSON.stringify(id)}`).toBe(false);
    }
    // The regex contract itself rejects every dangerous character class.
    for (const id of bad) {
      expect(PROVIDER_PRODUCT_ID_RE.test(id), `regex for ${JSON.stringify(id)}`).toBe(false);
    }
    // Length is enforced by the validator, not the character regex.
    const overLength = "a".repeat(MAX_PROVIDER_PRODUCT_ID_LENGTH + 1);
    expect(PROVIDER_PRODUCT_ID_RE.test(overLength)).toBe(true);
    expect(
      validateProviderMappingInput([{ provider: "tiqets", providerProductId: overLength }]).ok,
    ).toBe(false);
    // Conservative safe set still accepted (alphanumeric + . _ -).
    expect(PROVIDER_PRODUCT_ID_RE.test("11489P12")).toBe(true);
    expect(PROVIDER_PRODUCT_ID_RE.test("ID_123.45-AB")).toBe(true);
  });

  it("I. deduplicates exact provider/product pairs deterministically (first wins)", () => {
    const result = validateProviderMappingInput([
      { provider: "tiqets", providerProductId: "1111450" },
      { provider: "tiqets", providerProductId: "1111450" },
      { provider: "tiqets", providerProductId: " 1111450 " },
      { provider: "tiqets", providerProductId: "1111451" },
    ]);
    expect(result).toEqual({
      ok: true,
      items: [
        { provider: "tiqets", providerProductId: "1111450" },
        { provider: "tiqets", providerProductId: "1111451" },
      ],
    });
  });

  it("J. same product ID across different providers remains TWO identities", () => {
    const result = validateProviderMappingInput([
      { provider: "tiqets", providerProductId: "1111450" },
      { provider: "viator", providerProductId: "1111450" },
    ]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.items).toHaveLength(2);
  });
});

// ═══════════════════════════════════════════════════════════════
// MAPPING (K–T)
// ═══════════════════════════════════════════════════════════════

describe("mapProviderProductsToCanonical — exact identity bridge", () => {
  it("K. exact tiqets + 1111450 maps to the stored canonical activity", () => {
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450],
      [VATICAN_ACTIVITY_DRAFT],
    );
    expect(mappings).toEqual([
      {
        provider: "tiqets",
        providerProductId: "1111450",
        destinationSlug: "rome",
        activitySlug: "vatican-museums-sistine-chapel-fast-track-ticket",
        canonicalPath: "/things-to-do/rome/vatican-museums-sistine-chapel-fast-track-ticket",
        publicationStatus: "draft",
      },
    ]);
  });

  it("L. canonicalPath is built ONLY from stored destinationSlug + activitySlug", () => {
    expect(canonicalActivityPath("rome", "colosseum-tour")).toBe(
      "/things-to-do/rome/colosseum-tour",
    );
    expect(canonicalActivityPath("paris", "louvre-museum")).toBe(
      "/things-to-do/paris/louvre-museum",
    );
  });

  it("M. title is never involved in mapping identity", () => {
    const unrelatedTitle = "Completely Unrelated Marketing Copy";
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450],
      [{ ...VATICAN_ACTIVITY_DRAFT, canonical_title: unrelatedTitle }],
    );
    expect(mappings).toHaveLength(1);
    const json = JSON.stringify(mappings);
    expect(json).not.toContain(unrelatedTitle);
    expect(json).not.toContain("canonicalTitle");
    expect(json).not.toContain("title");
  });

  it("N. provider URL is never involved in mapping identity", () => {
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450],
      [VATICAN_ACTIVITY_DRAFT],
    );
    const json = JSON.stringify(mappings);
    expect(json).not.toContain("tiqets.com");
    expect(json).not.toContain("providerUrl");
    expect(mappings[0]).not.toHaveProperty("providerUrl");
  });

  it("O. unknown provider-product identities are omitted — the batch succeeds", () => {
    const mappings = mapProviderProductsToCanonical(
      [
        { provider: "tiqets", providerProductId: "1111450" },
        { provider: "tiqets", providerProductId: "does-not-exist" },
      ],
      [TIQETS_OFFER_1111450],
      [VATICAN_ACTIVITY_DRAFT],
    );
    expect(mappings).toHaveLength(1);
    expect(mappings[0].providerProductId).toBe("1111450");
  });

  it("P. archived activities are omitted (fail closed)", () => {
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450],
      [{ ...VATICAN_ACTIVITY_DRAFT, publication_status: "archived" }],
    );
    expect(mappings).toEqual([]);
  });

  it("Q. draft activities may map", () => {
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450],
      [VATICAN_ACTIVITY_DRAFT],
    );
    expect(mappings[0].publicationStatus).toBe("draft");
  });

  it("R. published activities may map", () => {
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450],
      [{ ...VATICAN_ACTIVITY_DRAFT, publication_status: "published" }],
    );
    expect(mappings[0].publicationStatus).toBe("published");
  });

  it("S. malformed canonical activity rows fail closed (never corrected)", () => {
    expect(
      buildProviderMappingPayload("tiqets", "1111450", {
        ...VATICAN_ACTIVITY_DRAFT,
        destination_slug: "Rome Capital", // violates slug contract
      }),
    ).toBeNull();
    expect(
      buildProviderMappingPayload("tiqets", "1111450", {
        ...VATICAN_ACTIVITY_DRAFT,
        slug: undefined, // missing stored identity
      }),
    ).toBeNull();
    expect(
      buildProviderMappingPayload("tiqets", "1111450", {
        ...VATICAN_ACTIVITY_DRAFT,
        publication_status: "weird-status", // unknown — never guessed
      }),
    ).toBeNull();
    expect(buildProviderMappingPayload("tiqets", "1111450", null)).toBeNull();
    expect(buildProviderMappingPayload("tiqets", "1111450", undefined)).toBeNull();
  });

  it("T. mapping response exposes NO verification or internal UUID fields", () => {
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450],
      [VATICAN_ACTIVITY_DRAFT],
    );
    const body = buildProviderMappingBody(2, mappings.length, mappings);

    expect(Object.keys(body).sort()).toEqual([
      "mappedCount",
      "mappings",
      "requestedCount",
      "status",
    ]);
    expect(body.status).toBe("ok");
    expect(body.requestedCount).toBe(2);
    expect(body.mappedCount).toBe(1);

    expect(Object.keys(mappings[0]).sort()).toEqual([
      "activitySlug",
      "canonicalPath",
      "destinationSlug",
      "provider",
      "providerProductId",
      "publicationStatus",
    ]);

    const json = JSON.stringify(body);
    expect(json).not.toContain("verification");
    expect(json).not.toContain(ACTIVITY_UUID);
    expect(json).not.toContain(OFFER_UUID);
    expect(json).not.toContain("never-leak");
    expect(json).not.toContain("provider-catalog");
  });

  it("mapping output preserves the validated deduplicated request order (deterministic)", () => {
    const mappings = mapProviderProductsToCanonical(
      [
        { provider: "viator", providerProductId: "3731VATICAN" },
        { provider: "tiqets", providerProductId: "1111450" },
      ],
      [TIQETS_OFFER_1111450, viatorOffer("3731VATICAN")],
      [VATICAN_ACTIVITY_DRAFT],
    );
    expect(mappings.map((m) => `${m.provider}:${m.providerProductId}`)).toEqual([
      "viator:3731VATICAN",
      "tiqets:1111450",
    ]);
  });

  it("same product ID across two providers stays provider-scoped in the join", () => {
    const sameIdViatorOffer = viatorOffer("1111450");
    const mappings = mapProviderProductsToCanonical(
      [
        { provider: "tiqets", providerProductId: "1111450" },
        { provider: "viator", providerProductId: "1111450" },
      ],
      [TIQETS_OFFER_1111450, sameIdViatorOffer],
      [VATICAN_ACTIVITY_DRAFT],
    );
    expect(mappings.map((m) => m.provider)).toEqual(["tiqets", "viator"]);
  });

  it("orphaned offers (activity row missing) fail closed per pair", () => {
    const mappings = mapProviderProductsToCanonical(
      [{ provider: "tiqets", providerProductId: "1111450" }],
      [TIQETS_OFFER_1111450], // no matching activity row provided
      [],
    );
    expect(mappings).toEqual([]);
  });
});

// ═══════════════════════════════════════════════════════════════
// HTTP / SOURCE CONTRACT (U–Y) and QUERY SECURITY (§14)
// ═══════════════════════════════════════════════════════════════

describe("things-activity-public index.ts source contract", () => {
  const source = readFileSync("supabase/functions/things-activity-public/index.ts", "utf-8");

  it("U. existing resolve action dispatch is preserved", () => {
    expect(source).toContain('if (action !== "resolve")');
    expect(source).toContain('validateResolveInput(body.destinationSlug, body.activitySlug)');
    expect(source).toContain("buildResolvedBody");
    expect(source).toContain("buildNotFoundBody");
    expect(source).toContain('if (isArchivedStatus(activity.publication_status))');
  });

  it("V. unknown action still returns 400", () => {
    expect(source).toContain(
      'return publicError("action is required (resolve | map-provider-products)", 400, headers);',
    );
  });

  it("W. map action malformed body returns 400", () => {
    expect(source).toContain("validateProviderMappingInput(body.items)");
    expect(source).toContain("publicError(validated.error, 400, headers)");
  });

  it("X. map action successful batch returns 200", () => {
    expect(source).toContain("buildProviderMappingBody(validated.items.length");
    expect(source).toContain("handleProviderMapping(body, headers)");
  });

  it("Y. no provider API code is introduced", () => {
    // No outbound network call anywhere in the function.
    expect(source).not.toMatch(/fetch\s*\(/);
    // No provider endpoints/tokens referenced.
    expect(source).not.toContain("tiqets.com");
    expect(source).not.toContain("viator.com");
    expect(source).not.toContain("TIQETS_API_TOKEN");
    expect(source).not.toContain("VIATOR_API");
    // The only remote import remains the pre-existing supabase client.
    const esmImports = source.match(/https:\/\/esm\.sh\//g) ?? [];
    expect(esmImports).toHaveLength(1);
  });

  it("QUERY SECURITY: never builds .or(...) / .filter(...) / .rpc(...) from user input", () => {
    expect(source).not.toContain(".or(");
    // Array.prototype.filter is fine; only a PostgREST query-builder .filter("col"...) is not.
    expect(source).not.toContain(".filter(\"");
    expect(source).not.toContain(".rpc(");
  });

  it("QUERY SECURITY: mapping uses fixed .in(...) column filters", () => {
    expect(source).toContain('.in("provider_product_id", productIds)');
    expect(source).toContain('.in("id", activityIds)');
  });

  it("QUERY SECURITY: mapping selects are fixed column lists (no arbitrary columns)", () => {
    expect(source).toContain('.select("id, activity_id, provider, provider_product_id")');
    expect(source).toContain('.select("id, destination_slug, slug, publication_status")');
  });

  it("QUERY SECURITY: mapping reads ONLY the two identity tables", () => {
    const offersQueries = source.match(/\.from\("things_activity_offers"\)/g) ?? [];
    const activitiesQueries = source.match(/\.from\("things_activities"\)/g) ?? [];
    const enrichmentQueries = source.match(/\.from\("experience_products"\)/g) ?? [];
    // resolve + map-provider-products each query the two identity tables once.
    expect(offersQueries).toHaveLength(2);
    expect(activitiesQueries).toHaveLength(2);
    // experience_products remains resolve-only enrichment (single occurrence).
    expect(enrichmentQueries).toHaveLength(1);
  });

  it("QUERY SECURITY: mapping selects never include enrichment/evidence columns", () => {
    // The mapping offer/activity selects are fixed column lists; they never
    // pull provider_url, title, verification or other internal columns.
    const mappingOfferSelect = 'select("id, activity_id, provider, provider_product_id")';
    const mappingActivitySelect = 'select("id, destination_slug, slug, publication_status")';
    for (const col of ["provider_url", "title", "verification", "canonical_title"]) {
      expect(mappingOfferSelect, `offer select must not contain ${col}`).not.toContain(col);
      expect(mappingActivitySelect, `activity select must not contain ${col}`).not.toContain(col);
    }
  });
});
