import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert travel content writer and SEO specialist. Generate comprehensive, unique, and engaging content for travel landing pages. Your content should:
- Be informative and helpful for travelers
- Include practical tips and insights
- Be optimized for search engines without keyword stuffing
- Sound natural and professional
- Use British English spelling`;

    const userPrompt = type === "flights" 
      ? `Generate SEO-optimized content for a "Cheap Flights from ${origin} to ${destination}" landing page. 

Return a JSON object with these exact fields:
{
  "title": "SEO title under 60 characters with main keyword",
  "metaDescription": "Meta description under 160 characters summarizing the page",
  "h1Title": "H1 heading that's engaging and includes the route",
  "introParagraph": "2-3 sentence intro paragraph that hooks readers and mentions the route",
  "mainContent": "600-800 word article covering: best time to fly, airlines operating this route, typical flight duration, money-saving tips, what to expect at both airports, and reasons to visit the destination. Use markdown formatting with ## subheadings.",
  "travelTips": [
    {"title": "Tip title", "content": "Detailed tip content (2-3 sentences)"}
  ],
  "faqs": [
    {"question": "Specific question about this route?", "answer": "Detailed answer (2-3 sentences)"}
  ],
  "popularCities": [
    {"name": "City Name", "code": "XXX"}
  ]
}

Include exactly 5 travel tips, 5 FAQs, and 4 related cities near the destination. Make all content unique to this specific route.`
      : `Generate SEO-optimized content for a "Best Hotels in ${destination}" landing page.

Return a JSON object with these exact fields:
{
  "title": "SEO title under 60 characters with main keyword",
  "metaDescription": "Meta description under 160 characters summarizing the page",
  "h1Title": "H1 heading that's engaging and mentions the destination",
  "introParagraph": "2-3 sentence intro paragraph that hooks readers",
  "mainContent": "600-800 word article covering: best areas to stay, types of accommodation available, peak vs off-peak seasons, budget tips, amenities to look for, and what makes the destination special. Use markdown formatting with ## subheadings.",
  "travelTips": [
    {"title": "Tip title", "content": "Detailed tip content (2-3 sentences)"}
  ],
  "faqs": [
    {"question": "Specific question about hotels here?", "answer": "Detailed answer (2-3 sentences)"}
  ],
  "popularCities": [
    {"name": "City Name", "code": "XXX"}
  ]
}

Include exactly 5 travel tips, 5 FAQs, and 4 nearby cities. Make all content unique to this destination.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to generate content");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content generated");
    }

    // Parse the JSON from the response
    let parsedContent;
    try {
      // Extract JSON from markdown code blocks if present
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
      const jsonStr = jsonMatch ? jsonMatch[1].trim() : content.trim();
      parsedContent = JSON.parse(jsonStr);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse generated content");
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
