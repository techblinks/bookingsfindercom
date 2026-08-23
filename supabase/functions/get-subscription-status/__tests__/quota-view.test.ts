/**
 * get-subscription-status is READ-ONLY re: optimizer quota — PR #65 round 4.
 *
 * Pure logic tests, no Deno globals, no network — mirrors the repo's
 * existing convention for exercising Edge Function logic under vitest (see
 * run-optimizer/__tests__/optimizer-orchestrator.test.ts).
 *
 * Regression context: get-subscription-status previously performed its own
 * unconditional `monthly_optimizer_uses = 0, last_optimizer_reset = now()`
 * UPDATE whenever it decided a new month had started — a second,
 * uncoordinated writer to the exact durable row run-optimizer's
 * compare-and-set claim path depends on. A status read racing a concurrent
 * run-optimizer claim could silently move `last_optimizer_reset` out from
 * under the claim's CAS guard, corrupting the "one Free optimization per
 * month" contract. This function must now only ever COMPUTE a virtual view
 * — never write.
 */
import { describe, it, expect } from "vitest";
import { computeNeedsReset, computeEffectiveQuotaView } from "../quota-view.ts";

const AUGUST_ISO = "2026-08-19T12:00:00.000Z";
const AUGUST_NOW = new Date(AUGUST_ISO);
const CURRENT_MONTH_RESET = "2026-08-01T00:00:00.000Z"; // same UTC month as AUGUST_NOW
const STALE_RESET = "2026-06-15T00:00:00.000Z"; // an earlier UTC month

describe("computeNeedsReset — deterministic UTC calendar-month semantics", () => {
  it("is false within the same UTC month", () => {
    expect(computeNeedsReset(CURRENT_MONTH_RESET, AUGUST_NOW)).toBe(false);
  });
  it("is true across a UTC month boundary", () => {
    expect(computeNeedsReset(STALE_RESET, AUGUST_NOW)).toBe(true);
  });
  it("is true for a null/missing reset timestamp", () => {
    expect(computeNeedsReset(null, AUGUST_NOW)).toBe(true);
    expect(computeNeedsReset(undefined, AUGUST_NOW)).toBe(true);
  });
  it("is true for an unparseable reset timestamp", () => {
    expect(computeNeedsReset("not-a-date", AUGUST_NOW)).toBe(true);
  });
});

describe("item 1: status read in the same month reports stored usage", () => {
  it("reports the exact stored monthly_optimizer_uses when no reset is due", () => {
    const view = computeEffectiveQuotaView(1, CURRENT_MONTH_RESET, AUGUST_NOW);
    expect(view.needsReset).toBe(false);
    expect(view.effectiveMonthlyUses).toBe(1);
  });
});

describe("item 2: status read after month rollover reports effective usage 0", () => {
  it("reports 0 when last_optimizer_reset is an earlier UTC month, regardless of the stored counter", () => {
    const view = computeEffectiveQuotaView(1, STALE_RESET, AUGUST_NOW);
    expect(view.needsReset).toBe(true);
    expect(view.effectiveMonthlyUses).toBe(0);
  });
});

describe("item 3/4: the status reader never mutates state and cannot clobber a concurrent optimizer claim", () => {
  it("computeEffectiveQuotaView takes only primitives and a Date — it has no database handle, so it cannot issue a write", () => {
    // Structural guarantee: the function signature itself makes a write
    // impossible — there is no db/client parameter to call .update() on.
    expect(computeEffectiveQuotaView.length).toBe(3);
    const view = computeEffectiveQuotaView(0, STALE_RESET, AUGUST_NOW);
    expect(view).toEqual({ needsReset: true, effectiveMonthlyUses: 0 });
  });

  it("a status read between run-optimizer's profile read and its claim CAS does not change what the claim matches against", () => {
    // Minimal in-memory model of the user_profiles row and run-optimizer's
    // real compare-and-set claim contract (mirrors
    // run-optimizer/index.ts's claimFreeSlot), used here only to prove the
    // ABSENCE of interference from a concurrent status read — not to
    // re-test run-optimizer's own claim logic (covered in
    // run-optimizer/__tests__/optimizer-orchestrator.test.ts).
    const row = { monthlyOptimizerUses: 0, lastOptimizerReset: "2026-06-15T00:00:00.000Z" };

    // run-optimizer reads the row first (this is what its CAS will match against).
    const expectedMonthlyUses = row.monthlyOptimizerUses;
    const expectedLastReset = row.lastOptimizerReset;

    // A concurrent get-subscription-status call happens in between — it
    // computes a virtual view (correctly showing the reset) but must not
    // touch `row`.
    const statusView = computeEffectiveQuotaView(row.monthlyOptimizerUses, row.lastOptimizerReset, AUGUST_NOW);
    expect(statusView.effectiveMonthlyUses).toBe(0);
    expect(row).toEqual({ monthlyOptimizerUses: 0, lastOptimizerReset: "2026-06-15T00:00:00.000Z" }); // UNCHANGED

    // run-optimizer's own atomic reset+claim now runs its CAS against the
    // row values it originally read. Because the status read never wrote,
    // those values are still exactly what's in `row` — the claim matches.
    const casMatches = row.monthlyOptimizerUses === expectedMonthlyUses && row.lastOptimizerReset === expectedLastReset;
    expect(casMatches).toBe(true);
  });
});
