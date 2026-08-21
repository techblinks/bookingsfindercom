/**
 * run-optimizer auth/quota decision units — BF-0R-4.
 *
 * `evaluateOptimizerAuthState` and `evaluateOptimizerQuota` are pure (no Deno
 * globals, no network) so they are exercised directly here — the repo's
 * edge-function test convention (see optimizer-core.ts, admin-auth.ts).
 *
 * Round 1 of this fix (closing the anonymous quota bypass) originally proved
 * index.ts's control-flow ordering via source-position regex checks in this
 * file. Round 2 (PR #65 review: atomic quota claim/refund, fail-closed
 * profile/insert handling) moved that orchestration into
 * `optimizer-orchestrator.ts`, which — being Deno-global-free and taking its
 * I/O as injected dependencies — can be exercised with REAL mocked
 * orchestration tests instead of regex-on-source-text. Those real tests
 * (missing/invalid auth, fail-closed profile lookup, atomic claim under
 * genuine concurrent interleaving, insert-failure/refund, provider-outcome
 * refund, Pro/inactive-Pro behaviour) live in
 * `optimizer-orchestrator.test.ts`, which is now authoritative for those
 * properties. This file keeps only the still-accurate pure-unit coverage.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { evaluateOptimizerAuthState, evaluateOptimizerQuota } from "../auth-quota-core.ts";

const FN_DIR = join(__dirname, "..");
const configSource = readFileSync(join(FN_DIR, "..", "..", "config.toml"), "utf8");

describe("evaluateOptimizerAuthState fails closed", () => {
  it("rejects a request with no Authorization header (missing auth)", () => {
    const result = evaluateOptimizerAuthState({
      hasAuthHeader: false,
      userId: null,
      userLookupError: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects a request with an invalid/expired token (auth header present, lookup failed)", () => {
    const result = evaluateOptimizerAuthState({
      hasAuthHeader: true,
      userId: null,
      userLookupError: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("rejects a request where getUser succeeded but returned no user id", () => {
    const result = evaluateOptimizerAuthState({
      hasAuthHeader: true,
      userId: null,
      userLookupError: false,
    });
    expect(result.ok).toBe(false);
  });

  it("resolves the caller's user id on a genuine valid session", () => {
    const result = evaluateOptimizerAuthState({
      hasAuthHeader: true,
      userId: "user-123",
      userLookupError: false,
    });
    expect(result).toEqual({ ok: true, userId: "user-123" });
  });
});

describe("config.toml requires an authenticated session for run-optimizer", () => {
  it("verify_jwt = true for run-optimizer (not the false it shipped with)", () => {
    const block = configSource.match(/\[functions\.run-optimizer\][\s\S]{0,400}?verify_jwt = (true|false)/);
    expect(block).not.toBeNull();
    expect(block?.[1]).toBe("true");
  });
});

describe("evaluateOptimizerQuota — plan/limit decision", () => {
  it("a fresh free user (0 uses) is allowed", () => {
    const quota = evaluateOptimizerQuota({
      plan: "free",
      monthlyUses: 0,
      freeLimit: 1,
      subscriptionStatus: null,
    });
    expect(quota).toEqual({ effectivePlan: "free", allowed: true });
  });

  it("a free user who has used their allowance is denied", () => {
    const quota = evaluateOptimizerQuota({
      plan: "free",
      monthlyUses: 1,
      freeLimit: 1,
      subscriptionStatus: null,
    });
    expect(quota).toEqual({ effectivePlan: "free", allowed: false });
  });

  it("inactive Pro subscription falls back to Free behaviour (and its limit)", () => {
    const underLimit = evaluateOptimizerQuota({
      plan: "pro",
      monthlyUses: 0,
      freeLimit: 1,
      subscriptionStatus: "canceled",
    });
    expect(underLimit).toEqual({ effectivePlan: "free", allowed: true });

    const atLimit = evaluateOptimizerQuota({
      plan: "pro",
      monthlyUses: 1,
      freeLimit: 1,
      subscriptionStatus: "past_due",
    });
    expect(atLimit).toEqual({ effectivePlan: "free", allowed: false });
  });

  it("an active Pro user is always allowed, regardless of monthlyUses", () => {
    const quota = evaluateOptimizerQuota({
      plan: "pro",
      monthlyUses: 999,
      freeLimit: 1,
      subscriptionStatus: "active",
    });
    expect(quota).toEqual({ effectivePlan: "pro", allowed: true });
  });
});
