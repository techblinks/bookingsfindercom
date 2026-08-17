/**
 * Things V2 (T2D-A/T2D-B1) — canonical activity route.
 *
 * T2D-A established the fail-closed shell; T2D-B1 replaced it with the
 * resolver-driven detail page. This suite locks the route-level contract in
 * both worlds:
 *
 *   - a resolver not-found (unknown or archived activity) renders the
 *     existing NotFound experience: noindex,follow, no self-canonical, no
 *     provider call, no affiliate redirect, no fake content/availability
 *   - an unknown destination fails closed immediately (no resolver call)
 *   - an infrastructure failure is NEVER rendered as "no such activity" — it
 *     renders the honest unavailable state with retry
 *   - Rome destination / hub routes and their SEO contracts are unchanged
 *   - App.tsx keeps both route trees registered
 *
 * The resolver service is mocked at the module boundary; no network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "fs";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import ThingsToDoActivityRoute from "@/pages/ThingsToDoActivityRoute";
import ThingsToDoDestinationPage from "@/pages/ThingsToDoDestinationPage";
import ThingsToDoHubRoute from "@/pages/ThingsToDoHubRoute";

const { searchExperiencesMock } = vi.hoisted(() => ({ searchExperiencesMock: vi.fn() }));
const { resolveActivityDetailMock } = vi.hoisted(() => ({ resolveActivityDetailMock: vi.fn() }));

vi.mock("@/services/experiences", () => ({
  searchExperiences: searchExperiencesMock,
  fetchProviderAvailability: vi.fn(() => Promise.resolve({ tiqets: "available", viator: "disabled" })),
}));

const { mapProviderProductsMock } = vi.hoisted(() => ({ mapProviderProductsMock: vi.fn() }));

vi.mock("@/services/thingsActivityMapping", () => ({
  mapProviderProducts: mapProviderProductsMock.mockResolvedValue({ status: "unavailable", mappings: [] }),
  providerScopedKey: (provider: string, providerProductId: string) => `${provider}:${providerProductId}`,
}));

vi.mock("@/services/thingsActivityDetail", () => ({
  resolveThingsActivityDetail: (...args: unknown[]) => resolveActivityDetailMock(...args),
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));
vi.mock("@/components/search/DestinationAutocomplete", () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => (
    <input role="combobox" aria-label="city-autocomplete" value={value || ""} onChange={(e) => onChange?.(e.target.value)} />
  ),
}));

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
        <Routes>
          <Route path="/things-to-do" element={<ThingsToDoHubRoute />} />
          <Route path="/things-to-do/:destinationSlug" element={<ThingsToDoDestinationPage />} />
          <Route path="/things-to-do/:destinationSlug/:activitySlug" element={<ThingsToDoActivityRoute />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const canonical = () =>
  document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") ?? null;
const robots = () =>
  document.head.querySelector('meta[name="robots"]')?.getAttribute("content") ?? null;

beforeEach(() => {
  vi.clearAllMocks();
  searchExperiencesMock.mockResolvedValue(emptyResult());
  document.head.querySelectorAll('link[rel="canonical"], meta[name="robots"]').forEach((n) => n.remove());
});

// ═══════════════════════════════════════════════════════════════
// Route recognition + fail-closed (resolver not-found)
// ═══════════════════════════════════════════════════════════════

describe("Things activity route — fail-closed contract", () => {
  it("recognises the 3-segment shape and fails closed for an unresolved activity", async () => {
    resolveActivityDetailMock.mockResolvedValue({ state: "not-found" });
    renderRoutes("/things-to-do/rome/vatican-museums-guided-tour");

    expect(await screen.findByText("Oops! Page not found")).toBeTruthy();
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
    // No self-canonical without resolved identity.
    expect(canonical()).toBeNull();
    // No provider search fired for an unresolved activity.
    expect(searchExperiencesMock).not.toHaveBeenCalled();
  });

  it("fails closed for an unknown destination too (no resolver call)", async () => {
    renderRoutes("/things-to-do/not-a-city/any-activity");

    expect(await screen.findByText("Oops! Page not found")).toBeTruthy();
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
    expect(canonical()).toBeNull();
    expect(resolveActivityDetailMock).not.toHaveBeenCalled();
    expect(searchExperiencesMock).not.toHaveBeenCalled();
  });

  it("never manufactures identity from arbitrary URL text", async () => {
    // A provider product ID in the URL is just another unresolved slug.
    resolveActivityDetailMock.mockResolvedValue({ state: "not-found" });
    renderRoutes("/things-to-do/rome/3731VATICAN");

    expect(await screen.findByText("Oops! Page not found")).toBeTruthy();
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
    expect(canonical()).toBeNull();
  });

  it("never emits an affiliate redirect or provider link on a not-found route", async () => {
    resolveActivityDetailMock.mockResolvedValue({ state: "not-found" });
    renderRoutes("/things-to-do/rome/anything");
    await screen.findByText("Oops! Page not found");

    // NotFound links only to the home page.
    expect(screen.queryByRole("link", { name: /viator|tiqets|book now|view experience/i })).toBeNull();
    expect(screen.getByRole("link", { name: /return to home/i })).toBeTruthy();
  });

  it("no fake content or fake availability is ever rendered for an unresolved activity", async () => {
    resolveActivityDetailMock.mockResolvedValue({ state: "not-found" });
    renderRoutes("/things-to-do/rome/vatican-museums-guided-tour");
    await screen.findByText("Oops! Page not found");

    const bodyText = document.body.textContent || "";
    expect(bodyText).not.toMatch(/available|from .*per (person|adult)|cancellation/i);
  });
});

// ═══════════════════════════════════════════════════════════════
// Infrastructure failure != not-found
// ═══════════════════════════════════════════════════════════════

describe("Things activity route — infrastructure failure is NOT not-found", () => {
  it("renders the honest unavailable state (with retry) instead of NotFound", async () => {
    resolveActivityDetailMock.mockResolvedValue({ state: "unavailable" });
    renderRoutes("/things-to-do/rome/vatican-museums-guided-tour");

    expect(
      await screen.findByText("We couldn't load this experience right now."),
    ).toBeTruthy();
    expect(screen.queryByText("Oops! Page not found")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
    // Unavailable is still non-indexable.
    await waitFor(() => expect(robots()).toBe("noindex,follow"));
    expect(canonical()).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════
// Existing Things behaviour unchanged (S/T)
// ═══════════════════════════════════════════════════════════════

describe("Things activity route — existing routes unchanged", () => {
  it("S. /things-to-do/rome still renders the destination page, not not-found", async () => {
    renderRoutes("/things-to-do/rome");

    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());
    const filters = searchExperiencesMock.mock.calls[0][0] as {
      destination?: string;
      providerDestinationIds?: { tiqets?: number; viator?: number };
    };
    expect(filters.destination).toBe("Rome");
    expect(filters.providerDestinationIds).toEqual({ tiqets: 71631, viator: 511 });
    expect(screen.queryByText("Oops! Page not found")).toBeNull();
  });

  it("T. /things-to-do hub still renders and searches without any provider ID", async () => {
    renderRoutes("/things-to-do");

    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());
    const filters = searchExperiencesMock.mock.calls[0][0] as {
      providerDestinationIds?: { tiqets?: number; viator?: number };
    };
    expect(filters.providerDestinationIds).toBeUndefined();
    expect(screen.queryByText("Oops! Page not found")).toBeNull();
  });

  it("the Rome destination SEO contract is unchanged (canonical + noindex)", async () => {
    renderRoutes("/things-to-do/rome");

    await waitFor(() => {
      expect(canonical()).toBe("https://bookingsfinder.com/things-to-do/rome");
      expect(robots()).toBe("noindex,follow");
    });
  });
});

// ═══════════════════════════════════════════════════════════════
// Route registration parity
// ═══════════════════════════════════════════════════════════════

describe("Things activity route — App.tsx registration", () => {
  const src = readFileSync("src/App.tsx", "utf8");

  it("registers the activity route in BOTH route trees (parity)", () => {
    // Reduced-motion tree + animated tree must stay identical in coverage.
    const registrations = src.match(/things-to-do\/:destinationSlug\/:activitySlug/g) ?? [];
    expect(registrations).toHaveLength(2);
  });

  it("keeps the destination route registered in both trees", () => {
    const registrations = src.match(/things-to-do\/:destinationSlug"/g) ?? [];
    // `:destinationSlug` alone (dest route) — the activity route has an
    // extra segment, so the quoted exact match counts only the dest route.
    expect(registrations).toHaveLength(2);
  });
});
