import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Find pages scheduled to be published (where scheduled time has passed)
    const now = new Date().toISOString();
    
    const { data: scheduledPages, error: fetchError } = await supabase
      .from("country_landing_pages")
      .select("id, slug, title, scheduled_publish_at")
      .eq("is_published", false)
      .not("scheduled_publish_at", "is", null)
      .lte("scheduled_publish_at", now);

    if (fetchError) {
      console.error("Error fetching scheduled pages:", fetchError);
      throw fetchError;
    }

    if (!scheduledPages || scheduledPages.length === 0) {
      console.log("No pages scheduled for publishing at this time");
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "No pages to publish", 
          published: 0 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${scheduledPages.length} pages to publish`);

    // Publish all scheduled pages
    const pageIds = scheduledPages.map(p => p.id);
    
    const { error: updateError } = await supabase
      .from("country_landing_pages")
      .update({ 
        is_published: true, 
        scheduled_publish_at: null,
        updated_at: now
      })
      .in("id", pageIds);

    if (updateError) {
      console.error("Error publishing pages:", updateError);
      throw updateError;
    }

    const publishedTitles = scheduledPages.map(p => p.title);
    console.log("Successfully published pages:", publishedTitles);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Published ${scheduledPages.length} page(s)`,
        published: scheduledPages.length,
        pages: publishedTitles,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in publish-scheduled-pages:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
