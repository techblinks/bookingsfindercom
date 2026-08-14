/**
 * Desktop D4 — the lower homepage.
 *
 * D4 rebuilt everything below the recent-activity section: the five-card
 * "Everything you need to plan your trip" grid, the two oversized
 * SectionContainers, and the closing CTA band are gone, replaced by one
 * planning section and one how-it-works + trust band.
 *
 * These tests lock the structural result and the honesty of the copy. They
 * deliberately assert almost no Tailwind: density is a visual property and is
 * verified by browser QA, which jsdom cannot measure.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DesktopHome from "@/pages/home/DesktopHome";
import { TRUST_ITEMS } from "@/components/shared/TrustContent";

vi.mock("@/lib/analytics", () => ({
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logInternalNavigation: vi.fn(),
}));

vi.mock("@/components/search/ModernFlightSearch", () => ({
  default: () => <div data-testid="modern-flight-search">ModernFlightSearch</div>,
}));

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: () => <img alt="BookingsFinder" data-testid="brand-logo" />,
}));

vi.mock("@/components/layout/Footer", () => ({
  default: () => <footer data-testid="footer">Footer</footer>,
}));

function renderDesktopHome() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/"]}>
          <DesktopHome />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>,
  );
}

const planning = () => screen.getByRole("region", { name: "Plan the rest of your trip" });
const howItWorks = () => screen.getByRole("region", { name: "How BookingsFinder works" });
const trust = () => screen.getByRole("region", { name: "Trust and transparency" });
/** Links inside <main> only — the Header carries its own copies of these routes. */
const linkTo = (href: string) =>
  Array.from(document.querySelectorAll("main a")).filter(a => a.getAttribute("href") === href);
const bodyText = () => document.body.textContent ?? "";

beforeEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

// ── WHAT THE OLD LOWER PAGE LEFT BEHIND ──

describe("D4 — the old lower page is gone", () => {
  it("drops the generic five-card marketing grid", () => {
    renderDesktopHome();
    expect(screen.queryByText("Everything you need to plan your trip")).toBeNull();
    for (const title of [
      "Compare flights",
      "Find stays",
      "Estimate trip costs",
      "Optimize your itinerary",
      "Discover things to do",
    ]) {
      expect(screen.queryByText(title)).toBeNull();
    }
  });

  it("drops the repeated 'Learn more' affordance", () => {
    renderDesktopHome();
    expect(screen.queryAllByText("Learn more")).toHaveLength(0);
  });

  it("drops the closing CTA band and its duplicate search button", () => {
    renderDesktopHome();
    expect(screen.queryByText("Ready to start planning?")).toBeNull();
    expect(screen.queryByText("Search flights")).toBeNull();
    expect(document.querySelectorAll('a[href="#flight-search"]')).toHaveLength(0);
  });

  it("leaves exactly three headed sections below the recent-activity slot", () => {
    renderDesktopHome();
    const main = document.querySelector("main")!;
    expect(Array.from(main.querySelectorAll("h2")).map(h => h.textContent?.trim())).toEqual([
      "Plan the rest of your trip",
      "How BookingsFinder works",
      "Trust and transparency",
    ]);
  });
});

// ── SECTION 1: PLAN THE REST OF YOUR TRIP ──

