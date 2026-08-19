/**
 * generate-route-page core — trust model for AI route-page content (BF-0R-3).
 *
 * No Deno globals, no network, no database access — importable directly by
 * vitest, same convention as run-optimizer/optimizer-core.ts.
 *
 * There is currently no live fare/schedule/visa/weather feed wired into route
 * page generation (see content-trust.ts). Until one exists and is passed in
 * as supplied trusted context, the model may only write non-factual,
 * organisational copy about the route pair BookingsFinder already knows from
 * user input (city names, IATA codes): what BookingsFinder does, how to use
 * the search, and neutral non-quantified tips. It must never assert a fare,
 * airline, duration, schedule, booking window, cheapest day, savings
 * percentage, visa/weather fact or popularity/scarcity claim.
 */

export interface RouteRequest {
  origin_city: string;
  destination_city: string;
  origin_iata: string;
  destination_iata: string;
}

/**
 * Build the prompt sent to the model. Deliberately asks for editorial/
 * structural fields ONLY — no price, airline, duration, timing or savings
 * field is requested, and the instructions explicitly forbid inventing them.
 * `content-trust.ts` still re-validates the response; a compliant prompt is
 * not a substitute for that gate, only the first line of defense.
 */
export function buildRoutePagePrompt(route: RouteRequest): string {
  return `Generate SEO editorial copy for a "Flights from ${route.origin_city} (${route.origin_iata}) to ${route.destination_city} (${route.destination_iata})" comparison page on BookingsFinder, a flight comparison site.

BookingsFinder does not have live fare, schedule, airline or visa data for you to draw on. Do NOT state or imply any of the following, even as a generalisation or example — omit them entirely:
- a price, fare, price range, or currency amount
- named airlines or which airlines "serve" this route
- flight duration or non-stop/direct claims
- flight frequency or schedule
- best time to fly or book, or any booking-window advice (e.g. "X weeks in advance")
- cheapest day to fly or book
- savings percentages or discount claims
- weather, seasons, or climate
- visa or entry requirements
- popularity, "most popular", or scarcity/urgency claims ("limited seats", "book now")

Instead, write general, honest, non-factual editorial content: what BookingsFinder's comparison tool does, how searching and comparing works, and encouragement to search live results. Tips must be actionable behaviours, not factual claims (e.g. "Compare a few different dates side by side" is fine; "Tuesday flights are cheaper" is not).

Return JSON with these exact fields:
{
  "title": "SEO title under 60 chars mentioning the route",
  "metaDescription": "Meta description under 160 chars",
  "h1Title": "Engaging H1 with route name",
  "introParagraph": "2-3 sentence hook mentioning the route and airports, with no price or fact claims",
  "mainContent": "400-600 word article about using BookingsFinder to compare this route. Use ## subheadings.",
  "travelTips": [{"title": "Tip", "content": "1-2 sentence actionable, non-factual tip"}],
  "faqs": [{"question": "Question about USING the comparison tool for this route", "answer": "1-2 sentence answer that does not assert a travel fact"}],
  "relatedRoutes": [{"origin": "City", "destination": "City", "slug": "city-to-city"}]
}

Include 5 tips, 5 FAQs, and 4 related routes (well-known nearby or popular cities, not a factual claim).`;
}

export const ROUTE_GENERATION_SYSTEM_PROMPT =
  "You are an SEO editorial writer for a flight comparison site. You have no access to live travel data, so you never state prices, airlines, durations, schedules, booking-window advice, cheapest-day claims, savings percentages, weather, visa rules, or popularity/scarcity claims — you write only general, honest, non-factual editorial and navigational copy. Return only valid JSON, no markdown code blocks.";
