import { describe, it, expect } from "vitest";
import {
  buildTrackingPayload,
  SOURCE_PAGES,
  PLACEMENTS,
  type OutboundTrackingPayload,
} from "../outboundTracking";

// ── Valid payloads ──

describe("buildTrackingPayload", () => {
  describe("valid payloads", () => {
    it("builds a flight click event", () => {
      const result = buildTrackingPayload({
        type: "flight",
        action: "click",
        origin: "SYD",
        destination: "DPS",
        departureDate: "2026-12-25",
        returnDate: "2027-01-10",
        airlineCode: "GA",
        price: 450,
        currency: "AUD",
        sourcePage: "flight_results",
        placement: "flight_result_card",
        outboundHost: "aviasales.com",
      });
      expect(result.valid).toBe(true);
      expect(result.row).toBeTruthy();
      expect(result.row!.type).toBe("flight");
      expect(result.row!.action).toBe("click");
      expect(result.row!.origin).toBe("SYD");
      expect(result.row!.source_page).toBe("flight_results");
      expect(result.row!.placement).toBe("flight_result_card");
      expect(result.row!.outbound_host).toBe("aviasales.com");
    });

    it("builds a hotel click event", () => {
      const result = buildTrackingPayload({
        type: "hotel",
        action: "click",
        hotelId: "12345",
        price: 180,
        currency: "USD",
        sourcePage: "hotel_results",
        placement: "hotel_result_card",
        outboundHost: "hotellook.com",
      });
      expect(result.valid).toBe(true);
      expect(result.row!.type).toBe("hotel");
      expect(result.row!.source_page).toBe("hotel_results");
    });

    it("omits undefined optional fields", () => {
      const result = buildTrackingPayload({
        type: "flight",
        action: "search",
        sourcePage: "flight_results",
      });
      expect(result.valid).toBe(true);
      expect(result.row!.origin).toBeUndefined();
      expect(result.row!.destination).toBeUndefined();
      expect(result.row!.price).toBeUndefined();
      expect(result.row!.placement).toBeUndefined();
    });
  });

  // ── Invalid payloads ──

  describe("invalid payloads", () => {
    it("rejects invalid product type", () => {
      const result = buildTrackingPayload({ type: "train" as "flight", action: "search" });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "type")).toBe(true);
    });

    it("rejects invalid action", () => {
      const result = buildTrackingPayload({ type: "flight", action: "book" as "click" });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "action")).toBe(true);
    });

    it("rejects non-IATA origin", () => {
      const result = buildTrackingPayload({ type: "flight", action: "search", origin: "Sydney" });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "origin")).toBe(true);
    });

    it("rejects invalid departure date format", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "search", departureDate: "25-12-2026",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "departureDate")).toBe(true);
    });

    it("rejects negative price", () => {
      const result = buildTrackingPayload({ type: "flight", action: "click", price: -50 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "price")).toBe(true);
    });

    it("rejects invalid source page", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "click", sourcePage: "unknown_page" as "flight_results",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "sourcePage")).toBe(true);
    });

    it("rejects invalid placement", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "click", placement: "random_button" as "flight_result_card",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "placement")).toBe(true);
    });

    it("rejects unapproved outbound host", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "click", outboundHost: "evil-site.com",
      });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === "outboundHost")).toBe(true);
    });

    it("rejects NaN price", () => {
      const result = buildTrackingPayload({ type: "flight", action: "click", price: NaN });
      expect(result.valid).toBe(false);
    });

    it("rejects Infinity price", () => {
      const result = buildTrackingPayload({ type: "flight", action: "click", price: Infinity });
      expect(result.valid).toBe(false);
    });
  });

  // ── Outbound host sanitisation ──

  describe("outbound host sanitisation", () => {
    it("strips protocol from outbound host", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "click", outboundHost: "https://aviasales.com/search",
      });
      expect(result.valid).toBe(true);
      expect(result.row!.outbound_host).toBe("aviasales.com");
    });

    it("accepts host-only string", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "click", outboundHost: "aviasales.com",
      });
      expect(result.valid).toBe(true);
    });

    it("accepts subdomain of approved host", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "click", outboundHost: "www.aviasales.com",
      });
      expect(result.valid).toBe(true);
    });

    it("rejects lookalike host", () => {
      const result = buildTrackingPayload({
        type: "flight", action: "click", outboundHost: "aviasales.evil.com",
      });
      expect(result.valid).toBe(false);
    });
  });

  // ── Source and placement allowlists ──

  describe("source_pages allowlist", () => {
    it("contains expected identifiers", () => {
      expect(SOURCE_PAGES).toContain("flight_results");
      expect(SOURCE_PAGES).toContain("trip_cost_planner");
      expect(SOURCE_PAGES).toContain("hotel_results");
      expect(SOURCE_PAGES).toContain("homepage");
    });
  });

  describe("placements allowlist", () => {
    it("contains expected identifiers", () => {
      expect(PLACEMENTS).toContain("flight_result_card");
      expect(PLACEMENTS).toContain("planner_summary");
      expect(PLACEMENTS).toContain("hotel_result_card");
      expect(PLACEMENTS).toContain("homepage_flight_handoff");
    });
  });

  // ── Security ──

  describe("security", () => {
    it("does not include full URL or sensitive data in payload", () => {
      const result = buildTrackingPayload({ type: "flight", action: "click" });
      const row = result.row! as Record<string, unknown>;
      expect(row.redirect_url).toBeUndefined();
      expect(row.user_agent).toBeUndefined();
      // No secrets
      const json = JSON.stringify(row);
      expect(json).not.toContain("token");
      expect(json).not.toContain("secret");
      expect(json).not.toContain("api_key");
      expect(json).not.toContain("password");
      expect(json).not.toContain("email");
    });

    it("accepts valid IATA origin", () => {
      expect(buildTrackingPayload({ type: "flight", action: "search", origin: "SYD" }).valid).toBe(true);
    });

    it("accepts valid IATA destination", () => {
      expect(buildTrackingPayload({ type: "flight", action: "search", destination: "DPS" }).valid).toBe(true);
    });

    it("accepts all approved source pages", () => {
      for (const sp of SOURCE_PAGES) {
        const r = buildTrackingPayload({ type: "flight", action: "click", sourcePage: sp });
        expect(r.valid).toBe(true);
      }
    });

    it("accepts all approved placements", () => {
      for (const p of PLACEMENTS) {
        const r = buildTrackingPayload({ type: "flight", action: "click", placement: p });
        expect(r.valid).toBe(true);
      }
    });
  });
});
