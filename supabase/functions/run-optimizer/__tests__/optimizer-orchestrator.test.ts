/**
 * run-optimizer atomic quota integrity — BF-0R-4 rounds 2 & 3 (PR #65 review).
 *
 * Round 2 closed: read→decide→insert→call-provider→increment-on-success is
 * not atomic (concurrent-request race); a failed/absent user_profiles read
 * defaulted to free/0-uses access (fail-open); a failed optimizer_requests
 * insert still let the provider call through (fail-open).
 *
 * Round 3 closed a remaining ABA/month-boundary bug in the ROUND-2 fix
 * itself: `refundFreeSlot` guarded only `user_id` + `monthly_optimizer_uses`.
 * A request that claimed an August slot and was still awaiting the provider
 * when UTC September began — while a second request meanwhile performed the
 * September reset+claim, landing back on `monthly_optimizer_uses = 1` —
 * would have its stale refund match on the counter alone and silently zero
 * out the OTHER request's brand-new September claim. The fix: a successful
 * claim now returns a durable `QuotaClaimToken` (`monthlyOptimizerUses` AND
 * `lastOptimizerReset`, read back from the DB), and refund matches on the
 * complete token, so a stale refund's compare-and-set can only ever match
 * ZERO rows once the row has moved to a new quota generation.
 *
 * These are REAL mocked orchestration tests against `handleOptimizerRequest`
 * — not source-position regex checks — using a fake `OptimizerDbPort` whose
 * `claimFreeSlot`/`refundFreeSlot` implement genuine compare-and-set
 * semantics (including the full-token ABA guard) against a shared in-memory
 * store, mirroring the real Postgres `UPDATE ... WHERE` contract.
 *
 * No real Deno global, no real Supabase client, no real network call.
 */
import { describe, it, expect, vi } from "vitest";
import {
  handleOptimizerRequest,
  computeNeedsReset,
  FREE_LIMIT,
  type OptimizerDbPort,
  type OptimizerRequestInput,
  type ClaimSlotInput,
  type ClaimSlotResult,
  type QuotaClaimToken,
  type RefundResult,
  type ProfileRow,
} from "../optimizer-orchestrator.ts";
import type { OptimizerSuccess, OptimizerInsufficient, InsufficientReason } from "../optimizer-core.ts";

const AUGUST_ISO = "2026-08-19T12:00:00.000Z";
const AUGUST_NOW = () => new Date(AUGUST_ISO);
const CURRENT_MONTH_RESET = "2026-08-01T00:00:00.000Z"; // same UTC month as AUGUST_NOW
const STALE_RESET = "2026-06-15T00:00:00.000Z"; // an earlier UTC month

const SEPTEMBER_ISO = "2026-09-01T00:05:00.000Z";
const SEPTEMBER_NOW = () => new Date(SEPTEMBER_ISO);

const VALID_USER = "user-1";
const VALID_TOKEN = "valid-token";

const REQUEST: OptimizerRequestInput = {
  origin: "SYD",
  destination: "LHR",
  travelWindowStart: "2026-11-02",
  travelWindowEnd: "2026-11-20",
  hasBags: false,
  priority: "cheapest",
};

const SUCCESS_OUTCOME: OptimizerSuccess = {
  status: "ok",
  recommendedRoute: { summary: "SYD to LHR" },
  fare: 900,
  selectionCriterion: "price",
  priceContext: { optionsFound: 3, averagePrice: 950, lowestPrice: 900, highestPrice: 1000 },
  fareComparison: null,
  notes: [],
  affiliateLinks: [],
};

