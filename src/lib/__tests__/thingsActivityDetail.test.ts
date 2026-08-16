/**
 * Things V2 (T2D-B1) — activity-detail presentation helpers.
 *
 * Locks the "absence is better than invention" rules:
 *   - facts render only when EVERY offer genuinely reports them true
 *   - rating / price / description summaries only from a SINGLE genuine offer
 *   - provider CTA only with a validated http(s) providerUrl
 *   - neutral offer ordering (never best/cheapest/recommended)
 *   - no price label when the price is not genuinely known
 */
import { describe, it, expect } from "vitest";
import {
  formatActivityPrice,
  getActivityLevelFacts,
  getActivityPriceSummary,
  getActivityRatingSummary,
  getOfferPriceLabel,
  getSingleOfferDescription,
  isValidProviderUrl,
  providerDisplayName,
  sortOffersNeutrally,
  THINGS_ACTIVITY_FACT_LABELS,
} from "@/lib/thingsActivityDetail";
import type {
  ThingsActivityOfferDetail,
  ThingsActivityDetailDestination,
} from "@/types/thingsActivityDetail";

function makeOffer(
  overrides?: Partial<ThingsActivityOfferDetail>,
): ThingsActivityOfferDetail {
  return {
    activityId: "act-1",
    provider: "viator",
    providerProductId: "V1",
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
    ...overrides,
  };
}

describe("getActivityLevelFacts — claims only genuinely known facts", () => {
  it("Q. single offer: renders that offer's known-true facts", () => {
    const offers = [
      makeOffer({ freeCancellation: true, skipLine: null, wheelchairAccessible: false }),
    ];
    expect(getActivityLevelFacts(offers)).toEqual(["freeCancellation"]);
  });

  it("Q. unknown cancellation (null) is never claimed", () => {
    expect(getActivityLevelFacts([makeOffer({ freeCancellation: null })])).toEqual([]);
  });

  it("explicitly false facts are never claimed", () => {
    expect(getActivityLevelFacts([makeOffer({ freeCancellation: false })])).toEqual([]);
  });

  it("multiple offers: only facts EVERY offer reports true render", () => {
    const offers = [
      makeOffer({ provider: "viator", freeCancellation: true, skipLine: true, smartphoneTicket: null }),
      makeOffer({ provider: "tiqets", freeCancellation: true, skipLine: null, smartphoneTicket: true }),
    ];
    // skipLine is unknown on one offer -> not an activity-level claim.
    expect(getActivityLevelFacts(offers)).toEqual(["freeCancellation"]);
  });

  it("empty offers yield no facts", () => {
    expect(getActivityLevelFacts([])).toEqual([]);
  });

  it("labels cover every fact key", () => {
    expect(THINGS_ACTIVITY_FACT_LABELS.freeCancellation).toBe("Free cancellation");
    expect(THINGS_ACTIVITY_FACT_LABELS.skipLine).toBe("Skip the line");
    expect(THINGS_ACTIVITY_FACT_LABELS.smartphoneTicket).toBe("Mobile ticket");
    expect(THINGS_ACTIVITY_FACT_LABELS.instantConfirmation).toBe("Instant confirmation");
    expect(THINGS_ACTIVITY_FACT_LABELS.wheelchairAccessible).toBe("Wheelchair accessible");
  });
});

describe("getActivityRatingSummary — rating/reviews only when genuine", () => {
  it("O. single offer with genuine rating + reviewCount yields a summary", () => {
    const offers = [makeOffer({ rating: 4.8, reviewCount: 1243 })];
    expect(getActivityRatingSummary(offers)).toEqual({ rating: 4.8, reviewCount: 1243 });
  });

  it("O. no genuine values yield no summary", () => {
    expect(getActivityRatingSummary([makeOffer()])).toBeNull();
  });

  it("O. partial values (rating without reviewCount) yield no summary", () => {
    expect(getActivityRatingSummary([makeOffer({ rating: 4.8, reviewCount: null })])).toBeNull();
  });

  it("O. ambiguous multiple offers yield no summary", () => {
    const offers = [
      makeOffer({ provider: "viator", rating: 4.8, reviewCount: 100 }),
      makeOffer({ provider: "tiqets", rating: 4.5, reviewCount: 200 }),
    ];
    expect(getActivityRatingSummary(offers)).toBeNull();
  });
});

