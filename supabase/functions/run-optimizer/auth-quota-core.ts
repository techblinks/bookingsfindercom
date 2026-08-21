/**
 * run-optimizer auth/quota decision logic — BF-0R-4.
 *
 * Pure decision functions, no Deno globals and no network access, so the
 * vitest suite can exercise the real logic directly — the repo's edge-function
 * test convention (see optimizer-core.ts, admin-auth.ts).
 *
 * BF-0R-4 found that run-optimizer treated the Authorization header as
 * optional: an anonymous caller fell through with userId=null, userPlan="free"
 * and monthlyUses=0, which is always under FREE_LIMIT, so the request (and a
 * real Travelpayouts provider call) proceeded — with no durable quota ever
 * incremented for that caller. This module makes authentication mandatory
 * (`evaluateOptimizerAuthState`) and keeps the existing plan/quota decision
 * (`evaluateOptimizerQuota`) byte-for-byte equivalent to the prior inline
 * logic in index.ts, just extracted so it can be tested without a network
 * round-trip.
 */

/** Result of resolving the caller's identity from the Authorization header. */
export type OptimizerAuthResult =
  | { ok: true; userId: string }
  | { ok: false; status: 401; error: string };

/**
 * Pure decision logic, given already-resolved inputs — mirrors
 * `_shared/admin-auth.ts`'s `evaluateAdminAuthState`, minus the admin-role
 * requirement: run-optimizer is a customer feature, any authenticated user is
 * eligible, but NO caller may proceed without a valid, resolvable session.
 */
export function evaluateOptimizerAuthState(input: {
  hasAuthHeader: boolean;
  userId: string | null;
  userLookupError: boolean;
}): OptimizerAuthResult {
  if (!input.hasAuthHeader) {
    return { ok: false, status: 401, error: "Unauthorized: sign in to use the Trip Optimizer" };
  }
  if (input.userLookupError || !input.userId) {
    return { ok: false, status: 401, error: "Unauthorized: invalid or expired session" };
  }
  return { ok: true, userId: input.userId };
}

export type OptimizerPlan = "free" | "pro";

export interface QuotaDecisionInput {
  /** Raw stored plan value (user_profiles.plan), unvalidated. */
  plan: string;
  monthlyUses: number;
  freeLimit: number;
  /** subscriptions.status for a "pro" user; null when not looked up / not pro. */
  subscriptionStatus: string | null;
}

export interface QuotaDecision {
  /** The plan actually applied after the inactive-subscription downgrade. */
  effectivePlan: OptimizerPlan;
  /** Whether this request may proceed to the provider call. */
  allowed: boolean;
}

/**
 * Same rule the prior inline code applied: a "pro" plan is honoured only when
 * the linked subscription is "active"; otherwise it is treated as "free" and
 * subject to the FREE_LIMIT check. Pro (once confirmed active) is always
 * allowed — it never quota-limits.
 */
export function evaluateOptimizerQuota(input: QuotaDecisionInput): QuotaDecision {
  let effectivePlan: OptimizerPlan = input.plan === "pro" ? "pro" : "free";

  if (effectivePlan === "pro" && input.subscriptionStatus !== "active") {
    effectivePlan = "free"; // Downgrade if subscription not active
  }

  if (effectivePlan === "pro") {
    return { effectivePlan, allowed: true };
  }

  return { effectivePlan, allowed: input.monthlyUses < input.freeLimit };
}
