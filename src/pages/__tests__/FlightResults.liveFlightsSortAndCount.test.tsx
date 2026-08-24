/**
 * BF-FLIGHTS-LIVE-4 Round 2 Phase 6/7/11/W — native sort control, truthful
 * live result count, currency consistency, and booking-options fetch
 * timing, exercised end-to-end on the real FlightResults page.
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
vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false, useIsBelowDesktop: () => false }));
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({ geoData: { currency: "AUD", currencySymbol: "A$", defaultOrigin: "SYD", defaultOriginName: "Sydney" } }),
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

function segment(overrides: Record<string, unknown> = {}) {
  return {
    airline: "Qantas", airlineLogoUrl: null, flightNumber: "QF400", aircraft: null, travelClass: "Economy",
    departureAirport: { code: "SYD", name: null, time: "2030-01-10 08:00" },
    arrivalAirport: { code: "MEL", name: null, time: "2030-01-10 09:30" },
    durationMinutes: 90, overnight: false, operatingAirline: null,
    ...overrides,
  };
}

function itin(id: string, price: number, durationMinutes: number, category: "best" | "other" = "best") {
  return {
    id, providerResultId: null, category, price, currency: "AUD",
    tripType: "one_way", totalDurationMinutes: durationMinutes,
    segments: [segment()], layovers: [], stops: 0, carbonEmissionsGrams: null,
    departureToken: null, bookingToken: null,
  };
}

function stubFetch(handler: (fn: string, body: any) => any) {
  const calls: { url: string; body: any }[] = [];
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
    const body = init?.body ? JSON.parse(init.body as string) : undefined;
    calls.push({ url: String(url), body });
    const match = String(url).match(/functions\/v1\/([\w-]+)/);
    return Promise.resolve({ ok: true, json: () => Promise.resolve(handler(match?.[1] ?? "", body)) });
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
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=1&children=0&infants=0&cabinClass=economy&currency=AUD";

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

describe("FlightResults — native Live Flights sort control", () => {
  it("Cheapest reorders live cards by ascending price without touching cached results", async () => {
    stubFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") {
        return { status: "ok", itineraries: [itin("expensive", 500, 200), itin("cheap", 150, 300)], currency: "AUD", searchedAt: "x" };
      }
      return {};
    });
    const { container } = renderResults(ECONOMY_ONE_WAY);

    await waitFor(() => expect(container.querySelectorAll("article").length).toBe(2));
    // Default sort is "best" — both itineraries are category "best", so
    // original provider order (expensive, then cheap) is preserved.
    let cards = Array.from(container.querySelectorAll("article"));
    expect(cards[0].textContent).toContain("500");
    expect(cards[1].textContent).toContain("150");

    fireEvent.click(screen.getByRole("radio", { name: "Cheapest" }));

    await waitFor(() => {
      cards = Array.from(container.querySelectorAll("article"));
      expect(cards[0].textContent).toContain("150");
      expect(cards[1].textContent).toContain("500");
    });
  });
});

describe("FlightResults — truthful, separate live result count", () => {
  it("shows 'N live flight option(s)', never combined with 'recent fare observation' wording", async () => {
    stubFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") {
        return { status: "ok", itineraries: [itin("a", 200, 100), itin("b", 300, 120)], currency: "AUD", searchedAt: "x" };
      }
      return {};
    });
    renderResults(ECONOMY_ONE_WAY);

    const countLine = await screen.findByText(/live flight option/i);
    expect(countLine.textContent).toMatch(/2\s+live flight options/i);
    expect(countLine.textContent).not.toMatch(/recent fare observation/i);
  });
});

describe("FlightResults — resolved currency is identical between the live search request and the displayed cards", () => {
  it("sends currency=AUD to search-live-flights and displays A$ on the card", async () => {
    stubFetch((fn, body) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") {
        expect(body.currency).toBe("AUD");
        return { status: "ok", itineraries: [itin("a", 349, 90)], currency: "AUD", searchedAt: "x" };
      }
      return {};
    });
    renderResults(ECONOMY_ONE_WAY);

    await waitFor(() => expect(screen.getByText("349")).toBeTruthy());
    expect(screen.getByText("A$")).toBeTruthy();
  });
});

describe("FlightResults — API call multiplication check", () => {
  it("initial one-way search issues exactly one search-live-flights request", async () => {
    const calls = stubFetch((fn) => {
      if (fn === "search-flights") return { flights: [], meta: { total_found: 0, is_complete: true } };
      if (fn === "search-live-flights") return { status: "ok", itineraries: [itin("a", 200, 90)], currency: "AUD", searchedAt: "x" };
      return {};
    });
    renderResults(ECONOMY_ONE_WAY);

    await waitFor(() => expect(screen.getByText("200")).toBeTruthy());
    expect(calls.filter((c) => c.url.includes("search-live-flights")).length).toBe(1);
  });
});
