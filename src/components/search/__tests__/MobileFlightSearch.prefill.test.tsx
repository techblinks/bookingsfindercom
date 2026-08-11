/**
 * Explore-route prefill regression tests — MOBILE MobileFlightSearch.
 *
 * Locks the hotfix behaviour:
 *   - a direct /flights?origin=SYD&destination=MOW URL populates From/To;
 *   - explicit URL origin/destination overrides stale TripContext values;
 *   - TripContext still works when the URL carries no params;
 *   - the protected V1 task layout is unchanged and nothing auto-searches.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { TripProvider } from "@/context/TripContext";
import MobileFlightSearch from "@/components/search/MobileFlightSearch";

const hoisted = vi.hoisted(() => ({ navigate: vi.fn() }));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => hoisted.navigate };
});

// NativeLocationPicker imports the supabase client at module load; without env
// vars createClient throws ("supabaseUrl is required"). This suite tests prefill
// behaviour, not supabase — stub the client so the suite can load locally.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: [] }) },
    auth: { getSession: vi.fn().mockResolvedValue({ data: { session: null } }) },
  },
}));

function seedTrip(state: object) {
  localStorage.setItem(
    "bf_trip_context",
    JSON.stringify({ version: 1, updatedAt: new Date().toISOString(), ...state }),
  );
}

function renderAt(entry: string) {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <TripProvider>
        <MobileFlightSearch />
      </TripProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  hoisted.navigate.mockClear();
});

describe("MobileFlightSearch — URL prefill", () => {
  it("populates From/To from a direct SYD/MOW URL", () => {
    renderAt("/flights?origin=SYD&destination=MOW");
    expect(screen.getByText("Sydney")).toBeTruthy();
    expect(screen.getByText("SYD")).toBeTruthy();
    expect(screen.getByText("Moscow")).toBeTruthy();
    expect(screen.getByText("MOW")).toBeTruthy();
  });

  it("explicit URL origin/destination overrides TripContext locations", () => {
    seedTrip({
      origin: { name: "Sydney", airportCode: "SYD" },
      destination: { name: "Melbourne", airportCode: "MEL" },
    });
    renderAt("/flights?origin=LHR&destination=MOW");
    expect(screen.getByText("London")).toBeTruthy();
    expect(screen.getByText("LHR")).toBeTruthy();
    expect(screen.getByText("Moscow")).toBeTruthy();
    expect(screen.getByText("MOW")).toBeTruthy();
    expect(screen.queryByText("Sydney")).toBeNull();
    expect(screen.queryByText("Melbourne")).toBeNull();
  });

  it("merges a partial URL with TripContext for the missing side", () => {
    // URL supplies only origin=SYD; TripContext has origin MEL + destination KTM.
    seedTrip({
      origin: { name: "Melbourne", airportCode: "MEL" },
      destination: { name: "Kathmandu", airportCode: "KTM" },
    });
    renderAt("/flights?origin=SYD");
    // URL wins for From; the other TripContext field is preserved, not erased.
    expect(screen.getByText("Sydney")).toBeTruthy();
    expect(screen.getByText("SYD")).toBeTruthy();
    expect(screen.getByText("Kathmandu")).toBeTruthy();
    expect(screen.getByText("KTM")).toBeTruthy();
    expect(screen.queryByText("Melbourne")).toBeNull();
  });

  it("keeps TripContext working when the URL has no params", () => {
    seedTrip({
      origin: { name: "Sydney", airportCode: "SYD" },
      destination: { name: "Kathmandu", airportCode: "KTM" },
    });
    renderAt("/flights");
    expect(screen.getByText("Sydney")).toBeTruthy();
    expect(screen.getByText("SYD")).toBeTruthy();
    expect(screen.getByText("Kathmandu")).toBeTruthy();
    expect(screen.getByText("KTM")).toBeTruthy();
  });

  it("renders the full mobile task layout unchanged with URL prefill", () => {
    renderAt("/flights?origin=SYD&destination=MOW");
    expect(screen.getByText("Round trip")).toBeTruthy();
    expect(screen.getByText("One way")).toBeTruthy();
    expect(screen.getByText("From")).toBeTruthy();
    expect(screen.getByText("To")).toBeTruthy();
    expect(screen.getByText(/Dates|Departure/)).toBeTruthy();
    expect(screen.getByText(/Travellers/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /search flights/i })).toBeTruthy();
  });

  /*
   * Regression: TripDestination.airportCode is OPTIONAL. A trip set from Stays
   * or the planner carries a city name with no code, and the URL-hydration
   * effects fed that undefined straight into state — the code badge then threw
   * `Cannot read properties of undefined (reading 'toUpperCase')` and the whole
   * mobile search screen unmounted.
   */
  it("renders a TripContext location that has no airportCode", () => {
    seedTrip({ destination: { name: "Sydney" } });
    renderAt("/flights");
    expect(screen.getByText("Sydney")).toBeTruthy();
    // Still usable — the form did not crash out to an empty tree.
    expect(screen.getByRole("button", { name: /search flights/i })).toBeTruthy();
  });

  it("renders a codeless TripContext origin alongside a URL destination", () => {
    seedTrip({ origin: { name: "Sydney" } });
    renderAt("/flights?destination=MOW");
    expect(screen.getByText("Sydney")).toBeTruthy();
    expect(screen.getByText("Moscow")).toBeTruthy();
    expect(screen.getByText("MOW")).toBeTruthy();
    expect(screen.getByRole("button", { name: /search flights/i })).toBeTruthy();
  });

  it("does not auto-search on a prefill-only URL", () => {
    renderAt("/flights?origin=SYD&destination=MOW");
    expect(screen.getByText("Sydney")).toBeTruthy();
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });
});
