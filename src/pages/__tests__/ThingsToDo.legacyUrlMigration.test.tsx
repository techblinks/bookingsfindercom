/**
 * Things V2 (T2B) — atomic canonical URL migration.
 *
 * Proves the URL-producing behaviour moves together:
 *
 *  LEGACY HUB MIGRATION (route wrapper)
 *   /things-to-do?city=Rome                → /things-to-do/rome
 *   /things-to-do?city=Rome&q=colosseum    → /things-to-do/rome?q=colosseum
 *   full filter matrix                     → canonical path, city removed,
 *                                            every other param preserved
 *   the replace is a CLIENT-SIDE history.replace (same stack index, not a
 *   push), and the legacy ThingsToDo hub component is NOT mounted before it —
 *   so no pointless provider search fires for the legacy URL.
 *
 *  HUB COMMIT NAVIGATION (registry-driven)
 *   hub commit Rome        → /things-to-do/rome
 *   hub commit Rome + q    → /things-to-do/rome?q=…
 *   hub commit Paris       → /things-to-do?city=Paris
 *   hub commit Sydney      → /things-to-do?city=Sydney
 *   never /things-to-do/paris or /things-to-do/sydney
 *
 *  NON-CANONICAL LEGACY URLS STILL WORK
 *   /things-to-do?city=Paris stays on the hub and searches Paris.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { useState, useLayoutEffect, type ReactNode } from "react";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Router, Routes, Route, useLocation } from "react-router-dom";
import { createMemoryHistory } from "@remix-run/router";
import { HelmetProvider } from "react-helmet-async";
import type { ExperienceSearchFilters } from "@/types/experiences";
import ThingsToDoHubRoute, { buildLegacyHubRedirect } from "@/pages/ThingsToDoHubRoute";
import ThingsToDoDestinationPage from "@/pages/ThingsToDoDestinationPage";

const { searchExperiencesMock } = vi.hoisted(() => ({ searchExperiencesMock: vi.fn() }));

vi.mock("@/services/experiences", () => ({
  searchExperiences: searchExperiencesMock,
  fetchProviderAvailability: vi.fn(() => Promise.resolve({ tiqets: "available", viator: "disabled" })),
}));

const { mapProviderProductsMock } = vi.hoisted(() => ({ mapProviderProductsMock: vi.fn() }));

vi.mock("@/services/thingsActivityMapping", () => ({
  mapProviderProducts: mapProviderProductsMock.mockResolvedValue({ status: "unavailable", mappings: [] }),
  providerScopedKey: (provider: string, providerProductId: string) => `${provider}:${providerProductId}`,
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));

/**
 * Autocomplete stub: controlled by value/onChange; a dropdown pick calls
 * onChange with the label first and onSelect with the destination second,
 * exactly like the real component's contract.
 */
vi.mock("@/components/search/DestinationAutocomplete", () => ({
  default: ({
    value,
    onChange,
    onSelect,
  }: {
    value: string;
    onChange: (v: string) => void;
    onSelect?: (dest: { provider: string; destinationId: string; name: string }) => void;
  }) => (
    <div>
      <input aria-label="city-autocomplete" value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        onClick={() => {
          onChange("Barcelona");
          onSelect?.({
            provider: "tiqets",
            destinationId: "66342",
            name: "Barcelona",
          });
        }}
      >
        pick-tiqets-barcelona
      </button>
    </div>
  ),
}));

/** Renders the current router location so tests can assert navigation/URL hygiene. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

const emptyResult = () => ({
  products: [],
  totalCount: 0,
  page: 1,
  providers: { tiqets: "available", viator: "disabled" },
  fetchedAt: new Date().toISOString(),
});

let history: ReturnType<typeof createMemoryHistory>;

function routeTree() {
  return (
    <>
      <LocationProbe />
      <Routes>
        <Route path="/things-to-do" element={<ThingsToDoHubRoute />} />
        <Route path="/things-to-do/:destinationSlug" element={<ThingsToDoDestinationPage />} />
      </Routes>
    </>
  );
}

/**
 * A Router wired to a memory history that re-renders when the history changes
 * (the raw <Router> primitive does not subscribe itself). This mirrors what
 * MemoryRouter does internally, and lets tests inspect `history.index` to
 * prove a navigation was a replace rather than a push.
 */
