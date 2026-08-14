/**
 * ModernFlightSearch — recent-activity parity with the mobile search.
 *
 * MobileFlightSearch has recorded committed flight searches into
 * bf_recent_activity since Phase 2A; ModernFlightSearch recorded nothing, so a
 * traveller who searched only on desktop could never produce the flight
 * continuation the shipped desktop "Pick up where you left off" surface reads.
 *
 * These tests assert the recording BOUNDARY — what is written, when, and how
 * often — against the real recentActivity model, not a mock of it. Dedupe,
 * retention, canonicalisation and storage safety stay the model's job and are
 * covered by its own 138 tests; nothing here re-tests them.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { format, addDays } from "date-fns";
import ModernFlightSearch from "@/components/search/ModernFlightSearch";
import {
  RECENT_ACTIVITY_STORAGE_KEY,
  loadRecentActivity,
  type FlightActivity,
} from "@/lib/recentActivity";

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
 * The route arrives through the component's own prefill contract — the same way
 * /flights form mode and the results Edit flow populate it — because the airport
 * autocomplete needs live destination data this environment has none of. The
 * recording boundary under test is identical either way.
 */
function renderSearch(overrides: Record<string, unknown> = {}) {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <ModernFlightSearch
        prefill={{
          origin: "BNE",
          destination: "KTM",
          departureDate: DEPART,
          returnDate: RETURN,
          tripType: "roundtrip",
          adults: 2,
          children: 1,
          infants: 0,
          cabinClass: "business",
          ...overrides,
        }}
      />
    </MemoryRouter>,
  );
}

const submit = () => fireEvent.click(screen.getByRole("button", { name: /search flights/i }));
const flights = () => loadRecentActivity().filter((e): e is FlightActivity => e.kind === "flight");
const lastUrl = () => (hoisted.navigate.mock.calls.at(-1)?.[0] as string | undefined) ?? "";

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  vi.clearAllMocks();
  hoisted.isMobile = false;
});

// ── A COMMITTED SEARCH IS RECORDED ──

describe("ModernFlightSearch — records a committed search", () => {
  it("writes exactly one flight activity for a valid round trip", () => {
    renderSearch();
    submit();

    expect(flights()).toHaveLength(1);
  });

  it("records the committed route, dates, travellers and cabin", () => {
    renderSearch();
    submit();

    const entry = flights()[0];
    expect(entry.origin).toBe("BNE");
    expect(entry.destination).toBe("KTM");
    expect(entry.departureDate).toBe(iso(DEPART));
    expect(entry.returnDate).toBe(iso(RETURN));
    expect(entry.travellers).toEqual({ adults: 2, children: 1, infants: 0 });
    expect(entry.cabinClass).toBe("business");
  });

  it("records city labels rather than the combobox display string", () => {
    renderSearch();
    submit();

    const entry = flights()[0];
    // The visible input reads "Brisbane (BNE)". Recent activity renders
    // "Brisbane → Kathmandu", so the code must not be baked into the label.
    expect(entry.originLabel).toBe("Brisbane");
    expect(entry.destinationLabel).toBe("Kathmandu");
    expect(entry.originLabel).not.toContain("(");
    expect(entry.destinationLabel).not.toContain("(");
  });

  it("stores no city for an airport the resolver does not know, rather than inventing one", () => {
    // ZZZ is a syntactically valid code absent from LOCATION_LABELS.
    renderSearch({ destination: "ZZZ" });
    submit();

    const entry = flights()[0];
    expect(entry.destination).toBe("ZZZ");
    expect(entry.destinationLabel).toBeUndefined();
  });

  it("navigates to the canonical /flights URL unchanged", () => {
    renderSearch();
    submit();

    const url = lastUrl();
    expect(url.startsWith("/flights?")).toBe(true);
    const params = new URLSearchParams(url.split("?")[1]);
    expect(params.get("origin")).toBe("BNE");
    expect(params.get("destination")).toBe("KTM");
    expect(params.get("departureDate")).toBe(iso(DEPART));
    expect(params.get("returnDate")).toBe(iso(RETURN));
    expect(params.get("passengers")).toBe("3");
    expect(params.get("cabinClass")).toBe("business");
  });

  it("records once per committed submission, not twice", () => {
    renderSearch();
    submit();

    expect(flights()).toHaveLength(1);
    const raw = JSON.parse(localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!);
    expect(raw.items.filter((i: { kind: string }) => i.kind === "flight")).toHaveLength(1);
  });
});