function insufficient(reason: InsufficientReason): OptimizerInsufficient {
  return { status: "insufficient_live_data", reason, message: "no data" };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (err: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

interface FakeStoreRow {
  plan: string;
  monthlyOptimizerUses: number;
  lastOptimizerReset: string;
}

interface FakeDbOptions {
  initialProfile?: Partial<FakeStoreRow> | null;
  subscriptionStatus?: string | null;
  profileReadError?: boolean;
  requestInsertFails?: boolean;
  requestInsertThrows?: boolean;
}

function createFakeDb(options: FakeDbOptions = {}) {
  const store = new Map<string, FakeStoreRow>();
  if (options.initialProfile !== null) {
    store.set(VALID_USER, {
      plan: options.initialProfile?.plan ?? "free",
      monthlyOptimizerUses: options.initialProfile?.monthlyOptimizerUses ?? 0,
      lastOptimizerReset: options.initialProfile?.lastOptimizerReset ?? CURRENT_MONTH_RESET,
    });
  }

  const insertedRequests: { userId: string; body: OptimizerRequestInput }[] = [];
  const insertedResults: { requestId: string; outcome: unknown }[] = [];
  const refundCalls: { userId: string; token: QuotaClaimToken }[] = [];
  let requestCounter = 0;

  const db: OptimizerDbPort = {
    async getUser(token: string) {
      if (token === "error-token") return { userId: null, error: true };
      if (token === VALID_TOKEN) return { userId: VALID_USER, error: false };
      return { userId: null, error: false };
    },

    async getProfile(userId: string): Promise<ProfileRow | null> {
      if (options.profileReadError) throw new Error("simulated query error");
      const row = store.get(userId);
      return row ? { ...row } : null;
    },

    async getSubscriptionStatus() {
      return options.subscriptionStatus ?? null;
    },

    async claimFreeSlot(input: ClaimSlotInput): Promise<ClaimSlotResult> {
      const row = store.get(input.userId);
      if (!row) return { claimed: false };
      // Compare-and-set: must match the exact row this caller read.
      if (
        row.monthlyOptimizerUses !== input.expectedMonthlyUses ||
        row.lastOptimizerReset !== input.expectedLastReset
      ) {
        return { claimed: false };
      }
      const newValue = input.needsReset ? 1 : input.expectedMonthlyUses + 1;
      const newReset = input.needsReset ? input.nowIso : row.lastOptimizerReset;
      store.set(input.userId, { ...row, monthlyOptimizerUses: newValue, lastOptimizerReset: newReset });
      return { claimed: true, token: { monthlyOptimizerUses: newValue, lastOptimizerReset: newReset } };
    },

    async refundFreeSlot(userId: string, token: QuotaClaimToken): Promise<RefundResult> {
      refundCalls.push({ userId, token });
      const row = store.get(userId);
      if (!row) return "stale";
      // Full-token compare-and-set — the round-3 ABA guard: BOTH the counter
      // AND the reset timestamp must match the row's current generation.
      if (row.monthlyOptimizerUses !== token.monthlyOptimizerUses || row.lastOptimizerReset !== token.lastOptimizerReset) {
        return "stale";
      }
      store.set(userId, { ...row, monthlyOptimizerUses: Math.max(0, token.monthlyOptimizerUses - 1) });
      return "refunded";
    },

    async insertOptimizerRequest(userId: string, body: OptimizerRequestInput) {
      if (options.requestInsertThrows) throw new Error("simulated insert exception");
      if (options.requestInsertFails) return null;
      requestCounter += 1;
      const id = `req-${requestCounter}`;
      insertedRequests.push({ userId, body });
      return { id };
    },

    async insertOptimizerResult(requestId: string, outcome: unknown) {
      insertedResults.push({ requestId, outcome });
    },
  };

  return { db, store, insertedRequests, insertedResults, refundCalls };
}

describe("computeNeedsReset — deterministic UTC calendar-month semantics", () => {
  it("is false within the same UTC month", () => {
    expect(computeNeedsReset(CURRENT_MONTH_RESET, AUGUST_NOW())).toBe(false);
  });
  it("is true across a UTC month boundary", () => {
    expect(computeNeedsReset(STALE_RESET, AUGUST_NOW())).toBe(true);
  });
});

describe("1 & 2. auth is mandatory and fails closed", () => {
  it("1. rejects a request with no Authorization header", async () => {
    const { db, insertedRequests } = createFakeDb();
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, null, REQUEST);
    expect(result.kind).toBe("auth-error");
    expect(provider).not.toHaveBeenCalled();
    expect(insertedRequests).toHaveLength(0);
  });

  it("2. rejects a request with an invalid/expired token", async () => {
    const { db } = createFakeDb();
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, "Bearer error-token", REQUEST);
    expect(result.kind).toBe("auth-error");
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("3 & 4. profile lookup fails CLOSED", () => {
  it("3. a missing user_profiles row fails closed (no provider call, no claim)", async () => {
    const { db, insertedRequests } = createFakeDb({ initialProfile: null });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    expect(result.kind).toBe("service-error");
    expect(provider).not.toHaveBeenCalled();
    expect(insertedRequests).toHaveLength(0);
  });

  it("4. a user_profiles query error fails closed, never defaults to free/0-uses access", async () => {
    const { db } = createFakeDb({ profileReadError: true });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    expect(result.kind).toBe("service-error");
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("5 & 6 (round 2). two concurrent Free requests cannot both claim the single allowance", () => {
  it("8. only one of two simultaneous requests reaches the provider; the other is rejected", async () => {
    const { db, store } = createFakeDb({ initialProfile: { monthlyOptimizerUses: 0 } });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const [resultA, resultB] = await Promise.all([
      handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
      handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
    ]);

    const outcomes = [resultA, resultB];
    const successes = outcomes.filter((r) => r.kind === "outcome");
    const rejections = outcomes.filter((r) => r.kind === "paywall" || r.kind === "service-error");

    expect(provider).toHaveBeenCalledTimes(1);
    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
  });
});

describe("7. Free user already at limit gets the paywall before any provider call", () => {
  it("rejects with paywall and never calls the provider or writes a request", async () => {
    const { db, insertedRequests } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: FREE_LIMIT },
    });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    expect(result.kind).toBe("paywall");
    expect(provider).not.toHaveBeenCalled();
    expect(insertedRequests).toHaveLength(0);
  });
});

describe("2. normal same-month optimizer_requests insert failure refunds the exact claim (1 -> 0)", () => {
  it("never calls the provider, and refunds via the exact token", async () => {
    const { db, store, refundCalls } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 0 },
      requestInsertFails: true,
    });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("service-error");
    expect(provider).not.toHaveBeenCalled();
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(0);
    expect(refundCalls).toHaveLength(1);
    expect(refundCalls[0].token).toEqual({ monthlyOptimizerUses: 1, lastOptimizerReset: CURRENT_MONTH_RESET });
  });
});

describe("1. normal same-month claim + provider no_results is refunded (1 -> 0), no result row written", () => {
  const reasons: InsufficientReason[] = [
    "provider_error",
    "provider_unavailable",
    "no_results",
    "unusable_results",
  ];

  for (const reason of reasons) {
    it(`refunds the exact claim on ${reason}, and writes NO result row (BF-0R-2 rule)`, async () => {
      const { db, store, insertedResults, refundCalls } = createFakeDb({
        initialProfile: { monthlyOptimizerUses: 0 },
      });
      const provider = vi.fn().mockResolvedValue(insufficient(reason));

      const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

      expect(result.kind).toBe("outcome");
      if (result.kind === "outcome") {
        expect(result.outcome.status).toBe("insufficient_live_data");
      }
      expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(0);
      expect(insertedResults).toHaveLength(0);
      expect(refundCalls[0].token).toEqual({ monthlyOptimizerUses: 1, lastOptimizerReset: CURRENT_MONTH_RESET });
    });
  }
});

describe("14 (round 2). a genuine successful provider result consumes exactly one claim", () => {
  it("keeps the claim (no refund) and persists the result", async () => {
    const { db, store, insertedResults, refundCalls } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 0 },
    });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("outcome");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
    expect(insertedResults).toHaveLength(1);
    expect(refundCalls).toHaveLength(0);
  });
});