function HistoryRouter({ history: h, children }: { history: ReturnType<typeof createMemoryHistory>; children: ReactNode }) {
  const [state, setState] = useState({ location: h.location, action: h.action });
  // useLayoutEffect (not useEffect) so the listener is registered before a
  // child <Navigate> effect can navigate — exactly what MemoryRouter does.
  useLayoutEffect(() => h.listen(({ location, action }) => setState({ location, action })), [h]);
  return (
    <Router location={state.location} navigationType={state.action} navigator={h}>
      {children}
    </Router>
  );
}

function renderRoutes(initialEntry: string) {
  // v5Compat: true mirrors what MemoryRouter passes, and is what makes the
  // history fire its listener on push/replace so the Router re-renders.
  history = createMemoryHistory({ initialEntries: [initialEntry], v5Compat: true });
  return render(
    <HelmetProvider>
      <HistoryRouter history={history}>
        {routeTree()}
      </HistoryRouter>
    </HelmetProvider>,
  );
}

const location = () => screen.getByTestId("location").textContent ?? "";
const lastFilters = (): ExperienceSearchFilters => {
  const calls = searchExperiencesMock.mock.calls;
  return calls[calls.length - 1][0] as ExperienceSearchFilters;
};
const cityField = () => screen.getByLabelText("city-autocomplete");
const queryField = () => screen.getByPlaceholderText(/Museums, tours, landmarks/i);

beforeEach(() => {
  vi.clearAllMocks();
  searchExperiencesMock.mockResolvedValue(emptyResult());
  // jsdom does not implement scrollIntoView; the page schedules a smooth
  // scroll 50ms after a committed search, which can fire mid-test.
  Element.prototype.scrollIntoView = vi.fn();
});

// ── PURE REDIRECT BUILDER ──────────────────────────────────────

describe("buildLegacyHubRedirect — pure contract", () => {
  it("returns null when there is no city parameter", () => {
    expect(buildLegacyHubRedirect(new URLSearchParams())).toBeNull();
    expect(buildLegacyHubRedirect(new URLSearchParams("q=colosseum"))).toBeNull();
    expect(buildLegacyHubRedirect(new URLSearchParams("rating=4&sort=price_asc"))).toBeNull();
  });

  it("returns null for non-canonical cities", () => {
    expect(buildLegacyHubRedirect(new URLSearchParams("city=Paris"))).toBeNull();
    expect(buildLegacyHubRedirect(new URLSearchParams("city=Sydney"))).toBeNull();
    expect(buildLegacyHubRedirect(new URLSearchParams("city=Melbourne"))).toBeNull();
  });

  it("maps canonical city text to the canonical path", () => {
    expect(buildLegacyHubRedirect(new URLSearchParams("city=Rome"))).toBe("/things-to-do/rome");
    expect(buildLegacyHubRedirect(new URLSearchParams("city=rome"))).toBe("/things-to-do/rome");
    expect(buildLegacyHubRedirect(new URLSearchParams("city=%20ROME%20"))).toBe("/things-to-do/rome");
  });

  it("preserves every non-city parameter and removes city", () => {
    expect(buildLegacyHubRedirect(new URLSearchParams("city=Rome&q=colosseum"))).toBe(
      "/things-to-do/rome?q=colosseum",
    );
    expect(
      buildLegacyHubRedirect(
        new URLSearchParams("city=Rome&q=colosseum&rating=4&accessible=1&sort=price_asc&page=2"),
      ),
    ).toBe("/things-to-do/rome?q=colosseum&rating=4&accessible=1&sort=price_asc&page=2");
  });
});

// ── LEGACY HUB URL MIGRATION ───────────────────────────────────

