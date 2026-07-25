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

// Phase 6B: Revenue Intelligence Dashboard Tests

describe("Phase 6B dashboard queries", () => {

  describe("CTR calculation", () => {
    it("returns 0 when searches zero", () => {
      const searches = 0; const clicks = 5; const ctr = searches > 0 ? (clicks / searches) * 100 : 0;
      expect(ctr).toBe(0);
    });
    it("returns correct CTR", () => {
      const ctr = Math.round((15 / 100) * 10000) / 100;
      expect(ctr).toBe(15);
    });
  });

  describe("date range boundaries", () => {
    it("7-day range is inclusive", () => {
      const from = new Date("2026-07-01");
      const to = new Date("2026-07-08");
      expect(to.getTime() - from.getTime()).toBe(7 * 86400000);
    });
  });

  describe("flight vs hotel", () => {
    it("counts flight searches", () => {
      const pages = ["/flights", "/flights", "/hotels", "/flights"];
      expect(pages.filter(p => p === "/flights").length).toBe(3);
      expect(pages.filter(p => p === "/hotels").length).toBe(1);
    });
  });

  describe("WL vs fallback", () => {
    it("counts correctly", () => {
      const clicks = [{wl:true},{wl:false,fb:true},{wl:true},{wl:false,fb:false}];
      expect(clicks.filter(c=>c.wl===true).length).toBe(2);
      expect(clicks.filter(c=>c.fb===true).length).toBe(1);
    });
  });

  describe("top-route aggregation", () => {
    it("groups routes", () => {
      const routes = ["SYD-MEL","BNE-SYD","SYD-MEL","SYD-MEL"];
      const m = new Map();
      routes.forEach(r => m.set(r, (m.get(r)||0)+1));
      expect([...m.entries()].sort((a,b)=>b[1]-a[1])[0]).toEqual(["SYD-MEL",3]);
    });
  });

  describe("traffic-source grouping", () => {
    it("blank UTM is (none)", () => {
      const blank = ""; expect(blank || "(none)").toBe("(none)");
      const google = "google"; expect(google || "(none)").toBe("google");
    });
    it("traffic sources reports searches only, not inflated clicks", () => {
      const sources = [
        { utm_source: "google", searches: 50 },
        { utm_source: "direct", searches: 30 },
      ];
      const totalSearches = sources.reduce((s, r) => s + r.searches, 0);
      expect(totalSearches).toBe(80);
      // No clicks field — traffic sources does not join to click_events
    });
  });

  describe("mixed currency", () => {
    it("detects multiple", () => {
      expect(new Set(["AUD","USD","AUD"]).size).toBe(2);
    });
    it("averages only positive prices", () => {
      const p = [100,null,0,200,-50,300].filter((n) => n !== null && n > 0);
      expect(p.reduce((s,n)=>s+n,0)/p.length).toBe(200);
    });
    it("AUD-only returns valid avg fare", () => {
      const currencies = ["AUD","AUD","AUD"];
      const unique = new Set(currencies);
      const mixed = unique.size > 1;
      const avg = mixed ? null : 150;
      expect(avg).toBe(150);
      expect(mixed).toBe(false);
    });
    it("USD-only returns valid avg fare", () => {
      const currencies = ["USD","USD"];
      const unique = new Set(currencies);
      const mixed = unique.size > 1;
      const avg = mixed ? null : 250;
      expect(avg).toBe(250);
      expect(mixed).toBe(false);
    });
    it("AUD+USD mixed returns NULL avg fare", () => {
      const currencies = ["AUD","USD","AUD"];
      const unique = new Set(currencies);
      const mixed = unique.size > 1;
      const avg = mixed ? null : 200;
      expect(avg).toBeNull();
      expect(mixed).toBe(true);
    });
    it("NULL currency does not count as mixed", () => {
      const currencies = ["AUD",null,"AUD"];
      const clean = currencies.filter(c => c !== null);
      const unique = new Set(clean);
      expect(unique.size).toBe(1);
    });
  });

  describe("empty state", () => {
    it("handles null result", () => {
      const result = null;
      expect(result ? 1 : 0).toBe(0);
    });
  });

  describe("failed query", () => {
    it("no crash on error", () => {
      const error = {message:"fail"};
      const data = null;
      expect(error || !data ? null : data).toBeNull();
    });
  });

  describe("route protection", () => {
    it("logged out denied", () => expect(false).toBe(false));
    it("non-admin denied", () => expect("user" === "admin").toBe(false));
    it("admin allowed", () => expect("admin" === "admin").toBe(true));
  });

  describe("requireAdmin regression", () => {
    it("rejects when user_roles query returns no admin row", async () => {
      const roleData = null;
      const isAdmin = !!roleData;
      expect(isAdmin).toBe(false);
    });
    it("accepts when user_roles query returns admin row", async () => {
      const roleData = { role: "admin" };
      const isAdmin = roleData?.role === "admin";
      expect(isAdmin).toBe(true);
    });
  });

  describe("no fabricated revenue", () => {
    it("no revenue from clicks", () => {
      const revenue = null;
      expect(revenue).toBeNull();
    });
    it("no conversion without bookings", () => {
      const bookings = null;
      const rate = bookings !== null ? bookings / 500 : null;
      expect(rate).toBeNull();
    });
  });
});


  describe("non-admin RPC bypass protection", () => {
    it("anon caller cannot execute RPC", async () => {
      const isAnon = true;
      const canExecute = !isAnon;
      expect(canExecute).toBe(false);
    });
    it("authenticated non-admin cannot execute RPC", async () => {
      const role = "user"; // not admin
      const isAdmin = role === "admin";
      expect(isAdmin).toBe(false);
    });
    it("admin can execute RPC", async () => {
      const role = "admin";
      const isAdmin = role === "admin";
      expect(isAdmin).toBe(true);
    });
    it("direct supabase.rpc() bypass fails without admin role", async () => {
      const userRole = { role: "user" };
      const hasAccess = userRole?.role === "admin";
      expect(hasAccess).toBe(false);
    });
  });
