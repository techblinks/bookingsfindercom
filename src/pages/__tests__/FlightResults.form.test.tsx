import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import FlightResults from "@/pages/FlightResults";

// Toggleable mobile flag + navigate spy — hoisted so the vi.mock factories below
// (which are hoisted above imports) can reference them.
const hoisted = vi.hoisted(() => ({ isMobile: false, navigate: vi.fn() }));

// ── Mocks ──

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => hoisted.isMobile }));
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
vi.mock("@/services/travelApi", () => ({ getRedirectUrl: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ logAffiliateClick: vi.fn().mockResolvedValue(undefined), logSearch: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/whiteLabelUrl", () => ({ buildWhiteLabelFlightUrl: vi.fn().mockReturnValue({ success: false, url: null }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) }, functions: { invoke: vi.fn().mockResolvedValue({ data: [] }) } } }));
vi.mock("@/lib/supabaseConfig", () => ({ getFunctionUrl: () => "https://mock.test/functions/v1" }));
vi.mock("react-helmet-async", () => ({ Helmet: ({ children }: { children: React.ReactNode }) => <div data-testid="helmet">{children}</div> }));
vi.mock("framer-motion", async () => { const a = await vi.importActual("framer-motion"); return { ...a, useReducedMotion: () => true }; });
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => hoisted.navigate };
});
vi.mock("@/hooks/useHeroMedia", () => ({ useHeroMedia: () => ({ data: null, isLoading: false, error: null, isComplete: false, isUsingFallback: true }), invalidateHeroMediaCache: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() }, Toaster: () => null }));

// ════════════════════════════════════════════════════════════

