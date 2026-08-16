/**
 * Things V2 (T2D-A) — canonical activity slug contract.
 *
 * Locks the slug utility: Unicode-safe normalisation, whitespace collapse,
 * lowercase, apostrophe removal, ampersand expansion, punctuation → hyphen,
 * deterministic output, bounded length, and the fail-closed "never an empty
 * canonical slug" rule. Also locks the deterministic collision strategy.
 */
import { describe, it, expect } from "vitest";
import {
  createActivitySlug,
  resolveAvailableActivitySlug,
  MAX_COLLISION_ATTEMPTS,
} from "@/lib/thingsActivitySlug";
import {
  MAX_ACTIVITY_SLUG_LENGTH,
  THINGS_ACTIVITY_SLUG_RE,
} from "@/data/thingsActivities";

describe("createActivitySlug — canonical title → canonical slug", () => {
  it("C. punctuation-heavy title slugifies cleanly", () => {
    expect(
      createActivitySlug(
        "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
      ),
    ).toBe("vatican-museums-sistine-chapel-and-st-peters-basilica-guided-tour");
  });

  it("colons and plus signs become hyphens, ampersands become 'and'", () => {
    expect(
      createActivitySlug("Colosseum: Arena Floor + Roman Forum & Palatine Hill"),
    ).toBe("colosseum-arena-floor-roman-forum-and-palatine-hill");
  });

  it("D. surrounding and inner whitespace is normalised", () => {
    expect(createActivitySlug("  Vatican   Museums  ")).toBe("vatican-museums");
    expect(createActivitySlug("  Vatican   Museums  ")).toBe(
      createActivitySlug("Vatican Museums"),
    );
  });

  it("E. apostrophes are removed, not turned into hyphens", () => {
    expect(createActivitySlug("St Peter's Basilica")).toBe("st-peters-basilica");
    expect(createActivitySlug("St Peter’s Basilica")).toBe("st-peters-basilica"); // typographic
  });

  it("F. ampersands expand to the word 'and'", () => {
    expect(createActivitySlug("Rome & Vatican")).toBe("rome-and-vatican");
    expect(createActivitySlug("Rome&Vatican")).toBe("rome-and-vatican");
  });

  it("em/en dashes and other punctuation collapse to single hyphens", () => {
    expect(createActivitySlug("Rome — Hop-on Hop-off Bus Tour")).toBe(
      "rome-hop-on-hop-off-bus-tour",
    );
    expect(createActivitySlug("Rome – Hop-on Hop-off Bus Tour")).toBe(
      "rome-hop-on-hop-off-bus-tour",
    );
  });

  it("G. Unicode / non-English titles do not crash", () => {
    // Decomposable accented letters normalise to ASCII.
    expect(createActivitySlug("Museo del Prado")).toBe("museo-del-prado");
    expect(createActivitySlug("São Paulo")).toBe("sao-paulo");
    // Pure non-Latin text yields NO slug (null) rather than crashing.
    expect(createActivitySlug("博物馆导览")).toBeNull();
    // Mixed text keeps whatever Latin identity exists.
    expect(createActivitySlug("Colosseum 罗马")).toBe("colosseum");
  });

  it("H. output is deterministic", () => {
    const title = "Colosseum: Arena Floor + Roman Forum & Palatine Hill";
    const first = createActivitySlug(title);
    for (let i = 0; i < 50; i += 1) {
      expect(createActivitySlug(title)).toBe(first);
    }
  });

  it("output always matches the slug URL contract", () => {
    for (const title of [
      "Vatican Museums, Sistine Chapel & St Peter's Basilica Guided Tour",
      "Colosseum: Arena Floor + Roman Forum & Palatine Hill",
      "Rome — Hop-on Hop-off Bus Tour",
      "São Paulo",
      "   big   whitespace   title   ",
    ]) {
      const slug = createActivitySlug(title);
      expect(slug).not.toBeNull();
      expect(THINGS_ACTIVITY_SLUG_RE.test(slug!)).toBe(true);
      expect(slug!.length).toBeLessThanOrEqual(MAX_ACTIVITY_SLUG_LENGTH);
    }
  });

  it("I. max-length behaviour truncates at a word boundary", () => {
    const long = "An Extremely Long Museum Tour Title With Many Words In It That Keeps Going And Going";
    const slug = createActivitySlug(long)!;
    expect(slug.length).toBeLessThanOrEqual(MAX_ACTIVITY_SLUG_LENGTH);
    // Truncated at a word boundary: no mid-word cut and no trailing hyphen.
    expect(slug.endsWith("-")).toBe(false);
    // The start of the slug survives intact.
    expect(slug.startsWith("an-extremely-long-museum-tour-title")).toBe(true);
  });

  it("I. a single over-long word is hard-capped without a trailing hyphen", () => {
    const oneWord = "x".repeat(200);
    const slug = createActivitySlug(oneWord)!;
    expect(slug).toBe("x".repeat(MAX_ACTIVITY_SLUG_LENGTH));
  });

  it("returns null for empty, whitespace-only and punctuation-only input", () => {
    expect(createActivitySlug("")).toBeNull();
    expect(createActivitySlug("   ")).toBeNull();
    expect(createActivitySlug("---...!!!")).toBeNull();
    expect(createActivitySlug(null)).toBeNull();
    expect(createActivitySlug(undefined)).toBeNull();
  });
});

