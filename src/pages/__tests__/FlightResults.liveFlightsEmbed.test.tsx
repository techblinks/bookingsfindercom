/**
 * BF-FLIGHTS-LIVE-3 — embedded Travelpayouts Live Flights section, ad
 * repositioning, and the Search Live Flights scroll-vs-redirect gate.
 *
 * Mirrors the render/mocking setup already established in
 * FlightResults.currencyMismatchDialog.test.tsx.
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
  isBelowDesktop: false,
  ads: {} as Record<string, unknown>,
}));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => hoisted.isMobile,
  useIsBelowDesktop: () => hoisted.isBelowDesktop,
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

const at = (hour: number) => new Date(2030, 0, 10, hour, 0, 0).toISOString();

function apiFlight(id: string, airline: string, price: number) {
  return {
    id, airline, airline_code: airline, price, currency: "AUD", duration_minutes: 120, stops: 0,
    segments: [{ from: "SYD", to: "MEL", depart_time: at(8), arrive_time: null, airline, airline_code: airline }],
  };
}

const FLIGHTS = [apiFlight("f1", "QF", 200), apiFlight("f2", "JQ", 300)];

function stubFetch(flights: unknown[]) {
  const calls: { url: string; body: any }[] = [];
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url: String(url), body });
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
  return calls;
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

const resultCards = () => Array.from(document.querySelectorAll('[aria-label="Flight results"] article'));

const ECONOMY_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&returnDate=2030-01-20&adults=1&children=0&infants=0&cabinClass=economy";
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

// ── Item 9: zero cached observations still exposes the live section ──

describe("FlightResults — Live Flights section renders regardless of cached result count", () => {
  it("item 9: renders #live-flights-section when there are zero cached observations", async () => {
    stubFetch([]);
    const { container } = renderResults(ECONOMY_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(container.querySelector("#live-flights-section")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Live Flights" })).toBeTruthy();
  });

  it("also renders #live-flights-section when there are cached results", async () => {
    stubFetch(FLIGHTS);
    const { container } = renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(container.querySelector("#live-flights-section")).toBeTruthy();
  });

  it("item 17: the zero-result statement never claims flights don't exist", async () => {
    stubFetch([]);
    const { container } = renderResults(ECONOMY_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(container.textContent).not.toMatch(/no flights found/i);
    expect(container.textContent).not.toMatch(/0 flights found/i);
  });
});

// ── Items 10-12: BookingsFinder-owned ad placements around the widget ──

describe("FlightResults — ad placements around Live Flights are independent of cached result count", () => {
  it("item 10/11: the before-live-results ad (after_result_3) renders with ZERO cached observations", async () => {
    hoisted.ads = { after_result_3: AD };
    stubFetch([]);
    renderResults(ECONOMY_URL);

    // SponsoredCard renders the title twice: once as a visible <h3> and
    // once inside a sr-only nofollow SEO link — scope to the heading so
    // this asserts one visible ad, not the accessible-name duplicate.
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sponsored Title" })).toBeTruthy());
  });

  it("item 11: the before-live-results ad also renders with cached observations present", async () => {
    hoisted.ads = { after_result_3: AD };
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getByRole("heading", { name: "Sponsored Title" })).toBeTruthy();
  });

  it("item 12: the after-live-results ad (after_result_5) renders with ZERO cached observations", async () => {
    hoisted.ads = { after_result_5: { ...AD, id: "ad-2", placement: "after_result_5" as const, title: "After Live Ad" } };
    stubFetch([]);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(screen.getByRole("heading", { name: "After Live Ad" })).toBeTruthy());
  });

  it("item 12: the after-live-results ad also renders with cached observations present", async () => {
    hoisted.ads = { after_result_5: { ...AD, id: "ad-2", placement: "after_result_5" as const, title: "After Live Ad" } };
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getByRole("heading", { name: "After Live Ad" })).toBeTruthy();
  });

  it("the bottom ad renders even with zero cached observations (previously required displayedFlights.length > 0)", async () => {
    hoisted.ads = { bottom: { ...AD, id: "ad-3", placement: "bottom" as const, title: "Bottom Ad" } };
    stubFetch([]);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(screen.getByRole("heading", { name: "Bottom Ad" })).toBeTruthy());
  });

  it("the same ad is never rendered twice (no leftover per-card-index placement inside the results list)", async () => {
    hoisted.ads = { after_result_3: AD };
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getAllByRole("heading", { name: "Sponsored Title" }).length).toBe(1);
  });
});

// ── BF-FLIGHTS-LIVE-4: Search Live Flights always scrolls; the Page White
// Label redirect is now reached only via LiveFlightsSection's own
// "Open full flight search" fallback (shown when the live search is
// unavailable — this file's stubFetch returns an unrecognized shape for
// search-live-flights, so that's deterministic here). ──

describe("FlightResults — Search Live Flights always targets the embedded section", () => {
  it("clicking Search Live Flights scrolls to #live-flights-section and never redirects on its own", async () => {
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
    expect(mockBuildWhiteLabelFlightUrl).not.toHaveBeenCalled();
  });

  it("the native section's own fallback redirects when the live search is unavailable", async () => {
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /open full flight search/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalled());
    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
  });

  it("preserves the full supported contract (route/date/passenger/cabin) on the fallback redirect", async () => {
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /open full flight search/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "SYD", destination: "MEL", outboundDate: "2030-01-10", returnDate: "2030-01-20",
        adults: 1, children: 0, infants: 0, cabinClass: "economy",
      })
    ));
  });
});

// ── Item 16: Business cabin — native section shown, cached fares still never called ──

describe("FlightResults — Business cabin gets the native Live Flights section without reintroducing cached fares", () => {
  it("item 16: Business renders the Live Flights section but never calls search-flights", async () => {
    const calls = stubFetch(FLIGHTS);
    const { container } = renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(container.querySelector("#live-flights-section")).toBeTruthy();
    expect(calls.some((c) => c.url.includes("search-flights"))).toBe(false);
  });

  it("Business's top CTA also scrolls to the section", async () => {
    stubFetch(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    fireEvent.click(cta);

    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
  });

  it("Business's native-section fallback redirects to Page White Label with cabinClass business when the live search is unavailable", async () => {
    stubFetch(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /open full flight search/i });
    fireEvent.click(cta);

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ cabinClass: "business" })
    ));
  });
});

// ── Item 18: no false claim of Widget currency preservation ──

describe("FlightResults — Live Flights section makes no currency-preservation claim", () => {
  it("item 18: nothing in the Live Flights section asserts the widget will show AUD (or any BookingsFinder-resolved currency)", async () => {
    stubFetch(FLIGHTS);
    const { container } = renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    const section = container.querySelector("#live-flights-section");
    expect(section).toBeTruthy();
    expect(section!.textContent).not.toMatch(/AUD/);
  });
});

// ── Item 19: route/date/passenger/cabin state untouched by embedding ──

describe("FlightResults — embedding the widget does not alter search state", () => {
  it("item 19: the sticky header still shows the original route/dates/travellers/cabin after the Live Flights section renders", async () => {
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getAllByText("SYD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MEL").length).toBeGreaterThan(0);
    expect(screen.getByText(/1.*Traveler/)).toBeTruthy();
  });
});
