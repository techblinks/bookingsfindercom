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

  it("does not ask the model to invent related routes (BF-0R-3 review follow-up, P0-2)", () => {
    // The model has no genuine source for which routes are related, nearby,
    // or popular — asking for this is the same class of defect as asking for
    // a fare or an airline: an unsourced fact dressed up as editorial help.
    expect(prompt).not.toMatch(/"relatedRoutes"/);
    expect(prompt).not.toMatch(/related routes/i);
    expect(fullPromptText).toMatch(/related or nearby routes\/cities/i);
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
    expect(indexSource).toMatch(/import\s*\{\s*buildRouteGenerationUpdate,\s*GenerationStatus,\s*isRegenerationBlocked\s*\}\s*from\s*"\.\.\/_shared\/content-trust\.ts"/);
    expect(indexSource).toMatch(/buildRouteGenerationUpdate\(\{/);
  });

  it("discards content and marks FAILED_VALIDATION when the gate rejects it", () => {
    expect(indexSource).toMatch(/GenerationStatus\.FAILED_VALIDATION/);
    expect(indexSource).toMatch(/!gate\.content/);
  });
});

describe("index.ts — a published row is off-limits to regeneration (BF-0R-3 review follow-up, P0-1)", () => {
  it("imports isRegenerationBlocked from content-trust", () => {
    expect(indexSource).toMatch(/import\s*\{\s*buildRouteGenerationUpdate,\s*GenerationStatus,\s*isRegenerationBlocked\s*\}\s*from\s*"\.\.\/_shared\/content-trust\.ts"/);
  });

  it("resolves existing is_published state for every requested slug before the generation loop", () => {
    const lookupIndex = indexSource.indexOf(".select('slug, is_published')");
    const loopIndex = indexSource.indexOf("for (const route of routes)");
    expect(lookupIndex).toBeGreaterThan(-1);
    expect(loopIndex).toBeGreaterThan(-1);
    expect(lookupIndex).toBeLessThan(loopIndex);
  });

  it("fails closed (throws, mutates nothing) if the existing-state lookup itself errors", () => {
    expect(indexSource).toMatch(/existingRowsError[\s\S]{0,200}throw new Error/);
  });

  it("skips a published slug with NO database write at all — not even the transient GENERATING status", () => {
    const skipIndex = indexSource.indexOf("publishedSlugs.has(slug)");
    expect(skipIndex).toBeGreaterThan(-1);
    const generatingIndex = indexSource.indexOf("GenerationStatus.GENERATING");
    // The published-slug check must appear in the loop BEFORE the first
    // mutating write (marking the row 'generating'), so a published row is
    // never touched even transiently.
    expect(skipIndex).toBeLessThan(generatingIndex);
    // And it must `continue` — no code path between the check and the next
    // iteration may call .update(...) for this slug.
    const checkBlock = indexSource.slice(skipIndex, indexSource.indexOf("continue;", skipIndex) + "continue;".length);
    expect(checkBlock).not.toMatch(/\.update\(/);
  });

  it("builds the published-slugs set using isRegenerationBlocked, not an ad-hoc check", () => {
    expect(indexSource).toMatch(/filter\(isRegenerationBlocked\)/);
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

  it("the successful-generation write payload (the SET clause) never sets is_published", () => {
    // Anchor on the unique destructuring assignment that introduces the
    // content write, then bound the payload from its `.update({` to the
    // first `.eq('slug', slug)` that follows — both unique within this
    // narrow, anchored region, so this cannot accidentally span an earlier
    // `.update(` call elsewhere in the file.
    const writeStart = indexSource.indexOf("const { data: writeResult, error: writeError } = await supabase");
    expect(writeStart).toBeGreaterThan(-1);
    const region = indexSource.slice(writeStart, writeStart + 900);
    const payloadStart = region.indexOf(".update({");
    const payloadEnd = region.indexOf(".eq('slug', slug)", payloadStart);
    expect(payloadStart).toBeGreaterThan(-1);
    expect(payloadEnd).toBeGreaterThan(payloadStart);
    const payload = region.slice(payloadStart, payloadEnd);
    expect(payload).not.toMatch(/is_published/);
    expect(payload).toMatch(/generation_status: GenerationStatus\.GENERATED_PENDING_REVIEW/);
  });

  it("the pending-record insert leaves is_published explicitly false", () => {
    expect(indexSource).toMatch(/is_published:\s*false,/);
  });
});

describe("index.ts — TOCTOU hardening: every mutating write also requires is_published=false AT WRITE TIME (BF-0R-3 final hardening, P0)", () => {
  // The preflight snapshot (`publishedSlugs`) proves a row was unpublished
  // when the batch STARTED. It cannot prove that a row is still unpublished
  // by the time a given route's write actually runs — the review dialog can
  // publish it concurrently. Every mutating `.update(...)` for a route must
  // therefore also carry its own `.eq('is_published', false)` condition, so
  // it can only ever affect a row that is unpublished right now, not a row
  // the code merely believed to be unpublished earlier.
  //
  // This is deliberately a DIFFERENT thing from "does the SET clause assign
  // is_published" (checked above, and must remain false/absent): a query can
  // — and here must — READ/FILTER on is_published without ever WRITING it.

  it("the GENERATING status write requires is_published=false", () => {
    const idx = indexSource.indexOf("generation_status: GenerationStatus.GENERATING");
    expect(idx).toBeGreaterThan(-1);
    const nearby = indexSource.slice(idx, idx + 200);
    expect(nearby).toMatch(/\.eq\('slug', slug\)\s*\n\s*\.eq\('is_published', false\)/);
  });

  it("the FAILED_VALIDATION status write requires is_published=false", () => {
    // The colon form (`generation_status: GenerationStatus.FAILED_VALIDATION`)
    // is unique to this update's SET payload — the provenance-gate check
    // earlier in the file uses `===`, not a colon, so it cannot collide.
    const idx = indexSource.indexOf("generation_status: GenerationStatus.FAILED_VALIDATION");
    expect(idx).toBeGreaterThan(-1);
    const nearby = indexSource.slice(idx, idx + 200);
    expect(nearby).toMatch(/\.eq\('slug', slug\)\s*\n\s*\.eq\('is_published', false\)/);
  });

  it("the FAILED status write (catch block) requires is_published=false", () => {
    const idx = indexSource.indexOf("catch (err)");
    expect(idx).toBeGreaterThan(-1);
    const nearby = indexSource.slice(idx, idx + 300);
    expect(nearby).toMatch(/GenerationStatus\.FAILED \}\)[\s\S]*?\.eq\('slug', slug\)\s*\n\s*\.eq\('is_published', false\)/);
  });

  it("the successful-content write requires is_published=false AND verifies it actually matched a row", () => {
    const writeStart = indexSource.indexOf("const { data: writeResult, error: writeError } = await supabase");
    expect(writeStart).toBeGreaterThan(-1);
    const region = indexSource.slice(writeStart, writeStart + 900);
    expect(region).toMatch(/\.eq\('slug', slug\)/);
    expect(region).toMatch(/\.eq\('is_published', false\)/);
    expect(region).toMatch(/\.select\('id'\)/);
  });

  it("zero rows matched by the content write is treated as a protected skip, not a success, and not a failure", () => {
    expect(indexSource).toMatch(/if \(!writeResult \|\| writeResult\.length === 0\)/);
    const zeroRowBlockStart = indexSource.indexOf("if (!writeResult || writeResult.length === 0)");
    // Bounded to exactly this if-block's own body (up to its own
    // `continue;`), so it cannot spill into the `generated++` that runs
    // AFTER the block when the condition is false.
    const zeroRowBlockEnd = indexSource.indexOf("continue;", zeroRowBlockStart) + "continue;".length;
    const zeroRowBlock = indexSource.slice(zeroRowBlockStart, zeroRowBlockEnd);
    expect(zeroRowBlock).toMatch(/skippedPublished\+\+/);
    expect(zeroRowBlock).not.toMatch(/generated\+\+/);
    expect(zeroRowBlock).not.toMatch(/failed\+\+/);
  });

  it("a write error on the content update fails closed (throws) rather than being swallowed", () => {
    expect(indexSource).toMatch(/if \(writeError\)\s*\{\s*throw new Error/);
  });
});

describe("index.ts — publication-state preflight runs before ANY mutation, including the pending insert (BF-0R-3 final hardening, P1)", () => {
  it("the is_published lookup happens before the pending-record insert AND before the generation loop", () => {
    const lookupIndex = indexSource.indexOf(".select('slug, is_published')");
    const pendingRecordsIndex = indexSource.indexOf("const pendingRecords = routes");
    const upsertIndex = indexSource.indexOf(".upsert(pendingRecords");
    const loopIndex = indexSource.indexOf("for (const route of routes)");
    expect(lookupIndex).toBeGreaterThan(-1);
    expect(lookupIndex).toBeLessThan(pendingRecordsIndex);
    expect(lookupIndex).toBeLessThan(upsertIndex);
    expect(lookupIndex).toBeLessThan(loopIndex);
  });

  it("a published slug is excluded from the pending-record insert itself, not just from the generation loop", () => {
    expect(indexSource).toMatch(/const pendingRecords = routes\s*\n\s*\.filter\(r => !publishedSlugs\.has\(buildRouteSlug\(r\)\)\)/);
  });

  it("the pending insert is skipped entirely (not even an empty-array call) when nothing is eligible", () => {
    expect(indexSource).toMatch(/if \(pendingRecords\.length > 0\)\s*\{/);
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

describe("index.ts — a rate-limited route is retried, never abandoned mid-flight (BF-0R-3 review follow-up, P1)", () => {
  it("no longer contains the old bug: `continue` immediately inside the rate_limited branch", () => {
    // The old code was:
    //   if (result.reason === "rate_limited") { await delay; continue; }
    // `continue` here skipped to the NEXT route entirely, abandoning the
    // current one already marked 'generating' — it never got a second
    // attempt and its row was stuck forever. That exact shape must be gone.
    expect(indexSource).not.toMatch(/rate_limited"\)\s*\{\s*[\s\S]{0,120}continue;\s*\}/);
  });

  it("calls provider.complete a second time for the SAME route after a rate-limit backoff", () => {
    const matches = indexSource.match(/provider\.complete\(\{ messages, temperature: 0\.8 \}\)/g) ?? [];
    // Once for the initial attempt, once for the retry.
    expect(matches.length).toBe(2);
  });

  it("the retry is gated specifically on the rate_limited reason", () => {
    expect(indexSource).toMatch(/!result\.ok && result\.reason === "rate_limited"/);
  });

  it("only ever performs one retry — a second rate_limited result is treated as a genuine failure", () => {
    // After the single retry block, the next check is the general
    // `if (!result.ok) throw` — there is no loop or further retry logic.
    const retryIndex = indexSource.indexOf('result.reason === "rate_limited"');
    const afterRetry = indexSource.slice(retryIndex);
    expect(afterRetry).toMatch(/if \(!result\.ok\) \{\s*throw new Error/);
  });

  it("the rate-limit branch itself contains no bare `continue;` statement", () => {
    // Every exit from the per-route try block must either retry, update the
    // row again (failed_validation / success / failed), or be the
    // published-row skip (which never wrote GENERATING in the first place).
    // Isolate just the rate_limited branch's own block and confirm it has no
    // `continue;` of its own — retrying is the only exit it takes.
    const branchStart = indexSource.indexOf('result.reason === "rate_limited"');
    const branchEnd = indexSource.indexOf("\n        }", branchStart);
    const branch = indexSource.slice(branchStart, branchEnd);
    expect(branch).not.toMatch(/continue;/);
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