describe("D4 — planning section", () => {
  it("is a labelled region headed by an H2", () => {
    renderDesktopHome();
    expect(planning()).toBeTruthy();
    expect(screen.getByText("Plan the rest of your trip").tagName).toBe("H2");
  });

  it("leads with the two tools that have no entry point in the band above", () => {
    renderDesktopHome();
    const headings = within(planning())
      .getAllByRole("heading", { level: 3 })
      .map(h => h.textContent?.trim());
    expect(headings.slice(0, 2)).toEqual([
      "Estimate your trip cost",
      "Check a route before you book",
    ]);
  });

  it("routes the trip cost planner", () => {
    renderDesktopHome();
    expect(
      within(planning()).getByText("Estimate your trip cost").closest("a")!.getAttribute("href"),
    ).toBe("/trip-cost");
  });

  it("routes the optimizer", () => {
    renderDesktopHome();
    expect(
      within(planning()).getByText("Check a route before you book").closest("a")!.getAttribute("href"),
    ).toBe("/optimizer");
  });

  it("keeps flights, stays and things reachable as one compact strip", () => {
    renderDesktopHome();
    const strip = planning().querySelector("ul")!;
    const entries = Array.from(strip.querySelectorAll("a")).map(a => [
      a.textContent?.trim(),
      a.getAttribute("href"),
    ]);
    expect(entries).toHaveLength(3);
    expect(entries.map(e => e[1])).toEqual(["/flights", "/hotels", "/things-to-do"]);
  });

  it("offers each destination once in the page body, twice only where the band already links it", () => {
    renderDesktopHome();
    // The planning tools exist nowhere else on the page.
    for (const href of ["/trip-cost", "/optimizer"]) {
      expect(linkTo(href)).toHaveLength(1);
    }
    // Flights/Stays/Things: one category pill in the band, one strip entry here.
    for (const href of ["/flights", "/hotels", "/things-to-do"]) {
      expect(linkTo(href)).toHaveLength(2);
    }
  });

  it("gives every planning link a visible focus treatment", () => {
    renderDesktopHome();
    for (const link of Array.from(planning().querySelectorAll("a"))) {
      expect(link.className).toContain("focus-visible:outline");
    }
  });

  it("hides its decorative icons and arrows from screen readers", () => {
    renderDesktopHome();
    for (const svg of Array.from(planning().querySelectorAll("svg"))) {
      expect(svg.getAttribute("aria-hidden")).toBe("true");
    }
  });
});

// ── HONEST CAPABILITY COPY ──

describe("D4 — copy describes the shipped product", () => {
  it("describes the planner as an estimate built from entered amounts", () => {
    renderDesktopHome();
    const card = within(planning()).getByText("Estimate your trip cost").closest("a")!;
    expect(card.textContent).toContain("from the amounts you enter");
    expect(card.textContent).not.toMatch(/exact|guaranteed|cheapest|lowest/i);
  });

  it("no longer claims the optimizer plans multi-city routes", () => {
    renderDesktopHome();
    expect(bodyText()).not.toMatch(/multi-city|most efficient travel path/i);
  });

  it("describes the optimizer as single-route analysis only", () => {
    renderDesktopHome();
    const card = within(planning()).getByText("Check a route before you book").closest("a")!;
    expect(card.textContent).toContain("cost breakdown");
    expect(card.textContent).toContain("layover risks");
    expect(card.textContent).not.toMatch(/perfect itinerary|optimal route/i);
  });

  it("makes no price, savings or independence claims anywhere on the lower page", () => {
    renderDesktopHome();
    expect(bodyText()).not.toMatch(/best price|lowest price|cheapest|guaranteed|save up to|independent comparison/i);
  });
});

// ── SECTION 2: HOW IT WORKS ──

describe("D4 — how it works", () => {
  it("keeps three ordered steps in one list", () => {
    renderDesktopHome();
    const steps = howItWorks().querySelectorAll("ol > li");
    expect(steps).toHaveLength(3);
  });

  it("keeps each step to a heading and a single sentence", () => {
    renderDesktopHome();
    for (const step of Array.from(howItWorks().querySelectorAll("ol > li"))) {
      expect(step.querySelectorAll("h3")).toHaveLength(1);
      expect(step.querySelectorAll("p")).toHaveLength(1);
    }
  });

  it("names the three steps in order", () => {
    renderDesktopHome();
    expect(
      within(howItWorks())
        .getAllByRole("heading", { level: 3 })
        .map(h => h.textContent?.replace(/^\d+\.\s*/, "").trim()),
    ).toEqual(["Search and compare", "Plan the full trip", "Continue with the provider"]);
  });

  it("ends the journey at the provider, not at a BookingsFinder checkout", () => {
    renderDesktopHome();
    expect(howItWorks().textContent).toContain("provider's site");
    expect(howItWorks().textContent).not.toMatch(/book (now|with us)|checkout/i);
  });
});

// ── SECTION 3: TRUST ──

