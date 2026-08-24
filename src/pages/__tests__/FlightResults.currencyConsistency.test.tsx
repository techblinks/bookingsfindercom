/**
 * BF-FLIGHTS-LIVE-2 — currency consistency across /flights, the Recent Fare
 * Calendar/Heatmap, cached fare observations and the White Label handoff.
 *
 * Mirrors the render/mocking setup already established in
 * FlightResults.cabinTruth.test.tsx / FlightResults.liveFareSeparation.test.tsx.
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

const hoisted = vi.hoisted(() => ({ isMobile: false, isBelowDesktop: false }));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => hoisted.isMobile,
  useIsBelowDesktop: () => hoisted.isBelowDesktop,
}));

// Fixed geo currency for every test in this file — AUD, matching the bug
// report screenshots (BookingsFinder showed AUD, White Label showed USD).
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({
    geoData: { currency: "AUD", currencySymbol: "A$", country: "Australia", countryCode: "AU", city: "Sydney", defaultOrigin: "SYD", defaultOriginName: "Sydney" },
    loading: false,
    regionConfig: {},
  }),
}));

vi.mock("@/hooks/useAds", () => ({ useAds: () => ({ ads: {}, trackImpression: vi.fn(), trackClick: vi.fn() }) }));
vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: (name: string) => `https://mock.test/functions/v1/${name}`,
}));

const mockBuildWhiteLabelFlightUrl = vi.fn();
vi.mock("@/lib/whiteLabelUrl", () => ({
  buildWhiteLabelFlightUrl: (...args: unknown[]) => mockBuildWhiteLabelFlightUrl(...args),
}));

const at = (hour: number) => new Date(2030, 0, 10, hour, 0, 0).toISOString();

function apiFlight(id: string, airline: string, price: number) {
  return {
    id, airline, airline_code: airline, price, currency: "AUD", duration_minutes: 120, stops: 0,
    segments: [{ from: "SYD", to: "MEL", depart_time: at(8), arrive_time: null, airline, airline_code: airline }],
  };
}

const FLIGHTS = [apiFlight("f1", "QF", 200), apiFlight("f2", "JQ", 300)];

/**
 * Routes a single mocked fetch across search-flights, get-price-calendar
 * (called twice by WeeklyPriceHeatmap plus once by PriceCalendar) and
 * anything else, recording each call's URL + parsed body for inspection.
 */
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
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ prices: [], success: true }),
      });
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

beforeEach(() => {
  mockBuildWhiteLabelFlightUrl.mockReset();
  mockToastError.mockReset();
  mockGetRedirectUrl.mockReset();
  localStorage.clear();
  // BF-FLIGHTS-LIVE-4: "Search Live Flights"/"Check live prices" now always
  // scroll to the native Live Flights section — jsdom does not implement
  // scrollIntoView.
  Element.prototype.scrollIntoView = vi.fn();
});

describe("FlightResults — cached Data API receives the resolved currency (item 8)", () => {
  it("search-flights is called with currency: AUD (the geo-detected currency)", async () => {
    const calls = stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    const searchCall = calls.find((c) => c.url.includes("search-flights"));
    expect(searchCall?.body?.currency).toBe("AUD");
  });
});

describe("FlightResults — Recent Fare Calendar and Heatmap use the resolved currency (items 9, 10)", () => {
  it("item 9: PriceCalendar's request carries currency: AUD, matching what's displayed", async () => {
    const calls = stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => {
      const calendarCalls = calls.filter((c) => c.url.includes("get-price-calendar"));
      expect(calendarCalls.length).toBeGreaterThan(0);
    });

    const calendarCalls = calls.filter((c) => c.url.includes("get-price-calendar"));
    expect(calendarCalls.every((c) => c.body?.currency === "AUD")).toBe(true);
  });

  it("item 10: WeeklyPriceHeatmap's requests (both months) carry currency: AUD", async () => {
    const calls = stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    // WeeklyPriceHeatmap fetches its own month1/month2 in addition to
    // PriceCalendar's single month — at least 2 get-price-calendar calls
    // total once both components have fetched.
    await waitFor(() => {
      const calendarCalls = calls.filter((c) => c.url.includes("get-price-calendar"));
      expect(calendarCalls.length).toBeGreaterThanOrEqual(2);
    });

    const calendarCalls = calls.filter((c) => c.url.includes("get-price-calendar"));
    expect(calendarCalls.every((c) => c.body?.currency === "AUD")).toBe(true);
  });
});

describe("FlightResults — White Label handoff receives the resolved currency (items 11, 12)", () => {
  it("item 11: 'Search Live Flights' passes currency: AUD alongside the full supported contract", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({
      success: true,
      url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2001&currency=AUD",
      currencyApplied: true,
    });
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalled());
    expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "SYD",
        destination: "MEL",
        outboundDate: "2030-01-10",
        returnDate: "2030-01-20",
        adults: 1,
        children: 0,
        infants: 0,
        cabinClass: "economy",
        currency: "AUD",
      })
    );
  });

  it("item 12: the Business cabin's live-only CTA also passes currency alongside cabin/passenger context", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({
      success: true,
      url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MELc1&currency=AUD",
      currencyApplied: true,
    });
    stubFetch(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    fireEvent.click(cta);

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalled());
    expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ cabinClass: "business", adults: 1, currency: "AUD" })
    );
  });
});

describe("FlightResults — currency selector overrides without resetting the search (Phase F)", () => {
  it("switching currency re-fetches search-flights with the new currency, not the geo default", async () => {
    const calls = stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    const trigger = screen.getByRole("button", { name: "AUD" });
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false, pointerId: 1 });
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByText("British Pound"));

    await waitFor(() => {
      const searchCalls = calls.filter((c) => c.url.includes("search-flights"));
      expect(searchCalls.some((c) => c.body?.currency === "GBP")).toBe(true);
    });

    // Route/date/passenger context is untouched by the currency change — the
    // re-fetch triggered by switching currency still targets the same
    // origin/destination/dates, not a reset search.
    const searchCalls = calls.filter((c) => c.url.includes("search-flights"));
    const latest = searchCalls[searchCalls.length - 1];
    expect(latest.body).toMatchObject({ origin: "SYD", destination: "MEL", depart_date: "2030-01-10" });
  });
});

describe("FlightResults — Business cached-fare isolation remains unchanged (item 14)", () => {
  it("a Business search still never calls search-flights, currency change or not", async () => {
    const calls = stubFetch(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(calls.some((c) => c.url.includes("search-flights"))).toBe(false);
  });
});
