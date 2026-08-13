/**
 * Phase 2A-2.5A — flight results honesty.
 *
 * BookingsFinder holds no fare history, no market baseline and no forecast. The
 * only price fact available on a result card is how that result compares with
 * the other results in the same search, so these tests assert two things:
 *
 *   1. no rendered text claims price movement, scarcity, urgency or an absolute
 *      market verdict, whatever the batch-derived fields happen to contain;
 *   2. the genuine signals — layover warnings, direct/stops, cheapest/fastest
 *      ordering labels, and an explicitly result-relative price comparison —
 *      all still render.
 *
 * These are rendering tests, not source-text greps: every assertion runs against
 * the DOM produced by real props.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import FlightCard from "@/components/flights/FlightCard";
import FlightQuickSelect from "@/components/flights/FlightQuickSelect";
import type { Flight } from "@/types/flight";

// FlightCard pulls formatDuration from useFlightSearch, which constructs the
// Supabase client at import time. Stub it so this suite needs no environment.
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: null } }) } },
}));

/** Wording we must never render, whatever the data says. */
const FORBIDDEN_PATTERNS: { label: string; pattern: RegExp }[] = [
  { label: "price rising", pattern: /price\s+rising/i },
  { label: "price falling", pattern: /price\s+falling/i },
  { label: "prices increasing", pattern: /prices?\s+(are\s+)?(rising|increasing|going up)/i },
  { label: "prices dropping", pattern: /prices?\s+(are\s+)?(falling|dropping|going down)/i },
  { label: "price may change", pattern: /price\s+may\s+change/i },
  { label: "book now / before prices rise", pattern: /book\s+now|before\s+prices/i },
  { label: "hot deal", pattern: /hot\s+deal/i },
  { label: "best deal", pattern: /best\s+deal/i },
  { label: "excellent / good deal", pattern: /(excellent|good)\s+deal/i },
  { label: "great price", pattern: /great\s+price/i },
  { label: "fair price", pattern: /fair\s+price/i },
  { label: "seats left / remaining", pattern: /seats?\s+(left|remaining)/i },
  { label: "people viewing", pattern: /(people|travellers|travelers)\s+(are\s+)?(viewing|looking)/i },
  { label: "selling fast / almost gone", pattern: /selling\s+fast|almost\s+gone|in\s+high\s+demand/i },
  { label: "departure countdown", pattern: /departs?\s+in\s+\d+\s*d/i },
  { label: "confidence wording", pattern: /(high|low|average)\s+confidence/i },
];

function expectNoForbiddenWording(text: string) {
  for (const { label, pattern } of FORBIDDEN_PATTERNS) {
    expect(pattern.test(text), `rendered output must not claim "${label}"`).toBe(false);
  }
}

const TOMORROW = new Date(Date.now() + 24 * 60 * 60 * 1000);
const iso = (d: Date) => d.toISOString();

function makeFlight(overrides: Partial<Flight> = {}): Flight {
  return {
    id: "f1",
    airline: "Qantas",
    airline_code: "QF",
    price: 320,
    currency: "AUD",
    duration_minutes: 95,
    stops: 0,
    segments: [
      {
        from: "SYD",
        to: "MEL",
        depart_time: iso(TOMORROW),
        arrive_time: iso(new Date(TOMORROW.getTime() + 95 * 60 * 1000)),
        airline: "Qantas",
        airline_code: "QF",
        flight_number: "400",
      },
    ],
    ...overrides,
  };
}

function renderCard(flight: Flight) {
  return render(<FlightCard flight={flight} currency="$" onBookNow={vi.fn()} />);
}

const expandDetails = () => fireEvent.click(screen.getByRole("button", { name: /view details/i }));

// ── NO UNSUPPORTED CLAIMS ──

describe("FlightCard — makes no claim the data cannot support", () => {
  it("a flight priced above the batch average shows no rising-price wording", () => {
    const { container } = renderCard(makeFlight({ price: 600, average_price: 400, price_confidence: "low", price_trend: "rising" }));
    expectNoForbiddenWording(container.textContent ?? "");
  });

  it("a flight priced below the batch average shows no falling-price wording", () => {
    const { container } = renderCard(makeFlight({ price: 200, average_price: 400, price_confidence: "high", price_trend: "falling" }));
    expect(container.textContent).not.toMatch(/falling|dropping/i);
    expectNoForbiddenWording(container.textContent ?? "");
  });

  it("a high deal score renders no Hot Deal or absolute deal verdict", () => {
    const { container } = renderCard(makeFlight({ deal_score: 97, average_price: 400, price: 250 }));
    expect(container.textContent).not.toMatch(/hot deal|excellent deal|good deal|fair price/i);
    expectNoForbiddenWording(container.textContent ?? "");
  });

  it("a bare deal score is not rendered as a number badge", () => {
    renderCard(makeFlight({ deal_score: 97 }));
    // 97 must not appear as a standalone score chip; only the price is numeric here.
    expect(screen.queryByText("97")).toBeNull();
  });

  it("a provider is_deal flag no longer renders a Best Deal badge", () => {
    const { container } = renderCard(makeFlight({ is_deal: true, deal_score: undefined }));
    expect(container.textContent).not.toMatch(/best deal/i);
  });

  it("a flight departing within a week renders no countdown", () => {
    const { container } = renderCard(makeFlight({ average_price: 400, price: 250 }));
    expect(container.textContent).not.toMatch(/departs? in/i);
  });

  it("no unsupported wording survives in the expanded details either", () => {
    const { container } = renderCard(
      makeFlight({
        price: 600,
        average_price: 400,
        price_confidence: "low",
        price_trend: "rising",
        deal_score: 12,
        warnings: ["long_layover"],
      })
    );
    expandDetails();
    expectNoForbiddenWording(container.textContent ?? "");
  });

  it("every price_confidence value renders result-relative copy only", () => {
    for (const confidence of ["low", "average", "high"] as const) {
      const { container, unmount } = renderCard(
        makeFlight({ price: 400, average_price: 400, price_confidence: confidence })
      );
      expandDetails();
      expect(container.textContent).toMatch(/results in this search/i);
      expectNoForbiddenWording(container.textContent ?? "");
      unmount();
    }
  });
});