describe("7 (round 3). active Pro continues to use no claim/refund token", () => {
  it("never claims a slot and always reaches the provider, regardless of monthlyUses", async () => {
    const { db, store, refundCalls } = createFakeDb({
      initialProfile: { plan: "pro", monthlyOptimizerUses: 999 },
      subscriptionStatus: "active",
    });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("outcome");
    expect(provider).toHaveBeenCalledTimes(1);
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(999);
    expect(refundCalls).toHaveLength(0);
  });
});

describe("10 (round 3). inactive Pro uses the exact same atomic Free-quota contract as Free", () => {
  it("is paywalled at the limit, exactly like a Free user", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { plan: "pro", monthlyOptimizerUses: FREE_LIMIT },
      subscriptionStatus: "past_due",
    });
    const provider = vi.fn();

    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("paywall");
    expect(provider).not.toHaveBeenCalled();
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(FREE_LIMIT);
  });

  it("only one of two simultaneous inactive-Pro requests can claim the allowance", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { plan: "pro", monthlyOptimizerUses: 0 },
      subscriptionStatus: "canceled",
    });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const [a, b] = await Promise.all([
      handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
      handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
    ]);

    expect(provider).toHaveBeenCalledTimes(1);
    expect([a.kind, b.kind].filter((k) => k === "outcome")).toHaveLength(1);
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
  });
});

