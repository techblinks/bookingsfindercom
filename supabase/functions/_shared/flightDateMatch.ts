/**
 * Exact-date matching for cached Travelpayouts prices_for_dates results
 * (BF-0R-7 Phase D).
 *
 * Travelpayouts documents that prices_for_dates is served from a cache of
 * fares Aviasales users previously searched, and that when no cached result
 * exists for the exact requested dates, the provider may return the nearest
 * available date instead. A result whose calendar date differs from what
 * the traveller actually asked for is not a match for that search and must
 * not be presented as one — silently displaying a nearby-date price under
 * the requested date is exactly the kind of price mismatch this phase
 * exists to close.
 *
 * Both functions here are pure: no I/O, no Date object timezone math, so
 * they can be unit tested directly and reasoned about without a running
 * Edge Function.
 */

/**
 * Extract the calendar date (YYYY-MM-DD) from an ISO 8601 timestamp string
 * WITHOUT constructing a `Date` object.
 *
 * `Date` conversions apply either the host's local timezone or UTC
 * (depending on which methods are called), which can silently shift a
 * timestamp's stated calendar date across a day boundary — e.g.
 * "2026-09-03T23:30:00+11:00" becomes 2026-09-03 in UTC-relative terms but
 * is unambiguously the 3rd in the timestamp as written. Travelpayouts'
 * departure_at/return_at values carry the calendar date as the first 10
 * characters of the string (YYYY-MM-DD) regardless of any trailing time or
 * offset — that substring is the correct, timezone-safe answer, because it
 * is simply reading what the provider stated, not reinterpreting it.
 */
export function extractCalendarDate(isoTimestamp: string | null | undefined): string | null {
  if (!isoTimestamp) return null;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(isoTimestamp);
  return match ? match[1] : null;
}

export interface ExactDateMatchInput {
  /** Requested outbound date, YYYY-MM-DD. */
  requestedDepartureDate: string;
  /** Requested return date, YYYY-MM-DD. Omit/null for a one-way search. */
  requestedReturnDate?: string | null;
  /** Provider-returned outbound timestamp for this cached result. */
  providerDepartureAt: string | null | undefined;
  /** Provider-returned return timestamp for this cached result. Only meaningful for round trips. */
  providerReturnAt?: string | null;
}

/**
 * Decide whether one cached provider result actually matches the requested
 * search, per the BF-0R-7 Phase D rule:
 *
 * ONE WAY: the provider's departure calendar date must equal the requested
 * departure date.
 *
 * ROUND TRIP: the provider's departure calendar date must equal the
 * requested departure date AND the provider's return calendar date must
 * equal the requested return date. Both legs are checked — a result whose
 * outbound date matches but whose return date is for a different (nearest
 * cached) date is still not an exact match for what was asked.
 *
 * A missing/unparseable provider timestamp is never treated as a match —
 * fail closed rather than assume the provider silently agrees.
 */
export function isExactDateMatch(input: ExactDateMatchInput): boolean {
  const isRoundTrip = !!input.requestedReturnDate;

  const providerDepartureDate = extractCalendarDate(input.providerDepartureAt);
  if (!providerDepartureDate || providerDepartureDate !== input.requestedDepartureDate) {
    return false;
  }

  if (isRoundTrip) {
    const providerReturnDate = extractCalendarDate(input.providerReturnAt);
    if (!providerReturnDate || providerReturnDate !== input.requestedReturnDate) {
      return false;
    }
  }

  return true;
}
