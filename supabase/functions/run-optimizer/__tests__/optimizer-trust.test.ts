/**
 * run-optimizer trust integrity — BF-0R-2.
 *
 * The Optimizer previously fabricated travel intelligence whenever
 * Travelpayouts returned nothing usable: rule-based fares from a hard-coded
 * distance table, round-trip and priority multipliers, invented airlines
 * ("Budget Carrier" / "Major Airline"), invented durations and stop counts,
 * fixed baggage/transfer/extra-fee figures, and BUY/WAIT advice with
 * booking-window and seat-scarcity claims.
 *
 * These tests are behavioural: `optimizer-core.ts` is imported directly (the
 * repo's edge-function test convention — see tiqets-catalog and sitemap) so the
 * trust model is exercised for real. NO provider is contacted: the core is
 * pure, and every input below is a fixture. Source assertions are used only for
 * the things a unit test cannot observe — that the legacy fabricated constants
 * are gone from the function, that the result row is written only for a genuine
 * answer, and that auth/quota enforcement is still in place.
 *
 * CORE RULE: NO PROVIDER DATA = NO INVENTED TRAVEL ANSWER.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  INSUFFICIENT_LIVE_DATA,
  INSUFFICIENT_LIVE_DATA_MESSAGE,
  buildOptimizerOutcome,
  buildPriceContext,
  describeFarePosition,
  resolveAirlineName,
  selectBestFlight,
  toUsableFlights,
  type OptimizerOutcome,
  type OptimizerSuccess,
  type ProviderFlightObservation,
} from "../optimizer-core.ts";

const FN_DIR = join(__dirname, "..");
const indexSource = readFileSync(join(FN_DIR, "index.ts"), "utf8");
const coreSource = readFileSync(join(FN_DIR, "optimizer-core.ts"), "utf8");
const functionSource = `${indexSource}\n${coreSource}`;

const genuineFlights: ProviderFlightObservation[] = [
  { price: 480, airline_code: "QF", duration_minutes: 840, stops: 1, link: "/search/x1" },
  { price: 520, airline_code: "SQ", duration_minutes: 720, stops: 0, link: "/search/x2" },
  { price: 640, airline_code: "EK", duration_minutes: 900, stops: 2, link: "/search/x3" },
  { price: 560, airline_code: "BA", duration_minutes: 780, stops: 1, link: "/search/x4" },
];

function run(
  flights: ProviderFlightObservation[] | null | undefined,
  overrides: Partial<Parameters<typeof buildOptimizerOutcome>[0]> = {},
): OptimizerOutcome {
  return buildOptimizerOutcome({
    origin: "SYD",
    destination: "LHR",
    priority: "cheapest",
    flights,
    ...overrides,
  });
}

function expectSuccess(outcome: OptimizerOutcome): OptimizerSuccess {
  expect(outcome.status).toBe("ok");
  return outcome as OptimizerSuccess;
}

/** Every string a traveller could be shown, for scanning. */
function renderedText(outcome: OptimizerOutcome): string {
  return JSON.stringify(outcome);
}

describe("1. genuine provider results remain usable", () => {
  it("returns a provider-backed answer built only from observations", () => {
    const result = expectSuccess(run(genuineFlights));

    expect(result.fare).toBe(480); // the cheapest genuine fare, unmodified
    expect(result.recommendedRoute.airline).toBe("Qantas");
    expect(result.recommendedRoute.stops).toBe(1);
    expect(result.recommendedRoute.duration).toBe(840);
    expect(result.priceContext.optionsFound).toBe(4);
  });

  it("honours each priority using genuine fields only", () => {
    expect(expectSuccess(run(genuineFlights, { priority: "cheapest" })).fare).toBe(480);
    expect(expectSuccess(run(genuineFlights, { priority: "fastest" })).fare).toBe(520);
    // low_risk selects the fewest genuine stops, then the cheaper of those.
    expect(expectSuccess(run(genuineFlights, { priority: "low_risk" })).recommendedRoute.stops).toBe(0);
  });

  it("never modifies a provider fare with a multiplier", () => {
    const fares = genuineFlights.map((f) => f.price);
    const result = expectSuccess(run(genuineFlights));
    expect(fares).toContain(result.fare);
  });
});

describe("2. zero provider results produce the truthful insufficient-data state", () => {
  it("returns insufficient_live_data with reason no_results", () => {
    const outcome = run([]);
    expect(outcome.status).toBe(INSUFFICIENT_LIVE_DATA);
    expect(outcome).toMatchObject({ reason: "no_results", message: INSUFFICIENT_LIVE_DATA_MESSAGE });
  });

  it("carries no fare, route, airline, duration, stops or advice", () => {
    const outcome = run([]) as Record<string, unknown>;
    for (const key of [
      "fare",
      "recommendedRoute",
      "priceContext",
      "fareComparison",
      "notes",
      "affiliateLinks",
      "estimatedTotalCost",
      "costBreakdown",
      "timingAdvice",
      "riskAlerts",
    ]) {
      expect(outcome[key]).toBeUndefined();
    }
  });

  it("does not imply that no flights exist or that a provider is permanently down", () => {
    const text = renderedText(run([])).toLowerCase();
    expect(text).not.toMatch(/no flights (exist|are available)/);
    expect(text).not.toMatch(/sold out|unavailable permanently|no longer/);
    expect(text).not.toMatch(/prices are (high|low)/);
  });
});

