/**
 * Phase 7H-1E — BottomNav: live routes only, active state, accessibility.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import BottomNav from "@/components/layout/BottomNav";

function renderBottomNav(route = "/") {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <BottomNav />
    </MemoryRouter>
  );
}

describe("BottomNav routes — live destinations only", () => {
  it("has exactly five navigation items", () => {
    renderBottomNav();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(5);
  });

  it("Home link exists", () => {
    renderBottomNav();
    expect(screen.getByLabelText("Home")).toBeTruthy();
  });

  it("Flights link exists", () => {
    renderBottomNav();
    expect(screen.getByLabelText("Flights")).toBeTruthy();
  });

  it("Stays link exists", () => {
    renderBottomNav();
    expect(screen.getByLabelText("Stays")).toBeTruthy();
  });

  it("Trip Cost link exists", () => {
    renderBottomNav();
    expect(screen.getByLabelText("Trip Cost")).toBeTruthy();
  });

  it("Account link exists", () => {
    renderBottomNav();
    expect(screen.getByLabelText("Account")).toBeTruthy();
  });

  it("no placeholder routes — /discover", () => {
    renderBottomNav();
    expect(screen.queryByText("Discover")).toBeNull();
  });

  it("no placeholder routes — /trips", () => {
    renderBottomNav();
    expect(screen.queryByText("Trips")).toBeNull();
  });

  it("no placeholder routes — /tools", () => {
    renderBottomNav();
    expect(screen.queryByText("Tools")).toBeNull();
  });

  it("no placeholder routes — /plan", () => {
    renderBottomNav();
    expect(screen.queryByText("Plan")).toBeNull();
  });

  it("no 'Optimizer' in bottom nav (available via header/menu only)", () => {
    renderBottomNav();
    expect(screen.queryByText("Optimizer")).toBeNull();
  });

  it("all labels fit within 5 tabs at 390px (no overflow)", () => {
    renderBottomNav();
    const buttons = screen.getAllByRole("button");
    expect(buttons.length).toBe(5);
    // Each button uses whitespace-nowrap and min-w-0 — verify no clipping
    for (const btn of buttons) {
      const span = btn.querySelector("span");
      expect(span).toBeTruthy();
      expect(span!.classList.contains("whitespace-nowrap")).toBe(true);
    }
  });
});

describe("BottomNav active state", () => {
  it("Home is active when pathname is /", () => {
    renderBottomNav("/");
    const homeBtn = screen.getByLabelText("Home");
    expect(homeBtn.getAttribute("aria-current")).toBe("page");
  });

  it("Flights is active when pathname starts with /flights", () => {
    renderBottomNav("/flights");
    const btn = screen.getByLabelText("Flights");
    expect(btn.getAttribute("aria-current")).toBe("page");
  });

  it("Flights is active on sub-route /flights/SYD-MEL", () => {
    renderBottomNav("/flights/SYD-MEL");
    const btn = screen.getByLabelText("Flights");
    expect(btn.getAttribute("aria-current")).toBe("page");
  });

  it("Stays is active when pathname starts with /hotels", () => {
    renderBottomNav("/hotels");
    const btn = screen.getByLabelText("Stays");
    expect(btn.getAttribute("aria-current")).toBe("page");
  });

  it("Trip Cost is active when on /trip-cost", () => {
    renderBottomNav("/trip-cost");
    const btn = screen.getByLabelText("Trip Cost");
    expect(btn.getAttribute("aria-current")).toBe("page");
  });

  it("Trip Cost is active when on /optimizer (grouped)", () => {
    renderBottomNav("/optimizer");
    const btn = screen.getByLabelText("Trip Cost");
    expect(btn.getAttribute("aria-current")).toBe("page");
  });

  it("Account is active when pathname starts with /account", () => {
    renderBottomNav("/account");
    const btn = screen.getByLabelText("Account");
    expect(btn.getAttribute("aria-current")).toBe("page");
  });

  it("only one item has aria-current=page at a time", () => {
    renderBottomNav("/flights");
    const active = screen.getAllByRole("button").filter(b => b.getAttribute("aria-current") === "page");
    expect(active.length).toBe(1);
    expect(active[0].getAttribute("aria-label")).toBe("Flights");
  });
});

describe("BottomNav accessibility", () => {
  it("has aria-label on the nav landmark", () => {
    renderBottomNav();
    const nav = document.querySelector("nav");
    expect(nav).toBeTruthy();
    expect(nav!.getAttribute("aria-label")).toBe("Mobile bottom navigation");
  });

  it("every button has an aria-label", () => {
    renderBottomNav();
    const buttons = screen.getAllByRole("button");
    for (const btn of buttons) {
      expect(btn.getAttribute("aria-label")).toBeTruthy();
    }
  });

  it("icons are hidden from screen readers", () => {
    renderBottomNav();
    // SVG Lucide icons in the buttons should have aria-hidden
    const icons = document.querySelectorAll("nav svg");
    expect(icons.length).toBeGreaterThanOrEqual(5);
    for (const icon of icons) {
      expect(icon.getAttribute("aria-hidden")).toBe("true");
    }
  });

  it("clicking a tab navigates without error", () => {
    renderBottomNav();
    const btn = screen.getByLabelText("Flights");
    expect(() => fireEvent.click(btn)).not.toThrow();
  });
});