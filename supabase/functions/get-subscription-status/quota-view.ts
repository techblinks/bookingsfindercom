/**
 * get-subscription-status's optimizer-quota VIEW logic — PR #65 round 4.
 *
 * Pure, no Deno globals, no network — the repo's existing convention for
 * exercising Edge Function logic directly under vitest (see
 * run-optimizer/auth-quota-core.ts, optimizer-orchestrator.ts).
 *
 * get-subscription-status must be READ-ONLY with respect to optimizer
 * quota. It previously performed its own unconditional
 * `monthly_optimizer_uses = 0, last_optimizer_reset = now()` UPDATE
 * whenever it decided a new month had started — a second, uncoordinated
 * writer to the exact durable state run-optimizer's compare-and-set claim
 * path depends on. A status read racing a concurrent run-optimizer claim
 * could silently clobber that claim's row, corrupting the "one Free
 * optimization per month" guarantee.
 *
 * run-optimizer remains the SOLE writer of optimizer quota fields — see
 * run-optimizer/index.ts `claimFreeSlot`/`refundFreeSlot`. This module only
 * ever computes a VIRTUAL effective value for display: if
 * `last_optimizer_reset` belongs to an earlier UTC calendar month, the
 * reported usage is 0 — nothing is written back to the row by this
 * function.
 *
 * UTC (not local time) is used for the same reason run-optimizer's
 * `computeNeedsReset` (optimizer-orchestrator.ts) uses UTC: a deterministic
 * month boundary that never depends on the Edge Function host's local
 * timezone, and — just as importantly — agrees with the exact boundary
 * run-optimizer itself uses, so a status read and a concurrent claim can
 * never disagree about whether "a new month" has started.
 */

export function computeNeedsReset(lastOptimizerReset: string | null | undefined, now: Date): boolean {
  if (!lastOptimizerReset) return true;
  const last = new Date(lastOptimizerReset);
  if (Number.isNaN(last.getTime())) return true;
  return (
    now.getUTCFullYear() !== last.getUTCFullYear() ||
    now.getUTCMonth() !== last.getUTCMonth()
  );
}

export interface EffectiveQuotaView {
  needsReset: boolean;
  effectiveMonthlyUses: number;
}

/**
 * The read-only view of stored quota state — never a write. `storedUses` is
 * whatever is currently in `user_profiles.monthly_optimizer_uses`; this
 * function never mutates it, only decides what value is HONEST to report.
 */
export function computeEffectiveQuotaView(
  storedUses: number | null | undefined,
  lastOptimizerReset: string | null | undefined,
  now: Date,
): EffectiveQuotaView {
  const needsReset = computeNeedsReset(lastOptimizerReset, now);
  return {
    needsReset,
    effectiveMonthlyUses: needsReset ? 0 : (storedUses || 0),
  };
}