describe("3. provider error / unavailability produces a truthful no-data state", () => {
  it("maps a provider throw to insufficient_live_data", () => {
    const outcome = run(genuineFlights, { providerFailure: "provider_error" });
    expect(outcome).toMatchObject({
      status: INSUFFICIENT_LIVE_DATA,
      reason: "provider_error",
    });
  });

  it("maps an unconfigured/unreachable provider to insufficient_live_data", () => {
    expect(run(null)).toMatchObject({
      status: INSUFFICIENT_LIVE_DATA,
      reason: "provider_unavailable",
    });
    expect(run(undefined)).toMatchObject({ status: INSUFFICIENT_LIVE_DATA });
  });

  it("fails closed even when options were returned alongside the failure", () => {
    // A provider failure outranks any partial payload: no answer is built.
    const outcome = run(genuineFlights, { providerFailure: "provider_unavailable" });
    expect(outcome.status).toBe(INSUFFICIENT_LIVE_DATA);
    expect((outcome as Record<string, unknown>).fare).toBeUndefined();
  });

  it("treats options with no usable fare as unusable rather than free", () => {
    const outcome = run([
      { price: 0, airline_code: "QF" },
      { price: -5, airline_code: "BA" },
      { airline_code: "SQ" },
    ]);
    expect(outcome).toMatchObject({
      status: INSUFFICIENT_LIVE_DATA,
      reason: "unusable_results",
    });
  });
});

describe("4-11. no fabricated value is ever generated", () => {
  const noDataStates = [run([]), run(null), run(genuineFlights, { providerFailure: "provider_error" })];

  it("4. generates no fallback fare", () => {
    for (const outcome of noDataStates) {
      expect((outcome as Record<string, unknown>).fare).toBeUndefined();
      expect(renderedText(outcome)).not.toMatch(/\b(150|350|650|1200)\b/);
    }
  });

  it("5. generates no fabricated airline", () => {
    for (const outcome of noDataStates) {
      expect(renderedText(outcome)).not.toMatch(/Budget Carrier|Major Airline/i);
    }
    // An absent or placeholder airline code yields NO airline, not a stand-in.
    const result = expectSuccess(run([{ price: 300, airline: "Unknown", stops: 0 }]));
    expect(result.recommendedRoute.airline).toBeUndefined();
    expect(resolveAirlineName(undefined)).toBeUndefined();
    expect(resolveAirlineName("")).toBeUndefined();
    expect(resolveAirlineName("Unknown")).toBeUndefined();
  });

  it("6. generates no fabricated duration", () => {
    // The shared client coerces a missing duration to 0. That is "not
    // reported", never "instant" — the field must be omitted entirely.
    const result = expectSuccess(run([{ price: 300, airline_code: "QF", duration_minutes: 0, stops: 1 }]));
    expect(result.recommendedRoute.duration).toBeUndefined();
    expect(renderedText(result)).not.toMatch(/\b(120|240|480|960)\b/);
  });

  it("7. generates no fabricated stop count", () => {
    const result = expectSuccess(run([{ price: 300, airline_code: "QF" }]));
    expect(result.recommendedRoute.stops).toBeUndefined();
    expect(result.notes.some((n) => n.type === "stops_unknown")).toBe(true);
  });

  it("8-10. generates no baggage, transfer or extra-fee figure at all", () => {
    // The form collects hasBags as a BOOLEAN — the traveller never enters an
    // amount, so no Source-Type-C basis exists for any of these line items.
    const result = expectSuccess(run(genuineFlights));
    const asRecord = result as unknown as Record<string, unknown>;
    expect(asRecord.costBreakdown).toBeUndefined();
    expect(asRecord.baggage).toBeUndefined();
    expect(asRecord.transfers).toBeUndefined();
    expect(asRecord.extraFees).toBeUndefined();
    expect(functionSource).not.toMatch(/baggageEstimate|transferEstimate|extraFees\s*=/);
  });

  it("11. generates no synthetic total price — only the provider fare", () => {
    const result = expectSuccess(run(genuineFlights));
    const asRecord = result as unknown as Record<string, unknown>;
    expect(asRecord.estimatedTotalCost).toBeUndefined();
    expect(asRecord.totalCost).toBeUndefined();
    // The single monetary value equals a genuine provider fare exactly.
    expect(result.fare).toBe(480);
  });
});

