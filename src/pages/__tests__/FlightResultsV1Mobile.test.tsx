import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import FlightResults from "@/pages/FlightResults";

const hoisted = vi.hoisted(() => ({ isMobile: false }));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => hoisted.isMobile,
  useIsBelowDesktop: () => hoisted.isMobile,
}));
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({ geoData: { currency: "USD", currencySymbol: "$", defaultOrigin: "BNE", defaultOriginName: "Brisbane" } }),
}));
vi.mock("@/hooks/useFlightSearch", () => ({
  useFlightSearch: () => ({
    flights: [], meta: { total_found: 0, is_complete: true }, isLoading: false, isSearching: false, error: null, retry: vi.fn(),
    filters: { priceRange: [0,10000], maxPrice: 10000, minPrice: 0, selectedAirlines: [], selectedStops: [], selectedDepartureTimes: [], durationRange: [0,1440], maxDuration: 1440 },
    sortBy: "best", setSortBy: vi.fn(), updateFilter: vi.fn(), resetFilters: vi.fn(),
    filteredFlights: [], airlines: [], searchProgress: 0, cheapestPrice: 0, fastestDuration: 0,
  }),
  formatDuration: () => "2h 30m",
}));
vi.mock("@/hooks/useAds", () => ({ useAds: () => ({ ads: {}, trackImpression: vi.fn(), trackClick: vi.fn() }) }));
vi.mock("@/hooks/useHeroMedia", () => ({ useHeroMedia: () => ({ data: null, isLoading: false, error: null, isComplete: false, isUsingFallback: true }), invalidateHeroMediaCache: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({}));

const RESULTS_ROUTE = "/flights?origin=BNE&destination=SYD&departureDate=2026-08-18&adults=1&children=0&infants=0&cabinClass=economy&passengers=1";

function renderFlightResults(route = "/flights") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <TripProvider>
          <FlightResults />
        </TripProvider>
      </MemoryRouter>
    </HelmetProvider>
  );
}

beforeEach(() => {
  hoisted.isMobile = false;
  vi.clearAllMocks();
});

describe("Flights V1 Mobile — landing", () => {
  it("renders MobileFlightSearch on mobile landing", () => {
    hoisted.isMobile = true;
    renderFlightResults();
    expect(screen.getAllByText("Flights").length).toBeGreaterThan(0);
    expect(screen.getByText("Round trip")).toBeTruthy();
    expect(screen.getByRole("button", { name: /search flights/i })).toBeTruthy();
  });

  it("renders FlightLandingPage on desktop landing", () => {
    hoisted.isMobile = false;
    renderFlightResults();
    expect(screen.getByText(/compare flights/i)).toBeTruthy();
  });
});

describe("Flights V1 Mobile — sort", () => {
  it("mobile results show Best/Cheapest/Fastest segmented control", () => {
    hoisted.isMobile = true;
    renderFlightResults(RESULTS_ROUTE);
    expect(screen.getByText("Best")).toBeTruthy();
    expect(screen.getByText("Cheapest")).toBeTruthy();
    expect(screen.getByText("Fastest")).toBeTruthy();
  });

  it("Best sort has aria-checked=true when sortBy is best", () => {
    hoisted.isMobile = true;
    renderFlightResults(RESULTS_ROUTE);
    const bestBtn = screen.getByRole("radio", { name: "Best" });
    expect(bestBtn.getAttribute("aria-checked")).toBe("true");
  });

  it("desktop does not show mobile sort control", () => {
    hoisted.isMobile = false;
    renderFlightResults(RESULTS_ROUTE);
    // Desktop uses SortDropdown, the mobile radiogroup should not render
    expect(screen.queryByRole("radiogroup")).toBeNull();
  });
});

describe("Flights V1 Mobile — no filters", () => {
  it("mobile results do not show Filters panel text", () => {
    hoisted.isMobile = true;
    renderFlightResults(RESULTS_ROUTE);
    // Sidebar is hidden on mobile. Check that the main content renders.
    // BF-FLIGHTS-LIVE-3 Round 3 Fix 1: this used to match "No Exact Recent
    // Fare Data Fou[nd]" — that large card is now suppressed at true zero
    // (meta.total_found === 0, as this file's useFlightSearch mock
    // returns), so the presence check instead targets the compact
    // truthful sentence that replaced it as the zero-result content.
    expect(screen.getAllByText(/no exact recent fare observation is available/i).length).toBeGreaterThan(0);
  });
});

describe("Flights V1 Mobile — QuickEdit", () => {
  it("MobileQuickEditBar renders route info on mobile results", () => {
    hoisted.isMobile = true;
    renderFlightResults(RESULTS_ROUTE);
    // MobileQuickEditBar should show origin/destination codes
    expect(screen.queryByText("BNE")).toBeTruthy();
    expect(screen.queryByText("SYD")).toBeTruthy();
  });
});

describe("Flights V1 Mobile — bottom spacing", () => {
  it("mobile results have extra bottom padding", () => {
    hoisted.isMobile = true;
    const { container } = renderFlightResults(RESULTS_ROUTE);
    const main = container.querySelector("main");
    expect(main?.className).toContain("pb-24");
  });
});
