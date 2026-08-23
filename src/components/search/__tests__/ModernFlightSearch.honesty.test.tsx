/**
 * Desktop D2 — search honesty.
 *
 * A visible search control must change the search. Multi-city was offered and
 * silently submitted as a round trip; "Flexible dates (±3 days)" and "Include
 * nearby airports" wrote query parameters that no consumer reads. These tests
 * assert what the customer can see and what the submitted URL contains — not
 * how the component is built — so they stay valid if the shell is redesigned,
 * and they fail the moment an unimplemented option reappears.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { format, addDays } from "date-fns";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";

const hoisted = vi.hoisted(() => ({ navigate: vi.fn(), logSearch: vi.fn(), isMobile: false }));

vi.mock("react-router-dom", async importOriginal => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => hoisted.navigate };
});

vi.mock("@/hooks/use-mobile", () => ({ useIsMobile: () => hoisted.isMobile }));

vi.mock("@/hooks/useGeoLocation", () => ({
  useGeoLocation: () => ({
    geoData: null,
    loading: false,
    regionConfig: { defaultOrigin: "SYD", defaultOriginName: "Sydney", currency: "AUD", currencySymbol: "A$", popularRoutes: [] },
  }),
}));

vi.mock("@/lib/analytics", () => ({
  logSearch: (...a: unknown[]) => {
    hoisted.logSearch(...a);
    return Promise.resolve();
  },
}));

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: vi.fn().mockResolvedValue({ data: [] }) } },
}));

const DEPART = addDays(new Date(), 30);
const RETURN = addDays(new Date(), 40);
const iso = (d: Date) => format(d, "yyyy-MM-dd");

/**
 * The route is supplied through the component's own prefill contract — the same
 * way `/flights` form mode and the results Edit flow populate it — because the
 * airport autocomplete needs live destination data this environment has none of.
 * Everything under test (visible options, submitted URL) is unaffected.
 */
function renderSearch(overrides: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ModernFlightSearch
        prefill={{
          origin: "SYD",
          destination: "MEL",
          departureDate: DEPART,
          returnDate: RETURN,
          tripType: "roundtrip",
          adults: 1,
          children: 0,
          infants: 0,
          cabinClass: "economy",
          ...overrides,
        }}
      />
    </MemoryRouter>,
  );
}

const lastUrl = () => (hoisted.navigate.mock.calls.at(-1)?.[0] as string | undefined) ?? "";
const params = () => new URLSearchParams(lastUrl().split("?")[1] ?? "");
const pageText = () => document.body.textContent ?? "";
const submit = () => fireEvent.click(screen.getByRole("button", { name: /search flights/i }));

beforeEach(() => {
  hoisted.navigate.mockClear();
  hoisted.logSearch.mockClear();
  hoisted.isMobile = false;
  // The component dedupes identical analytics submissions via sessionStorage.
  window.sessionStorage.clear();
});

// ── UNSUPPORTED OPTIONS ARE NOT OFFERED ──

describe("ModernFlightSearch — unsupported options are not offered", () => {
  it("does not offer Multi-city", () => {
    renderSearch();
    expect(screen.queryByText(/multi-?city/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /multi-?city/i })).toBeNull();
  });

  it("offers exactly the two trip types the engine performs", () => {
    renderSearch();
    expect(screen.getByText("Round trip")).toBeTruthy();
    expect(screen.getByText("One way")).toBeTruthy();
  });

  it("does not expose Flexible dates", () => {
    renderSearch();
    expect(pageText()).not.toMatch(/flexible dates/i);
    expect(screen.queryByText(/±\s*3 days/i)).toBeNull();
  });

  it("does not expose Include nearby airports", () => {
    renderSearch();
    expect(pageText()).not.toMatch(/nearby airports/i);
  });

  it("leaves no empty advanced-options disclosure behind", () => {
    renderSearch();
    expect(screen.queryByRole("button", { name: /more options/i })).toBeNull();
    expect(pageText()).not.toMatch(/more options/i);
  });

  it("renders no orphaned checkboxes in the search shell", () => {
    const { container } = renderSearch();
    expect(container.querySelectorAll('[role="checkbox"]').length).toBe(0);
  });

  // BF-0R-7 Round 1.2 item 1/2: Premium Economy and First are not offered on
  // desktop either — whiteLabelUrl.ts only has a verified handoff for
  // economy/business (src/lib/cabinClasses.ts).
  it("offers only Economy and Business cabin classes", () => {
    renderSearch();
    fireEvent.click(screen.getByText("Travellers & Class").closest("button")!);

    expect(screen.getByText("Economy")).toBeTruthy();
    expect(screen.getByText("Business")).toBeTruthy();
    expect(screen.queryByText("Premium")).toBeNull();
    expect(screen.queryByText("First")).toBeNull();
  });
});

