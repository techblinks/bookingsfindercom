/**
 * Things V2 (T2D-A) — canonical activity identity + URL contract.
 *
 * Proves:
 *   A/B. canonical activity path, including the Rome example
 *   J/K. providerProductId and provider name never appear in a canonical URL
 *   L.   destination + activity path separation
 *   N.   activity identity and provider offer identity cannot be confused
 *   +    the registry validator, the fail-closed resolver, and the
 *        draft-by-default publication contract.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import {
  THINGS_ACTIVITIES,
  assertValidActivityRegistry,
  THINGS_ACTIVITY_SLUG_RE,
  MAX_ACTIVITY_SLUG_LENGTH,
} from "@/data/thingsActivities";
import {
  getAllThingsActivities,
  getThingsActivityBySlug,
  isThingsActivityPublished,
  thingsActivityPath,
} from "@/lib/thingsActivities";
import type {
  ThingsActivity,
  ThingsActivityOffer,
} from "@/types/thingsActivity";

const readRoot = (rel: string) => readFileSync(rel, "utf8");

/** A well-formed canonical activity for validator tests. */
function makeActivity(overrides?: Partial<ThingsActivity>): ThingsActivity {
  return {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    destinationSlug: "rome",
    slug: "vatican-museums-guided-tour",
    canonicalTitle: "Vatican Museums Guided Tour",
    publicationStatus: "draft",
    verification: { evidence: "provider-catalog" },
    createdAt: "2026-08-16T00:00:00.000Z",
    updatedAt: "2026-08-16T00:00:00.000Z",
    ...overrides,
  };
}

// ── Canonical activity path ────────────────────────────────────

describe("thingsActivityPath — canonical URL contract", () => {
  it("A. builds the canonical activity path from identity", () => {
    expect(
      thingsActivityPath({
        destinationSlug: "rome",
        slug: "vatican-museums-guided-tour",
      }),
    ).toBe("/things-to-do/rome/vatican-museums-guided-tour");
  });

  it("B. Rome example matches the product requirement", () => {
    expect(
      thingsActivityPath({
        destinationSlug: "rome",
        slug: "vatican-museums-sistine-chapel-guided-tour",
      }),
    ).toBe("/things-to-do/rome/vatican-museums-sistine-chapel-guided-tour");
  });

  it("works with a full ThingsActivity (identity fields present)", () => {
    expect(thingsActivityPath(makeActivity())).toBe(
      "/things-to-do/rome/vatican-museums-guided-tour",
    );
  });

  it("L. keeps destination and activity as separate path segments", () => {
    const path = thingsActivityPath({ destinationSlug: "rome", slug: "colosseum-tour" });
    const segments = path.split("/").filter(Boolean);
    expect(segments).toEqual(["things-to-do", "rome", "colosseum-tour"]);
    expect(segments).toHaveLength(3);
  });

  it("J. providerProductId never appears in the canonical path", () => {
    const path = thingsActivityPath({
      destinationSlug: "rome",
      slug: "vatican-museums-guided-tour",
    });
    expect(path).not.toContain("3731VATICAN");
    expect(path).not.toMatch(/id=/);
  });

  it("K. provider name never appears in the canonical path", () => {
    const path = thingsActivityPath({
      destinationSlug: "rome",
      slug: "vatican-museums-guided-tour",
    });
    expect(path).not.toContain("viator");
    expect(path).not.toContain("tiqets");
    expect(path).not.toContain("provider");
  });

  it("path is lowercase and hyphen-separated", () => {
    const path = thingsActivityPath({ destinationSlug: "rome", slug: "a-b-c" });
    expect(path).toMatch(/^\/things-to-do\/[a-z0-9-]+\/[a-z0-9-]+$/);
    expect(path).not.toMatch(/[A-Z]/);
  });
});

// ── Identity vs offer separation ───────────────────────────────

