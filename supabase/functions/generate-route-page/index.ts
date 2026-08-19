/**
 * generate-route-page — AI-assisted SEO route page generation (BF-0R-3 trust
 * integrity).
 *
 * Previous defect: this function was reachable by anyone holding the public
 * anon key (verify_jwt=false, no in-function authorization check), used the
 * service-role key to bypass RLS, asked the model for unsourced factual
 * travel claims (typical price, airlines, duration, best time to fly, saving
 * tips), and wrote `generation_status: 'completed'` + `is_published: true`
 * directly from model output in one update — so AI completion WAS
 * publication, with no human review and no source for any of the "facts".
 *
 * BF-0R-3 review follow-up fixed a second defect in the first pass: because
 * a request can re-generate an existing slug, an already-PUBLISHED row's
 * approved content could be silently overwritten by fresh, unreviewed model
 * output while the row stayed live and indexable — publication truth
 * (`is_published`) and displayed content could disagree. See the
 * "published rows are off-limits" block below.
 *
 * BF-0R-3 final hardening pass fixed a remaining TOCTOU (time-of-check/
 * time-of-use) gap in that fix: the publication-state lookup was a snapshot
 * taken once, before the loop — a row could theoretically become published
 * (via the admin's review dialog, running concurrently) in the window
 * between that snapshot and a given route's actual write. It also moved that
 * lookup to before the pending-record insert, so a published slug is never
 * touched by ANY step, including the insert. Every mutating write in the
 * loop below now carries its own `is_published = false` condition, so it can
 * only ever affect a row that is unpublished at the exact moment of the
 * write — not at some earlier point the code merely believed to be current.
 * The content-write specifically verifies it actually matched a row; zero
 * matches means the row was published in that window, and the generated
 * content is discarded rather than silently lost track of.
 *
 * This version:
 *   - requires an authenticated admin caller (see _shared/admin-auth.ts) and
 *     fails closed (401/403) before touching the database;
 *   - resolves every requested slug's CURRENT `is_published` state BEFORE any
 *     write (including the pending-record insert), and skips (no mutation at
 *     all — not even the transient 'generating' status) any slug that is
 *     already published;
 *   - additionally conditions every mutating write for a route on
 *     `is_published = false` at write time, closing the TOCTOU gap the
 *     preflight snapshot alone could not close;
 *   - asks the model for editorial/organisational copy only (see
 *     route-generation-core.ts) and never requests a fact it cannot source,
 *     including no invented related routes;
 *   - re-validates every response against the provenance gate in
 *     _shared/content-trust.ts — content that still asserts an unsourced fact
 *     is discarded (never written to the row), and the row is marked
 *     'failed_validation';
 *   - retries a rate-limited request exactly once for the SAME route rather
 *     than abandoning it mid-flight (which used to leave the row stuck in
 *     'generating' forever);
 *   - NEVER sets `is_published`. Successful generation lands as
 *     'generated_pending_review' with `is_published` left at its schema
 *     default (false). Publication is a separate, explicit human action,
 *     gated behind a mandatory content-review surface with its own
 *     optimistic-concurrency guard (see src/pages/AdminRouteGenerator.tsx)
 *     and enforced independently by the existing "Admins can manage route
 *     pages" RLS policy.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { createLovableGatewayProvider, parseProviderJson } from "../_shared/ai-provider.ts";
import { buildRouteGenerationUpdate, GenerationStatus, isRegenerationBlocked } from "../_shared/content-trust.ts";
import { buildRoutePagePrompt, buildRouteSlug, ROUTE_GENERATION_SYSTEM_PROMPT, type RouteRequest } from "./route-generation-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { routes } = await req.json() as { routes: RouteRequest[] };

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Routes array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // ── Authorization: fail closed before any database mutation ──────────
    // config.toml sets verify_jwt=true for this function, so the platform
    // already rejects a request with no/invalid JWT before this code runs.
    // That is layer one. requireAdmin is layer two: it additionally rejects
    // a valid, authenticated JWT that does not belong to an admin — the
    // platform gate alone would let that caller through. Both layers are
    // required before this function is allowed to drive service-role writes.
    // See _shared/admin-auth.ts for the shared convention.
    const auth = await requireAdmin(req, supabase);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const provider = createLovableGatewayProvider(LOVABLE_API_KEY, "google/gemini-2.5-flash-lite");

    // ── Published-row protection (P0-1), resolved BEFORE any mutation ────
    // Resolve every requested slug's CURRENT is_published state first —
    // before even the pending-record insert. A row a human already reviewed
    // and published must not be touched by this call at all — not its
    // content, not even its generation_status, not even an attempted insert
    // — until it is explicitly unpublished. Failing to look this up is
    // treated the same as finding it published: fail closed, skip the whole
    // batch, rather than risk silently overwriting approved content.
    const requestedSlugs = routes.map(buildRouteSlug);
    const { data: existingRows, error: existingRowsError } = await supabase
      .from('seo_route_pages')
      .select('slug, is_published')
      .in('slug', requestedSlugs);

    if (existingRowsError) {
      console.error("Failed to resolve existing publication state:", existingRowsError);
      throw new Error(`Failed to verify existing route state: ${existingRowsError.message}`);
    }

    const publishedSlugs = new Set(
      (existingRows ?? []).filter(isRegenerationBlocked).map(row => row.slug as string),
    );

    // Insert pending records — excluding any slug already known to be
    // published, so a published row is never included in pending-insertion
    // work either (ignoreDuplicates already made this a no-op for it, but it
    // must never even be attempted).
    const pendingRecords = routes
      .filter(r => !publishedSlugs.has(buildRouteSlug(r)))
      .map(r => ({
        slug: buildRouteSlug(r),
        origin_city: r.origin_city,
        destination_city: r.destination_city,
        origin_iata: r.origin_iata,
        destination_iata: r.destination_iata,
        title: `Cheap Flights ${r.origin_city} to ${r.destination_city}`,
        meta_description: `Compare cheap flights from ${r.origin_city} to ${r.destination_city}.`,
        h1_title: `Cheap Flights from ${r.origin_city} to ${r.destination_city}`,
        intro_paragraph: '',
        main_content: '',
        generation_status: GenerationStatus.PENDING,
        is_published: false,
      }));

    // Upsert to avoid duplicates. `ignoreDuplicates` means this never
    // touches a row that already exists for a slug — it only inserts
    // genuinely new rows.
    if (pendingRecords.length > 0) {
      const { error: insertError } = await supabase
        .from('seo_route_pages')
        .upsert(pendingRecords, { onConflict: 'slug', ignoreDuplicates: true })
        .select('id, slug');

      if (insertError) {
        console.error("Insert error:", insertError);
        throw new Error(`Failed to create route records: ${insertError.message}`);
      }
    }

    // Process each route with AI (sequentially to avoid rate limits)
    let generated = 0;
    let failed = 0;
    let failedValidation = 0;
    let skippedPublished = 0;

    for (const route of routes) {
      const slug = buildRouteSlug(route);

      if (publishedSlugs.has(slug)) {
        // Off-limits: this slug is currently published. No AI call, no
        // database write of any kind for it in this request.
        console.warn(`Skipping ${slug}: row is published — regeneration is blocked until it is explicitly unpublished.`);
        skippedPublished++;
        continue;
      }

      try {
        // Mark as generating. TOCTOU hardening: `is_published = false` is
        // also required here, not just at the preflight snapshot above — a
        // row could become published in the window between that snapshot
        // and this write. If it did, this update simply matches zero rows
        // and the row is left untouched.
        await supabase.from('seo_route_pages')
          .update({ generation_status: GenerationStatus.GENERATING })
          .eq('slug', slug)
          .eq('is_published', false);

        const prompt = buildRoutePagePrompt(route);
        const messages = [
          { role: "system" as const, content: ROUTE_GENERATION_SYSTEM_PROMPT },
          { role: "user" as const, content: prompt },
        ];

        let result = await provider.complete({ messages, temperature: 0.8 });

        if (!result.ok && result.reason === "rate_limited") {
          // Exactly one retry, for THIS route, after a real backoff — the
          // previous version's `continue` here abandoned the route mid-flight
          // and left its row stuck in 'generating' forever.
          await new Promise(r => setTimeout(r, 5000));
          result = await provider.complete({ messages, temperature: 0.8 });
        }

        if (!result.ok) {
          throw new Error(`AI error: ${result.reason}`);
        }

        const parsed = parseProviderJson<Record<string, unknown>>(result.content);
        if (!parsed) throw new Error("Failed to parse AI response");

        // ── Provenance gate ─────────────────────────────────────────────
        // Fails closed: content asserting an unsourced fact is discarded,
        // never written to the row, and can never become 'completed' or
        // publishable. AI completion is not publication either way — see
        // module doc comment.
        const gate = buildRouteGenerationUpdate({
          title: parsed.title,
          metaDescription: parsed.metaDescription ?? parsed.meta_description,
          h1Title: parsed.h1Title ?? parsed.h1_title,
          introParagraph: parsed.introParagraph ?? parsed.intro_paragraph,
          mainContent: parsed.mainContent ?? parsed.main_content,
          travelTips: parsed.travelTips ?? parsed.travel_tips,
          faqs: parsed.faqs,
        });

        if (gate.generation_status === GenerationStatus.FAILED_VALIDATION || !gate.content) {
          console.warn(
            `Route ${slug} failed the provenance gate:`,
            gate.violations.map(v => `${v.category}@${v.field}`).join(", "),
          );
          await supabase.from('seo_route_pages')
            .update({ generation_status: GenerationStatus.FAILED_VALIDATION })
            .eq('slug', slug)
            .eq('is_published', false);
          failedValidation++;
          continue;
        }

        const content = gate.content;

        // Write the generated content. `is_published` is deliberately never
        // SET here — it keeps its schema default (false) until an explicit
        // human publish action sets it. There is also no `related_routes`
        // write here (P0-2): the model is not a source of genuine route
        // relationships, so that field is left untouched rather than
        // populated from model memory.
        //
        // TOCTOU hardening: the WHERE clause requires `is_published = false`
        // at the moment of this exact write, and `.select('id')` reports
        // which row(s) actually matched. The preflight snapshot above proved
        // the row was unpublished when the batch started; this proves it
        // still is, right now. If the admin published it via the review
        // dialog in between, zero rows match — the generated content is
        // discarded, never applied over live approved content.
        const { data: writeResult, error: writeError } = await supabase
          .from('seo_route_pages')
          .update({
            title: content.title || `Cheap Flights ${route.origin_city} to ${route.destination_city}`,
            meta_description: content.metaDescription || '',
            h1_title: content.h1Title || '',
            intro_paragraph: content.introParagraph || '',
            main_content: content.mainContent || '',
            travel_tips: content.travelTips || [],
            faqs: content.faqs || [],
            generation_status: GenerationStatus.GENERATED_PENDING_REVIEW,
          })
          .eq('slug', slug)
          .eq('is_published', false)
          .select('id');

        if (writeError) {
          throw new Error(`Failed to write generated content: ${writeError.message}`);
        }

        if (!writeResult || writeResult.length === 0) {
          // Became published between the preflight snapshot and this write —
          // treated exactly like the preflight skip: protected, not counted
          // as a generation failure.
          console.warn(`Skipping ${slug}: became published mid-generation — discarding generated content, not applying it.`);
          skippedPublished++;
          continue;
        }

        generated++;

        // Small delay between requests to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`Failed to generate ${slug}:`, err);
        await supabase.from('seo_route_pages')
          .update({ generation_status: GenerationStatus.FAILED })
          .eq('slug', slug)
          .eq('is_published', false);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated, failed, failedValidation, skippedPublished, total: routes.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
