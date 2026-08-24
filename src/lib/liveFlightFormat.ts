/**
 * BF-FLIGHTS-LIVE-4 Phase G/L — formats SerpApi's provider-stated local
 * time strings (e.g. "2026-09-03 08:15") for display.
 *
 * Deliberately does NOT go through `new Date(raw)` — that reinterprets the
 * instant through the BROWSER's local timezone, which can show a different
 * wall-clock time than the airport actually stated (same reasoning as
 * FlightCard.tsx's formatProviderLocalTime for the cached Data API). This
 * parses the string directly instead, so a flight departing at 08:15 at
 * the origin airport always reads as 08:15, regardless of who's viewing
 * the page or where.
 */

const TIME_RE = /^\d{4}-\d{2}-\d{2}[ T](\d{2}):(\d{2})/;
const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})/;

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function formatLiveFlightClock(raw: string | null | undefined): string {
  if (!raw) return "--:--";
  const match = raw.match(TIME_RE);
  if (!match) return "--:--";
  return `${match[1]}:${match[2]}`;
}

export function formatLiveFlightDateLabel(raw: string | null | undefined): string {
  if (!raw) return "";
  const match = raw.match(DATE_RE);
  if (!match) return "";
  const month = MONTH_LABELS[Number(match[2]) - 1];
  if (!month) return "";
  return `${month} ${Number(match[3])}`;
}

/** True when the arrival date differs from the departure date (a "+1 day" style overnight indicator). */
export function isDifferentCalendarDay(departRaw: string | null | undefined, arriveRaw: string | null | undefined): boolean {
  if (!departRaw || !arriveRaw) return false;
  const dep = departRaw.match(DATE_RE);
  const arr = arriveRaw.match(DATE_RE);
  if (!dep || !arr) return false;
  return dep[0] !== arr[0];
}
