/**
 * Smart Trip Optimizer — customer honesty (BF-0R-2).
 *
 * The Optimizer used to fabricate an answer whenever the flight provider
 * returned nothing usable: a rule-based fare, a generic carrier label, an
 * invented duration and stop count, fixed baggage/transfer/extra-fee figures,
 * and BUY/WAIT advice with booking-window and seat-scarcity claims.
 *
 * These tests lock the two states that must never be confused:
 *
 *   PROVIDER-BACKED ANSWER   genuine observations only, comparisons scoped to
 *                            the options actually returned
 *   INSUFFICIENT LIVE DATA   nothing trustworthy came back — say so, and show
 *                            no fare, route, airline or recommendation
 *
 * The optimizer hook is mocked, so no network call and no provider call is made.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "fs";
import { join } from "path";
import type {
  OptimizerRequest,
  OptimizerSuccess,
  OptimizerInsufficientData,
} from "@/hooks/useOptimizer";

const { mockTrackAffiliateClick } = vi.hoisted(() => ({
  mockTrackAffiliateClick: vi.fn(),
}));

vi.mock("@/hooks/useOptimizer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/hooks/useOptimizer")>();
  return {
    ...actual,
    useOptimizer: () => ({
      runOptimizer: vi.fn(),
      trackAffiliateClick: mockTrackAffiliateClick,
      isLoading: false,
      error: null,
      paywallError: null,
      clearPaywallError: vi.fn(),
    }),
  };
});

import OptimizerResults from "../OptimizerResults";
import OptimizerNoData from "../OptimizerNoData";
import OptimizerForm from "../OptimizerForm";

const request: OptimizerRequest = {
  origin: "SYD",
  destination: "LHR",
  travelWindowStart: "2026-11-02",
  travelWindowEnd: "2026-11-20",
  hasBags: true,
  priority: "cheapest",
};

const providerBacked: OptimizerSuccess = {
  status: "ok",
  recommendedRoute: {
    summary: "SYD to LHR via 1 connection(s)",
    airline: "Qantas",
    stops: 1,
    duration: 840,
  },
  fare: 480,
  selectionCriterion: "price",
  priceContext: { optionsFound: 4, averagePrice: 550, lowestPrice: 480, highestPrice: 640 },
  fareComparison:
    "This fare is 13% below the average of the 4 options returned for this search.",
  notes: [{ type: "stops", message: "The returned itinerary contains 1 stop(s)." }],
  affiliateLinks: [{ provider: "Aviasales", url: "https://www.aviasales.com/search/x1" }],
};

const noData: OptimizerInsufficientData = {
  status: "insufficient_live_data",
  reason: "provider_error",
  message:
    "We couldn't retrieve enough flight data from our provider to calculate this trip right now. " +
    "No estimated fare or recommendation has been generated.",
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("provider-backed result", () => {
  it("shows the provider-quoted fare and scopes the comparison to returned options", () => {
    render(<OptimizerResults result={providerBacked} request={request} onReset={vi.fn()} />);

    expect(screen.getByText("$480.00")).toBeInTheDocument();
    expect(
      screen.getByText(
        "This fare is 13% below the average of the 4 options returned for this search.",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText(/Provider-quoted fare/i)).toBeInTheDocument();
  });

  it("states plainly that baggage, transfers and fees are NOT estimated", () => {
    render(<OptimizerResults result={providerBacked} request={request} onReset={vi.fn()} />);

    expect(
      screen.getByText(/does not include baggage, transfers or other fees/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/Baggage \(estimated\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Transfers \(estimated\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Other Fees \(estimated\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Total Estimate/i)).not.toBeInTheDocument();
  });

  it("shows no BUY/WAIT badge and no timing prediction", () => {
    render(<OptimizerResults result={providerBacked} request={request} onReset={vi.fn()} />);

    expect(screen.queryByText(/Timing Advice/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Good time to compare/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Consider waiting/i)).not.toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/sweet spot|prices typically increase/i);
  });

  it("labels aggregates as the options returned, not as market data", () => {
    render(<OptimizerResults result={providerBacked} request={request} onReset={vi.fn()} />);

    // Exact match: the scoped fare comparison also contains this phrase.
    expect(screen.getByText("Options returned for this search")).toBeInTheDocument();
    expect(screen.queryByText(/Live Market Data/i)).not.toBeInTheDocument();
  });

  it("renders no risk-alert framing or unsupported all-clear claim", () => {
    render(<OptimizerResults result={providerBacked} request={request} onReset={vi.fn()} />);

    expect(screen.getByText(/Itinerary notes/i)).toBeInTheDocument();
    expect(screen.queryByText(/Risk Alerts/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/No Major Risks Detected/i)).not.toBeInTheDocument();
  });

  it("links out only to the genuine provider deep link", () => {
    render(<OptimizerResults result={providerBacked} request={request} onReset={vi.fn()} />);

    const cta = screen.getByRole("link", { name: /View on Partner Site/i });
    expect(cta).toHaveAttribute("href", "https://www.aviasales.com/search/x1");
  });

  it("hides the outbound CTA entirely when the provider gave no deep link", () => {
    render(
      <OptimizerResults
        result={{ ...providerBacked, affiliateLinks: [] }}
        request={request}
        onReset={vi.fn()}
      />,
    );

    expect(screen.queryByRole("link", { name: /View on Partner Site/i })).not.toBeInTheDocument();
    // The internal comparison link is navigation, not a claim, so it stays.
    expect(screen.getByRole("link", { name: /Compare Booking Options/i })).toBeInTheDocument();
  });

  it("omits airline, stops and duration the provider never reported", () => {
    render(
      <OptimizerResults
        result={{ ...providerBacked, recommendedRoute: { summary: "SYD to LHR" } }}
        request={request}
        onReset={vi.fn()}
      />,
    );

    expect(
      screen.getByText(/The provider reported no further itinerary detail\./i),
    ).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Budget Carrier|Major Airline/);
  });
});

describe("insufficient live data", () => {
  it("says no fare or recommendation was generated", () => {
    render(<OptimizerNoData result={noData} request={request} onReset={vi.fn()} />);

    expect(
      screen.getByText(/No estimated fare or recommendation has been generated\./i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/No flight data available from our provider right now/i),
    ).toBeInTheDocument();
  });

  it("shows no fare, airline, duration, stop count or advice", () => {
    render(<OptimizerNoData result={noData} request={request} onReset={vi.fn()} />);

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/\$\d/);
    expect(text).not.toMatch(/Budget Carrier|Major Airline|Qantas/);
    expect(text).not.toMatch(/stop\(s\)|\dh \d+m/);
    expect(text).not.toMatch(/buy|wait|sweet spot|seat availability/i);
  });

  it("does not claim that flights do not exist or that prices are high", () => {
    render(<OptimizerNoData result={noData} request={request} onReset={vi.fn()} />);

    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/no flights (exist|available)/i);
    expect(text).not.toMatch(/sold out|fully booked|prices are high/i);
    // It must actively disclaim both readings.
    expect(text).toMatch(/does not tell you whether flights exist on this route/i);
  });

  it("offers a retry and a direct search instead of a fabricated answer", () => {
    render(<OptimizerNoData result={noData} request={request} onReset={vi.fn()} />);

    expect(screen.getByRole("button", { name: /Try Again/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Search Flights Directly/i })).toHaveAttribute(
      "href",
      "/flights?origin=SYD&destination=LHR&date=2026-11-02",
    );
  });
});

/**
 * Customer-facing copy must not promise anything the trust model cannot
 * deliver. These guards scan the production optimizer UI directly, so a
 * reintroduced claim fails even if no component test happens to render it.
 */
