import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface RouteRequest {
  origin_city: string;
  destination_city: string;
  origin_iata: string;
  destination_iata: string;
}

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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
      generation_status: 'pending',
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

    for (const route of routes) {
      const slug = `${route.origin_city.toLowerCase().replace(/\s+/g, '-')}-to-${route.destination_city.toLowerCase().replace(/\s+/g, '-')}`;

      try {
        // Mark as generating
        await supabase.from('seo_route_pages')
          .update({ generation_status: 'generating' })
          .eq('slug', slug);

        const prompt = `Generate SEO content for a "Cheap Flights from ${route.origin_city} (${route.origin_iata}) to ${route.destination_city} (${route.destination_iata})" page.

Return JSON with these exact fields:
{
  "title": "SEO title under 60 chars with keyword",
  "metaDescription": "Meta description under 160 chars",
  "h1Title": "Engaging H1 with route name",
  "introParagraph": "2-3 sentence hook mentioning the route, airports, and typical price range",
  "mainContent": "500-700 word article covering: best time to fly, airlines on this route, flight duration, money-saving tips, destination highlights. Use ## subheadings. Mention BookingsFinder as the comparison tool.",
  "travelTips": [{"title": "Tip", "content": "2-3 sentences"}],
  "faqs": [{"question": "Route-specific question?", "answer": "2-3 sentence answer"}],
  "relatedRoutes": [{"origin": "City", "destination": "City", "slug": "city-to-city"}]
}

Include 5 tips, 5 FAQs, and 4 related routes. Make content unique to this route.`;

        const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-lite",
            messages: [
              { role: "system", content: "You are an expert travel SEO content writer. Return only valid JSON, no markdown code blocks." },
              { role: "user", content: prompt },
            ],
            temperature: 0.8,
          }),
        });

        if (!aiResponse.ok) {
          if (aiResponse.status === 429) {
            // Rate limited — wait and retry once
            await new Promise(r => setTimeout(r, 5000));
            continue;
          }
          throw new Error(`AI error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;

        if (!content) throw new Error("No content generated");

        // Parse JSON
        let parsed;
        try {
          const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
          const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
          parsed = JSON.parse(jsonStr);
        } catch {
          throw new Error("Failed to parse AI response");
        }

        // Update the record with generated content
        await supabase.from('seo_route_pages').update({
          title: parsed.title || `Cheap Flights ${route.origin_city} to ${route.destination_city}`,
          meta_description: parsed.metaDescription || parsed.meta_description || '',
          h1_title: parsed.h1Title || parsed.h1_title || '',
          intro_paragraph: parsed.introParagraph || parsed.intro_paragraph || '',
          main_content: parsed.mainContent || parsed.main_content || '',
          travel_tips: parsed.travelTips || parsed.travel_tips || [],
          faqs: parsed.faqs || [],
          related_routes: parsed.relatedRoutes || parsed.related_routes || [],
          generation_status: 'completed',
          is_published: true,
        }).eq('slug', slug);

        generated++;

        // Small delay between requests to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));

      } catch (err) {
        console.error(`Failed to generate ${slug}:`, err);
        await supabase.from('seo_route_pages')
          .update({ generation_status: 'failed' })
          .eq('slug', slug);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, generated, failed, total: routes.length }),
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
