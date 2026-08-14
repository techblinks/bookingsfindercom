/**
 * Homepage tests: structure, routes, claims, analytics, new sections.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Index from "@/pages/Index";

const { mockLogInternalNavigation } = vi.hoisted(() => ({
  mockLogInternalNavigation: vi.fn(),
}));

vi.mock("@/lib/analytics", () => ({
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logInternalNavigation: mockLogInternalNavigation,
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

function renderIndex() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={["/"]}>
          <Index />
        </MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

describe("Homepage structure", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders exactly one H1", () => {
    renderIndex();
    const h1s = screen.getAllByRole("heading", { level: 1 });
    expect(h1s.length).toBe(1);
    expect(h1s[0]).toHaveTextContent("Plan the whole trip, not just the flight.");
  });

  it("renders BrandLogo", () => {
    renderIndex();
    expect(screen.getByAltText("BookingsFinder")).toBeTruthy();
  });

  it("renders ModernFlightSearch", () => {
    renderIndex();
    expect(screen.getByTestId("modern-flight-search")).toBeTruthy();
  });

  it("has a skip link", () => {
    renderIndex();
    const skip = screen.getByText(/skip to main content/i);
    expect(skip).toBeTruthy();
    expect(skip.tagName).toBe("A");
  });

  it("has a main landmark", () => {
    renderIndex();
    expect(document.querySelector("main")).toBeTruthy();
  });

  it("has section headings", () => {
    renderIndex();
    // The old "Search available flights" H2 introduced a search section that
    // sat below the fold. The search is now the first viewport, headed by the H1.
    // D4 replaced the "Everything you need to plan your trip" card grid.
    expect(screen.getByText("Plan the rest of your trip")).toBeTruthy();
    expect(screen.getByText("How BookingsFinder works")).toBeTruthy();
  });

  it("has exactly one canonical link at the correct URL", async () => {
    renderIndex();
    await waitFor(() => {
      const links = document.querySelectorAll('link[rel="canonical"]');
      expect(links.length).toBe(1);
      expect(links[0].getAttribute("href")).toBe("https://bookingsfinder.com");
    }, { timeout: 2000 });
  });
});

describe("Route integrity", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("Flights link exists", () => {
    renderIndex();
    const links = Array.from(document.querySelectorAll("a"));
    expect(links.some(l => l.getAttribute("href") === "/flights")).toBe(true);
  });

  it("Stays link exists", () => {
    renderIndex();
    expect(Array.from(document.querySelectorAll("a")).some(l => l.getAttribute("href") === "/hotels")).toBe(true);
  });

  it("Trip Cost link exists", () => {
    renderIndex();
    expect(Array.from(document.querySelectorAll("a")).some(l => l.getAttribute("href") === "/trip-cost")).toBe(true);
  });

  it("Optimizer link exists", () => {
    renderIndex();
    expect(Array.from(document.querySelectorAll("a")).some(l => l.getAttribute("href") === "/optimizer")).toBe(true);
  });

  it("no href='#' links anywhere", () => {
    renderIndex();
    for (const link of Array.from(document.querySelectorAll("a"))) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("no javascript: URLs", () => {
    renderIndex();
    for (const link of Array.from(document.querySelectorAll("a"))) {
      expect(link.getAttribute("href") || "").not.toMatch(/^javascript:/i);
    }
  });
});

describe("Claims and trust", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("no fake Trustpilot claim", () => {
    renderIndex();
    expect(document.body.textContent).not.toMatch(/trustpilot/i);
  });

  it("no guaranteed-lowest-price claim", () => {
    renderIndex();
    expect(document.body.textContent).not.toMatch(/lowest price|best price guaranteed|price match/i);
  });

  it("approved trust strip claims present", () => {
    renderIndex();
    expect(screen.getByText("Compare travel options")).toBeTruthy();
    expect(screen.getByText(/No booking fee from BookingsFinder/)).toBeTruthy();
  });
});

describe("No duplicated logic", () => {
  it("ModernFlightSearch is the only search component", () => {
    renderIndex();
    expect(screen.getByTestId("modern-flight-search")).toBeTruthy();
  });
});

describe("Analytics — internal navigation boundary", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  /*
   * The hero's "Search flights" and "Explore tools" CTAs are gone: the search
   * itself is now in the first viewport, so a button whose only job was to
   * scroll down to it no longer has one. Category navigation replaces them.
   */
  it("category links fire logInternalNavigation with correct payloads", () => {
    renderIndex();
    const nav = screen.getByRole("navigation", { name: "Travel categories" });

    within(nav).getByText("Stays").closest("a")!.click();
    expect(mockLogInternalNavigation).toHaveBeenLastCalledWith({
      label: "category_stays",
      source: "homepage",
      href: "/hotels",
    });

    within(nav).getByText("Things to do").closest("a")!.click();
    expect(mockLogInternalNavigation).toHaveBeenLastCalledWith({
      label: "category_things",
      source: "homepage",
      href: "/things-to-do",
    });
  });

  it("planning tool click fires logInternalNavigation with correct payload", () => {
    renderIndex();
    const card = screen.getByText("Estimate your trip cost").closest("a")!;
    card.click();
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(1);
    expect(mockLogInternalNavigation).toHaveBeenCalledWith({
      label: "plan_trip_cost",
      source: "homepage",
      href: "/trip-cost",
    });
  });

  it("every lower planning destination fires analytics with the right href", () => {
    renderIndex();
    const expected: [string, string, string][] = [
      ["Estimate your trip cost", "plan_trip_cost", "/trip-cost"],
      ["Check a route before you book", "plan_optimizer", "/optimizer"],
      ["Compare fares", "plan_flights", "/flights"],
      ["Browse hotel options", "plan_stays", "/hotels"],
      ["Find tours and tickets", "plan_things", "/things-to-do"],
    ];
    for (const [text, label, href] of expected) {
      screen.getByText(text).closest("a")!.click();
      expect(mockLogInternalNavigation).toHaveBeenCalledWith({ label, source: "homepage", href });
    }
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(expected.length);
  });

  it("does NOT call logAffiliateClick for homepage CTAs", async () => {
    const { logAffiliateClick } = await import("@/lib/analytics");
    renderIndex();
    const nav = screen.getByRole("navigation", { name: "Travel categories" });
    within(nav).getByText("Stays").closest("a")!.click();
    screen.getByText("Estimate your trip cost").closest("a")!.click();
    expect(logAffiliateClick).not.toHaveBeenCalled();
  });

  it("no type/action/sourcePage/placement fields sent to analytics", () => {
    renderIndex();
    const nav = screen.getByRole("navigation", { name: "Travel categories" });
    within(nav).getByText("Stays").closest("a")!.click();
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(1);
    const call = mockLogInternalNavigation.mock.calls[0][0];
    expect(call).not.toHaveProperty("type");
    expect(call).not.toHaveProperty("action");
    expect(call).not.toHaveProperty("sourcePage");
    expect(call).not.toHaveProperty("placement");
  });

  it("analytics rejection does not block navigation", () => {
    mockLogInternalNavigation.mockImplementationOnce(() => { throw new Error("network down"); });
    renderIndex();
    // D4 removed the lower "Search flights" CTA; any tracked link proves the boundary.
    const link = screen.getByText("Estimate your trip cost").closest("a")!;
    expect(() => link.click()).not.toThrow();
  });

  it("no unsafe Parameters<typeof ...> type assertion in source", () => {
    const fs = require("fs");
    const source = fs.readFileSync("src/pages/Index.tsx", "utf-8");
    expect(source).not.toMatch(/Parameters<typeof\s+logAffiliateClick>/);
  });
});