describe("customer-facing optimizer copy", () => {
  const UI_FILES = [
    join(__dirname, "..", "OptimizerForm.tsx"),
    join(__dirname, "..", "OptimizerResults.tsx"),
    join(__dirname, "..", "OptimizerNoData.tsx"),
    join(__dirname, "..", "..", "..", "pages", "TripOptimizer.tsx"),
  ];
  const uiSource = UI_FILES.map((f) => readFileSync(f, "utf8")).join("\n");

  it("never claims baggage fees are estimated", () => {
    // BF-0R-2 removed baggage estimation entirely and the backend persists
    // baggage_estimate = null, so this old subtitle would be a false promise.
    expect(uiSource).not.toMatch(/Include baggage fee estimates/i);
    expect(uiSource).not.toMatch(/baggage fee estimate/i);
  });

  it("tells the traveller plainly that baggage fees are not estimated", () => {
    render(<OptimizerForm onSubmit={vi.fn()} />);

    expect(screen.getByText(/Checked Baggage/i)).toBeInTheDocument();
    expect(
      screen.getByText(/fees aren.t included or estimated/i),
    ).toBeInTheDocument();
  });

  it("never promises a provider-quoted fare on EVERY search", () => {
    // provider_error / provider_unavailable / no_results / unusable_results
    // all yield no fare, so "every search" cannot be guaranteed.
    expect(uiSource).not.toMatch(/on every search/i);
    expect(uiSource).not.toMatch(/fares? (on|for) (every|all) searches?/i);
  });

  it("makes no guaranteed real-time freshness claim", () => {
    // Nothing in the repository establishes a contractual freshness guarantee,
    // so customer-facing copy is scoped to what the provider returned. The
    // technical identifiers (INSUFFICIENT_LIVE_DATA / insufficient_live_data)
    // live in the hook and core, not in this customer-facing surface.
    expect(uiSource).not.toMatch(/\blive\b/i);
    expect(uiSource).not.toMatch(/real[- ]time/i);
    expect(uiSource).not.toMatch(/up[- ]to[- ]the[- ]minute|instantly updated/i);
  });

  it("still scopes its claims to the provider and the returned options", () => {
    expect(uiSource).toMatch(/our (flight )?data provider/i);
    expect(uiSource).toMatch(/options returned for this search/i);
  });
});
