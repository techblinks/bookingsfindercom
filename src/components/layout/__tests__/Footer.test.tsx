/**
 * Mobile V2 Phase 1 — Footer: collapsed mobile treatment, unchanged desktop
 * grid, and no lost routes between the two.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/layout/Footer";
import MobileFooter from "@/components/layout/MobileFooter";
import { FOOTER_DISCLOSURE, FOOTER_LINKS } from "@/components/layout/footerLinks";

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: () => <img alt="BookingsFinder" data-testid="brand-logo" />,
}));

const ALL_ROUTES = Object.values(FOOTER_LINKS).flat();

function renderFooter() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Footer />
    </MemoryRouter>
  );
}

function renderMobileFooter() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <MobileFooter />
    </MemoryRouter>
  );
}

function groupNav(): HTMLElement {
  return screen.getByRole("navigation", { name: "Footer navigation" });
}

describe("MobileFooter — collapsed groups", () => {
  it("renders exactly the four required groups", () => {
    renderMobileFooter();
    const buttons = within(groupNav()).getAllByRole("button");
    expect(buttons.map(b => b.textContent)).toEqual(["Plan", "Search & Compare", "Tools", "Company"]);
  });

  it("every group is collapsed on first render", () => {
    renderMobileFooter();
    for (const button of within(groupNav()).getAllByRole("button")) {
      expect(button.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("collapsed groups hide their links from the accessibility tree", () => {
    renderMobileFooter();
    expect(within(groupNav()).queryAllByRole("link").length).toBe(0);
  });

  it("clicking a group header expands it and exposes aria-expanded=true", () => {
    renderMobileFooter();
    const plan = within(groupNav()).getByRole("button", { name: "Plan" });
    fireEvent.click(plan);
    expect(plan.getAttribute("aria-expanded")).toBe("true");
    const links = within(groupNav()).getAllByRole("link");
    expect(links.map(l => l.getAttribute("href"))).toEqual(["/plan", "/trip-cost", "/trips"]);
  });

  it("clicking again collapses the group", () => {
    renderMobileFooter();
    const tools = within(groupNav()).getByRole("button", { name: "Tools" });
    fireEvent.click(tools);
    expect(tools.getAttribute("aria-expanded")).toBe("true");
    fireEvent.click(tools);
    expect(tools.getAttribute("aria-expanded")).toBe("false");
    expect(within(groupNav()).queryAllByRole("link").length).toBe(0);
  });

  it("each header controls the panel it owns", () => {
    renderMobileFooter();
    for (const button of within(groupNav()).getAllByRole("button")) {
      const id = button.getAttribute("aria-controls");
      expect(id).toBeTruthy();
      expect(document.getElementById(id!)).toBeTruthy();
    }
  });

  it("group headers are real buttons, so keyboard activation works", () => {
    renderMobileFooter();
    const company = within(groupNav()).getByRole("button", { name: "Company" });
    expect(company.tagName).toBe("BUTTON");
    expect(company.getAttribute("type")).toBe("button");
    // Enter/Space on a native button dispatch click
    fireEvent.click(company);
    expect(company.getAttribute("aria-expanded")).toBe("true");
  });

  it("group headers meet the 44px touch target", () => {
    renderMobileFooter();
    for (const button of within(groupNav()).getAllByRole("button")) {
      expect(button.className).toMatch(/min-h-\[48px\]/);
    }
  });

  it("group headers sit inside a heading for structure", () => {
    renderMobileFooter();
    for (const button of within(groupNav()).getAllByRole("button")) {
      expect(button.parentElement!.tagName).toBe("H3");
    }
  });

  it("respects reduced motion for the chevron", () => {
    renderMobileFooter();
    const svg = within(groupNav()).getAllByRole("button")[0].querySelector("svg")!;
    expect(svg.getAttribute("class")).toContain("motion-safe:transition-transform");
  });
});

describe("MobileFooter — always-visible legal and disclosure", () => {
  it("legal links are visible without expanding anything", () => {
    renderMobileFooter();
    for (const link of FOOTER_LINKS.legal) {
      const el = screen.getByRole("link", { name: link.label });
      expect(el.getAttribute("href")).toBe(link.href);
    }
  });

  it("legal links are NOT inside a collapsible group", () => {
    renderMobileFooter();
    const affiliate = screen.getByRole("link", { name: "Affiliate Disclosure" });
    expect(affiliate.closest('nav[aria-label="Footer navigation"]')).toBeNull();
  });

  it("legal links keep a 44px touch target", () => {
    renderMobileFooter();
    for (const link of FOOTER_LINKS.legal) {
      expect(screen.getByRole("link", { name: link.label }).className).toContain("min-h-[44px]");
    }
  });

  it("includes exactly one disclosure paragraph", () => {
    renderMobileFooter();
    expect(screen.getAllByText(FOOTER_DISCLOSURE).length).toBe(1);
  });

  it("reserves bottom-nav clearance so content is never underneath it", () => {
    const { container } = renderMobileFooter();
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.paddingBottom).toContain("safe-area-inset-bottom");
  });
});

describe("MobileFooter — no duplicate brand logo", () => {
  it("does not render BrandLogo (the header already carries it)", () => {
    renderMobileFooter();
    expect(screen.queryByTestId("brand-logo")).toBeNull();
  });

  it("has no homepage logo link above the navigation", () => {
    renderMobileFooter();
    expect(screen.queryByRole("link", { name: /Go to homepage/i })).toBeNull();
  });

  it("starts directly with the footer navigation groups", () => {
    const { container } = renderMobileFooter();
    const root = container.firstElementChild as HTMLElement;
    expect(root.firstElementChild).toBe(groupNav());
    expect(within(groupNav()).getAllByRole("button").map(b => b.textContent)).toEqual([
      "Plan",
      "Search & Compare",
      "Tools",
      "Company",
    ]);
  });

  it("keeps the legal links and disclosure after the logo removal", () => {
    renderMobileFooter();
    for (const link of FOOTER_LINKS.legal) {
      expect(screen.getByRole("link", { name: link.label }).getAttribute("href")).toBe(link.href);
    }
    expect(screen.getAllByText(FOOTER_DISCLOSURE).length).toBe(1);
  });
});

describe("Footer — desktop branding is unaffected", () => {
  it("desktop branch still renders BrandLogo", () => {
    renderFooter();
    const desktop = document.querySelector<HTMLElement>("footer > div.hidden.lg\\:block")!;
    expect(desktop.querySelector('[data-testid="brand-logo"]')).toBeTruthy();
  });

  it("desktop brand logo links to the homepage", () => {
    renderFooter();
    const desktop = document.querySelector<HTMLElement>("footer > div.hidden.lg\\:block")!;
    const logoLink = desktop.querySelector('[data-testid="brand-logo"]')!.closest("a");
    expect(logoLink!.getAttribute("href")).toBe("/");
  });

  it("desktop branch keeps its brand blurb and location line", () => {
    renderFooter();
    const desktop = document.querySelector<HTMLElement>("footer > div.hidden.lg\\:block")!;
    expect(desktop.textContent).toContain("BookingsFinder helps you travel ready.");
    expect(desktop.textContent).toContain("Based in Queensland, Australia");
  });

  it("the footer renders the brand logo exactly once", () => {
    renderFooter();
    expect(screen.getAllByTestId("brand-logo").length).toBe(1);
  });

  it("the mobile branch of Footer contains no brand logo", () => {
    renderFooter();
    const mobile = groupNav().closest("div.lg\\:hidden")!;
    expect(mobile.querySelector('[data-testid="brand-logo"]')).toBeNull();
  });
});

describe("MobileFooter — no routes lost", () => {
  it("every footer route is present in the DOM once all groups are open", () => {
    renderMobileFooter();
    for (const button of within(groupNav()).getAllByRole("button")) fireEvent.click(button);
    const hrefs = Array.from(document.querySelectorAll("a")).map(a => a.getAttribute("href"));
    for (const link of ALL_ROUTES) {
      expect(hrefs).toContain(link.href);
    }
  });
});

describe("Footer — mobile and desktop treatments", () => {
  it("renders the collapsed mobile footer behind lg:hidden", () => {
    renderFooter();
    const mobile = groupNav().closest("div.lg\\:hidden");
    expect(mobile).toBeTruthy();
  });

  it("renders the desktop grid behind hidden lg:block", () => {
    renderFooter();
    const desktop = document.querySelector("footer > div.hidden.lg\\:block");
    expect(desktop).toBeTruthy();
    expect(desktop!.querySelector(".md\\:grid-cols-6")).toBeTruthy();
  });

  it("desktop footer keeps its five column headings", () => {
    renderFooter();
    const desktop = document.querySelector<HTMLElement>("footer > div.hidden.lg\\:block")!;
    const headings = Array.from(desktop.querySelectorAll("h4")).map(h => h.textContent);
    expect(headings).toEqual(["Plan", "Tools", "Search & Compare", "Company", "Legal"]);
  });

  it("desktop footer keeps its own copyright line", () => {
    renderFooter();
    const desktop = document.querySelector<HTMLElement>("footer > div.hidden.lg\\:block")!;
    expect(desktop.textContent).toContain("All rights reserved.");
  });

  it("both treatments share one disclosure copy source", () => {
    renderFooter();
    expect(screen.getAllByText(FOOTER_DISCLOSURE).length).toBe(2);
  });

  it("every route is reachable from the rendered footer", () => {
    renderFooter();
    for (const button of within(groupNav()).getAllByRole("button")) fireEvent.click(button);
    const hrefs = Array.from(document.querySelectorAll("footer a")).map(a => a.getAttribute("href"));
    for (const link of ALL_ROUTES) {
      expect(hrefs).toContain(link.href);
    }
  });
});
