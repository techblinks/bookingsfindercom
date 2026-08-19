/**
 * Fallback copy shown on a /flights/:slug route page when there is no
 * published `seo_route_pages` row (BF-0R-3).
 *
 * This copy is static and hand-written, not AI-generated — but it is still
 * subject to the same trust rule as generated content: BookingsFinder has no
 * live fare, schedule, or booking-pattern data behind these pages, so nothing
 * here may assert a specific, externally-verifiable travel fact (a booking
 * window, a cheaper weekday, a savings percentage, etc). The previous
 * versions of this copy claimed "Book 6-8 weeks in advance", "Tuesday and
 * Wednesday flights tend to be cheaper" and "save you up to 40%" — none of
 * which BookingsFinder has ever sourced from anywhere. Kept here as its own
 * module (rather than inline in RoutePage.tsx) so the trust rule can be
 * checked directly by a test, the same convention as
 * run-optimizer/optimizer-core.ts and content-trust.ts.
 */

export interface FallbackTip {
  title: string;
  content: string;
}

/** Actionable behaviours only — no quantified or scheduled claim. */
export const fallbackRouteTips: FallbackTip[] = [
  { title: "Compare multiple dates", content: "Search a few different departure dates side by side to see how live fares vary." },
  { title: "Check nearby airports", content: "Nearby airports can open up additional live options for this route." },
  { title: "Set a price alert", content: "Track fare changes for this route and get notified when live prices move." },
  { title: "Search with flexible dates", content: "Widening your date range broadens the live options BookingsFinder can show you." },
  { title: "Compare providers side by side", content: "View live fares from multiple travel partners before choosing where to book." },
];

export const fallbackRouteFaqQuestion = (originCity: string, destinationCity: string) =>
  `When should I search for flights from ${originCity} to ${destinationCity}?`;

export const fallbackRouteFaqAnswer =
  "There's no single booking window that applies to every route or traveller. Search your dates directly on BookingsFinder to compare live options, and set a price alert to track changes over time.";
