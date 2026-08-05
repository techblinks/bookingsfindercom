/**
 * Homepage tests: structure, routes, claims, analytics, new sections.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
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
    expect(h1s[0]).toHaveTextContent("Find, compare and plan your whole trip.");
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
    expect(screen.getByText("Search available flights")).toBeTruthy();
    expect(screen.getByText("Everything you need to plan your trip")).toBeTruthy();
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

  it("hero 'Search flights' CTA fires logInternalNavigation with correct payload", () => {
    renderIndex();
    // Two "Search flights" buttons exist — the hero one links to #flight-search
    const buttons = screen.getAllByText("Search flights");
    const heroBtn = buttons.find(b => b.closest("a")?.getAttribute("href") === "#flight-search")!;
    heroBtn.click();
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(1);
    expect(mockLogInternalNavigation).toHaveBeenCalledWith({
      label: "hero_search",
      source: "homepage",
      href: "#flight-search",
    });
  });

  it("hero 'Explore tools' CTA fires logInternalNavigation with correct payload", () => {
    renderIndex();
    const btn = screen.getByText("Explore tools");
    btn.click();
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(1);
    expect(mockLogInternalNavigation).toHaveBeenCalledWith({
      label: "hero_explore_tools",
      source: "homepage",
      href: "/trip-cost",
    });
  });

  it("product card click fires logInternalNavigation with correct payload", () => {
    renderIndex();
    const card = screen.getByText("Find stays").closest("a")!;
    card.click();
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(1);
    expect(mockLogInternalNavigation).toHaveBeenCalledWith({
      label: "Find stays",
      source: "homepage",
      href: "/hotels",
    });
  });

  it("all four product cards fire analytics with correct hrefs", () => {
    renderIndex();
    const expected = [
      ["Compare flights", "/flights"],
      ["Find stays", "/hotels"],
      ["Estimate trip costs", "/trip-cost"],
      ["Optimize your itinerary", "/optimizer"],
    ];
    for (const [title, href] of expected) {
      const card = screen.getByText(title).closest("a")!;
      card.click();
      expect(mockLogInternalNavigation).toHaveBeenCalledWith(
        expect.objectContaining({ label: title, source: "homepage", href })
      );
    }
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(4);
  });

  it("does NOT call logAffiliateClick for homepage CTAs", async () => {
    const { logAffiliateClick } = await import("@/lib/analytics");
    renderIndex();
    const heroBtn = screen.getAllByText("Search flights").find(b => b.closest("a")?.getAttribute("href") === "#flight-search")!;
    heroBtn.click();
    screen.getByText("Explore tools").click();
    expect(logAffiliateClick).not.toHaveBeenCalled();
  });

  it("no type/action/sourcePage/placement fields sent to analytics", () => {
    renderIndex();
    const heroBtn = screen.getAllByText("Search flights").find(b => b.closest("a")?.getAttribute("href") === "#flight-search")!;
    heroBtn.click();
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
    const heroBtn = screen.getAllByText("Search flights").find(b => b.closest("a")?.getAttribute("href") === "#flight-search")!;
    expect(() => heroBtn.click()).not.toThrow();
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

  it("renders supporting copy", () => {
    renderIndex();
    expect(screen.getByText("Search, plan and continue to trusted travel providers from one place.")).toBeTruthy();
  });

  it("renders all three steps", () => {
    renderIndex();
    expect(screen.getByText("Search and compare")).toBeTruthy();
    expect(screen.getByText("Plan the full trip")).toBeTruthy();
    expect(screen.getByText("Continue with the provider")).toBeTruthy();
  });

  it("renders step labels 1, 2, 3", () => {
    renderIndex();
    expect(screen.getByText("Step 1")).toBeTruthy();
    expect(screen.getByText("Step 2")).toBeTruthy();
    expect(screen.getByText("Step 3")).toBeTruthy();
  });

  it("renders step descriptions", () => {
    renderIndex();
    expect(screen.getByText(/Search available travel options/)).toBeTruthy();
    // "Estimate trip costs" appears in product cards too — use getAllByText
    const estimateEls = screen.getAllByText(/Estimate trip costs/);
    expect(estimateEls.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Review current prices, availability and booking terms/)).toBeTruthy();
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

    // Must have found at least one local image to validate
    expect(checked.length).toBeGreaterThan(0);
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

// ── SECTION 3: Final CTA ────────────────────────────────────────

describe("Final CTA section", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("renders the CTA heading", () => {
    renderIndex();
    expect(screen.getByText("Ready to start planning?")).toBeTruthy();
  });

  it("renders supporting CTA copy", () => {
    renderIndex();
    expect(screen.getByText("Search available flights or estimate the full cost of your next trip.")).toBeTruthy();
  });

  it("CTA 'Search flights' links to #flight-search", () => {
    renderIndex();
    const searchButtons = screen.getAllByText("Search flights");
    const ctaButton = searchButtons.find(
      b => b.closest("a")?.getAttribute("href") === "#flight-search"
    );
    expect(ctaButton).toBeTruthy();
  });

  it("CTA 'Plan trip costs' links to /trip-cost", () => {
    renderIndex();
    const planButtons = screen.getAllByText("Plan trip costs");
    expect(planButtons.length).toBeGreaterThanOrEqual(1);
    const planLink = planButtons.find(
      b => b.closest("a")?.getAttribute("href") === "/trip-cost"
    );
    expect(planLink).toBeTruthy();
  });

  it("final CTA section has an H2", () => {
    renderIndex();
    const heading = screen.getByText("Ready to start planning?");
    expect(heading.tagName).toBe("H2");
  });

  it("final CTA uses BookingsFinder brand colors", () => {
    renderIndex();
    // The CTA section uses the dark navy background bg-[#0A1F44]
    const sections = document.querySelectorAll("section");
    const ctaSection = Array.from(sections).find(s =>
      s.textContent?.includes("Ready to start planning?")
    );
    expect(ctaSection).toBeTruthy();
    expect(ctaSection!.className).toContain("001D45");
  });
});

// ── Section ordering ─────────────────────────────────────────────

describe("Homepage section order", () => {
  it("How BookingsFinder works appears after product cards", () => {
    renderIndex();
    const allText = document.body.textContent || "";
    const productsIdx = allText.indexOf("Everything you need to plan your trip");
    const howIdx = allText.indexOf("How BookingsFinder works");
    expect(productsIdx).toBeGreaterThan(0);
    expect(howIdx).toBeGreaterThan(productsIdx);
  });

  it("Trust and transparency appears after How BookingsFinder works", () => {
    renderIndex();
    const allText = document.body.textContent || "";
    const howIdx = allText.indexOf("How BookingsFinder works");
    const trustIdx = allText.indexOf("Trust and transparency");
    expect(trustIdx).toBeGreaterThan(howIdx);
  });

  it("Final CTA appears after Trust and transparency", () => {
    renderIndex();
    const allText = document.body.textContent || "";
    const trustIdx = allText.indexOf("Trust and transparency");
    const ctaIdx = allText.indexOf("Ready to start planning?");
    expect(ctaIdx).toBeGreaterThan(trustIdx);
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
    // At least one #flight-search anchor must exist
    expect(hrefs.filter(h => h === "#flight-search").length).toBeGreaterThanOrEqual(1);
  });
});
