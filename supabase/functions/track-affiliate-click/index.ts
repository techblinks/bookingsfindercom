import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AffiliateClickRequest {
  type: "flight" | "hotel";
  action: "redirect" | "compare" | "view_deal";
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  airlineCode?: string;
  flightNumber?: string;
  hotelId?: string;
  price?: number;
  currency?: string;
  redirectUrl: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: AffiliateClickRequest = await req.json();

    // Validate required fields
    if (!body.type || !body.action || !body.redirectUrl) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: type, action, redirectUrl" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user agent for analytics
    const userAgent = req.headers.get("user-agent") || null;

    // Store the affiliate click
    const { error: insertError } = await supabase
      .from("affiliate_clicks")
      .insert({
        type: body.type,
        action: body.action,
        origin: body.origin || null,
        destination: body.destination || null,
        departure_date: body.departureDate || null,
        return_date: body.returnDate || null,
        airline_code: body.airlineCode || null,
        flight_number: body.flightNumber || null,
        hotel_id: body.hotelId || null,
        price: body.price || null,
        currency: body.currency || "USD",
        redirect_url: body.redirectUrl,
        user_agent: userAgent,
      });

    if (insertError) {
      console.error("Error storing affiliate click:", insertError);
      // Don't fail the request, just log the error
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Affiliate click tracking error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