describe("resolveAvailableActivitySlug — deterministic collision strategy", () => {
  const taken = (set: Set<string>) => (candidate: string) => set.has(candidate);

  it("returns the base slug when it is free", () => {
    expect(resolveAvailableActivitySlug("vatican-museums-guided-tour", () => false)).toBe(
      "vatican-museums-guided-tour",
    );
  });

  it("appends a stable numeric suffix when the base is taken", () => {
    const set = new Set(["vatican-museums-guided-tour"]);
    expect(resolveAvailableActivitySlug("vatican-museums-guided-tour", taken(set))).toBe(
      "vatican-museums-guided-tour-2",
    );
  });

  it("skips occupied suffixes deterministically", () => {
    const set = new Set([
      "vatican-museums-guided-tour",
      "vatican-museums-guided-tour-2",
      "vatican-museums-guided-tour-3",
    ]);
    expect(resolveAvailableActivitySlug("vatican-museums-guided-tour", taken(set))).toBe(
      "vatican-museums-guided-tour-4",
    );
  });

  it("the same registry state always chooses the same candidate", () => {
    const set = new Set(["a", "a-2", "a-3", "b"]);
    const first = resolveAvailableActivitySlug("a", taken(set));
    for (let i = 0; i < 20; i += 1) {
      expect(resolveAvailableActivitySlug("a", taken(set))).toBe(first);
    }
    expect(first).toBe("a-4");
  });

  it("collisions are scoped per destination — same base under a different destination is free", () => {
    // The helper is registry-agnostic; the DATABASE unique(destination_slug,
    // slug) constraint is what scopes it per destination. Here we just prove
    // the suffix never depends on a provider product ID.
    const set = new Set(["vatican-museums-guided-tour"]);
    expect(resolveAvailableActivitySlug("vatican-museums-guided-tour", taken(set))).toBe(
      "vatican-museums-guided-tour-2",
    );
  });

  it("J/K. the suffix is a counter, never a provider product ID", () => {
    const set = new Set(["colosseum-tour"]);
    const chosen = resolveAvailableActivitySlug("colosseum-tour", taken(set));
    expect(chosen).toBe("colosseum-tour-2");
    expect(chosen).not.toContain("3731VATICAN");
    expect(chosen).not.toContain("viator");
  });

  it("rejects malformed base slugs", () => {
    expect(() => resolveAvailableActivitySlug("Bad Slug", () => false)).toThrow();
    expect(() => resolveAvailableActivitySlug("", () => false)).toThrow();
  });

  it("throws rather than looping forever when every candidate is taken", () => {
    const allTaken = new Set(
      Array.from({ length: MAX_COLLISION_ATTEMPTS }, (_, i) =>
        i === 0 ? "base" : `base-${i + 1}`,
      ),
    );
    expect(() => resolveAvailableActivitySlug("base", taken(allTaken))).toThrow(
      /no free candidate/,
    );
  });
});
