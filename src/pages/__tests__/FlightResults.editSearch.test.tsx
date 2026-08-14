/**
 * Phase 2A-2.5C — editing the current search from the results screen.
 *
 * Drives the real useFlightSearch (only its network call is stubbed) and the
 * real MobileFlightSearch, so prefill, validation, navigation, recent-activity
 * recording and the filter/sort reset are all exercised end to end. The search
 * form's own pickers are stubbed because they are full-screen overlays whose
 * internals are not the subject here — what matters is which values they are
 * opened with and what the form does with them.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import FlightResults from "@/pages/FlightResults";
import { loadRecentActivity, type FlightActivity } from "@/lib/recentActivity";

const hoisted = vi.hoisted(() => ({ isMobile: true, isBelowDesktop: true, navigate: vi.fn() }));

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

/*
 * The spy records what the form asked for and then performs the real in-memory
 * navigation, so a committed edit genuinely changes the route and the page reacts
 * exactly as it would in the browser — no hard reload, no simulated rerender.
 */
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

const CITY: Record<string, string> = { SYD: "Sydney", MEL: "Melbourne", BNE: "Brisbane", LHR: "London" };

vi.mock("@/components/search/NativeLocationPicker", () => ({
  default: ({ isOpen, onClose, onSelect, title }: any) => {
    if (!isOpen) return null;
    const side = title === "Where from?" ? "from" : "to";
    return (
      <div>
        {Object.keys(CITY).map(code => (
          <button
            key={code}
            onClick={() => {
              onSelect(code, { code, city: CITY[code], country: "AU", name: `${CITY[code]} Airport` });
              onClose();
            }}
          >
            {`${side}:${code}`}
          </button>
        ))}
      </div>
    );
  },
}));

