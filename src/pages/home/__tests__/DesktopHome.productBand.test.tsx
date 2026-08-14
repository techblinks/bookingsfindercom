/**
 * Desktop D1 — product band.
 *
 * The first viewport is now the product: positioning, category entry points and
 * the real flight search share one surface. These tests lock the customer-visible
 * outcome — what is on the page, where the categories go, and that the marketing
 * hero that pushed the search below the fold is gone. Fold geometry itself is
 * verified by browser QA, which jsdom cannot measure.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import DesktopHome from "@/pages/home/DesktopHome";

vi.mock("@/lib/analytics", () => ({
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logInternalNavigation: vi.fn(),
}));

vi.mock("@/components/search/ModernFlightSearch", () => ({
  default: ({ onDark }: { onDark?: boolean }) => (
    <div data-testid="modern-flight-search" data-ondark={String(!!onDark)}>
      ModernFlightSearch
    </div>
  ),
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

const band = () => document.getElementById("flight-search")!;
const categories = () => screen.getByRole("navigation", { name: "Travel categories" });
const categoryLink = (label: string) => within(categories()).getByText(label).closest("a")!;

beforeEach(() => {
  vi.clearAllMocks();
});

// ── THE BAND IS THE PRODUCT ──

describe("DesktopHome — product band", () => {
  it("has exactly one H1 carrying the product positioning", () => {
    renderDesktopHome();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s).toHaveLength(1);
    expect(h1s[0]).toHaveTextContent("Plan the whole trip, not just the flight.");
  });

  it("puts the real flight search inside the band, not in a separate section below", () => {
    renderDesktopHome();
    expect(band().contains(screen.getByTestId("modern-flight-search"))).toBe(true);
  });

  it("renders the search on the dark surface treatment", () => {
    renderDesktopHome();
    expect(screen.getByTestId("modern-flight-search").getAttribute("data-ondark")).toBe("true");
  });

  it("orders positioning, categories and search top to bottom", () => {
    renderDesktopHome();
    const order = (el: Element) => Array.from(band().querySelectorAll("*")).indexOf(el);
    expect(order(screen.getByRole("heading", { level: 1 }))).toBeLessThan(order(categories()));
    expect(order(categories())).toBeLessThan(order(screen.getByTestId("modern-flight-search")));
  });

  it("keeps supporting copy honest about estimating cost", () => {
    renderDesktopHome();
    expect(band().textContent).toContain("then estimate what the trip may cost");
    expect(band().textContent).not.toMatch(/cheapest|guaranteed|best price|exact (trip )?cost/i);
  });
});

// ── CATEGORY ENTRY POINTS ──

describe("DesktopHome — travel categories", () => {
  it("offers Flights, Stays and Things to do", () => {
    renderDesktopHome();
    const labels = within(categories())
      .getAllByRole("link")
      .map(a => a.textContent?.trim());
    expect(labels).toEqual(["Flights", "Stays", "Things to do"]);
  });

  it("routes Stays to the real stays experience", () => {
    renderDesktopHome();
    expect(categoryLink("Stays").getAttribute("href")).toBe("/hotels");
  });

  it("routes Things to do to the real things experience", () => {
    renderDesktopHome();
    expect(categoryLink("Things to do").getAttribute("href")).toBe("/things-to-do");
  });

  it("marks Flights as the current category, with flight search active", () => {
    renderDesktopHome();
    expect(categoryLink("Flights").getAttribute("aria-current")).toBe("page");
    expect(categoryLink("Stays").getAttribute("aria-current")).toBeNull();
    expect(screen.getByTestId("modern-flight-search")).toBeTruthy();
  });

  it("uses real links, not click-handler divs", () => {
    renderDesktopHome();
    for (const link of within(categories()).getAllByRole("link")) {
      expect(link.tagName).toBe("A");
      expect(link.getAttribute("href")).toBeTruthy();
    }
    expect(categories().querySelectorAll('[role="button"]').length).toBe(0);
  });

  it("offers no category we do not have a product for", () => {
    renderDesktopHome();
    expect(categories().textContent).not.toMatch(/cars?|packages?|flight ?\+ ?hotel/i);
  });
});

// ── WHAT THE OLD HERO LEFT BEHIND ──

describe("DesktopHome — marketing hero removed", () => {
  it("renders no hero imagery on the homepage", () => {
    renderDesktopHome();
    // Only the mocked BrandLogo in the header remains.
    expect(band().querySelectorAll("img").length).toBe(0);
    expect(screen.getAllByRole("img")).toHaveLength(1);
  });

  it("drops the old hero headline and eyebrow", () => {
    renderDesktopHome();
    expect(screen.queryByText("Find, compare and plan your whole trip.")).toBeNull();
    expect(screen.queryByText("Plan smarter. Travel better.")).toBeNull();
  });

  it("drops the hero CTAs that only scrolled to the search", () => {
    renderDesktopHome();
    expect(screen.queryByText("Explore tools")).toBeNull();
    const anchorCtas = Array.from(band().querySelectorAll('a[href="#flight-search"]'));
    expect(anchorCtas).toHaveLength(0);
  });

  /*
   * D4 removed the lower CTA that linked back up to #flight-search, so the page
   * now has no in-page anchor to it at all. The ID must survive regardless: it
   * is the target of /#flight-search deep links from outside the SPA.
   */
  it("keeps the flight-search anchor target even with no link pointing at it", () => {
    renderDesktopHome();
    expect(band()).toBeTruthy();
    expect(band().id).toBe("flight-search");
  });
});

// ── PRESERVED CONTRACTS ──

describe("DesktopHome — preserved contracts", () => {
  it("keeps the canonical URL and WebSite structured data", async () => {
    renderDesktopHome();

    await waitFor(() => {
      const canonical = document.head.querySelector('link[rel="canonical"]');
      expect(canonical?.getAttribute("href")).toBe("https://bookingsfinder.com");
    });

    const ld = Array.from(document.head.querySelectorAll('script[type="application/ld+json"]'))
      .map(s => s.textContent ?? "")
      .join(" ");
    expect(ld).toContain('"@type":"WebSite"');
    expect(ld).toContain("SearchAction");
  });

  /* D4 rebuilt the lower page; D1's contract is only that it still exists below. */
  it("keeps a lower page below the band", () => {
    renderDesktopHome();
    expect(screen.getByText("Plan the rest of your trip")).toBeTruthy();
    expect(screen.getByText("How BookingsFinder works")).toBeTruthy();
    expect(screen.getByText("Trust and transparency")).toBeTruthy();
  });

  it("adds no returning-user, AI or trip-workspace surface in this phase", () => {
    renderDesktopHome();
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/pick up where you left off/i);
    expect(text).not.toMatch(/plan with ai|ask bookingsfinder/i);
    expect(text).not.toMatch(/continue planning/i);
  });

  it("keeps the skip link and main landmark", () => {
    renderDesktopHome();
    expect(screen.getAllByText(/skip to main content/i).length).toBeGreaterThanOrEqual(1);
    expect(document.querySelector("main#main-content")).toBeTruthy();
  });

  it("gives every band link a visible focus treatment", () => {
    renderDesktopHome();
    for (const link of Array.from(band().querySelectorAll("a"))) {
      expect(link.className).toContain("focus-visible:outline");
    }
  });
});
