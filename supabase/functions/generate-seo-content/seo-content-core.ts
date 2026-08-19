/**
 * generate-seo-content core — trust model for AI landing-page copy (BF-0R-3).
 *
 * No Deno globals, no network, no database access — importable directly by
 * vitest, same convention as run-optimizer/optimizer-core.ts.
 *
 * Same rule as route-generation-core.ts: no live fare/schedule/area/season
 * feed is wired into this generator, so the model may write only editorial
 * and navigational copy, never a fact it cannot source.
 */

export interface SeoContentRequest {
  origin: string;
  destination: string;
  type: "flights" | "hotels";
}

const SHARED_PROHIBITIONS = `Do NOT state or imply any of the following, even as a generalisation or example — omit them entirely:
- a price, fare, price range, or currency amount
- named airlines or hotel brands, or which ones "serve"/"operate here"
- flight duration, non-stop/direct claims, or flight/room availability
- schedule or frequency
- best time to fly/book/visit, or booking-window advice (e.g. "X weeks in advance")
- cheapest day to fly or book
- savings percentages or discount claims
- weather, seasons, or climate facts
- visa or entry requirements
- popularity, "most popular", or scarcity/urgency claims ("limited seats", "book now", "rooms selling fast")
- related, nearby, or popular cities/routes, or any other geography/catalogue relationship you were not explicitly given — you do not have a list of which places are genuinely nearby or popular, so do not invent one`;

export function buildFlightsPrompt(origin: string, destination: string): string {
  return `Generate SEO editorial copy for a "Flights from ${origin} to ${destination}" comparison page on BookingsFinder, a flight comparison site with no live fare, schedule, airline or visa data available to you.

${SHARED_PROHIBITIONS}

Instead, write general, honest, non-factual editorial content about using BookingsFinder's comparison tool for this route: what the tool does, how comparing options works, and encouragement to search live results. Tips must be actionable behaviours, not factual claims.

Return a JSON object with these exact fields:
{
  "title": "SEO title under 60 characters mentioning the route",
  "metaDescription": "Meta description under 160 characters",
  "h1Title": "H1 heading that includes the route",
  "introParagraph": "2-3 sentence intro paragraph with no price or fact claims",
  "mainContent": "400-600 word article about using BookingsFinder to compare this route. Use markdown ## subheadings.",
  "travelTips": [{"title": "Tip title", "content": "1-2 sentence actionable, non-factual tip"}],
  "faqs": [{"question": "Question about USING the comparison tool for this route", "answer": "1-2 sentence answer that does not assert a travel fact"}]
}

Include exactly 5 travel tips and 5 FAQs. Do not include any other fields.`;
}

export function buildHotelsPrompt(destination: string): string {
  return `Generate SEO editorial copy for a "Hotels in ${destination}" landing page on BookingsFinder, a travel comparison site with no live rates, availability, or seasonal data available to you.

${SHARED_PROHIBITIONS}

Instead, write general, honest, non-factual editorial content about using BookingsFinder's comparison tool for this destination: what the tool does, how comparing options works, and encouragement to search live results. Tips must be actionable behaviours, not factual claims (e.g. "Compare a few neighbourhoods side by side" is fine; "Peak season is June to August" is not).

Return a JSON object with these exact fields:
{
  "title": "SEO title under 60 characters mentioning the destination",
  "metaDescription": "Meta description under 160 characters",
  "h1Title": "H1 heading that mentions the destination",
  "introParagraph": "2-3 sentence intro paragraph with no price or fact claims",
  "mainContent": "400-600 word article about using BookingsFinder to compare hotels here. Use markdown ## subheadings.",
  "travelTips": [{"title": "Tip title", "content": "1-2 sentence actionable, non-factual tip"}],
  "faqs": [{"question": "Question about USING the comparison tool for this destination", "answer": "1-2 sentence answer that does not assert a travel fact"}]
}

Include exactly 5 travel tips and 5 FAQs. Do not include any other fields.`;
}

export const SEO_CONTENT_SYSTEM_PROMPT =
  "You are an SEO editorial writer for a travel comparison site. You have no access to live travel data, so you never state prices, brand/airline names, durations, schedules, booking-window advice, cheapest-day claims, savings percentages, weather, visa rules, or popularity/scarcity claims — you write only general, honest, non-factual editorial and navigational copy in British English. Return only valid JSON, no markdown code blocks.";
