/**
 * AI content trust/provenance core — BF-0R-3.
 *
 * This file deliberately contains NO Deno globals, NO network access and NO
 * database access so the vitest suite can import it directly (the repo's
 * edge-function test convention — same as run-optimizer/optimizer-core.ts,
 * tiqets-catalog/catalogue-core.ts and sitemap/sitemap-core.ts).
 *
 * CORE RULE: LLM REASONING IS NOT A FACT SOURCE.
 *
 * A travel fact may only reach a traveller when it comes from:
 *   A. genuine provider data,
 *   B. official/authoritative source data,
 *   C. deterministic derivation from A/B,
 *   D. explicit user input.
 *
 * Every AI content-generation entry point in this codebase (generate-route-page,
 * generate-seo-content) currently has NO connection to (A)/(B)/(C) — there is no
 * live fare feed, no airline schedule feed, no visa/weather feed wired into SEO
 * generation. Until one of those trusted sources actually exists and is passed
 * to the model as supplied context, the model may ONLY produce non-factual,
 * organisational/editorial copy: page titles, neutral hooks, navigational FAQs
 * about how to use BookingsFinder, and generic non-quantified tips. It may not
 * assert a fare, an airline, a duration, a schedule, a booking window, a
 * cheapest day, a savings percentage, a visa/entry rule, a weather fact, a
 * popularity claim, or any scarcity/urgency claim.
 *
 * This module is the provenance GATE: it scans model output for exactly those
 * unsourced-fact patterns and reports every violation found. Callers treat any
 * violation as a hard failure — the offending content is never written to the
 * database and never returned to a caller as though it were trustworthy. This
 * is defense-in-depth: the prompt sent to the model already asks for none of
 * this, but a model can ignore instructions, so nothing downstream may assume
 * compliance.
 */

/** One forbidden-fact category, with a human-readable reason for audit logs. */
interface ForbiddenPattern {
  category: string;
  pattern: RegExp;
}

// Every pattern is deliberately generic rather than an exhaustive fact
// database — the goal is to catch a model asserting the SHAPE of a travel
// fact (a price, a named airline, a duration, a booking-window claim, etc.),
// not to be a perfect classifier. False positives are acceptable here: the
// cost of over-rejecting AI editorial copy is far lower than the cost of
// publishing a fabricated travel fact.
const FORBIDDEN_PATTERNS: ForbiddenPattern[] = [
  // Fares / typical prices
  { category: "fare_or_price", pattern: /[$£€]\s?\d/ },
  { category: "fare_or_price", pattern: /\b\d+\s?(usd|gbp|eur|aud)\b/i },
  { category: "fare_or_price", pattern: /\btypical(ly)?\s+(price|fare|cost)/i },
  { category: "fare_or_price", pattern: /\b(price|fare)s?\s+(range|start|starting|from|around|between)\b/i },
  { category: "fare_or_price", pattern: /\baverage\s+(price|fare|cost)\b/i },

  // Airlines / carriers
  { category: "airline", pattern: /\bairlines?\s+(that\s+)?(serve|serving|operat\w*|fly|flying|offer)\b/i },
  {
    category: "airline",
    pattern: /\b(emirates|qantas|british airways|delta|united airlines|american airlines|lufthansa|ryanair|easyjet|singapore airlines|qatar airways|etihad|air france|klm|turkish airlines|cathay pacific|virgin australia|jetstar|air india|air canada|southwest airlines)\b/i,
  },

  // Duration / schedule / frequency
  { category: "duration_or_schedule", pattern: /\bflight\s+(duration|time)s?\s+(is|are|of|takes?)\b/i },
  { category: "duration_or_schedule", pattern: /\btakes?\s+(approximately|about|around)?\s?\d+\s?(hours?|hrs?|minutes?|mins?)\b/i },
  { category: "duration_or_schedule", pattern: /\b(daily|weekly|several)\s+flights?\b/i },
  { category: "duration_or_schedule", pattern: /\bflight\s+frequency\b/i },
  { category: "duration_or_schedule", pattern: /\bnon-?stop\b/i },
  { category: "duration_or_schedule", pattern: /\bdirect\s+flights?\s+(are\s+)?available\b/i },

  // Booking window / best time / cheapest day
  { category: "booking_window", pattern: /\bbest\s+time\s+to\s+(fly|book|travel)\b/i },
  { category: "booking_window", pattern: /\d+[-–]\d+\s*weeks?\s+(in\s+advance|ahead|before)/i },
  { category: "booking_window", pattern: /\bbook\s+\d+\s+(weeks?|months?)\s+(in\s+advance|ahead|before)/i },
  { category: "booking_window", pattern: /\b(tuesday|wednesday|thursday)s?\s+(are|tend to be|flights? are)\s+(often\s+)?cheaper\b/i },
  { category: "booking_window", pattern: /\bcheapest\s+day(s)?\s+to\s+(fly|book)\b/i },

  // Savings / discount percentages
  { category: "savings_percentage", pattern: /\bsave\s+(you\s+|money\s+)?(up\s+to\s+)?\d+\s?%/i },
  { category: "savings_percentage", pattern: /\d+\s?%\s+(off|cheaper|savings|discount|less)\b/i },

  // Weather
  { category: "weather", pattern: /\b(rainy season|dry season|average temperature|weather in|monsoon season)\b/i },

  // Visa / entry requirements
  { category: "visa_or_entry", pattern: /\bvisa\s+(is\s+)?(required|requirement|needed)\b/i },
  { category: "visa_or_entry", pattern: /\b(entry|passport)\s+requirement/i },

  // Popularity / scarcity / urgency
  { category: "popularity_or_scarcity", pattern: /\b(most|highly)\s+popular\s+(route|destination|time)\b/i },
  { category: "popularity_or_scarcity", pattern: /\blimited\s+(seats?|availability)\b/i },
  { category: "popularity_or_scarcity", pattern: /\bonly\s+\d+\s+(seats?|left|spots?)\b/i },
  { category: "popularity_or_scarcity", pattern: /\b(book now|act fast|selling fast|last chance|hurry)\b/i },
];

