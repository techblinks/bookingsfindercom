/**
 * Provider request-contract tests for the Things aggregator.
 *
 * Covers two generations of contract:
 *
 *  1. The Viator pageSize boundary (original regression): the Things page sends
 *     PAGE_SIZE 24 into the shared filters, Tiqets consumes that as its own
 *     page_size, but viator-public's Zod search schema accepts pageSize only in
 *     [1, 20]. The Viator adapter must bound the value before it leaves the
 *     browser.
 *
 *  2. T3B-INT-PB2B provider identity and customer honesty: the canonical Rome
 *     search must express its Tiqets identity as city_id 71631 (never 511) and
 *     its Viator identity as destinationId 511 (never 71631), and no request
 *     may carry a filter the repaired provider contract silently ignores.
 *
 * These tests exercise the real searchExperiences adapter (with the supabase
 * client mocked) and inspect the request bodies it actually sends to the
 * Edge Functions - observable behaviour, not implementation text.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { searchExperiences } from "@/services/experiences";

const { invokeMock } = vi.hoisted(() => ({ invokeMock: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: {
      invoke: invokeMock,
    },
  },
}));

interface CapturedCall {
  fn: string;
  body: Record<string, unknown>;
}

function capturedBodies(): CapturedCall[] {
  return invokeMock.mock.calls.map((call) => {
    const args = call as unknown as [string, { body?: Record<string, unknown> }];
    return { fn: args[0], body: args[1]?.body ?? {} };
  });
}

const viatorCalls = (): CapturedCall[] =>
  capturedBodies().filter((c) => c.fn === "viator-public");

const tiqetsCalls = (): CapturedCall[] =>
  capturedBodies().filter((c) => c.fn === "tiqets-public");

/** The canonical Rome route's provider identities, exactly as the page derives them. */
const ROME_PROVIDER_IDS = { tiqets: 71631, viator: 511 };

beforeEach(() => {
  invokeMock.mockReset();
  invokeMock.mockImplementation(async (fn: string) => {
    if (fn === "tiqets-public") return { data: { products: [] } };
    if (fn === "viator-public")
      return { data: { products: [], status: "available" } };
    return { data: null, error: new Error("unexpected function: " + fn) };
  });
});

