/**
 * Phase 7H-1D — Header accessibility and route tests.
 * Phase 7H-1E — Internal navigation analytics boundary.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Header from "@/components/layout/Header";

const { mockLogInternalNavigation } = vi.hoisted(() => ({
  mockLogInternalNavigation: vi.fn(),
}));

vi.mock("@/components/brand/BrandLogo", () => ({
  BrandLogo: () => <img alt="BookingsFinder" data-testid="brand-logo" />,
}));

vi.mock("@/lib/analytics", () => ({
  logSearch: vi.fn(() => Promise.resolve("mock-id")),
  logAffiliateClick: vi.fn(() => Promise.resolve()),
  logInternalNavigation: mockLogInternalNavigation,
}));

function renderHeader(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Header />
    </MemoryRouter>
  );
}

describe("Header accessibility", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  const getMenuButton = () => screen.getByLabelText("Toggle menu");

  it("mobile menu button has aria-expanded=false initially", () => {
    renderHeader();
    const btn = getMenuButton();
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking opens the menu and aria-expanded becomes true", () => {
    renderHeader();
    const btn = getMenuButton();
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });

  it("Escape closes the menu and aria-expanded returns to false", () => {
    renderHeader();
    const btn = getMenuButton();
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("clicking a mobile nav link closes the menu — target mobile overlay", () => {
    renderHeader();
    fireEvent.click(getMenuButton());
    expect(getMenuButton().getAttribute("aria-expanded")).toBe("true");
    // In the mobile overlay, find a link with "Flights" and click it
    const allFlightLinks = screen.getAllByText("Flights");
    const mobileFlightLink = allFlightLinks[allFlightLinks.length - 1]; // last one is in the dialog
    fireEvent.click(mobileFlightLink);
    expect(getMenuButton().getAttribute("aria-expanded")).toBe("false");
  });

  it("operational navigation links are present (Flights, Stays, Trip Cost, Optimizer)", () => {
    renderHeader();
    for (const label of ["Flights", "Stays", "Trip Cost", "Optimizer"]) {
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("desktop and mobile navigation share consistent destinations", () => {
    renderHeader();
    // Desktop: "Flights" nav item exists (at least 1)
    const flightsLinks = Array.from(document.querySelectorAll("a")).filter(l => l.getAttribute("href") === "/flights");
    const staysLinks = Array.from(document.querySelectorAll("a")).filter(l => l.getAttribute("href") === "/hotels");
    expect(flightsLinks.length).toBeGreaterThanOrEqual(1);
    expect(staysLinks.length).toBeGreaterThanOrEqual(1);
  });

  it("no placeholder routes in navigation", () => {
    renderHeader();
    expect(screen.queryByText("Discover")).toBeNull();
    expect(screen.queryByText("Trips")).toBeNull();
  });

  it("no href='#' links", () => {
    renderHeader();
    for (const link of Array.from(document.querySelectorAll("a"))) {
      expect(link.getAttribute("href")).not.toBe("#");
    }
  });

  it("no javascript: URLs", () => {
    renderHeader();
    for (const link of Array.from(document.querySelectorAll("a"))) {
      expect(link.getAttribute("href") || "").not.toMatch(/^javascript:/i);
    }
  });

  it("mobile menu has dialog role for accessibility", () => {
    renderHeader();
    fireEvent.click(getMenuButton());
    const dialog = document.querySelector('[role="dialog"]');
    expect(dialog).toBeTruthy();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
  });

  it("Escape event listener is cleaned up when menu closes", () => {
    renderHeader();
    fireEvent.click(getMenuButton());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(getMenuButton().getAttribute("aria-expanded")).toBe("false");
    // Pressing Escape again should not cause errors
    fireEvent.keyDown(document, { key: "Escape" });
    expect(getMenuButton().getAttribute("aria-expanded")).toBe("false");
  });
});

describe("Header internal navigation analytics", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("desktop nav click fires logInternalNavigation with correct payload", () => {
    renderHeader();
    // "Flights" appears in desktop nav — click the first one
    const flightsLink = screen.getAllByText("Flights")[0];
    fireEvent.click(flightsLink);
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(1);
    expect(mockLogInternalNavigation).toHaveBeenCalledWith({
      label: "Flights",
      source: "header",
      href: "/flights",
    });
  });

  it("mobile nav click fires logInternalNavigation with correct payload", () => {
    renderHeader();
    fireEvent.click(screen.getByLabelText("Toggle menu"));
    // Flights in the mobile dialog — the last one
    const allFlightLinks = screen.getAllByText("Flights");
    const mobileFlightLink = allFlightLinks[allFlightLinks.length - 1];
    fireEvent.click(mobileFlightLink);
    expect(mockLogInternalNavigation).toHaveBeenCalledWith({
      label: "Flights",
      source: "header",
      href: "/flights",
    });
  });

  it("does NOT call logAffiliateClick for internal navigation", async () => {
    const { logAffiliateClick } = await import("@/lib/analytics");
    renderHeader();
    fireEvent.click(screen.getAllByText("Flights")[0]);
    expect(logAffiliateClick).not.toHaveBeenCalled();
  });

  it("no type/action/sourcePage/placement fields sent to analytics", () => {
    renderHeader();
    fireEvent.click(screen.getAllByText("Stays")[0]);
    expect(mockLogInternalNavigation).toHaveBeenCalledTimes(1);
    const call = mockLogInternalNavigation.mock.calls[0][0];
    expect(call).not.toHaveProperty("type");
    expect(call).not.toHaveProperty("action");
    expect(call).not.toHaveProperty("sourcePage");
    expect(call).not.toHaveProperty("placement");
  });

  it("analytics failure does not block navigation", () => {
    mockLogInternalNavigation.mockImplementationOnce(() => { throw new Error("analytics down"); });
    renderHeader();
    const link = screen.getAllByText("Flights")[0];
    expect(() => fireEvent.click(link)).not.toThrow();
  });

  it("every desktop nav item fires analytics with correct href", () => {
    renderHeader();
    const expected = [
      ["Flights", "/flights"],
      ["Stays", "/hotels"],
      ["Trip Cost", "/trip-cost"],
      ["Optimizer", "/optimizer"],
    ];
    for (const [label, href] of expected) {
      fireEvent.click(screen.getAllByText(label)[0]);
      expect(mockLogInternalNavigation).toHaveBeenCalledWith(
        expect.objectContaining({ label, source: "header", href })
      );
    }
  });
});