/**
 * generate-seo-content trust integrity — BF-0R-3.
 *
 * Previously: this function was reachable with the public anon key (no
 * authorization at all, verify_jwt=false), spent a real paid AI-gateway call
 * per request with zero access control, and asked the model for unsourced
 * facts (typical price, best time to fly, airlines operating the route,
 * flight duration, peak/off-peak seasons) that the admin UI could then save
 * straight into `country_landing_pages`.
 *
 * `seo-content-core.ts` is imported directly (pure prompt-building, no Deno/
 * network) so the prompts can be asserted never to request an unsourced
 * fact. `index.ts` is read as source text for authorization ordering and the
 * fail-closed provenance rejection — same convention as
 * run-optimizer/__tests__/optimizer-trust.test.ts.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";
import { buildFlightsPrompt, buildHotelsPrompt, SEO_CONTENT_SYSTEM_PROMPT } from "../seo-content-core.ts";

const FN_DIR = join(__dirname, "..");
const indexSource = readFileSync(join(FN_DIR, "index.ts"), "utf8");
const configSource = readFileSync(join(FN_DIR, "..", "..", "config.toml"), "utf8");

describe("prompts must not request unsourced facts", () => {
  const flights = `${SEO_CONTENT_SYSTEM_PROMPT}\n${buildFlightsPrompt("London", "Dubai")}`;
  const hotels = `${SEO_CONTENT_SYSTEM_PROMPT}\n${buildHotelsPrompt("Dubai")}`;

  for (const [label, promptText] of [["flights", flights], ["hotels", hotels]] as const) {
    it(`${label} prompt does not REQUEST a typical price / airlines / duration / peak season`, () => {
      // The prompt legitimately MENTIONS "best time to fly/book/visit" once,
      // as part of the "do NOT state or imply" prohibition list — that is the
      // fix, not the defect. What must never appear is a request for the
      // model to WRITE about these, which is what the old prompts did
      // ("covering: best time to fly, airlines operating this route...").
      expect(promptText).not.toMatch(/typical price/i);
      expect(promptText).not.toMatch(/covering:.*best time/i);
      expect(promptText).not.toMatch(/airlines operating this route/i);
      expect(promptText).not.toMatch(/typical flight duration/i);
      expect(promptText).not.toMatch(/peak vs off-peak seasons/i);
    });

    it(`${label} prompt explicitly forbids price, brand, duration, timing, savings, weather and visa claims`, () => {
      expect(promptText).toMatch(/a price, fare, price range, or currency amount/i);
      expect(promptText).toMatch(/named airlines or hotel brands/i);
      expect(promptText).toMatch(/booking-window advice/i);
      expect(promptText).toMatch(/savings percentages or discount claims/i);
      expect(promptText).toMatch(/weather, seasons, or climate facts/i);
      expect(promptText).toMatch(/visa or entry requirements/i);
    });

    it(`${label} prompt does not request popularCities (BF-0R-3 review follow-up, P0-2)`, () => {
      // The model has no genuine source for which places are nearby or
      // popular — asking for this is the same class of defect as asking for
      // a fare or an airline.
      expect(promptText).not.toMatch(/"popularCities"/);
      expect(promptText).not.toMatch(/nearby cities/i);
      expect(promptText).toMatch(/related, nearby, or popular cities\/routes/i);
    });
  }
});

describe("index.ts — authorization runs before the paid AI-gateway call", () => {
  it("imports and calls requireAdmin", () => {
    expect(indexSource).toMatch(/import\s*\{\s*requireAdmin\s*\}\s*from\s*"\.\.\/_shared\/admin-auth\.ts"/);
    expect(indexSource).toMatch(/await requireAdmin\(req, supabase\)/);
  });

  it("fails closed (401/403) before the provider is ever called", () => {
    const authIndex = indexSource.indexOf("await requireAdmin(req, supabase)");
    const providerCallIndex = indexSource.indexOf("provider.complete(");
    expect(authIndex).toBeGreaterThan(-1);
    expect(providerCallIndex).toBeGreaterThan(-1);
    expect(authIndex).toBeLessThan(providerCallIndex);
    expect(indexSource).toMatch(/if \(!auth\.ok\)/);
  });

  it("config.toml keeps the platform JWT gate ON for this admin-only function", () => {
    const section = configSource.slice(configSource.indexOf("[functions.generate-seo-content]"));
    expect(section.slice(0, 80)).toMatch(/verify_jwt = true/);
  });
});

describe("index.ts — the provenance gate rejects rather than launders violating content", () => {
  it("imports and applies validateGeneratedRouteContent", () => {
    expect(indexSource).toMatch(/import\s*\{\s*validateGeneratedRouteContent\s*\}\s*from\s*"\.\.\/_shared\/content-trust\.ts"/);
    expect(indexSource).toMatch(/validateGeneratedRouteContent\(parsedContent\)/);
  });

  it("returns HTTP 422 and omits `content` entirely when violations are found", () => {
    // Bounded by the next statement after the rejection block rather than a
    // literal "}\n" — CRLF-safe (this repo's working tree uses CRLF).
    const blockStart = indexSource.indexOf("if (violations.length > 0)");
    const blockEnd = indexSource.indexOf("// Generate a slug", blockStart);
    expect(blockStart).toBeGreaterThan(-1);
    expect(blockEnd).toBeGreaterThan(blockStart);
    const block = indexSource.slice(blockStart, blockEnd);
    expect(block).toMatch(/status: 422/);
    expect(block).not.toMatch(/content:/);
  });
});

describe("index.ts — the response is an explicit field whitelist, never a raw spread (BF-0R-3 review follow-up, P0-2)", () => {
  it("does not spread parsedContent into the response", () => {
    // The old code did `...parsedContent`, which would forward ANY field the
    // model returned — including popularCities — regardless of what the
    // prompt asked for. A model can ignore instructions; only an explicit
    // whitelist is a real guarantee.
    expect(indexSource).not.toMatch(/\.\.\.parsedContent/);
  });

  it("never forwards popularCities even if the model returns it anyway", () => {
    const responseBlockStart = indexSource.indexOf("content: {");
    const responseBlockEnd = indexSource.indexOf("},", responseBlockStart);
    expect(responseBlockStart).toBeGreaterThan(-1);
    const responseBlock = indexSource.slice(responseBlockStart, responseBlockEnd);
    expect(responseBlock).not.toMatch(/popularCities/);
  });

  it("the whitelist covers exactly the fields the provenance gate validated", () => {
    for (const field of ["title", "metaDescription", "h1Title", "introParagraph", "mainContent", "travelTips", "faqs"]) {
      expect(indexSource).toMatch(new RegExp(`${field}:`));
    }
  });
});

describe("legacy fabricated-fact request cannot silently return", () => {
  it("the old unsourced-fact prompt phrasing is gone", () => {
    const combined = `${indexSource}\n${buildFlightsPrompt("A", "B")}\n${buildHotelsPrompt("B")}`;
    expect(combined).not.toMatch(/best time to fly, airlines operating this route, typical flight duration/i);
    expect(combined).not.toMatch(/peak vs off-peak seasons, budget tips/i);
  });

  it("index.ts no longer builds the AI request inline (uses the shared provider)", () => {
    expect(indexSource).not.toMatch(/ai\.gateway\.lovable\.dev/);
    expect(indexSource).toMatch(/createLovableGatewayProvider/);
  });
});
