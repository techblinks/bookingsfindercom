import { describe, it, expect } from "vitest";
import {
  validateFlightParams,
  buildFlightSearchUrl,
  buildInternalFlightUrl,
  getPartnerDisclosure,
  AFFILIATE_DISCLOSURE,
  PARTNERS,
} from "../travelConfig";

// ── Validation ──

describe("validateFlightParams", () => {
  it("accepts valid one-way params", () => {
    const r = validateFlightParams({
      origin: "SYD",
      destination: "DPS",
      departureDate: "2026-12-25",
      adults: 1,
    });
    expect(r.valid).toBe(true);
    expect(r.errors).toHaveLength(0);
  });

  it("accepts valid return-flight params", () => {
    const r = validateFlightParams({
      origin: "SYD",
      destination: "DPS",
      departureDate: "2026-12-25",
      returnDate: "2027-01-10",
      adults: 2,
    });
    expect(r.valid).toBe(true);
  });

  it("rejects missing origin", () => {
    const r = validateFlightParams({ destination: "DPS", departureDate: "2026-12-25" });
    expect(r.valid).toBe(false);
    expect(r.errors.some(e => e.field === "origin")).toBe(true);
  });

  it("rejects invalid IATA (too short)", () => {
    const r = validateFlightParams({ origin: "SY", destination: "DPS", departureDate: "2026-12-25" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "origin")?.code).toBe("invalid_iata");
  });

  it("rejects invalid IATA (lowercase)", () => {
    const r = validateFlightParams({ origin: "syd", destination: "DPS", departureDate: "2026-12-25" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "origin")?.code).toBe("invalid_iata");
  });

  it("rejects same origin and destination", () => {
    const r = validateFlightParams({ origin: "SYD", destination: "SYD", departureDate: "2026-12-25" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "destination")?.code).toBe("same_as_origin");
  });

  it("rejects invalid departure date format", () => {
    const r = validateFlightParams({ origin: "SYD", destination: "DPS", departureDate: "25-12-2026" });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "departureDate")?.code).toBe("invalid_date");
  });

  it("rejects return before departure", () => {
    const r = validateFlightParams({
      origin: "SYD", destination: "DPS",
      departureDate: "2026-12-25", returnDate: "2026-12-20",
    });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "returnDate")?.code).toBe("before_departure");
  });

  it("rejects zero adults", () => {
    const r = validateFlightParams({ origin: "SYD", destination: "DPS", departureDate: "2026-12-25", adults: 0 });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "adults")?.code).toBe("invalid_adults");
  });

  it("rejects excess adults", () => {
    const r = validateFlightParams({ origin: "SYD", destination: "DPS", departureDate: "2026-12-25", adults: 10 });
    expect(r.valid).toBe(false);
    expect(r.errors.find(e => e.field === "adults")?.code).toBe("too_many_adults");
  });

  it("defaults adults to 1 when missing", () => {
    const r = validateFlightParams({ origin: "SYD", destination: "DPS", departureDate: "2026-12-25" });
    // adults defaults to 1 in the validator when params.adults is undefined
    // but the validation sets adults ?? 1 for checking — the param itself is missing
    expect(r.valid).toBe(true);
  });

  it("accepts return date same as departure", () => {
    const r = validateFlightParams({
      origin: "SYD", destination: "DPS",
      departureDate: "2026-12-25", returnDate: "2026-12-25",
    });
    expect(r.valid).toBe(true);
  });

  it("accepts optional cabinClass", () => {
    const r = validateFlightParams({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25",
      cabinClass: "business",
    });
    expect(r.valid).toBe(true);
  });
});

// ── URL Building ──