// ── SECTION 1: How BookingsFinder Works ──────────────────────────

describe("How BookingsFinder works section", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders the section heading", () => {
    renderIndex();
    expect(screen.getByText("How BookingsFinder works")).toBeTruthy();
  });

  /*
   * D4 dropped the section's supporting sentence: it restated the three steps
   * immediately below it, and the heading plus the steps already carry it.
   */
  it("renders no restating supporting sentence", () => {
    renderIndex();
    expect(screen.queryByText("Search, plan and continue to trusted travel providers from one place.")).toBeNull();
  });

  it("renders all three steps", () => {
    renderIndex();
    expect(screen.getByText(/Search and compare/)).toBeTruthy();
    expect(screen.getByText(/Plan the full trip/)).toBeTruthy();
    expect(screen.getByText(/Continue with the provider/)).toBeTruthy();
  });

  it("numbers the steps 1, 2, 3", () => {
    renderIndex();
    const steps = document.querySelectorAll("ol > li");
    expect(steps.length).toBe(3);
    for (const n of ["1.", "2.", "3."]) {
      expect(screen.getByText(n)).toBeTruthy();
    }
  });

  it("renders step descriptions", () => {
    renderIndex();
    expect(screen.getByText("Search flights, stays and things to do from one place.")).toBeTruthy();
    expect(screen.getByText("Estimate what the trip may cost and organise the details.")).toBeTruthy();
    expect(screen.getByText("Check current prices and booking terms on the provider's site.")).toBeTruthy();
  });

  it("heading is an H2", () => {
    renderIndex();
    const heading = screen.getByText("How BookingsFinder works");
    expect(heading.tagName).toBe("H2");
  });

  it("every rendered img src physically exists on disk", () => {
    // Use Node fs to verify every local image reference resolves to an existing file
    const { existsSync } = require("fs");
    const path = require("path");
    const publicDir = path.resolve(process.cwd(), "public");

    renderIndex();
    const imgs = Array.from(document.querySelectorAll("img"));
    const checked = [];

    for (const img of imgs) {
      const src = img.getAttribute("src") || "";
      // Skip external, data URIs, and brand logos
      if (!src.startsWith("/") || src.includes("logo") || src.includes("brand")) continue;

      const filePath = path.resolve(publicDir, src.slice(1));
      expect(existsSync(filePath)).toBe(true);
      checked.push(src);

      // Check srcSet candidates
      const srcSet = img.getAttribute("srcset") || "";
      if (!srcSet) continue;
      // Parse "url descriptor, url descriptor" format
      const candidates = srcSet.split(",").map(s => s.trim().split(/\s+/)[0]).filter(Boolean);
      for (const candidate of candidates) {
        if (!candidate.startsWith("/")) continue;
        const candPath = path.resolve(publicDir, candidate.slice(1));
        expect(existsSync(candPath)).toBe(true);
      }
    }

    // The homepage now ships no decorative imagery — the hero collage was
    // removed so the first viewport carries the product instead. Any image that
    // does appear must still resolve; there is no longer a minimum.
    expect(checked.every(src => src.startsWith("/"))).toBe(true);
  });

  it("no remote image URLs are rendered", () => {
    renderIndex();
    const imgs = Array.from(document.querySelectorAll("img"));
    for (const img of imgs) {
      const src = img.getAttribute("src") || "";
      expect(src).not.toMatch(/^https?:\/\//);
    }
  });

  it("no removed /images/home paths remain in rendered DOM", () => {
    renderIndex();
    const imgs = Array.from(document.querySelectorAll("img"));
    for (const img of imgs) {
      const src = img.getAttribute("src") || "";
      expect(src).not.toContain("/images/home/");
    }
  });
});

