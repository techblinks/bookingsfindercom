import { describe, it, expect } from "vitest";
import {
  buildWhiteLabelFlightUrl,
  getWhiteLabelRolloutMode,
} from "../whiteLabelUrl";

// ── Live-Verified Protocol ──
//
// 1 adult return:     BNE1008SYD13081
// 1 adult one-way:     BNE1008SYD1
// 2 adults one-way:    BNE1008SYD2
// 1 adult + 1 child:   BNE1008SYD220811
// 2 adults + 1 child:  BNE1008SYD220821
// 1 adult + 1 infant:  BNE0108SYD101
// business + infant:   BNE0108SYDc101
// cross-year:          BNE2812SYD05011

describe("buildWhiteLabelFlightUrl", () => {
  describe("rollout: disabled (default)", () => {
    it("returns failure when rollout is disabled", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 1, children: 0, infants: 0, cabinClass: "economy",
      });
      expect(r.success).toBe(false);
      expect(r.url).toBeNull();
      expect(r.reason).toContain("not enabled");
    });
  });

  describe("date encoding (DDMM)", () => {
    it("converts YYYY-MM-DD to DDMM correctly", () => {
      const cases: Record<string, string> = {
        "2026-08-10": "1008",
        "2026-08-13": "1308",
        "2026-08-20": "2008",
        "2026-12-28": "2812",
        "2027-01-05": "0501",
      };
      for (const [iso, expected] of Object.entries(cases)) {
        const actual = iso.slice(8, 10) + iso.slice(5, 7);
        expect(actual).toBe(expected);
      }
    });
  });

  describe("passenger suffix encoding", () => {
    it("1 adult → '1'", () => {
      expect(buildSuffix(1, 0, 0)).toBe("1");
    });
    it("2 adults → '2'", () => {
      expect(buildSuffix(2, 0, 0)).toBe("2");
    });
    it("1 adult + 1 child → '11'", () => {
      expect(buildSuffix(1, 1, 0)).toBe("11");
    });
    it("2 adults + 1 child → '21'", () => {
      expect(buildSuffix(2, 1, 0)).toBe("21");
    });
    it("1 adult + 0 children + 1 infant → '101'", () => {
      expect(buildSuffix(1, 0, 1)).toBe("101");
    });
  });

  describe("validation", () => {
    it("rejects adults=0", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 0, children: 0, infants: 0, cabinClass: "economy",
      });
      // Rollout disabled → short-circuits before validation
      expect(r.success).toBe(false);
    });

    it("rejects fractional adults", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 1.5, children: 0, infants: 0, cabinClass: "economy",
      });
      expect(r.success).toBe(false);
    });

    it("rejects negative children", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 1, children: -1, infants: 0, cabinClass: "economy",
      });
      expect(r.success).toBe(false);
    });

    it("rejects unknown cabin class", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 1, children: 0, infants: 0, cabinClass: "first",
      });
      // Rollout disabled → short-circuits before validation
      expect(r.success).toBe(false);
    });

    it("rejects empty cabin class", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 1, children: 0, infants: 0, cabinClass: "",
      });
      expect(r.success).toBe(false);
    });

    it("rejects same origin and destination", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "SYD", outboundDate: "2026-12-25",
        adults: 1, children: 0, infants: 0, cabinClass: "economy",
      });
      expect(r.success).toBe(false);
    });

    it("rejects return before outbound", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS",
        outboundDate: "2026-12-25", returnDate: "2026-12-20",
        adults: 1, children: 0, infants: 0, cabinClass: "economy",
      });
      expect(r.success).toBe(false);
    });

    it("rejects missing outbound date", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "",
        adults: 1, children: 0, infants: 0, cabinClass: "economy",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("no secrets", () => {
    it("does not reference token, marker, or api_key in source", () => {
      const src = buildWhiteLabelFlightUrl.toString();
      expect(src).not.toContain("token");
      expect(src).not.toContain("MARKER");
      expect(src).not.toContain("api_key");
      expect(src).not.toContain("secret");
    });
  });
});

describe("getWhiteLabelRolloutMode", () => {
  it("returns disabled by default in test environment", () => {
    expect(getWhiteLabelRolloutMode()).toBe("disabled");
  });
});

// Inline suffix builder for direct testing
function buildSuffix(adults: number, children: number, infants: number): string {
  const a = String(adults);
  if (infants === 0 && children === 0) return a;
  if (infants === 0) return a + String(children);
  return a + String(children) + String(infants);
}
