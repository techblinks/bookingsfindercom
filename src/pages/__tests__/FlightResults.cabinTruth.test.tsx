/**
 * BF-0R-7 Round 1.1 item 2 — cabin/passenger truth on the results page.
 *
 * Renders the real FlightResults with a real useFlightSearch (network
 * stubbed) to prove, end to end:
 *   - an economy search shows the cached fare cards plus exactly one
 *     page-level disclosure about passenger/cabin non-specificity;
 *   - a non-economy (business — the only non-economy cabin the White Label
 *     handoff supports as of Round 1.2, see cabinClasses.ts) search shows NO
 *     numeric cached fare cards at all, and instead a "Check live prices for
 *     your selected cabin" CTA;
 *   - that CTA's White Label handoff still carries the complete supported
 *     query contract — adults, children, infants and cabin class are not
 *     dropped by the cabin-gating change;
 *   - (Round 1.2 item 3) that CTA fails closed — no generic redirect
 *     fallback — when the verified White Label URL can't be built, rather
 *     than silently dropping the selected cabin/passengers.
 *
 * Mirrors the render/mocking setup already established in
 * FlightResults.editSearch.test.tsx.
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

// Real whiteLabelUrl.ts logic (unmocked) would require VITE_TRAVEL_WHITE_LABEL_MODE
// to be enabled to succeed; mocked here so the White Label path is
// deterministically exercised regardless of local env, and so its call
// arguments (the actual thing under test — Item 7) can be inspected.
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

function stubFlights(flights: unknown[]) {
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

const ECONOMY_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=2&children=1&infants=1&cabinClass=economy";
const BUSINESS_URL =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=2&children=1&infants=1&cabinClass=business";

describe("FlightResults — economy search shows cached fares with one page-level disclosure", () => {
  beforeEach(() => {
    mockBuildWhiteLabelFlightUrl.mockReset();
    mockToastError.mockReset();
    mockGetRedirectUrl.mockReset();
    // BF-FLIGHTS-LIVE-4: "Check live prices"/"Search Live Flights" now
    // always scroll to the native Live Flights section (see
    // handleSearchLiveFlights in FlightResults.tsx) — jsdom does not
    // implement scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("renders the fare cards (item 12)", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    // Cached numeric fares ARE shown for an economy search. "200" also
    // appears in the header's "Recent from $200" summary chip alongside the
    // fare card itself, so there are 2+ matches, not exactly 1.
    expect(screen.getAllByText("200").length).toBeGreaterThan(0);
    expect(screen.getAllByText("300").length).toBeGreaterThan(0);
  });

  // BF-0R-7.1 Phase D: a single concise top-level disclosure, placed before
  // the first cached-price surface in the main content, replaces the old
  // longer paragraph that used to sit below several already-shown prices.
  it("shows exactly one concise disclosure (item 17 setup)", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    expect(screen.getAllByText(/recent indicative fares from our flight partner/i)).toHaveLength(1);
  });

  // BF-0R-7 Round 1.2 item 4/9: the disclosure must not make an absolute
  // claim that every handoff preserves traveller/cabin details — the
  // Economy result-card fallback (handleBookNow's getRedirectUrl path)
  // can't carry cabin/passenger specifics.
  it("disclosure does not promise unsupported preservation", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    expect(screen.queryByText(/your selected travellers and cabin are applied/i)).toBeNull();
    expect(screen.queryByText(/we pass supported search details to the partner where available/i)).toBeNull();
  });

  // BF-0R-7.1 Phase D / Phase G item 17: the disclosure must appear before
  // the first cached-price surface within the results content (the page's
  // sticky header chip is a separate, already self-labelled "Recent from"
  // surface — see item 14 — so ordering is checked within <main>, where the
  // disclosure and FlightQuickSelect actually compete for position).
  it("disclosure appears before the first cached-fare surface (FlightQuickSelect) — item 17", async () => {
    stubFlights(FLIGHTS);
    const { container } = renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    const mainText = container.querySelector("main")!.textContent!;
    const disclosureIndex = mainText.indexOf("Recent indicative fares");
    const quickSelectIndex = mainText.indexOf("Recent cheapest");
    expect(disclosureIndex).toBeGreaterThanOrEqual(0);
    expect(quickSelectIndex).toBeGreaterThan(disclosureIndex);
  });

  // Item 13: FlightCard's own per-card honesty wording is untouched by this
  // page-level restructure.
  it("FlightCard still shows 'Recent fare observation' (item 13)", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getAllByText(/recent fare observation/i).length).toBeGreaterThan(0);
  });

  // Item 18: the per-card CTA is untouched.
  it("FlightCard still offers 'Check live price' (item 18)", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getAllByRole("button", { name: /check live price/i }).length).toBeGreaterThan(0);
  });

  // Item 14: the header summary chip is self-labelled, not a bare number.
  it("header cached price is labelled 'Recent from' (item 14)", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getByText(/recent from/i)).toBeTruthy();
  });

  // Item 15: FlightQuickSelect's Cheapest/Fastest/Fewest-stops cards are
  // labelled. No "Recent best" — BF-FLIGHTS-CACHE-1 quick-select truth fix.
  it("Quick Select prices carry recent/indicative context (item 15)", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getByText("Recent cheapest")).toBeTruthy();
    expect(screen.getByText("Recent fastest fare")).toBeTruthy();
    expect(screen.getByText("Recent fewest stops")).toBeTruthy();
    expect(screen.queryByText("Recent best")).toBeNull();
  });

  // Item 16: Price Calendar heading — its request contract has no
  // passenger/cabin fields (see usePriceCalendar.ts), so it is always a
  // generic recent-fare surface, never traveller-specific.
  it("Price Calendar is labelled recent (item 16)", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.getByText("Recent Fare Calendar")).toBeTruthy();
    expect(screen.getByText("Recent Fare Heatmap")).toBeTruthy();
  });

  it("does not show the non-economy cabin CTA for an economy search", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.queryByRole("button", { name: /check live prices for your selected cabin/i })).toBeNull();
  });
});

describe("FlightResults — non-economy (Business) cabin search contains zero cached-fare UI (BF-0R-7.1 Phase B, items 1-11)", () => {
  beforeEach(() => {
    mockBuildWhiteLabelFlightUrl.mockReset();
    mockToastError.mockReset();
    mockGetRedirectUrl.mockReset();
    // BF-FLIGHTS-LIVE-4: "Check live prices"/"Search Live Flights" now
    // always scroll to the native Live Flights section (see
    // handleSearchLiveFlights in FlightResults.tsx) — jsdom does not
    // implement scrollIntoView.
    Element.prototype.scrollIntoView = vi.fn();
  });

  it("item 1: does not display any currency amount from cached results, even though the provider returned results", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });

    expect(resultCards().length).toBe(0);
    expect(screen.queryByText("200")).toBeNull();
    expect(screen.queryByText("300")).toBeNull();
    expect(screen.queryByText(/\$\d/)).toBeNull();
  });

  it("item 2: does not render PriceCalendar", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText("Recent Fare Calendar")).toBeNull();
  });

  it("item 3: does not render WeeklyPriceHeatmap", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText("Recent Fare Heatmap")).toBeNull();
  });

  it("item 4: does not render FlightFiltersPanel / MobileFiltersSheet", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByRole("heading", { name: "Filters" })).toBeNull();
    expect(screen.queryByRole("button", { name: /^filters/i })).toBeNull();
  });

  it("item 5: does not render a result count", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText(/flights? found/i)).toBeNull();
  });

  it("item 6: does not render cached airline/stop/departure-time filter categories", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText("Recent fare")).toBeNull(); // the Price filter section
    expect(screen.queryByText("Stops")).toBeNull();
    expect(screen.queryByText("Airlines")).toBeNull();
  });

  it("item 7: does not render sort controls", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByRole("radiogroup", { name: /sort flights/i })).toBeNull();
    expect(screen.queryByText(/^sort:/i)).toBeNull();
  });

  it("item 8: does not render 'Showing all...'", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText(/showing all/i)).toBeNull();
  });

  it("item 9: does not call search-flights at all — the cached Data API is never hit for Business", async () => {
    const fetchMock = stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(fetchMock.mock.calls.some(([url]: [string]) => String(url).includes("search-flights"))).toBe(false);
  });

  it("does not render FlightQuickSelect or NearbyAirportSuggestion", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText(/Recent best/i)).toBeNull();
    expect(screen.queryByText(/Recent cheapest/i)).toBeNull();
  });

  it("shows the 'check live prices for your selected cabin' CTA, naming the selected cabin (item 10)", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(cta).toBeTruthy();
    expect(screen.getByText(/Business search/i)).toBeTruthy();
  });

  it("does not show the economy fare-list disclosure (that disclosure is for the cached fare list, which isn't shown here)", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText(/recent indicative fares from our flight partner/i)).toBeNull();
  });

  it("item 11: the Business CTA's White Label handoff preserves adults, children, infants AND cabin class (nothing dropped by cabin gating)", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({
      success: true,
      url: "https://flights.bookingsfinder.com/?flightSearch=SYD1001MEL121c211",
    });
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    fireEvent.click(cta);

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalled());
    expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        origin: "SYD",
        destination: "MEL",
        adults: 2,
        children: 1,
        infants: 1,
        cabinClass: "business",
      })
    );
  });

  // BF-0R-7 Round 1.2 item 3/8: the fail-closed contract. If the verified
  // White Label URL can't be built, the fallback must NOT fall back further
  // to a generic redirect (which would drop the selected cabin/passengers
  // while implying they were preserved) — it must show an honest error.
  it("does NOT generic-fallback when the verified White Label URL generation fails — fails closed with an honest error", async () => {
    mockBuildWhiteLabelFlightUrl.mockReturnValue({ success: false, url: null, reason: "White Label is not enabled" });
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    fireEvent.click(cta);

    await waitFor(() => expect(mockBuildWhiteLabelFlightUrl).toHaveBeenCalled());
    await waitFor(() => expect(mockToastError).toHaveBeenCalledWith(
      expect.stringMatching(/live business search is temporarily unavailable/i)
    ));
    // No generic-redirect fallback: getRedirectUrl must never be reached.
    expect(mockGetRedirectUrl).not.toHaveBeenCalled();
  });
});
