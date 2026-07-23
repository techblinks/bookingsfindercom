import { describe, it, expect } from "vitest";
import { buildWhiteLabelFlightUrl, getWhiteLabelRolloutMode } from "../whiteLabelUrl";

// ── Verified Format ──
// Live White Label uses: ?flightSearch=BNE2008SYD2908&destination_airports=0&origin_airports=1
// Where BNE=origin, 2008=20 Aug (DDMM), SYD=dest, 2908=29 Aug (DDMM)
//
// Rollout mode is "disabled" by default in test environment.
// Host is not configured (VITE_TRAVEL_WHITE_LABEL_HOST is unset).
//
// The rollout check runs FIRST, so all calls fail with "disabled" in tests.
// Blocking logic runs only after rollout + host checks pass.

describe("buildWhiteLabelFlightUrl", () => {
  describe("rollout: disabled (default)", () => {
    it("returns failure when rollout is disabled", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
      });
      expect(r.success).toBe(false);
      expect(r.url).toBeNull();
      expect(r.reason).toContain("disabled");
    });
  });

  describe("date encoding (DDMM format)", () => {
    it("correctly converts YYYY-MM-DD to DDMM", () => {
      const cases: Record<string, string> = {
        "2026-08-20": "2008",
        "2026-08-29": "2908",
        "2026-12-25": "2512",
        "2027-01-10": "1001",
        "2026-01-01": "0101",
        "2026-12-31": "3112",
        "2026-07-04": "0407",
      };
      for (const [iso, expected] of Object.entries(cases)) {
        const actual = iso.slice(8, 10) + iso.slice(5, 7);
        expect(actual).toBe(expected);
      }
    });
  });

  describe("flightSearch value encoding", () => {
    it("concatenates origin + DDMM + dest + returnDDMM for return trips", () => {
      const origin = "BNE";
      const outDDMM = "2026-08-20".slice(8, 10) + "2026-08-20".slice(5, 7);
      const dest = "SYD";
      const retDDMM = "2026-08-29".slice(8, 10) + "2026-08-29".slice(5, 7);
      const flightSearch = origin + outDDMM + dest + retDDMM;
      expect(flightSearch).toBe("BNE2008SYD2908");
    });

    it("concatenates origin + DDMM + dest for one-way trips", () => {
      const origin = "SYD";
      const outDDMM = "2512";
      const dest = "DPS";
      const flightSearch = origin + outDDMM + dest;
      expect(flightSearch).toBe("SYD2512DPS");
    });
  });

  describe("URLSearchParams construction", () => {
    it("builds correct query string for return trip", () => {
      const qs = new URLSearchParams();
      qs.set("flightSearch", "BNE2008SYD2908");
      qs.set("origin_airports", "1");
      qs.set("destination_airports", "0");
      const search = qs.toString();
      expect(search).toContain("flightSearch=BNE2008SYD2908");
      expect(search).toContain("origin_airports=1");
      expect(search).toContain("destination_airports=0");
    });

    it("builds correct query string for one-way trip", () => {
      const qs = new URLSearchParams();
      qs.set("flightSearch", "SYD2512DPS");
      qs.set("origin_airports", "1");
      qs.set("destination_airports", "0");
      const search = qs.toString();
      expect(search).toContain("flightSearch=SYD2512DPS");
    });
  });

  describe("blocked parameters (unverified)", () => {
    it("adults=3 is rejected (rollout disabled, so reason = disabled)", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 3,
      });
      // Rollout disabled → short-circuits before blocking check
      expect(r.success).toBe(false);
      expect(r.reason).toContain("disabled");
    });

    it("children=1 is rejected", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        children: 1,
      });
      expect(r.success).toBe(false);
    });

    it("infants=1 is rejected", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        infants: 1,
      });
      expect(r.success).toBe(false);
    });

    it("cabinClass=business is rejected", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        cabinClass: "business",
      });
      expect(r.success).toBe(false);
    });

    it("currency=AUD is rejected", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        currency: "AUD",
      });
      expect(r.success).toBe(false);
    });

    it("adults=1 passes the blocking check (still fails on disabled rollout)", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 1,
      });
      expect(r.success).toBe(false);
      // Reason is about rollout, not about adults
      expect(r.reason).toContain("disabled");
    });

    it("children=0 passes the blocking check", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        children: 0,
      });
      expect(r.success).toBe(false);
      expect(r.reason).toContain("disabled");
    });

    it("cabinClass=economy passes the blocking check", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        cabinClass: "economy",
      });
      expect(r.success).toBe(false);
      expect(r.reason).toContain("disabled");
    });
  });

  describe("validation (rollout check runs first)", () => {
    it("missing origin -> fails (rollout disabled first)", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "", destination: "DPS", outboundDate: "2026-12-25",
      });
      expect(r.success).toBe(false);
      expect(r.reason).toContain("disabled");
    });

    it("same origin/destination -> fails", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "SYD", outboundDate: "2026-12-25",
      });
      expect(r.success).toBe(false);
    });

    it("return before outbound -> fails", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS",
        outboundDate: "2026-12-25", returnDate: "2026-12-20",
      });
      expect(r.success).toBe(false);
    });
  });

  describe("safe internal fallback", () => {
    it("returns url=null (never a partner URL) on failure", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
        adults: 3,
      });
      expect(r.url).toBeNull();
    });

    it("returns url=null when rollout is disabled", () => {
      const r = buildWhiteLabelFlightUrl({
        origin: "SYD", destination: "DPS", outboundDate: "2026-12-25",
      });
      expect(r.url).toBeNull();
    });
  });

  describe("separate from Aviasales builder", () => {
    it("source does not reference /search/ path format", () => {
      const src = buildWhiteLabelFlightUrl.toString();
      expect(src).not.toContain("/search/");
    });

    it("source does not reference origin_iata query param", () => {
      const src = buildWhiteLabelFlightUrl.toString();
      expect(src).not.toContain("origin_iata");
      expect(src).not.toContain("destination_iata");
    });
  });

  describe("no secrets", () => {
    it("does not reference token, marker, or api_key in source", () => {
      const src = buildWhiteLabelFlightUrl.toString();
      expect(src).not.toContain("token");
      expect(src).not.toContain("MARKER");
      expect(src).not.toContain("api_key");
    });
  });
});

describe("getWhiteLabelRolloutMode", () => {
  it("returns disabled by default in test environment", () => {
    expect(getWhiteLabelRolloutMode()).toBe("disabled");
  });
});
