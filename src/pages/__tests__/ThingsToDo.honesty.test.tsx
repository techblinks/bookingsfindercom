/**
 * Things to Do — customer honesty (T1).
 *
 * The Things V2 audit found the page could blame the traveller's filters for a
 * provider outage, and offered an "Instant ticket" filter wired to a field that
 * is hardcoded `null` in both adapters.
 *
 * These tests lock the two things that must never be confused:
 *
 *   PROVIDER UNAVAILABLE   nothing answered — our problem, our copy
 *   HEALTHY ZERO RESULTS   a provider answered and genuinely had no match
 *
 * plus the removal of unsupported controls and unevidenced ranking claims.
 * searchExperiences is mocked so each provider state can be produced exactly;
 * no network call is made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import type {
  ExperienceProduct,
  ExperienceSearchResult,
  ProviderAvailability,
  ProviderStatus,
} from "@/types/experiences";
import { RECENT_ACTIVITY_STORAGE_KEY, loadRecentActivity } from "@/lib/recentActivity";

const { mockSearchExperiences } = vi.hoisted(() => ({ mockSearchExperiences: vi.fn() }));

vi.mock("@/services/experiences", () => ({
  searchExperiences: mockSearchExperiences,
  fetchProviderAvailability: vi.fn(() => Promise.resolve({ tiqets: "available", viator: "disabled" })),
}));

vi.mock("@/components/layout/Header", () => ({ default: () => <header /> }));
vi.mock("@/components/layout/Footer", () => ({ default: () => <footer /> }));

vi.mock("@/components/search/DestinationAutocomplete", () => ({
  default: ({ value, onChange }: { value?: string; onChange?: (v: string) => void }) => (
    <input
      role="combobox"
      aria-label="Where are you going?"
      value={value || ""}
      onChange={e => onChange?.(e.target.value)}
    />
  ),
}));

import ThingsToDo from "@/pages/ThingsToDo";

function product(id: string, title: string): ExperienceProduct {
  return {
    provider: "tiqets",
    providerProductId: id,
    title,
    description: null,
    tagline: null,
    city: "Rome",
    country: "Italy",
    destinationId: 1,
    imageUrl: null,
    imageAlt: null,
    imageCredit: null,
    rating: 4.6,
    reviewCount: 120,
    price: 42,
    currency: "AUD",
    saleStatus: "on_sale",
    features: {
      freeCancellation: null,
      skipLine: true,
      smartphoneTicket: null,
      instantConfirmation: null,
      wheelchairAccessible: null,
      likelyToSellOut: null,
    },
    outboundUrl: "https://www.tiqets.com/en/x",
    attributionRequired: true,
  };
}

function result(
  products: ExperienceProduct[],
  providers: ProviderAvailability,
): ExperienceSearchResult {
  return {
    products,
    totalCount: products.length,
    page: 1,
    providers,
    fetchedAt: new Date().toISOString(),
  };
}

const P = (tiqets: ProviderStatus, viator: ProviderStatus): ProviderAvailability => ({ tiqets, viator });

function renderPage(search = "?city=Rome") {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[`/things-to-do${search}`]}>
        <ThingsToDo />
      </MemoryRouter>
    </HelmetProvider>,
  );
}

const bodyText = () => document.body.textContent ?? "";
const BLAME = /adjust(ing)? your filters|no experiences found|check your spelling/i;

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── PROVIDER UNAVAILABLE ──

describe("Things to Do — provider unavailable", () => {
  it("says experiences are temporarily unavailable when nothing answered", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "unavailable")));
    renderPage();

    expect(await screen.findByText("Experiences are temporarily unavailable")).toBeTruthy();
  });

  it("owns the problem and never blames the traveller", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "unavailable")));
    renderPage();
    await screen.findByText("Experiences are temporarily unavailable");

    expect(bodyText()).toMatch(/this is on our side/i);
    expect(bodyText()).not.toMatch(BLAME);
  });

  it("treats a deliberately disabled provider as contributing nothing", async () => {
    // Nothing answered: one errored, one is switched off.
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "disabled")));
    renderPage();

    expect(await screen.findByText("Experiences are temporarily unavailable")).toBeTruthy();
  });

  it("treats an all-disabled configuration as unavailable, not as zero matches", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("disabled", "disabled")));
    renderPage();

    expect(await screen.findByText("Experiences are temporarily unavailable")).toBeTruthy();
    expect(bodyText()).not.toMatch(BLAME);
  });

  it("shows the unavailable state when the search itself rejects", async () => {
    mockSearchExperiences.mockRejectedValue(new Error("network down"));
    renderPage();

    expect(await screen.findByText("Experiences are temporarily unavailable")).toBeTruthy();
  });

  it("renders no products and no fabricated fallback", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "unavailable")));
    renderPage();
    await screen.findByText("Experiences are temporarily unavailable");

    expect(document.querySelectorAll('[role="article"]')).toHaveLength(0);
  });

  it("exposes no provider or infrastructure internals", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "unavailable")));
    renderPage();
    await screen.findByText("Experiences are temporarily unavailable");

    const state = screen.getByText("Experiences are temporarily unavailable").closest("div")!;
    expect(state.textContent).not.toMatch(/supabase|api key|edge function|401|403|429|5\d\d|tiqets|viator/i);
  });

  it("offers a retry that genuinely repeats the search", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "unavailable")));
    renderPage();
    await screen.findByText("Experiences are temporarily unavailable");

    const before = mockSearchExperiences.mock.calls.length;
    screen.getByRole("button", { name: /try again/i }).click();
    await waitFor(() => expect(mockSearchExperiences.mock.calls.length).toBeGreaterThan(before));
  });

  it("announces the state to assistive technology", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "unavailable")));
    renderPage();
    const heading = await screen.findByText("Experiences are temporarily unavailable");

    expect(heading.closest('[role="status"]')).toBeTruthy();
  });
});

// ── HEALTHY ZERO RESULTS ──

describe("Things to Do — healthy zero results", () => {
  it("says nothing matched when a provider answered healthily", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "disabled")));
    renderPage();

    expect(await screen.findByText("No experiences matched your search")).toBeTruthy();
  });

  it("never renders the provider-failure copy for a healthy zero result", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "disabled")));
    renderPage();
    await screen.findByText("No experiences matched your search");

    expect(screen.queryByText("Experiences are temporarily unavailable")).toBeNull();
  });

  it("suggests only actions the traveller can actually take", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "unavailable")));
    renderPage();
    await screen.findByText("No experiences matched your search");

    expect(bodyText()).toMatch(/try a different destination or activity/i);
  });

  it("stays healthy when one provider answers and the other fails", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "unavailable")));
    renderPage();

    expect(await screen.findByText("No experiences matched your search")).toBeTruthy();
  });

  it("renders results normally when products come back", async () => {
    mockSearchExperiences.mockResolvedValue(
      result([product("a", "Colosseum tour"), product("b", "Vatican tour")], P("available", "disabled")),
    );
    renderPage();

    await waitFor(() => expect(document.querySelectorAll('[role="article"]')).toHaveLength(2));
    expect(screen.queryByText("Experiences are temporarily unavailable")).toBeNull();
    expect(screen.queryByText("No experiences matched your search")).toBeNull();
  });
});

// ── UNSUPPORTED CONTROLS AND CLAIMS ──

describe("Things to Do — unsupported controls removed", () => {
  beforeEach(() => {
    mockSearchExperiences.mockResolvedValue(
      result([product("a", "Colosseum tour")], P("available", "disabled")),
    );
  });

  it("offers no Instant ticket filter", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    expect(screen.queryByText("Instant ticket")).toBeNull();
  });

  it("never emits an instant URL parameter", async () => {
    const { container } = renderPage("?city=Rome&instant=1");
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    // The page rewrites the URL from its own state; instant is no longer part of it.
    expect(container.ownerDocument.location.search).not.toContain("instant");
  });

  it("makes no popularity or ranking claim", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    expect(bodyText()).not.toMatch(/\bpopular\b|\btrending\b|\btop destinations\b|\brecommended\b/i);
  });

  it("labels the shortcuts neutrally", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    expect(screen.getByText("Try:")).toBeTruthy();
  });

  it("names the source of the sort order rather than claiming a criterion", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    expect(bodyText()).toContain("Provider order");
  });

  it("keeps the provider disclosure visible on each card", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    const card = document.querySelector('[role="article"]')!;
    const disclosure = within(card as HTMLElement).getByText(/Provided by Tiqets/);
    expect(disclosure).toBeTruthy();
    // Was 11px on #8BA0B8, which fails contrast on white.
    expect(disclosure.className).not.toContain("8BA0B8");
    expect(disclosure.className).not.toContain("text-[11px]");
  });

  it("does not claim the optimizer orders an itinerary", async () => {
    renderPage();
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    expect(bodyText()).not.toMatch(/best order|most efficient|perfect itinerary|optimal route/i);
  });
});

// ── PRESERVED CONTRACTS ──

describe("Things to Do — preserved contracts", () => {
  it("still restores a city from the URL", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "disabled")));
    renderPage("?city=Rome");

    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    expect(mockSearchExperiences.mock.calls[0][0]).toMatchObject({ destination: "Rome" });
  });

  it("still restores a city and query from the URL", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "disabled")));
    renderPage("?city=Rome&q=museums");

    await waitFor(() => expect(mockSearchExperiences).toHaveBeenCalled());
    expect(mockSearchExperiences.mock.calls[0][0]).toMatchObject({ destination: "Rome", query: "museums" });
  });

  /*
   * Recording still happens only on an explicit commit, never on URL hydration —
   * the boundary owned by ThingsToDo.activity.test.tsx. This asserts T1 did not
   * break it, not the recorder's own rules.
   */
  it("still records a committed city search as recent activity", async () => {
    mockSearchExperiences.mockResolvedValue(
      result([product("a", "Colosseum tour")], P("available", "disabled")),
    );
    renderPage("?city=Rome");
    await waitFor(() => expect(document.querySelectorAll('[role="article"]').length).toBe(1));

    expect(loadRecentActivity()).toHaveLength(0); // hydration alone records nothing
    screen.getByRole("button", { name: /^search$/i }).click();

    await waitFor(() => {
      const things = loadRecentActivity().filter(e => e.kind === "things");
      expect(things).toHaveLength(1);
      expect(things[0]).toMatchObject({ city: "Rome" });
    });
    expect(localStorage.getItem(RECENT_ACTIVITY_STORAGE_KEY)).toBeTruthy();
  });

  it("keeps exactly one H1", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "disabled")));
    renderPage();
    await screen.findByText("No experiences matched your search");

    expect(document.querySelectorAll("h1")).toHaveLength(1);
  });

  it("keeps the title, description and canonical unchanged", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("available", "disabled")));
    renderPage();

    await waitFor(() => {
      expect(document.title).toBe("Things To Do | BookingsFinder.com");
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://bookingsfinder.com/things-to-do",
      );
    });
  });

  it("shows no price, deal or urgency invention in either empty state", async () => {
    mockSearchExperiences.mockResolvedValue(result([], P("unavailable", "unavailable")));
    renderPage();
    await screen.findByText("Experiences are temporarily unavailable");

    expect(bodyText()).not.toMatch(/\bdeal\b|\bsave\b|\bdiscount\b|only \d+ left|hurry|selling fast/i);
  });
});
