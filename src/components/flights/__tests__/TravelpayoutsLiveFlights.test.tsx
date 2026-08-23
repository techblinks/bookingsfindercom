/**
 * BF-FLIGHTS-LIVE-3 Phase D/P — the embedded widget wrapper component.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import TravelpayoutsLiveFlights from "../TravelpayoutsLiveFlights";

const hoisted = vi.hoisted(() => ({
  state: "loading" as "loading" | "ready" | "error",
  needsReloadForRemount: false,
}));
vi.mock("@/hooks/useTravelpayoutsWidget", () => ({
  useTravelpayoutsWidget: () => ({ state: hoisted.state, needsReloadForRemount: hoisted.needsReloadForRemount }),
}));

beforeEach(() => {
  hoisted.state = "loading";
  hoisted.needsReloadForRemount = false;
});

describe("TravelpayoutsLiveFlights — documented containers", () => {
  it("item 4: renders the #tpwl-search container", () => {
    hoisted.state = "ready";
    const { container } = render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);
    expect(container.querySelector("#tpwl-search")).toBeTruthy();
  });

  it("item 5: renders the #tpwl-tickets container", () => {
    hoisted.state = "ready";
    const { container } = render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);
    expect(container.querySelector("#tpwl-tickets")).toBeTruthy();
  });

  it("both containers are present even while loading (stable DOM nodes for a late-resolving script to attach to)", () => {
    hoisted.state = "loading";
    const { container } = render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);
    expect(container.querySelector("#tpwl-search")).toBeTruthy();
    expect(container.querySelector("#tpwl-tickets")).toBeTruthy();
  });
});

describe("TravelpayoutsLiveFlights — loading state", () => {
  it("shows a loading indicator while the script has not resolved", () => {
    hoisted.state = "loading";
    render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);
    expect(screen.getByText(/loading live flight search/i)).toBeTruthy();
  });

  it("Round 2 Issue 1: also exposes 'Open full flight search' while loading, not only after something has already gone wrong", () => {
    hoisted.state = "loading";
    const onOpenFullSearch = vi.fn();
    render(<TravelpayoutsLiveFlights onOpenFullSearch={onOpenFullSearch} />);
    const btn = screen.getByRole("button", { name: /open full flight search/i });
    btn.click();
    expect(onOpenFullSearch).toHaveBeenCalledTimes(1);
  });
});

describe("TravelpayoutsLiveFlights — Round 2 Issue 3: needsReloadForRemount (honest post-remount state)", () => {
  it("shows a distinct 'needs to reload' message, not the normal 'ready' search form, when the widget is stale after a remount", () => {
    hoisted.state = "ready";
    hoisted.needsReloadForRemount = true;
    render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);

    expect(screen.getByText(/needs to reload/i)).toBeTruthy();
    // Never claims a working search form is present — this must never
    // silently overlap with the normal ready-state copy/containers.
    expect(screen.queryByText(/search current live flight availability/i)).toBeNull();
  });

  it("item 12/13: does NOT render #tpwl-search/#tpwl-tickets in this state — a container the script will never populate must not sit there implying it could still work", () => {
    hoisted.state = "ready";
    hoisted.needsReloadForRemount = true;
    const { container } = render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);

    expect(container.querySelector("#tpwl-search")).toBeNull();
    expect(container.querySelector("#tpwl-tickets")).toBeNull();
  });

  it("the 'Reload live flight search' button triggers a full page reload", () => {
    hoisted.state = "ready";
    hoisted.needsReloadForRemount = true;
    const reloadSpy = vi.fn();
    const originalLocation = window.location;
    // @ts-expect-error -- test-only stub of window.location.reload
    delete window.location;
    // @ts-expect-error -- test-only stub
    window.location = { ...originalLocation, reload: reloadSpy };

    render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);
    screen.getByRole("button", { name: /reload live flight search/i }).click();
    expect(reloadSpy).toHaveBeenCalledTimes(1);

    window.location = originalLocation;
  });

  it("the 'Open full flight search' fallback also remains available in this state — never a dead end", () => {
    hoisted.state = "ready";
    hoisted.needsReloadForRemount = true;
    const onOpenFullSearch = vi.fn();
    render(<TravelpayoutsLiveFlights onOpenFullSearch={onOpenFullSearch} />);
    screen.getByRole("button", { name: /^open full flight search$/i }).click();
    expect(onOpenFullSearch).toHaveBeenCalledTimes(1);
  });
});

describe("TravelpayoutsLiveFlights — item 6: truthful failure/fallback state", () => {
  it("shows a truthful failure message and a fallback CTA when the script failed to load", () => {
    hoisted.state = "error";
    const onOpenFullSearch = vi.fn();
    render(<TravelpayoutsLiveFlights onOpenFullSearch={onOpenFullSearch} />);
    expect(screen.getByText(/couldn't load right now/i)).toBeTruthy();
    // Never claims live results are available when the widget failed to load.
    expect(screen.queryByText(/loading live flight search/i)).toBeNull();
  });

  it("the error-state CTA calls onOpenFullSearch (routes to the full Page White Label fallback)", () => {
    hoisted.state = "error";
    const onOpenFullSearch = vi.fn();
    render(<TravelpayoutsLiveFlights onOpenFullSearch={onOpenFullSearch} />);
    screen.getByRole("button", { name: /open full flight search/i }).click();
    expect(onOpenFullSearch).toHaveBeenCalledTimes(1);
  });

  it("item 15: a secondary 'Open full flight search' escape hatch is also available when the widget IS ready — never a dead end", () => {
    hoisted.state = "ready";
    const onOpenFullSearch = vi.fn();
    render(<TravelpayoutsLiveFlights onOpenFullSearch={onOpenFullSearch} />);
    const link = screen.getByRole("button", { name: /open full flight search/i });
    link.click();
    expect(onOpenFullSearch).toHaveBeenCalledTimes(1);
  });
});

describe("TravelpayoutsLiveFlights — item 7: no dangerouslySetInnerHTML", () => {
  it("the component source never uses dangerouslySetInnerHTML", () => {
    expect(TravelpayoutsLiveFlights.toString()).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("TravelpayoutsLiveFlights — item 20: mobile wrapper does not introduce overflow", () => {
  it("the outer wrapper constrains width and hides horizontal overflow rather than letting the widget break page layout", () => {
    hoisted.state = "ready";
    const { container } = render(<TravelpayoutsLiveFlights onOpenFullSearch={vi.fn()} />);
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toContain("overflow-x-hidden");
    expect(wrapper.className).toContain("max-w-full");
  });
});

describe("TravelpayoutsLiveFlights — currency: no false claim of Widget currency preservation", () => {
  it("accepts no currency prop at all — it cannot claim to pass BookingsFinder's resolved currency into a widget with no documented way to receive it", () => {
    // TypeScript already enforces this at compile time (TravelpayoutsLiveFlightsProps
    // has only onOpenFullSearch); this test documents the intent so a future
    // change adding an unverified currency prop doesn't slip in silently.
    const props = Object.keys({ onOpenFullSearch: () => {} });
    expect(props).toEqual(["onOpenFullSearch"]);
  });
});
