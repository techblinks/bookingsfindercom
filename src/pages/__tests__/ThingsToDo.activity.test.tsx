/**
 * Mobile V2 Phase 2A-2 — recent-activity WRITE layer for Things To Do.
 *
 * commitSearch is the page's only committed-search boundary. These tests prove
 * an entry appears when — and only when — that boundary runs with a real city:
 * hydration, typing, filters, sorting and pagination must all stay silent.
 *
 * The real recentActivity model is used and read back through
 * loadRecentActivity; its own validation is covered by its 138 tests.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ThingsToDo from "@/pages/ThingsToDo";
import {
  loadRecentActivity,
  RECENT_ACTIVITY_STORAGE_KEY,
  type ThingsActivity,
} from "@/lib/recentActivity";

const { searchExperiencesMock } = vi.hoisted(() => ({ searchExperiencesMock: vi.fn() }));

vi.mock("@/services/experiences", () => ({
  searchExperiences: searchExperiencesMock,
}));

const { mapProviderProductsMock } = vi.hoisted(() => ({ mapProviderProductsMock: vi.fn() }));

vi.mock("@/services/thingsActivityMapping", () => ({
  mapProviderProducts: mapProviderProductsMock.mockResolvedValue({ status: "unavailable", mappings: [] }),
  providerScopedKey: (provider: string, providerProductId: string) => `${provider}:${providerProductId}`,
}));

vi.mock("react-helmet-async", () => ({
  Helmet: () => null,
  HelmetProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));

/**
 * Stubbed to keep the destinations service out of these tests. The stub keeps
 * the real component's contract: it is controlled by `value`/`onChange`, and a
 * dropdown pick calls onChange with the rich display label FIRST and onSelect
 * with the destination second — the exact order that decides which of the two
 * ends up in the hero draft.
 */
vi.mock("@/components/search/DestinationAutocomplete", () => ({
  default: ({
    value,
    onChange,
    onSelect,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSelect?: (dest: { destinationId: string; name: string }) => void;
  }) => (
    <div>
      <input aria-label="city-autocomplete" value={value} onChange={e => onChange(e.target.value)} />
      <button
        onClick={() => {
          onChange("Sydney, New South Wales, Australia");
          onSelect?.({ destinationId: "357", name: "Sydney" });
        }}
      >
        pick-destination
      </button>
    </div>
  ),
}));

function renderPage(search = "") {
  return render(
    <MemoryRouter initialEntries={[`/things-to-do${search}`]}>
      <ThingsToDo />
    </MemoryRouter>
  );
}

function things(): ThingsActivity[] {
  return loadRecentActivity().filter((e): e is ThingsActivity => e.kind === "things");
}

const searchButton = () => screen.getByRole("button", { name: /^Search$/ });
const cityField = () => screen.getByLabelText("city-autocomplete") as HTMLInputElement;
const queryField = () => screen.getByPlaceholderText(/Museums, tours, landmarks/i) as HTMLInputElement;

function typeCity(value: string) {
  fireEvent.change(cityField(), { target: { value } });
}

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
  searchExperiencesMock.mockResolvedValue({
    products: [],
    totalCount: 0,
    providers: { tiqets: "ok", viator: "ok" },
  });
});

// ── RECORDED ON A COMMITTED SEARCH ──

describe("ThingsToDo — records a committed city search", () => {
  it("records a things activity for a committed city", () => {
    renderPage("?city=Paris");
    fireEvent.click(searchButton());

    expect(things()).toHaveLength(1);
    expect(things()[0].city).toBe("Paris");
  });

  it("records both the city and the query when a query was committed", () => {
    renderPage("?city=Rome&q=museums");
    fireEvent.click(searchButton());

    const [entry] = things();
    expect(entry.city).toBe("Rome");
    expect(entry.query).toBe("museums");
  });

  it("records the query typed before the commit", () => {
    renderPage("?city=Rome");
    fireEvent.change(screen.getByPlaceholderText(/Museums, tours, landmarks/i), {
      target: { value: "walking tours" },
    });
    fireEvent.click(searchButton());

    const [entry] = things();
    expect(entry.city).toBe("Rome");
    expect(entry.query).toBe("walking tours");
  });

  it("records a city with no query as a city-only entry", () => {
    renderPage("?city=Paris");
    fireEvent.click(searchButton());

    expect(things()[0].query).toBeUndefined();
  });

  it("a popular-city shortcut commits through the same recording path", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Sydney" }));

    expect(things()).toHaveLength(1);
    expect(things()[0].city).toBe("Sydney");
  });

  it("records no prices, providers, URLs or coordinates", () => {
    renderPage("?city=Paris");
    fireEvent.click(searchButton());

    const raw = localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)!;
    expect(raw).not.toMatch(/http|price|provider|affiliate|lat|lng/i);
  });

  it("writes nothing to the trip context", () => {
    renderPage("?city=Paris");
    fireEvent.click(searchButton());

    expect(localStorage.getItem("bf_trip_context")).toBeNull();
  });
});

