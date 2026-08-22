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
  getFunctionUrl: () => "https://mock.test/functions/v1/search-flights",
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
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ flights, meta: { total_found: flights.length, is_complete: true } }),
  }));
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
  });

  it("renders the fare cards and exactly one passenger/cabin disclosure", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    expect(screen.getAllByText(/not adjusted for traveller type or cabin class/i)).toHaveLength(1);
    // Cached numeric fares ARE shown for an economy search. "200" also
    // appears in the header's "From $200" summary chip alongside the fare
    // card itself, so there are 2+ matches, not exactly 1.
    expect(screen.getAllByText("200").length).toBeGreaterThan(0);
    expect(screen.getAllByText("300").length).toBeGreaterThan(0);
  });

  // BF-0R-7 Round 1.2 item 4/9: the disclosure must not make an absolute
  // claim that every handoff preserves traveller/cabin details — the
  // Economy result-card fallback (handleBookNow's getRedirectUrl path)
  // can't carry cabin/passenger specifics, so "your selected travellers and
  // cabin are applied" would be false whenever that fallback is used.
  it("disclosure does not promise unsupported preservation", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));

    expect(screen.getByText(/we pass supported search details to the partner where available/i)).toBeTruthy();
    expect(screen.queryByText(/your selected travellers and cabin are applied/i)).toBeNull();
  });

  it("does not show the non-economy cabin CTA for an economy search", async () => {
    stubFlights(FLIGHTS);
    renderResults(ECONOMY_URL);

    await waitFor(() => expect(resultCards().length).toBe(FLIGHTS.length));
    expect(screen.queryByRole("button", { name: /check live prices for your selected cabin/i })).toBeNull();
  });
});

describe("FlightResults — non-economy cabin search (BF-0R-7 Round 1.1 item 2)", () => {
  beforeEach(() => {
    mockBuildWhiteLabelFlightUrl.mockReset();
    mockToastError.mockReset();
    mockGetRedirectUrl.mockReset();
  });

  it("shows NO numeric cached fare cards for a business-class search, even though the provider returned results", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });

    expect(resultCards().length).toBe(0);
    expect(screen.queryByText("200")).toBeNull();
    expect(screen.queryByText("300")).toBeNull();
  });

  it("shows the 'check live prices for your selected cabin' CTA, naming the selected cabin", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    const cta = await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(cta).toBeTruthy();
    expect(screen.getByText(/Business search/i)).toBeTruthy();
  });

  it("does not show the passenger/cabin disclosure (that disclosure is for the fare-card list, which isn't shown here)", async () => {
    stubFlights(FLIGHTS);
    renderResults(BUSINESS_URL);

    await screen.findByRole("button", { name: /check live prices for your selected cabin/i });
    expect(screen.queryByText(/not adjusted for traveller type or cabin class/i)).toBeNull();
  });

  it("the cabin CTA's White Label handoff preserves adults, children, infants AND cabin class (item 7 — nothing dropped by cabin gating)", async () => {
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
  // White Label URL can't be built, the CTA must NOT fall back to a generic
  // redirect (which would drop the selected cabin/passengers while implying
  // they were preserved) — it must show an honest error instead.
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
