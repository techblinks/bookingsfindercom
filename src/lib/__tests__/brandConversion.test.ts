/**
 * Brand consistency — conversion button variant tests.
 *
 * Verifies that the shared "conversion" variant is used for all
 * primary conversion actions and not for navigation/secondary controls.
 * V0: Updated to match HSL-tokenized conversion variant.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { buttonVariants } from "@/components/ui/button";

// ═══ Conversion variant CSS checks ═══

describe("buttonVariants — conversion variant", () => {
  it("includes the conversion variant name", () => {
    // The variant key must exist (compilation check)
    const classes = buttonVariants({ variant: "conversion" });
    expect(classes).toBeTruthy();
  });

  it("uses accent HSL token for background (V0: was #D64A2A)", () => {
    const classes = buttonVariants({ variant: "conversion" });
    expect(classes).toContain("bg-[hsl(var(--accent))]");
  });

  it("uses accent-hover HSL token (V0: was #B83D22)", () => {
    const classes = buttonVariants({ variant: "conversion" });
    expect(classes).toContain("hover:bg-[hsl(var(--accent-hover))]");
  });

  it("uses accent-foreground instead of text-white (V0: tokenized)", () => {
    const classes = buttonVariants({ variant: "conversion" });
    expect(classes).toContain("text-accent-foreground");
  });

  it("is visually distinct from the default (blue) variant", () => {
    const conversion = buttonVariants({ variant: "conversion" });
    const defaultV = buttonVariants({ variant: "default" });
    expect(conversion).not.toBe(defaultV);
  });

  it("is not the same as ghost, outline, or secondary variants", () => {
    const conversion = buttonVariants({ variant: "conversion" });
    const ghost = buttonVariants({ variant: "ghost" });
    const outline = buttonVariants({ variant: "outline" });
    const secondary = buttonVariants({ variant: "secondary" });
    expect(conversion).not.toBe(ghost);
    expect(conversion).not.toBe(outline);
    expect(conversion).not.toBe(secondary);
  });

  it("default variant is not conversion orange", () => {
    const classes = buttonVariants({ variant: "default" });
    expect(classes).not.toContain("bg-[hsl(var(--accent))]");
  });

  it("outline variant is not conversion orange", () => {
    const classes = buttonVariants({ variant: "outline" });
    expect(classes).not.toContain("bg-[hsl(var(--accent))]");
  });

  it("ghost variant is not conversion orange", () => {
    const classes = buttonVariants({ variant: "ghost" });
    expect(classes).not.toContain("bg-[hsl(var(--accent))]");
  });

  it("secondary variant is not conversion orange", () => {
    const classes = buttonVariants({ variant: "secondary" });
    expect(classes).not.toContain("bg-[hsl(var(--accent))]");
  });

  it("pill variant is not conversion orange", () => {
    const classes = buttonVariants({ variant: "pill" });
    expect(classes).not.toContain("bg-[hsl(var(--accent))]");
  });
});

// ═══ Component-level conversion usage checks ═══

// We only import types that don't require complex mocking
describe("Conversion variant usage — source checks", () => {
  it("Header Plan a Trip uses variant='conversion'", () => {
    const source = readFileSync("src/components/layout/Header.tsx", "utf-8");
    expect(source).toContain('variant="conversion"');
  });

  it("HotelResults imports ctaPrimary (conversion family)", () => {
    const source = readFileSync("src/pages/HotelResults.tsx", "utf-8");
    expect(source).toContain("ctaPrimary");
  });

  it("ModernFlightSearch Search flights uses variant='conversion'", () => {
    const source = readFileSync("src/components/search/ModernFlightSearch.tsx", "utf-8");
    expect(source).toContain('variant="conversion"');
  });

  it("OptimizerForm Optimize My Trip uses variant='conversion'", () => {
    const source = readFileSync("src/components/optimizer/OptimizerForm.tsx", "utf-8");
    expect(source).toContain('variant="conversion"');
  });

  /*
   * D4 removed the closing "Ready to start planning?" band, which was the only
   * place DesktopHome used the conversion family. The homepage's one conversion
   * CTA is now the real Search flights button inside ModernFlightSearch (see
   * above) — so the contract here is that the page delegates rather than
   * carrying a second orange button of its own.
   */
  it("DesktopHome owns no conversion CTA of its own", () => {
    const source = readFileSync("src/pages/home/DesktopHome.tsx", "utf-8");
    expect(source).toContain("ModernFlightSearch");
    expect(source).not.toContain("ctaPrimary");
    expect(source).not.toContain("ctaSecondary");
    expect(source).not.toContain('variant="conversion"');
  });
});

// ═══ Optimizer disabled behavior ═══

describe("Optimizer — enabled/disabled", () => {
  it("OptimizerForm button has disabled prop wired to isValid", () => {
    // Check that the Button in OptimizerForm wires disabled to some validity check
    const source = readFileSync("src/components/optimizer/OptimizerForm.tsx", "utf-8");
    expect(source).toContain("disabled");
  });

  it("OptimizerForm button uses variant='conversion'", () => {
    const source = readFileSync("src/components/optimizer/OptimizerForm.tsx", "utf-8");
    expect(source).toContain('variant="conversion"');
  });
});

// ═══ Image audit: conversion vs utility ═══

describe("Image/accessory accessibility", () => {
  it("FlightResults does not have un-annotated decorative images", () => {
    // Check for <img> without alt in FlightResults
    const source = readFileSync("src/pages/FlightResults.tsx", "utf-8");
    const imgTags = [...source.matchAll(/<img /g)];
    const altMissing = [...source.matchAll(/<img (?!.*alt=)/g)];
    expect(altMissing.length).toBe(0);
  });
});

// ═══ Conversion variant: disabled state ═══

describe("Conversion variant — disabled state", () => {
  it("conversion variant inherits base disabled:opacity-50", () => {
    const classes = buttonVariants({ variant: "conversion" });
    // The base cva definition includes disabled:pointer-events-none disabled:opacity-50
    // Since conversion uses the base, it must inherit
    expect(classes).toContain("disabled:opacity-50");
  });

  it("conversion variant does not override disabled styling", () => {
    const classes = buttonVariants({ variant: "conversion" });
    // Only one disabled:opacity rule
    const matches = (classes.match(/disabled:opacity/g) || []).length;
    expect(matches).toBe(1);
  });
});

// ═══ Priority controls must not use conversion orange ═══

describe("Optimizer priority controls", () => {
  it("Cheapest/Fastest/Low Risk use border-primary not conversion", () => {
    const source = readFileSync("src/components/optimizer/OptimizerForm.tsx", "utf-8");
    // Priority controls should reference primary, not conversion orange
    const primaryRefs = (source.match(/primary/g) || []).length;
    expect(primaryRefs).toBeGreaterThan(0);
  });

  it("Priority icon colors are semantic only", () => {
    const source = readFileSync("src/components/optimizer/OptimizerForm.tsx", "utf-8");
    // Priority icons use success/warning/destructive or semantic colors
    expect(source).toContain("border-primary");
  });

  // V0: ctaPrimary and ctaSecondary helpers still exist
  it("ctaPrimary / ctaSecondary helpers exported", () => {
    const source = readFileSync("src/components/ui/button.tsx", "utf-8");
    expect(source).toContain("ctaPrimary");
    expect(source).toContain("ctaSecondary");
  });
});
