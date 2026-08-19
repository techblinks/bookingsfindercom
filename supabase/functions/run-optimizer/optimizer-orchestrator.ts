/**
 * run-optimizer orchestration — BF-0R-4 (PR #65 review round 2).
 *
 * Pure orchestration logic, no Deno globals and no real network/DB I/O — every
 * side effect is an injected async function (`OptimizerDbPort` + a provider
 * callback), so this module can be exercised with REAL mocked orchestration
 * tests under vitest (not just source-position regex checks on index.ts,
 * which cannot observe control-flow order). `index.ts` is a thin Deno adapter
 * that implements `OptimizerDbPort` against the real Supabase client and
 * calls `handleOptimizerRequest`.
 *
 * WHY THIS EXISTS (round 2 review): the round-1 fix closed the anonymous
 * bypass, but quota accounting was still:
 *
 *   1. read monthly_optimizer_uses
 *   2. decide monthlyUses < FREE_LIMIT
 *   3. insert optimizer_requests
 *   4. call Travelpayouts
 *   5. only on success: re-read and increment monthly_optimizer_uses
 *
 * Steps 1→4 are not atomic: two concurrent Free requests can both read
 * monthlyUses=0, both pass the check, and both reach the provider before
 * either increments — "one Free optimization per month" was not actually
 * enforced. A failed `user_profiles` lookup silently left plan="free",
 * monthlyUses=0 and let the request through (fail-OPEN). A failed
 * `optimizer_requests` insert was logged and ignored, and the provider was
 * called anyway.
 *
 * THIS MODULE'S CONTRACT:
 *
 *   - Free/inactive-Pro: a quota slot must be atomically CLAIMED (via a
 *     Postgres compare-and-set UPDATE against the exact row values just
 *     read — no new migration/RPC needed) BEFORE optimizer_requests is
 *     written or the provider is called. Two concurrent requests reading the
 *     same pre-claim state can never both win the CAS: Postgres re-evaluates
 *     an UPDATE's WHERE clause against the current committed row after
 *     acquiring the row lock, so the loser's WHERE simply no longer matches
 *     and it gets zero rows back, deterministically.
 *   - The month-reset transition and the claim are ONE compare-and-set
 *     (matching `last_optimizer_reset` as read), so two concurrent requests
 *     in a freshly-rolled-over month cannot both reset-and-claim.
 *   - A failed/missing profile read FAILS CLOSED (no claim, no provider call).
 *   - A failed optimizer_requests insert REFUNDS the already-claimed slot and
 *     returns without calling the provider.
 *   - A non-"ok" provider outcome (provider_error / provider_unavailable /
 *     no_results / unusable_results) REFUNDS the claim — insufficient live
 *     data must never consume the traveller's Free allowance (an existing
 *     product rule, now made durable/atomic rather than "increment only
 *     happens after a stored result").
 *   - Active Pro (subscription status "active") is never quota-limited and
 *     never goes through the claim/refund cycle — unchanged behaviour.
 */
import {
  evaluateOptimizerAuthState,
  evaluateOptimizerQuota,
  type OptimizerPlan,
} from "./auth-quota-core.ts";
import type { OptimizerOutcome, OptimizerSuccess } from "./optimizer-core.ts";

export const FREE_LIMIT = 1;

export interface OptimizerRequestInput {
  origin: string;
  destination: string;
  travelWindowStart: string;
  travelWindowEnd?: string;
  hasBags: boolean;
  priority: "cheapest" | "fastest" | "low_risk";
}

/** The real outcome shape produced by `optimizer-core.ts`'s trust model. */
export type ProviderOutcome = OptimizerOutcome;
export type ProviderOutcomeOk = OptimizerSuccess;

export interface ProfileRow {
  plan: string;
  monthlyOptimizerUses: number;
  /** ISO timestamp string. The column is NOT NULL in the schema. */
  lastOptimizerReset: string;
}

export interface ClaimSlotInput {
  userId: string;
  /** The exact monthly_optimizer_uses value this request read (CAS guard). */
  expectedMonthlyUses: number;
  /** The exact last_optimizer_reset value this request read (CAS guard). */
  expectedLastReset: string;
  /** Whether the calendar month has rolled over since expectedLastReset. */
  needsReset: boolean;
  nowIso: string;
}

export type ClaimSlotResult =
  | { claimed: true; newMonthlyUses: number }
  | { claimed: false };

