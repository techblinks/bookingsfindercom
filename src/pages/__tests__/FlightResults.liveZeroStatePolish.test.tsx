/**
 * BF-FLIGHTS-CACHE-1 — zero-result state, icon truthfulness, and the
 * "unavailable" cache-status banner (Section H) on the results page.
 *
 * BF-FLIGHTS-LIVE-4/CACHE-1: the embedded Travelpayouts Widget and the
 * later SerpApi-backed native "Live Flights" section are both removed —
 * this file proves no runtime of either remains, and that the primary
 * zero-result card (suppressed during LIVE-3/LIVE-4 in favour of an
 * on-page live section that no longer exists) is shown again.
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

function stubFetch(meta: Record<string, unknown>) {
  const fetchMock = vi.fn().mockImplementation((url: string) => {
    if (String(url).includes("search-flights")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ flights: [], meta: { total_found: 0, is_complete: true, ...meta } }),
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

beforeEach(() => {
  mockToastError.mockReset();
  mockGetRedirectUrl.mockReset();
  mockLogAffiliateClick.mockClear();
  mockBuildWhiteLabelFlightUrl.mockClear();
  hoisted.isMobile = false;
  hoisted.ads = {};
});

describe("FlightResults — zero-result state", () => {
  it("shows the primary 'No Exact Recent Fare Data Found' card again (no on-page live section to defer to any more)", async () => {
    stubFetch({ cacheStatus: "hit", fetchedAt: new Date().toISOString(), ageSeconds: 60 });
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText("No Exact Recent Fare Data Found")).toBeTruthy());
  });

  it("Try Different Dates remains", async () => {
    stubFetch({ cacheStatus: "hit", fetchedAt: new Date().toISOString(), ageSeconds: 60 });
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText("Try Different Dates")).toBeTruthy());
  });

  it("Explore other destinations remains", async () => {
    stubFetch({ cacheStatus: "hit", fetchedAt: new Date().toISOString(), ageSeconds: 60 });
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText(/explore other destinations from/i)).toBeTruthy());
  });

  // BF-FLIGHTS-CACHE-1 Phase 2 item F: a genuinely CACHED zero-match
  // response (cacheStatus: "hit", not just an uncached empty response)
  // must not degrade the page — Recent Fare Calendar/Heatmap, the primary
  // zero-state card, its Search Live Flights CTA (the White Label
  // alternative), Try Different Dates and Explore Other Destinations must
  // all still render together.
  it("a genuinely cached zero-match result (cacheStatus: hit) preserves Calendar, Heatmap, the primary card, and the White Label alternative all together", async () => {
    stubFetch({ cacheStatus: "hit", fetchedAt: new Date().toISOString(), ageSeconds: 3600 });
    renderResults(ECONOMY_ZERO_URL);

    await waitFor(() => expect(screen.getByText("No Exact Recent Fare Data Found")).toBeTruthy());
    expect(screen.getByText("Recent Fare Calendar")).toBeTruthy();
    expect(screen.getByText("Recent Fare Heatmap")).toBeTruthy();
    expect(screen.getByText("Try Different Dates")).toBeTruthy();
    expect(screen.getByText(/explore other destinations from/i)).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /^search live flights$/i }).length).toBeGreaterThan(0);
  });
});

describe("FlightResults — icon semantics: both handoff buttons genuinely leave the site", () => {
  it("every Search Live Flights button (sticky header and the zero-state card) keeps its ExternalLink icon", async () => {
    stubFetch({ cacheStatus: "hit", fetchedAt: new Date().toISOString(), ageSeconds: 60 });
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    const buttons = screen.getAllByRole("button", { name: /^search live flights$/i });
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      expect(btn.querySelector("svg.lucide-external-link")).toBeTruthy();
    }
  });

  it("the Business cabin CTA also keeps its ExternalLink icon", async () => {
    stubFetch({});
    renderResults(BUSINESS_URL);
    const btn = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(btn.querySelector("svg.lucide-external-link")).toBeTruthy();
  });
});

describe("FlightResults — 'unavailable' cache status shows an honest banner, distinct from a genuine zero-match", () => {
  it("shows the unavailable banner with a Try again action, not the generic zero-match sentence", async () => {
    stubFetch({ cacheStatus: "unavailable" });
    renderResults(ECONOMY_ZERO_URL);

    expect(await screen.findByText(/temporarily unavailable/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /try again/i })).toBeTruthy();
    expect(screen.queryByText(/no exact recent fare observation is available/i)).toBeNull();
  });
});

describe("FlightResults — no Travelpayouts Widget or SerpApi live-search runtime remains", () => {
  it("no tpwl-search/tpwl-tickets containers exist anywhere on the page", async () => {
    stubFetch({ cacheStatus: "hit", fetchedAt: new Date().toISOString(), ageSeconds: 60 });
    const { container } = renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(container.querySelector("#tpwl-search")).toBeNull();
    expect(container.querySelector("#tpwl-tickets")).toBeNull();
    expect(container.querySelector("#live-flights-section")).toBeNull();
  });

  it("does not call search-live-flights or get-live-flight-booking-options — those functions no longer exist", async () => {
    const fetchMock = stubFetch({ cacheStatus: "hit", fetchedAt: new Date().toISOString(), ageSeconds: 60 });
    renderResults(ECONOMY_ZERO_URL);
    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(fetchMock.mock.calls.some(([url]: [string]) => url.includes("search-live-flights"))).toBe(false);
    expect(fetchMock.mock.calls.some(([url]: [string]) => url.includes("get-live-flight-booking-options"))).toBe(false);
  });
});

describe("FlightResults — Business cached-price isolation remains", () => {
  it("Business never calls search-flights", async () => {
    const fetchMock = stubFetch({});
    renderResults(BUSINESS_URL);
    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(fetchMock.mock.calls.some(([url]: [string]) => url.includes("search-flights"))).toBe(false);
  });
});
