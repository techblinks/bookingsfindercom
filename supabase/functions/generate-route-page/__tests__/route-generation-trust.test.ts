/**
 * generate-route-page trust integrity — BF-0R-3.
 *
 * Previously: this function was reachable with the public anon key (no
 * in-function authorization), used the service-role key to bypass RLS, asked
 * the model for unsourced facts (typical price, airlines, duration, best time
 * to fly, saving tips), and wrote `is_published: true` directly from model
 * output in the SAME update as `generation_status: 'completed'` — AI
 * completion WAS publication.
 *
 * `route-generation-core.ts` is imported directly (pure prompt-building, no
 * Deno/network) so the prompt itself can be asserted never to request an
 * unsourced fact. `index.ts` is read as source text for the things a unit
 * test cannot observe directly: that authorization runs before any mutation,
 * that the provenance gate is consulted, and that `is_published` is never
 * wired to model output — the same convention as
 * run-optimizer/__tests__/optimizer-trust.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { buildRoutePagePrompt, ROUTE_GENERATION_SYSTEM_PROMPT } from "../route-generation-core.ts";

const FN_DIR = join(__dirname, "..");
const indexSource = readFileSync(join(FN_DIR, "index.ts"), "utf8");

const sampleRoute = {
  origin_city: "London",
  destination_city: "Dubai",
  origin_iata: "LON",
  destination_iata: "DXB",
};

describe("buildRoutePagePrompt — the prompt itself must not request unsourced facts", () => {
  const prompt = buildRoutePagePrompt(sampleRoute);
  const fullPromptText = `${ROUTE_GENERATION_SYSTEM_PROMPT}\n${prompt}`;

  // The prompt legitimately MENTIONS price/duration/airline terms once each,
  // inside the "do NOT state or imply" prohibition list — that is the fix,
  // not the defect. These checks confirm the old REQUEST phrasing ("2-3
  // sentence hook mentioning ... typical price range", "covering: ...
  // airlines on this route ... flight duration") is gone, not that the words
  // never appear anywhere.
  it("does not ask for a typical price / fare range", () => {
    expect(fullPromptText).not.toMatch(/typical price/i);
    expect(fullPromptText).not.toMatch(/mentioning.*price range/i);
  });

  it("does not ask for airlines operating/serving the route", () => {
    expect(fullPromptText).not.toMatch(/airlines (on|operating|serving) this route/i);
  });

  it("does not ask for flight duration", () => {
    expect(fullPromptText).not.toMatch(/covering:.*flight duration/i);
  });

  it("does not REQUEST best-time-to-fly or money-saving content (the old prompt's 'covering:' list)", () => {
    // The prompt legitimately MENTIONS "best time to fly" once, inside the
    // "do NOT state or imply" prohibition list — that is the fix, not the
    // defect. What must never reappear is the old REQUEST phrasing
    // ("covering: best time to fly, airlines on this route ... money-saving
    // tips, destination highlights").
    expect(fullPromptText).not.toMatch(/covering:.*best time/i);
    expect(fullPromptText).not.toMatch(/money-saving tips/i);
  });

  it("does not ask for destination highlights or visa/weather facts", () => {
    expect(fullPromptText).not.toMatch(/destination highlights/i);
    expect(fullPromptText).not.toMatch(/\bvisa\b.*required/i);
  });

  it("explicitly instructs the model to omit price, airline, duration, timing, savings, weather and visa claims", () => {
    expect(prompt).toMatch(/a price, fare, price range, or currency amount/i);
    expect(prompt).toMatch(/named airlines/i);
    expect(prompt).toMatch(/flight duration/i);
    expect(prompt).toMatch(/booking-window advice/i);
    expect(prompt).toMatch(/savings percentages/i);
    expect(prompt).toMatch(/weather, seasons, or climate/i);
    expect(prompt).toMatch(/visa or entry requirements/i);
    expect(prompt).toMatch(/popularity.*scarcity\/urgency claims/i);
  });

  it("includes the route's own IATA codes (user/system-supplied, not invented)", () => {
    expect(prompt).toContain("LON");
    expect(prompt).toContain("DXB");
  });
});

describe("index.ts — authorization runs before any privileged mutation", () => {
  it("imports and calls requireAdmin from the shared admin-auth module", () => {
    expect(indexSource).toMatch(/import\s*\{\s*requireAdmin\s*\}\s*from\s*"\.\.\/_shared\/admin-auth\.ts"/);
    expect(indexSource).toMatch(/await requireAdmin\(req, supabase\)/);
  });

  it("fails closed (does not proceed) when requireAdmin rejects", () => {
    expect(indexSource).toMatch(/if \(!auth\.ok\)/);
    expect(indexSource).toMatch(/status: auth\.status/);
  });

  it("checks authorization BEFORE the pending-record insert and generation loop", () => {
    const authIndex = indexSource.indexOf("await requireAdmin(req, supabase)");
    const insertIndex = indexSource.indexOf(".upsert(pendingRecords");
    const loopIndex = indexSource.indexOf("for (const route of routes)");
    expect(authIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeLessThan(insertIndex);
    expect(authIndex).toBeLessThan(loopIndex);
  });
});

describe("index.ts — the provenance gate decides what may be stored", () => {
  it("imports and applies buildRouteGenerationUpdate from content-trust", () => {
    expect(indexSource).toMatch(/import\s*\{\s*buildRouteGenerationUpdate,\s*GenerationStatus\s*\}\s*from\s*"\.\.\/_shared\/content-trust\.ts"/);
    expect(indexSource).toMatch(/buildRouteGenerationUpdate\(\{/);
  });

  it("discards content and marks FAILED_VALIDATION when the gate rejects it", () => {
    expect(indexSource).toMatch(/GenerationStatus\.FAILED_VALIDATION/);
    expect(indexSource).toMatch(/!gate\.content/);
  });
});

describe("index.ts — is_published is NEVER set true from a generation call", () => {
  // The module doc comment at the top of the file legitimately DESCRIBES the
  // old defect in prose ("wrote ... is_published: true"), so the code-level
  // assertion below scans everything AFTER that header block only.
  const codeAfterHeader = indexSource.slice(indexSource.indexOf("import { serve }"));

  it("contains no literal `is_published: true` or `is_published:true` in actual code", () => {
    expect(codeAfterHeader).not.toMatch(/is_published\s*:\s*true/);
  });

  it("the successful-generation update block does not reference is_published at all", () => {
    // This literal (from(...) and .update({ chained on one line, object body
    // on following lines) is unique to the success-path update — every other
    // `.update(` call in this file breaks the chain across lines.
    const updateBlockStart = indexSource.indexOf("await supabase.from('seo_route_pages').update({");
    expect(updateBlockStart).toBeGreaterThan(-1);
    const updateBlockEnd = indexSource.indexOf("}).eq('slug', slug);", updateBlockStart);
    expect(updateBlockEnd).toBeGreaterThan(updateBlockStart);
    const updateBlock = indexSource.slice(updateBlockStart, updateBlockEnd);
    expect(updateBlock).not.toMatch(/is_published/);
    expect(updateBlock).toMatch(/generation_status: GenerationStatus\.GENERATED_PENDING_REVIEW/);
  });

  it("the pending-record insert leaves is_published explicitly false", () => {
    expect(indexSource).toMatch(/is_published:\s*false,/);
  });
});

describe("index.ts — AI/provider errors fail closed", () => {
  it("a thrown error during generation marks the row FAILED, not completed/published", () => {
    expect(indexSource).toMatch(/catch \(err\)[\s\S]{0,200}GenerationStatus\.FAILED/);
  });

  it("does not silently swallow a non-rate-limit provider failure", () => {
    expect(indexSource).toMatch(/throw new Error\(`AI error: \$\{result\.reason\}`\)/);
  });
});

describe("legacy fabricated-fact request cannot silently return", () => {
  it("the old unsourced-fact prompt language is gone from both files", () => {
    const combined = `${indexSource}\n${buildRoutePagePrompt(sampleRoute)}`;
    expect(combined).not.toMatch(/typical price range/i);
    expect(combined).not.toMatch(/best time to fly, airlines on this route/i);
    expect(combined).not.toMatch(/money-saving tips, destination highlights/i);
  });

  it("index.ts no longer builds the AI request inline (uses the shared provider)", () => {
    expect(indexSource).not.toMatch(/ai\.gateway\.lovable\.dev/);
    expect(indexSource).toMatch(/createLovableGatewayProvider/);
  });
});
