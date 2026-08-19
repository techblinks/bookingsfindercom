/**
 * run-optimizer atomic quota integrity — BF-0R-4 round 2 (PR #65 review).
 *
 * External review of the round-1 fix found the free-quota check was still
 * non-atomic and fail-open in three ways:
 *
 *   A. read → decide → insert → call-provider → increment-on-success is not
 *      atomic: two concurrent Free requests can both read monthlyUses=0,
 *      both pass the check, and both reach the real provider before either
 *      increments.
 *   B. a failed/absent user_profiles read silently defaulted to
 *      plan="free", monthlyUses=0 and let the request through.
 *   C. a failed optimizer_requests insert was logged and ignored, and the
 *      provider was called anyway.
 *
 * These are REAL mocked orchestration tests against `handleOptimizerRequest`
 * — not source-position regex checks — using a fake `OptimizerDbPort` whose
 * `claimFreeSlot` implements genuine compare-and-set semantics against a
 * shared in-memory store (mirroring the real Postgres UPDATE ... WHERE
 * matching the exact previously-read row: a concurrent winner's change is
 * always visible to the loser's WHERE check, so two callers reading the same
 * pre-claim state can never both succeed). Two `handleOptimizerRequest` calls
 * are run via `Promise.all` to exercise genuine microtask-level interleaving.
 *
 * No real Deno global, no real Supabase client, no real network call.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  handleOptimizerRequest,
  computeNeedsReset,
  FREE_LIMIT,
  type OptimizerDbPort,
  type OptimizerRequestInput,
  type ClaimSlotInput,
  type ClaimSlotResult,
  type ProfileRow,
} from "../optimizer-orchestrator.ts";
import type { OptimizerSuccess, OptimizerInsufficient, InsufficientReason } from "../optimizer-core.ts";

const NOW_ISO = "2026-08-19T12:00:00.000Z";
const NOW = () => new Date(NOW_ISO);
const CURRENT_MONTH_RESET = "2026-08-01T00:00:00.000Z"; // same UTC month as NOW
const STALE_RESET = "2026-06-15T00:00:00.000Z"; // an earlier UTC month

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
      store.set(input.userId, {
        ...row,
        monthlyOptimizerUses: newValue,
        lastOptimizerReset: input.needsReset ? input.nowIso : row.lastOptimizerReset,
      });
      return { claimed: true, newMonthlyUses: newValue };
    },

    async refundFreeSlot(userId: string, claimedValue: number) {
      const row = store.get(userId);
      if (!row || row.monthlyOptimizerUses !== claimedValue) return;
      store.set(userId, { ...row, monthlyOptimizerUses: Math.max(0, claimedValue - 1) });
    },

    async insertOptimizerRequest(userId: string, body: OptimizerRequestInput) {
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

  return { db, store, insertedRequests, insertedResults };
}

describe("computeNeedsReset — deterministic UTC calendar-month semantics", () => {
  it("is false within the same UTC month", () => {
    expect(computeNeedsReset(CURRENT_MONTH_RESET, NOW())).toBe(false);
  });
  it("is true across a UTC month boundary", () => {
    expect(computeNeedsReset(STALE_RESET, NOW())).toBe(true);
  });
});

describe("1 & 2. auth is mandatory and fails closed", () => {
  it("1. rejects a request with no Authorization header", async () => {
    const { db, insertedRequests } = createFakeDb();
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, NOW, null, REQUEST);
    expect(result.kind).toBe("auth-error");
    expect(provider).not.toHaveBeenCalled();
    expect(insertedRequests).toHaveLength(0);
  });

  it("2. rejects a request with an invalid/expired token", async () => {
    const { db } = createFakeDb();
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, NOW, "Bearer error-token", REQUEST);
    expect(result.kind).toBe("auth-error");
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("3 & 4. profile lookup fails CLOSED", () => {
  it("3. a missing user_profiles row fails closed (no provider call, no claim)", async () => {
    const { db, insertedRequests } = createFakeDb({ initialProfile: null });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    expect(result.kind).toBe("service-error");
    expect(provider).not.toHaveBeenCalled();
    expect(insertedRequests).toHaveLength(0);
  });

  it("4. a user_profiles query error fails closed, never defaults to free/0-uses access", async () => {
    const { db } = createFakeDb({ profileReadError: true });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    expect(result.kind).toBe("service-error");
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("5 & 6. two concurrent Free requests cannot both claim the single allowance", () => {
  it("only one of two simultaneous requests reaches the provider; the other is rejected", async () => {
    const { db, store } = createFakeDb({ initialProfile: { monthlyOptimizerUses: 0 } });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const [resultA, resultB] = await Promise.all([
      handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
      handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
    ]);

    const outcomes = [resultA, resultB];
    const successes = outcomes.filter((r) => r.kind === "outcome");
    const rejections = outcomes.filter((r) => r.kind === "paywall" || r.kind === "service-error");

    expect(provider).toHaveBeenCalledTimes(1);
    expect(successes).toHaveLength(1);
    expect(rejections).toHaveLength(1);
    // The single allowance was consumed exactly once, not twice.
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
  });
});

describe("7. Free user already at limit gets the paywall before any provider call", () => {
  it("rejects with paywall and never calls the provider or writes a request", async () => {
    const { db, insertedRequests } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: FREE_LIMIT },
    });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    expect(result.kind).toBe("paywall");
    expect(provider).not.toHaveBeenCalled();
    expect(insertedRequests).toHaveLength(0);
  });
});

describe("8 & 9. optimizer_requests insert failure fails closed and refunds the claim", () => {
  it("8. never calls the provider when the request insert fails", async () => {
    const { db } = createFakeDb({ initialProfile: { monthlyOptimizerUses: 0 }, requestInsertFails: true });
    const provider = vi.fn();
    const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    expect(result.kind).toBe("service-error");
    expect(provider).not.toHaveBeenCalled();
  });

  it("9. refunds the already-reserved Free claim after the insert failure", async () => {
    const { db, store } = createFakeDb({ initialProfile: { monthlyOptimizerUses: 0 }, requestInsertFails: true });
    await handleOptimizerRequest(db, vi.fn(), NOW, `Bearer ${VALID_TOKEN}`, REQUEST);
    // Claimed to 1, then refunded back to 0 — the traveller's allowance is intact.
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(0);
  });
});

describe("10-13. a non-'ok' provider outcome refunds the Free claim (never consumes the allowance)", () => {
  const reasons: InsufficientReason[] = [
    "provider_error",
    "provider_unavailable",
    "no_results",
    "unusable_results",
  ];

  for (const reason of reasons) {
    it(`refunds the claim on ${reason}, and writes NO result row (15. genuine-answer-only persistence)`, async () => {
      const { db, store, insertedResults } = createFakeDb({ initialProfile: { monthlyOptimizerUses: 0 } });
      const provider = vi.fn().mockResolvedValue(insufficient(reason));

      const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

      expect(result.kind).toBe("outcome");
      if (result.kind === "outcome") {
        expect(result.outcome.status).toBe("insufficient_live_data");
      }
      expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(0);
      // No fabricated/placeholder row can ever enter optimizer_results for a
      // no-data outcome — same BF-0R-2 rule, now also proven at the
      // orchestration level rather than only by source-text regex.
      expect(insertedResults).toHaveLength(0);
    });
  }
});

describe("14. a genuine successful provider result consumes exactly one claim", () => {
  it("keeps the claim (no refund) and persists the result", async () => {
    const { db, store, insertedResults } = createFakeDb({ initialProfile: { monthlyOptimizerUses: 0 } });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("outcome");
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
    expect(insertedResults).toHaveLength(1);
  });
});

describe("15. active Pro remains unlimited", () => {
  it("never claims a slot and always reaches the provider, regardless of monthlyUses", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { plan: "pro", monthlyOptimizerUses: 999 },
      subscriptionStatus: "active",
    });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

    expect(result.kind).toBe("outcome");
    expect(provider).toHaveBeenCalledTimes(1);
    // Untouched — Pro-active never goes through the claim/refund cycle.
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(999);
  });
});

describe("16. inactive Pro uses the exact same atomic Free-quota contract as Free", () => {
  it("is paywalled at the limit, exactly like a Free user", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { plan: "pro", monthlyOptimizerUses: FREE_LIMIT },
      subscriptionStatus: "past_due",
    });
    const provider = vi.fn();

    const result = await handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST);

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
      handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
      handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
    ]);

    expect(provider).toHaveBeenCalledTimes(1);
    expect([a.kind, b.kind].filter((k) => k === "outcome")).toHaveLength(1);
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
  });
});

describe("month reset + claim is one atomic decision", () => {
  it("two concurrent requests in a freshly-rolled-over month cannot both reset-and-claim", async () => {
    const { db, store } = createFakeDb({
      initialProfile: { monthlyOptimizerUses: 0, lastOptimizerReset: STALE_RESET },
    });
    const provider = vi.fn().mockResolvedValue(SUCCESS_OUTCOME);

    const [a, b] = await Promise.all([
      handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
      handleOptimizerRequest(db, provider, NOW, `Bearer ${VALID_TOKEN}`, REQUEST),
    ]);

    expect(provider).toHaveBeenCalledTimes(1);
    expect([a.kind, b.kind].filter((k) => k === "outcome")).toHaveLength(1);
    expect(store.get(VALID_USER)?.monthlyOptimizerUses).toBe(1);
    expect(store.get(VALID_USER)?.lastOptimizerReset).toBe(NOW_ISO);
  });
});
