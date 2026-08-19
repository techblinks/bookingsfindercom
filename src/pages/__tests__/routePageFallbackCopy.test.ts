/**
 * RoutePage fallback copy — BF-0R-3, Phase 5 (route page fail-closed
 * behaviour).
 *
 * The previous hardcoded fallback shown on every /flights/:slug page with no
 * published DB content asserted unsourced facts: "Book 6-8 weeks in
 * advance", "Tuesday and Wednesday flights tend to be cheaper", and
 * "Flexible dates can save you up to 40%". None of these were ever sourced
 * from anywhere. This suite locks in that the replacement copy contains no
 * quantified booking-window, cheapest-day, or savings claim.
 */
import { describe, it, expect } from "vitest";
import {
  fallbackRouteTips,
  fallbackRouteFaqQuestion,
  fallbackRouteFaqAnswer,
} from "../routePageFallbackCopy";

function allTipText(): string {
  return fallbackRouteTips.map(t => `${t.title} ${t.content}`).join(" ");
}

describe("fallback route tips contain no unsourced factual claim", () => {
  it("does not claim a specific booking window", () => {
    expect(allTipText()).not.toMatch(/\d+[-–]\d+\s*weeks?\s+(in\s+advance|ahead)/i);
    expect(allTipText()).not.toMatch(/book\s+\d+\s+(weeks?|months?)\s+in\s+advance/i);
  });

  it("does not claim a specific weekday is cheaper", () => {
    expect(allTipText()).not.toMatch(/\b(tuesday|wednesday|thursday)\b/i);
    expect(allTipText()).not.toMatch(/cheapest day/i);
  });

  it("does not claim a savings percentage", () => {
    expect(allTipText()).not.toMatch(/\d+\s?%/);
    expect(allTipText()).not.toMatch(/save\s+(up\s+to\s+)?\d+/i);
  });

  it("has exactly 5 tips, each with a non-empty title and content", () => {
    expect(fallbackRouteTips).toHaveLength(5);
    for (const tip of fallbackRouteTips) {
      expect(tip.title.length).toBeGreaterThan(0);
      expect(tip.content.length).toBeGreaterThan(0);
    }
  });
});

describe("fallback FAQ answer contains no unsourced booking-window claim", () => {
  it("does not recommend a specific number of weeks in advance", () => {
    expect(fallbackRouteFaqAnswer).not.toMatch(/\d+[-–]\d+\s*weeks?/i);
    expect(fallbackRouteFaqAnswer).not.toMatch(/\bweeks? in advance\b/i);
  });

  it("explicitly disclaims a single universal booking window", () => {
    expect(fallbackRouteFaqAnswer).toMatch(/no single/i);
  });

  it("builds a route-specific question without asserting a route-specific fact", () => {
    const question = fallbackRouteFaqQuestion("London", "Dubai");
    expect(question).toContain("London");
    expect(question).toContain("Dubai");
    expect(question).not.toMatch(/best time/i);
  });
});
