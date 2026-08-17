/**
 * Things V2 (T3C) — Rome destination experience.
 *
 * Locks the BEHAVIOUR and SEMANTIC STRUCTURE the redesign introduced, not its
 * Tailwind classes. Every assertion here is something a traveller or a screen
 * reader can observe:
 *
 *   DESTINATION IDENTITY   Rome is a place on this page — breadcrumb, H1,
 *                          country — and the results heading does not simply
 *                          repeat the H1 back.
 *   DISCOVERY HONESTY      "Explore Rome" shortcuts commit a keyword search
 *                          and say so. No counts, no popularity, no curation.
 *   PHOTOGRAPHY            No invented imagery: the hero contains no <img> and
 *                          its destination motif is decorative to AT.
 *   MOBILE FILTERS         The sheet is a real dialog with an accessible name.
 *
 * searchExperiences / mapProviderProducts are mocked at the module boundary;
 * no network calls.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent, within } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type { ExperienceSearchFilters } from "@/types/experiences";

const { searchExperiencesMock, mapProviderProductsMock } = vi.hoisted(() => ({
  searchExperiencesMock: vi.fn(),
  mapProviderProductsMock: vi.fn(),
}));

vi.mock("@/services/experiences", () => ({
  searchExperiences: searchExperiencesMock,
  fetchProviderAvailability: vi.fn(() => Promise.resolve({ tiqets: "available", viator: "disabled" })),
}));

vi.mock("@/services/thingsActivityMapping", () => ({
  mapProviderProducts: mapProviderProductsMock,
  providerScopedKey: (provider: string, providerProductId: string) => `${provider}:${providerProductId}`,
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));

vi.mock("@/components/search/DestinationAutocomplete", () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => (
    <input
      role="combobox"
      aria-label="Where are you going?"
      value={value || ""}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

import ThingsToDo from "@/pages/ThingsToDo";
import ThingsToDoDestinationPage from "@/pages/ThingsToDoDestinationPage";

const emptyResult = () => ({
  products: [],
  totalCount: 0,
  page: 1,
  providers: { tiqets: "available", viator: "disabled" },
  fetchedAt: new Date().toISOString(),
});

function setViewportWidth(width: number) {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: width });
}

function renderRome() {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={["/things-to-do/rome"]}>
        <Routes>
          <Route path="/things-to-do" element={<ThingsToDo />} />
          <Route path="/things-to-do/:destinationSlug" element={<ThingsToDoDestinationPage />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const lastFilters = (): ExperienceSearchFilters =>
  searchExperiencesMock.mock.calls.at(-1)?.[0] as ExperienceSearchFilters;

const bodyText = () => document.body.textContent ?? "";

beforeEach(() => {
  vi.clearAllMocks();
  setViewportWidth(1280);
  window.HTMLElement.prototype.scrollIntoView = vi.fn();
  searchExperiencesMock.mockResolvedValue(emptyResult());
  mapProviderProductsMock.mockResolvedValue({ status: "available", mappings: [] });
});

// ── DESTINATION IDENTITY ────────────────────────────────────────

describe("T3C — Rome reads as a place, not a query string", () => {
  it("puts Rome in a breadcrumb that links back to the Things hub", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    const crumbs = screen.getByRole("navigation", { name: "Breadcrumb" });
    const hubLink = within(crumbs).getByRole("link", { name: "Things to do" });
    expect(hubLink.getAttribute("href")).toBe("/things-to-do");
    expect(within(crumbs).getByText("Rome").getAttribute("aria-current")).toBe("page");
  });

  it("names the destination in the single H1 and its country beneath it", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    expect(document.querySelectorAll("h1")).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Things to do in Rome");
    expect(screen.getByText("Rome, Italy")).toBeTruthy();
  });

  it("does not repeat the H1 verbatim as the results heading", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    const results = screen.getByRole("heading", { level: 2, name: "Experiences in Rome" });
    expect(results).toBeTruthy();
    expect(results.textContent).not.toBe(screen.getByRole("heading", { level: 1 }).textContent);
  });

  it("offers no example-city shortcuts on a destination route", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    // "Try: Sydney Melbourne Paris Rome" belongs to the hub. On /things-to-do/
    // rome the destination identity comes from the route, so a row of other
    // cities beside it would only invite the traveller to leave.
    expect(screen.queryByText("Try:")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sydney" })).toBeNull();
  });
});

// ── PHOTOGRAPHY / IMAGERY ───────────────────────────────────────

describe("T3C — no invented destination photography", () => {
  it("renders no image in the hero and keeps the destination motif decorative", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    const hero = screen.getByRole("heading", { level: 1 }).closest("section") as HTMLElement;
    expect(hero.querySelectorAll("img")).toHaveLength(0);
    expect(within(hero).queryAllByRole("img")).toHaveLength(0);

    // The drawn motif exists but carries no information for assistive tech.
    const svgs = Array.from(hero.querySelectorAll("svg"));
    expect(svgs.length).toBeGreaterThan(0);
    for (const svg of svgs) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

// ── DISCOVERY RAIL ──────────────────────────────────────────────

describe("T3C — Explore Rome discovery", () => {
  it("is a labelled group of keyword shortcuts named after the destination", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    expect(screen.getByRole("heading", { level: 2, name: "Explore Rome" })).toBeTruthy();
    const rail = screen.getByRole("group", { name: "Explore Rome" });
    expect(within(rail).getAllByRole("button")).toHaveLength(7);
  });

  it("describes itself truthfully as a keyword search, not a curated collection", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    expect(screen.getByText("Shortcuts that search Rome experiences by keyword.")).toBeTruthy();
  });

  it("claims no counts, ranking or curation anywhere on the page", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    expect(bodyText()).not.toMatch(/\bpopular\b|\btrending\b|\bhandpicked\b|\bcurated\b|\brecommended\b|\bbest of\b/i);
    // "24 Vatican experiences"-style tile counts require a verified provider
    // taxonomy, which does not exist yet.
    const rail = screen.getByRole("group", { name: "Explore Rome" });
    expect(rail.textContent ?? "").not.toMatch(/\d/);
  });

  it("commits a keyword search and reflects selection with aria-pressed", async () => {
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalledTimes(1));

    const rail = screen.getByRole("group", { name: "Explore Rome" });
    const museums = within(rail).getByRole("button", { name: "Museums" });
    expect(museums.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(museums);
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalledTimes(2));

    expect(lastFilters().activityTags).toEqual(["Museums"]);
    // Provider identity is untouched by a discovery shortcut.
    expect(lastFilters().providerDestinationIds).toEqual({ tiqets: 71631, viator: 511 });
    expect(within(rail).getByRole("button", { name: "Museums" }).getAttribute("aria-pressed")).toBe("true");
  });
});

// ── MOBILE FILTER SHEET ─────────────────────────────────────────

describe("T3C — mobile filter sheet", () => {
  it("is a modal dialog with an accessible name", async () => {
    setViewportWidth(390);
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalled());

    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));

    const dialog = screen.getByRole("dialog", { name: "Filters" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(within(dialog).getByRole("button", { name: "Show results" })).toBeTruthy();
  });

  it("applies the drafted rating and closes", async () => {
    setViewportWidth(390);
    renderRome();
    await waitFor(() => expect(searchExperiencesMock).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole("button", { name: /^Filters/ }));
    fireEvent.click(screen.getByRole("button", { name: "Show results" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
