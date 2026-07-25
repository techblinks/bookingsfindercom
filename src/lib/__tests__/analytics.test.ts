import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

// Mock supabase
const mockInsert = vi.fn();
const mockFrom = vi.fn();
const mockGetSession = vi.fn();
const mockIsApprovedOutboundHost = vi.fn();

vi.mock("@/lib/travelConfig", () => ({
  isApprovedOutboundHost: (...args: unknown[]) => mockIsApprovedOutboundHost(...args),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  },
}));

// ── Helpers ──────────────────────────────────────────────────────

function setupDOM() {
  const storage = new Map<string, string>();
  vi.stubGlobal("sessionStorage", {
    getItem: (k: string) => storage.get(k) ?? null,
    setItem: (k: string, v: string) => { storage.set(k, v); },
  });
  vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("window", { location: { pathname: "/flights", search: "" } });
  vi.stubGlobal("crypto", { randomUUID: () => "test-uuid-5678" });
}

function setupAdminSession() {
  mockGetSession.mockResolvedValue({ data: { session: { user: { id: "admin-1" } } }, error: null });
}

// ── Tests ────────────────────────────────────────────────────────

describe("analytics service — Phase 6A security", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsApprovedOutboundHost.mockReturnValue(true); // default: approve all
    setupDOM();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // ── 1. search event logging ──────────────────────────────────

  describe("logSearch", () => {
    it("inserts exactly one search event per call", async () => {
      let insertCount = 0;
      mockFrom.mockReturnValue({
        insert: vi.fn(() => {
          insertCount++;
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: "evt-1" }, error: null })),
            })),
          };
        }),
      });

      const { logSearch } = await import("@/lib/analytics");
      await logSearch({ origin: "BNE", destination: "SYD" });
      await logSearch({ origin: "MEL", destination: "PER" });
      expect(insertCount).toBe(2);
    });

    it("returns null and does not throw on failure", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({ data: null, error: { message: "DB error" } })),
          })),
        })),
      });

      const { logSearch } = await import("@/lib/analytics");
      const id = await logSearch({ origin: "SFO", destination: "JFK" });
      expect(id).toBeNull();
    });

    it("handles thrown exceptions gracefully", async () => {
      mockFrom.mockImplementation(() => { throw new Error("Connection refused"); });

      const { logSearch } = await import("@/lib/analytics");
      const id = await logSearch({ origin: "SFO" });
      expect(id).toBeNull();
    });

    it("does not set user_id (anonymous caller does not forge user_id)", async () => {
      let capturedInsert: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((payload: Record<string, unknown>) => {
          capturedInsert = payload;
          return {
            select: vi.fn(() => ({
              single: vi.fn(() => Promise.resolve({ data: { id: "evt-2" }, error: null })),
            })),
          };
        }),
      });

      const { logSearch } = await import("@/lib/analytics");
      await logSearch({ origin: "BNE", destination: "SYD" });
      expect(capturedInsert).toBeDefined();
      // user_id is not set at all by the analytics service
      expect(capturedInsert!.user_id).toBeUndefined();
      expect(capturedInsert!.session_id).toBe("test-uuid-5678");
    });
  });

  // ── 2. click event logging ────────────────────────────────────

  describe("logAffiliateClick", () => {
    it("inserts exactly one click event per call", async () => {
      let insertCount = 0;
      mockFrom.mockReturnValue({
        insert: vi.fn(() => {
          insertCount++;
          return Promise.resolve({ error: null });
        }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({ partner: "aviasales", partnerType: "flight" });
      expect(insertCount).toBe(1);
    });

    it("does not throw on failure", async () => {
      mockFrom.mockReturnValue({
        insert: vi.fn(() => Promise.resolve({ error: { message: "timeout" } })),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await expect(
        logAffiliateClick({ partner: "test", partnerType: "flight" })
      ).resolves.toBeUndefined();
    });

    it("stores outboundHost instead of full destination URL", async () => {
      let capturedInsert: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((payload: Record<string, unknown>) => {
          capturedInsert = payload;
          return Promise.resolve({ error: null });
        }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({
        partner: "flights.bookingsfinder.com",
        partnerType: "flight",
        outboundHost: "flights.bookingsfinder.com",
        whiteLabelUsed: true,
      });

      expect(capturedInsert).toBeDefined();
      expect(capturedInsert!.outbound_host).toBe("flights.bookingsfinder.com");
      // No full URL stored
      expect(capturedInsert!).not.toHaveProperty("destination_url");
    });

    it("sets white_label_used and fallback_used metadata", async () => {
      let wlCapture: Record<string, unknown> | null = null;
      let fbCapture: Record<string, unknown> | null = null;

      mockFrom.mockImplementation((table: string) => {
        if (table === "click_events") {
          return {
            insert: vi.fn((payload: Record<string, unknown>) => {
              if (payload.white_label_used) wlCapture = payload;
              if (payload.fallback_used) fbCapture = payload;
              return Promise.resolve({ error: null });
            }),
          };
        }
        return { insert: vi.fn(() => Promise.resolve({ error: null })) };
      });

      const { logAffiliateClick } = await import("@/lib/analytics");

      await logAffiliateClick({
        partner: "flights.bookingsfinder.com",
        partnerType: "flight",
        whiteLabelUsed: true,
        fallbackUsed: false,
        outboundHost: "flights.bookingsfinder.com",
      });

      expect(wlCapture!.white_label_used).toBe(true);
      expect(wlCapture!.fallback_used).toBe(false);
    });
  });

  // ── 3. data validation ────────────────────────────────────────

  describe("payload sanitisation", () => {
    it("uppercases origin and destination", async () => {
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => {
          captured = p;
          return { select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: "x" }, error: null })) })) };
        }),
      });

      const { logSearch } = await import("@/lib/analytics");
      await logSearch({ origin: "bne", destination: "syd" });
      expect(captured!.origin).toBe("BNE");
      expect(captured!.destination).toBe("SYD");
    });

    it("defaults currency to AUD when not provided", async () => {
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => {
          captured = p;
          return { select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: "x" }, error: null })) })) };
        }),
      });

      const { logSearch } = await import("@/lib/analytics");
      await logSearch({ origin: "BNE", destination: "SYD" });
      expect(captured!.currency).toBe("AUD");
    });

    it("defaults trip_type to oneway", async () => {
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => {
          captured = p;
          return { select: vi.fn(() => ({ single: vi.fn(() => Promise.resolve({ data: { id: "x" }, error: null })) })) };
        }),
      });

      const { logSearch } = await import("@/lib/analytics");
      await logSearch({ origin: "BNE", destination: "SYD" });
      expect(captured!.trip_type).toBe("oneway");
    });
  });


  // ── 4. outbound_host allowlisting ─────────────────────────────

  describe("outbound_host allowlisting", () => {
    it("stores approved Aviasales hostname", async () => {
      mockIsApprovedOutboundHost.mockReturnValue(true);
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => { captured = p; return Promise.resolve({ error: null }); }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({
        partner: "www.aviasales.com",
        partnerType: "flight",
        outboundHost: "www.aviasales.com",
      });

      expect(captured!.outbound_host).toBe("www.aviasales.com");
      expect(mockIsApprovedOutboundHost).toHaveBeenCalledWith("www.aviasales.com", "flight");
    });

    it("stores approved Hotellook hostname", async () => {
      mockIsApprovedOutboundHost.mockReturnValue(true);
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => { captured = p; return Promise.resolve({ error: null }); }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({
        partner: "search.hotellook.com",
        partnerType: "hotel",
        outboundHost: "search.hotellook.com",
      });

      expect(captured!.outbound_host).toBe("search.hotellook.com");
    });

    it("stores approved White Label hostname", async () => {
      mockIsApprovedOutboundHost.mockReturnValue(true);
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => { captured = p; return Promise.resolve({ error: null }); }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({
        partner: "flights.bookingsfinder.com",
        partnerType: "flight",
        outboundHost: "flights.bookingsfinder.com",
        whiteLabelUsed: true,
      });

      expect(captured!.outbound_host).toBe("flights.bookingsfinder.com");
    });

    it("rejects lookalike host (stores NULL)", async () => {
      mockIsApprovedOutboundHost.mockReturnValue(false); // fails validation
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => { captured = p; return Promise.resolve({ error: null }); }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({
        partner: "aviasales.com.evil.example",
        partnerType: "flight",
        outboundHost: "aviasales.com.evil.example",
      });

      expect(captured!.outbound_host).toBeNull();
    });

    it("rejects arbitrary host (stores NULL)", async () => {
      mockIsApprovedOutboundHost.mockReturnValue(false);
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => { captured = p; return Promise.resolve({ error: null }); }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({
        partner: "evil.example.com",
        partnerType: "flight",
        outboundHost: "evil.example.com",
      });

      expect(captured!.outbound_host).toBeNull();
    });

    it("accepts NULL outboundHost (no destination available)", async () => {
      let captured: Record<string, unknown> | null = null;
      mockFrom.mockReturnValue({
        insert: vi.fn((p: Record<string, unknown>) => { captured = p; return Promise.resolve({ error: null }); }),
      });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await logAffiliateClick({
        partner: "aviasales",
        partnerType: "flight",
        outboundHost: null,
      });

      expect(captured!.outbound_host).toBeNull();
      expect(mockIsApprovedOutboundHost).not.toHaveBeenCalled();
    });
  });

  // ── 5. admin gating ───────────────────────────────────────────

  describe("admin gating", () => {
    it("getDashboardSummary requires authenticated session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { getDashboardSummary } = await import("@/lib/analytics");
      await expect(getDashboardSummary()).rejects.toThrow("Authentication required");
    });

    it("getTopRoutes requires authenticated session", async () => {
      mockGetSession.mockResolvedValue({ data: { session: null }, error: null });

      const { getTopRoutes } = await import("@/lib/analytics");
      await expect(getTopRoutes()).rejects.toThrow("Authentication required");
    });
  });

  // ── 6. failure isolation ─────────────────────────────────────

  describe("failure isolation", () => {
    it("logSearch failure does not throw", async () => {
      mockFrom.mockImplementation(() => { throw new Error("Network error"); });

      const { logSearch } = await import("@/lib/analytics");
      // Must not throw
      await expect(logSearch({ origin: "BNE", destination: "SYD" })).resolves.toBeNull();
    });

    it("logAffiliateClick failure does not throw", async () => {
      mockFrom.mockImplementation(() => { throw new Error("Network error"); });

      const { logAffiliateClick } = await import("@/lib/analytics");
      await expect(logAffiliateClick({ partner: "test", partnerType: "flight" })).resolves.toBeUndefined();
    });
  });
});