describe("12-13. no unsupported prediction or scarcity claim", () => {
  const outcomes = [
    run(genuineFlights),
    run(genuineFlights, { priority: "fastest" }),
    run([{ price: 300, airline_code: "QF", stops: 0, duration_minutes: 600 }]),
    run([]),
    run(null),
  ];

  it("12. never emits BUY or WAIT advice", () => {
    for (const outcome of outcomes) {
      const record = outcome as unknown as Record<string, unknown>;
      expect(record.timingAdvice).toBeUndefined();
      expect(renderedText(outcome)).not.toMatch(/"(buy|wait)"/i);
    }
  });

  it("12. never claims a good deal, or that prices will rise or fall", () => {
    for (const outcome of outcomes) {
      const text = renderedText(outcome);
      expect(text).not.toMatch(/great deal|good deal|better deals?/i);
      expect(text).not.toMatch(/prices typically increase|sweet spot/i);
      expect(text).not.toMatch(/consider waiting|book now|act fast|hurry/i);
    }
  });

  it("13. never emits a scarcity or seat-availability claim", () => {
    for (const outcome of outcomes) {
      const text = renderedText(outcome);
      expect(text).not.toMatch(/seat availability|seats? (are )?(limited|remaining)/i);
      expect(text).not.toMatch(/only \d+ (seats?|left)|selling fast|last chance/i);
    }
  });

  it("emits no unsupported risk claim derived from stop counts", () => {
    const text = renderedText(run(genuineFlights, { priority: "cheapest" }));
    expect(text).not.toMatch(/increase delay risk|baggage issues|stricter carry-on/i);
    expect(text).not.toMatch(/risk/i);
  });

  it("states stop counts as a plain fact instead", () => {
    const result = expectSuccess(run(genuineFlights));
    expect(result.notes.some((n) => n.message === "The returned itinerary contains 1 stop(s).")).toBe(true);
  });
});

describe("14. safe mathematical comparisons over genuine observations", () => {
  it("scopes the comparison explicitly to the options returned", () => {
    const result = expectSuccess(run(genuineFlights));
    // avg = (480+520+640+560)/4 = 550; 480 is 12.7% -> 13% below.
    expect(result.fareComparison).toBe(
      "This fare is 13% below the average of the 4 options returned for this search.",
    );
    // The wording must never generalise to the route or the market.
    expect(result.fareComparison).not.toMatch(/for this route|market|typical|usually/i);
  });

  it("computes aggregates deterministically from genuine fares only", () => {
    expect(buildPriceContext(toUsableFlights(genuineFlights))).toEqual({
      optionsFound: 4,
      averagePrice: 550,
      lowestPrice: 480,
      highestPrice: 640,
    });
  });

  it("makes no comparison claim when there is nothing to compare against", () => {
    const single = expectSuccess(run([{ price: 300, airline_code: "QF", stops: 0 }]));
    expect(single.fareComparison).toBeNull();
    expect(describeFarePosition({ price: 300 }, [{ price: 300 }])).toBeNull();
  });

  it("reports an above-average fare just as plainly as a below-average one", () => {
    const result = expectSuccess(run(genuineFlights, { priority: "fastest" }));
    expect(result.fareComparison).toMatch(/^This fare is \d+% (below|above) the average/);
  });

  it("says so honestly when the requested priority could not be applied", () => {
    const noDurations: ProviderFlightObservation[] = [
      { price: 400, airline_code: "QF", duration_minutes: 0, stops: 1 },
      { price: 300, airline_code: "BA", duration_minutes: 0, stops: 1 },
    ];
    const result = expectSuccess(run(noDurations, { priority: "fastest" }));
    expect(result.selectionCriterion).toBe("price");
    expect(result.fare).toBe(300);
    expect(result.notes.some((n) => n.type === "priority_not_applied")).toBe(true);
  });
});

describe("16. affiliate URL is based on a genuine provider result only", () => {
  it("builds the link from the provider deep link", () => {
    const result = expectSuccess(run(genuineFlights, { marker: "12345" }));
    expect(result.affiliateLinks).toEqual([
      { provider: "Aviasales", url: "https://www.aviasales.com/search/x1&marker=12345" },
    ]);
  });

  it("emits NO affiliate link when the provider supplied none", () => {
    const result = expectSuccess(run([{ price: 300, airline_code: "QF", stops: 0 }]));
    expect(result.affiliateLinks).toEqual([]);
  });

  it("synthesises no search URL in the no-data state", () => {
    expect(renderedText(run([]))).not.toMatch(/aviasales/i);
    expect(renderedText(run(null))).not.toMatch(/aviasales/i);
  });
});

