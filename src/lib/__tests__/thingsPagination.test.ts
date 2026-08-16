/**
 * Things V2 (T3B) - pagination window algorithm.
 *
 * Locks the bounded deterministic window: max ~7 numeric buttons, ellipsis
 * for gaps, first/last always present on large totals, no duplicates, no
 * out-of-range pages, deterministic ordering.
 */
import { describe, it, expect } from "vitest";
import { getThingsPaginationWindow } from "@/lib/thingsPagination";

type Item = { type: "page"; page: number } | { type: "ellipsis"; key: string };

const pages = (...pages: number[]): Item[] =>
  pages.map((page) => ({ type: "page", page }));

const ellipsis = (key: "leading" | "trailing"): Item => ({ type: "ellipsis", key });

describe("getThingsPaginationWindow - small totals", () => {
  it("totalPages 1 renders exactly one page", () => {
    expect(getThingsPaginationWindow(1, 1)).toEqual(pages(1));
  });

  it("totalPages 2 renders both pages", () => {
    expect(getThingsPaginationWindow(1, 2)).toEqual(pages(1, 2));
    expect(getThingsPaginationWindow(2, 2)).toEqual(pages(1, 2));
  });

  it("renders every page when totalPages is within the visible threshold", () => {
    expect(getThingsPaginationWindow(3, 7)).toEqual(pages(1, 2, 3, 4, 5, 6, 7));
    expect(getThingsPaginationWindow(6, 7)).toEqual(pages(1, 2, 3, 4, 5, 6, 7));
  });

  it("small totals never produce an ellipsis", () => {
    const window = getThingsPaginationWindow(4, 6);
    expect(window.some((item) => item.type === "ellipsis")).toBe(false);
  });
});

describe("getThingsPaginationWindow - large totals", () => {
  it("current page 1 anchors the window at the start", () => {
    expect(getThingsPaginationWindow(1, 10)).toEqual([
      ...pages(1, 2, 3, 4, 5, 6),
      ellipsis("trailing"),
      ...pages(10),
    ]);
  });

  it("near the start keeps the leading pages without a leading ellipsis", () => {
    expect(getThingsPaginationWindow(2, 10)).toEqual([
      ...pages(1, 2, 3, 4, 5, 6),
      ellipsis("trailing"),
      ...pages(10),
    ]);
  });

  it("middle pages show both ellipses around a centred window", () => {
    expect(getThingsPaginationWindow(5, 10)).toEqual([
      ...pages(1),
      ellipsis("leading"),
      ...pages(3, 4, 5, 6, 7),
      ellipsis("trailing"),
      ...pages(10),
    ]);
  });

  it("near the end keeps the trailing pages without a trailing ellipsis", () => {
    expect(getThingsPaginationWindow(9, 10)).toEqual([
      ...pages(1),
      ellipsis("leading"),
      ...pages(5, 6, 7, 8, 9, 10),
    ]);
  });

  it("current page on the last page anchors the window at the end", () => {
    expect(getThingsPaginationWindow(10, 10)).toEqual([
      ...pages(1),
      ellipsis("leading"),
      ...pages(5, 6, 7, 8, 9, 10),
    ]);
  });

  it("a very large total stays bounded", () => {
    const window = getThingsPaginationWindow(50, 100);
    const numeric = window.filter((item) => item.type === "page");
    expect(numeric.length).toBeLessThanOrEqual(7);
    expect(window[0]).toEqual({ type: "page", page: 1 });
    expect(window[window.length - 1]).toEqual({ type: "page", page: 100 });
    expect(window).toContainEqual({ type: "page", page: 50 });
  });
});

describe("getThingsPaginationWindow - invariants", () => {
  it("never emits duplicate page numbers", () => {
    for (let total = 1; total <= 40; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const window = getThingsPaginationWindow(current, total);
        const numbers = window
          .filter((item) => item.type === "page")
          .map((item) => (item as { page: number }).page);
        expect(new Set(numbers).size).toBe(numbers.length);
      }
    }
  });

  it("never emits an out-of-range page number", () => {
    for (let total = 1; total <= 40; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const window = getThingsPaginationWindow(current, total);
        for (const item of window) {
          if (item.type === "page") {
            expect(item.page).toBeGreaterThanOrEqual(1);
            expect(item.page).toBeLessThanOrEqual(total);
          }
        }
      }
    }
  });

  it("always includes the current page and the boundaries", () => {
    for (let total = 1; total <= 40; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const window = getThingsPaginationWindow(current, total);
        const numbers = window
          .filter((item) => item.type === "page")
          .map((item) => (item as { page: number }).page);
        expect(numbers).toContain(current);
        expect(numbers[0]).toBe(1);
        expect(numbers[numbers.length - 1]).toBe(total);
      }
    }
  });

  it("is deterministic - same inputs produce identical windows", () => {
    for (const [current, total] of [
      [1, 1],
      [2, 10],
      [5, 10],
      [10, 10],
      [50, 100],
    ]) {
      expect(getThingsPaginationWindow(current, total)).toEqual(
        getThingsPaginationWindow(current, total),
      );
    }
  });

  it("numeric buttons never exceed the visible threshold (ellipsis not counted)", () => {
    for (let total = 1; total <= 60; total += 1) {
      for (let current = 1; current <= total; current += 1) {
        const window = getThingsPaginationWindow(current, total);
        const numericCount = window.filter((item) => item.type === "page").length;
        expect(numericCount).toBeLessThanOrEqual(7);
      }
    }
  });

  it("clamps a stale out-of-range currentPage into range", () => {
    // A stale ?page=99 URL must not produce an empty window.
    const window = getThingsPaginationWindow(99, 10);
    const numbers = window
      .filter((item) => item.type === "page")
      .map((item) => (item as { page: number }).page);
    expect(numbers).toContain(10);
    expect(numbers.every((page) => page <= 10)).toBe(true);
  });
});
