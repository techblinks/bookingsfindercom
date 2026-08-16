/**
 * T2D-B2B-3C — Tiqets sale-status diagnostic contract tests.
 *
 * Unit-tests the safe aggregate helper `buildSaleStatusDiagnostics` (added
 * to the shared tiqets normalizer) and statically locks the source-level
 * contract:
 *   - the existing on-sale safety filter is UNCHANGED in this phase
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

describe("tiqets-public sale-status contract (source-level)", () => {
  it("keeps the existing on-sale safety filter UNCHANGED (featured + search)", () => {
    const filter = '!p.saleStatus || p.saleStatus === "on_sale"';
    const occurrences = indexSrc.split(filter).length - 1;
    expect(occurrences).toBe(2);
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