describe("9 (round 3). fresh-month simultaneous reset+claim remains green", () => {
  it("two concurrent requests in a freshly-rolled-over month cannot both reset-and-claim", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 0, lastOptimizerReset: STALE_RESET },
    });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const [a, b] = await Promise.all([
      handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
      handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
    ]);

    expect(provider).toHaveBeenCalledTimes(1);
    expect([a.kind, b.kind].filter((k) => k === "outcome")).toHaveLength(1);
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
    expect(store.get(VALID_USER)?.lastOptimizerReset).toBe(AUGUST_ISO);
  });
});

describe("3. MONTH-BOUNDARY STALE PROVIDER REFUND (round 3 — the exact bug this PR fixes)", () => {
  it("A's stale old-month refund must NOT change B's new-month claim", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 0, lastOptimizerReset: CURRENT_MONTH_RESET },
    });

    // Request A claims the August slot, then hangs on the provider call.
    const providerA = deferred<OptimizerInsufficient>();
    const resultAPromise = handleOptimizerRequest(
      db,
      () => providerA.promise,
      AUGUST_NOW,
      `Bearer ${VALID_TOKEN}`,
      REQUEST,
    );
    // Let A run up to (and including) its claim + request insert + the
    // provider call it's now blocked on, before B starts.
    await vi.waitFor(() => expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1));
    expect(store.get(VALID_USER)?.lastOptimizerReset).toBe(CURRENT_MONTH_RESET);

    // UTC September begins. Request B runs to completion in the new month —
    // reads the CURRENT row (uses=1, reset=August), sees the month rolled
    // over, and atomically resets+claims: uses=1, reset=September.
    const resultB = await handleOptimizerRequest(
      db,
      vi.fn().mockResolvedValue(SUCCESS_OUTCOME),
      SEPTEMBER_NOW,
      `Bearer ${VALID_TOKEN}`,
      REQUEST,
    );
    expect(resultB.kind).toBe("outcome");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
    expect(store.get(VALID_USER)?.lastOptimizerReset).toBe(SEPTEMBER_ISO);

    // NOW A's provider call resolves with no data — A attempts to refund
    // its August token. It must be recognised as stale and change nothing.
    providerA.resolve(insufficient("no_results"));
    const resultA = await resultAPromise;

    expect(resultA.kind).toBe("outcome");
    // B's claim survives untouched — this is the whole point of the fix.
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
    expect(store.get(VALID_USER)?.lastOptimizerReset).toBe(SEPTEMBER_ISO);
  });
});

