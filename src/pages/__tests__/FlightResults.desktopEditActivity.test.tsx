/**
 * Desktop Edit search — recent-activity parity.
 *
 * Below desktop, Edit hosts MobileFlightSearch, which has always recorded a
 * committed edit; at desktop it hosts ModernFlightSearch, which recorded
 * nothing. These tests drive the real FlightResults page at desktop width and
 * assert the write boundary of that panel: opening and cancelling write nothing,
 * and a committed edit writes exactly one flight activity through the same
 * recordActivity path — no second recorder inside FlightResults.
 *
 * The equivalent mobile behaviour is covered by FlightResults.editSearch and is
 * deliberately not repeated here.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import FlightResults from "@/pages/FlightResults";
import { loadRecentActivity, type FlightActivity } from "@/lib/recentActivity";

const hoisted = vi.hoisted(() => ({ navigate: vi.fn() }));

/* Desktop: isBelowDesktop false is what selects ModernFlightSearch in Edit. */
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => false,
  useIsBelowDesktop: () => false,
}));
vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({ geoData: null, loading: false }),
}));
vi.mock("@/hooks/useAds", () => ({ useAds: () => ({ ads: {}, trackImpression: vi.fn(), trackClick: vi.fn() }) }));
vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: () => Promise.resolve({ data: { session: null } }) },
    functions: { invoke: vi.fn().mockResolvedValue({ data: [] }) },
  },
}));
vi.mock("@/lib/supabaseConfig", () => ({
  getFunctionUrl: () => "https://mock.test/functions/v1/search-flights",
}));
vi.mock("@/lib/analytics", () => ({
  logSearch: vi.fn(() => Promise.resolve("id")),
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logInternalNavigation: vi.fn(),
}));

vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    useNavigate: () => {
      const navigate = actual.useNavigate();
      return (...args: Parameters<typeof navigate>) => {
        hoisted.navigate(...args);
        return navigate(...args);
      };
    },
  };
});

const ROUND_TRIP =
  "/flights?origin=BNE&destination=KTM&departureDate=2030-01-10&returnDate=2030-01-20&adults=2&children=1&infants=0&cabinClass=business&passengers=3";

const at = (hour: number) => new Date(2030, 0, 10, hour, 0, 0).toISOString();

function apiFlight(id: string, airline: string, price: number, stops = 0) {
  return {
    id, airline, airline_code: airline, price, currency: "USD", duration_minutes: 120, stops,
    segments: [{ from: "BNE", to: "KTM", depart_time: at(8), arrive_time: at(10), airline, airline_code: airline }],
  };
}

/*
 * Two differently-priced results: the desktop layout renders the filters panel,
 * whose price slider needs a real range. A single result collapses min to max
 * and Radix throws inside jsdom.
 */
const FLIGHTS = [apiFlight("f1", "QF", 200), apiFlight("f2", "JQ", 300, 1)];

function renderResults(route = ROUND_TRIP) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ flights: FLIGHTS, meta: { total_found: FLIGHTS.length, is_complete: true } }),
  }));
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

const editPanel = () => screen.getByRole("region", { name: "Edit search" });
const flightActivity = () => loadRecentActivity().filter((e): e is FlightActivity => e.kind === "flight");

async function renderWithResults() {
  const utils = renderResults();
  await waitFor(() =>
    expect(document.querySelectorAll('[aria-label="Flight results"] article').length).toBe(FLIGHTS.length),
  );
  return utils;
}

async function openEdit() {
  fireEvent.click(screen.getByRole("button", { name: "Edit" }));
  await screen.findByRole("region", { name: "Edit search" });
}

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  hoisted.navigate.mockClear();
  vi.clearAllMocks();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("FlightResults desktop Edit — write boundary", () => {
  it("hosts the desktop search form in the Edit panel", async () => {
    await renderWithResults();
    await openEdit();

    expect(within(editPanel()).getByRole("button", { name: /search flights/i })).toBeTruthy();
  });

  it("writes nothing when results simply load", async () => {
    await renderWithResults();

    expect(loadRecentActivity()).toHaveLength(0);
  });

  it("writes nothing when Edit is opened", async () => {
    await renderWithResults();
    await openEdit();

    expect(loadRecentActivity()).toHaveLength(0);
  });

  it("writes nothing when Edit is cancelled", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(within(editPanel()).getByRole("button", { name: "Cancel" }));

    await waitFor(() => expect(screen.queryByRole("region", { name: "Edit search" })).toBeNull());
    expect(loadRecentActivity()).toHaveLength(0);
  });

  it("writes exactly one activity for a committed edit", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(within(editPanel()).getByRole("button", { name: /search flights/i }));

    expect(flightActivity()).toHaveLength(1);
  });

  it("records the search behind the results, with city labels", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(within(editPanel()).getByRole("button", { name: /search flights/i }));

    const entry = flightActivity()[0];
    expect(entry.origin).toBe("BNE");
    expect(entry.destination).toBe("KTM");
    expect(entry.originLabel).toBe("Brisbane");
    expect(entry.destinationLabel).toBe("Kathmandu");
    expect(entry.departureDate).toBe("2030-01-10");
    expect(entry.returnDate).toBe("2030-01-20");
    expect(entry.travellers).toEqual({ adults: 2, children: 1, infants: 0 });
    expect(entry.cabinClass).toBe("business");
  });

  it("records through ModernFlightSearch only — FlightResults adds no second writer", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(within(editPanel()).getByRole("button", { name: /search flights/i }));

    // One committed submit, one entry. A duplicate recorder would dedupe to one
    // entry but write twice, so assert the raw stored list too.
    const raw = JSON.parse(localStorage.getItem("bf_recent_activity")!);
    expect(raw.items).toHaveLength(1);
    expect(flightActivity()).toHaveLength(1);
  });

  it("still navigates to the canonical /flights URL", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(within(editPanel()).getByRole("button", { name: /search flights/i }));

    const url = hoisted.navigate.mock.calls.at(-1)?.[0] as string;
    expect(url.startsWith("/flights?")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("origin")).toBe("BNE");
    expect(params.get("destination")).toBe("KTM");
  });
});
