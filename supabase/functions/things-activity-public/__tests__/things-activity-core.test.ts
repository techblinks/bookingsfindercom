/**
 * things-activity-public core — resolver contract tests (T2D-B1).
 *
 * The Edge Function runs in Deno; this repo has no Deno runner wired into
 * vitest, so — following the sitemap-core convention — the pure core module
 * (no Deno globals, no remote imports) is imported directly and locked here.
 *
 * Covers:
 *   - strict input validation (W: invalid slug → 400 path)
 *   - archived fail-closed (Y)
 *   - public payload builders expose ONLY public-safe fields (X)
 *   - not-found response contract (V)
 *   - neutral offer ordering
 */
import { describe, it, expect } from "vitest";
import {
  buildNotFoundBody,
  buildPublicActivityPayload,
  buildPublicOfferPayload,
  buildResolvedBody,
  isArchivedStatus,
  MAX_ACTIVITY_SLUG_LENGTH,
  sortOffersByProvider,
  THINGS_ACTIVITY_SLUG_RE,
  validateResolveInput,
} from "../things-activity-core.ts";

describe("validateResolveInput — strict slug validation", () => {
  it("accepts the canonical exact-slug contract", () => {
    const result = validateResolveInput("rome", "vatican-museums-sistine-chapel-guided-tour");
    expect(result).toEqual({
      ok: true,
      destinationSlug: "rome",
      activitySlug: "vatican-museums-sistine-chapel-guided-tour",
    });
  });

  it("normalises case and surrounding whitespace", () => {
    const result = validateResolveInput("  Rome ", "  COLOSSEUM-TOUR  ");
    expect(result).toEqual({ ok: true, destinationSlug: "rome", activitySlug: "colosseum-tour" });
  });

  it("W. rejects missing or non-string input", () => {
    expect(validateResolveInput(undefined, "x").ok).toBe(false);
    expect(validateResolveInput("rome", undefined).ok).toBe(false);
    expect(validateResolveInput(null, "x").ok).toBe(false);
    expect(validateResolveInput("rome", 42).ok).toBe(false);
    expect(validateResolveInput("", "x").ok).toBe(false);
    expect(validateResolveInput("rome", "").ok).toBe(false);
    expect(validateResolveInput("   ", "x").ok).toBe(false);
  });

  it("W. rejects slugs that violate the lowercase hyphen-separated contract", () => {
    expect(validateResolveInput("Rome Capital", "x").ok).toBe(false);
    expect(validateResolveInput("rome", "Vatican Museums").ok).toBe(false);
    expect(validateResolveInput("rome", "vatican_museums").ok).toBe(false);
    expect(validateResolveInput("rome", "trailing-").ok).toBe(false);
    expect(validateResolveInput("rome", "-leading").ok).toBe(false);
    expect(validateResolveInput("rome", "double--hyphen").ok).toBe(false);
    expect(validateResolveInput("rome", "café-tour").ok).toBe(false);
  });

  it("W. rejects over-length slugs", () => {
    expect(validateResolveInput("rome", "a".repeat(MAX_ACTIVITY_SLUG_LENGTH + 1)).ok).toBe(false);
    expect(validateResolveInput("r".repeat(MAX_ACTIVITY_SLUG_LENGTH + 1), "x").ok).toBe(false);
  });

  it("normalises case but never invents identity (resolution is the real gate)", () => {
    // A provider product ID with uppercase letters normalises to a valid
    // lowercase slug — syntax is not existence. The database resolution is
    // the gate: a slug that isn't in things_activities fails closed to 404.
    const result = validateResolveInput("rome", "3731VATICAN");
    expect(result).toEqual({ ok: true, destinationSlug: "rome", activitySlug: "3731vatican" });
    // Provider IDs containing characters outside the slug contract fail syntax.
    expect(validateResolveInput("rome", "3731_VATICAN").ok).toBe(false);
    expect(validateResolveInput("rome", "viator:3731").ok).toBe(false);
  });
});

describe("slug contract parity with the canonical registry", () => {
  it("the resolver enforces the same regex contract as the registry", () => {
    expect(THINGS_ACTIVITY_SLUG_RE.source).toBe("^[a-z0-9]+(?:-[a-z0-9]+)*$");
    expect(THINGS_ACTIVITY_SLUG_RE.test("vatican-museums-guided-tour")).toBe(true);
    expect(THINGS_ACTIVITY_SLUG_RE.test("a")).toBe(true);
    expect(THINGS_ACTIVITY_SLUG_RE.test("a-b-c-1")).toBe(true);
  });
});

describe("isArchivedStatus — fail closed", () => {
  it("Y. archived activities fail closed", () => {
    expect(isArchivedStatus("archived")).toBe(true);
  });

  it("draft and published are not archived", () => {
    expect(isArchivedStatus("draft")).toBe(false);
    expect(isArchivedStatus("published")).toBe(false);
    expect(isArchivedStatus(null)).toBe(false);
    expect(isArchivedStatus(undefined)).toBe(false);
  });
});

