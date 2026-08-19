/**
 * tiqets-catalog storage adapter — durable product row contract (T4A-P2).
 *
 * Behavioural tests: `catalogue-storage.ts` is imported and executed directly
 * (the repo's edge-function test convention), so the mapping is exercised for
 * real rather than string-matched. Source assertions appear only where a unit
 * test genuinely cannot observe the property — that the adapter contains no
 * client/network/environment access, and that P1's disabled refresh path has
 * not quietly been re-wired to it.
 *
 * These tests prove the TypeScript half of the storage contract. The SQL half
 * lives in `catalogue-storage-migration.test.ts`. Neither performs a database
 * write; no Postgres was executed for either.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync } from "fs";
import {
  toCatalogueProductRow,
  toCatalogueProductRows,
  CATALOGUE_ROW_COLUMNS,
  CATALOGUE_ROW_IDENTITY_COLUMNS,
  CATALOGUE_SNAPSHOT_OWNED_COLUMNS,
  CATALOGUE_ENRICHMENT_OWNED_COLUMNS,
  CATALOGUE_DATABASE_OWNED_COLUMNS,
  type CatalogueProductRow,
} from "../catalogue-storage.ts";
import {
  normalizeProduct,
  type NormalizedProduct,
} from "../../_shared/tiqets-normalizer.ts";

const storageSrc = readFileSync(
  "supabase/functions/tiqets-catalog/catalogue-storage.ts",
  "utf8",
);
const indexSrc = readFileSync("supabase/functions/tiqets-catalog/index.ts", "utf8");

/**
 * The adapter's executable source, comments stripped.
 *
 * Purity is a property of the CODE, not of the prose: the module documents the
 * very anti-patterns it must not perform ("never `JSON.stringify` a jsonb
 * array", "no `Deno.env`"), and a naive whole-file scan would flag its own
 * warnings. The adapter contains no string literal holding `//` or a block
 * comment marker, so this stripping is exact for this file.
 */
const storageCode = storageSrc
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/(^|[^:])\/\/.*$/gm, "$1");

/** Fixed observation instant — every row below is a pure function of it. */
const OBSERVED_AT = new Date("2026-08-19T10:30:00.000Z");
const OBSERVED_AT_ISO = "2026-08-19T10:30:00.000Z";

/** A complete, genuinely-shaped normalized product. Override per test. */
function product(overrides: Partial<NormalizedProduct> = {}): NormalizedProduct {
  return {
    id: "976543",
    title: "Colosseum Priority Entrance",
    tagline: "Skip the ticket line",
    description: "A long publication-quality description from somewhere else.",
    destination: { id: 266696, name: "Rome", country: "Italy" },
    venue: { id: 12, name: "Colosseum", city: "Rome" },
    saleStatus: "available",
    rating: { average: 4.7, count: 2100 },
    wheelchairAccessible: true,
    skipTheLine: true,
    tagIds: [1, 2, 3],
    smartphoneTicket: true,
    instantTicketDelivery: false,
    promoLabel: null,
    isPackage: false,
    duration: "2 hours",
    cancellation: "Free cancellation up to 24 hours before",
    productCheckoutUrl: "https://www.tiqets.com/checkout/976543",
    city: "Rome",
    country: "Italy",
    cityId: 266696,
    countryId: 380,
    minPrice: { amount: 18.5, currency: "EUR" },
    productUrl: "https://www.tiqets.com/en/rome-c66918/colosseum-p976543",
    image: {
      url: "https://aws-tiqets-cdn.imgix.net/images/content/abc.jpg?auto=format",
      altText: "The Colosseum at sunset",
      credit: "Photo by Someone",
    },
    ...overrides,
  };
}

