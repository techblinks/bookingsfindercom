/**
 * Things V2 (T2A + review patch) — destination route contract.
 *
 * Proves:
 *
 *  SEARCH CONTRACT
 *   /things-to-do/rome produces a search context equivalent to
 *   { destination: "Rome", destinationId: 511 }, where 511 is ONLY the
 *   registry-owned Viator ref.
 *   The hub, by contrast, never turns a Tiqets autocomplete selection into a
 *   Viator destinationId — the critical cross-contamination regression test.
 *
 *  CANONICAL ROUTE INTEGRITY
 *   Route identity wins over any conflicting legacy ?city= param:
 *   /things-to-do/rome?city=Paris stays Rome (destination + 511).
 *   Committing a DIFFERENT city from the Rome route leaves the canonical
 *   route and continues on the legacy hub URL /things-to-do?city=<city>.
 *   Committing the SAME city keeps /things-to-do/rome.
 *   Filter updates on the route never write a redundant ?city= param.
 *
 *  SEO CONTRACT
 *   Hub:          /things-to-do                canonical /things-to-do
 *   Draft Rome:   /things-to-do/rome           canonical /things-to-do/rome,
 *                                              robots noindex,follow
 *   Filtered:     /things-to-do/rome?rating=4  canonical /things-to-do/rome,
 *                                              robots noindex,follow
 *   Unknown slug: not-found behaviour, noindex.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ExperienceSearchFilters } from "@/types/experiences";
import ThingsToDo from "@/pages/ThingsToDo";
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
 * onChange with the label first and onSelect with the Tiqets destination
 * second, exactly like the real component's contract.
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

function renderRoutes(initialEntry: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[initialEntry]}>
        <LocationProbe />
        <Routes>
          <Route path="/things-to-do" element={<ThingsToDo />} />
          <Route path="/things-to-do/:destinationSlug" element={<ThingsToDoDestinationPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const canonical = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
const robots = () =>
  document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;
const location = () => screen.getByTestId("location").textContent ?? "";
const lastFilters = (): ExperienceSearchFilters => {
  const calls = searchExperiencesMock.mock.calls;
  return calls[calls.length - 1][0] as ExperienceSearchFilters;
};

beforeEach(() => {
  vi.clearAllMocks();
  searchExperiencesMock.mockResolvedValue(emptyResult());
});

// ── SEARCH CONTRACT ─────────────────────────────────────────────

describe("Things destination route — search context", () => {
  it("/things-to-do/rome produces destination=Rome and destinationId=511", async () => {
    renderRoutes("/things-to-do/rome");

    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());
    const filters: ExperienceSearchFilters = searchExperiencesMock.mock.calls[0][0];
    expect(filters.destination).toBe("Rome");
    expect(filters.destinationId).toBe(511);
  });

  it("destinationId 511 comes ONLY from the registry Viator ref", async () => {
    renderRoutes("/things-to-do/rome");

    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());
    const filters: ExperienceSearchFilters = searchExperiencesMock.mock.calls[0][0];
    // The page never fabricates 511 from the slug or the city text.
    expect(filters.destinationId).toBe(511);
    expect(filters.destination).toBe("Rome");
  });

  it("hub /things-to-do never sets a Viator destinationId from a Tiqets pick", async () => {
    renderRoutes("/things-to-do");
    fireEvent.click(screen.getByRole("button", { name: "pick-tiqets-barcelona" }));
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());
    const last: ExperienceSearchFilters = lastFilters();
    // The Tiqets destination text reaches the search...
    expect(last.destination).toBe("Barcelona");
    // ...but its Tiqets destinationId (66342) must never become a Viator ID.
    expect(last.destinationId).toBeUndefined();
  });
});

// ── CANONICAL ROUTE INTEGRITY ───────────────────────────────────

describe("Things destination route — canonical route integrity", () => {
  it("route identity wins over a conflicting legacy ?city= param", async () => {
    renderRoutes("/things-to-do/rome?city=Paris");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    const filters: ExperienceSearchFilters = searchExperiencesMock.mock.calls[0][0];
    expect(filters.destination).toBe("Rome");
    expect(filters.destinationId).toBe(511);
    // The conflicting param can never turn this into a Paris search.
    for (const call of searchExperiencesMock.mock.calls) {
      expect((call[0] as ExperienceSearchFilters).destination).toBe("Rome");
    }
    // The conflicting legacy param is stripped from the canonical URL.
    await waitFor(() => expect(location()).toBe("/things-to-do/rome"));
  });

  it("committing a different city leaves the canonical route for the legacy hub URL", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("city-autocomplete"), { target: { value: "Paris" } });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    // Integrity escape hatch: /things-to-do/rome → /things-to-do?city=Paris
    await waitFor(() => expect(location()).toBe("/things-to-do?city=Paris"));

    // The legacy hub continues the search; Paris inherits no Viator ID.
    await waitFor(() => {
      expect(lastFilters().destination).toBe("Paris");
      expect(lastFilters().destinationId).toBeUndefined();
    });
  });

  it("the escape hatch preserves the committed activity query", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.change(screen.getByLabelText("city-autocomplete"), { target: { value: "Paris" } });
    fireEvent.change(screen.getByPlaceholderText(/Museums, tours, landmarks/i), {
      target: { value: "museums" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do?city=Paris&q=museums"));
  });

  it("committing the same canonical city keeps the Rome route", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    // cityInput is seeded with "Rome"; committing it must not navigate away.
    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    await waitFor(() => expect(location()).toBe("/things-to-do/rome"));
    expect(lastFilters().destination).toBe("Rome");
    expect(lastFilters().destinationId).toBe(511);
  });

  it("committing the same city never writes a redundant city param", async () => {
    renderRoutes("/things-to-do/rome?rating=4");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^Search$/i }));

    // T2B: the path owns the identity — /things-to-do/rome?city=Rome is never
    // produced, and the existing filter survives the commit.
    await waitFor(() => expect(location()).toBe("/things-to-do/rome?rating=4"));
    expect(location()).not.toContain("city=");
  });

  it("filter updates on the Rome route do not add a redundant city param", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: "Museums" }));

    await waitFor(() => expect(location()).toBe("/things-to-do/rome?activity=museums"));
    expect(location()).not.toContain("city=");
  });
});

// ── SEO CONTRACT ────────────────────────────────────────────────

describe("Things destination route — SEO contract", () => {
  it("hub keeps canonical /things-to-do", async () => {
    renderRoutes("/things-to-do");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    await waitFor(() => expect(canonical()).toBe("https://bookingsfinder.com/things-to-do"));
  });

  it("draft Rome canonicalises to /things-to-do/rome and is noindex,follow", async () => {
    renderRoutes("/things-to-do/rome");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    await waitFor(() => {
      expect(canonical()).toBe("https://bookingsfinder.com/things-to-do/rome");
      expect(robots()).toBe("noindex,follow");
      expect(document.title).toBe("Things to do in Rome | BookingsFinder");
    });
  });

  it("filtered Rome canonicalises to the base and stays noindex,follow", async () => {
    renderRoutes("/things-to-do/rome?rating=4&sort=price_asc");
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    // Faceted/filtered URLs must not self-canonicalize.
    await waitFor(() => {
      expect(canonical()).toBe("https://bookingsfinder.com/things-to-do/rome");
      expect(robots()).toBe("noindex,follow");
    });
  });

  it("unknown slug renders not-found and is noindex", async () => {
    renderRoutes("/things-to-do/not-a-real-destination");

    expect(await screen.findByText("Oops! Page not found")).toBeTruthy();
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
    expect(searchExperiencesMock).not.toHaveBeenCalled();
  });
});
