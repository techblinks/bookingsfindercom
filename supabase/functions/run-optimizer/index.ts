import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface OptimizerRequest {
  origin: string;
  destination: string;
  travelWindowStart: string;
  travelWindowEnd?: string;
  hasBags: boolean;
  priority: "cheapest" | "fastest" | "low_risk";
}

interface RiskAlert {
  type: string;
  severity: "low" | "medium" | "high";
  message: string;
}

// Rule-based optimizer engine (MVP)
function generateOptimization(request: OptimizerRequest) {
  const { origin, destination, travelWindowStart, travelWindowEnd, hasBags, priority } = request;

  // Base fare estimation (rule-based for MVP)
  const distanceFactors: Record<string, number> = {
    // Rough distance categories
    domestic: 150,
    short_haul: 350,
    medium_haul: 650,
    long_haul: 1200,
  };

  // Estimate distance category based on common routes
  const longHaulPairs = ["SYD-LHR", "LAX-LHR", "JFK-SIN", "SYD-LAX", "JFK-DXB"];
  const mediumHaulPairs = ["JFK-LHR", "LAX-JFK", "SYD-SIN", "DXB-LHR"];
  
  const routeKey = `${origin}-${destination}`;
  const reverseKey = `${destination}-${origin}`;
  
  let category = "short_haul";
  if (longHaulPairs.includes(routeKey) || longHaulPairs.includes(reverseKey)) {
    category = "long_haul";
  } else if (mediumHaulPairs.includes(routeKey) || mediumHaulPairs.includes(reverseKey)) {
    category = "medium_haul";
  }

  // Calculate base fare
  let baseFare = distanceFactors[category];
  
  // Add return trip factor
  if (travelWindowEnd) {
    baseFare *= 1.8; // Round trip discount
  }

  // Priority adjustments
  if (priority === "fastest") {
    baseFare *= 1.15; // Direct flights cost more
  } else if (priority === "low_risk") {
    baseFare *= 1.08; // Better airlines/connections
  }

  // Baggage estimate
  const baggageEstimate = hasBags ? (category === "long_haul" ? 80 : 50) : 0;

  // Transfer estimate (only for connecting flights)
  const stops = priority === "fastest" ? 0 : (category === "long_haul" ? 1 : 0);
  const transferEstimate = stops > 0 ? 25 : 0;

  // Extra fees estimate
  const extraFees = 15; // Booking fees, seat selection, etc.

  const totalCost = baseFare + baggageEstimate + transferEstimate + extraFees;

  // Duration estimation
  const durationMap: Record<string, number> = {
    domestic: 120,
    short_haul: 240,
    medium_haul: 480,
    long_haul: 960,
  };
  const duration = durationMap[category] + (stops * 90);

  // Timing advice (rule-based)
  const departureDate = new Date(travelWindowStart);
  const now = new Date();
  const daysUntilDeparture = Math.ceil((departureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let timingAdvice: "buy" | "wait" | "neutral" = "neutral";
  let timingReason = "";

  if (daysUntilDeparture < 7) {
    timingAdvice = "buy";
    timingReason = "Less than a week until departure. Prices typically increase closer to travel date.";
  } else if (daysUntilDeparture > 60) {
    timingAdvice = "wait";
    timingReason = "You're booking far in advance. Consider waiting 2-3 weeks for potential deals.";
  } else if (daysUntilDeparture >= 21 && daysUntilDeparture <= 45) {
    timingAdvice = "buy";
    timingReason = "This is often the sweet spot for booking. Prices are usually competitive.";
  } else {
    timingAdvice = "neutral";
    timingReason = "Pricing appears average for this timeframe. Compare a few options.";
  }

  // Risk alerts
  const riskAlerts: RiskAlert[] = [];

  if (stops > 0 && priority !== "low_risk") {
    riskAlerts.push({
      type: "connection_risk",
      severity: "medium",
      message: `This route typically involves ${stops} connection(s). Ensure adequate layover time.`,
    });
  }

  if (category === "long_haul" && !hasBags) {
    riskAlerts.push({
      type: "baggage_notice",
      severity: "low",
      message: "Long-haul flights often have stricter carry-on limits. Consider adding checked baggage.",
    });
  }

  if (daysUntilDeparture < 3) {
    riskAlerts.push({
      type: "last_minute",
      severity: "high",
      message: "Very short booking window. Prices may be elevated and seat availability limited.",
    });
  }

  // Generate affiliate link
  const affiliateUrl = `https://www.aviasales.com/search/${origin}${travelWindowStart.replace(/-/g, "").slice(4, 8)}${destination}${travelWindowEnd ? travelWindowEnd.replace(/-/g, "").slice(4, 8) : ""}1`;

  return {
    recommendedRoute: {
      summary: `${origin} to ${destination}${stops > 0 ? ` via connecting city` : " (direct)"}`,
      airline: priority === "cheapest" ? "Budget Carrier" : "Major Airline",
      stops,
      duration,
    },
    estimatedTotalCost: Math.round(totalCost),
    costBreakdown: {
      fare: Math.round(baseFare),
      baggage: baggageEstimate,
      transfers: transferEstimate,
      extraFees,
    },
    timingAdvice,
    timingReason,
    riskAlerts,
    affiliateLinks: [
      { provider: "Aviasales", url: affiliateUrl },
    ],
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body: OptimizerRequest = await req.json();

    // Validate required fields
    if (!body.origin || !body.destination || !body.travelWindowStart) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: origin, destination, travelWindowStart" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user ID if authenticated (optional)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
    }

    // Store the optimization request
    const { data: requestData, error: insertError } = await supabase
      .from("optimizer_requests")
      .insert({
        user_id: userId,
        origin: body.origin,
        destination: body.destination,
        travel_window_start: body.travelWindowStart,
        travel_window_end: body.travelWindowEnd || null,
        has_bags: body.hasBags,
        priority: body.priority,
        session_id: crypto.randomUUID(),
      })
      .select("id")
      .single();

    if (insertError) {
      console.error("Error storing request:", insertError);
    }

    // Run the optimization
    const result = generateOptimization(body);

    // Store the result
    if (requestData?.id) {
      const { error: resultError } = await supabase
        .from("optimizer_results")
        .insert({
          request_id: requestData.id,
          recommended_route: result.recommendedRoute,
          estimated_total_cost: result.estimatedTotalCost,
          fare_estimate: result.costBreakdown.fare,
          baggage_estimate: result.costBreakdown.baggage,
          transfer_estimate: result.costBreakdown.transfers,
          extra_fees_estimate: result.costBreakdown.extraFees,
          timing_advice: result.timingAdvice,
          timing_reason: result.timingReason,
          risk_alerts: result.riskAlerts,
          affiliate_links: result.affiliateLinks,
        });

      if (resultError) {
        console.error("Error storing result:", resultError);
      }

      // Increment usage counter if user is authenticated
      if (userId) {
        // Update user profile usage counter
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("monthly_optimizer_uses")
          .eq("user_id", userId)
          .single();

        if (profile) {
          await supabase
            .from("user_profiles")
            .update({ monthly_optimizer_uses: (profile.monthly_optimizer_uses || 0) + 1 })
            .eq("user_id", userId);
        }
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Optimizer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