describe("T2B — legacy hub URL migration", () => {
  it("/things-to-do?city=Rome replaces to /things-to-do/rome", async () => {
    renderRoutes("/things-to-do?city=Rome");

    await waitFor(() => expect(location()).toBe("/things-to-do/rome"));
    expect(location()).not.toContain("city=");

    // The destination page mounted and searched exactly once — the legacy hub
    // component was never mounted, so no pointless hub/provider search fired
    // before the replace.
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalledTimes(1));
    const filters = lastFilters();
    expect(filters.destination).toBe("Rome");
    expect(filters.destinationId).toBe(511);
  });

  it("preserves the query parameter", async () => {
    renderRoutes("/things-to-do?city=Rome&q=colosseum");

    await waitFor(() => expect(location()).toBe("/things-to-do/rome?q=colosseum"));
    await waitFor(() => expect(lastFilters().query).toBe("colosseum"));
  });

  it("preserves the full filter matrix and drops city", async () => {
    renderRoutes("/things-to-do?city=Rome&q=colosseum&rating=4&accessible=1&sort=price_asc&page=2");

    await waitFor(() =>
      expect(location()).toBe("/things-to-do/rome?q=colosseum&rating=4&accessible=1&sort=price_asc&page=2"),
    );
    expect(location()).not.toContain("city=");
    await waitFor(() => {
      const filters = lastFilters();
      expect(filters.destination).toBe("Rome");
      expect(filters.query).toBe("colosseum");
      expect(filters.minRating).toBe(4);
      expect(filters.wheelchairAccessible).toBe(true);
      expect(filters.sort).toBe("price_asc");
      expect(filters.page).toBe(2);
    });
  });

  it("is a history REPLACE, not a push", async () => {
    renderRoutes("/things-to-do?city=Rome");
    expect(history.index).toBe(0);

    await waitFor(() => expect(location()).toBe("/things-to-do/rome"));
    // A replace keeps the same stack index; a push would have advanced to 1.
    expect(history.index).toBe(0);
  });

  it("a lower-case canonical city text still migrates", async () => {
    renderRoutes("/things-to-do?city=rome");
    await waitFor(() => expect(location()).toBe("/things-to-do/rome"));
  });
});

// ── NON-CANONICAL LEGACY URLS STILL WORK ───────────────────────

describe("T2B — non-canonical legacy URLs stay on the hub", () => {
  it("/things-to-do?city=Paris stays on the hub and searches Paris", async () => {
    renderRoutes("/things-to-do?city=Paris");

    await waitFor(() => expect(lastFilters().destination).toBe("Paris"));
    expect(location()).toBe("/things-to-do?city=Paris");
    expect(searchExperiencesMock).toHaveBeenCalled();
    // Paris inherits no Viator destinationId — no registry entry, no ref.
    expect(lastFilters().destinationId).toBeUndefined();
  });

  it("/things-to-do?city=Sydney stays on the hub", async () => {
    renderRoutes("/things-to-do?city=Sydney");
    await waitFor(() => expect(lastFilters().destination).toBe("Sydney"));
    expect(location()).toBe("/things-to-do?city=Sydney");
    expect(lastFilters().destinationId).toBeUndefined();
  });
});

// ── HUB COMMIT NAVIGATION ──────────────────────────────────────