// ── ONE WAY ──

describe("ModernFlightSearch — one way", () => {
  it("records a one-way search with no return date", () => {
    renderSearch({ tripType: "oneway", returnDate: undefined });
    submit();

    const entry = flights()[0];
    expect(entry.departureDate).toBe(iso(DEPART));
    expect(entry.returnDate).toBeUndefined();
  });

  it("drops a return date left over from switching round trip to one way", () => {
    renderSearch();
    // The prefill carries a return date; switching to One way must discard it.
    fireEvent.click(screen.getByRole("button", { name: "One way" }));
    submit();

    expect(flights()[0].returnDate).toBeUndefined();
    expect(lastUrl()).not.toContain("returnDate");
  });
});

// ── WHAT MUST NOT BE RECORDED ──

describe("ModernFlightSearch — records nothing without a committed search", () => {
  it("records nothing on render, however complete the prefill", () => {
    renderSearch();

    expect(loadRecentActivity()).toHaveLength(0);
    expect(localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)).toBeNull();
  });

  it("records nothing when the submission fails validation", () => {
    renderSearch({ destination: "" });
    submit();

    expect(loadRecentActivity()).toHaveLength(0);
    expect(hoisted.navigate).not.toHaveBeenCalled();
  });

  it("records nothing with no departure date", () => {
    renderSearch({ departureDate: undefined });
    submit();

    expect(loadRecentActivity()).toHaveLength(0);
  });

  it("records nothing when fields change but nothing is submitted", () => {
    renderSearch();
    fireEvent.click(screen.getByRole("button", { name: "One way" }));
    fireEvent.click(screen.getByRole("button", { name: "Round trip" }));
    fireEvent.click(screen.getByRole("button", { name: /swap origin and destination/i }));

    expect(loadRecentActivity()).toHaveLength(0);
  });
});

// ── THE PAYLOAD BOUNDARY ──

describe("ModernFlightSearch — payload boundary", () => {
  it("stores no URL, tracking, price or session data", () => {
    renderSearch();
    submit();

    const raw = localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!;
    expect(raw).not.toMatch(/https?:|utm_|marker=|affiliate|\/flights\?|price|currency|sessionId|token/i);
  });

  it("stores only the fields the flight model defines", () => {
    renderSearch();
    submit();

    const stored = JSON.parse(localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!)
      .items.find((i: { kind: string }) => i.kind === "flight");
    expect(Object.keys(stored).sort()).toEqual(
      [
        "at", "cabinClass", "departureDate", "destination", "destinationLabel",
        "key", "kind", "label", "origin", "originLabel", "returnDate", "travellers",
      ].sort(),
    );
  });

  it("cannot block navigation when storage is unavailable", () => {
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError");
    });
    try {
      renderSearch();
      expect(() => submit()).not.toThrow();
      expect(lastUrl().startsWith("/flights?")).toBe(true);
    } finally {
      setItem.mockRestore();
    }
  });
});

// ── THE SHARED BOUNDARY SERVES EVERY HOST ──

describe("ModernFlightSearch — the same boundary on the mobile layout", () => {
  it("records one activity from the mobile-width layout too", () => {
    hoisted.isMobile = true;
    renderSearch();
    submit();

    expect(flights()).toHaveLength(1);
    expect(flights()[0].destination).toBe("KTM");
  });
});
