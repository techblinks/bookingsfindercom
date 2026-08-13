/**
 * Mobile V2 Phase 2A-2 — recent-activity WRITE layer for mobile flight search.
 *
 * Behavioural: the real recentActivity model is used and the store is read back
 * through loadRecentActivity, so these tests prove what a returning user would
 * actually find. The model's own validation is covered by its 138 tests and is
 * not re-tested here.
 *
 * The three sheets are stubbed because their pickers are not the subject: what
 * matters is that a committed selection reaches the recorder exactly once, and
 * only after every validation rule has passed.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import MobileFlightSearch from "@/components/search/MobileFlightSearch";
import {
  loadRecentActivity,
  RECENT_ACTIVITY_STORAGE_KEY,
  type FlightActivity,
} from "@/lib/recentActivity";

const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));

vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => navigateSpy };
});

const CITY: Record<string, string> = { SYD: "Sydney", MEL: "Melbourne", LHR: "London" };

vi.mock("@/components/search/NativeLocationPicker", () => ({
  default: ({
    isOpen,
    onClose,
    onSelect,
    title,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (code: string, airport: { code: string; city: string; country: string; name: string }) => void;
    title: string;
  }) => {
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
  default: ({
    isOpen,
    onClose,
    onRangeSelect,
  }: {
    isOpen: boolean;
    onClose: () => void;
    onRangeSelect: (departure: Date, ret?: Date) => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div>
        <button
          onClick={() => {
            onRangeSelect(new Date(2030, 0, 10), new Date(2030, 0, 20));
            onClose();
          }}
        >
          pick-range
        </button>
        <button
          onClick={() => {
            onRangeSelect(new Date(2030, 0, 10));
            onClose();
          }}
        >
          pick-departure-only
        </button>
      </div>
    );
  },
}));

vi.mock("@/components/search/PassengerPickerSheet", () => ({
  PassengerPickerSheet: ({
    isOpen,
    onPassengersChange,
    onCabinChange,
  }: {
    isOpen: boolean;
    onPassengersChange: (p: { adults: number; children: number; infants: number }) => void;
    onCabinChange: (c: string) => void;
  }) => {
    if (!isOpen) return null;
    return (
      <div>
        <button onClick={() => onPassengersChange({ adults: 2, children: 1, infants: 0 })}>set-travellers</button>
        <button onClick={() => onCabinChange("business")}>set-cabin-business</button>
      </div>
    );
  },
}));

function renderSearch() {
  return render(
    <MemoryRouter>
      <TripProvider>
        <MobileFlightSearch />
      </TripProvider>
    </MemoryRouter>
  );
}

const click = (name: string | RegExp) => fireEvent.click(screen.getByRole("button", { name }));

/** Open the From sheet and commit a code. */
function chooseOrigin(code: string) {
  click(/^From/);
  click(`from:${code}`);
}

function chooseDestination(code: string) {
  click(/^To/);
  click(`to:${code}`);
}

function openDates() {
  click(/Dates|Departure/);
}

function openTravellers() {
  click(/Travellers & Cabin/);
}

function search() {
  click(/search flights/i);
}

