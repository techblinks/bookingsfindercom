/**
 * T2C-B2A source-level regression contract for the tiqets-public repair.
 *
 * The Edge Function imports https:// URLs (zod, supabase-js) that this
 * Vitest (Node) runner cannot import, so behavior is covered by the Deno
 * suite: supabase/functions/tiqets-public/__tests__/tiqets-public-repair.deno.ts
 * (run with `npx deno test --allow-env ...`).
 *
 * These tests statically lock the repaired source so the exact defects found
 * in T2C-B1 cannot be reintroduced:
 *   - safeParse(body) on an undefined `body` (destinations / catalogue-search)
 *   - undefined `onSale` in featured diagnostics
 *   - calls to the never-imported wildcard helpers jsonResponse/errorResponse
 *   - searchSchema missing destination_id while the code references it
 *   - CORS allowlist (production origins allowed; preview origin NOT allowed)
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

const repo = process.cwd();

const indexSrc = readFileSync(
  join(repo, "supabase/functions/tiqets-public/index.ts"),
  "utf8",
);
const normalizerSrc = readFileSync(
  join(repo, "supabase/functions/_shared/tiqets-normalizer.ts"),
  "utf8",
);

const PREVIEW_HOST =
  "feat-things-canonical-url-migration-bookingsfindercom.bookingsfinder.workers.dev";

describe("tiqets-public repair contract", () => {
  it("never parses an undefined `body` (destinations + catalogue-search fixed)", () => {
    expect(indexSrc).not.toContain("}).safeParse(body);");
    // rawBody is the only parse source for those actions
    const rawParseCount = indexSrc.split("}).safeParse(rawBody);").length - 1;
    expect(rawParseCount).toBeGreaterThanOrEqual(2);
  });

  it("never references the undefined `onSale` variable", () => {
    expect(indexSrc).not.toContain("onSale");
    expect(indexSrc).toContain("filteredOnSaleCount: safeProducts.length");
  });

  it("never calls the un-imported wildcard helpers jsonResponse/errorResponse", () => {
    expect(indexSrc).not.toContain("jsonResponse(");
    expect(indexSrc).not.toContain("errorResponse(");
  });

  it("declares city_id in searchSchema and maps it upstream (official /v2/products)", () => {
    expect(indexSrc).toContain(
      "city_id: z.number().int().positive().optional(),",
    );
    expect(indexSrc).toContain("d.query || d.city_name || d.city_id");
    expect(indexSrc).toContain(
      'params.set("city_id", String(body.city_id))',
    );
    // PB2A: destination_id is NOT part of the public search schema.
    expect(indexSrc).not.toContain(
      "destination_id: z.number().int().positive().optional(),",
    );
    expect(indexSrc).not.toContain(
      'params.set("destination_id", String(body.destination_id))',
    );
  });

  it("city_name maps to upstream city_name (official param, not destination)", () => {
    expect(indexSrc).toContain(
      'params.set("city_name", body.city_name)',
    );
    expect(indexSrc).not.toContain(
      'params.set("destination", body.city_name)',
    );
  });

  it("handles OPTIONS preflight with 204", () => {
    expect(indexSrc).toContain('status: 204');
  });

  it("allowlists production origins and NOT the branch-preview host", () => {
    expect(indexSrc).toContain('"https://bookingsfinder.com"');
    expect(indexSrc).toContain('"https://www.bookingsfinder.com"');
    expect(indexSrc).not.toContain(PREVIEW_HOST);
  });

  it("normalizer has no duplicate keys and declares the runtime shape", () => {
    const taglineCount = normalizerSrc.split("tagline: raw.tagline || null,").length - 1;
    const descriptionCount = normalizerSrc.split("description: raw.description || null,").length - 1;
    expect(taglineCount).toBe(1);
    expect(descriptionCount).toBe(1);
    expect(normalizerSrc).toContain("tagIds: number[];");
    expect(normalizerSrc).toContain("cityId: number | null;");
    expect(normalizerSrc).toContain("countryId: number | null;");
  });
});