describe("buildPublicActivityPayload — public-safe fields only", () => {
  const row = {
    id: "a1b2c3d4-0000-4000-8000-000000000001",
    destination_slug: "rome",
    slug: "vatican-museums-guided-tour",
    canonical_title: "Vatican Museums Guided Tour",
    publication_status: "draft",
    verification: { evidence: "provider-catalog" },
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
    internal_secret_column: "should-never-leak",
  };

  it("maps canonical identity fields", () => {
    expect(buildPublicActivityPayload(row)).toEqual({
      id: "a1b2c3d4-0000-4000-8000-000000000001",
      destinationSlug: "rome",
      slug: "vatican-museums-guided-tour",
      canonicalTitle: "Vatican Museums Guided Tour",
      publicationStatus: "draft",
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
    });
  });

  it("X. never exposes internal fields (verification, unknown columns)", () => {
    const payload = buildPublicActivityPayload(row)!;
    expect(payload).not.toHaveProperty("verification");
    expect(payload).not.toHaveProperty("internal_secret_column");
    expect(JSON.stringify(payload)).not.toContain("provider-catalog");
  });

  it("fails safe on a malformed row", () => {
    expect(buildPublicActivityPayload(null)).toBeNull();
    expect(buildPublicActivityPayload({})).toBeNull();
    expect(buildPublicActivityPayload({ id: 1, destination_slug: "rome" })).toBeNull();
  });
});

describe("buildPublicOfferPayload — optional truthful enrichment", () => {
  const offerRow = {
    id: "offer-1",
    activity_id: "a1b2c3d4-0000-4000-8000-000000000001",
    provider: "viator",
    provider_product_id: "3731VATICAN",
    provider_url: "https://www.viator.com/tours/Rome/example",
    created_at: "2026-08-16T00:00:00.000Z",
    updated_at: "2026-08-16T00:00:00.000Z",
  };

  it("maps offer identity without enrichment (all display fields null)", () => {
    const payload = buildPublicOfferPayload(offerRow, null)!;
    expect(payload).toEqual({
      activityId: "a1b2c3d4-0000-4000-8000-000000000001",
      provider: "viator",
      providerProductId: "3731VATICAN",
      providerUrl: "https://www.viator.com/tours/Rome/example",
      createdAt: "2026-08-16T00:00:00.000Z",
      updatedAt: "2026-08-16T00:00:00.000Z",
      title: null,
      description: null,
      tagline: null,
      imageUrl: null,
      imageAlt: null,
      imageCredit: null,
      rating: null,
      reviewCount: null,
      price: null,
      currency: null,
      freeCancellation: null,
      skipLine: null,
      smartphoneTicket: null,
      instantConfirmation: null,
      wheelchairAccessible: null,
      duration: null,
      meetingPoint: null,
      availabilityState: null,
      lastVerifiedAt: null,
      fetchedAt: null,
    });
  });

  it("maps genuine enrichment values from the provider cache", () => {
    const enrichment = {
      title: "Vatican Museums Guided Tour",
      description: "Skip-the-line tour of the Vatican Museums.",
      image_url: "https://img.example/vatican.jpg",
      rating: 4.8,
      review_count: 1243,
      price_amount: 59,
      price_currency: "AUD",
      wheelchair_accessible: true,
      skip_the_line: true,
      provider_updated_at: "2026-08-10T00:00:00.000Z",
      last_seen_at: "2026-08-16T00:00:00.000Z",
    };
    const payload = buildPublicOfferPayload(offerRow, enrichment)!;
    expect(payload.title).toBe("Vatican Museums Guided Tour");
    expect(payload.description).toBe("Skip-the-line tour of the Vatican Museums.");
    expect(payload.imageUrl).toBe("https://img.example/vatican.jpg");
    expect(payload.rating).toBe(4.8);
    expect(payload.reviewCount).toBe(1243);
    expect(payload.price).toBe(59);
    expect(payload.currency).toBe("AUD");
    expect(payload.wheelchairAccessible).toBe(true);
    expect(payload.skipLine).toBe(true);
    expect(payload.lastVerifiedAt).toBe("2026-08-10T00:00:00.000Z");
    expect(payload.fetchedAt).toBe("2026-08-16T00:00:00.000Z");
  });

  it("does not invent values when enrichment is empty", () => {
    const payload = buildPublicOfferPayload(offerRow, {})!;
    expect(payload.title).toBeNull();
    expect(payload.rating).toBeNull();
    expect(payload.price).toBeNull();
  });

  it("drops non-http(s) provider URLs (defense in depth)", () => {
    const payload = buildPublicOfferPayload(
      { ...offerRow, provider_url: "javascript:alert(1)" },
      null,
    )!;
    expect(payload.providerUrl).toBeNull();
  });

  it("fails safe on a malformed offer row", () => {
    expect(buildPublicOfferPayload(null, {})).toBeNull();
    expect(buildPublicOfferPayload({ provider: "viator" }, {})).toBeNull();
  });
});

describe("response body builders", () => {
  it("V. not-found body is the fail-closed contract", () => {
    expect(buildNotFoundBody()).toEqual({ status: "not_found" });
  });

  it("resolved body carries status, activity and offers", () => {
    const activity = buildPublicActivityPayload({
      id: "id-1",
      destination_slug: "rome",
      slug: "colosseum-tour",
      canonical_title: "Colosseum Tour",
      publication_status: "draft",
      created_at: "2026-08-16T00:00:00.000Z",
      updated_at: "2026-08-16T00:00:00.000Z",
    })!;
    const body = buildResolvedBody(activity, []);
    expect(body).toEqual({ status: "available", activity, offers: [] });
    expect(JSON.stringify(body)).not.toContain("service_role");
  });
});

describe("sortOffersByProvider — deterministic neutral order", () => {
  it("orders by provider name then product ID", () => {
    const offers = [
      { provider: "tiqets", providerProductId: "T2", activity_id: "a" },
      { provider: "viator", providerProductId: "V1", activity_id: "a" },
      { provider: "tiqets", providerProductId: "T1", activity_id: "a" },
    ];
    const sorted = sortOffersByProvider(offers);
    expect(sorted.map((o) => o.providerProductId)).toEqual(["T1", "T2", "V1"]);
  });
});