function flights(): FlightActivity[] {
  return loadRecentActivity().filter((e): e is FlightActivity => e.kind === "flight");
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── RECORDED ON A VALID SUBMISSION ──

describe("MobileFlightSearch — records a committed flight search", () => {
  function commitRoundtrip() {
    renderSearch();
    chooseOrigin("SYD");
    chooseDestination("MEL");
    openDates();
    click("pick-range");
    openTravellers();
    click("set-travellers");
    click("set-cabin-business");
    search();
  }

  it("records exactly one flight activity", () => {
    commitRoundtrip();
    expect(loadRecentActivity()).toHaveLength(1);
    expect(flights()).toHaveLength(1);
  });

  it("records the exact origin and destination codes", () => {
    commitRoundtrip();
    const [entry] = flights();
    expect(entry.origin).toBe("SYD");
    expect(entry.destination).toBe("MEL");
  });

  it("records the display labels the user saw", () => {
    commitRoundtrip();
    const [entry] = flights();
    expect(entry.originLabel).toBe("Sydney");
    expect(entry.destinationLabel).toBe("Melbourne");
  });

  it("records the explicit departure and return dates", () => {
    commitRoundtrip();
    const [entry] = flights();
    expect(entry.departureDate).toBe("2030-01-10");
    expect(entry.returnDate).toBe("2030-01-20");
  });

  it("records the committed travellers", () => {
    commitRoundtrip();
    expect(flights()[0].travellers).toEqual({ adults: 2, children: 1, infants: 0 });
  });

  it("records the committed cabin class", () => {
    commitRoundtrip();
    expect(flights()[0].cabinClass).toBe("business");
  });

  it("leaves navigation exactly as it was", () => {
    commitRoundtrip();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith(
      "/flights?origin=SYD&destination=MEL&departureDate=2030-01-10&passengers=3&adults=2&children=1&infants=0&cabinClass=business&returnDate=2030-01-20"
    );
  });

  it("records no prices, providers, URLs or coordinates", () => {
    commitRoundtrip();
    const raw = localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!;
    expect(raw).not.toMatch(/http|price|provider|affiliate|lat|lng/i);
  });

  it("writes nothing to the trip context", () => {
    // TripProvider persists its own empty envelope on mount; what matters is
    // that committing a search leaves that value byte-identical — no origin,
    // destination, dates or travellers are written back.
    renderSearch();
    chooseOrigin("SYD");
    chooseDestination("MEL");
    openDates();
    click("pick-range");
    openTravellers();
    click("set-travellers");

    const before = localStorage.getItem("bf_trip_context");
    search();

    expect(localStorage.getItem("bf_trip_context")).toBe(before);
    const trip = JSON.parse(before ?? "{}");
    expect(trip.origin).toBeUndefined();
    expect(trip.destination).toBeUndefined();
    expect(trip.dates).toBeUndefined();
    expect(trip.travellers).toBeUndefined();
    expect(flights()).toHaveLength(1);
  });
});

describe("MobileFlightSearch — one way", () => {
  it("records a one-way search without a return date", () => {
    renderSearch();
    click("One way");
    chooseOrigin("SYD");
    chooseDestination("LHR");
    openDates();
    click("pick-departure-only");
    search();

    const [entry] = flights();
    expect(entry.departureDate).toBe("2030-01-10");
    expect(entry.returnDate).toBeUndefined();
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy.mock.calls[0][0]).not.toContain("returnDate");
  });
});

// ── NOTHING RECORDED ON AN INVALID SUBMISSION ──

describe("MobileFlightSearch — invalid submissions record nothing", () => {
  function expectNoActivity() {
    expect(loadRecentActivity()).toEqual([]);
    expect(localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  }

  it("missing origin records nothing", () => {
    renderSearch();
    chooseDestination("MEL");
    openDates();
    click("pick-range");
    search();
    expectNoActivity();
  });

  it("missing destination records nothing", () => {
    renderSearch();
    chooseOrigin("SYD");
    openDates();
    click("pick-range");
    search();
    expectNoActivity();
  });

  it("identical origin and destination records nothing", () => {
    renderSearch();
    chooseOrigin("SYD");
    chooseDestination("SYD");
    openDates();
    click("pick-range");
    search();
    expectNoActivity();
  });

  it("missing departure date records nothing", () => {
    renderSearch();
    chooseOrigin("SYD");
    chooseDestination("MEL");
    search();
    expectNoActivity();
  });

  it("a round trip with no return date records nothing", () => {
    renderSearch();
    chooseOrigin("SYD");
    chooseDestination("MEL");
    openDates();
    click("pick-departure-only");
    search();
    expectNoActivity();
  });

  it("an empty form records nothing", () => {
    renderSearch();
    search();
    expectNoActivity();
  });
});

// ── NOT A COMMIT ──

describe("MobileFlightSearch — non-commit interactions record nothing", () => {
  it("initial render records nothing", () => {
    renderSearch();
    expect(loadRecentActivity()).toEqual([]);
  });

  it("selecting fields, swapping and Start fresh record nothing without a submit", () => {
    localStorage.setItem(
      "bf_trip_context",
      JSON.stringify({
        version: 1,
        updatedAt: new Date().toISOString(),
        origin: { name: "Sydney", airportCode: "SYD" },
      })
    );
    renderSearch();
    chooseOrigin("SYD");
    chooseDestination("MEL");
    openDates();
    click("pick-range");
    click(/swap/i);
    click("Start fresh");

    expect(loadRecentActivity()).toEqual([]);
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
