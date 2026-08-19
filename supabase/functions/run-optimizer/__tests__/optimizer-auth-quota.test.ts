/**
 * run-optimizer auth/quota integrity — BF-0R-4.
 *
 * External review found that run-optimizer treated the Authorization header
 * as optional: an anonymous caller fell through with userId=null,
 * userPlan="free", monthlyUses=0 — always under FREE_LIMIT — so the request
 * (and a real Travelpayouts provider call) proceeded, and no durable quota
 * was ever incremented for that caller. An anonymous caller could invoke the
 * function unlimited times.
 *
 * `evaluateOptimizerAuthState` and `evaluateOptimizerQuota` are pure (no
 * Deno globals, no network) so they are exercised directly here — the repo's
 * edge-function test convention (see optimizer-core.ts, admin-auth.ts). The
 * control-flow properties that only exist in index.ts's request handler (that
 * an auth rejection happens BEFORE any provider call, any optimizer_requests
 * write, or any service-role mutation) cannot be observed by importing Deno
 * server code into vitest, so they are proven the same way the sibling
 * optimizer-trust.test.ts proves index.ts properties: by asserting on the
 * relative source position of the auth gate versus those operations.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { evaluateOptimizerAuthState, evaluateOptimizerQuota } from "../auth-quota-core.ts";

const FN_DIR = join(__dirname, "..");
const indexSource = readFileSync(join(FN_DIR, "index.ts"), "utf8");
const authQuotaSource = readFileSync(join(FN_DIR, "auth-quota-core.ts"), "utf8");
const configSource = readFileSync(join(FN_DIR, "..", "..", "config.toml"), "utf8");

describe("1 & 2. evaluateOptimizerAuthState fails closed", () => {
  it("1. rejects a request with no Authorization header (missing auth)", () => {
    const result = evaluateOptimizerAuthState({
      hasAuthHeader: false,
      userId: null,
      userLookupError: false,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("2. rejects a request with an invalid/expired token (auth header present, lookup failed)", () => {
    const result = evaluateOptimizerAuthState({
      hasAuthHeader: true,
      userId: null,
      userLookupError: true,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("2b. rejects a request where getUser succeeded but returned no user id", () => {
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

describe("3 & 4. no provider call or request write on auth rejection (index.ts control flow)", () => {
  it("the auth gate's early return appears before the optimizer_requests insert", () => {
    const authGateIdx = indexSource.indexOf("evaluateOptimizerAuthState(");
    const insertIdx = indexSource.indexOf('.from("optimizer_requests")');
    expect(authGateIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(authGateIdx);
  });

  it("the auth gate's early return appears before the runOptimization (provider) call", () => {
    const authGateIdx = indexSource.indexOf("evaluateOptimizerAuthState(");
    const runOptIdx = indexSource.indexOf("const result = await runOptimization(");
    expect(authGateIdx).toBeGreaterThan(-1);
    expect(runOptIdx).toBeGreaterThan(authGateIdx);
  });

  it("an unresolved auth check returns a Response immediately, before any later statement", () => {
    // The gate must `return` inside `if (!authResult.ok)` — not merely log —
    // so nothing after it executes on failure.
    expect(indexSource).toMatch(/if \(!authResult\.ok\) \{\s*return new Response/);
  });
});

describe("5. no quota bypass via anonymous invocation", () => {
  it("an anonymous (auth-less) request can never reach the quota/plan logic", () => {
    // Regression guard for the exact original bug shape: userId defaulting to
    // null and silently proceeding. The auth gate must run, and fail closed,
    // before userPlan/monthlyUses are ever computed.
    const authGateIdx = indexSource.indexOf("const authResult = evaluateOptimizerAuthState(");
    const quotaIdx = indexSource.indexOf("evaluateOptimizerQuota(");
    expect(authGateIdx).toBeGreaterThan(-1);
    expect(quotaIdx).toBeGreaterThan(authGateIdx);
  });

  it("config.toml no longer sets verify_jwt = false for run-optimizer", () => {
    const block = configSource.match(/\[functions\.run-optimizer\][\s\S]{0,400}?verify_jwt = (true|false)/);
    expect(block).not.toBeNull();
    expect(block?.[1]).toBe("true");
  });
});

describe("6 & 9. authenticated free user gets the intended allowance, no bypass", () => {
  it("6. a fresh free user (0 uses) is allowed", () => {
    const quota = evaluateOptimizerQuota({
      plan: "free",
      monthlyUses: 0,
      freeLimit: 1,
      subscriptionStatus: null,
    });
    expect(quota).toEqual({ effectivePlan: "free", allowed: true });
  });

  it("9. inactive Pro subscription falls back to Free behaviour (and its limit)", () => {
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
});

describe("7. free user at limit gets the paywall before any provider call", () => {
  it("a free user who has used their allowance is denied", () => {
    const quota = evaluateOptimizerQuota({
      plan: "free",
      monthlyUses: 1,
      freeLimit: 1,
      subscriptionStatus: null,
    });
    expect(quota).toEqual({ effectivePlan: "free", allowed: false });
  });

  it("the paywall response (402) is returned before the optimizer_requests insert", () => {
    const paywallIdx = indexSource.indexOf('error: "paywall"');
    const insertIdx = indexSource.indexOf('.from("optimizer_requests")');
    expect(paywallIdx).toBeGreaterThan(-1);
    expect(insertIdx).toBeGreaterThan(paywallIdx);
  });
});

describe("8. active Pro subscription retains unlimited access", () => {
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

describe("17 (relocated). authentication, plan, subscription and quota rules are preserved", () => {
  it("index.ts still resolves the caller via supabase.auth.getUser(token) and the same tables", () => {
    expect(indexSource).toMatch(/supabase\.auth\.getUser\(token\)/);
    expect(indexSource).toMatch(/from\("user_profiles"\)/);
    expect(indexSource).toMatch(/from\("subscriptions"\)/);
  });

  it("the inactive-Pro downgrade rule now lives in auth-quota-core.ts, unchanged in meaning", () => {
    expect(authQuotaSource).toMatch(/\/\/ Downgrade if subscription not active/);
    expect(authQuotaSource).toMatch(/subscriptionStatus !== "active"/);
  });

  it("the FREE_LIMIT constant and the paywall status code are preserved in index.ts", () => {
    expect(indexSource).toMatch(/const FREE_LIMIT = 1;/);
    expect(indexSource).toMatch(/status: 402/);
    expect(indexSource).toMatch(/monthly_optimizer_uses: \(profile\.monthly_optimizer_uses \|\| 0\) \+ 1/);
  });

  it("the free-tier comparison now lives in auth-quota-core.ts, unchanged in meaning", () => {
    expect(authQuotaSource).toMatch(/allowed: input\.monthlyUses < input\.freeLimit/);
  });

  it("keeps the monthly usage reset behaviour", () => {
    expect(indexSource).toMatch(/last_optimizer_reset/);
    expect(indexSource).toMatch(/needsReset/);
  });
});