/*
 * The same component also renders a narrow-screen layout on the pages that host
 * it below 768px, where the two toggles lived inside a "More options" drawer.
 */
describe("ModernFlightSearch — narrow layout offers nothing unsupported either", () => {
  beforeEach(() => {
    hoisted.isMobile = true;
  });

  it("offers only the supported trip types inside the travellers drawer", async () => {
    renderSearch();
    // The narrow layout keeps trip type in the Travelers & Class drawer.
    fireEvent.click(screen.getByText(/Travelers & Class/i).closest("button")!);

    await waitFor(() => expect(screen.getByText("Round trip")).toBeTruthy());
    expect(screen.getByText("One way")).toBeTruthy();
    expect(screen.queryByText(/multi-?city/i)).toBeNull();
  });

  it("exposes no flexible-date, nearby-airport or empty disclosure control", () => {
    const { container } = renderSearch();
    expect(pageText()).not.toMatch(/flexible dates/i);
    expect(pageText()).not.toMatch(/nearby airports/i);
    expect(pageText()).not.toMatch(/more options/i);
    expect(container.querySelectorAll('[role="checkbox"]').length).toBe(0);
  });
});

// ── SUBMITTED URL CONTRACT ──

describe("ModernFlightSearch — submitted URL carries only supported fields", () => {
  it("a round trip submits origin, destination, both dates, travellers and cabin", async () => {
    renderSearch();
    submit();

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalled());
    const p = params();
    expect(p.get("origin")).toBe("SYD");
    expect(p.get("destination")).toBe("MEL");
    expect(p.get("departureDate")).toBe(iso(DEPART));
    expect(p.get("returnDate")).toBe(iso(RETURN));
    expect(p.get("adults")).toBe("1");
    expect(p.get("children")).toBe("0");
    expect(p.get("infants")).toBe("0");
    expect(p.get("passengers")).toBe("1");
    expect(p.get("cabinClass")).toBe("economy");
  });

  it("never emits flexibleDates or nearbyAirports", async () => {
    renderSearch();
    submit();

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalled());
    expect(lastUrl()).not.toContain("flexibleDates");
    expect(lastUrl()).not.toContain("nearbyAirports");
    expect(params().get("flexibleDates")).toBeNull();
    expect(params().get("nearbyAirports")).toBeNull();
  });

  it("emits only the canonical supported parameters", async () => {
    renderSearch();
    submit();

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalled());
    const allowed = ["origin", "destination", "departureDate", "returnDate", "passengers", "adults", "children", "infants", "cabinClass"];
    for (const key of params().keys()) expect(allowed).toContain(key);
  });

  it("preserves a non-default traveller mix and cabin class", async () => {
    renderSearch({ adults: 2, children: 1, infants: 1, cabinClass: "business" });
    submit();

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalled());
    const p = params();
    expect(p.get("adults")).toBe("2");
    expect(p.get("children")).toBe("1");
    expect(p.get("infants")).toBe("1");
    expect(p.get("passengers")).toBe("4");
    expect(p.get("cabinClass")).toBe("business");
  });

  it("a one-way search omits returnDate", async () => {
    renderSearch({ tripType: "oneway", returnDate: undefined });
    submit();

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalled());
    expect(params().get("departureDate")).toBe(iso(DEPART));
    expect(lastUrl()).not.toContain("returnDate");
  });

  it("switching a round trip to one way drops the return date", async () => {
    renderSearch();
    fireEvent.click(screen.getByText("One way"));
    submit();

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalled());
    expect(lastUrl()).not.toContain("returnDate");
    expect(params().get("origin")).toBe("SYD");
  });

  it("keeps the canonical /flights path", async () => {
    renderSearch();
    submit();

    await waitFor(() => expect(hoisted.navigate).toHaveBeenCalled());
    expect(lastUrl().startsWith("/flights?")).toBe(true);
  });
});

// ── ANALYTICS PAYLOAD ──

describe("ModernFlightSearch — analytics reports the trip type actually searched", () => {
  it("never reports a multicity trip type", async () => {
    renderSearch();
    submit();

    await waitFor(() => expect(hoisted.logSearch).toHaveBeenCalled());
    const payload = hoisted.logSearch.mock.calls.at(-1)![0] as { tripType: string };
    expect(payload.tripType).toBe("roundtrip");
    expect(payload.tripType).not.toBe("multicity");
  });
});