describe("T2B — hub committed search navigation", () => {
  it("hub commit Rome → /things-to-do/rome", async () => {
    renderRoutes("/things-to-do");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Rome" }));

    await waitFor(() => expect(location()).toBe("/things-to-do/rome"));
    await waitFor(() => expect(lastFilters().destination).toBe("Rome"));
    expect(lastFilters().destinationId).toBe(511);
  });

  it("hub commit Rome + query → /things-to-do/rome?q=colosseum", async () => {
    renderRoutes("/things-to-do");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Rome" } });
    fireEvent.change(queryField(), { target: { value: "colosseum" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do/rome?q=colosseum"));
    await waitFor(() => expect(lastFilters().query).toBe("colosseum"));
  });

  it("hub commit Rome + query preserves active filters and resets pagination", async () => {
    renderRoutes("/things-to-do?rating=4&page=2");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Rome" } });
    fireEvent.change(queryField(), { target: { value: "colosseum" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do/rome?q=colosseum&rating=4"));
    await waitFor(() => {
      const filters = lastFilters();
      expect(filters.destination).toBe("Rome");
      expect(filters.minRating).toBe(4);
      expect(filters.page).toBe(1); // commit resets pagination, as before
    });
  });

  it("hub commit Rome preserves the FULL active filter matrix and resets pagination", async () => {
    renderRoutes(
      "/things-to-do?activity=museums&minPrice=2500&maxPrice=5000&rating=4&accessible=1&skipLine=1&sort=price_asc&page=3",
    );
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Rome" } });
    fireEvent.change(queryField(), { target: { value: "colosseum" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    // Canonical path carries every committed filter; the old page is reset and
    // city=Rome is absent because the path owns the identity.
    await waitFor(() =>
      expect(location()).toBe(
        "/things-to-do/rome?q=colosseum&activity=museums&minPrice=2500&maxPrice=5000&rating=4&accessible=1&skipLine=1&sort=price_asc",
      ),
    );
    expect(location()).not.toContain("city=");
    expect(location()).not.toContain("page=3");
    await waitFor(() => {
      const filters = lastFilters();
      expect(filters.destination).toBe("Rome");
      expect(filters.destinationId).toBe(511);
      expect(filters.query).toBe("colosseum");
      expect(filters.activityTags).toEqual(["Museums"]);
      expect(filters.minPrice).toBe(2500);
      expect(filters.maxPrice).toBe(5000);
      expect(filters.minRating).toBe(4);
      expect(filters.wheelchairAccessible).toBe(true);
      expect(filters.skipLine).toBe(true);
      expect(filters.sort).toBe("price_asc");
      expect(filters.page).toBe(1);
    });
  });

  it("hub commit Paris preserves the FULL active filter matrix and stays legacy", async () => {
    renderRoutes(
      "/things-to-do?activity=museums&minPrice=2500&maxPrice=5000&rating=4&accessible=1&skipLine=1&sort=price_asc&page=3",
    );
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Paris" } });
    fireEvent.change(queryField(), { target: { value: "colosseum" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    // Legacy hub contract: same filters, page reset, city=Paris query param —
    // never a /things-to-do/paris path.
    await waitFor(() => {
      const loc = location();
      expect(loc.startsWith("/things-to-do?")).toBe(true);
      expect(loc).not.toBe("/things-to-do/paris");
      const params = new URLSearchParams(loc.split("?")[1]);
      expect(params.get("city")).toBe("Paris");
      expect(params.get("q")).toBe("colosseum");
      expect(params.get("activity")).toBe("museums");
      expect(params.get("minPrice")).toBe("2500");
      expect(params.get("maxPrice")).toBe("5000");
      expect(params.get("rating")).toBe("4");
      expect(params.get("accessible")).toBe("1");
      expect(params.get("skipLine")).toBe("1");
      expect(params.get("sort")).toBe("price_asc");
      expect(params.get("page")).toBeNull();
    });
    await waitFor(() => {
      const filters = lastFilters();
      expect(filters.destination).toBe("Paris");
      expect(filters.destinationId).toBeUndefined();
      expect(filters.query).toBe("colosseum");
      expect(filters.minRating).toBe(4);
      expect(filters.page).toBe(1);
    });
  });

  it("hub commit Paris → /things-to-do?city=Paris (never /things-to-do/paris)", async () => {
    renderRoutes("/things-to-do");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Paris" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do?city=Paris"));
    expect(location()).not.toBe("/things-to-do/paris");
    await waitFor(() => expect(lastFilters().destination).toBe("Paris"));
    expect(lastFilters().destinationId).toBeUndefined();
  });

  it("hub commit Sydney → /things-to-do?city=Sydney (never /things-to-do/sydney)", async () => {
    renderRoutes("/things-to-do");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Sydney" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do?city=Sydney"));
    expect(location()).not.toBe("/things-to-do/sydney");
  });

  it("hub commit of a non-canonical typed city never produces a canonical path", async () => {
    renderRoutes("/things-to-do");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Melbourne" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do?city=Melbourne"));
  });
});

// ── ROUTE COMMIT NAVIGATION (registry-driven) ──────────────────

describe("T2B — canonical route committed navigation", () => {
  it("Rome route → commit Rome stays canonical and writes no redundant city", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do/rome"));
    expect(location()).not.toContain("city=");
    expect(lastFilters().destinationId).toBe(511);
  });

  it("Rome route → commit Paris leaves for the legacy hub", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(cityField(), { target: { value: "Paris" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do?city=Paris"));
    await waitFor(() => expect(lastFilters().destination).toBe("Paris"));
    expect(lastFilters().destinationId).toBeUndefined();
  });

  it("Rome route filters stay on the canonical path with no city param", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Museums" }));

    await waitFor(() => expect(location()).toBe("/things-to-do/rome?activity=museums"));
    expect(location()).not.toContain("city=");
  });
});
