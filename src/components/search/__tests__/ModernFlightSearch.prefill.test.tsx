/**
 * Explore-route prefill regression tests — DESKTOP ModernFlightSearch.
 *
 * Locks the hotfix behaviour for /flights route cards:
 *   - direct URL prefill hydrates From/To with friendly labels;
 *   - same-page SPA navigation updates an already-mounted form;
 *   - sequential route clicks update destination/origin;
 *   - dates, travellers and cabin class survive a route change;
 *   - prefill-only URLs never auto-search; searching still works once dates
 *     are present.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  useSearchParams,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { format } from "date-fns";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import { parseAndValidateFlightSearchParams } from "@/lib/flightSearchValidation";

const hoisted = vi.hoisted(() => ({ logSearch: vi.fn() }));

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => false }));

vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({
    geoData: null,
    loading: false,
    regionConfig: {
      defaultOrigin: "SYD",
      defaultOriginName: "Sydney",
      currency: "AUD",
      currencySymbol: "A$",
      popularRoutes: [],
    },
  }),
}));

vi.mock("@/lib/analytics", () => ({
  logSearch: (...a: unknown[]) => {
    hoisted.logSearch(...a);
    return Promise.resolve();
  },
}));

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: [] }) } },
}));

// ── Harness: mirrors FlightResults → FlightLandingPage prefill wiring ──

let currentLocation = "/flights";

function FlightPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const parsed = parseAndValidateFlightSearchParams(searchParams);
  return (
    <>
      <button onClick={() => navigate("/flights?origin=SYD&destination=MOW")}>go SYD-MOW</button>
      <button onClick={() => navigate("/flights?origin=SYD&destination=MEL")}>go SYD-MEL</button>
      <button onClick={() => navigate("/flights?origin=MEL&destination=MOW")}>go MEL-MOW</button>
      <ModernFlightSearch prefill={parsed.prefill} hideMultiCity />
    </>
  );
}

function LocationProbe() {
  const location = useLocation();
  currentLocation = location.pathname + location.search;
  return null;
}

function renderAt(entry: string) {
  currentLocation = entry;
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <LocationProbe />
      <Routes>
        <Route path="/flights" element={<FlightPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function fromToInputs() {
  const inputs = screen.getAllByRole("textbox");
  if (inputs.length < 2) throw new Error("Expected From + To combobox inputs");
  return { from: inputs[0], to: inputs[1] };
}

describe("ModernFlightSearch — route-prefill hydration (desktop)", () => {
  beforeEach(() => {
    hoisted.logSearch.mockClear();
    window.sessionStorage.clear();
  });

  it("hydrates From/To from a direct SYD/MOW URL with friendly labels", () => {
    renderAt("/flights?origin=SYD&destination=MOW");
    const { from, to } = fromToInputs();
    expect(from).toHaveValue("Sydney (SYD)");
    expect(to).toHaveValue("Moscow (MOW)");
  });

  it("updates an already-mounted form on same-page navigation", async () => {
    renderAt("/flights");
    expect(fromToInputs().from).toHaveValue("");
    fireEvent.click(screen.getByText("go SYD-MOW"));
    await waitFor(() => {
      expect(fromToInputs().from).toHaveValue("Sydney (SYD)");
      expect(fromToInputs().to).toHaveValue("Moscow (MOW)");
    });
  });

  it("updates destination on sequential route clicks (MOW -> MEL)", async () => {
    renderAt("/flights?origin=SYD&destination=MOW");
    await waitFor(() => expect(fromToInputs().to).toHaveValue("Moscow (MOW)"));
    fireEvent.click(screen.getByText("go SYD-MEL"));
    await waitFor(() => expect(fromToInputs().to).toHaveValue("Melbourne (MEL)"));
    // Origin unchanged by a destination-only change.
    expect(fromToInputs().from).toHaveValue("Sydney (SYD)");
  });

  it("updates From when the origin changes", async () => {
    renderAt("/flights?origin=SYD&destination=MOW");
    await waitFor(() => expect(fromToInputs().from).toHaveValue("Sydney (SYD)"));
    fireEvent.click(screen.getByText("go MEL-MOW"));
    await waitFor(() => expect(fromToInputs().from).toHaveValue("Melbourne (MEL)"));
    expect(fromToInputs().to).toHaveValue("Moscow (MOW)");
  });

  it("keeps dates, travellers and cabin when the route changes", async () => {
    renderAt(
      "/flights?origin=BNE&destination=SYD&departureDate=2026-09-01&returnDate=2026-09-10&adults=2&children=0&infants=0&cabinClass=business",
    );
    await waitFor(() => expect(fromToInputs().from).toHaveValue("Brisbane (BNE)"));
    const expectedDate = format(new Date("2026-09-01T00:00:00"), "EEE, d MMM");
    expect(screen.getByText(expectedDate)).toBeTruthy();
    expect(screen.getByText(/2 Travelers/)).toBeTruthy();
    expect(screen.getByText(/Business/)).toBeTruthy();

    fireEvent.click(screen.getByText("go SYD-MOW"));
    await waitFor(() => expect(fromToInputs().to).toHaveValue("Moscow (MOW)"));

    // Route change must NOT reset the rest of the form.
    expect(screen.getByText(expectedDate)).toBeTruthy();
    expect(screen.getByText(/2 Travelers/)).toBeTruthy();
    expect(screen.getByText(/Business/)).toBeTruthy();
  });

  it("does not auto-search on a prefill-only URL", async () => {
    renderAt("/flights?origin=SYD&destination=MOW");
    await waitFor(() => expect(fromToInputs().to).toHaveValue("Moscow (MOW)"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(currentLocation).toBe("/flights?origin=SYD&destination=MOW");
    expect(hoisted.logSearch).not.toHaveBeenCalled();
  });

  it("searches normally once dates are present", async () => {
    renderAt(
      "/flights?origin=BNE&destination=SYD&departureDate=2026-09-01&returnDate=2026-09-10&adults=2&children=0&infants=0&cabinClass=business",
    );
    await waitFor(() => expect(fromToInputs().from).toHaveValue("Brisbane (BNE)"));
    fireEvent.click(screen.getByText("go SYD-MOW"));
    await waitFor(() => expect(fromToInputs().to).toHaveValue("Moscow (MOW)"));

    fireEvent.click(screen.getByRole("button", { name: /search flights/i }));
    await waitFor(() => {
      expect(currentLocation).toContain("origin=SYD");
      expect(currentLocation).toContain("destination=MOW");
      expect(currentLocation).toContain("departureDate=2026-09-01");
    });
  });
});