describe("legacy fabricated constants cannot silently return", () => {
  it("contains none of the invented airline labels", () => {
    expect(functionSource).not.toMatch(/Budget Carrier/);
    expect(functionSource).not.toMatch(/Major Airline/);
  });

  it("contains none of the unsupported timing or scarcity copy", () => {
    expect(functionSource).not.toMatch(/sweet spot/i);
    expect(functionSource).not.toMatch(/Prices typically increase/i);
    expect(functionSource).not.toMatch(/seat availability limited/i);
    expect(functionSource).not.toMatch(/Great deal!/);
    expect(functionSource).not.toMatch(/Consider waiting for better deals/i);
    expect(functionSource).not.toMatch(/potential deals/i);
  });

  it("contains no rule-based fare table, route categories or multipliers", () => {
    expect(functionSource).not.toMatch(/distanceFactors|durationMap/);
    expect(functionSource).not.toMatch(/longHaulPairs|mediumHaulPairs/);
    expect(functionSource).not.toMatch(/short_haul|medium_haul|long_haul/);
    expect(functionSource).not.toMatch(/baseFare\s*\*=/);
    expect(functionSource).not.toMatch(/\*\s*1\.8|\*\s*1\.15|\*\s*1\.08/);
  });

  it("contains no fixed baggage, transfer or extra-fee amount", () => {
    expect(functionSource).not.toMatch(/isLongHaul \? 80 : 50/);
    expect(functionSource).not.toMatch(/stops > 0 \? 25 : 0/);
    expect(functionSource).not.toMatch(/extraFees = 15/);
  });

  it("no longer swallows provider errors into an empty result set", () => {
    // The original fetchRealPrices caught every error and returned [], which
    // made an outage indistinguishable from "no flights" and fed the fallback.
    expect(indexSource).not.toMatch(/catch[\s\S]{0,120}return \[\];/);
    expect(indexSource).toMatch(/provider_error/);
    expect(indexSource).toMatch(/provider_unavailable/);
  });
});

describe("15 & 17. persistence and access control in index.ts", () => {
  it("15. writes a result row ONLY for a genuine provider-backed answer", () => {
    expect(indexSource).toMatch(
      /if \(result\.status === "ok" && requestData\?\.id\)[\s\S]{0,400}optimizer_results/,
    );
  });

  it("15. explicitly NULLs the legacy fabricated estimate columns", () => {
    expect(indexSource).toMatch(/baggage_estimate: null/);
    expect(indexSource).toMatch(/transfer_estimate: null/);
    expect(indexSource).toMatch(/extra_fees_estimate: null/);
  });

  it("15. persists no timing prediction", () => {
    expect(indexSource).toMatch(/timing_advice: "neutral"/);
    expect(indexSource).not.toMatch(/timing_advice: ("buy"|"wait")/);
  });

  it("15. stores only the genuine provider fare as the monetary value", () => {
    expect(indexSource).toMatch(/estimated_total_cost: result\.fare/);
    expect(indexSource).toMatch(/fare_estimate: result\.fare/);
  });

  it("17. preserves authentication, plan and subscription checks", () => {
    // BF-0R-4: the inactive-Pro downgrade decision moved from an inline
    // comparison in index.ts to the pure evaluateOptimizerQuota in
    // auth-quota-core.ts — see optimizer-auth-quota.test.ts for the
    // relocated, and now also authentication-gated, assertions.
    expect(indexSource).toMatch(/supabase\.auth\.getUser\(token\)/);
    expect(indexSource).toMatch(/from\("user_profiles"\)/);
    expect(indexSource).toMatch(/from\("subscriptions"\)/);
  });

  it("17. preserves the free-tier quota and its 402 paywall response", () => {
    // BF-0R-4: the FREE_LIMIT comparison moved into evaluateOptimizerQuota —
    // see optimizer-auth-quota.test.ts.
    expect(indexSource).toMatch(/const FREE_LIMIT = 1;/);
    expect(indexSource).toMatch(/status: 402/);
    expect(indexSource).toMatch(/monthly_optimizer_uses: \(profile\.monthly_optimizer_uses \|\| 0\) \+ 1/);
  });

  it("17. keeps the monthly usage reset behaviour", () => {
    expect(indexSource).toMatch(/last_optimizer_reset/);
    expect(indexSource).toMatch(/needsReset/);
  });
});

describe("selection helpers operate only on usable observations", () => {
  it("drops options without a usable fare before any calculation", () => {
    const usable = toUsableFlights([
      { price: 300, airline_code: "QF" },
      { price: 0, airline_code: "BA" },
      { price: Number.NaN, airline_code: "SQ" },
      { airline_code: "EK" },
    ]);
    expect(usable).toHaveLength(1);
    expect(usable[0].price).toBe(300);
  });

  it("returns null rather than a stand-in when nothing is selectable", () => {
    expect(selectBestFlight([], "cheapest")).toBeNull();
  });
});