// ── SECTION 2: Trust and Transparency ────────────────────────────

describe("Trust and transparency section", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders the trust section heading", () => {
    renderIndex();
    expect(screen.getByText("Trust and transparency")).toBeTruthy();
  });

  it("explains BookingsFinder does not directly sell inventory", () => {
    renderIndex();
    expect(screen.getByText(/BookingsFinder does not directly sell flights or accommodation/)).toBeTruthy();
  });

  it("explains prices and availability confirmed by providers", () => {
    renderIndex();
    expect(screen.getByText(/Current prices and availability are confirmed by providers/)).toBeTruthy();
  });

  it("explains affiliate link transparency", () => {
    renderIndex();
    expect(screen.getByText(/Some outbound links may be affiliate links/)).toBeTruthy();
    expect(screen.getByText(/BookingsFinder may earn a commission at no additional cost to you/)).toBeTruthy();
  });

  it("explains provider handles booking conditions", () => {
    renderIndex();
    expect(screen.getByText(/Booking conditions, cancellations and payments are handled by the provider/)).toBeTruthy();
  });

  it("links to Affiliate Disclosure page", () => {
    renderIndex();
    const links = screen.getAllByText("Affiliate disclosure");
    expect(links.length).toBeGreaterThanOrEqual(1);
    const disclosureLink = links.find(l => l.closest("a")?.getAttribute("href") === "/affiliate-disclosure");
    expect(disclosureLink).toBeTruthy();
  });

  it("links to Privacy policy page", () => {
    renderIndex();
    const links = screen.getAllByText("Privacy policy");
    expect(links.length).toBeGreaterThanOrEqual(1);
    const privacyLink = links.find(l => l.closest("a")?.getAttribute("href") === "/privacy");
    expect(privacyLink).toBeTruthy();
  });

  it("links to Terms of service page", () => {
    renderIndex();
    const links = screen.getAllByText("Terms of service");
    expect(links.length).toBeGreaterThanOrEqual(1);
    const termsLink = links.find(l => l.closest("a")?.getAttribute("href") === "/terms");
    expect(termsLink).toBeTruthy();
  });

  it("trust heading is an H2", () => {
    renderIndex();
    const heading = screen.getByText("Trust and transparency");
    expect(heading.tagName).toBe("H2");
  });
});

// ── SECTION 3: Final CTA — removed in D4 ────────────────────────

