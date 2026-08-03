/**
 * Phase 7H-1D — Homepage tests: structure, routes, claims, analytics.
 * Phase 7H-1E — Internal navigation analytics boundary.
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
    const btn = screen.getByText("Search flights");
    btn.click();
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
    screen.getByText("Search flights").click();
    screen.getByText("Explore tools").click();
    expect(logAffiliateClick).not.toHaveBeenCalled();
  });

  it("no type/action/sourcePage/placement fields sent to analytics", () => {
    renderIndex();
    screen.getByText("Search flights").click();
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
    const btn = screen.getByText("Search flights");
    expect(() => btn.click()).not.toThrow();
  });

  it("no unsafe Parameters<typeof ...> type assertion in source", () => {
    // Verify the source file no longer contains the dangerous cast
    const fs = require("fs");
    const source = fs.readFileSync("src/pages/Index.tsx", "utf-8");
    expect(source).not.toMatch(/Parameters<typeof\s+logAffiliateClick>/);
  });
});