export interface OptimizerDbPort {
  /** Resolves the caller's user id from a bearer token. */
  getUser(token: string): Promise<{ userId: string | null; error: boolean }>;
  /**
   * Reads the profile row. `null` = no row (fail closed). Rejecting the
   * returned promise signals a genuine query error (also fail closed) —
   * callers must not swallow it into a default "free, 0 uses" state.
   */
  getProfile(userId: string): Promise<ProfileRow | null>;
  getSubscriptionStatus(userId: string): Promise<string | null>;
  /** Atomic compare-and-set claim. See module header for the race guarantee. */
  claimFreeSlot(input: ClaimSlotInput): Promise<ClaimSlotResult>;
  /** Best-effort, safe-to-attempt-once refund of a slot this request claimed. */
  refundFreeSlot(userId: string, claimedValue: number): Promise<void>;
  insertOptimizerRequest(
    userId: string,
    body: OptimizerRequestInput,
  ): Promise<{ id: string } | null>;
  insertOptimizerResult(requestId: string, outcome: ProviderOutcomeOk): Promise<void>;
}

export type OptimizerHandlerResult =
  | { kind: "auth-error"; status: 401; body: { error: string } }
  | { kind: "validation-error"; status: 400; body: { error: string } }
  | { kind: "paywall"; body: { error: "paywall"; message: string; upgradeUrl: string } }
  | { kind: "service-error"; status: 503 | 409; body: { error: string } }
  | { kind: "outcome"; outcome: ProviderOutcome };

const PAYWALL_BODY = {
  error: "paywall" as const,
  message: "You've used your free optimization this month. Upgrade to Pro for unlimited optimizations.",
  upgradeUrl: "/pricing",
};

const PROFILE_UNAVAILABLE_MESSAGE =
  "We couldn't verify your account right now. Please try again in a moment.";

/**
 * Deterministic UTC calendar-month comparison — never depends on the
 * runtime's local timezone, so this is safe to unit-test and safe regardless
 * of what timezone the Edge Function's host happens to run in.
 */
export function computeNeedsReset(lastOptimizerReset: string, now: Date): boolean {
  const last = new Date(lastOptimizerReset);
  if (Number.isNaN(last.getTime())) return true;
  return (
    now.getUTCFullYear() !== last.getUTCFullYear() ||
    now.getUTCMonth() !== last.getUTCMonth()
  );
}

function resolveEffectivePlanAndAllowance(
  profile: ProfileRow,
  subscriptionStatus: string | null,
  needsReset: boolean,
): { effectivePlan: OptimizerPlan; allowed: boolean; monthlyUsesForDecision: number } {
  const monthlyUsesForDecision = needsReset ? 0 : profile.monthlyOptimizerUses;
  const decision = evaluateOptimizerQuota({
    plan: profile.plan,
    monthlyUses: monthlyUsesForDecision,
    freeLimit: FREE_LIMIT,
    subscriptionStatus,
  });
  return { ...decision, monthlyUsesForDecision };
}

/**
 * Attempt to atomically claim one Free slot for `profile`, retrying at most
 * once against freshly-read state if the first compare-and-set loses a race.
 * Returns the claimed value, or a rejection result (paywall / service error)
 * if the slot cannot be claimed.
 */
async function claimWithSingleRetry(
  db: OptimizerDbPort,
  userId: string,
  profile: ProfileRow,
  subscriptionStatus: string | null,
  needsReset: boolean,
  nowIso: string,
): Promise<
  | { ok: true; claimedValue: number | null }
  | { ok: false; result: OptimizerHandlerResult }
> {
  const first = await db.claimFreeSlot({
    userId,
    expectedMonthlyUses: profile.monthlyOptimizerUses,
    expectedLastReset: profile.lastOptimizerReset,
    needsReset,
    nowIso,
  });
  if (first.claimed) return { ok: true, claimedValue: first.newMonthlyUses };

  // Lost the race — re-read and recompute against the NOW-current state.
  let fresh: ProfileRow | null;
  try {
    fresh = await db.getProfile(userId);
  } catch {
    return {
      ok: false,
      result: { kind: "service-error", status: 503, body: { error: PROFILE_UNAVAILABLE_MESSAGE } },
    };
  }
  if (!fresh) {
    return {
      ok: false,
      result: { kind: "service-error", status: 503, body: { error: PROFILE_UNAVAILABLE_MESSAGE } },
    };
  }

  const freshNeedsReset = computeNeedsReset(fresh.lastOptimizerReset, new Date(nowIso));
  const freshDecision = resolveEffectivePlanAndAllowance(fresh, subscriptionStatus, freshNeedsReset);

  if (freshDecision.effectivePlan !== "free") {
    // The winner of the race made this account Pro/active in the meantime —
    // vanishingly unlikely, but correctly means no Free claim is needed.
    return { ok: true, claimedValue: null };
  }
  if (!freshDecision.allowed) {
    return { ok: false, result: { kind: "paywall", body: PAYWALL_BODY } };
  }

  const second = await db.claimFreeSlot({
    userId,
    expectedMonthlyUses: fresh.monthlyOptimizerUses,
    expectedLastReset: fresh.lastOptimizerReset,
    needsReset: freshNeedsReset,
    nowIso,
  });
  if (second.claimed) return { ok: true, claimedValue: second.newMonthlyUses };

  // Two consecutive lost races: reject rather than loop. With FREE_LIMIT=1
  // this means a third concurrent request collided with two others — treat
  // it the same as "please try again" rather than risking a livelock.
  return {
    ok: false,
    result: { kind: "service-error", status: 409, body: { error: "Please try again." } },
  };
}

