/**
 * BF-FLIGHTS-CACHE-1 — Quick-select truth fix. No proprietary "best" pick;
 * Cheapest/Fastest/Fewest-stops are chosen only from data the provider
 * actually returned, never a BookingsFinder-invented deal_score.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// FlightQuickSelect imports formatDuration from @/hooks/useFlightSearch,
// which transitively imports the real Supabase client at module scope —
// mocked here so it never tries to read real env vars in a unit test.
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));

import FlightQuickSelect from "@/components/flights/FlightQuickSelect";
import type { Flight } from "@/types/flight";

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: overrides.id || "f",
    airline: "QF",
    airline_code: "QF",
    price: overrides.price ?? 100,
    currency: "AUD",
    duration_minutes: overrides.duration_minutes ?? 100,
    stops: overrides.stops ?? 0,
    segments: [{ from: "SYD", to: "MEL", depart_time: "2030-01-10T08:00:00Z", arrive_time: null, airline: "QF", airline_code: "QF" }],
    link: "/search/1",
    deal_score: overrides.deal_score,
    ...overrides,
  };
}

describe("FlightQuickSelect — no proprietary 'best' pick", () => {
  it("1. never renders 'Recent best'", () => {
    const flights = [
      makeFlight({ id: "a", price: 300, duration_minutes: 200, stops: 1, deal_score: 10 }),
      makeFlight({ id: "b", price: 100, duration_minutes: 400, stops: 0, deal_score: 99 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    expect(screen.queryByText("Recent best")).toBeNull();
  });

  it("2. never renders 'Score + comfort'", () => {
    const flights = [
      makeFlight({ id: "a", price: 300, duration_minutes: 200, stops: 1, deal_score: 10 }),
      makeFlight({ id: "b", price: 100, duration_minutes: 400, stops: 0, deal_score: 99 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    expect(screen.queryByText("Score + comfort")).toBeNull();
  });

  it("renders exactly Recent cheapest / Recent fastest fare / Recent fewest stops when all three are representable", () => {
    const flights = [
      makeFlight({ id: "a", price: 300, duration_minutes: 200, stops: 1 }),
      makeFlight({ id: "b", price: 100, duration_minutes: 400, stops: 0 }),
      makeFlight({ id: "c", price: 250, duration_minutes: 90, stops: 2 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    expect(screen.getByText("Recent cheapest")).toBeTruthy();
    expect(screen.getByText("Recent fastest fare")).toBeTruthy();
    expect(screen.getByText("Recent fewest stops")).toBeTruthy();
  });
});

describe("FlightQuickSelect — Cheapest correctness (item 3/4)", () => {
  it("3. ignores a price of 0 — the flight with a real, lower valid price wins", () => {
    const flights = [
      makeFlight({ id: "invalid", price: 0, duration_minutes: 100, stops: 0 }),
      makeFlight({ id: "real", price: 150, duration_minutes: 100, stops: 0 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText("Recent cheapest"));
    // The button click handler receives the winning flight's id via onSelect;
    // assert through the rendered price instead (unambiguous: only "real"
    // has a valid price, so $150 must be shown, never $0).
    const card = screen.getByText("Recent cheapest").closest("button")!;
    expect(card.textContent).toContain("150");
    expect(card.textContent).not.toMatch(/\$0(?!\d)/);
  });

  it("4. omits the Cheapest option entirely when no flight has a valid price (never fabricates one)", () => {
    const flights = [
      makeFlight({ id: "a", price: 0, duration_minutes: 100, stops: 0 }),
      makeFlight({ id: "b", price: NaN as unknown as number, duration_minutes: 120, stops: 1 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    expect(screen.queryByText("Recent cheapest")).toBeNull();
  });

  it("onSelect fires with the correct id for the cheapest valid-priced flight", () => {
    const onSelect = vi.fn();
    const flights = [
      makeFlight({ id: "invalid", price: 0, duration_minutes: 100, stops: 0 }),
      makeFlight({ id: "cheap-real", price: 80, duration_minutes: 100, stops: 0 }),
      makeFlight({ id: "expensive-real", price: 400, duration_minutes: 100, stops: 0 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Recent cheapest"));
    expect(onSelect).toHaveBeenCalledWith("cheap-real");
  });
});

describe("FlightQuickSelect — Fastest correctness (item 5/6)", () => {
  it("5. ignores a duration of 0 (unknown) — the flight with a real, shorter valid duration wins", () => {
    const flights = [
      makeFlight({ id: "unknown", price: 100, duration_minutes: 0, stops: 0 }),
      makeFlight({ id: "real", price: 100, duration_minutes: 250, stops: 0 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    const card = screen.getByText("Recent fastest fare").closest("button")!;
    expect(card.textContent).toMatch(/4h/); // 250 min = 4h 10m, never "N/A" from the unknown-duration flight
  });

  it("6. omits the Fastest option entirely when every flight has an unknown (0) duration", () => {
    const flights = [
      makeFlight({ id: "a", price: 100, duration_minutes: 0, stops: 0 }),
      makeFlight({ id: "b", price: 200, duration_minutes: 0, stops: 1 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    expect(screen.queryByText("Recent fastest fare")).toBeNull();
  });

  it("onSelect fires with the correct id for the fastest valid-duration flight", () => {
    const onSelect = vi.fn();
    const flights = [
      makeFlight({ id: "unknown", price: 100, duration_minutes: 0, stops: 0 }),
      makeFlight({ id: "slow-real", price: 100, duration_minutes: 500, stops: 0 }),
      makeFlight({ id: "fast-real", price: 100, duration_minutes: 90, stops: 0 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Recent fastest fare"));
    expect(onSelect).toHaveBeenCalledWith("fast-real");
  });
});

describe("FlightQuickSelect — Fewest stops (item 7/8)", () => {
  it("7. chooses the flight with the smallest stop count", () => {
    const onSelect = vi.fn();
    const flights = [
      makeFlight({ id: "two-stops", price: 100, duration_minutes: 100, stops: 2 }),
      makeFlight({ id: "direct", price: 300, duration_minutes: 100, stops: 0 }),
      makeFlight({ id: "one-stop", price: 50, duration_minutes: 100, stops: 1 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Recent fewest stops"));
    expect(onSelect).toHaveBeenCalledWith("direct");
  });

  it("8. on a stop-count tie, the flight with the valid lower price wins", () => {
    const onSelect = vi.fn();
    const flights = [
      makeFlight({ id: "direct-expensive", price: 300, duration_minutes: 100, stops: 0 }),
      makeFlight({ id: "direct-cheap", price: 120, duration_minutes: 100, stops: 0 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Recent fewest stops"));
    expect(onSelect).toHaveBeenCalledWith("direct-cheap");
  });

  it("on a stop-count tie with no valid price on either side, provider order (the first-seen flight) is preserved", () => {
    const onSelect = vi.fn();
    const flights = [
      makeFlight({ id: "first-direct", price: 0, duration_minutes: 100, stops: 0 }),
      makeFlight({ id: "second-direct", price: 0, duration_minutes: 100, stops: 0 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Recent fewest stops"));
    expect(onSelect).toHaveBeenCalledWith("first-direct");
  });

  it("the fewest-stops card never claims a provider recommendation or quality ranking in its visible text", () => {
    const flights = [makeFlight({ id: "a", price: 100, duration_minutes: 100, stops: 0 })];
    const { container } = render(<FlightQuickSelect flights={flights} onSelect={vi.fn()} />);
    expect(screen.getByText("Recent fewest stops")).toBeTruthy();
    expect(container.textContent).not.toMatch(/best|recommended|top pick|score/i);
  });
});

describe("FlightQuickSelect — never uses deal_score to choose (item 9)", () => {
  it("a flight with a high deal_score but a worse price/duration/stops never wins any quick option over a genuinely better one", () => {
    const onSelect = vi.fn();
    const flights = [
      // High deal_score, but objectively worse on every real metric.
      makeFlight({ id: "high-score-worse", price: 500, duration_minutes: 600, stops: 3, deal_score: 100 }),
      // Low/no deal_score, but genuinely cheapest, fastest, and fewest stops.
      makeFlight({ id: "low-score-better", price: 50, duration_minutes: 60, stops: 0, deal_score: 1 }),
    ];
    render(<FlightQuickSelect flights={flights} onSelect={onSelect} />);

    fireEvent.click(screen.getByText("Recent cheapest"));
    expect(onSelect).toHaveBeenLastCalledWith("low-score-better");

    fireEvent.click(screen.getByText("Recent fastest fare"));
    expect(onSelect).toHaveBeenLastCalledWith("low-score-better");

    fireEvent.click(screen.getByText("Recent fewest stops"));
    expect(onSelect).toHaveBeenLastCalledWith("low-score-better");
  });

  it("produces the identical result whether or not deal_score is present at all on the flights", () => {
    const onSelect = vi.fn();
    const withoutScore = [
      makeFlight({ id: "a", price: 200, duration_minutes: 150, stops: 1 }),
      makeFlight({ id: "b", price: 90, duration_minutes: 300, stops: 0 }),
    ];
    const { unmount } = render(<FlightQuickSelect flights={withoutScore} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Recent cheapest"));
    expect(onSelect).toHaveBeenLastCalledWith("b");
    unmount();

    onSelect.mockClear();
    const withScore = withoutScore.map((f) => ({ ...f, deal_score: f.id === "a" ? 99 : 1 }));
    render(<FlightQuickSelect flights={withScore} onSelect={onSelect} />);
    fireEvent.click(screen.getByText("Recent cheapest"));
    expect(onSelect).toHaveBeenLastCalledWith("b");
  });
});

describe("FlightQuickSelect — renders nothing for an empty flight list", () => {
  it("returns null", () => {
    const { container } = render(<FlightQuickSelect flights={[]} onSelect={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });
});
