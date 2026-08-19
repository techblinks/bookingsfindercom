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
 * This version:
 *   - requires an authenticated admin caller (see _shared/admin-auth.ts) and
 *     fails closed (401/403) before touching the database;
 *   - asks the model for editorial/organisational copy only (see
 *     route-generation-core.ts) and never requests a fact it cannot source;
 *   - re-validates every response against the provenance gate in
 *     _shared/content-trust.ts — content that still asserts an unsourced fact
 *     is discarded (never written to the row), and the row is marked
 *     'failed_validation';
 *   - NEVER sets `is_published`. Successful generation lands as
 *     'generated_pending_review' with `is_published` left at its schema
 *     default (false). Publication is a separate, explicit human action (see
 *     src/pages/AdminRouteGenerator.tsx) gated by the existing
 *     "Admins can manage route pages" RLS policy.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { createLovableGatewayProvider, parseProviderJson } from "../_shared/ai-provider.ts";
import { buildRouteGenerationUpdate, GenerationStatus } from "../_shared/content-trust.ts";
import { buildRoutePagePrompt, ROUTE_GENERATION_SYSTEM_PROMPT, type RouteRequest } from "./route-generation-core.ts";

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
    // verify_jwt=false at the platform level only means Supabase itself
    // won't reject unauthenticated requests; this function must still prove
    // the caller is an admin before it is allowed to drive service-role
    // writes. See _shared/admin-auth.ts for the shared convention.
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

    // Insert pending records first
    const pendingRecords = routes.map(r => ({
      slug: `${r.origin_city.toLowerCase().replace(/\s+/g, '-')}-to-${r.destination_city.toLowerCase().replace(/\s+/g, '-')}`,
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

    // Upsert to avoid duplicates
    const { data: inserted, error: insertError } = await supabase
      .from('seo_route_pages')
      .upsert(pendingRecords, { onConflict: 'slug', ignoreDuplicates: true })
      .select('id, slug');

    if (insertError) {
      console.error("Insert error:", insertError);
      throw new Error(`Failed to create route records: ${insertError.message}`);
    }

    // Process each route with AI (sequentially to avoid rate limits)
    let generated = 0;
    let failed = 0;
    let failedValidation = 0;

    for (const route of routes) {
      const slug = `${route.origin_city.toLowerCase().replace(/\s+/g, '-')}-to-${route.destination_city.toLowerCase().replace(/\s+/g, '-')}`;

      try {
        // Mark as generating
        await supabase.from('seo_route_pages')
          .update({ generation_status: GenerationStatus.GENERATING })
          .eq('slug', slug);

        const prompt = buildRoutePagePrompt(route);

        const result = await provider.complete({
          messages: [
            { role: "system", content: ROUTE_GENERATION_SYSTEM_PROMPT },
            { role: "user", content: prompt },
          ],
          temperature: 0.8,
        });

        if (!result.ok) {
          if (result.reason === "rate_limited") {
            // Rate limited — wait and retry once
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }
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
            .eq('slug', slug);
          failedValidation++;
          continue;
        }

        const content = gate.content;

        // Update the record with generated content. `is_published` is
        // deliberately never referenced here — it keeps its schema default
        // (false) until an explicit human publish action sets it.
        await supabase.from('seo_route_pages').update({
          title: content.title || `Cheap Flights ${route.origin_city} to ${route.destination_city}`,
          meta_description: content.metaDescription || '',
          h1_title: content.h1Title || '',
          intro_paragraph: content.introParagraph || '',
          main_content: content.mainContent || '',
          travel_tips: content.travelTips || [],
          faqs: content.faqs || [],
          related_routes: (parsed.relatedRoutes ?? parsed.related_routes) || [],
          generation_status: GenerationStatus.GENERATED_PENDING_REVIEW,
        }).eq('slug', slug);

        generated++;

        // Small delay between requests to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`Failed to generate ${slug}:`, err);
        await supabase.from('seo_route_pages')
          .update({ generation_status: GenerationStatus.FAILED })
          .eq('slug', slug);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated, failed, failedValidation, total: routes.length }),
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