describe("buildFlightSearchUrl", () => {
  it("builds a valid one-way flight URL", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25", adults: 1,
    });
    expect(r.success).toBe(true);
    expect(r.url).toContain("aviasales.com");
    expect(r.url).toContain("/search/SYD20261225DPS1");
    expect(r.url).toContain("origin_iata=SYD");
    expect(r.url).toContain("destination_iata=DPS");
    expect(r.url).toContain("depart_date=2026-12-25");
    expect(r.url).toContain("adults=1");
  });

  it("builds a valid return-flight URL", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS",
      departureDate: "2026-12-25", returnDate: "2027-01-10", adults: 2,
    });
    expect(r.success).toBe(true);
    expect(r.url).toContain("return_date=2027-01-10");
    expect(r.url).toContain("/search/SYD20261225DPS202701101");
    expect(r.url).toContain("adults=2");
  });

  it("returns failure for invalid params", () => {
    const r = buildFlightSearchUrl({
      origin: "", destination: "", departureDate: "", adults: 0,
    });
    expect(r.success).toBe(false);
    expect(r.url).toBeNull();
    expect(r.errors).toBeDefined();
    expect(r.errors!.length).toBeGreaterThan(0);
  });

  it("returns failure for same origin/destination", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "SYD", departureDate: "2026-12-25",
    });
    expect(r.success).toBe(false);
    expect(r.errors!.some(e => e.field === "destination")).toBe(true);
  });

  it("returns failure for reversed dates", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS",
      departureDate: "2027-01-10", returnDate: "2026-12-25",
    });
    expect(r.success).toBe(false);
  });

  it("generated URL resolves to an approved host", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25", adults: 1,
    });
    expect(r.success).toBe(true);
    const url = new URL(r.url!);
    expect(url.hostname).toContain("aviasales.com");
  });

  it("query parameters use URLSearchParams (properly encoded)", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25", adults: 1,
    });
    expect(r.success).toBe(true);
    // URLSearchParams encodes spaces as + — verify no raw spaces
    expect(r.url).not.toContain(" ");
  });

  it("includes cabin class when not economy", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25",
      adults: 1, cabinClass: "business",
    });
    expect(r.success).toBe(true);
    expect(r.url).toContain("cabin_class=business");
  });

  it("omits cabin class for economy", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25",
      adults: 1, cabinClass: "economy",
    });
    expect(r.success).toBe(true);
    expect(r.url).not.toContain("cabin_class");
  });
});

// ── Internal URL ──

describe("buildInternalFlightUrl", () => {
  it("builds /flights route with params", () => {
    const url = buildInternalFlightUrl({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25", adults: 2,
    });
    expect(url).toContain("/flights?");
    expect(url).toContain("origin=SYD");
    expect(url).toContain("destination=DPS");
    expect(url).toContain("departureDate=2026-12-25");
    expect(url).toContain("passengers=2");
  });

  it("returns /flights with no params when empty", () => {
    const url = buildInternalFlightUrl({});
    expect(url).toBe("/flights");
  });

  it("maps adults to passengers parameter", () => {
    const url = buildInternalFlightUrl({ adults: 3 });
    expect(url).toContain("passengers=3");
  });

  it("includes cabinClass", () => {
    const url = buildInternalFlightUrl({ cabinClass: "business" });
    expect(url).toContain("cabinClass=business");
  });
});

// ── Partner Disclosure ──

describe("getPartnerDisclosure", () => {
  it("returns disclosure for aviasales", () => {
    const d = getPartnerDisclosure("aviasales");
    expect(d).toContain("Aviasales");
    expect(d).toContain("partner site");
  });

  it("returns disclosure for hotellook", () => {
    const d = getPartnerDisclosure("hotellook");
    expect(d).toContain("Hotellook");
  });
});

// ── Affiliate Disclosure ──

describe("AFFILIATE_DISCLOSURE", () => {
  it("is a non-empty string", () => {
    expect(AFFILIATE_DISCLOSURE.length).toBeGreaterThan(50);
  });

  it("contains commission disclosure", () => {
    expect(AFFILIATE_DISCLOSURE).toContain("commission");
    expect(AFFILIATE_DISCLOSURE).toContain("booking provider");
  });
});

// ── No Secrets ──

describe("security: no secrets in config", () => {
  it("PARTNERS does not contain API tokens", () => {
    const json = JSON.stringify(PARTNERS);
    expect(json).not.toContain("token");
    expect(json).not.toContain("api_key");
    expect(json).not.toContain("secret");
    expect(json).not.toContain("TRAVELPAYOUTS");
  });

  it("buildFlightSearchUrl does not append token/marker", () => {
    const r = buildFlightSearchUrl({
      origin: "SYD", destination: "DPS", departureDate: "2026-12-25", adults: 1,
    });
    expect(r.success).toBe(true);
    expect(r.url).not.toContain("token=");
    expect(r.url).not.toContain("marker=");
    expect(r.url).not.toContain("api_key");
    expect(r.url).not.toContain("apiKey");
  });

  it("buildInternalFlightUrl does not include secrets", () => {
    const url = buildInternalFlightUrl({ origin: "SYD" });
    expect(url).not.toContain("token");
    expect(url).not.toContain("marker");
  });
});

// ── Partner Metadata ──

describe("PARTNERS", () => {
  it("has aviasales and hotellook configured", () => {
    expect(PARTNERS.aviasales).toBeDefined();
    expect(PARTNERS.hotellook).toBeDefined();
  });

  it("aviasales is a flight partner", () => {
    expect(PARTNERS.aviasales.productType).toBe("flight");
  });

  it("hotellook is a hotel partner", () => {
    expect(PARTNERS.hotellook.productType).toBe("hotel");
  });
});