vi.mock("@/components/search/NativeDatePicker", () => ({
  default: ({ isOpen, onClose, onRangeSelect, selected, returnSelected }: any) => {
    if (!isOpen) return null;
    const iso = (d?: Date) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}` : "none");
    return (
      <div>
        {/* Surfaces what the form handed the picker, so prefill is observable. */}
        <span data-testid="picker-departure">{iso(selected)}</span>
        <span data-testid="picker-return">{iso(returnSelected)}</span>
        <button onClick={() => { onRangeSelect(new Date(2030, 5, 1), new Date(2030, 5, 15)); onClose(); }}>pick-new-range</button>
        <button onClick={() => { onRangeSelect(new Date(2030, 5, 1)); onClose(); }}>pick-new-departure</button>
      </div>
    );
  },
}));

vi.mock("@/components/search/PassengerPickerSheet", () => ({
  PassengerPickerSheet: ({ isOpen, passengers, cabinClass, onPassengersChange, onCabinChange }: any) => {
    if (!isOpen) return null;
    return (
      <div>
        <span data-testid="picker-passengers">{`${passengers.adults}/${passengers.children}/${passengers.infants}`}</span>
        <span data-testid="picker-cabin">{cabinClass}</span>
        <button onClick={() => onPassengersChange({ adults: 1, children: 0, infants: 0 })}>set-solo</button>
        <button onClick={() => onCabinChange("first")}>set-cabin-first</button>
      </div>
    );
  },
}));

const ROUND_TRIP =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&returnDate=2030-01-20&adults=2&children=1&infants=0&cabinClass=business&passengers=3";
const ONE_WAY =
  "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&adults=1&children=0&infants=0&cabinClass=economy&passengers=1";

const at = (hour: number) => new Date(2030, 0, 10, hour, 0, 0).toISOString();

function apiFlight(id: string, airline: string, price: number, stops = 0) {
  return {
    id, airline, airline_code: airline, price, currency: "USD", duration_minutes: 120, stops,
    segments: [{ from: "SYD", to: "MEL", depart_time: at(8), arrive_time: at(10), airline, airline_code: airline }],
  };
}

const FLIGHTS = [apiFlight("f1", "QF", 200), apiFlight("f2", "JQ", 300, 1)];

function stubFlights(flights: unknown[]) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
    ok: true,
    json: () => Promise.resolve({ flights, meta: { total_found: flights.length, is_complete: true } }),
  }));
}

function renderResults(route = ROUND_TRIP) {
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
const editPanel = () => screen.getByRole("region", { name: "Edit search" });
const editButton = () => screen.getByRole("button", { name: "Edit" });
const updateSearch = () => screen.getByRole("button", { name: /update search/i });
const flightActivity = () => loadRecentActivity().filter((e): e is FlightActivity => e.kind === "flight");
const lastUrl = () => (hoisted.navigate.mock.calls.at(-1)?.[0] as string | undefined) ?? "";

async function renderWithResults(route = ROUND_TRIP, flights: unknown[] = FLIGHTS) {
  stubFlights(flights);
  const utils = renderResults(route);
  await waitFor(() => expect(resultCards().length).toBe(flights.length));
  return utils;
}

async function openEdit() {
  fireEvent.click(editButton());
  await screen.findByRole("region", { name: "Edit search" });
}

/** Open one of the form's pickers so its stub can report what it was given. */
const openDates = () => fireEvent.click(within(editPanel()).getByText(/Dates|Departure/));
const openTravellers = () => fireEvent.click(within(editPanel()).getByText(/Travellers & Cabin/));
const openFrom = () => fireEvent.click(within(editPanel()).getByText(/^From/));
const openTo = () => fireEvent.click(within(editPanel()).getByText(/^To/));

beforeEach(() => {
  hoisted.isMobile = true;
  hoisted.isBelowDesktop = true;
  hoisted.navigate.mockClear();
  localStorage.clear();
  vi.stubGlobal("IntersectionObserver", class {
    observe() {} unobserve() {} disconnect() {}
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── ENTRY POINT ──

describe("results edit — entry point", () => {
  it("offers an Edit action on mobile results", async () => {
    await renderWithResults();
    expect(editButton()).toBeTruthy();
  });

  it("offers the same Edit action in the tablet band, with the mobile search form", async () => {
    hoisted.isMobile = false; // 768-1023: below lg, above the mobile breakpoint
    hoisted.isBelowDesktop = true;
    await renderWithResults();
    expect(editButton()).toBeTruthy();

    await openEdit();
    // Tablets get the constrained Mobile V2 form, not the wide desktop one.
    expect(within(editPanel()).getByRole("button", { name: /update search/i })).toBeTruthy();
    expect(editPanel().className).toContain("max-w-[560px]");
  });

  it("opening Edit records no activity and does not navigate", async () => {
    await renderWithResults();
    await openEdit();

    expect(loadRecentActivity()).toEqual([]);
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });

  it("New search points at a fresh form rather than this results URL", async () => {
    await renderWithResults();
    const back = screen.getByRole("button", { name: "New search" });
    expect(back.closest("a")?.getAttribute("href")).toBe("/flights");
  });
});

// ── PREFILL ──

describe("results edit — the current search is prefilled", () => {
  it("prefills the committed route with codes and city labels", async () => {
    await renderWithResults();
    await openEdit();

    const panel = within(editPanel());
    expect(panel.getByText("SYD")).toBeTruthy();
    expect(panel.getByText("Sydney")).toBeTruthy();
    expect(panel.getByText("MEL")).toBeTruthy();
    expect(panel.getByText("Melbourne")).toBeTruthy();
  });

  it("prefills departure and return dates for a round trip", async () => {
    await renderWithResults();
    await openEdit();
    openDates();

    expect(screen.getByTestId("picker-departure").textContent).toBe("2030-01-10");
    expect(screen.getByTestId("picker-return").textContent).toBe("2030-01-20");
  });

  it("opens a one-way search as one way with no return date", async () => {
    await renderWithResults(ONE_WAY);
    await openEdit();

    expect(within(editPanel()).getByText("One way").className).toContain("bg-card");
    openDates();
    expect(screen.getByTestId("picker-departure").textContent).toBe("2030-01-10");
    expect(screen.getByTestId("picker-return").textContent).toBe("none");
  });

  it("prefills the exact traveller mix", async () => {
    await renderWithResults();
    await openEdit();
    openTravellers();

    expect(screen.getByTestId("picker-passengers").textContent).toBe("2/1/0");
  });

  it("prefills the exact cabin class", async () => {
    await renderWithResults();
    await openEdit();

    expect(within(editPanel()).getByText(/Business/)).toBeTruthy();
    openTravellers();
    expect(screen.getByTestId("picker-cabin").textContent).toBe("business");
  });

  it("does not offer Start fresh while editing a committed search", async () => {
    localStorage.setItem("bf_trip_context", JSON.stringify({
      version: 1, updatedAt: new Date().toISOString(), origin: { name: "Perth", airportCode: "PER" },
    }));
    await renderWithResults();
    await openEdit();

    expect(within(editPanel()).queryByText("Start fresh")).toBeNull();
    // ...and the trip context has not replaced the searched route.
    expect(within(editPanel()).getByText("SYD")).toBeTruthy();
  });
});

// ── UPDATING ──

describe("results edit — updating the search", () => {
  it("changing origin navigates to the canonical URL", async () => {
    await renderWithResults();
    await openEdit();
    openFrom();
    fireEvent.click(screen.getByRole("button", { name: "from:BNE" }));
    fireEvent.click(updateSearch());

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalledTimes(1));
    expect(lastUrl()).toBe(
      "/flights?origin=BNE&destination=MEL&departureDate=2030-01-10&passengers=3&adults=2&children=1&infants=0&cabinClass=business&returnDate=2030-01-20",
    );
  });

  it("changing destination keeps every other committed field", async () => {
    await renderWithResults();
    await openEdit();
    openTo();
    fireEvent.click(screen.getByRole("button", { name: "to:LHR" }));
    fireEvent.click(updateSearch());

    await waitFor(() => expect(lastUrl()).toContain("destination=LHR"));
    expect(lastUrl()).toContain("origin=SYD");
    expect(lastUrl()).toContain("adults=2&children=1&infants=0");
    expect(lastUrl()).toContain("cabinClass=business");
  });

  it("changing dates updates both endpoints", async () => {
    await renderWithResults();
    await openEdit();
    openDates();
    fireEvent.click(screen.getByRole("button", { name: "pick-new-range" }));
    fireEvent.click(updateSearch());

    await waitFor(() => expect(lastUrl()).toContain("departureDate=2030-06-01"));
    expect(lastUrl()).toContain("returnDate=2030-06-15");
  });

  it("changing the traveller mix and cabin updates the URL", async () => {
    await renderWithResults();
    await openEdit();
    openTravellers();
    fireEvent.click(screen.getByRole("button", { name: "set-solo" }));
    fireEvent.click(screen.getByRole("button", { name: "set-cabin-first" }));
    fireEvent.click(updateSearch());

    await waitFor(() => expect(lastUrl()).toContain("adults=1&children=0&infants=0"));
    expect(lastUrl()).toContain("passengers=1");
    expect(lastUrl()).toContain("cabinClass=first");
  });

  it("switching a round trip to one way drops the return date", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(within(editPanel()).getByText("One way"));
    fireEvent.click(updateSearch());

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalledTimes(1));
    expect(lastUrl()).not.toContain("returnDate");
  });

  it("switching a one way to a round trip requires a return date", async () => {
    await renderWithResults(ONE_WAY);
    await openEdit();
    fireEvent.click(within(editPanel()).getByText("Round trip"));
    fireEvent.click(updateSearch());

    expect(hoisted.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Edit search" })).toBeTruthy();

    openDates();
    fireEvent.click(screen.getByRole("button", { name: "pick-new-range" }));
    fireEvent.click(updateSearch());
    await waitFor(() => expect(lastUrl()).toContain("returnDate=2030-06-15"));
  });

  it("navigates with the router rather than reloading the page", async () => {
    await renderWithResults();
    await openEdit();
    openFrom();
    fireEvent.click(screen.getByRole("button", { name: "from:BNE" }));
    fireEvent.click(updateSearch());

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalledTimes(1));
    expect(lastUrl().startsWith("/flights?")).toBe(true);
  });
});

// ── INVALID EDITS ──

describe("results edit — invalid edits are rejected", () => {
  it("an identical origin and destination does not navigate, close or record", async () => {
    await renderWithResults();
    await openEdit();
    openFrom();
    fireEvent.click(screen.getByRole("button", { name: "from:MEL" }));
    fireEvent.click(updateSearch());

    expect(hoisted.navigate).not.toHaveBeenCalled();
    expect(screen.getByRole("region", { name: "Edit search" })).toBeTruthy();
    expect(loadRecentActivity()).toEqual([]);
  });

  it("leaves applied filters untouched when the edit is invalid", async () => {
    await renderWithResults();
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(within(sheet).getByText("Direct").closest("label")!).getByRole("checkbox"));
    fireEvent.click(within(sheet).getByRole("button", { name: /show results/i }));
    await waitFor(() => expect(resultCards().length).toBe(1));

    await openEdit();
    openFrom();
    fireEvent.click(screen.getByRole("button", { name: "from:MEL" }));
    fireEvent.click(updateSearch());

    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);
    await waitFor(() => expect(resultCards().length).toBe(1));
  });
});

// ── RECENT ACTIVITY ──

describe("results edit — recent activity", () => {
  it("records exactly one flight activity for a committed edit", async () => {
    await renderWithResults();
    await openEdit();
    openFrom();
    fireEvent.click(screen.getByRole("button", { name: "from:BNE" }));
    fireEvent.click(updateSearch());

    await waitFor(() => expect(flightActivity()).toHaveLength(1));
    const [entry] = flightActivity();
    expect(entry.origin).toBe("BNE");
    expect(entry.destination).toBe("MEL");
    expect(entry.travellers).toEqual({ adults: 2, children: 1, infants: 0 });
    expect(entry.cabinClass).toBe("business");
    expect(loadRecentActivity()).toHaveLength(1);
  });

  it("records nothing when an edit is abandoned", async () => {
    await renderWithResults();
    await openEdit();
    openFrom();
    fireEvent.click(screen.getByRole("button", { name: "from:BNE" }));
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

    expect(loadRecentActivity()).toEqual([]);
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });
});

// ── CANCEL ──

describe("results edit — Cancel is a pure return", () => {
  it("restores the results without navigating", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

    expect(screen.queryByRole("region", { name: "Edit search" })).toBeNull();
    expect(resultCards().length).toBe(2);
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });

  it("preserves applied filters and the chosen sort", async () => {
    await renderWithResults();
    fireEvent.click(screen.getByRole("radio", { name: "Cheapest" }));
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(within(sheet).getByText("Direct").closest("label")!).getByRole("checkbox"));
    fireEvent.click(within(sheet).getByRole("button", { name: /show results/i }));
    await waitFor(() => expect(resultCards().length).toBe(1));

    await openEdit();
    fireEvent.click(screen.getAllByRole("button", { name: "Cancel" })[0]);

    expect(resultCards().length).toBe(1);
    expect(screen.getByRole("button", { name: "Filters, 1 active" })).toBeTruthy();
    expect(screen.getByRole("radio", { name: "Cheapest" }).getAttribute("aria-checked")).toBe("true");
  });
});

// ── A NEW SEARCH STARTS CLEAN ──

describe("results edit — a committed edit starts an unconstrained search", () => {
  /** Edit the route and commit, the way a traveller would. */
  async function commitNewRoute() {
    await openEdit();
    openFrom();
    fireEvent.click(screen.getByRole("button", { name: "from:BNE" }));
    openTo();
    fireEvent.click(screen.getByRole("button", { name: "to:LHR" }));
    fireEvent.click(updateSearch());
  }

  it("clears filters carried over from the previous search", async () => {
    await renderWithResults();

    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(within(sheet).getByText("QF").closest("label")!).getByRole("checkbox"));
    fireEvent.click(within(sheet).getByRole("button", { name: /show results/i }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Filters, 1 active" })).toBeTruthy());
    await waitFor(() => expect(resultCards().length).toBe(1)); // constrained to QF

    await commitNewRoute();

    // The QF-only constraint must not follow the traveller to SYD → LHR.
    await waitFor(() => expect(screen.getByRole("button", { name: "Filters" })).toBeTruthy());
    await waitFor(() => expect(resultCards().length).toBe(2));
  });

  it("returns the sort to Best and refetches with the edited criteria", async () => {
    await renderWithResults();
    fireEvent.click(screen.getByRole("radio", { name: "Fastest" }));
    expect(screen.getByRole("radio", { name: "Fastest" }).getAttribute("aria-checked")).toBe("true");

    await commitNewRoute();

    await waitFor(() => expect(screen.getByRole("radio", { name: "Best" }).getAttribute("aria-checked")).toBe("true"));
    await waitFor(() => {
      const body = JSON.parse(
        ((globalThis.fetch as ReturnType<typeof vi.fn>).mock.calls.at(-1)?.[1] as RequestInit).body as string,
      );
      expect(body.origin).toBe("BNE");
      expect(body.destination).toBe("LHR");
    });
  });

  it("leaves edit mode once the new search is committed", async () => {
    await renderWithResults();
    await commitNewRoute();

    await waitFor(() => expect(screen.queryByRole("region", { name: "Edit search" })).toBeNull());
    await waitFor(() => expect(resultCards().length).toBe(2));
  });

  it("closes the editor even when the criteria were not changed", async () => {
    await renderWithResults();
    await openEdit();
    fireEvent.click(updateSearch()); // valid submit, identical criteria

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole("region", { name: "Edit search" })).toBeNull());
    await waitFor(() => expect(resultCards().length).toBe(2));
  });

  it("keeps filters when the same criteria are re-submitted", async () => {
    await renderWithResults();
    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    const sheet = await screen.findByRole("dialog");
    fireEvent.click(within(within(sheet).getByText("Direct").closest("label")!).getByRole("checkbox"));
    fireEvent.click(within(sheet).getByRole("button", { name: /show results/i }));
    await waitFor(() => expect(resultCards().length).toBe(1));

    await openEdit();
    fireEvent.click(updateSearch());

    await waitFor(() => expect(screen.queryByRole("region", { name: "Edit search" })).toBeNull());
    expect(screen.getByRole("button", { name: "Filters, 1 active" })).toBeTruthy();
  });
});
