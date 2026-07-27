import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import FlightResults from "@/pages/FlightResults";

// ── Mocks ──

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({ geoData: { currency: "USD", currencySymbol: "$", defaultOrigin: "BNE", defaultOriginName: "Brisbane" } }),
}));
vi.mock("@/hooks/useFlightSearch", () => ({
  useFlightSearch: () => ({
    flights: [], meta: { total_found: 0, is_complete: true }, isLoading: false, isSearching: false, error: null, retry: vi.fn(),
    filters: { priceRange: [0,10000], maxPrice: 10000, minPrice: 0, selectedAirlines: [], selectedStops: [], selectedDepartureTimes: [], durationRange: [0,1440], maxDuration: 1440 },
    sortBy: "best", setSortBy: vi.fn(), updateFilter: vi.fn(), resetFilters: vi.fn(),
    filteredFlights: [], airlines: [], searchProgress: 100, cheapestPrice: 0, fastestDuration: 0,
  }),
  formatDuration: () => "1h 30m",
}));
vi.mock("@/hooks/useAds", () => ({ useAds: () => ({ ads: {}, trackImpression: vi.fn(), trackClick: vi.fn() }) }));
vi.mock("@/services/travelApi", () => ({ getRedirectUrl: vi.fn(), trackAffiliateEvent: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ logAffiliateClick: vi.fn().mockResolvedValue(undefined), logSearch: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/whiteLabelUrl", () => ({ buildWhiteLabelFlightUrl: vi.fn().mockReturnValue({ success: false, url: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) }, functions: { invoke: vi.fn().mockResolvedValue({ data: [] }) } } }));
vi.mock("@/lib/supabaseConfig", () => ({ getFunctionUrl: () => "https://mock.test/functions/v1" }));
vi.mock("react-helmet-async", () => ({ Helmet: ({ children }: { children: React.ReactNode }) => <div data-testid="helmet">{children}</div> }));
vi.mock("framer-motion", async () => { const a = await vi.importActual("framer-motion"); return { ...a, useReducedMotion: () => true }; });

// ════════════════════════════════════════════════════════════

describe("FlightResults — Phase 7B landing page", () => {
  // ── Page structure ──

  it("renders hero heading on untouched /flights", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("Compare flights with BookingsFinder")).toBeTruthy();
  });

  // ── Validation state ──

  it("does NOT show validation warning on untouched /flights", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.queryByText(/Please review the search details/)).toBeNull();
  });

  it("shows validation warning when invalid URL params are present", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BRIS&destination=SYD&departureDate=2026-08-10"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText(/Please review the search details/)).toBeTruthy();
  });

  it("does NOT show warning for route-card prefill (valid origin/destination, no dates)", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD"]}><FlightResults /></MemoryRouter>);
    // Valid IATA codes — incomplete but not invalid. No error banner.
    expect(screen.queryByText(/Please review the search details/)).toBeNull();
  });

  // ── Multi-city hidden ──

  it("hides Multi-city option", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.queryByText("Multi-city")).toBeFalsy();
  });

  it("shows Round trip and One way", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Round trip")).toBeTruthy();
    expect(screen.getByText("One way")).toBeTruthy();
  });

  // ── Trust strip ──

  it("renders trust strip items", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Compare live partner fares")).toBeTruthy();
    expect(screen.getByText("No fee from BookingsFinder")).toBeTruthy();
  });

  // ── Popular routes ──

  it("renders popular route cards", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Popular flight routes")).toBeTruthy();
    expect(screen.getAllByText("BNE").length).toBeGreaterThan(0);
  });

  it("route cards link without departureDate (no auto-search)", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    const links = screen.getAllByRole("link");
    const routeLink = links.find(l => l.getAttribute("href")?.includes("origin=BNE&destination=SYD"));
    expect(routeLink).toBeTruthy();
    expect(routeLink?.getAttribute("href")).not.toMatch(/departureDate/);
  });

  // ── Why BookingsFinder ──

  it("renders value cards", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Why use BookingsFinder")).toBeTruthy();
    expect(screen.getByText("Compare before choosing")).toBeTruthy();
  });

  // ── Tools — only verified working ──

  it("renders only the verified working tool (Trip Cost Planner)", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Helpful trip-planning tools")).toBeTruthy();
    // Only Trip Cost Planner should appear
    expect(screen.getAllByText("Trip Cost Planner").length).toBeGreaterThan(0);
  });

  it("does NOT show placeholder tools in the tools section", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    // The "Helpful trip-planning tools" section should only contain Trip Cost Planner
    // Footer may also render links with these names, so use getAllByText to check count
    const passportMatches = screen.queryAllByText("Passport Validity");
    const visaMatches = screen.queryAllByText("Visa Requirements");
    const packingMatches = screen.queryAllByText("Packing Checklist");
    // At most 1 match from Footer, none from the tools section
    expect(passportMatches.length).toBeLessThanOrEqual(1);
    expect(visaMatches.length).toBeLessThanOrEqual(1);
    expect(packingMatches.length).toBeLessThanOrEqual(1);
    // "Coming soon" badge should not be present at all
    expect(screen.queryByText("Coming soon")).toBeFalsy();
  });

  it("tool link resolves to a valid route", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    const links = screen.getAllByRole("link");
    const toolLink = links.find(l => l.getAttribute("href") === "/trip-cost");
    expect(toolLink).toBeTruthy();
  });

  // ── FAQ ──

  it("renders FAQ section", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Frequently asked questions")).toBeTruthy();
    expect(screen.getByText("Does BookingsFinder sell flight tickets?")).toBeTruthy();
  });

  // ── Heading structure ──

  it("has exactly one H1", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
  });

  // ── Dynamic hero ──

  it("shows city names for known route BNE→SYD", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Compare flights from Brisbane to Sydney")).toBeTruthy();
  });

  it("shows city names for known route SYD→MEL", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=SYD&destination=MEL"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Compare flights from Sydney to Melbourne")).toBeTruthy();
  });

  it("falls back to codes for unknown but valid IATA route", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=KHI&destination=LHE"]}><FlightResults /></MemoryRouter>);
    // KHI and LHE are not in the known airports map but are valid IATA codes
    expect(screen.getByText("Compare flights from KHI to LHE")).toBeTruthy();
  });

  it("uses mixed city/code when only one is known", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=NAN"]}><FlightResults /></MemoryRouter>);
    // BNE is known (Brisbane), NAN is in lookup? NAN = Nadi, Fiji - let me check the map... it's not in KNOWN_AIRPORTS
    expect(screen.getByText("Compare flights from Brisbane to NAN")).toBeTruthy();
  });

  it("uses default heading on untouched /flights", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("Compare flights with BookingsFinder")).toBeTruthy();
  });

  // ── Results mode unchanged ──

  it("renders results mode when fully valid params are provided", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD&departureDate=2026-08-10"]}><FlightResults /></MemoryRouter>);
    expect(screen.getByText("BNE")).toBeTruthy();
    expect(screen.getByText("SYD")).toBeTruthy();
  });

  it("Edit button preserves params in results mode", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD&departureDate=2026-08-10&cabinClass=business"]}><FlightResults /></MemoryRouter>);
    const editBtn = screen.getByText("Edit");
    expect(editBtn.closest("a")?.getAttribute("href")).toContain("origin=BNE");
  });
});
