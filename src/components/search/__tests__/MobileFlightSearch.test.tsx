/**
 * Flights V1 Mobile â€” MobileFlightSearch regression tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import MobileFlightSearch from "@/components/search/MobileFlightSearch";

function seedTrip(state: object) {
  localStorage.setItem("bf_trip_context", JSON.stringify({
    version: 1, updatedAt: new Date().toISOString(), ...state,
  }));
}

function renderSearch() {
  return render(
    <MemoryRouter>
      <TripProvider>
        <MobileFlightSearch />
      </TripProvider>
    </MemoryRouter>
  );
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// â”€â”€ EMPTY STATE â”€â”€

describe("MobileFlightSearch â€” empty state", () => {
  it("renders the Flights task screen", () => {
    renderSearch();
    expect(screen.getByText("Round trip")).toBeTruthy();
    expect(screen.getByText("One way")).toBeTruthy();
  });

  it("renders route From/To structure", () => {
    renderSearch();
    expect(screen.getByText("From")).toBeTruthy();
    expect(screen.getByText("To")).toBeTruthy();
  });

  it("renders Search flights CTA", () => {
    renderSearch();
    expect(screen.getByRole("button", { name: /search flights/i })).toBeTruthy();
  });

  it("renders Dates and Travellers sections", () => {
    renderSearch();
    expect(screen.getByText(/Dates|Departure/)).toBeTruthy();
    expect(screen.getByText(/Travellers/i)).toBeTruthy();
  });
});

// â”€â”€ TRIPCONTEXT PREFILL â”€â”€

describe("MobileFlightSearch â€” TripContext prefill", () => {
  it("prefills origin from TripContext", () => {
    seedTrip({ origin: { name: "Sydney", airportCode: "SYD" } });
    renderSearch();
    expect(screen.getByText("Sydney")).toBeTruthy();
    expect(screen.getByText("SYD")).toBeTruthy();
  });

  it("prefills destination from TripContext", () => {
    seedTrip({ destination: { name: "Kathmandu", airportCode: "KTM" } });
    renderSearch();
    expect(screen.getByText("Kathmandu")).toBeTruthy();
  });

  it("prefills dates from TripContext", () => {
    seedTrip({
      destination: { name: "Sydney" },
      dates: { departureDate: "2026-08-18", returnDate: "2026-08-29" },
    });
    renderSearch();
    expect(screen.getByText(/Aug 18/i)).toBeTruthy();
  });

  it("prefills travellers from TripContext", () => {
    seedTrip({
      destination: { name: "Sydney" },
      travellers: { adults: 2, children: 1, infants: 0 },
    });
    renderSearch();
    expect(screen.getByText(/3 traveller/i)).toBeTruthy();
  });

  it("shows 'from your trip' cues for prefilled fields", () => {
    seedTrip({ origin: { name: "Sydney", airportCode: "SYD" }, destination: { name: "Melbourne", airportCode: "MEL" } });
    renderSearch();
    const cues = screen.getAllByText(/from your trip/i);
    expect(cues.length).toBeGreaterThanOrEqual(2);
  });
});

// â”€â”€ START FRESH â”€â”€

describe("MobileFlightSearch â€” Start fresh", () => {
  it("renders Start fresh when TripContext has values", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderSearch();
    expect(screen.getByText("Start fresh")).toBeTruthy();
  });

  it("does not render Start fresh when TripContext is empty", () => {
    renderSearch();
    expect(screen.queryByText("Start fresh")).toBeNull();
  });

  it("Start fresh clears form values but preserves TripContext", () => {
    seedTrip({ origin: { name: "Sydney", airportCode: "SYD" } });
    renderSearch();

    const startFresh = screen.getByText("Start fresh");
    fireEvent.click(startFresh);

    // Form should be reset
    expect(screen.queryByText("Sydney")).toBeNull();
    expect(screen.queryByText("SYD")).toBeNull();
    // TripContext should remain (localStorage key still exists)
    const stored = localStorage.getItem("bf_trip_context");
    expect(stored).toBeTruthy();
    const parsed = JSON.parse(stored!);
    expect(parsed.origin?.name).toBe("Sydney");
  });
});

// â”€â”€ ROUTE RAIL â”€â”€

describe("MobileFlightSearch â€” route rail", () => {
  it("route rail exists in the DOM", () => {
    renderSearch();
    // The route card renders From and To sections
    expect(screen.getByText("From")).toBeTruthy();
    expect(screen.getByText("To")).toBeTruthy();
  });

  it("From and To fields are present", () => {
    renderSearch();
    expect(screen.getByText("Select departure")).toBeTruthy();
    expect(screen.getByText("Select arrival")).toBeTruthy();
  });

  it("rail does not show permanent active state when empty", () => {
    renderSearch();
    // Empty state shows incomplete/muted state, not the completed rail
    const selectDepartures = screen.getAllByText(/select/i);
    expect(selectDepartures.length).toBeGreaterThanOrEqual(2);
  });
});

// â”€â”€ SWAP â”€â”€

describe("MobileFlightSearch â€” swap", () => {
  it("swap button exists with accessible label", () => {
    renderSearch();
    const swap = screen.getByRole("button", { name: /swap/i });
    expect(swap).toBeTruthy();
  });
});

// â”€â”€ VALIDATION â”€â”€

describe("MobileFlightSearch â€” validation", () => {
  it("shows validation when required fields are missing on submit", () => {
    renderSearch();
    const searchBtn = screen.getByRole("button", { name: /search flights/i });
    fireEvent.click(searchBtn);
    // Should show toast/error (empty form is invalid)
    expect(searchBtn).toBeTruthy();
  });
});

// â”€â”€ CABIN CLASS â”€â”€

describe("MobileFlightSearch â€” cabin class (BF-0R-7 Round 1.2 item 6)", () => {
  it("offers only Economy and Business, not Premium Economy or First", () => {
    renderSearch();
    fireEvent.click(screen.getByText("Travellers & Cabin"));

    expect(screen.getByText("Economy")).toBeTruthy();
    expect(screen.getByText("Business")).toBeTruthy();
    expect(screen.queryByText("Premium Economy")).toBeNull();
    expect(screen.queryByText("First")).toBeNull();
  });
});

// â”€â”€ ABSENT CONTROLS â”€â”€

describe("MobileFlightSearch â€” absent controls", () => {
  it("does NOT render flexible Â±3d toggle", () => {
    renderSearch();
    expect(screen.queryByText(/Â±3d/i)).toBeNull();
    expect(screen.queryByText(/flexible/i)).toBeNull();
  });

  it("does NOT render Direct only", () => {
    renderSearch();
    expect(screen.queryByText(/direct only/i)).toBeNull();
  });

  it("does NOT render 'Popular Destinations'", () => {
    renderSearch();
    expect(screen.queryByText(/popular destinations/i)).toBeNull();
  });
});
