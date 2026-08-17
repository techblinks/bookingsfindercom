/**
 * Things V2 (T2A) — canonical destination identity contract.
 *
 * The registry, its resolvers and the production boundaries:
 *
 *  1. Rome is the only canonical entry; its Viator ref is the sandbox-verified
 *     511 and its Tiqets ref is the PB2A-verified 71631. Neither is invented,
 *     and neither is reachable through the other provider's namespace.
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
  resolveThingsDestinationFromLegacyCity,
  thingsDestinationPath,
  thingsDestinationTiqetsId,
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

  // A. Rome carries the PB2A-proven Tiqets city ID.
  it("Rome Tiqets providerRef is \"71631\"", () => {
    expect(rome?.providerRefs.tiqets).toBe("71631");
  });

  // D. The two refs stay in their own namespaces — never each other's value.
  it("the Rome provider refs are never interchanged", () => {
    expect(rome?.providerRefs.tiqets).not.toBe(rome?.providerRefs.viator);
    expect(rome?.providerRefs.tiqets).not.toBe("511");
    expect(rome?.providerRefs.viator).not.toBe("71631");
  });

  it("Rome is publicationStatus=draft", () => {
    expect(rome?.publicationStatus).toBe("draft");
    expect(isThingsDestinationPublished(rome!)).toBe(false);
  });

  // B/C. Verification records what was actually proven, per provider.
  it("Rome Viator is sandbox-verified and Tiqets is verified", () => {
    expect(rome?.verification.viator).toBe("sandbox-verified");
    expect(rome?.verification.viator).not.toBe("production-verified");
    expect(rome?.verification.tiqets).toBe("verified");
  });

  it("Rome identity carries exactly the expected shape", () => {
    expect(rome).toMatchObject({
      slug: "rome",
      displayName: "Rome",
      countryName: "Italy",
      type: "CITY",
    });
  });

  // F/G. Each resolver returns its own provider's ID.
  it("thingsDestinationViatorId derives 511 ONLY from the registry ref", () => {
    expect(thingsDestinationViatorId(rome!)).toBe(511);
  });

  it("thingsDestinationTiqetsId derives 71631 ONLY from the registry ref", () => {
    expect(thingsDestinationTiqetsId(rome!)).toBe(71631);
  });
});

// ── Provider-scoped ID resolvers (T3B-INT-PB2B) ─────────────────

describe("Things destination — provider-scoped ID resolvers", () => {
  const withRefs = (providerRefs: ThingsDestination["providerRefs"]): ThingsDestination => ({
    ...rome!,
    providerRefs,
  });

  // H. The Tiqets resolver cannot see the Viator namespace.
  it("the Tiqets resolver never reads the Viator ref", () => {
    expect(thingsDestinationTiqetsId(withRefs({ viator: "511" }))).toBeUndefined();
    // Even when Viator holds a perfectly valid number, Tiqets stays undefined.
    expect(thingsDestinationTiqetsId(withRefs({ viator: "71631" }))).toBeUndefined();
  });

  // I. The Viator resolver cannot see the Tiqets namespace.
  it("the Viator resolver never reads the Tiqets ref", () => {
    expect(thingsDestinationViatorId(withRefs({ tiqets: "71631" }))).toBeUndefined();
    expect(thingsDestinationViatorId(withRefs({ tiqets: "511" }))).toBeUndefined();
  });

  it("each resolver returns its own provider's ID when both are present", () => {
    const both = withRefs({ tiqets: "71631", viator: "511" });
    expect(thingsDestinationTiqetsId(both)).toBe(71631);
    expect(thingsDestinationViatorId(both)).toBe(511);
  });

  // J. Absent, empty, malformed and non-positive refs all resolve undefined.
  it("returns undefined for an absent Tiqets ref", () => {
    expect(thingsDestinationTiqetsId(withRefs({}))).toBeUndefined();
  });

  it("returns undefined for empty, malformed and non-positive Tiqets refs", () => {
    for (const ref of ["", "   ", "abc", "71631x", "7 1631", "0", "-1", "-71631", "1.5", "71631.5", "NaN", "Infinity", "1e3x"]) {
      expect(thingsDestinationTiqetsId(withRefs({ tiqets: ref })), `ref "${ref}"`).toBeUndefined();
    }
  });

  it("trims surrounding whitespace on an otherwise genuine Tiqets ref", () => {
    expect(thingsDestinationTiqetsId(withRefs({ tiqets: "  71631  " }))).toBe(71631);
  });

  it("applies the same rules to the Viator resolver — semantics preserved", () => {
    expect(thingsDestinationViatorId(withRefs({}))).toBeUndefined();
    for (const ref of ["", "   ", "abc", "0", "-511", "5.11"]) {
      expect(thingsDestinationViatorId(withRefs({ viator: ref })), `ref "${ref}"`).toBeUndefined();
    }
    expect(thingsDestinationViatorId(withRefs({ viator: " 511 " }))).toBe(511);
  });

  it("never derives an ID from the slug or the display name", () => {
    const noRefs: ThingsDestination = { ...rome!, providerRefs: {} };
    expect(noRefs.slug).toBe("rome");
    expect(noRefs.displayName).toBe("Rome");
    expect(thingsDestinationTiqetsId(noRefs)).toBeUndefined();
    expect(thingsDestinationViatorId(noRefs)).toBeUndefined();
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
    expect(getThingsDestinationByProviderRef("tiqets", "71631")?.slug).toBe("rome");
    // Each ref exists only in its own provider's namespace.
    expect(getThingsDestinationByProviderRef("tiqets", "511")).toBeNull();
    expect(getThingsDestinationByProviderRef("viator", "71631")).toBeNull();
  });

  it("no ref resolves through the other provider's namespace", () => {
    // Every genuine ref must be findable ONLY under its own provider, in both
    // directions — Rome now carries a ref in each namespace.
    const refsBy = (provider: "viator" | "tiqets") =>
      THINGS_DESTINATIONS
        .map((d) => d.providerRefs[provider])
        .filter((r): r is string => typeof r === "string");

    for (const ref of refsBy("viator")) {
      expect(getThingsDestinationByProviderRef("viator", ref)).not.toBeNull();
      expect(getThingsDestinationByProviderRef("tiqets", ref)).toBeNull();
    }
    for (const ref of refsBy("tiqets")) {
      expect(getThingsDestinationByProviderRef("tiqets", ref)).not.toBeNull();
      expect(getThingsDestinationByProviderRef("viator", ref)).toBeNull();
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

  // E. Duplicate validation is enforced per provider, Tiqets included.
  it("rejects duplicate Tiqets refs independently of the Viator namespace", () => {
    const tiqetsBase: ThingsDestination = {
      ...base,
      providerRefs: { tiqets: "71631" },
      verification: { tiqets: "verified" },
    };
    expect(() =>
      assertValidRegistry([
        tiqetsBase,
        { ...tiqetsBase, slug: "test-city-2", providerRefs: { tiqets: "71631" } },
      ]),
    ).toThrow(/duplicate tiqets ref/i);
    // A Viator ref of the same value is a different namespace — not a clash.
    expect(() =>
      assertValidRegistry([
        tiqetsBase,
        { ...tiqetsBase, slug: "test-city-2", providerRefs: { viator: "71631" } },
      ]),
    ).not.toThrow();
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

// ── Legacy city → canonical resolver (T2B) ─────────────────────

describe("Things destination — legacy city resolver", () => {
  it("resolves canonical Rome from exact legacy city text", () => {
    expect(resolveThingsDestinationFromLegacyCity("Rome")?.slug).toBe("rome");
  });

  it("is case-insensitive for an exact match", () => {
    expect(resolveThingsDestinationFromLegacyCity("rome")?.slug).toBe("rome");
    expect(resolveThingsDestinationFromLegacyCity("ROME")?.slug).toBe("rome");
    expect(resolveThingsDestinationFromLegacyCity(" rOmE ")?.slug).toBe("rome");
  });

  it("tolerates surrounding whitespace", () => {
    expect(resolveThingsDestinationFromLegacyCity("  Rome  ")?.slug).toBe("rome");
    expect(resolveThingsDestinationFromLegacyCity(" ROME " )?.slug).toBe("rome");
  });

  it("returns null for non-canonical cities", () => {
    expect(resolveThingsDestinationFromLegacyCity("Paris")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("Sydney")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("Melbourne")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("London")).toBeNull();
  });

  it("never matches qualified or fuzzy variants of a canonical display name", () => {
    expect(resolveThingsDestinationFromLegacyCity("Rome Italy")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("Rome, Italy")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("Roma")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("Romee")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("rome-italy")).toBeNull();
  });

  it("never invents a slug from free text", () => {
    // Slug-shaped text still cannot resolve: identity comes from the registry
    // display name, never from slugifying arbitrary user text.
    expect(resolveThingsDestinationFromLegacyCity("paris")?.slug).toBeUndefined();
    expect(resolveThingsDestinationFromLegacyCity("new-york")).toBeNull();
  });

  it("performs no provider lookup or provider-ID interpretation", () => {
    // "511" and "71631" are Rome's genuine Viator and Tiqets refs, but the
    // resolver matches city TEXT only — a ref-shaped input can never resolve.
    expect(resolveThingsDestinationFromLegacyCity("511")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("71631")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("66342")).toBeNull();
  });

  it("a fixture taxonomy ID never resolves through the legacy resolver", () => {
    for (const fixture of TAXONOMY_DESTINATIONS) {
      expect(
        resolveThingsDestinationFromLegacyCity(String(fixture.destinationId)),
      ).toBeNull();
    }
  });

  it("rejects empty and non-string input", () => {
    expect(resolveThingsDestinationFromLegacyCity("")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity("   ")).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity(null)).toBeNull();
    expect(resolveThingsDestinationFromLegacyCity(undefined)).toBeNull();
  });

  it("fails closed when an exact display name is ambiguous across the registry", () => {
    const ambiguous: readonly ThingsDestination[] = [
      rome!,
      { ...rome!, slug: "rome-2", providerRefs: { viator: "999" } },
    ];
    // Two registry entries share displayName "Rome": resolution must NOT
    // silently pick one — it returns null.
    expect(resolveThingsDestinationFromLegacyCity("Rome", ambiguous)).toBeNull();
  });

  it("resolves only against the registry supplied — the production registry stays Rome-only", () => {
    // The resolver is registry-driven: an entry that genuinely exists in a
    // supplied registry resolves, while the production registry cannot
    // resolve Paris by construction.
    expect(resolveThingsDestinationFromLegacyCity("Paris")).toBeNull();
    const extended: readonly ThingsDestination[] = [
      ...THINGS_DESTINATIONS,
      { ...rome!, slug: "paris", displayName: "Paris", providerRefs: {} },
    ];
    expect(resolveThingsDestinationFromLegacyCity("Paris", extended)?.slug).toBe("paris");
  });
});

// ── Canonical path helper (T2B) ────────────────────────────────

describe("Things destination — canonical path helper", () => {
  it("builds the canonical path from the registry slug", () => {
    expect(thingsDestinationPath(rome!)).toBe("/things-to-do/rome");
  });

  it("keeps the path contract tight — no trailing slash, no query", () => {
    expect(thingsDestinationPath(rome!)).toMatch(/^\/things-to-do\/[a-z0-9-]+$/);
  });
});
