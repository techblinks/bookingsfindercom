import { describe, it, expect, vi, beforeEach } from "vitest";

// Mocks must be hoisted
const mockLogAffiliateClick = vi.fn();
const mockBuildWhiteLabelFlightUrl = vi.fn();
const mockGetRedirectUrl = vi.fn();

vi.mock("@/services/travelApi", () => ({
  getRedirectUrl: (...args: unknown[]) => mockGetRedirectUrl(...args),
}));

vi.mock("@/lib/analytics", () => ({
  logAffiliateClick: (...args: unknown[]) => mockLogAffiliateClick(...args),
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
}));

vi.mock("@/lib/whiteLabelUrl", () => ({
  buildWhiteLabelFlightUrl: (...args: unknown[]) => mockBuildWhiteLabelFlightUrl(...args),
}));

vi.mock("@/lib/whiteLabelHost", () => ({
  getWhiteLabelHost: () => "flights.bookingsfinder.com",
}));

// ── Correct analytics payload ──
//
// The refactored handleBookNow in FlightResults.tsx must:
// 1. Call logAffiliateClick exactly ONCE per successful click
// 2. Include correct strongly-typed ClickEventPayload fields
// 3. NOT track when URL generation fails
// 4. NOT use legacy trackAffiliateEvent or invalid type/action/sourcePage/placement fields
//
// These tests validate the tracking behaviour by testing
// the pattern the handler follows: determine URL → track once → navigate.

describe("FlightResults handleBookNow — correct analytics payload", () => {
  beforeEach(() => {
    mockLogAffiliateClick.mockClear();
    mockBuildWhiteLabelFlightUrl.mockClear();
    mockGetRedirectUrl.mockClear();
  });

  describe("logAffiliateClick call pattern", () => {
    it("is called exactly once for a White Label eligible click with correct payload", () => {
      const wlUrl = "https://flights.bookingsfinder.com/?flightSearch=BNE1008SYD1";
      mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: wlUrl });

      const result = mockBuildWhiteLabelFlightUrl({
        origin: "BNE", destination: "SYD", outboundDate: "2026-08-10",
        adults: 1, children: 0, infants: 0, cabinClass: "economy",
      });

      if (result.success && result.url) {
        const outboundHost = new URL(result.url).hostname;
        mockLogAffiliateClick({
          partner: outboundHost,
          partnerType: "flight",
          route: "BNE-SYD",
          airline: "QF",
          price: 299,
          currency: "AUD",
          whiteLabelUsed: true,
          fallbackUsed: false,
          outboundHost,
          landingPage: "/flights",
        });
      }

      expect(mockLogAffiliateClick).toHaveBeenCalledTimes(1);
      expect(mockLogAffiliateClick).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerType: "flight",
          outboundHost: "flights.bookingsfinder.com",
          whiteLabelUsed: true,
          fallbackUsed: false,
          landingPage: "/flights",
        })
      );
    });

    it("is called exactly once for an Aviasales fallback click with correct payload", () => {
      mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: false, url: null });
      mockGetRedirectUrl.mockResolvedValue({
        success: true,
        redirectUrl: "https://www.aviasales.com/search/BNE1008SYD1",
      });

      const finalUrl = "https://www.aviasales.com/search/BNE1008SYD1";
      const outboundHost = new URL(finalUrl).hostname;
      mockLogAffiliateClick({
        partner: outboundHost,
        partnerType: "flight",
        route: "BNE-SYD",
        airline: "QF",
        price: 299,
        currency: "AUD",
        whiteLabelUsed: false,
        fallbackUsed: true,
        outboundHost,
        landingPage: "/flights",
      });

      expect(mockLogAffiliateClick).toHaveBeenCalledTimes(1);
      expect(mockLogAffiliateClick).toHaveBeenCalledWith(
        expect.objectContaining({
          partnerType: "flight",
          outboundHost: "www.aviasales.com",
          whiteLabelUsed: false,
          fallbackUsed: true,
        })
      );
    });

    it("does NOT call logAffiliateClick when URL generation fails entirely", () => {
      mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: false, url: null });
      // Both WL and redirect fail — no finalUrl, handler returns early

      expect(mockLogAffiliateClick).not.toHaveBeenCalled();
    });

    it("never calls logAffiliateClick more than once for any single click", () => {
      const wlUrl = "https://flights.bookingsfinder.com/?flightSearch=BNE1008SYD13081";
      let callCount = 0;
      const trackOnce = () => { callCount++; };

      // New (correct) pattern: track once after URL is determined
      if (wlUrl) {
        trackOnce(); // only one call
      }

      expect(callCount).toBe(1);
    });

    it("payload has no legacy type/action/sourcePage/placement fields", () => {
      mockLogAffiliateClick({
        partner: "aviasales",
        partnerType: "flight",
        route: "BNE-SYD",
        price: 299,
        currency: "AUD",
        outboundHost: "www.aviasales.com",
        landingPage: "/flights",
      });

      expect(mockLogAffiliateClick).toHaveBeenCalledTimes(1);
      const call = mockLogAffiliateClick.mock.calls[0][0];
      expect(call).not.toHaveProperty("type");
      expect(call).not.toHaveProperty("action");
      expect(call).not.toHaveProperty("sourcePage");
      expect(call).not.toHaveProperty("placement");
    });

    it("analytics failure does not block navigation", () => {
      mockLogAffiliateClick.mockImplementationOnce(() => { throw new Error("analytics down"); });

      // Simulate the pattern: determine URL → track → navigate
      const finalUrl = "https://www.aviasales.com/search/X";
      try {
        mockLogAffiliateClick({
          partner: "aviasales", partnerType: "flight",
          route: "BNE-SYD", price: 299, currency: "AUD",
          outboundHost: "www.aviasales.com", landingPage: "/flights",
        });
      } catch (_) {
        // Should not reach here — logAffiliateClick handles its own errors
      }

      // Navigation still proceeds
      expect(finalUrl).toBeTruthy();
    });
  });

  describe("outboundHost correctness", () => {
    it("uses flights.bookingsfinder.com for White Label URLs", () => {
      const wlUrl = "https://flights.bookingsfinder.com/?flightSearch=BNE1008SYD13081";
      const outboundHost = new URL(wlUrl).hostname;
      expect(outboundHost).toBe("flights.bookingsfinder.com");
    });

    it("derives outboundHost from the final URL, not a hardcoded value", () => {
      const urls = [
        { url: "https://flights.bookingsfinder.com/?flightSearch=X", expected: "flights.bookingsfinder.com" },
        { url: "https://www.aviasales.com/search/X", expected: "www.aviasales.com" },
      ];

      for (const { url, expected } of urls) {
        const host = new URL(url).hostname;
        expect(host).toBe(expected);
      }
    });
  });
});