/**
 * Phase 2A-2.5B — mobile flight-results filters.
 *
 * These tests drive the REAL useFlightSearch hook (only its network call is
 * stubbed), so the filtering engine, the sort, the pagination reset and the
 * sheet's draft/apply behaviour are all exercised end to end. Nothing here
 * re-implements a filter predicate, and nothing asserts on source text.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { TripProvider } from "@/context/TripContext";
import FlightResults from "@/pages/FlightResults";

const hoisted = vi.hoisted(() => ({ isMobile: true }));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => hoisted.isMobile }));
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

const RESULTS_ROUTE =
  "/flights?origin=BNE&destination=SYD&departureDate=2026-08-18&adults=1&children=0&infants=0&cabinClass=economy&passengers=1";

/** Local-time ISO so DEPARTURE_TIME_SLOTS (which read local hours) are deterministic. */
const at = (hour: number) => new Date(2026, 7, 18, hour, 0, 0).toISOString();

function apiFlight(
  id: string,
  airline: string,
  price: number,
  durationMinutes: number,
  stops: number,
  departHour: number,
) {
  return {
    id,
    airline,
    airline_code: airline,
    price,
    currency: "USD",
    duration_minutes: durationMinutes,
    stops,
    segments: [
      { from: "BNE", to: "SYD", depart_time: at(departHour), arrive_time: at(departHour + 2), airline, airline_code: airline },
    ],
  };
}

/** Three results that differ on every filterable axis. */
const FLIGHTS = [
  apiFlight("f1", "QF", 100, 60, 0, 8), // direct, morning, cheapest, shortest
  apiFlight("f2", "JQ", 200, 120, 1, 14), // 1 stop, afternoon
  apiFlight("f3", "VA", 300, 180, 2, 20), // 2 stops, evening, dearest, longest
];

function stubFlights(flights: unknown[]) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ flights, meta: { total_found: flights.length, is_complete: true } }),
    }),
  );
}

function renderResults() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[RESULTS_ROUTE]}>
        <TripProvider>
          <FlightResults />
        </TripProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

/*
 * Queried through the DOM rather than by accessible role: an open Radix sheet
 * marks everything behind it aria-hidden, and the enhanced empty state renders
 * its own <li> recovery lists, so role-based counting would be wrong in exactly
 * the states these tests care about. Flight cards are <article> elements inside
 * the results list, which neither the empty state nor the sheet produces.
 */
const resultCards = () => Array.from(document.querySelectorAll('[aria-label="Flight results"] article'));
const filtersTrigger = () => document.querySelector<HTMLButtonElement>('button[aria-label^="Filters"]')!;
const triggerLabel = () => filtersTrigger().getAttribute("aria-label");
const mainText = () => document.querySelector("main")!.textContent ?? "";
const sheet = () => screen.getByRole("dialog");
const showResults = () => within(sheet()).getByRole("button", { name: /show results/i });
const resetInSheet = () => within(sheet()).getByRole("button", { name: /^reset$/i });

const INITIAL_PAGE = 10;

async function renderWithResults(flights: unknown[] = FLIGHTS) {
  stubFlights(flights);
  const utils = renderResults();
  const firstPage = Math.min(flights.length, INITIAL_PAGE);
  await waitFor(() => expect(resultCards().length).toBe(firstPage));
  return utils;
}

async function openFilters() {
  fireEvent.click(filtersTrigger());
  await screen.findByRole("dialog");
}

/** Check a filter checkbox inside the open sheet by its visible label text. */
function checkInSheet(label: string | RegExp) {
  const control = within(sheet()).getByText(label).closest("label")!;
  fireEvent.click(within(control).getByRole("checkbox"));
}

/*
 * Slider thumbs in the sheet, in section order: Price is the first section and
 * Duration the last, and each range renders two thumbs since the shared Slider
 * derives its thumb count from the supplied values.
 */
const PRICE_MIN = 0;
const PRICE_MAX = 1;
const DURATION_MIN = 2;
const DURATION_MAX = 3;

/** Radix moves whichever thumb was focused last, so focus it for real first. */
function pressOnThumb(index: number, key: string, times = 1) {
  const thumbs = within(sheet()).getAllByRole("slider");
  (thumbs[index] as HTMLElement).focus();
  for (let i = 0; i < times; i++) fireEvent.keyDown(thumbs[index], { key });
}