// ── TYPED CITY: THE HERO DRAFT REACHES THE COMMIT ──

describe("ThingsToDo — a typed city commits and records", () => {
  it("typing a city and pressing Search records that city", () => {
    renderPage();
    typeCity("Sydney");
    fireEvent.click(searchButton());

    expect(things()).toHaveLength(1);
    expect(things()[0].city).toBe("Sydney");
  });

  it("typing a city and pressing Search commits it to the results and the URL", async () => {
    renderPage();
    typeCity("Sydney");
    fireEvent.click(searchButton());

    await waitFor(() =>
      expect(searchExperiencesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ destination: "Sydney", page: 1 })
      )
    );
  });

  it("typing a city and a query records both fields", () => {
    renderPage();
    typeCity("Sydney");
    fireEvent.change(queryField(), { target: { value: "harbour cruises" } });
    fireEvent.click(searchButton());

    const [entry] = things();
    expect(entry.city).toBe("Sydney");
    expect(entry.query).toBe("harbour cruises");
  });

  it("a typed city with no commit records nothing", () => {
    renderPage();
    typeCity("Barcelona");

    expect(loadRecentActivity()).toEqual([]);
    expect(cityField().value).toBe("Barcelona");
  });

  it("choosing a destination from the dropdown and committing records that destination", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "pick-destination" }));

    // onSelect wins over the label onChange supplied, exactly as before the fix.
    expect(cityField().value).toBe("Sydney");
    expect(loadRecentActivity()).toEqual([]);

    fireEvent.click(searchButton());
    expect(things()).toHaveLength(1);
    expect(things()[0].city).toBe("Sydney");
  });

  it("a typed city replaces the previously seeded one on commit", () => {
    renderPage("?city=Paris");
    expect(cityField().value).toBe("Paris");

    typeCity("Rome");
    fireEvent.click(searchButton());

    expect(things()).toHaveLength(1);
    expect(things()[0].city).toBe("Rome");
  });

  it("commits through one path only — a single entry per committed search", () => {
    renderPage();
    typeCity("Sydney");
    fireEvent.click(searchButton());
    fireEvent.click(screen.getByRole("button", { name: "Sydney" })); // popular shortcut, same city

    expect(loadRecentActivity()).toHaveLength(1);
    expect(things()[0].city).toBe("Sydney");
  });
});

// ── NOTHING RECORDED WITHOUT A REAL CITY ──

describe("ThingsToDo — a commit with no city records nothing", () => {
  it("a query-only commit records nothing", () => {
    renderPage();
    fireEvent.change(screen.getByPlaceholderText(/Museums, tours, landmarks/i), {
      target: { value: "museums" },
    });
    fireEvent.click(searchButton());

    expect(loadRecentActivity()).toEqual([]);
    expect(localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)).toBeNull();
  });

  it("a whitespace-only city records nothing", () => {
    renderPage("?city=%20%20");
    fireEvent.click(searchButton());

    expect(loadRecentActivity()).toEqual([]);
  });

  it("an empty commit records nothing", () => {
    renderPage();
    fireEvent.click(searchButton());

    expect(loadRecentActivity()).toEqual([]);
  });
});

// ── NOT A COMMIT ──

describe("ThingsToDo — non-commit interactions record nothing", () => {
  it("URL hydration alone records nothing", async () => {
    renderPage("?city=Paris&q=museums&activity=museums&sort=price_asc&page=2");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    // The seeded city still renders in the hero field...
    expect(cityField().value).toBe("Paris");
    expect(queryField().value).toBe("museums");
    // ...but hydration is not a commit.
    expect(loadRecentActivity()).toEqual([]);
  });

  it("typing a city without committing records nothing", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("city-autocomplete"), { target: { value: "Barcelona" } });

    expect(loadRecentActivity()).toEqual([]);
  });

  it("typing a query without committing records nothing", () => {
    renderPage("?city=Paris");
    fireEvent.change(screen.getByPlaceholderText(/Museums, tours, landmarks/i), {
      target: { value: "museums" },
    });

    expect(loadRecentActivity()).toEqual([]);
  });

  it("changing an activity filter records nothing", async () => {
    renderPage("?city=Paris");
    fireEvent.click(screen.getByRole("button", { name: /Museums/ }));
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    expect(loadRecentActivity()).toEqual([]);
  });

  it("the results fetch alone records nothing", async () => {
    renderPage("?city=Paris");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    expect(loadRecentActivity()).toEqual([]);
  });

  it("a filter change after a committed search adds no second entry", async () => {
    renderPage("?city=Paris");
    fireEvent.click(searchButton());
    expect(things()).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /Museums/ }));
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    expect(loadRecentActivity()).toHaveLength(1);
  });
});