export interface Violation {
  category: string;
  /** The field the violation was found in (e.g. "mainContent", "faqs[2].answer"). */
  field: string;
  /** The matched snippet, for audit logging — never shown to end users. */
  excerpt: string;
}

/** Scan a single string for forbidden unsourced-fact patterns. */
export function scanTextForViolations(text: string, field: string): Violation[] {
  if (typeof text !== "string" || text.length === 0) return [];
  const violations: Violation[] = [];
  for (const { category, pattern } of FORBIDDEN_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      violations.push({ category, field, excerpt: match[0].slice(0, 80) });
    }
  }
  return violations;
}

/** The subset of model-generated route-page fields this gate inspects. */
export interface GeneratedRouteFields {
  title?: unknown;
  metaDescription?: unknown;
  h1Title?: unknown;
  introParagraph?: unknown;
  mainContent?: unknown;
  travelTips?: unknown;
  faqs?: unknown;
}

/**
 * Validate model output against the provenance gate.
 *
 * Returns every violation found across every field. An empty array means the
 * content contains none of the forbidden unsourced-fact patterns — it does
 * NOT mean the content is factually correct, only that it does not assert the
 * shape of a verifiable travel fact.
 */
export function validateGeneratedRouteContent(fields: GeneratedRouteFields): Violation[] {
  const violations: Violation[] = [];

  const scanScalar = (value: unknown, field: string) => {
    if (typeof value === "string") violations.push(...scanTextForViolations(value, field));
  };

  scanScalar(fields.title, "title");
  scanScalar(fields.metaDescription, "metaDescription");
  scanScalar(fields.h1Title, "h1Title");
  scanScalar(fields.introParagraph, "introParagraph");
  scanScalar(fields.mainContent, "mainContent");

  if (Array.isArray(fields.travelTips)) {
    fields.travelTips.forEach((tip, i) => {
      if (tip && typeof tip === "object") {
        scanScalar((tip as Record<string, unknown>).title, `travelTips[${i}].title`);
        scanScalar((tip as Record<string, unknown>).content, `travelTips[${i}].content`);
      } else {
        scanScalar(tip, `travelTips[${i}]`);
      }
    });
  }

  if (Array.isArray(fields.faqs)) {
    fields.faqs.forEach((faq, i) => {
      if (faq && typeof faq === "object") {
        scanScalar((faq as Record<string, unknown>).question, `faqs[${i}].question`);
        scanScalar((faq as Record<string, unknown>).answer, `faqs[${i}].answer`);
      }
    });
  }

  return violations;
}

/**
 * Generation-status vocabulary shared by generate-route-page and the admin
 * review UI. AI completion is NEVER, by itself, one of the terminal states
 * that implies a traveller can see the content — that only happens via
 * `PUBLISHED`, which is set exclusively by an explicit human action outside
 * this module.
 */
export const GenerationStatus = {
  PENDING: "pending",
  GENERATING: "generating",
  /** AI produced content that passed the provenance gate. Still unpublished. */
  GENERATED_PENDING_REVIEW: "generated_pending_review",
  /** AI produced content that FAILED the provenance gate. Content discarded. */
  FAILED_VALIDATION: "failed_validation",
  /** AI/provider error (network, parse, rate limit exhausted, etc). */
  FAILED: "failed",
  /** Set only by an explicit human publish action. */
  PUBLISHED: "published",
} as const;

export type GenerationStatusValue = (typeof GenerationStatus)[keyof typeof GenerationStatus];

/**
 * Decide the DB update for a completed generation attempt.
 *
 * This function is the single place that decides whether generated text is
 * allowed to reach `seo_route_pages`. It NEVER sets `is_published`; that
 * column is intentionally absent from its return type so a caller cannot
 * accidentally wire model output straight into publication.
 */
export function buildRouteGenerationUpdate(
  fields: GeneratedRouteFields,
): {
  generation_status: GenerationStatusValue;
  violations: Violation[];
  content: GeneratedRouteFields | null;
} {
  const violations = validateGeneratedRouteContent(fields);
  if (violations.length > 0) {
    return { generation_status: GenerationStatus.FAILED_VALIDATION, violations, content: null };
  }
  return { generation_status: GenerationStatus.GENERATED_PENDING_REVIEW, violations: [], content: fields };
}