/** Unwrap a result that must have succeeded. */
function row(p: NormalizedProduct, at: Date = OBSERVED_AT): CatalogueProductRow {
  const result = toCatalogueProductRow(p, at);
  if (!result.ok) throw new Error(`expected a valid row, got ${result.reason}`);
  return result.row;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ═══════════════════════════════════════════════════════════════
// A. A valid normalized product maps correctly
// ═══════════════════════════════════════════════════════════════

describe("A. valid normalized product → durable row", () => {
  it("maps every snapshot-owned field to its exact column value", () => {
    expect(row(product())).toEqual({
      provider_product_id: "976543",
      title: "Colosseum Priority Entrance",
      city_id: "266696",
      city_name: "Rome",
      country_id: "380",
      country_name: "Italy",
      tagline: "Skip the ticket line",
      venue_name: "Colosseum",
      rating: 4.7,
      review_count: 2100,
      price_amount: 18.5,
      price_currency: "EUR",
      image_url: "https://aws-tiqets-cdn.imgix.net/images/content/abc.jpg?auto=format",
      image_alt: "The Colosseum at sunset",
      image_credit: "Photo by Someone",
      tag_ids: [1, 2, 3],
      wheelchair_accessible: true,
      skip_the_line: true,
      smartphone_ticket: true,
      instant_ticket_delivery: false,
      duration: "2 hours",
      cancellation: "Free cancellation up to 24 hours before",
      product_url: "https://www.tiqets.com/en/rome-c66918/colosseum-p976543",
      product_checkout_url: "https://www.tiqets.com/checkout/976543",
      sale_status: "available",
      last_seen_at: OBSERVED_AT_ISO,
    });
  });

  it("emits exactly identity + snapshot-owned columns — no more, no less", () => {
    expect(Object.keys(row(product())).sort()).toEqual([...CATALOGUE_ROW_COLUMNS].sort());
    expect([...CATALOGUE_ROW_COLUMNS]).toEqual([
      ...CATALOGUE_ROW_IDENTITY_COLUMNS,
      ...CATALOGUE_SNAPSHOT_OWNED_COLUMNS,
    ]);
  });

  it("produces a JSON-safe row (survives a stringify/parse round trip)", () => {
    const mapped = row(product());
    expect(JSON.parse(JSON.stringify(mapped))).toEqual(mapped);
  });

  it("accepts a product built by the real normalizer, not just hand-written fixtures", () => {
    const normalized = normalizeProduct({
      id: "11223",
      title: "Vatican Museums",
      tag_ids: [7],
      price: { amount: 0, currency: "EUR" },
      product_url: "https://www.tiqets.com/en/vatican-p11223",
    });
    const mapped = row(normalized);
    expect(mapped.provider_product_id).toBe("11223");
    expect(mapped.title).toBe("Vatican Museums");
    expect(mapped.tag_ids).toEqual([7]);
    expect(mapped.price_amount).toBe(0);
  });
});

// ═══════════════════════════════════════════════════════════════
// B. Provider identity preserved exactly
// ═══════════════════════════════════════════════════════════════

describe("B. provider product identity", () => {
  it("preserves the provider product ID verbatim", () => {
    for (const id of ["976543", "abc-DEF_123", "0", "00042", "p976543"]) {
      expect(row(product({ id })).provider_product_id).toBe(id);
    }
  });

  it("never derives identity from the title, slug or URL", () => {
    const mapped = row(product({ id: "976543", title: "Colosseum Priority Entrance" }));
    expect(mapped.provider_product_id).toBe("976543");
    expect(mapped).not.toHaveProperty("slug");
    expect(mapped).not.toHaveProperty("provider");
  });

  it("does not carry `provider` in the row — it is the RPC's own argument", () => {
    expect(Object.keys(row(product()))).not.toContain("provider");
  });
});

// ═══════════════════════════════════════════════════════════════
// C / D. Required fields are rejected, never repaired
// ═══════════════════════════════════════════════════════════════

describe("C. blank provider product ID is rejected", () => {
  it("rejects empty, whitespace-only and non-string IDs", () => {
    for (const id of ["", "   ", "\t\n"]) {
      const result = toCatalogueProductRow(product({ id }), OBSERVED_AT);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe("missing_provider_product_id");
    }
    const missing = toCatalogueProductRow(
      product({ id: undefined as unknown as string }),
      OBSERVED_AT,
    );
    expect(missing.ok).toBe(false);
  });

  it("never invents an identity for a rejected product", () => {
    const result = toCatalogueProductRow(product({ id: "" }), OBSERVED_AT);
    if (result.ok) throw new Error("blank id must be rejected");
    expect(result.providerProductId).toBeNull();
  });
});

describe("D. blank title is rejected", () => {
  it("rejects empty and whitespace-only titles rather than storing \"\"", () => {
    for (const title of ["", "   "]) {
      const result = toCatalogueProductRow(product({ title }), OBSERVED_AT);
      expect(result.ok).toBe(false);
      if (result.ok) continue;
      expect(result.reason).toBe("missing_title");
      expect(result.providerProductId).toBe("976543");
    }
  });

  it("never generates a title from the tagline, venue or ID", () => {
    const result = toCatalogueProductRow(
      product({ title: "", tagline: "Skip the line", venue: { id: 1, name: "Colosseum" } }),
      OBSERVED_AT,
    );
    expect(result.ok).toBe(false);
  });

  it("keeps valid and rejected products separable in a batch", () => {
    const batch = toCatalogueProductRows(
      [
        product({ id: "1" }),
        product({ id: "", title: "no id" }),
        product({ id: "2", title: "  " }),
        product({ id: "3" }),
      ],
      OBSERVED_AT,
    );
    expect(batch.rows.map((r) => r.provider_product_id)).toEqual(["1", "3"]);
    expect(batch.rejected).toEqual([
      { reason: "missing_provider_product_id", providerProductId: null },
      { reason: "missing_title", providerProductId: "2" },
    ]);
  });
});

// ═══════════════════════════════════════════════════════════════
// E / F / G. Zero is real data
// ═══════════════════════════════════════════════════════════════

describe("E/F/G. genuine zeros survive", () => {
  it("keeps price 0 as 0, never null", () => {
    const mapped = row(product({ minPrice: { amount: 0, currency: "EUR" } }));
    expect(mapped.price_amount).toBe(0);
    expect(mapped.price_amount).not.toBeNull();
    expect(mapped.price_currency).toBe("EUR");
  });

  it("keeps rating 0 as 0, never null", () => {
    const mapped = row(product({ rating: { average: 0, count: 0 } }));
    expect(mapped.rating).toBe(0);
    expect(mapped.review_count).toBe(0);
  });

  it("keeps review count 0 as 0 even when a rating average exists", () => {
    expect(row(product({ rating: { average: 4.2, count: 0 } })).review_count).toBe(0);
  });

  it("keeps a zero city/country ID as \"0\", not null", () => {
    const mapped = row(product({ cityId: 0, countryId: 0 }));
    expect(mapped.city_id).toBe("0");
    expect(mapped.country_id).toBe("0");
  });

  it("keeps boolean false, never collapsing it to null", () => {
    const mapped = row(
      product({
        wheelchairAccessible: false,
        skipTheLine: false,
        smartphoneTicket: false,
        instantTicketDelivery: false,
      }),
    );
    expect(mapped.wheelchair_accessible).toBe(false);
    expect(mapped.skip_the_line).toBe(false);
    expect(mapped.smartphone_ticket).toBe(false);
    expect(mapped.instant_ticket_delivery).toBe(false);
  });

  it("uses nullish coalescing, never truthiness, for provider values", () => {
    // `value || null` is exactly what turns a genuine 0 into a missing value.
    expect(storageCode).not.toMatch(/\|\|\s*null/);
  });
});

// ═══════════════════════════════════════════════════════════════
// H. Null remains null
// ═══════════════════════════════════════════════════════════════

describe("H. absent provider values stay null", () => {
  it("maps every absent optional field to null", () => {
    const mapped = row(
      product({
        tagline: null,
        venue: null,
        saleStatus: null,
        rating: { average: null, count: null },
        minPrice: { amount: null, currency: null },
        wheelchairAccessible: null,
        skipTheLine: null,
        smartphoneTicket: null,
        instantTicketDelivery: null,
        duration: null,
        cancellation: null,
        productUrl: null,
        productCheckoutUrl: null,
        city: null,
        country: null,
        cityId: null,
        countryId: null,
        image: null,
        tagIds: [],
      }),
    );

    expect(mapped).toEqual({
      provider_product_id: "976543",
      title: "Colosseum Priority Entrance",
      city_id: null,
      city_name: null,
      country_id: null,
      country_name: null,
      tagline: null,
      venue_name: null,
      rating: null,
      review_count: null,
      price_amount: null,
      price_currency: null,
      image_url: null,
      image_alt: null,
      image_credit: null,
      tag_ids: [],
      wheelchair_accessible: null,
      skip_the_line: null,
      smartphone_ticket: null,
      instant_ticket_delivery: null,
      duration: null,
      cancellation: null,
      product_url: null,
      product_checkout_url: null,
      sale_status: null,
      last_seen_at: OBSERVED_AT_ISO,
    });
  });

  it("emits null rather than undefined so JSON never drops a key", () => {
    const mapped = row(product({ tagline: null, image: null, productUrl: null }));
    for (const value of Object.values(mapped)) {
      expect(value).not.toBeUndefined();
    }
    expect(Object.keys(JSON.parse(JSON.stringify(mapped)))).toHaveLength(
      CATALOGUE_ROW_COLUMNS.length,
    );
  });
});

// ═══════════════════════════════════════════════════════════════
// I / J. tag_ids is a genuine JSON array
// ═══════════════════════════════════════════════════════════════

describe("I/J. tag_ids JSONB contract", () => {
  it("emits a real array, not a JSON string containing an array", () => {
    const mapped = row(product({ tagIds: [1, 2, 3] }));
    expect(Array.isArray(mapped.tag_ids)).toBe(true);
    expect(mapped.tag_ids).toEqual([1, 2, 3]);
    expect(typeof mapped.tag_ids).not.toBe("string");
    expect(JSON.stringify(mapped)).toContain('"tag_ids":[1,2,3]');
    expect(JSON.stringify(mapped)).not.toContain('"tag_ids":"[1,2,3]"');
  });

  it("never calls JSON.stringify anywhere in the adapter", () => {
    // The legacy writer did `JSON.stringify(p.tagIds)` into a jsonb column.
    expect(storageCode).not.toContain("JSON.stringify");
  });

  it("emits an empty array (never null) when the provider gave no tags", () => {
    expect(row(product({ tagIds: [] })).tag_ids).toEqual([]);
    expect(row(product({ tagIds: undefined as unknown as number[] })).tag_ids).toEqual([]);
  });

  it("copies the array so a later mutation of the product cannot alter the row", () => {
    const source = product({ tagIds: [1, 2] });
    const mapped = row(source);
    source.tagIds.push(99);
    expect(mapped.tag_ids).toEqual([1, 2]);
  });
});

// ═══════════════════════════════════════════════════════════════
// K / L / M / N / O. Image ownership
// ═══════════════════════════════════════════════════════════════

describe("K/L/M. genuine primary image metadata maps exactly", () => {
  it("maps url, alt text and credit to their own columns", () => {
    const mapped = row(
      product({
        image: {
          url: "https://aws-tiqets-cdn.imgix.net/images/content/x.jpg",
          altText: "Exact alt text",
          credit: "Exact credit",
        },
      }),
    );
    expect(mapped.image_url).toBe("https://aws-tiqets-cdn.imgix.net/images/content/x.jpg");
    expect(mapped.image_alt).toBe("Exact alt text");
    expect(mapped.image_credit).toBe("Exact credit");
  });

  it("keeps alt/credit null when the provider supplied none — never generated", () => {
    const mapped = row(
      product({
        image: {
          url: "https://aws-tiqets-cdn.imgix.net/images/content/x.jpg",
          altText: null,
          credit: null,
        },
      }),
    );
    expect(mapped.image_url).toBe("https://aws-tiqets-cdn.imgix.net/images/content/x.jpg");
    expect(mapped.image_alt).toBeNull();
    expect(mapped.image_credit).toBeNull();
    // Nothing was derived from the title to fill the gap.
    expect(mapped.image_alt).not.toBe(mapped.title);
  });
});

describe("N. no primary image → all three image columns null", () => {
  it("nulls image_url, image_alt and image_credit together", () => {
    const mapped = row(product({ image: null }));
    expect(mapped.image_url).toBeNull();
    expect(mapped.image_alt).toBeNull();
    expect(mapped.image_credit).toBeNull();
  });
});

describe("O. the images gallery is never fabricated", () => {
  it("emits no `images` key at all — a one-item gallery is not invented", () => {
    const mapped = row(product());
    expect(mapped).not.toHaveProperty("images");
    expect(Object.keys(mapped)).not.toContain("images");
    expect(JSON.stringify(mapped)).not.toContain('"images"');
  });

  it("classifies images as enrichment-owned, never snapshot-owned", () => {
    expect([...CATALOGUE_ENRICHMENT_OWNED_COLUMNS]).toContain("images");
    expect([...CATALOGUE_SNAPSHOT_OWNED_COLUMNS]).not.toContain("images");
  });
});

// ═══════════════════════════════════════════════════════════════
// P / Q / R / S. Tri-state booleans
// ═══════════════════════════════════════════════════════════════

describe("P/Q/R/S. tri-state feature flags are preserved", () => {
  const TRI_STATE = [true, false, null] as const;

  it("P. preserves wheelchairAccessible as true / false / null", () => {
    for (const value of TRI_STATE) {
      expect(row(product({ wheelchairAccessible: value })).wheelchair_accessible).toBe(value);
    }
  });

  it("Q. preserves skipTheLine as true / false / null", () => {
    for (const value of TRI_STATE) {
      expect(row(product({ skipTheLine: value })).skip_the_line).toBe(value);
    }
  });

  it("R. preserves smartphoneTicket as true / false / null", () => {
    for (const value of TRI_STATE) {
      expect(row(product({ smartphoneTicket: value })).smartphone_ticket).toBe(value);
    }
  });

  it("S. preserves instantTicketDelivery as instant_ticket_delivery true / false / null", () => {
    for (const value of TRI_STATE) {
      expect(row(product({ instantTicketDelivery: value })).instant_ticket_delivery).toBe(value);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// S2. Instant ticket delivery is NOT instant confirmation
// ═══════════════════════════════════════════════════════════════

/**
 * "Instant ticket delivery" (the ticket arrives immediately) and "Instant
 * confirmation" (the booking is confirmed immediately) are different
 * traveller claims. The repository already keeps them apart: the live Tiqets
 * ExperienceProduct adapter sets `instantConfirmation: null`, and the
 * customer-facing label for the public `instantConfirmation` field reads
 * "Instant confirmation". Catalogue storage must not quietly upgrade the
 * weaker provider claim into the stronger public one.
 */
describe("S2. instant ticket delivery is never stored as instant confirmation", () => {
  const experiencesSrc = readFileSync("src/services/experiences.ts", "utf8");
  const activityCoreSrc = readFileSync(
    "supabase/functions/things-activity-public/things-activity-core.ts",
    "utf8",
  );

  it("D. the adapter never emits an instant_confirmation column", () => {
    const mapped = row(product({ instantTicketDelivery: true }));
    expect(mapped).not.toHaveProperty("instant_confirmation");
    expect(Object.keys(mapped)).not.toContain("instant_confirmation");
    expect([...CATALOGUE_ROW_COLUMNS]).not.toContain("instant_confirmation");
    expect([...CATALOGUE_SNAPSHOT_OWNED_COLUMNS]).not.toContain("instant_confirmation");
  });

  it("stores the provider claim under its own exact name", () => {
    expect([...CATALOGUE_SNAPSHOT_OWNED_COLUMNS]).toContain("instant_ticket_delivery");
    expect(row(product({ instantTicketDelivery: true })).instant_ticket_delivery).toBe(true);
  });

  it("claims no equivalence between the two concepts anywhere in the adapter", () => {
    // The only mention of instant_confirmation may be the comment saying the
    // two are NOT the same. No code assigns one from the other.
    expect(storageCode).not.toContain("instant_confirmation");
    expect(storageCode).not.toContain("instantConfirmation");
  });

  it("G. leaves the live Tiqets adapter's instantConfirmation semantics untouched", () => {
    // src/services/experiences.ts still refuses to claim instant confirmation
    // for a Tiqets product, exactly as before P2.
    expect(experiencesSrc).toContain("instantConfirmation: null");
    expect(experiencesSrc).not.toContain("instantTicketDelivery");
    expect(experiencesSrc).not.toContain("instant_ticket_delivery");
  });

  it("F. leaves things-activity-core unchanged", () => {
    // The enrichment layer still reads a DB `instant_confirmation` boolean —
    // a column P2 does not create and does not populate, so the public field
    // stays null exactly as it does today.
    expect(activityCoreSrc).toContain("instantConfirmation: bool(e.instant_confirmation)");
    expect(activityCoreSrc).not.toContain("instant_ticket_delivery");
  });
});

// ═══════════════════════════════════════════════════════════════
// T / U / V. URLs, checkout URL and sale status
// ═══════════════════════════════════════════════════════════════

describe("T. product_url is nullable and never fabricated", () => {
  it("keeps a null productUrl as null and still yields a storable row", () => {
    const result = toCatalogueProductRow(product({ productUrl: null }), OBSERVED_AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.row.product_url).toBeNull();
  });

  it("does not derive a URL from the ID, slug, title or checkout URL", () => {
    const mapped = row(
      product({
        productUrl: null,
        productCheckoutUrl: "https://www.tiqets.com/checkout/976543",
      }),
    );
    expect(mapped.product_url).toBeNull();
    expect(mapped.product_url).not.toBe(mapped.product_checkout_url);
    expect(storageCode).not.toContain("tiqets.com/");
  });

  it("passes a genuine URL through untouched", () => {
    const url = "https://www.tiqets.com/en/rome-c66918/colosseum-p976543?partner=x";
    expect(row(product({ productUrl: url })).product_url).toBe(url);
  });
});

describe("U. product_checkout_url is genuinely stored", () => {
  it("maps the checkout URL to its own column, or null", () => {
    expect(row(product()).product_checkout_url).toBe("https://www.tiqets.com/checkout/976543");
    expect(row(product({ productCheckoutUrl: null })).product_checkout_url).toBeNull();
  });

  it("is declared snapshot-owned so it cannot freeze after first insert", () => {
    expect([...CATALOGUE_SNAPSHOT_OWNED_COLUMNS]).toContain("product_checkout_url");
  });
});

describe("V. sale status is preserved verbatim", () => {
  it("never translates provider statuses into invented vocabulary", () => {
    for (const status of ["available", "unavailable", "on_sale", "sold_out", "weird_value"]) {
      expect(row(product({ saleStatus: status })).sale_status).toBe(status);
    }
    expect(row(product({ saleStatus: null })).sale_status).toBeNull();
  });

  it("contains no status translation table in the adapter", () => {
    expect(storageCode).not.toMatch(/["']available["']\s*(\?|:|=>)/);
    expect(storageCode).not.toContain("isTiqetsSaleStatusAvailable");
  });
});

// ═══════════════════════════════════════════════════════════════
// W. description is enrichment-owned
// ═══════════════════════════════════════════════════════════════

describe("W. description is NOT populated by catalogue discovery", () => {
  it("omits description from the row even when the normalized product has one", () => {
    const mapped = row(product({ description: "A rich provider description" }));
    expect(mapped).not.toHaveProperty("description");
    expect(JSON.stringify(mapped)).not.toContain("A rich provider description");
    expect(JSON.stringify(mapped)).not.toContain('"description"');
  });

  it("classifies description as enrichment-owned, never snapshot-owned", () => {
    expect([...CATALOGUE_ENRICHMENT_OWNED_COLUMNS]).toContain("description");
    expect([...CATALOGUE_SNAPSHOT_OWNED_COLUMNS]).not.toContain("description");
  });

  it("keeps tagline and venue_name snapshot-owned — unlike long description", () => {
    expect([...CATALOGUE_SNAPSHOT_OWNED_COLUMNS]).toEqual(
      expect.arrayContaining(["tagline", "venue_name"]),
    );
    expect(row(product()).tagline).toBe("Skip the ticket line");
    expect(row(product()).venue_name).toBe("Colosseum");
  });
});

// ═══════════════════════════════════════════════════════════════
// X. observedAt is an explicit, deterministic input
// ═══════════════════════════════════════════════════════════════

describe("X. observedAt determinism", () => {
  it("uses the supplied instant for last_seen_at", () => {
    expect(row(product(), new Date("2020-01-02T03:04:05.000Z")).last_seen_at).toBe(
      "2020-01-02T03:04:05.000Z",
    );
  });

  it("is a pure function of (product, observedAt)", () => {
    expect(row(product())).toEqual(row(product()));
  });

  it("reads no hidden clock — Date.now() and new Date() are never called", () => {
    const nowSpy = vi.spyOn(Date, "now");
    const mapped = row(product());
    expect(nowSpy).not.toHaveBeenCalled();
    expect(mapped.last_seen_at).toBe(OBSERVED_AT_ISO);
    expect(storageCode).not.toContain("Date.now()");
    expect(storageCode).not.toContain("new Date(");
  });

  it("rejects an invalid observation instant instead of silently substituting now()", () => {
    const result = toCatalogueProductRow(product(), new Date("not-a-date"));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("invalid_observed_at");
  });
});

// ═══════════════════════════════════════════════════════════════
// Y. The adapter is pure — no provider, network or database access
// ═══════════════════════════════════════════════════════════════

describe("Y. adapter purity", () => {
  it("issues no network request when mapping", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("network access attempted");
    });
    toCatalogueProductRows([product(), product({ id: "2" })], OBSERVED_AT);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("contains no Supabase client, RPC call or write call", () => {
    for (const forbidden of [
      "createClient",
      "supabase-js",
      "SERVICE_ROLE",
      ".rpc(",
      ".upsert(",
      ".insert(",
      ".update(",
      ".delete(",
      ".from(",
    ]) {
      expect(storageCode).not.toContain(forbidden);
    }
  });

  it("contains no provider client, no fetch and no environment access", () => {
    for (const forbidden of [
      "fetch(",
      "tiqetsRequest",
      "tiqets-client",
      "api.tiqets.com",
      "Deno.env",
      "process.env",
    ]) {
      expect(storageCode).not.toContain(forbidden);
    }
  });

  it("imports only the normalized product type", () => {
    const imports = [...storageSrc.matchAll(/^import\s[\s\S]*?from\s+"([^"]+)";/gm)].map(
      (m) => m[1],
    );
    expect(imports).toEqual(["../_shared/tiqets-normalizer.ts"]);
    expect(storageSrc).toContain('import type { NormalizedProduct }');
  });
});

// ═══════════════════════════════════════════════════════════════
// Z. P1 safety: refresh stays disabled, the adapter stays unwired
// ═══════════════════════════════════════════════════════════════

describe("Z. the adapter is not wired into the disabled refresh path", () => {
  it("is not imported by index.ts", () => {
    expect(indexSrc).not.toContain("catalogue-storage");
    expect(indexSrc).not.toContain("toCatalogueProductRow");
    expect(indexSrc).not.toContain("upsert_experience_products");
  });

  it("names no table and calls no RPC, so it cannot write on its own", () => {
    for (const identifier of [
      "experience_products",
      "experience_destinations",
      "experience_catalog_sync_state",
      "upsert_experience_products",
    ]) {
      // The table name may appear in prose; it must never appear in a call.
      expect(storageCode).not.toContain(`"${identifier}"`);
      expect(storageCode).not.toContain(`'${identifier}'`);
    }
  });
});

// ═══════════════════════════════════════════════════════════════
// AA. Field ownership model is explicit and mutually exclusive
// ═══════════════════════════════════════════════════════════════

describe("AA. field ownership classification", () => {
  it("keeps the ownership sets disjoint", () => {
    const sets: Array<[string, Set<string>]> = [
      ["identity", new Set<string>(CATALOGUE_ROW_IDENTITY_COLUMNS)],
      ["snapshot", new Set<string>(CATALOGUE_SNAPSHOT_OWNED_COLUMNS)],
      ["enrichment", new Set<string>(CATALOGUE_ENRICHMENT_OWNED_COLUMNS)],
      ["database", new Set<string>(CATALOGUE_DATABASE_OWNED_COLUMNS)],
    ];

    for (const [nameA, a] of sets) {
      for (const [nameB, b] of sets) {
        if (nameA === nameB) continue;
        for (const column of a) expect(b.has(column)).toBe(false);
      }
    }
  });

  it("classifies identity and timestamps as database-owned", () => {
    expect([...CATALOGUE_DATABASE_OWNED_COLUMNS]).toEqual(
      expect.arrayContaining([
        "provider",
        "slug",
        "created_at",
        "updated_at",
        "provider_updated_at",
      ]),
    );
  });

  it("never emits a database-owned column from the adapter", () => {
    const emitted = Object.keys(row(product()));
    for (const column of CATALOGUE_DATABASE_OWNED_COLUMNS) {
      expect(emitted).not.toContain(column);
    }
  });
});
