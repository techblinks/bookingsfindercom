/**
 * generate-seo-content — AI-assisted landing-page copy generation (BF-0R-3
 * trust integrity).
 *
 * Previous defect: this function was reachable by anyone holding the public
 * anon key (verify_jwt=false, no in-function authorization check at all) and
 * asked the model for unsourced factual travel claims (typical price, best
 * time to fly, airlines operating the route, flight duration, peak/off-peak
 * seasons). It made a real paid AI-gateway call per request with no
 * authorization, and callers (src/pages/AdminContentGenerator.tsx) could save
 * the fabricated output straight into `country_landing_pages`.
 *
 * This version:
 *   - requires an authenticated admin caller (see _shared/admin-auth.ts) and
 *     fails closed (401/403) before spending an AI-gateway call;
 *   - asks the model for editorial/organisational copy only (see
 *     seo-content-core.ts) and never requests a fact it cannot source;
 *   - re-validates the response against the provenance gate in
 *     _shared/content-trust.ts. Content that still asserts an unsourced fact
 *     is REJECTED (422, `content` omitted) rather than handed back to the
 *     admin UI as though it were safe to publish — the caller must
 *     regenerate, it cannot silently save fabricated text.
 *
 * This function still performs no database write of its own; publication of
 * whatever the admin chooses to save remains gated by the existing
 * `country_landing_pages` "Admins can manage country pages" RLS policy.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { requireAdmin } from "../_shared/admin-auth.ts";
import { createLovableGatewayProvider, parseProviderJson } from "../_shared/ai-provider.ts";
import { validateGeneratedRouteContent } from "../_shared/content-trust.ts";
import { buildFlightsPrompt, buildHotelsPrompt, SEO_CONTENT_SYSTEM_PROMPT } from "./seo-content-core.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface GenerateRequest {
  origin: string;
  destination: string;
  type: "flights" | "hotels";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, type }: GenerateRequest = await req.json();

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: "Origin and destination are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Authorization: fail closed before spending an AI-gateway call ────
    // verify_jwt=false at the platform level only means Supabase itself
    // won't reject unauthenticated requests; this function must still prove
    // the caller is an admin. See _shared/admin-auth.ts.
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const auth = await requireAdmin(req, supabase);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ error: auth.error }),
        { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const provider = createLovableGatewayProvider(LOVABLE_API_KEY, "google/gemini-3-flash-preview");

    const userPrompt = type === "flights"
      ? buildFlightsPrompt(origin, destination)
      : buildHotelsPrompt(destination);

    const result = await provider.complete({
      messages: [
        { role: "system", content: SEO_CONTENT_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    });

    if (!result.ok) {
      if (result.reason === "rate_limited") {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (result.reason === "credits_exhausted") {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("Failed to generate content");
    }

    const parsedContent = parseProviderJson<Record<string, unknown>>(result.content);
    if (!parsedContent) {
      console.error("Failed to parse AI response:", result.content);
      throw new Error("Failed to parse generated content");
    }

    // ── Provenance gate ───────────────────────────────────────────────────
    // Fails closed: content asserting an unsourced fact is rejected outright,
    // never handed back to the admin UI as though it were safe to save.
    const violations = validateGeneratedRouteContent(parsedContent);
    if (violations.length > 0) {
      console.warn(
        `generate-seo-content rejected for ${origin}->${destination}:`,
        violations.map(v => `${v.category}@${v.field}`).join(", "),
      );
      return new Response(
        JSON.stringify({
          error: "Generated content failed the provenance check and was not returned. Try regenerating.",
          violations: violations.map(v => ({ category: v.category, field: v.field })),
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate a slug from origin and destination
    const slug = type === "flights"
      ? `cheap-flights-${origin.toLowerCase().replace(/\s+/g, '-')}-to-${destination.toLowerCase().replace(/\s+/g, '-')}`
      : `hotels-in-${destination.toLowerCase().replace(/\s+/g, '-')}`;

    return new Response(
      JSON.stringify({
        success: true,
        content: {
          slug,
          type,
          origin,
          destination,
          ...parsedContent,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating content:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Failed to generate content"
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