describe("Viator pageSize adapter boundary", () => {
  it("A. Things page/filter pageSize 24 is capped to 20 in the Viator request", async () => {
    await searchExperiences({
      destination: "Rome",
      providerDestinationIds: ROME_PROVIDER_IDS,
      page: 1,
      pageSize: 24,
    });

    const viator = viatorCalls();
    expect(viator).toHaveLength(1);
    expect(viator[0].body.pageSize).toBe(20);
  });

  it("B. Tiqets request still receives page_size 24", async () => {
    await searchExperiences({ destination: "Rome", pageSize: 24 });

    const tiqets = tiqetsCalls();
    expect(tiqets).toHaveLength(1);
    expect(tiqets[0].body.page_size).toBe(24);
  });

  it("C. Viator pageSize 10 remains 10", async () => {
    await searchExperiences({ pageSize: 10 });
    expect(viatorCalls()[0].body.pageSize).toBe(10);
  });

  it("D. Viator pageSize 20 remains 20", async () => {
    await searchExperiences({ pageSize: 20 });
    expect(viatorCalls()[0].body.pageSize).toBe(20);
  });

  it("E. Viator pageSize above 20 is capped to 20", async () => {
    await searchExperiences({ pageSize: 100 });
    expect(viatorCalls()[0].body.pageSize).toBe(20);
  });

  it("undefined pageSize keeps the safe 10 default", async () => {
    await searchExperiences({});
    expect(viatorCalls()[0].body.pageSize).toBe(10);
  });

  it("F. Rome destinationId 511 remains unchanged", async () => {
    await searchExperiences({
      destination: "Rome",
      providerDestinationIds: ROME_PROVIDER_IDS,
      pageSize: 24,
    });
    expect(viatorCalls()[0].body.destinationId).toBe(511);
  });

  it("H. no Viator request ever uses pageSize 24", async () => {
    await searchExperiences({ pageSize: 24 });
    await searchExperiences({ pageSize: 10 });
    await searchExperiences({ pageSize: 20 });
    await searchExperiences({ pageSize: 100 });
    await searchExperiences({});

    const bodies = viatorCalls().map((c) => c.body.pageSize);
    expect(bodies).not.toContain(24);
    for (const n of bodies) {
      expect(typeof n).toBe("number");
      expect(n as number).toBeGreaterThanOrEqual(1);
      expect(n as number).toBeLessThanOrEqual(20);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// PB2B — canonical Rome provider identity
// ═══════════════════════════════════════════════════════════════

describe("PB2B — canonical Rome provider identity", () => {
  const searchRome = () =>
    searchExperiences({
      destination: "Rome",
      providerDestinationIds: ROME_PROVIDER_IDS,
      page: 1,
      pageSize: 24,
    });

  it("K. canonical Rome sends Tiqets city_id 71631", async () => {
    await searchRome();

    const tiqets = tiqetsCalls();
    expect(tiqets).toHaveLength(1);
    expect(tiqets[0].body.action).toBe("search");
    expect(tiqets[0].body.city_id).toBe(71631);
  });

  it("L. canonical Rome omits city_name — the proven ID is the identity", async () => {
    await searchRome();

    const body = tiqetsCalls()[0].body;
    expect(body.city_name).toBeUndefined();
    // Not merely falsy: the key must carry no free-text city at all.
    expect(Object.values(body)).not.toContain("Rome");
  });

  it("M. canonical Rome sends Viator destinationId 511 and nothing else as its ID", async () => {
    await searchRome();

    const viator = viatorCalls();
    expect(viator).toHaveLength(1);
    expect(viator[0].body.destinationId).toBe(511);
  });

  it("N. Tiqets never receives the Viator ID 511 as its city ID", async () => {
    await searchRome();

    const body = tiqetsCalls()[0].body;
    expect(body.city_id).not.toBe(511);
    expect(body.city_name).not.toBe("511");
  });

  it("O. Viator never receives the Tiqets city ID 71631", async () => {
    await searchRome();

    const body = viatorCalls()[0].body;
    expect(body.destinationId).not.toBe(71631);
    expect(Object.values(body)).not.toContain(71631);
  });

  it("a Tiqets-only identity leaves the Viator destinationId absent", async () => {
    await searchExperiences({ providerDestinationIds: { tiqets: 71631 }, pageSize: 24 });

    expect(tiqetsCalls()[0].body.city_id).toBe(71631);
    expect(viatorCalls()[0].body.destinationId).toBeUndefined();
  });

  it("a Viator-only identity leaves the Tiqets city_id absent", async () => {
    await searchExperiences({ destination: "Rome", providerDestinationIds: { viator: 511 }, pageSize: 24 });

    expect(viatorCalls()[0].body.destinationId).toBe(511);
    expect(tiqetsCalls()[0].body.city_id).toBeUndefined();
    // With no verified Tiqets ID, the free-text city is still the identity.
    expect(tiqetsCalls()[0].body.city_name).toBe("Rome");
  });

  it("a verified city ID alone is enough to be a search, not a featured request", async () => {
    await searchExperiences({ providerDestinationIds: { tiqets: 71631 }, pageSize: 24 });

    expect(tiqetsCalls()[0].body.action).toBe("search");
  });

  it("the canonical query still reaches Tiqets alongside the city ID", async () => {
    await searchExperiences({
      destination: "Rome",
      providerDestinationIds: ROME_PROVIDER_IDS,
      query: "colosseum",
      pageSize: 24,
    });

    const body = tiqetsCalls()[0].body;
    expect(body.query).toBe("colosseum");
    expect(body.city_id).toBe(71631);
    expect(body.city_name).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════
// PB2B — legacy hub free text and different-city escape
// ═══════════════════════════════════════════════════════════════

describe("PB2B — legacy hub and non-canonical searches", () => {
  it("P. a legacy hub free-text city still searches Tiqets by city_name", async () => {
    await searchExperiences({ destination: "Rome", pageSize: 24 });

    const body = tiqetsCalls()[0].body;
    expect(body.city_name).toBe("Rome");
    expect(body.city_id).toBeUndefined();
  });

  it("P. an arbitrary hub city is free text, never an invented city ID", async () => {
    await searchExperiences({ destination: "Valmontone", pageSize: 24 });

    const body = tiqetsCalls()[0].body;
    expect(body.city_name).toBe("Valmontone");
    expect(body.city_id).toBeUndefined();
  });

  it("Q. escaping Rome to another city retains neither Rome provider ID", async () => {
    // The page drops providerDestinationIds the moment the committed city
    // stops matching the canonical route; this is that request.
    await searchExperiences({ destination: "Paris", pageSize: 24 });

    expect(tiqetsCalls()[0].body.city_id).toBeUndefined();
    expect(tiqetsCalls()[0].body.city_name).toBe("Paris");
    expect(viatorCalls()[0].body.destinationId).toBeUndefined();
  });

  it("Q. no request for another city ever carries 71631 or 511", async () => {
    await searchExperiences({ destination: "Paris", pageSize: 24 });

    for (const call of capturedBodies()) {
      expect(Object.values(call.body)).not.toContain(71631);
      expect(Object.values(call.body)).not.toContain(511);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// PB2B — customer honesty: unsupported filters are never sent
// ═══════════════════════════════════════════════════════════════

describe("PB2B — unsupported provider filters are never sent", () => {
  /** Every param PB2A proved tiqets-public does not forward upstream. */
  const UNSUPPORTED_TIQETS_PARAMS = [
    "price_min",
    "price_max",
    "skip_line",
    "wheelchair_access",
    "sort",
    "ordering",
  ];

  beforeEach(async () => {
    await searchExperiences({
      destination: "Rome",
      providerDestinationIds: ROME_PROVIDER_IDS,
      query: "colosseum",
      activityTags: ["Museums"],
      minRating: 4,
      page: 2,
      pageSize: 24,
    });
  });

  it("S. no price bound is sent to Tiqets", () => {
    const body = tiqetsCalls()[0].body;
    expect(body).not.toHaveProperty("price_min");
    expect(body).not.toHaveProperty("price_max");
  });

  it("T. no skip-the-line filter is sent to Tiqets", () => {
    expect(tiqetsCalls()[0].body).not.toHaveProperty("skip_line");
  });

  it("U. no wheelchair/accessibility filter is sent to Tiqets", () => {
    expect(tiqetsCalls()[0].body).not.toHaveProperty("wheelchair_access");
  });

  it("V. no sort is sent to either provider", () => {
    expect(tiqetsCalls()[0].body).not.toHaveProperty("sort");
    expect(viatorCalls()[0].body.sort).toBeUndefined();
  });

  it("25. the Tiqets body carries ONLY parameters the repaired contract forwards", () => {
    const body = tiqetsCalls()[0].body;
    for (const param of UNSUPPORTED_TIQETS_PARAMS) {
      expect(body, `tiqets-public must not receive ${param}`).not.toHaveProperty(param);
    }
    // Nothing beyond the proven contract may appear at all.
    const allowed = new Set([
      "action",
      "query",
      "city_id",
      "city_name",
      "page",
      "page_size",
      "min_rating",
    ]);
    for (const key of Object.keys(body)) {
      expect(allowed.has(key), `unexpected tiqets-public param "${key}"`).toBe(true);
    }
  });

  it("X. min_rating IS still forwarded — it is genuinely supported", () => {
    expect(tiqetsCalls()[0].body.min_rating).toBe(4);
  });

  it("supported pagination and free text survive unchanged", () => {
    const body = tiqetsCalls()[0].body;
    expect(body.page).toBe(2);
    expect(body.page_size).toBe(24);
    expect(body.query).toBe("colosseum");
  });
});

// ═══════════════════════════════════════════════════════════════
// PB2B — Tiqets normalized location adapter
// ═══════════════════════════════════════════════════════════════

describe("PB2B — Tiqets top-level location metadata", () => {
  /** A product in the shape tiqets-public's normalizer genuinely returns. */
  const romeProduct = (overrides: Record<string, unknown> = {}) => ({
    id: "1111450",
    title: "Colosseum guided tour",
    city: "Rome",
    cityId: 71631,
    country: "Italy",
    countryId: 105,
    saleStatus: "available",
    rating: { average: 4.6, count: 120 },
    minPrice: { amount: 42, currency: "AUD" },
    image: { url: "https://aws-tiqets-cdn.imgix.net/x.jpg", altText: null, credit: null },
    productUrl: "https://www.tiqets.com/en/x",
    ...overrides,
  });

  const searchWithProducts = async (products: Array<Record<string, unknown>>) => {
    invokeMock.mockImplementation(async (fn: string) => {
      if (fn === "tiqets-public") return { data: { products, pagination: { count: 333 } } };
      if (fn === "viator-public") return { data: { products: [], status: "disabled" } };
      return { data: null, error: new Error("unexpected function: " + fn) };
    });
    return searchExperiences({
      destination: "Rome",
      providerDestinationIds: ROME_PROVIDER_IDS,
      pageSize: 24,
    });
  };

  it("R. top-level city, cityId and country adapt to the product model exactly", async () => {
    const result = await searchWithProducts([romeProduct()]);

    expect(result.products).toHaveLength(1);
    expect(result.products[0].city).toBe("Rome");
    expect(result.products[0].destinationId).toBe(71631);
    expect(result.products[0].country).toBe("Italy");
  });

  it("R. countryId is never promoted into destinationId", async () => {
    const result = await searchWithProducts([romeProduct({ cityId: null })]);

    // countryId 105 exists on the product, but a country is not a city.
    expect(result.products[0].destinationId).not.toBe(105);
    expect(result.products[0].destinationId).toBeNull();
  });

  it("R. missing location values stay null rather than being manufactured", async () => {
    const result = await searchWithProducts([
      romeProduct({ city: null, cityId: null, country: null }),
    ]);

    expect(result.products[0].city).toBeNull();
    expect(result.products[0].country).toBeNull();
    expect(result.products[0].destinationId).toBeNull();
  });

  it("R. the older nested destination/venue shape is still tolerated", async () => {
    const result = await searchWithProducts([
      {
        id: "9",
        title: "Legacy shape",
        destination: { id: 71631, name: "Rome", country: "Italy" },
        venue: { id: 1, name: "Colosseum", city: "Rome" },
        rating: { average: null, count: null },
        minPrice: { amount: null, currency: null },
      },
    ]);

    expect(result.products[0].city).toBe("Rome");
    expect(result.products[0].country).toBe("Italy");
    expect(result.products[0].destinationId).toBe(71631);
  });

  it("provider-reported feature facts still reach the product model", async () => {
    const result = await searchWithProducts([
      romeProduct({ skipTheLine: true, wheelchairAccessible: false }),
    ]);

    // A reported FACT survives even though it is no longer a search FILTER.
    expect(result.products[0].features.skipLine).toBe(true);
    expect(result.products[0].features.wheelchairAccessible).toBe(false);
  });

  it("the genuine upstream total is still surfaced", async () => {
    const result = await searchWithProducts([romeProduct()]);
    expect(result.totalCount).toBe(333);
  });
});