describe("getActivityPriceSummary / price labels — never fabricated", () => {
  it("N. single offer with genuine price + currency yields a summary", () => {
    const offers = [makeOffer({ price: 59, currency: "AUD" })];
    expect(getActivityPriceSummary(offers)).toEqual({ price: 59, currency: "AUD" });
  });

  it("N. no genuine price yields no summary and no label", () => {
    const offer = makeOffer({ price: null, currency: null });
    expect(getActivityPriceSummary([offer])).toBeNull();
    expect(getOfferPriceLabel(offer)).toBeNull();
  });

  it("N. ambiguous multiple offers yield no activity-level price summary", () => {
    const offers = [
      makeOffer({ provider: "viator", price: 59, currency: "AUD" }),
      makeOffer({ provider: "tiqets", price: 45, currency: "AUD" }),
    ];
    expect(getActivityPriceSummary(offers)).toBeNull();
  });

  it("per-offer price label renders only from that offer's genuine values", () => {
    // Currency output depends on the host ICU (A$59 in a full-ICU browser,
    // $59 in a minimal-ICU Node) — the contract is that a genuine price
    // yields a non-null formatted label containing the value.
    const label = getOfferPriceLabel(makeOffer({ price: 59, currency: "AUD" }));
    expect(label).not.toBeNull();
    expect(label).toMatch(/59/);
    expect(getOfferPriceLabel(makeOffer({ price: null, currency: "AUD" }))).toBeNull();
  });

  it("formatActivityPrice handles non-numeric input as unknown", () => {
    expect(formatActivityPrice(null, "AUD")).toBeNull();
    expect(formatActivityPrice(Number.NaN, "AUD")).toBeNull();
    expect(formatActivityPrice(undefined, "AUD")).toBeNull();
  });
});

describe("getSingleOfferDescription — attributed, single genuine source only", () => {
  it("renders the description from the single offer that has one", () => {
    const offers = [makeOffer({ provider: "tiqets", description: "  A real description.  " })];
    expect(getSingleOfferDescription(offers)).toEqual({
      description: "A real description.",
      provider: "tiqets",
    });
  });

  it("omits the section when no offer has a description", () => {
    expect(getSingleOfferDescription([makeOffer()])).toBeNull();
  });

  it("omits the section when multiple offers have different descriptions (ambiguous)", () => {
    const offers = [
      makeOffer({ provider: "viator", description: "Viator copy" }),
      makeOffer({ provider: "tiqets", description: "Tiqets copy" }),
    ];
    expect(getSingleOfferDescription(offers)).toBeNull();
  });
});

describe("isValidProviderUrl — CTA gate", () => {
  it("accepts http(s) checkout URLs", () => {
    expect(isValidProviderUrl("https://www.viator.com/tours/Rome/thing")).toBe(true);
    expect(isValidProviderUrl("http://localhost:3000/checkout")).toBe(true);
  });

  it("J/K. rejects missing, malformed and non-http(s) URLs", () => {
    expect(isValidProviderUrl(null)).toBe(false);
    expect(isValidProviderUrl(undefined)).toBe(false);
    expect(isValidProviderUrl("")).toBe(false);
    expect(isValidProviderUrl("javascript:alert(1)")).toBe(false);
    expect(isValidProviderUrl("ftp://example.com/x")).toBe(false);
    expect(isValidProviderUrl("not-a-url")).toBe(false);
  });
});

describe("sortOffersNeutrally — neutral, stable ordering", () => {
  it("R. orders by provider name then product ID (never best/cheapest/recommended)", () => {
    const offers = [
      makeOffer({ provider: "tiqets", providerProductId: "T2" }),
      makeOffer({ provider: "viator", providerProductId: "V1" }),
      makeOffer({ provider: "tiqets", providerProductId: "T1" }),
    ];
    const sorted = sortOffersNeutrally(offers);
    expect(sorted.map((o) => `${o.provider}:${o.providerProductId}`)).toEqual([
      "tiqets:T1",
      "tiqets:T2",
      "viator:V1",
    ]);
  });

  it("does not mutate the input array", () => {
    const offers = [makeOffer({ provider: "tiqets" }), makeOffer({ provider: "viator" })];
    sortOffersNeutrally(offers);
    expect(offers[0].provider).toBe("tiqets");
  });
});

describe("providerDisplayName", () => {
  it("M. maps known providers to customer-visible names", () => {
    expect(providerDisplayName("viator")).toBe("Viator");
    expect(providerDisplayName("tiqets")).toBe("Tiqets");
  });

  it("falls back to the raw key for unknown providers", () => {
    expect(providerDisplayName("other")).toBe("other");
  });
});

describe("ThingsActivityDetailDestination type shape", () => {
  it("carries only canonical destination summary fields", () => {
    const destination: ThingsActivityDetailDestination = {
      slug: "rome",
      displayName: "Rome",
      countryName: "Italy",
    };
    expect(destination.slug).toBe("rome");
    expect(destination).not.toHaveProperty("providerRefs");
  });
});
