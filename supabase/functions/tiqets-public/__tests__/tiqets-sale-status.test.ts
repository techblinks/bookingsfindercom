/**
 * T2D-B2B-3F — Tiqets sale-status contract tests.
 *
 * Unit-tests the safe aggregate helper `buildSaleStatusDiagnostics` and the
 * shared availability predicate `isTiqetsSaleStatusAvailable` (both in the
 * shared tiqets normalizer), and statically locks the source-level contract:
 *   - featured and search both use the shared availability predicate
 *   - only the exact provider value "available" is public (fail-closed)
 *   - diagnostics expose counts only (never ids/titles/urls/tokens)
 *
 * The normalizer is a pure TS module (no https imports) so it runs directly
 * in the Vitest (Node) runner. End-to-end behaviour of the featured/search
 * actions is covered by the Deno suite:
 *   supabase/functions/tiqets-public/__tests__/tiqets-public-repair.deno.ts
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import {
  buildSaleStatusDiagnostics,
  isTiqetsSaleStatusAvailable,
  MISSING_SALE_STATUS,
} from "../../_shared/tiqets-normalizer.ts";

const repo = process.cwd();
const indexSrc = readFileSync(
  join(repo, "supabase/functions/tiqets-public/index.ts"),
  "utf8",
);
const normalizerSrc = readFileSync(
  join(repo, "supabase/functions/_shared/tiqets-normalizer.ts"),
  "utf8",
);

describe("buildSaleStatusDiagnostics", () => {
  it("aggregates trimmed statuses and folds null/empty into (missing)", () => {
    const products = [
      { saleStatus: "available" },
      { saleStatus: "available" },
      { saleStatus: "unavailable" },
      { saleStatus: null },
    ];
    expect(buildSaleStatusDiagnostics(products)).toEqual({
      available: 2,
      unavailable: 1,
      [MISSING_SALE_STATUS]: 1,
    });
  });

  it("trims whitespace, preserves provider values verbatim, supports raw shape", () => {
    const products = [
      { saleStatus: "  on_sale  " },
      { sale_status: "unavailable" },
      { saleStatus: "" },
      { saleStatus: "   " },
      { saleStatus: 42 },
    ];
    expect(buildSaleStatusDiagnostics(products)).toEqual({
      on_sale: 1,
      unavailable: 1,
      [MISSING_SALE_STATUS]: 3,
    });
  });

  it("returns an empty object for non-array input", () => {
    expect(buildSaleStatusDiagnostics(null)).toEqual({});
    expect(buildSaleStatusDiagnostics(undefined)).toEqual({});
    expect(buildSaleStatusDiagnostics({})).toEqual({});
    expect(buildSaleStatusDiagnostics("nope")).toEqual({});
  });

  it("exposes counts only — never product-identifying data", () => {
    const products = [
      {
        id: "secret-product-id-1",
        providerProductId: "provider-id-1",
        title: "Secret Tour Title",
        productUrl: "https://tiqets.com/secret/url",
        productCheckoutUrl: "https://tiqets.com/secret/checkout",
        description: "Secret description",
        token: "secret-token-abc",
        authorization: "Bearer secret-auth",
        saleStatus: "available",
      },
      {
        id: "secret-product-id-2",
        title: "Another Secret Tour",
        saleStatus: null,
      },
    ];

    const diag = buildSaleStatusDiagnostics(products);
    expect(diag).toEqual({ available: 1, [MISSING_SALE_STATUS]: 1 });

    const json = JSON.stringify(diag).toLowerCase();
    for (const forbidden of [
      "secret",
      "providerproductid",
      "title",
      "description",
      "checkout",
      "token",
      "authorization",
      "bearer",
      "tiqets.com",
    ]) {
      expect(json).not.toContain(forbidden);
    }
    expect(Object.keys(diag)).not.toContain("id");
  });
});

describe("isTiqetsSaleStatusAvailable", () => {
  it('accepts only the exact provider value "available"', () => {
    expect(isTiqetsSaleStatusAvailable("available")).toBe(true);
  });

  it('accepts "available" with surrounding whitespace (trims)', () => {
    expect(isTiqetsSaleStatusAvailable(" available ")).toBe(true);
    expect(isTiqetsSaleStatusAvailable("\tavailable\n")).toBe(true);
  });

  it('rejects "unavailable"', () => {
    expect(isTiqetsSaleStatusAvailable("unavailable")).toBe(false);
  });

  it('rejects legacy "on_sale"', () => {
    expect(isTiqetsSaleStatusAvailable("on_sale")).toBe(false);
  });

  it("rejects null", () => {
    expect(isTiqetsSaleStatusAvailable(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isTiqetsSaleStatusAvailable(undefined)).toBe(false);
  });

  it("rejects empty and whitespace-only strings", () => {
    expect(isTiqetsSaleStatusAvailable("")).toBe(false);
    expect(isTiqetsSaleStatusAvailable("   ")).toBe(false);
    expect(isTiqetsSaleStatusAvailable("\t")).toBe(false);
  });

  it("rejects unknown values (e.g. sold_out) — no speculative acceptance", () => {
    expect(isTiqetsSaleStatusAvailable("sold_out")).toBe(false);
    expect(isTiqetsSaleStatusAvailable("cancelled")).toBe(false);
    expect(isTiqetsSaleStatusAvailable("weird_status")).toBe(false);
  });
});

describe("tiqets-public sale-status contract (source-level)", () => {
  it("both featured and search use the shared availability predicate", () => {
    const predicateRef = "isTiqetsSaleStatusAvailable(p.saleStatus)";
    const occurrences = indexSrc.split(predicateRef).length - 1;
    expect(occurrences).toBe(2);
  });

  it("no longer accepts on_sale / missing statuses (fail-closed)", () => {
    expect(indexSrc).not.toContain('p.saleStatus === "on_sale"');
    expect(indexSrc).not.toContain("!p.saleStatus ||");
  });

  it("still maps raw sale_status into saleStatus verbatim", () => {
    expect(normalizerSrc).toContain("saleStatus: raw.sale_status || null,");
  });

  it("adds saleStatusCounts to diagnostics only (never a product field)", () => {
    expect(indexSrc).toContain(
      "saleStatusCounts: buildSaleStatusDiagnostics(products)",
    );
    expect(indexSrc).toContain("upstreamRawCount: rawResults.length");
    expect(indexSrc).toContain("normalizedCount: products.length");
    expect(indexSrc).toContain("filteredOnSaleCount: safeProducts.length");
    expect(indexSrc).toContain(
      "imageDiagnostics: buildImageDiagnostics(rawResults)",
    );
    // The normalized product shape must NOT grow a saleStatusCounts field.
    expect(normalizerSrc).not.toContain("saleStatusCounts:");
  });
});