export async function handleOptimizerRequest(
  db: OptimizerDbPort,
  callProvider: (request: OptimizerRequestInput) => Promise<ProviderOutcome>,
  now: () => Date,
  authHeader: string | null,
  body: OptimizerRequestInput,
): Promise<OptimizerHandlerResult> {
  if (!body.origin || !body.destination || !body.travelWindowStart) {
    return {
      kind: "validation-error",
      status: 400,
      body: { error: "Missing required fields: origin, destination, travelWindowStart" },
    };
  }

  // ── Auth (BF-0R-4): mandatory, fail-closed. ─────────────────────────────
  const hasAuthHeader = authHeader?.startsWith("Bearer ") ?? false;
  let userId: string | null = null;
  let userLookupError = false;
  if (hasAuthHeader) {
    const token = authHeader!.replace("Bearer ", "");
    const resolved = await db.getUser(token);
    userId = resolved.userId;
    userLookupError = resolved.error;
  }
  const authResult = evaluateOptimizerAuthState({ hasAuthHeader, userId, userLookupError });
  if (!authResult.ok) {
    return { kind: "auth-error", status: 401, body: { error: authResult.error } };
  }
  const uid = authResult.userId;

  // ── Profile (BF-0R-4 round 2): fail CLOSED on any lookup problem. ───────
  let profile: ProfileRow | null;
  try {
    profile = await db.getProfile(uid);
  } catch {
    return { kind: "service-error", status: 503, body: { error: PROFILE_UNAVAILABLE_MESSAGE } };
  }
  if (!profile) {
    return { kind: "service-error", status: 503, body: { error: PROFILE_UNAVAILABLE_MESSAGE } };
  }

  let subscriptionStatus: string | null = null;
  if (profile.plan === "pro") {
    subscriptionStatus = await db.getSubscriptionStatus(uid);
  }

  const nowDate = now();
  const needsReset = computeNeedsReset(profile.lastOptimizerReset, nowDate);
  const decision = resolveEffectivePlanAndAllowance(profile, subscriptionStatus, needsReset);

  let claimedValue: number | null = null;

  if (decision.effectivePlan === "free") {
    if (!decision.allowed) {
      return { kind: "paywall", body: PAYWALL_BODY };
    }
    const claim = await claimWithSingleRetry(
      db,
      uid,
      profile,
      subscriptionStatus,
      needsReset,
      nowDate.toISOString(),
    );
    if (!claim.ok) return claim.result;
    claimedValue = claim.claimedValue;
  }
  // effectivePlan === "pro" (active): no claim needed, unlimited, unchanged.

  // ── Record the request. Only after any Free slot is durably claimed. ───
  const requestRow = await db.insertOptimizerRequest(uid, body);
  if (!requestRow) {
    if (claimedValue !== null) {
      await db.refundFreeSlot(uid, claimedValue);
    }
    return {
      kind: "service-error",
      status: 503,
      body: { error: "Unable to record your request. Please try again." },
    };
  }

  const outcome = await callProvider(body);

  if (outcome.status !== "ok") {
    // Insufficient live data must never consume the Free allowance.
    if (claimedValue !== null) {
      await db.refundFreeSlot(uid, claimedValue);
    }
    return { kind: "outcome", outcome };
  }

  await db.insertOptimizerResult(requestRow.id, outcome);
  // Quota was already durably claimed before the provider call — no separate
  // "increment on success" step. A genuine successful result simply keeps
  // the claim (no refund), consuming exactly the one slot it reserved.
  return { kind: "outcome", outcome };
}