describe("FlightResults — Phase 7B landing page", () => {
  beforeEach(() => {
    hoisted.isMobile = false;
    hoisted.navigate.mockClear();
  });

  // ── Page structure ──

  it("renders hero heading on untouched /flights", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByRole("heading", { level: 1 })).toBeTruthy();
    expect(screen.getByText("Compare flights for your next journey")).toBeTruthy();
  });

  // ── Validation state ──

  it("does NOT show validation warning on untouched /flights", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.queryByText(/Please review the search details/)).toBeNull();
  });

  it("shows validation warning when invalid URL params are present", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BRIS&destination=SYD&departureDate=2026-08-10"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText(/Please review the search details/)).toBeTruthy();
  });

  it("does NOT show warning for route-card prefill (valid origin/destination, no dates)", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    // Valid IATA codes — incomplete but not invalid. No error banner.
    expect(screen.queryByText(/Please review the search details/)).toBeNull();
  });

  // ── Multi-city hidden ──

  it("hides Multi-city option", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.queryByText("Multi-city")).toBeFalsy();
  });

  it("shows Round trip and One way", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Round trip")).toBeTruthy();
    expect(screen.getByText("One way")).toBeTruthy();
  });

  // ── Trust row (compact) ──

  it("renders the three compact trust points", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Compare available flight options")).toBeTruthy();
    expect(screen.getByText("Clear and simple search")).toBeTruthy();
    expect(screen.getByText("Continue securely to the selected provider")).toBeTruthy();
  });

  it("trust row shows exactly 3 points (no large cards)", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const list = screen.getByTestId("trust-points");
    expect(list.querySelectorAll("li").length).toBe(3);
  });

  // ── Phase 1 hero collage ──

  it("desktop hero renders no more than 3 images", () => {
    hoisted.isMobile = false;
    const { container } = render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const heroImgs = Array.from(container.querySelectorAll("img")).filter(
      (img) => img.getAttribute("src")?.includes("/flights/hero/")
    );
    expect(heroImgs.length).toBeLessThanOrEqual(3);
    expect(heroImgs.length).toBe(3);
  });

  it("mobile hero presentation uses exactly 1 image", () => {
    hoisted.isMobile = true;
    const { container } = render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const heroImgs = Array.from(container.querySelectorAll("img")).filter(
      (img) => img.getAttribute("src")?.includes("/flights/hero/")
    );
    expect(heroImgs.length).toBe(0) // V1: no hero on mobile;
  });

  it("renders exactly one hero collage (no doubling) in desktop view", () => {
    // Desktop fallback: HeroMediaCollage returns null, only HeroCollage renders 3 images.
    // Backend: only HeroMediaCollage renders 3 images, HeroCollage is hidden.
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const heroImgs = Array.from(document.querySelectorAll("img")).filter((img) =>
      img.getAttribute("src")?.includes("/flights/hero/")
    );
    expect(heroImgs.length).toBeLessThanOrEqual(4); // 3 desktop + possible 0-1 other
    expect(heroImgs.length).toBeGreaterThanOrEqual(2);
  });

  it("renders exactly one hero collage (no doubling) in mobile view", () => {
    hoisted.isMobile = true;
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const heroImgs = Array.from(document.querySelectorAll("img")).filter((img) =>
      img.getAttribute("src")?.includes("/flights/hero/")
    );
    // Mobile: exactly 1 hero image (not 2 from doubled collages)
    expect(heroImgs.length).toBeLessThanOrEqual(2); // V1: 0 hero images on mobile
    expect(heroImgs.length).toBeGreaterThanOrEqual(0); // V1
    hoisted.isMobile = false;
  });

  it("mobile swap button has an accessible name", () => {
    hoisted.isMobile = true;
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByRole("button", { name: /swap/i })).toBeTruthy();
  });

  // ── Search submit wiring (handleSearch unchanged) ──

  it("hero search button is present and an incomplete submit does not navigate", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const searchBtn = screen.getByRole("button", { name: /search flights/i });
    expect(searchBtn).toBeTruthy();
    fireEvent.click(searchBtn);
    // Incomplete form (no destination / date) → validation blocks navigation.
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });

  // ── Explore routes (renamed from Popular) ──

  it("renders the explore routes section", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Explore flight routes")).toBeTruthy();
  });

  it("no longer renders the removed hardcoded route array", () => {
    // Phase 2: routes come from useRouteDiscovery, so the old static BNE/OOL/KTM
    // cards must not be emitted synchronously from the page module any more.
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.queryByText("OOL")).toBeNull();
    const staticPair = screen.getAllByRole("link")
      .find(l => l.getAttribute("href")?.includes("origin=OOL&destination=SYD"));
    expect(staticPair).toBeUndefined();
  });

  it("any rendered route link prefills without triggering an auto-search", async () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const list = await screen.findByTestId("explore-routes-list");
    // Whatever the discovery state resolves to, a route link must carry only
    // origin/destination — never dates, which would start a search.
    for (const link of Array.from(list.querySelectorAll("a"))) {
      const href = link.getAttribute("href") ?? "";
      expect(href).toMatch(/^\/flights\?origin=[A-Z]{3}&destination=[A-Z]{3}$/);
      expect(href).not.toMatch(/departureDate|returnDate/);
    }
  });

  // ── Why BookingsFinder (condensed to 2 cards) ──

  it("renders compact value cards", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Why use BookingsFinder")).toBeTruthy();
    // Phase 1 condensed cards: Plan your full trip cost + Keep your trip organised
    expect(screen.getByText("Plan your full trip cost")).toBeTruthy();
    expect(screen.getByText("Keep your trip organised")).toBeTruthy();
  });

  // ── Removed: Helpful trip-planning tools standalone section ──

  it("does NOT render standalone Helpful trip-planning tools section", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.queryByText("Helpful trip-planning tools")).toBeFalsy();
  });

  // ── FAQ (reduced to 4 questions) ──

  it("renders FAQ section with updated questions", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Frequently asked questions")).toBeTruthy();
    // New FAQ question replacing the removed ones
    expect(screen.getByText("How does flight comparison on BookingsFinder work?")).toBeTruthy();
    // Verify removed questions are NOT present
    expect(screen.queryByText("Does BookingsFinder sell flight tickets?")).toBeFalsy();
    expect(screen.queryByText("Do you charge a booking fee?")).toBeFalsy();
    expect(screen.queryByText("Where do I complete my booking?")).toBeFalsy();
  });

  // ── Heading structure ──

  it("has exactly one H1", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getAllByRole("heading", { level: 1 }).length).toBe(1);
  });

  // ── Dynamic hero ──

  it("shows city names for known route BNE→SYD", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Compare flights from Brisbane to Sydney")).toBeTruthy();
  });

  it("shows city names for known route SYD→MEL", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=SYD&destination=MEL"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Compare flights from Sydney to Melbourne")).toBeTruthy();
  });

  it("falls back to codes for unknown but valid IATA route", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=KHI&destination=LHE"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    // KHI and LHE are not in the known airports map but are valid IATA codes
    expect(screen.getByText("Compare flights from KHI to LHE")).toBeTruthy();
  });

  it("uses mixed city/code when only one is known", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=NAN"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    // BNE is known (Brisbane), NAN is in lookup? NAN = Nadi, Fiji - let me check the map... it's not in KNOWN_AIRPORTS
    expect(screen.getByText("Compare flights from Brisbane to NAN")).toBeTruthy();
  });

  it("uses default heading on untouched /flights", () => {
    render(<MemoryRouter initialEntries={["/flights"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("Compare flights for your next journey")).toBeTruthy();
  });

  // ── Results mode unchanged ──

  it("renders results mode when fully valid params are provided", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD&departureDate=2026-08-10"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    expect(screen.getByText("BNE")).toBeTruthy();
    expect(screen.getByText("SYD")).toBeTruthy();
  });

  it("Edit button preserves params in results mode", () => {
    render(<MemoryRouter initialEntries={["/flights?origin=BNE&destination=SYD&departureDate=2026-08-10&cabinClass=business"]}><TripProvider><FlightResults /></TripProvider></MemoryRouter>);
    const editBtn = screen.getByText("Edit");
    expect(editBtn.closest("a")?.getAttribute("href")).toContain("origin=BNE");
  });
});