const thumbValues = () =>
  within(sheet())
    .getAllByRole("slider")
    .map(t => t.getAttribute("aria-valuenow"));

/** Duration is collapsed by default. */
async function openDuration() {
  fireEvent.click(within(sheet()).getByRole("button", { name: "Duration" }));
  await waitFor(() => expect(within(sheet()).getAllByRole("slider").length).toBe(4));
}

beforeEach(() => {
  hoisted.isMobile = true;
  // FlightResults observes a load-more sentinel; jsdom has no IntersectionObserver.
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── TRIGGER AND SHEET ──

describe("mobile flight results — filters entry point", () => {
  it("renders a labelled Filters trigger beside the sort control", async () => {
    await renderWithResults();
    expect(filtersTrigger()).toBeTruthy();
    expect(screen.getByRole("radiogroup", { name: /sort flights/i })).toBeTruthy();
  });

  it("hides the Filters trigger at lg, where the sidebar takes over", async () => {
    hoisted.isMobile = false;
    await renderWithResults();
    // The trigger tracks the sidebar breakpoint rather than the mobile search
    // one, so it stays mounted for the 768-1023 band and is hidden from lg up.
    expect(filtersTrigger().closest("div.lg\\:hidden")).toBeTruthy();
  });

  it("keeps the Filters trigger available in the tablet band", async () => {
    hoisted.isMobile = false;
    await renderWithResults();
    expect(filtersTrigger()).toBeTruthy();
    expect(triggerLabel()).toBe("Filters");
  });

  it("desktop still renders the sidebar filter panel", async () => {
    hoisted.isMobile = false;
    await renderWithResults();
    expect(screen.getByRole("heading", { name: "Filters", level: 2 })).toBeTruthy();
    expect(screen.getByText("Price")).toBeTruthy();
    expect(screen.getByText("Stops")).toBeTruthy();
  });

  it("opening the sheet shows every existing filter category", async () => {
    await renderWithResults();
    await openFilters();
    const panel = within(sheet());
    expect(panel.getByText("Price")).toBeTruthy();
    expect(panel.getByText("Stops")).toBeTruthy();
    expect(panel.getByText("Airlines")).toBeTruthy();
    expect(panel.getByText("Departure Time")).toBeTruthy();
    expect(panel.getByText("Duration")).toBeTruthy();
    expect(within(sheet()).getByText("Filters")).toBeTruthy();
  });

  it("shows genuine result counts beside the stop options", async () => {
    await renderWithResults();
    await openFilters();
    const direct = within(sheet()).getByText("Direct").closest("label")!;
    expect(within(direct).getByText("1")).toBeTruthy();
  });
});

// ── DRAFT / APPLY / DISCARD ──

describe("mobile flight results — draft, apply and discard", () => {
  it("selecting a filter does not change the results before Apply", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");

    expect(resultCards().length).toBe(3);
    expect(mainText()).toContain("3 flights found");
  });

  it("Apply commits the draft and filters the results", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(1));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("dismissing with Escape discards the draft", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.keyDown(sheet(), { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(resultCards().length).toBe(3);
    expect(triggerLabel()).toBe("Filters");
  });

  it("reopening starts from the applied filters, not an abandoned draft", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.keyDown(sheet(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    await openFilters();
    const direct = within(sheet()).getByText("Direct").closest("label")!;
    expect(within(direct).getByRole("checkbox").getAttribute("data-state")).toBe("unchecked");
  });

  it("reopening after Apply shows the applied selection", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(1));

    await openFilters();
    const direct = within(sheet()).getByText("Direct").closest("label")!;
    expect(within(direct).getByRole("checkbox").getAttribute("data-state")).toBe("checked");
  });

  it("Reset clears the draft without touching applied results", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(1));

    await openFilters();
    fireEvent.click(resetInSheet());

    const direct = within(sheet()).getByText("Direct").closest("label")!;
    expect(within(direct).getByRole("checkbox").getAttribute("data-state")).toBe("unchecked");
    expect(resultCards().length).toBe(1); // still filtered until the user confirms
  });

  it("Reset then Apply clears the applied filters", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(1));

    await openFilters();
    fireEvent.click(resetInSheet());
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(3));
    expect(triggerLabel()).toBe("Filters");
  });
});