describe("Final CTA section is gone", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders no closing CTA band", () => {
    renderIndex();
    expect(screen.queryByText("Ready to start planning?")).toBeNull();
    expect(screen.queryByText("Search available flights or estimate the full cost of your next trip.")).toBeNull();
  });

  /*
   * The whole point of D1 was putting an operable search in the first viewport.
   * A second "Search flights" button at the bottom of the page could only send
   * the visitor back to it, so it was duplication, not conversion.
   */
  it("offers no second Search flights CTA below the band", () => {
    renderIndex();
    expect(screen.queryByText("Search flights")).toBeNull();
    expect(document.querySelectorAll('a[href="#flight-search"]')).toHaveLength(0);
  });

  it("keeps the trip cost planner reachable, now leading the planning section", () => {
    renderIndex();
    const link = screen.getByText("Estimate your trip cost").closest("a")!;
    expect(link.getAttribute("href")).toBe("/trip-cost");
  });
});

// ── Section ordering ─────────────────────────────────────────────

describe("Homepage section order", () => {
  it("How BookingsFinder works appears after the planning section", () => {
    renderIndex();
    const allText = document.body.textContent || "";
    const planIdx = allText.indexOf("Plan the rest of your trip");
    const howIdx = allText.indexOf("How BookingsFinder works");
    expect(planIdx).toBeGreaterThan(0);
    expect(howIdx).toBeGreaterThan(planIdx);
  });

  it("Trust and transparency appears after How BookingsFinder works", () => {
    renderIndex();
    const allText = document.body.textContent || "";
    const howIdx = allText.indexOf("How BookingsFinder works");
    const trustIdx = allText.indexOf("Trust and transparency");
    expect(trustIdx).toBeGreaterThan(howIdx);
  });

  it("trust is the last section before the footer", () => {
    renderIndex();
    const main = document.querySelector("main")!;
    const headings = Array.from(main.querySelectorAll("h2")).map(h => h.textContent?.trim());
    expect(headings[headings.length - 1]).toBe("Trust and transparency");
  });
});

// ── No prohibited claims ─────────────────────────────────────────

describe("Prohibited claims absent", () => {
  it("no savings or discount claims", () => {
    renderIndex();
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/save up to|save \d+%|guaranteed savings|best price|lowest price/i);
  });

  it("no inventory fabrication claims", () => {
    renderIndex();
    const text = document.body.textContent || "";
    expect(text).not.toMatch(/we have \d+ hotels|over \d+ flights|compare \d+ hotels/i);
  });

  it("no live hotel comparison claim while hotel provider is inactive", () => {
    renderIndex();
    const text = document.body.textContent || "";
    // Should not claim live comparison of hotel prices
    expect(text).not.toMatch(/compare hotel prices|live hotel.*compar/i);
  });
});

// ── #flight-search anchor only ────────────────────────────────────

// ── Desktop must not adopt mobile-only structure ──────────────────

describe("Desktop homepage does not use mobile-only V2 structure", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("shares the product positioning with mobile but not the mobile layout", () => {
    renderIndex();
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent("Plan the whole trip, not just the flight.");
  });

  it("does not render the mobile hero, search or quick-actions sections", () => {
    renderIndex();
    for (const id of ["mobile-hero-heading", "mobile-search-heading", "mobile-actions-heading"]) {
      expect(document.getElementById(id)).toBeNull();
    }
  });

  it("does not render the mobile compact trust line", () => {
    renderIndex();
    expect(screen.queryByText("Independent comparison")).toBeNull();
    expect(screen.queryByText("We don't sell travel")).toBeNull();
  });

  it("keeps the full desktop five-item trust block", async () => {
    const { TRUST_ITEMS } = await import("@/components/shared/TrustContent");
    renderIndex();
    for (const item of TRUST_ITEMS) {
      expect(screen.getByText(item.text)).toBeTruthy();
    }
  });

  it("keeps the desktop mobile-search helper copy off the page", () => {
    renderIndex();
    expect(screen.queryByText("Pick a destination to start planning your trip.")).toBeNull();
  });
});

describe("#flight-search anchor exclusivity", () => {
  it("only #flight-search and #main-content are used as in-page anchors", () => {
    renderIndex();
    const anchors = Array.from(document.querySelectorAll("a[href^='#']"));
    const hrefs = anchors.map(a => a.getAttribute("href"));
    const allowed = new Set(["#flight-search", "#main-content"]);
    for (const href of hrefs) {
      if (href && href.startsWith("#")) {
        expect(allowed.has(href)).toBe(true);
      }
    }
  });

  /*
   * D4 removed the only link pointing at it, but the target must survive:
   * /#flight-search is a real entry URL from outside the SPA.
   */
  it("keeps the #flight-search target on the page", () => {
    renderIndex();
    expect(document.getElementById("flight-search")).toBeTruthy();
  });
});
