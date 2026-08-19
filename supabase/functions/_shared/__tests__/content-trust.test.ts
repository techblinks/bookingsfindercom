/**
 * content-trust provenance gate — BF-0R-3.
 *
 * Pure-function tests, no network/DB. Mirrors the repo's edge-function test
 * convention (see run-optimizer/__tests__/optimizer-trust.test.ts).
 *
 * CORE RULE UNDER TEST: LLM REASONING IS NOT A FACT SOURCE. Model output that
 * asserts the shape of a fare, airline, duration, schedule, booking-window,
 * cheapest-day, savings-percentage, weather, visa, or popularity/scarcity
 * claim must be caught by this gate, regardless of which field it appears in.
 */
import { describe, it, expect } from "vitest";
import {
  scanTextForViolations,
  validateGeneratedRouteContent,
  buildRouteGenerationUpdate,
  GenerationStatus,
  isRegenerationBlocked,
  type GeneratedRouteFields,
} from "../content-trust.ts";

const CLEAN_FIELDS: GeneratedRouteFields = {
  title: "Flights from London to Dubai | BookingsFinder",
  metaDescription: "Compare live flight options from London to Dubai on BookingsFinder.",
  h1Title: "Flights from London to Dubai",
  introParagraph: "Search and compare flight options from London to Dubai using BookingsFinder's comparison tool.",
  mainContent: "## How to compare flights\nUse BookingsFinder to search live results and compare providers side by side.",
  travelTips: [
    { title: "Compare dates", content: "Search a few different dates to see how live options vary." },
    { title: "Set an alert", content: "Track fare changes for this route over time." },
  ],
  faqs: [
    { question: "How do I search this route?", answer: "Enter your dates on BookingsFinder to see live results." },
  ],
};

describe("scanTextForViolations", () => {
  it("returns no violations for empty or non-string input", () => {
    expect(scanTextForViolations("", "field")).toEqual([]);
  });

  it("flags a currency amount", () => {
    expect(scanTextForViolations("Fares from $450 return.", "intro").length).toBeGreaterThan(0);
  });

  it("flags a typical-price claim", () => {
    expect(scanTextForViolations("The typical price for this route is moderate.", "intro").length).toBeGreaterThan(0);
  });

  it("flags a named airline", () => {
    expect(scanTextForViolations("Emirates operates this route.", "main").length).toBeGreaterThan(0);
  });

  it("flags an 'airlines serving' claim without naming one", () => {
    expect(scanTextForViolations("Several airlines serving this route offer good options.", "main").length).toBeGreaterThan(0);
  });

  it("flags a flight duration claim", () => {
    expect(scanTextForViolations("The flight takes approximately 14 hours.", "main").length).toBeGreaterThan(0);
  });

  it("flags a best-time-to-fly claim", () => {
    expect(scanTextForViolations("The best time to fly is during shoulder season.", "main").length).toBeGreaterThan(0);
  });

  it("flags a booking-window claim", () => {
    expect(scanTextForViolations("Book 6-8 weeks in advance for the best fares.", "tip").length).toBeGreaterThan(0);
  });

  it("flags a cheapest-day claim", () => {
    expect(scanTextForViolations("Tuesday flights are often cheaper.", "tip").length).toBeGreaterThan(0);
  });

  it("flags a savings-percentage claim", () => {
    expect(scanTextForViolations("Flexible dates can save you up to 40%.", "tip").length).toBeGreaterThan(0);
  });

  it("flags a weather claim", () => {
    expect(scanTextForViolations("Avoid the rainy season for a better trip.", "main").length).toBeGreaterThan(0);
  });

  it("flags a visa claim", () => {
    expect(scanTextForViolations("A visa is required for entry.", "main").length).toBeGreaterThan(0);
  });

  it("flags a scarcity/urgency claim", () => {
    expect(scanTextForViolations("Only 3 seats left — book now!", "tip").length).toBeGreaterThan(0);
  });

  it("does not flag neutral, non-factual editorial copy", () => {
    expect(scanTextForViolations(CLEAN_FIELDS.mainContent as string, "main")).toEqual([]);
    expect(scanTextForViolations(CLEAN_FIELDS.introParagraph as string, "intro")).toEqual([]);
  });
});

