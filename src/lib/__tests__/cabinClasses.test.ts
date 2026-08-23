/**
 * Shared cabin-support contract (BF-0R-7 Round 1.2 item 1/2).
 *
 * The single source of truth that flightSearchValidation, whiteLabelUrl and
 * every customer-facing cabin picker import from, so they cannot drift
 * apart again the way they did before this round (forms/validation allowed
 * Premium/First; the White Label handoff never supported them).
 */
import { describe, it, expect } from "vitest";
import {
  SUPPORTED_CABIN_CLASSES,
  isSupportedCabinClass,
  CABIN_CLASS_LABELS,
  CABIN_CLASS_OPTIONS,
} from "../cabinClasses";

describe("cabinClasses — supported set", () => {
  it("supports exactly economy and business", () => {
    expect(SUPPORTED_CABIN_CLASSES).toEqual(["economy", "business"]);
  });

  it("does not support premium or first", () => {
    expect(isSupportedCabinClass("premium")).toBe(false);
    expect(isSupportedCabinClass("first")).toBe(false);
  });

  it("accepts economy and business", () => {
    expect(isSupportedCabinClass("economy")).toBe(true);
    expect(isSupportedCabinClass("business")).toBe(true);
  });

  it("rejects empty/null/undefined without throwing", () => {
    expect(isSupportedCabinClass("")).toBe(false);
    expect(isSupportedCabinClass(null)).toBe(false);
    expect(isSupportedCabinClass(undefined)).toBe(false);
  });

  it("labels and options cover exactly the supported set, in order", () => {
    expect(Object.keys(CABIN_CLASS_LABELS)).toEqual(["economy", "business"]);
    expect(CABIN_CLASS_OPTIONS.map(o => o.value)).toEqual(["economy", "business"]);
    expect(CABIN_CLASS_OPTIONS.map(o => o.label)).toEqual(["Economy", "Business"]);
  });
});
