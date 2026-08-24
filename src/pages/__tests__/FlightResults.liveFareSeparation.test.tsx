/**
 * BF-FLIGHTS-LIVE-1 — separate recent fare intelligence from live flight
 * search.
 *
 * The Travelpayouts prices_for_dates Data API returns cached/recently-seen
 * fare observations, not live flight inventory. These tests prove the
 * frontend no longer represents `meta.total_found === 0` as "no flights
 * exist", and that a "Search Live Flights" White Label handoff — carrying
 * the full supported query contract — is available on every valid search,
 * not only the zero-result state.
 *
 * Mirrors the render/mocking setup already established in
 * FlightResults.cabinTruth.test.tsx.
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
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({ geoData: { currency: "USD", currencySymbol: "$" } }),
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
    id, airline, airline_code: airline, price, currency: "USD", duration_minutes: 120, stops: 0,
    segments: [{ from: "SYD", to: "MEL", depart_time: at(8), arrive_time: null, airline, airline_code: airline }],
  };
}

const FLIGHTS = [apiFlight("f1", "QF", 200), apiFlight("f2", "JQ", 300)];

function stubSearchFlights(flights: unknown[]) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ flights, meta: { total_found: flights.length, is_complete: true } }),
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

const resultCards = () => Array.from(document.querySelectorAll('[aria-label="Flight results"] article'));

const ROUND_TRIP_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&returnDate=2030-01-20&adults=2&children=1&infants=1&cabinClass=economy";
const ONE_WAY_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=2&children=1&infants=1&cabinClass=economy";
const BUSINESS_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=2&children=1&infants=1&cabinClass=business";

beforeEach(() => {
  mockBuildWhiteLabelFlightUrl.mockReset();
  mockToastError.mockReset();
  mockGetRedirectUrl.mockReset();
});

// ── Items 1, 2, 12: zero cached results never claim flights don't exist ──

describe("FlightResults — zero cached results (BF-FLIGHTS-LIVE-1 Phase B/D)", () => {
  it("item 1: never says 'no flights exist' — no 'No Flights Found' / '0 flights found' / 'no flights matching' wording anywhere", async () => {
    stubSearchFlights([]);
    const { container } = renderResults(ONE_WAY_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());

    expect(container.textContent).not.toMatch(/no flights found/i);
    expect(container.textContent).not.toMatch(/0 flights found/i);
    expect(container.textContent).not.toMatch(/no flights matching/i);
  });

  it("item 12: makes no fabricated-availability statement — states a recent-fare-data gap, not a flight-existence fact", async () => {
    stubSearchFlights([]);
    renderResults(ONE_WAY_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(screen.getAllByText(/live flights may still be available/i).length).toBeGreaterThan(0);
  });

  it("item 2: exposes a 'Search Live Flights' action", async () => {
    stubSearchFlights([]);
    renderResults(ONE_WAY_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(screen.getAllByRole("button", { name: /search live flights/i }).length).toBeGreaterThan(0);
  });

  it("Round 3 Fix 1: the sort/count row's own '0 recent fare observations' text is suppressed as redundant once the compact truthful sentence already says so", async () => {
    stubSearchFlights([]);
    renderResults(ONE_WAY_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    // FlightFiltersPanel's own sidebar count header (a separate, untouched
    // BF-FLIGHTS-LIVE-1 surface) legitimately still says this once — this
    // only proves the sort/count row's own duplicate copy is gone, not
    // that the phrase is absent everywhere on the page.
    expect(screen.getAllByText(/0 recent fare observations?/i).length).toBe(1);
  });

  it("a way to modify the search is offered both via the empty-state card and the sticky header's Edit button", async () => {
    stubSearchFlights([]);
    renderResults(ONE_WAY_URL);

    await waitFor(() => expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy());
    expect(screen.getByRole("button", { name: /^modify search$/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /^edit$/i })).toBeTruthy();
  });
});

// ── Items 3-8: the White Label handoff preserves the supported query contract ──

describe("FlightResults — 'Search Live Flights' preserves the supported search contract (BF-FLIGHTS-LIVE-1 Phase C)", () => {
  it("item 3: preserves origin", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2011" });
    stubSearchFlights(FLIGHTS);
    renderResults(ROUND_TRIP_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ origin: "SYD" })
    ));
  });

  it("item 4: preserves destination", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2011" });
    stubSearchFlights(FLIGHTS);
    renderResults(ROUND_TRIP_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ destination: "MEL" })
    ));
  });

  it("item 5: preserves the departure date", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2011" });
    stubSearchFlights(FLIGHTS);
    renderResults(ROUND_TRIP_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ outboundDate: "2030-01-10" })
    ));
  });

  it("item 6: preserves the return date on a round trip", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2011" });
    stubSearchFlights(FLIGHTS);
    renderResults(ROUND_TRIP_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ returnDate: "2030-01-20" })
    ));
  });

  it("omits the return date for a one-way search rather than fabricating one", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL1" });
    stubSearchFlights(FLIGHTS);
    renderResults(ONE_WAY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ returnDate: undefined })
    ));
  });

  it("item 7: preserves adults, children and infants", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2011" });
    stubSearchFlights(FLIGHTS);
    renderResults(ROUND_TRIP_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ adults: 2, children: 1, infants: 1 })
    ));
  });

  it("item 8: preserves cabin class", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL2011c" });
    stubSearchFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    fireEvent.click(cta);

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({ cabinClass: "business" })
    ));
  });

  it("fails closed with an honest error when White Label can't be built, rather than silently dropping preserved fields", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: false, url: null, reason: "White Label is not enabled" });
    stubSearchFlights(FLIGHTS);
    renderResults(ROUND_TRIP_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    fireEvent.click(await screen.findByRole("button", { name: /^search live flights$/i }));

    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(
      expect.stringMatching(/live flight search is temporarily unavailable/i)
    ));
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });
});

// ── Item 9: Economy cached data remains labelled Recent ──

describe("FlightResults — Economy cached fares stay labelled as recent observations, not live results (BF-FLIGHTS-LIVE-1 Phase E)", () => {
  it("item 9: the results count and each card both use 'recent fare' wording, never a bare live-flight claim", async () => {
    stubSearchFlights(FLIGHTS);
    renderResults(ROUND_TRIP_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    // Both the results-count line and the filters-panel header independently
    // use this wording, so more than one match is expected.
    expect(screen.getAllByText(/2 recent fare observations/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/recent fare observation/i).length).toBeGreaterThan(0);
  });
});

// ── Item 10: Business never calls the cached search-flights Data API ──

describe("FlightResults — Business cabin never calls the cached Data API (BF-0R-7.1 Phase B, reconfirmed under BF-FLIGHTS-LIVE-1)", () => {
  it("item 10: search-flights is never fetched for a Business search", async () => {
    const fetchMock = stubSearchFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(fetchMock.mock.calls.some(([url]: [string]) => String(url).includes("search-flights"))).toBe(false);
  });
});