describe("validateGeneratedRouteContent", () => {
  it("returns no violations for entirely clean fields", () => {
    expect(validateGeneratedRouteContent(CLEAN_FIELDS)).toEqual([]);
  });

  it("scans nested travelTips content and title", () => {
    const violations = validateGeneratedRouteContent({
      ...CLEAN_FIELDS,
      travelTips: [{ title: "Book early", content: "Book 6-8 weeks in advance for the best fares." }],
    });
    expect(violations.some(v => v.field === "travelTips[0].content")).toBe(true);
  });

  it("scans nested faqs question and answer", () => {
    const violations = validateGeneratedRouteContent({
      ...CLEAN_FIELDS,
      faqs: [{ question: "Which airlines fly this route?", answer: "Emirates and Qantas both fly this route." }],
    });
    expect(violations.some(v => v.field === "faqs[0].question")).toBe(true);
    expect(violations.some(v => v.field === "faqs[0].answer")).toBe(true);
  });

  it("tolerates missing/malformed fields without throwing", () => {
    expect(() => validateGeneratedRouteContent({})).not.toThrow();
    expect(validateGeneratedRouteContent({ travelTips: "not an array" })).toEqual([]);
  });

  it("catches a violation in every forbidden category from the mission brief", () => {
    const bruteForce: GeneratedRouteFields = {
      title: "clean",
      metaDescription: "clean",
      h1Title: "clean",
      introParagraph: "Fares from $399. Emirates flies this route. Takes about 12 hours.",
      mainContent: "Best time to fly is spring. Book 6-8 weeks in advance. Tuesday flights are cheaper. Save up to 30%. Visa is required. Only 2 seats left.",
      travelTips: [],
      faqs: [],
    };
    const categories = new Set(validateGeneratedRouteContent(bruteForce).map(v => v.category));
    expect(categories).toEqual(new Set([
      "fare_or_price",
      "airline",
      "duration_or_schedule",
      "booking_window",
      "savings_percentage",
      "visa_or_entry",
      "popularity_or_scarcity",
    ]));
  });
});

describe("buildRouteGenerationUpdate — the publication decision", () => {
  it("marks clean content GENERATED_PENDING_REVIEW and returns it for storage", () => {
    const result = buildRouteGenerationUpdate(CLEAN_FIELDS);
    expect(result.generation_status).toBe(GenerationStatus.GENERATED_PENDING_REVIEW);
    expect(result.violations).toEqual([]);
    expect(result.content).toBe(CLEAN_FIELDS);
  });

  it("marks violating content FAILED_VALIDATION and returns null content — omission, not fabrication", () => {
    const dirty: GeneratedRouteFields = {
      ...CLEAN_FIELDS,
      mainContent: "Fares typically range around $500 for this route.",
    };
    const result = buildRouteGenerationUpdate(dirty);
    expect(result.generation_status).toBe(GenerationStatus.FAILED_VALIDATION);
    expect(result.violations.length).toBeGreaterThan(0);
    expect(result.content).toBeNull();
  });

  it("the return type never includes is_published — publication is not this module's decision", () => {
    const result = buildRouteGenerationUpdate(CLEAN_FIELDS) as Record<string, unknown>;
    expect(result.is_published).toBeUndefined();
  });

  it("GENERATED_PENDING_REVIEW is distinct from PUBLISHED — AI completion is not publication", () => {
    expect(GenerationStatus.GENERATED_PENDING_REVIEW).not.toBe(GenerationStatus.PUBLISHED);
  });
});

describe("isRegenerationBlocked — published-row protection (BF-0R-3 review follow-up, P0-1)", () => {
  it("blocks regeneration when the existing row is published", () => {
    expect(isRegenerationBlocked({ is_published: true })).toBe(true);
  });

  it("allows regeneration when the existing row is unpublished", () => {
    expect(isRegenerationBlocked({ is_published: false })).toBe(false);
  });

  it("allows regeneration when there is no existing row at all (genuinely new slug)", () => {
    expect(isRegenerationBlocked(null)).toBe(false);
    expect(isRegenerationBlocked(undefined)).toBe(false);
  });

  it("treats anything other than a strict boolean true as NOT blocked-by-mistake, and anything else as safe to fail open only for absence", () => {
    // Defensive: is_published is a NOT NULL boolean column, so these values
    // should never occur in practice, but the predicate must not throw and
    // must not treat a truthy-but-wrong-typed value as a block by accident
    // (e.g. a string "false" must never be read as blocking).
    expect(isRegenerationBlocked({ is_published: "true" })).toBe(false);
    expect(isRegenerationBlocked({ is_published: 1 })).toBe(false);
    expect(isRegenerationBlocked({})).toBe(false);
  });
});