// ── ACTIVE COUNT ──

describe("mobile flight results — active filter count", () => {
  it("counts nothing before any filter is applied", async () => {
    await renderWithResults();
    expect(triggerLabel()).toBe("Filters");
  });

  it("updates only after Apply, and counts each constraint once", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    checkInSheet("Morning");

    // Draft only — the trigger behind the sheet still reads as unfiltered.
    expect(triggerLabel()).toBe("Filters");

    fireEvent.click(showResults());
    await waitFor(() => expect(triggerLabel()).toBe("Filters, 2 active"));
  });

  it("communicates the active state with a visible number, not colour alone", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());

    await waitFor(() => expect(triggerLabel()).toBe("Filters, 1 active"));
    expect(filtersTrigger().textContent).toContain("1");
  });
});

// ── EVERY FILTER APPLIES ──

describe("mobile flight results — each filter applies", () => {
  it("stops: Direct keeps only the direct flight", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(1));
  });

  it("airlines: selecting one airline keeps only its flights", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("JQ");
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(1));
  });

  it("departure time: Evening keeps only the evening flight", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Evening");
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(1));
  });

  it("price: raising the lower bound drops the cheaper flights", async () => {
    await renderWithResults();
    await openFilters();

    pressOnThumb(PRICE_MIN, "ArrowRight", 5); // $100 → $150 in $10 steps
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(2));
    expect(triggerLabel()).toBe("Filters, 1 active");
  });

  it("price: lowering the upper bound drops the dearer flights", async () => {
    await renderWithResults();
    await openFilters();

    pressOnThumb(PRICE_MAX, "ArrowLeft", 5); // $300 → $250
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(2));
    expect(triggerLabel()).toBe("Filters, 1 active");
  });

  it("price: both endpoints together keep only the middle flight", async () => {
    await renderWithResults();
    await openFilters();

    pressOnThumb(PRICE_MIN, "ArrowRight", 5); // $150
    pressOnThumb(PRICE_MAX, "ArrowLeft", 5); // $250
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(1));
  });

  it("duration: raising the lower bound drops the shortest flight", async () => {
    await renderWithResults();
    await openFilters();
    await openDuration();

    pressOnThumb(DURATION_MIN, "ArrowRight", 5); // 0 → 75 minutes in 15-minute steps
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(2));
    expect(triggerLabel()).toBe("Filters, 1 active");
  });

  it("duration: lowering the upper bound drops the longest flight", async () => {
    await renderWithResults();
    await openFilters();
    await openDuration();

    pressOnThumb(DURATION_MAX, "ArrowLeft", 4); // 180 → 120 minutes
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(2));
    expect(triggerLabel()).toBe("Filters, 1 active");
  });

  it("duration: both endpoints together keep only the middle flight", async () => {
    await renderWithResults();
    await openFilters();
    await openDuration();

    pressOnThumb(DURATION_MIN, "ArrowRight", 5); // 75 minutes
    pressOnThumb(DURATION_MAX, "ArrowLeft", 4); // 120 minutes
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(1));
  });

  it("combines filters with AND semantics", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    checkInSheet("Evening"); // the direct flight departs in the morning
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(0));
  });
});

// ── RANGE ENDPOINTS UNDER THE DRAFT RULES ──