describe("4. equivalent stale-refund protection for request-insert compensation", () => {
  it("a request-insert failure whose quota generation has moved on refunds nothing (stale, not another claim)", async () => {
    const { db, store, refundCalls } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 0, lastOptimizerReset: CURRENT_MONTH_RESET },
    });

    // A claims the August slot successfully (uses=1, reset=August), but its
    // request-insert will fail.
    const claimResult = await db.claimFreeSlot({
      userId: VALID_USER,
      expectedMonthlyUses: 0,
      expectedLastReset: CURRENT_MONTH_RESET,
      needsReset: false,
      nowIso: AUGUST_ISO,
    });
    if (!claimResult.claimed) throw new Error("test setup: claim should have succeeded");
    const staleToken = claimResult.token;

    // The row moves on to a new (September) generation independently before
    // the stale refund is attempted — simulating "quota generation moved on
    // before compensation executes".
    store.set(VALID_USER, { plan: "free", monthlyOptimizerUses: 1, lastOptimizerReset: SEPTEMBER_ISO });

    const refundResult = await db.refundFreeSlot(VALID_USER, staleToken);

    expect(refundResult).toBe("stale");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
    expect(store.get(VALID_USER)?.lastOptimizerReset).toBe(SEPTEMBER_ISO);
    expect(refundCalls).toHaveLength(1);
  });
});

describe("5 & 6. a refund token must match BOTH fields exactly, or it matches zero rows", () => {
  it("5. correct counter but WRONG last_optimizer_reset matches zero rows", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 1, lastOptimizerReset: CURRENT_MONTH_RESET },
    });
    const result = await db.refundFreeSlot(VALID_USER, {
      monthlyOptimizerUses: 1,
      lastOptimizerReset: STALE_RESET, // wrong
    });
    expect(result).toBe("stale");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1); // untouched
  });

  it("6. correct last_optimizer_reset but WRONG counter matches zero rows", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 1, lastOptimizerReset: CURRENT_MONTH_RESET },
    });
    const result = await db.refundFreeSlot(VALID_USER, {
      monthlyOptimizerUses: 2, // wrong
      lastOptimizerReset: CURRENT_MONTH_RESET,
    });
    expect(result).toBe("stale");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1); // untouched
  });

  it("the correct, complete token DOES refund", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 1, lastOptimizerReset: CURRENT_MONTH_RESET },
    });
    const result = await db.refundFreeSlot(VALID_USER, {
      monthlyOptimizerUses: 1,
      lastOptimizerReset: CURRENT_MONTH_RESET,
    });
    expect(result).toBe("refunded");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(0);
  });
});

describe("defensive: an unexpected THROW after a Free claim still refunds the exact token", () => {
  it("callProvider throwing (not a typed failure) refunds the claim and fails safely", async () => {
    const { db, store, refundCalls } = createFakeDb({ initialProfile: { monthlyOptimizerUses: 0 } });
    const provider = vi.fn().mockRejectedValue(new Error("unexpected network explosion"));

    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("service-error");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(0);
    expect(refundCalls).toHaveLength(1);
    expect(refundCalls[0].token).toEqual({ monthlyOptimizerUses: 1, lastOptimizerReset: CURRENT_MONTH_RESET });
  });

  it("insertOptimizerRequest throwing (not returning null) refunds the claim and fails safely", async () => {
    const { db, store, refundCalls } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 0 },
      requestInsertThrows: true,
    });
    const provider = vi.fn();

    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("service-error");
    expect(provider).not.toHaveBeenCalled();
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(0);
    expect(refundCalls).toHaveLength(1);
  });

  it("active Pro is unaffected by a thrown provider error (no claim exists to refund)", async () => {
    const { db, refundCalls } = createFakeDb({
      initialProfile: { plan: "pro", monthlyOptimizerUses: 5 },
      subscriptionStatus: "active",
    });
    const provider = vi.fn().mockRejectedValue(new Error("boom"));

    const result = await handleOptimizerRequest(db, provider, AUGUST_NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("service-error");
    expect(refundCalls).toHaveLength(0);
  });
});
