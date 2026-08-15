/**
 * Things V2 (T2A) — canonical destination identity contract.
 *
 * The registry, its resolvers and the production boundaries:
 *
 *  1. Rome is the only canonical entry; its Viator ref is the sandbox-verified
 *     511 and it carries NO invented Tiqets ref.
 *  2. Rome is draft — never indexable, never sitemap-published.
 *  3. Resolvers are exact and provider-scoped: no fuzzy slugs, no cross-
 *     provider ref resolution.
 *  4. Duplicate slugs and duplicate provider refs are rejected at registry
 *     load (assertValidRegistry throws).
 *  5. No production code imports destination identity from the test fixtures,
 *     and no registry ref is copied from the fixture taxonomy.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  THINGS_DESTINATIONS,
  assertValidRegistry,
} from "@/data/thingsDestinations";
import {
  getThingsDestinationBySlug,
  getThingsDestinationByProviderRef,
  thingsDestinationViatorId,
  isThingsDestinationPublished,
  getAllThingsDestinations,
} from "@/lib/thingsDestinations";
import { TAXONOMY_DESTINATIONS } from "@/__fixtures__/viator-taxonomy";
import type { ThingsDestination } from "@/types/thingsDestination";

const readRoot = (rel: string) => readFileSync(rel, "utf8");

const rome = getThingsDestinationBySlug("rome");

// ── Rome identity — exact values ────────────────────────────────

describe("Things destination identity — Rome", () => {
  it("Rome slug resolves deterministically", () => {
    expect(rome).not.toBeNull();
    expect(getThingsDestinationBySlug("rome")?.slug).toBe("rome");
    // Case-insensitive exact lookup only — the URL can carry either case.
    expect(getThingsDestinationBySlug("Rome")?.slug).toBe("rome");
    expect(getThingsDestinationBySlug("  rome  ")?.slug).toBe("rome");
  });

  it("Rome Viator providerRef is \"511\"", () => {
    expect(rome?.providerRefs.viator).toBe("511");
  });

  it("Rome has no invented Tiqets providerRef", () => {
    expect(rome?.providerRefs).not.toHaveProperty("tiqets");
    expect(rome?.providerRefs.tiqets).toBeUndefined();
  });

  it("Rome is publicationStatus=draft", () => {
    expect(rome?.publicationStatus).toBe("draft");
    expect(isThingsDestinationPublished(rome!)).toBe(false);
  });

  it("Rome is sandbox-verified, not production-verified", () => {
    expect(rome?.verification.viator).toBe("sandbox-verified");
    expect(rome?.verification.viator).not.toBe("production-verified");
    expect(rome?.verification.tiqets).toBeUndefined();
  });

  it("Rome identity carries exactly the expected shape", () => {
    expect(rome).toMatchObject({
      slug: "rome",
      displayName: "Rome",
      countryName: "Italy",
      type: "CITY",
    });
  });

  it("thingsDestinationViatorId derives 511 ONLY from the registry ref", () => {
    expect(thingsDestinationViatorId(rome!)).toBe(511);
  });
});

// ── Unknown / invalid slugs ─────────────────────────────────────

describe("Things destination resolvers — unknown input", () => {
  it("unknown slug resolves null", () => {
    expect(getThingsDestinationBySlug("paris")).toBeNull();
    expect(getThingsDestinationBySlug("not-a-real-destination")).toBeNull();
    expect(getThingsDestinationBySlug("sydney")).toBeNull();
  });

  it("empty or malformed slug resolves null — no fuzzy fallback", () => {
    expect(getThingsDestinationBySlug("")).toBeNull();
    expect(getThingsDestinationBySlug("   ")).toBeNull();
    expect(getThingsDestinationBySlug(null)).toBeNull();
    expect(getThingsDestinationBySlug(undefined)).toBeNull();
    // Non-slug shapes must not partially match a registry slug.
    expect(getThingsDestinationBySlug("rome/extra")).toBeNull();
    expect(getThingsDestinationBySlug("rome?x=1")).toBeNull();
    expect(getThingsDestinationBySlug("rome..")).toBeNull();
    expect(getThingsDestinationBySlug("rôme")).toBeNull();
  });

  it("no name-only ambiguity resolution", () => {
    // Only exact slug lookup exists — there is deliberately no displayName
    // resolver, so a name can never be turned into an identity.
    expect(rome?.displayName).toBe("Rome");
    expect(getThingsDestinationBySlug("Rome, Italy")).toBeNull();
  });
});

// ── Provider-ref isolation ──────────────────────────────────────

describe("Things destination resolvers — provider-scoped refs", () => {
  it("provider ref lookup is provider-scoped", () => {
    expect(getThingsDestinationByProviderRef("viator", "511")?.slug).toBe("rome");
    expect(getThingsDestinationByProviderRef("tiqets", "511")).toBeNull();
  });

  it("a Tiqets ref cannot resolve through a Viator lookup", () => {
    // Rome has no Tiqets ref, so the tiqets namespace is empty for every
    // value that exists in the viator namespace.
    const viatorRefs = THINGS_DESTINATIONS
      .map((d) => d.providerRefs.viator)
      .filter((r): r is string => typeof r === "string");
    for (const ref of viatorRefs) {
      expect(getThingsDestinationByProviderRef("tiqets", ref)).toBeNull();
    }
  });

  it("empty or malformed refs resolve null", () => {
    expect(getThingsDestinationByProviderRef("viator", "")).toBeNull();
    expect(getThingsDestinationByProviderRef("viator", "   ")).toBeNull();
    expect(getThingsDestinationByProviderRef("viator", null)).toBeNull();
    expect(getThingsDestinationByProviderRef("viator", undefined)).toBeNull();
    expect(getThingsDestinationByProviderRef("viator", "509")).toBeNull();
  });

  it("every registry entry is reachable by its own slug only", () => {
    for (const d of getAllThingsDestinations()) {
      expect(getThingsDestinationBySlug(d.slug)?.slug).toBe(d.slug);
    }
  });
});

// ── Duplicate protection ────────────────────────────────────────

describe("Things destination registry — duplicate protection", () => {
  const base: ThingsDestination = {
    slug: "test-city",
    displayName: "Test City",
    countryName: "Testland",
    type: "CITY",
    providerRefs: { viator: "9001" },
    publicationStatus: "draft",
    verification: { viator: "sandbox-verified" },
  };

  it("accepts a well-formed registry", () => {
    expect(() => assertValidRegistry([base])).not.toThrow();
    // The real registry is valid by construction (module load).
    expect(THINGS_DESTINATIONS.length).toBeGreaterThan(0);
  });

  it("rejects duplicate slugs", () => {
    expect(() =>
      assertValidRegistry([
        base,
        { ...base, slug: "test-city", providerRefs: { viator: "9002" } },
      ]),
    ).toThrow(/duplicate slug/i);
  });

  it("rejects duplicate provider refs for the same provider", () => {
    expect(() =>
      assertValidRegistry([
        base,
        { ...base, slug: "test-city-2", providerRefs: { viator: "9001" } },
      ]),
    ).toThrow(/duplicate viator ref/i);
  });

  it("allows the same numeric ref across DIFFERENT providers (namespaced)", () => {
    expect(() =>
      assertValidRegistry([
        base,
        {
          ...base,
          slug: "test-city-2",
          providerRefs: { tiqets: "9001" },
        },
      ]),
    ).not.toThrow();
  });

  it("rejects malformed slugs and empty refs", () => {
    expect(() => assertValidRegistry([{ ...base, slug: "Test City" }])).toThrow(/invalid slug/i);
    expect(() =>
      assertValidRegistry([{ ...base, providerRefs: { viator: "  " } }]),
    ).toThrow(/invalid viator ref/i);
  });
});

// ── Fixture boundary ────────────────────────────────────────────

describe("Things destination registry — no fixture leakage", () => {
  it("no production registry entry uses an ID from the test fixture taxonomy", () => {
    const fixtureIds = new Set(TAXONOMY_DESTINATIONS.map((d) => d.destinationId));
    for (const destination of THINGS_DESTINATIONS) {
      const refs = destination.providerRefs;
      if (refs.viator !== undefined) {
        expect(fixtureIds.has(refs.viator), `viator ref ${refs.viator} is a fixture ID`).toBe(false);
      }
      if (refs.tiqets !== undefined) {
        expect(fixtureIds.has(refs.tiqets), `tiqets ref ${refs.tiqets} is a fixture ID`).toBe(false);
      }
    }
  });

  it("the registry source imports nothing from __fixtures__", () => {
    const src = readRoot("src/data/thingsDestinations.ts");
    // Imports only — a doc-comment warning is allowed, an import is not.
    expect(src).not.toMatch(/from\s+["'][^"']*__fixtures__/);
    expect(src).not.toMatch(/import\s*\(\s*["'][^"']*__fixtures__/);
  });

  it("the identity model source imports nothing from __fixtures__", () => {
    const src = readRoot("src/types/thingsDestination.ts");
    expect(src).not.toMatch(/from\s+["'][^"']*__fixtures__/);
  });

  it("the resolvers source imports nothing from __fixtures__", () => {
    const src = readRoot("src/lib/thingsDestinations.ts");
    expect(src).not.toMatch(/from\s+["'][^"']*__fixtures__/);
  });

  it("production autocomplete no longer imports from __fixtures__", () => {
    const src = readRoot("src/components/search/DestinationAutocomplete.tsx");
    expect(src).not.toMatch(/from\s+["'][^"']*__fixtures__/);
    expect(src).toMatch(/from "@\/services\/destinations"/);
  });
});
