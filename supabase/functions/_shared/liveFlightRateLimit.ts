/**
 * BF-FLIGHTS-LIVE-4 Phase F — minimal in-memory cost/abuse guard for
 * search-live-flights and get-live-flight-booking-options (both call a
 * paid upstream API).
 *
 * Audit finding: grepped every supabase/functions/**\/*.ts for
 * rate-limit/throttle/abuse — no inbound per-caller limiter exists
 * anywhere in this repo today. The only hits (check-price-alerts) are that
 * function's own OUTBOUND self-throttling sleep(500) between ITS calls to
 * Travelpayouts, a different concern. There is nothing existing to reuse.
 *
 * Phase F says not to invent a DB migration unless required, so this is a
 * module-scope, in-memory guard — not a persisted one.
 *
 * Honest limitation (documented, not hidden): Supabase Edge Functions can
 * run as multiple concurrent isolates, and any isolate can cold-start with
 * fresh module state. This only bounds abuse WITHIN one warm isolate — a
 * real cost control for the common case (repeated requests hitting the
 * same warm instance) but not a cross-instance guarantee. A durable,
 * cross-instance limit would need shared state (a DB table or KV store),
 * deliberately not built here. See the STOP-BEFORE-COMMIT report.
 *
 * DEPLOYMENT BLOCKER / FOLLOW-UP — BF-FLIGHTS-LIVE-RATE-1: before this
 * function sees substantial public traffic, a durable, cross-instance
 * request-budget enforcement mechanism (shared DB table or KV-backed
 * counter) should replace/augment this in-memory guard. Do not treat the
 * per-isolate limits here as a sufficient production cost control on
 * their own.
 */

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_KEY_PER_WINDOW = 6;
const MAX_CONCURRENT_REQUESTS = 20;
const IDENTICAL_REQUEST_COOLDOWN_MS = 5_000;

interface WindowState {
  count: number;
  windowStart: number;
}

const requestWindows = new Map<string, WindowState>();
const recentRequestKeys = new Map<string, number>();
let concurrentRequests = 0;
let callsSinceSweep = 0;

/** Opportunistic cleanup (no setInterval — avoids leaving a dangling timer
 * behind in tests / short-lived isolates). Runs every 50 calls. */
function sweepIfDue(now: number) {
  callsSinceSweep += 1;
  if (callsSinceSweep < 50) return;
  callsSinceSweep = 0;

  for (const [key, state] of requestWindows) {
    if (now - state.windowStart > WINDOW_MS * 2) requestWindows.delete(key);
  }
  for (const [key, ts] of recentRequestKeys) {
    if (now - ts > IDENTICAL_REQUEST_COOLDOWN_MS * 2) recentRequestKeys.delete(key);
  }
}

/** Supabase Edge Functions (Deno Deploy) set x-forwarded-for to the real
 * client IP. Falls back to a constant so a missing header degrades to one
 * shared bucket rather than an unlimited bypass. */
export function getClientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : null;
  return ip || "unknown";
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RateLimitError";
  }
}

/** Caps requests per client per rolling window — the primary defence against a request storm from one caller. */
export function checkRateLimit(clientKey: string): void {
  const now = Date.now();
  sweepIfDue(now);
  const state = requestWindows.get(clientKey);

  if (!state || now - state.windowStart > WINDOW_MS) {
    requestWindows.set(clientKey, { count: 1, windowStart: now });
    return;
  }

  if (state.count >= MAX_REQUESTS_PER_KEY_PER_WINDOW) {
    throw new RateLimitError("Too many live flight searches. Please wait a moment and try again.");
  }

  state.count += 1;
}

/** Rejects the exact same client re-sending the exact same search/booking-token request within a short cooldown. */
export function checkIdenticalRequest(clientKey: string, fingerprint: string): void {
  const key = `${clientKey}:${fingerprint}`;
  const now = Date.now();
  const last = recentRequestKeys.get(key);

  if (last && now - last < IDENTICAL_REQUEST_COOLDOWN_MS) {
    throw new RateLimitError("This exact search was just requested. Please wait a moment before retrying.");
  }

  recentRequestKeys.set(key, now);
}

/** Caps how many upstream calls can be in flight at once across this isolate. */
export function acquireConcurrencySlot(): void {
  if (concurrentRequests >= MAX_CONCURRENT_REQUESTS) {
    throw new RateLimitError("Live flight search is at capacity. Please try again shortly.");
  }
  concurrentRequests += 1;
}

export function releaseConcurrencySlot(): void {
  concurrentRequests = Math.max(0, concurrentRequests - 1);
}

/** Test-only: resets all module-scope state between test cases. */
export function __resetLiveFlightRateLimitForTests(): void {
  requestWindows.clear();
  recentRequestKeys.clear();
  concurrentRequests = 0;
  callsSinceSweep = 0;
}