// ── THE COMPARISON WE DO KEEP IS LABELLED HONESTLY ──

describe("FlightCard — the price comparison names its own basis", () => {
  it("states that the percentage is against the average of these results", () => {
    renderCard(makeFlight({ price: 250, average_price: 500 }));
    expect(screen.getByText(/50% below the average of these results/i)).toBeTruthy();
  });

  it("shows no comparison badge when there is no batch average to compare with", () => {
    const { container } = renderCard(makeFlight({ price: 250, average_price: undefined }));
    expect(container.textContent).not.toMatch(/below the average/i);
  });

  it("shows no comparison badge when the price is not meaningfully below average", () => {
    const { container } = renderCard(makeFlight({ price: 390, average_price: 400 }));
    expect(container.textContent).not.toMatch(/below the average/i);
  });

  it("labels the detail panel and its delta as relative to this search", () => {
    renderCard(makeFlight({ price: 300, average_price: 400, price_confidence: "high" }));
    expandDetails();
    expect(screen.getByText(/price vs these results/i)).toBeTruthy();
    expect(screen.getByText(/vs\. average of these results/i)).toBeTruthy();
    expect(screen.getByText(/cheaper than the average of the results in this search/i)).toBeTruthy();
  });
});

// ── GENUINE SIGNALS PRESERVED ──

describe("FlightCard — genuine signals still render", () => {
  it("keeps the long-layover, overnight-stop and self-transfer warnings", () => {
    renderCard(
      makeFlight({
        stops: 1,
        warnings: ["long_layover", "overnight_stop", "self_transfer"],
        segments: [
          { from: "SYD", to: "SIN", depart_time: iso(TOMORROW), arrive_time: iso(TOMORROW), airline: "QF", airline_code: "QF", layover_minutes: 540 },
          { from: "SIN", to: "LHR", depart_time: iso(TOMORROW), arrive_time: iso(TOMORROW), airline: "BA", airline_code: "BA" },
        ],
      })
    );
    expandDetails();
    expect(screen.getByText(/long layover/i)).toBeTruthy();
    expect(screen.getByText(/overnight stop/i)).toBeTruthy();
    expect(screen.getByText(/self-transfer/i)).toBeTruthy();
  });

  it("keeps the direct / stops distinction", () => {
    const { unmount } = renderCard(makeFlight({ stops: 0 }));
    expect(screen.getByText("Direct")).toBeTruthy();
    unmount();

    renderCard(makeFlight({ stops: 1, layover_cities: ["SIN"] }));
    expect(screen.getByText(/1 stop/)).toBeTruthy();
  });

  it("keeps price, per-person basis and the booking action", () => {
    renderCard(makeFlight({ price: 320 }));
    expect(screen.getByText("320")).toBeTruthy();
    expect(screen.getByText(/per person/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /view deal/i })).toBeTruthy();
  });

  it("keeps the honest baggage statement", () => {
    renderCard(makeFlight());
    expandDetails();
    expect(screen.getByText(/baggage/i)).toBeTruthy();
    expect(screen.getByText(/details at booking/i)).toBeTruthy();
  });
});

// ── ORDERING LABELS ARE COMPARISONS, NOT VERDICTS ──

describe("FlightQuickSelect — cheapest / fastest / best remain", () => {
  const flights: Flight[] = [
    makeFlight({ id: "cheap", price: 180, duration_minutes: 240, stops: 1, deal_score: 40 }),
    makeFlight({ id: "fast", price: 520, duration_minutes: 95, stops: 0, deal_score: 60 }),
    makeFlight({ id: "best", price: 260, duration_minutes: 120, stops: 0, deal_score: 90 }),
  ];

  it("still offers the three genuine trade-off comparisons", () => {
    const { container } = render(<FlightQuickSelect flights={flights} currency="$" onSelect={vi.fn()} />);
    expect(within(container).getByText("Cheapest")).toBeTruthy();
    expect(within(container).getByText("Fastest")).toBeTruthy();
    expect(within(container).getByText("Best")).toBeTruthy();
  });

  it("makes no market or urgency claim while doing so", () => {
    const { container } = render(<FlightQuickSelect flights={flights} currency="$" onSelect={vi.fn()} />);
    expectNoForbiddenWording(container.textContent ?? "");
  });
});