describe("activity identity and provider offer identity are distinct", () => {
  it("N. ThingsActivity carries NO provider fields", () => {
    const activity = makeActivity();
    expect(activity).not.toHaveProperty("provider");
    expect(activity).not.toHaveProperty("providerProductId");
    expect(activity).not.toHaveProperty("providerUrl");
  });

  it("N. ThingsActivityOffer carries NO canonical identity fields", () => {
    const offer: ThingsActivityOffer = {
      activityId: makeActivity().id,
      provider: "viator",
      providerProductId: "3731VATICAN",
      providerUrl: "https://www.viator.com/tours/Rome/thing-to-do",
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
    };
    expect(offer).not.toHaveProperty("slug");
    expect(offer).not.toHaveProperty("destinationSlug");
    expect(offer).not.toHaveProperty("canonicalTitle");
  });

  it("N. providerProductId cannot be passed as canonical identity (type + value)", () => {
    // A provider offer cannot satisfy ThingsActivityIdentity: it lacks
    // destinationSlug and slug. This is enforced by the type system AND by
    // the URL builder accepting only identity fields.
    const offer = {
      activityId: "x",
      provider: "viator" as const,
      providerProductId: "3731VATICAN",
      providerUrl: null,
      createdAt: "",
      updatedAt: "",
    };
    // @ts-expect-error — ThingsActivityOffer is not canonical identity.
    thingsActivityPath(offer);
    expect(true).toBe(true);
  });

  it("N. the type model makes providerProductId vs activitySlug confusion impossible", () => {
    // Referencing the offer's product id must go through the offer shape;
    // there is no `providerProductId` on the activity shape to read.
    const activity = makeActivity();
    const offer: ThingsActivityOffer = {
      activityId: activity.id,
      provider: "tiqets",
      providerProductId: "tiqets-product-123",
      providerUrl: null,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
    expect(offer.providerProductId).toBe("tiqets-product-123");
    // @ts-expect-error — activity identity has no providerProductId.
    expect(activity.providerProductId).toBeUndefined();
  });

  it("M. newly created activities default to draft (type contract)", () => {
    const activity = makeActivity();
    expect(activity.publicationStatus).toBe("draft");
    expect(isThingsActivityPublished(activity)).toBe(false);
  });
});

// ── Registry validation ────────────────────────────────────────

describe("Things activity registry — validation and fail-closed resolution", () => {
  it("the production registry is valid and currently empty", () => {
    expect(() => assertValidActivityRegistry(THINGS_ACTIVITIES)).not.toThrow();
    expect(getAllThingsActivities()).toEqual([]);
    expect(THINGS_ACTIVITIES).toHaveLength(0);
  });

  it("accepts a well-formed registry", () => {
    expect(() => assertValidActivityRegistry([makeActivity()])).not.toThrow();
  });

  it("rejects duplicate (destinationSlug, slug) identity", () => {
    expect(() =>
      assertValidActivityRegistry([
        makeActivity(),
        makeActivity({ id: "a1b2c3d4-0000-4000-8000-000000000002" }),
      ]),
    ).toThrow(/duplicate identity/i);
  });

  it("rejects duplicate ids", () => {
    expect(() =>
      assertValidActivityRegistry([
        makeActivity(),
        makeActivity({ slug: "colosseum-tour" }),
      ]),
    ).toThrow(/duplicate id/i);
  });

  it("allows the same slug under a DIFFERENT destination", () => {
    expect(() =>
      assertValidActivityRegistry([
        makeActivity(),
        makeActivity({
          id: "a1b2c3d4-0000-4000-8000-000000000002",
          destinationSlug: "paris",
          slug: "vatican-museums-guided-tour",
        }),
      ]),
    ).not.toThrow();
  });

  it("rejects malformed destination slugs and activity slugs", () => {
    expect(() =>
      assertValidActivityRegistry([makeActivity({ destinationSlug: "Roma" })]),
    ).toThrow(/invalid destinationSlug/i);
    expect(() =>
      assertValidActivityRegistry([makeActivity({ slug: "Bad Slug" })]),
    ).toThrow(/invalid slug/i);
    expect(() =>
      assertValidActivityRegistry([makeActivity({ slug: "trailing-" })]),
    ).toThrow(/invalid slug/i);
  });

  it("rejects over-length slugs", () => {
    expect(() =>
      assertValidActivityRegistry([
        makeActivity({ slug: "a".repeat(MAX_ACTIVITY_SLUG_LENGTH + 1) }),
      ]),
    ).toThrow(/exceeds/i);
  });

  it("rejects empty canonical titles", () => {
    expect(() =>
      assertValidActivityRegistry([makeActivity({ canonicalTitle: "   " })]),
    ).toThrow(/empty canonicalTitle/i);
  });

  it("rejects unknown publication statuses", () => {
    expect(() =>
      assertValidActivityRegistry([
        makeActivity({ publicationStatus: "published" as never }), // valid, for contrast
      ]),
    ).not.toThrow();
    expect(() =>
      assertValidActivityRegistry([
        makeActivity({ publicationStatus: "secret" as never }),
      ]),
    ).toThrow(/invalid publicationStatus/i);
  });
});

// ── Fail-closed resolver ───────────────────────────────────────

describe("getThingsActivityBySlug — strict, fail-closed resolution", () => {
  const extended: readonly ThingsActivity[] = [
    makeActivity(),
    makeActivity({
      id: "a1b2c3d4-0000-4000-8000-000000000002",
      destinationSlug: "paris",
      slug: "louvre-guided-tour",
      canonicalTitle: "Louvre Guided Tour",
    }),
  ];

  it("resolves an existing identity exactly (case-insensitive)", () => {
    expect(getThingsActivityBySlug("rome", "vatican-museums-guided-tour", extended)?.slug).toBe(
      "vatican-museums-guided-tour",
    );
    expect(getThingsActivityBySlug("Rome", "VATICAN-MUSEUMS-GUIDED-TOUR", extended)?.slug).toBe(
      "vatican-museums-guided-tour",
    );
  });

  it("never invents identity from arbitrary URL text", () => {
    expect(getThingsActivityBySlug("rome", "any-random-slug", extended)).toBeNull();
    expect(getThingsActivityBySlug("rome", "3731VATICAN", extended)).toBeNull();
    expect(getThingsActivityBySlug("rome", "viator", extended)).toBeNull();
  });

  it("an activity is resolved only under its own destination", () => {
    // "louvre-guided-tour" exists under paris, not rome.
    expect(getThingsActivityBySlug("rome", "louvre-guided-tour", extended)).toBeNull();
    expect(getThingsActivityBySlug("paris", "louvre-guided-tour", extended)?.slug).toBe(
      "louvre-guided-tour",
    );
  });

  it("the production registry (empty) resolves nothing — every activity URL fails closed", () => {
    expect(getThingsActivityBySlug("rome", "vatican-museums-guided-tour")).toBeNull();
    expect(getThingsActivityBySlug("rome", "anything")).toBeNull();
    expect(getThingsActivityBySlug("not-a-city", "anything")).toBeNull();
  });

  it("malformed or empty input resolves null", () => {
    expect(getThingsActivityBySlug("", "x", extended)).toBeNull();
    expect(getThingsActivityBySlug("rome", "", extended)).toBeNull();
    expect(getThingsActivityBySlug(null, null)).toBeNull();
    expect(getThingsActivityBySlug("rome/extra", "x", extended)).toBeNull();
  });
});

// ── Source boundary: no fixture / provider-catalogue leakage ──

describe("Things activity identity — source boundaries", () => {
  it("the canonical registry source imports nothing from __fixtures__", () => {
    const src = readRoot("src/data/thingsActivities.ts");
    expect(src).not.toMatch(/from\s+["'][^"']*__fixtures__/);
  });

  it("the identity model source imports nothing from __fixtures__", () => {
    const src = readRoot("src/types/thingsActivity.ts");
    expect(src).not.toMatch(/from\s+["'][^"']*__fixtures__/);
  });

  it("the resolvers/URL source imports nothing from __fixtures__", () => {
    const src = readRoot("src/lib/thingsActivities.ts");
    expect(src).not.toMatch(/from\s+["'][^"']*__fixtures__/);
  });

  it("the canonical registry does not hardcode provider product IDs", () => {
    const src = readRoot("src/data/thingsActivities.ts");
    expect(src).not.toMatch(/3731VATICAN|provider_product|productCode/i);
  });

  it("every identity slug matches the URL contract", () => {
    for (const activity of getAllThingsActivities()) {
      expect(THINGS_ACTIVITY_SLUG_RE.test(activity.slug)).toBe(true);
      expect(THINGS_ACTIVITY_SLUG_RE.test(activity.destinationSlug)).toBe(true);
    }
  });
});
