/**
 * BF-FLIGHTS-LIVE-4 Phase W — end-to-end native Live Flights integration
 * on the real FlightResults page: live cards render, round-trip two-step
 * selection, booking options, ad placements alongside native results, and
 * confirmation that no Travelpayouts Widget runtime remains.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import FlightResults from "@/pages/FlightResults";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));
vi.mock("@/services/travelApi", () => ({ getRedirectUrl: vi.fn() }));
vi.mock("@/lib/analytics", () => ({ logAffiliateClick: vi.fn().mockResolvedValue(undefined) }));

const hoisted = vi.hoisted(() => ({ ads: {} as Record<string, unknown> }));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false, useIsBelowDesktop: () => false }));
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({ geoData: { currency: "AUD", currencySymbol: "A$", defaultOrigin: "SYD", defaultOriginName: "Sydney" } }),
}));
vi.mock("@/hooks/useAds", () => ({ useAds: () => ({ ads: hoisted.ads, trackImpression: vi.fn(), trackClick: vi.fn() }) }));
vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: () => Promise.resolve({ data: { session: null } }) } },
}));
vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: (name: string) => `https://mock.test/functions/v1/${name}`,
}));
vi.mock("@/lib/whiteLabelUrl", () => ({
  buildWhiteLabelFlightUrl: () => ({ success: true, url: "https://flights.bookingsfinder.com/?flightSearch=x" }),
}));

const AD = {
  id: "ad-1", name: "Test Ad", type: "sponsored_card" as const, placement: "after_result_3" as const,
  page: "flights" as const, device: "all" as const, title: "Sponsored Title", description: "desc",
  cta_text: "Learn More", destination_url: "https://example.com", priority: 1,
};

function oneWayItinerary(id: string, bookingToken: string | null = "BOOK1") {
  return {
    id, providerResultId: null, category: "best", price: 349, currency: "AUD",
    tripType: "one_way", totalDurationMinutes: 90,
    segments: [{
      airline: "Qantas", airlineLogoUrl: null, flightNumber: "QF400", aircraft: null, travelClass: "Economy",
      departureAirport: { code: "SYD", name: null, time: "2030-01-10 08:00" },
      arrivalAirport: { code: "MEL", name: null, time: "2030-01-10 09:30" },
      durationMinutes: 90, overnight: false, operatingAirline: null,
    }],
    layovers: [], stops: 0, carbonEmissionsGrams: null, departureToken: null, bookingToken,
  };
}

function outboundItinerary(id: string) {
  return { ...oneWayItinerary(id, null), tripType: "round_trip", departureToken: `DEP-${id}` };
}
function returnItinerary(id: string) {
  return { ...oneWayItinerary(id, "BOOK-RETURN"), tripType: "round_trip" };
}

function stubLiveFlightsFetch(handler: (functionName: string, body: any) => any) {
  const calls: { url: string; body: any }[] = [];
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url: String(url), body });
    const match = String(url).match(/functions\/v1\/([\w-]+)/);
    const fn = match?.[1] ?? "";
    return Promise.resolve({ ok: true, json: () => Promise.resolve(handler(fn, body)) });
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

const ECONOMY_ONE_WAY =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=1&children=0&infants=0&cabinClass=economy";
const ECONOMY_ROUND_TRIP =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&returnDate=2030-01-20&adults=1&children=0&infants=0&cabinClass=economy";
const BUSINESS_ONE_WAY =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=1&children=0&infants=0&cabinClass=business";

beforeEach(() => {
  hoisted.ads = {};
  Element.prototype.scrollIntoView = vi.fn();
});

describe("FlightResults — native live flight cards render inline", () => {
  it("shows live cards even with zero cached observations", async () => {
    stubLiveFlightsFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") return { status: "ok", itineraries: [oneWayItinerary("f1")], currency: "AUD", searchedAt: "x" };
      return {};
    });
    renderResults(ECONOMY_ONE_WAY);

    await waitFor(() => expect(screen.getByText("349")).toBeTruthy());
    expect(screen.getByText(/no exact recent fare observation is available/i)).toBeTruthy();
  });

  it("a normal search does not require a second form — no duplicate origin/destination inputs appear", async () => {
    stubLiveFlightsFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") return { status: "ok", itineraries: [oneWayItinerary("f1")], currency: "AUD", searchedAt: "x" };
      return {};
    });
    renderResults(ECONOMY_ONE_WAY);

    await waitFor(() => expect(screen.getByText("349")).toBeTruthy());
    // Only one flight-search origin/destination combobox pair may exist —
    // the sticky header's "Edit" form is closed by default (isEditingSearch=false).
    expect(screen.queryByRole("combobox", { name: /origin/i })).toBeNull();
  });

  it("Business cabin (travel_class=3) also renders live results without cached fares", async () => {
    stubLiveFlightsFetch((fn, body) => {
      if (fn === "search-live-flights") {
        expect(body.cabinClass).toBe("business");
        return { status: "ok", itineraries: [oneWayItinerary("b1")], currency: "AUD", searchedAt: "x" };
      }
      return {};
    });
    renderResults(BUSINESS_ONE_WAY);

    await waitFor(() => expect(screen.getByText("349")).toBeTruthy());
  });

  it("sponsored ads still render alongside native live results", async () => {
    hoisted.ads = { after_result_3: AD };
    stubLiveFlightsFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") return { status: "ok", itineraries: [oneWayItinerary("f1")], currency: "AUD", searchedAt: "x" };
      return {};
    });
    renderResults(ECONOMY_ONE_WAY);

    await waitFor(() => expect(screen.getByText("349")).toBeTruthy());
    expect(screen.getByRole("heading", { name: "Sponsored Title" })).toBeTruthy();
  });

  it("no tpwl-search/tpwl-tickets/tpemb.com runtime remains anywhere on the page", async () => {
    stubLiveFlightsFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") return { status: "ok", itineraries: [oneWayItinerary("f1")], currency: "AUD", searchedAt: "x" };
      return {};
    });
    const { container } = renderResults(ECONOMY_ONE_WAY);
    await waitFor(() => expect(screen.getByText("349")).toBeTruthy());
    expect(container.innerHTML).not.toMatch(/tpwl-search|tpwl-tickets|tpemb\.com/);
  });

  it("Page White Label fallback (Open full flight search) still exists when live search is genuinely unavailable", async () => {
    stubLiveFlightsFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      return {}; // malformed for search-live-flights -> unavailable
    });
    renderResults(ECONOMY_ONE_WAY);
    expect(await screen.findByRole("button", { name: /open full flight search/i })).toBeTruthy();
  });
});

describe("FlightResults — round-trip outbound/return selection uses departure_token", () => {
  it("selecting an outbound itinerary requests return options with its departure_token, and booking_token is only honored once returned", async () => {
    const calls = stubLiveFlightsFetch((fn, body) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") {
        return body.departureToken
          ? { status: "ok", itineraries: [returnItinerary("r1")], currency: "AUD", searchedAt: "x" }
          : { status: "ok", itineraries: [outboundItinerary("o1")], currency: "AUD", searchedAt: "x" };
      }
      return {};
    });
    renderResults(ECONOMY_ROUND_TRIP);

    expect(await screen.findByText(/step 1 — choose your outbound flight/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /choose flight/i }));

    expect(await screen.findByText(/step 2 — choose your return flight/i)).toBeTruthy();
    expect(await screen.findByRole("button", { name: /see booking options/i })).toBeTruthy();

    const returnCall = calls.find((c) => c.url.includes("search-live-flights") && c.body?.departureToken);
    expect(returnCall?.body.departureToken).toBe("DEP-o1");
  });
});