describe("D4 — trust and disclosure", () => {
  it("preserves every approved trust statement verbatim", () => {
    renderDesktopHome();
    for (const item of TRUST_ITEMS) {
      expect(within(trust()).getByText(item.text)).toBeTruthy();
    }
  });

  it("keeps the affiliate disclosure reachable", () => {
    renderDesktopHome();
    expect(
      within(trust()).getByText("Affiliate disclosure").closest("a")!.getAttribute("href"),
    ).toBe("/affiliate-disclosure");
  });

  it("keeps the privacy policy reachable", () => {
    renderDesktopHome();
    expect(
      within(trust()).getByText("Privacy policy").closest("a")!.getAttribute("href"),
    ).toBe("/privacy");
  });

  it("keeps the terms of service reachable", () => {
    renderDesktopHome();
    expect(
      within(trust()).getByText("Terms of service").closest("a")!.getAttribute("href"),
    ).toBe("/terms");
  });

  it("keeps the changing-requirements warning", () => {
    renderDesktopHome();
    expect(trust().textContent).toContain("Travel requirements can change");
  });

  it("introduces no unverified trust claim", () => {
    renderDesktopHome();
    expect(trust().textContent).not.toMatch(/independent|impartial|unbiased|all providers|every provider/i);
  });
});

// ── D1 AND D3 ARE NOT REGRESSED ──

describe("D4 — D1 and D3 untouched", () => {
  it("keeps exactly one H1 with the approved positioning", () => {
    renderDesktopHome();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Plan the whole trip, not just the flight.");
  });

  it("keeps the product band, its categories and the real search", () => {
    renderDesktopHome();
    const band = document.getElementById("flight-search")!;
    expect(band.contains(screen.getByTestId("modern-flight-search"))).toBe(true);
    expect(
      within(screen.getByRole("navigation", { name: "Travel categories" }))
        .getAllByRole("link")
        .map(a => a.textContent?.trim()),
    ).toEqual(["Flights", "Stays", "Things to do"]);
  });

  it("keeps the trust strip between the band and the lower page", () => {
    renderDesktopHome();
    expect(screen.getByText("Compare travel options")).toBeTruthy();
    expect(screen.getByText(/No booking fee from BookingsFinder/)).toBeTruthy();
  });

  it("mounts the recent-activity surface before the planning section", () => {
    renderDesktopHome();
    const main = document.querySelector("main")!;
    const order = Array.from(main.children);
    const bandIdx = order.findIndex(el => el.id === "flight-search");
    const planIdx = order.findIndex(el => el.querySelector("#products-heading"));
    expect(bandIdx).toBeGreaterThanOrEqual(0);
    expect(planIdx).toBeGreaterThan(bandIdx);
  });

  it("renders no recent-activity section for a first-time visitor", async () => {
    renderDesktopHome();
    await waitFor(() => expect(screen.getByText("How BookingsFinder works")).toBeTruthy());
    expect(screen.queryByRole("region", { name: "Pick up where you left off" })).toBeNull();
  });
});

// ── SEO AND ASSETS ──

describe("D4 — SEO and assets", () => {
  it("keeps the title, description, canonical and WebSite structured data", async () => {
    renderDesktopHome();

    await waitFor(() => {
      expect(document.title).toBe("BookingsFinder - Compare Flights and Plan Your Trip");
      expect(document.head.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://bookingsfinder.com",
      );
    });

    expect(
      document.head.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe(
      "Compare flights, find stays, estimate trip costs and use practical travel-planning tools with BookingsFinder.",
    );

    const ld = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => s.textContent ?? "")
      .join(" ");
    expect(ld).toContain('"@type":"WebSite"');
    expect(ld).toContain("SearchAction");
  });

  it("adds no imagery — the lower page is typography, layout and icons", () => {
    renderDesktopHome();
    // Only the mocked BrandLogo in the header.
    expect(screen.getAllByRole("img")).toHaveLength(1);
    expect(document.querySelectorAll("main img")).toHaveLength(0);
  });
});

// ── OUT OF SCOPE FOR D4 ──

describe("D4 — starts nothing it should not", () => {
  it("adds no AI surface", () => {
    renderDesktopHome();
    expect(bodyText()).not.toMatch(/plan with ai|ask bookingsfinder|\bai\b.*assistant|chat with/i);
  });

  it("adds no trip-context next actions", () => {
    renderDesktopHome();
    expect(bodyText()).not.toMatch(/find a stay in|things to do in \w|estimate this trip/i);
  });

  it("adds no fabricated inventory, deals or urgency", () => {
    renderDesktopHome();
    expect(bodyText()).not.toMatch(/\d+ (flights|hotels|deals)|only \d+ left|book now|limited time/i);
  });
});
