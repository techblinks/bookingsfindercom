/**
 * BF-FLIGHTS-LIVE-3 Round 3 — pre-merge UX polish based on real Cloudflare
 * preview screenshots: remove the redundant large zero-fare card, fix
 * Search Live Flights' icon to reflect its actual (same-page-scroll)
 * behavior.
 *
 * BF-FLIGHTS-LIVE-4: the embedded Travelpayouts Widget itself (and its
 * #tpwl-search/#tpwl-tickets containers, TravelpayoutsLiveFlights.tsx,
 * useTravelpayoutsWidget.ts) is removed — this file now also proves none
 * of that runtime remains, and exercises the native LiveFlightsSection's
 * own fallback button in its place.
 *
 * Mirrors the render/mocking setup already established in
 * FlightResults.liveFlightsEmbed.test.tsx.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import FlightResults from "@/pages/FlightResults";

const mockToastError = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (...a: unknown[]) => mockToastError(...a), success: vi.fn(), message: vi.fn() } }));

const mockGetRedirectUrl = vi.fn();
vi.mock("@/services/travelApi", () => ({
  getRedirectUrl: (...args: unknown[]) => mockGetRedirectUrl(...args),
}));

const mockLogAffiliateClick = vi.fn().mockResolvedValue(undefined);
vi.mock("@/lib/analytics", () => ({
  logAffiliateClick: (...args: unknown[]) => mockLogAffiliateClick(...args),
}));

const hoisted = vi.hoisted(() => ({
  isMobile: false,
  ads: {} as Record<string, unknown>,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => hoisted.isMobile,
  useIsBelowDesktop: () => hoisted.isMobile,
}));

vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({
    geoData: { currency: "AUD", currencySymbol: "A$", country: "Australia", countryCode: "AU", city: "Sydney", defaultOrigin: "SYD", defaultOriginName: "Sydney" },
    loading: false,
    regionConfig: {},
  }),
}));

vi.mock("@/hooks/useAds", () => ({
  useAds: () => ({ ads: hoisted.ads, trackImpression: vi.fn(), trackClick: vi.fn() }),
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: (name: string) => `https://mock.test/functions/v1/${name}`,
}));

const mockBuildWhiteLabelFlightUrl = vi.fn(() => ({
  success: true,
  url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2001&currency=AUD",
  currencyApplied: true,
  requestedCurrency: "AUD",
}));
vi.mock("@/lib/whiteLabelUrl", () => ({
  buildWhiteLabelFlightUrl: (...args: unknown[]) => (mockBuildWhiteLabelFlightUrl as any)(...args),
}));

function stubFetch(flights: unknown[]) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (String(url).includes("search-flights")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ flights, meta: { total_found: flights.length, is_complete: true } }),
      });
    }
    if (String(url).includes("get-price-calendar")) {
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ prices: [], success: true }) });
    }
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderResults(route: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[route]}>
        <TripProvider>
          <FlightResults />
        </TripProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const ECONOMY_ZERO_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=1&children=0&infants=0&cabinClass=economy";
const BUSINESS_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=1&children=0&infants=0&cabinClass=business";

const AD = {
  id: "ad-1", name: "Test Ad", type: "sponsored_card" as const, placement: "after_result_3" as const,
  page: "flights" as const, device: "all" as const, title: "Sponsored Title", description: "desc",
  cta_text: "Learn More", destination_url: "https://example.com", priority: 1,
};

beforeEach(() => {
  mockToastError.mockReset();
  mockGetRedirectUrl.mockReset();
  mockLogAffiliateClick.mockClear();
  mockBuildWhiteLabelFlightUrl.mockClear();
  hoisted.isMobile = false;
  hoisted.ads = {};
  Element.prototype.scrollIntoView = vi.fn();
});

// ── Items 1, 2: the redundant large card is gone, compact sentence remains ──

describe("FlightResults — Round 3 Fix 1: no redundant large zero-fare card", () => {
  it("item 1: does not render 'No Exact Recent Fare Data Found' when zero cached observations and Live Flights is available", async () => {
    stubFetch([]);
    const { container } = renderResults(ECONOMY_ZERO_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(container.textContent).not.toMatch(/no exact recent fare data found/i);
  });

  it("item 2: the compact truthful sentence remains", async () => {
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(
      screen.getByText(/no exact recent fare observation is available for these dates\. live flights may still be available below\./i)
    ).toBeTruthy());
  });

  it("does not render the empty-state card's own duplicate Search Live Flights / Modify Search / Clear All Filters row", async () => {
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    // Only the sticky-header instance remains.
    expect(screen.getAllByRole("button", { name: /search live flights/i }).length).toBe(1);
    expect(screen.queryByRole("button", { name: /^modify search$/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /clear all filters/i })).toBeNull();
  });
});

// ── Items 3, 4, 5: Live Flights section and its documented containers remain ──

describe("FlightResults — Round 3: Live Flights section and containers remain at zero", () => {
  it("item 3: the Live Flights section remains", async () => {
    stubFetch([]);
    const { container } = renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(container.querySelector("#live-flights-section")).toBeTruthy());
  });

  it("BF-FLIGHTS-LIVE-4: no tpwl-search/tpwl-tickets Travelpayouts Widget runtime remains", async () => {
    stubFetch([]);
    const { container } = renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(container.querySelector("#live-flights-section")).toBeTruthy());
    expect(container.querySelector("#tpwl-search")).toBeNull();
    expect(container.querySelector("#tpwl-tickets")).toBeNull();
  });
});

// ── Items 6, 7: supporting content still renders ──

describe("FlightResults — Round 3: supporting content (Try Different Dates / Explore destinations) remains", () => {
  it("item 6: Try Different Dates remains", async () => {
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText("Try Different Dates")).toBeTruthy());
  });

  it("item 7: Explore other destinations remains", async () => {
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText(/explore other destinations from/i)).toBeTruthy());
  });
});

// ── Item 8/9: icon semantics reflect actual behavior ──

describe("FlightResults — Round 3 Fix 2: icon semantics match actual behavior", () => {
  it("item 8: the sticky-header Search Live Flights button (same-page scroll) has no ExternalLink icon", async () => {
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    const btn = screen.getByRole("button", { name: /^search live flights$/i });
    expect(btn.querySelector("svg.lucide-external-link")).toBeNull();
  });

  it("item 9: 'Open full flight search' (genuinely leaves the site) keeps its ExternalLink icon", async () => {
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);
    const btn = await screen.findByRole("button", { name: /open full flight search/i });
    expect(btn.querySelector("svg.lucide-external-link")).toBeTruthy();
  });

  it("the Business cabin CTA (same-page scroll) also has no ExternalLink icon", async () => {
    stubFetch([]);
    renderResults(BUSINESS_URL);
    const btn = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(btn.querySelector("svg.lucide-external-link")).toBeNull();
  });
});

// ── Item 10: unavailable-live-search fallback still works ──

describe("FlightResults — Round 3: unavailable-live-search fallback still works", () => {
  it("item 10: when the live search is unavailable, the native section's fallback still redirects to the full Page White Label search", async () => {
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    fireEvent.click(await screen.findByRole("button", { name: /open full flight search/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalled());
    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
  });
});

// ── Item 11: zero-result sponsored placements still work ──

describe("FlightResults — Round 3: zero-result sponsored placements still work", () => {
  it("item 11: after_result_3 (before Live Flights) still renders with zero cached observations", async () => {
    hoisted.ads = { after_result_3: AD };
    stubFetch([]);
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sponsored Title" })).toBeTruthy());
  });
});

// ── Item 12: Business cached-price isolation remains ──

describe("FlightResults — Round 3: Business cached-price isolation remains", () => {
  it("item 12: Business never calls search-flights, even with the polished zero-state UI", async () => {
    const fetchMock = stubFetch([]);
    renderResults(BUSINESS_URL);
    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(fetchMock.mock.calls.some(([url]: [string]) => url.includes("search-flights"))).toBe(false);
  });
});

// Item 13 (Travelpayouts branding-hiding check) is removed under
// BF-FLIGHTS-LIVE-4 — there is no embedded third-party widget left to hide
// branding from; Live Flights results are BookingsFinder's own native UI.