describe("mobile flight results — range endpoints obey the draft rules", () => {
  it("both range filters expose two independent thumbs", async () => {
    await renderWithResults();
    await openFilters();
    expect(within(sheet()).getAllByRole("slider")).toHaveLength(2); // price
    await openDuration();
    expect(within(sheet()).getAllByRole("slider")).toHaveLength(4); // + duration
  });

  it("starts spanning the full range of the loaded results", async () => {
    await renderWithResults();
    await openFilters();
    await openDuration();
    expect(thumbValues()).toEqual(["100", "300", "0", "180"]);
  });

  it("moving the upper bound does not change results before Apply", async () => {
    await renderWithResults();
    await openFilters();

    pressOnThumb(PRICE_MAX, "ArrowLeft", 15); // $300 → $150 in the draft only
    expect(resultCards().length).toBe(3);
    expect(mainText()).toContain("3 flights found");
    expect(triggerLabel()).toBe("Filters");
  });

  it("dismissing discards an upper-bound change", async () => {
    await renderWithResults();
    await openFilters();
    pressOnThumb(PRICE_MAX, "ArrowLeft", 15);
    fireEvent.keyDown(sheet(), { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());

    expect(resultCards().length).toBe(3);
    await openFilters();
    expect(thumbValues()).toEqual(["100", "300"]);
  });

  it("Reset restores both endpoints of both ranges", async () => {
    await renderWithResults();
    await openFilters();
    await openDuration();

    pressOnThumb(PRICE_MIN, "ArrowRight", 3);
    pressOnThumb(PRICE_MAX, "ArrowLeft", 3);
    pressOnThumb(DURATION_MIN, "ArrowRight", 2);
    pressOnThumb(DURATION_MAX, "ArrowLeft", 2);
    expect(thumbValues()).toEqual(["130", "270", "30", "150"]);

    fireEvent.click(resetInSheet());
    expect(thumbValues()).toEqual(["100", "300", "0", "180"]);
    expect(resultCards().length).toBe(3); // nothing applied yet
  });

  it("Reset then Apply clears an applied range narrowing", async () => {
    await renderWithResults();
    await openFilters();
    pressOnThumb(PRICE_MAX, "ArrowLeft", 5);
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(2));

    await openFilters();
    fireEvent.click(resetInSheet());
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(3));
    expect(triggerLabel()).toBe("Filters");
  });
});

// ── DESKTOP SIDEBAR GETS THE SAME FIX ──

describe("desktop sidebar — range endpoints work directly", () => {
  it("renders two thumbs per range and applies the upper bound immediately", async () => {
    hoisted.isMobile = false;
    await renderWithResults();

    const sidebar = document.querySelector("aside")!;
    const thumbs = within(sidebar as HTMLElement).getAllByRole("slider");
    expect(thumbs).toHaveLength(2); // price; duration starts collapsed

    (thumbs[1] as HTMLElement).focus();
    for (let i = 0; i < 5; i++) fireEvent.keyDown(thumbs[1], { key: "ArrowLeft" }); // $300 → $250

    // The desktop panel commits directly — there is no draft on this surface.
    await waitFor(() => expect(resultCards().length).toBe(2));
  });
});

// ── RESULT BEHAVIOUR AROUND APPLY ──

describe("mobile flight results — surrounding behaviour survives Apply", () => {
  it("updates the result count", async () => {
    await renderWithResults();
    expect(mainText()).toContain("3 flights found");

    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());

    await waitFor(() => expect(mainText()).toContain("1 flight found"));
  });

  it("keeps the chosen sort selected", async () => {
    await renderWithResults();
    fireEvent.click(screen.getByRole("radio", { name: "Cheapest" }));

    await openFilters();
    checkInSheet("Direct");
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(1));
    expect(screen.getByRole("radio", { name: "Cheapest" }).getAttribute("aria-checked")).toBe("true");
  });

  it("resets pagination through the existing display-count behaviour", async () => {
    const many = Array.from({ length: 12 }, (_, i) => apiFlight(`m${i}`, "QF", 100 + i, 60, 0, 8));
    await renderWithResults(many); // 12 direct flights, first page shows 10

    fireEvent.click(screen.getByRole("button", { name: /load more/i }));
    await waitFor(() => expect(resultCards().length).toBe(12));

    await openFilters();
    checkInSheet("Direct"); // every flight is direct, so the set is unchanged
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(10));
    expect(screen.getByRole("button", { name: /load more/i })).toBeTruthy();
  });

  it("still reaches the enhanced empty state when filters exclude everything", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    checkInSheet("Evening");
    fireEvent.click(showResults());

    await waitFor(() => expect(resultCards().length).toBe(0));
    expect(screen.getByRole("button", { name: /clear (all )?filters/i })).toBeTruthy();
  });

  it("Clear filters from the empty state restores the results", async () => {
    await renderWithResults();
    await openFilters();
    checkInSheet("Direct");
    checkInSheet("Evening");
    fireEvent.click(showResults());
    await waitFor(() => expect(resultCards().length).toBe(0));

    fireEvent.click(screen.getByRole("button", { name: /clear (all )?filters/i }));
    await waitFor(() => expect(resultCards().length).toBe(3));
  });
});
