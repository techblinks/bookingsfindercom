/**
 * BF-FLIGHTS-LIVE-2 Round 2 — unsupported White Label currency handoff UX.
 *
 * Proves: for a currency the White Label was live-verified to honor
 * (AUD/GBP/...), every handoff redirects immediately with no warning; for
 * one that's NOT honored (INR/JPY/SGD), the traveller sees an explicit
 * confirmation dialog before leaving BookingsFinder, and BookingsFinder's
 * own displayed/requested currency is never silently forced to USD.
 *
 * Mirrors the render/mocking setup already established in
 * FlightResults.currencyConsistency.test.tsx.
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

const hoisted = vi.hoisted(() => ({ isMobile: false, isBelowDesktop: false, geoCurrency: "AUD", geoSymbol: "A$" }));

vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => hoisted.isMobile,
  useIsBelowDesktop: () => hoisted.isBelowDesktop,
}));

vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({
    geoData: { currency: hoisted.geoCurrency, currencySymbol: hoisted.geoSymbol, country: "x", countryCode: "x", city: "x", defaultOrigin: "SYD", defaultOriginName: "Sydney" },
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

// Mirrors the real builder's currency contract (BF-FLIGHTS-LIVE-2 Round 2
// Phase B) so these tests exercise FlightResults' handling of that contract
// without depending on live network verification.
const WL_SUPPORTED = new Set(["USD", "AUD", "GBP", "EUR", "CAD", "NZD"]);
const mockBuildWhiteLabelFlightUrl = vi.fn((params: any) => {
  const requestedCurrency = params.currency;
  const currencyApplied = requestedCurrency ? WL_SUPPORTED.has(requestedCurrency) : false;
  const qs = currencyApplied ? `&currency=${requestedCurrency}` : "";
  return {
    success: true,
    url: `https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2001${qs}`,
    currencyApplied,
    requestedCurrency,
  };
});
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

beforeEach(() => {
  mockBuildWhiteLabelFlightUrl.mockClear();
  mockToastError.mockReset();
  mockGetRedirectUrl.mockReset();
  mockLogAffiliateClick.mockClear();
  localStorage.clear();
  hoisted.geoCurrency = "AUD";
  hoisted.geoSymbol = "A$";
});

// ── Items 1-2: supported currencies redirect immediately, no warning ──

describe("FlightResults — supported currencies redirect with no warning", () => {
  it("item 1: AUD — currencyApplied true, no dialog, redirect happens", async () => {
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);

    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
    expect(screen.queryByText(/live partner currency differs/i)).toBeNull();
    expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(expect.objectContaining({ currency: "AUD" }));
  });

  it("item 2: GBP — same (no warning, immediate redirect)", async () => {
    hoisted.geoCurrency = "GBP";
    hoisted.geoSymbol = "£";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);

    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
    expect(screen.queryByText(/live partner currency differs/i)).toBeNull();
  });
});

// ── Items 3-5: INR warns, gates the redirect on confirmation ──

describe("FlightResults — INR triggers the currency-mismatch dialog", () => {
  it("item 3: warning appears and no redirect happens before confirmation", async () => {
    hoisted.geoCurrency = "INR";
    hoisted.geoSymbol = "₹";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);

    expect(await screen.findByText(/live partner currency differs/i)).toBeTruthy();
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
  });

  it("item 4: clicking Continue performs the redirect", async () => {
    hoisted.geoCurrency = "INR";
    hoisted.geoSymbol = "₹";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);
    await screen.findByText(/live partner currency differs/i);

    fireEvent.click(screen.getByRole("button", { name: /continue to live flights/i }));

    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
  });

  it("item 5: clicking Cancel performs no redirect and leaves search state untouched", async () => {
    hoisted.geoCurrency = "INR";
    hoisted.geoSymbol = "₹";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);
    await screen.findByText(/live partner currency differs/i);

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    await waitFor(() => expect(screen.queryByText(/live partner currency differs/i)).toBeNull());
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();
    // Search state (results, header route) is exactly as before.
    expect(resultCards().length).toBe(FLIGHTS.length);
    expect(screen.getAllByText("SYD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("MEL").length).toBeGreaterThan(0);
  });
});

// ── Items 6-7: JPY and SGD follow the same warning path ──

describe("FlightResults — JPY and SGD also trigger the warning", () => {
  it("item 6: JPY", async () => {
    hoisted.geoCurrency = "JPY";
    hoisted.geoSymbol = "¥";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);
    expect(await screen.findByText(/live partner currency differs/i)).toBeTruthy();
  });

  it("item 7: SGD", async () => {
    hoisted.geoCurrency = "SGD";
    hoisted.geoSymbol = "S$";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);
    expect(await screen.findByText(/live partner currency differs/i)).toBeTruthy();
  });
});

// ── Item 8: BookingsFinder's own currency is never silently forced to USD ──

describe("FlightResults — BookingsFinder keeps displaying the unsupported currency itself", () => {
  it("item 8: an INR visitor still sees INR-denominated cached fares and the search-flights request still carries INR, not USD", async () => {
    hoisted.geoCurrency = "INR";
    hoisted.geoSymbol = "₹";
    const calls = stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    const searchCall = calls.find((c) => c.url.includes("search-flights"));
    expect(searchCall?.body?.currency).toBe("INR");
    expect(screen.getByRole("button", { name: "INR" })).toBeTruthy();
  });
});

// ── Item 9: a supported currency still reaches the White Label parameter ──

describe("FlightResults — supported currency still reaches buildWhiteLabelFlightUrl", () => {
  it("item 9: AUD is passed through to the builder call", async () => {
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalled());
    expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(expect.objectContaining({ currency: "AUD" }));
  });
});

// ── Item 10: route/date/passenger/cabin preserved through the dialog flow ──

describe("FlightResults — route/date/passenger/cabin values remain unchanged through the warning flow", () => {
  it("item 10: the Continue redirect's tracking payload still reflects the original route", async () => {
    hoisted.geoCurrency = "INR";
    hoisted.geoSymbol = "₹";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /search live flights/i })[0]);
    await screen.findByText(/live partner currency differs/i);
    fireEvent.click(screen.getByRole("button", { name: /continue to live flights/i }));

    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalledWith(
      expect.objectContaining({ route: "SYD-MEL" })
    ));
    // The builder call that produced the pending handoff still carried the
    // full supported contract, not just currency.
    expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "SYD", destination: "MEL", outboundDate: "2030-01-10",
        returnDate: "2030-01-20", adults: 1, children: 0, infants: 0, cabinClass: "economy",
      })
    );
  });
});

// ── Item 11: Business live handoff gets the same warning contract ──

describe("FlightResults — Business cabin live handoff gets the same warning contract", () => {
  it("item 11: an INR Business search also warns before redirecting", async () => {
    hoisted.geoCurrency = "INR";
    hoisted.geoSymbol = "₹";
    stubFetch(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    fireEvent.click(cta);

    expect(await screen.findByText(/live partner currency differs/i)).toBeTruthy();
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /continue to live flights/i }));
    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalledWith(
      expect.objectContaining({ route: "SYD-MEL" })
    ));
  });

  it("a supported-currency Business search redirects with no warning", async () => {
    stubFetch(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    fireEvent.click(cta);

    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
    expect(screen.queryByText(/live partner currency differs/i)).toBeNull();
  });
});

// ── Item 12: cached fare / Check live price handoff gets the same contract ──

describe("FlightResults — cached fare 'Check live price' handoff gets the same warning contract", () => {
  it("item 12: an INR economy search warns before the per-card handoff redirects", async () => {
    hoisted.geoCurrency = "INR";
    hoisted.geoSymbol = "₹";
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /check live price/i })[0]);

    expect(await screen.findByText(/live partner currency differs/i)).toBeTruthy();
    expect(mockLogAffiliateClick).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /continue to live flights/i }));
    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
  });

  it("a supported-currency per-card handoff redirects with no warning", async () => {
    stubFetch(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(screen.getAllByRole("button", { name: /check live price/i })[0]);

    await waitFor(() => expect(mockLogAffiliateClick).toHaveBeenCalled());
    expect(screen.queryByText(/live partner currency differs/i)).toBeNull();
  });
});
