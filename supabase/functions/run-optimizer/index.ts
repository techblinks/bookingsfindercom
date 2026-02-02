import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFlightPrices, getConfig, TravelpayoutsError } from "../_shared/travelpayouts.ts";

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

interface FlightData {
  price: number;
  airline: string;
  airline_code: string;
  duration_minutes: number;
  stops: number;
  link?: string;
}

// Fetch real prices from Travelpayouts API
async function fetchRealPrices(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string | undefined,
  currency: string = "USD"
): Promise<FlightData[]> {
  try {
    const config = getConfig();
    
    const { flights } = await getFlightPrices(
      {
        origin,
        destination,
        departureDate,
        returnDate,
        currency,
      },
      config
    );

    return flights.map(f => ({
      price: f.price,
      airline: f.airline,
      airline_code: f.airline_code,
      duration_minutes: f.duration_minutes,
      stops: f.stops,
      link: f.link,
    }));
  } catch (error) {
    console.error("Error fetching real prices:", error);
    return [];
  }
}

// Select best flight based on priority
function selectBestFlight(
  flights: FlightData[],
  priority: "cheapest" | "fastest" | "low_risk"
): FlightData | null {
  if (flights.length === 0) return null;

  switch (priority) {
    case "cheapest":
      return flights.reduce((best, current) => 
        current.price < best.price ? current : best
      );
    
    case "fastest":
      return flights.reduce((best, current) => 
        current.duration_minutes < best.duration_minutes ? current : best
      );
    
    case "low_risk":
      // Prefer direct flights, then sort by price
      const directFlights = flights.filter(f => f.stops === 0);
      if (directFlights.length > 0) {
        return directFlights.reduce((best, current) => 
          current.price < best.price ? current : best
        );
      }
      // Fallback to 1-stop flights
      const oneStopFlights = flights.filter(f => f.stops === 1);
      if (oneStopFlights.length > 0) {
        return oneStopFlights.reduce((best, current) => 
          current.price < best.price ? current : best
        );
      }
      return flights[0];
    
    default:
      return flights[0];
  }
}

// Airline name mapping for better display
const airlineNames: Record<string, string> = {
  "QF": "Qantas",
  "VA": "Virgin Australia",
  "JQ": "Jetstar",
  "EK": "Emirates",
  "SQ": "Singapore Airlines",
  "CX": "Cathay Pacific",
  "BA": "British Airways",
  "AA": "American Airlines",
  "UA": "United Airlines",
  "DL": "Delta Air Lines",
  "LH": "Lufthansa",
  "AF": "Air France",
  "KL": "KLM",
  "TK": "Turkish Airlines",
  "QR": "Qatar Airways",
  "EY": "Etihad Airways",
  "NZ": "Air New Zealand",
  "MH": "Malaysia Airlines",
  "TG": "Thai Airways",
  "CA": "Air China",
  "MU": "China Eastern",
  "CZ": "China Southern",
  "NH": "ANA",
  "JL": "Japan Airlines",
  "OZ": "Asiana Airlines",
  "KE": "Korean Air",
  "SU": "Aeroflot",
  "LX": "Swiss",
  "OS": "Austrian",
  "AY": "Finnair",
  "SK": "SAS",
  "IB": "Iberia",
  "TP": "TAP Portugal",
  "AZ": "ITA Airways",
  "AC": "Air Canada",
  "WN": "Southwest",
  "B6": "JetBlue",
  "AS": "Alaska Airlines",
  "F9": "Frontier",
  "NK": "Spirit",
  "FR": "Ryanair",
  "U2": "easyJet",
  "W6": "Wizz Air",
};

function getAirlineName(code: string): string {
  return airlineNames[code] || code;
}

// Generate optimization with real or fallback data
async function generateOptimization(request: OptimizerRequest) {
  const { origin, destination, travelWindowStart, travelWindowEnd, hasBags, priority } = request;

  // Fetch real prices from API
  console.log(`Fetching real prices for ${origin} -> ${destination}`);
  const flights = await fetchRealPrices(
    origin,
    destination,
    travelWindowStart,
    travelWindowEnd
  );

  console.log(`Found ${flights.length} flights from API`);

  // Select best flight based on priority
  const selectedFlight = selectBestFlight(flights, priority);

  // Calculate statistics for context
  const prices = flights.map(f => f.price);
  const avgPrice = prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0;
  const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;

  // Use real data or fallback to estimates
  let baseFare: number;
  let stops: number;
  let duration: number;
  let airline: string;
  let affiliateUrl: string;

  if (selectedFlight) {
    // Use real API data
    baseFare = selectedFlight.price;
    stops = selectedFlight.stops;
    duration = selectedFlight.duration_minutes || 0;
    airline = getAirlineName(selectedFlight.airline_code);
    
    // Build affiliate link with marker
    const marker = Deno.env.get("MARKER_ID") || "";
    affiliateUrl = selectedFlight.link 
      ? `https://www.aviasales.com${selectedFlight.link}${marker ? `&marker=${marker}` : ""}`
      : `https://www.aviasales.com/search/${origin}${travelWindowStart.replace(/-/g, "").slice(4, 8)}${destination}${travelWindowEnd ? travelWindowEnd.replace(/-/g, "").slice(4, 8) : ""}1`;
  } else {
    // Fallback to rule-based estimation
    console.log("No API data available, using fallback estimates");
    
    const distanceFactors: Record<string, number> = {
      domestic: 150,
      short_haul: 350,
      medium_haul: 650,
      long_haul: 1200,
    };

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

    baseFare = distanceFactors[category];
    if (travelWindowEnd) baseFare *= 1.8;
    if (priority === "fastest") baseFare *= 1.15;
    else if (priority === "low_risk") baseFare *= 1.08;

    stops = priority === "fastest" ? 0 : (category === "long_haul" ? 1 : 0);
    
    const durationMap: Record<string, number> = {
      domestic: 120,
      short_haul: 240,
      medium_haul: 480,
      long_haul: 960,
    };
    duration = durationMap[category] + (stops * 90);
    airline = priority === "cheapest" ? "Budget Carrier" : "Major Airline";
    affiliateUrl = `https://www.aviasales.com/search/${origin}${travelWindowStart.replace(/-/g, "").slice(4, 8)}${destination}${travelWindowEnd ? travelWindowEnd.replace(/-/g, "").slice(4, 8) : ""}1`;
  }

  // Baggage estimate based on route length
  const isLongHaul = duration > 600; // More than 10 hours
  const baggageEstimate = hasBags ? (isLongHaul ? 80 : 50) : 0;

  // Transfer estimate
  const transferEstimate = stops > 0 ? 25 : 0;

  // Extra fees estimate
  const extraFees = 15;

  const totalCost = baseFare + baggageEstimate + transferEstimate + extraFees;

  // Enhanced timing advice based on price statistics
  const departureDate = new Date(travelWindowStart);
  const now = new Date();
  const daysUntilDeparture = Math.ceil((departureDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  let timingAdvice: "buy" | "wait" | "neutral" = "neutral";
  let timingReason = "";

  if (selectedFlight && avgPrice > 0) {
    // Use real price data for smarter timing advice
    const priceRatio = selectedFlight.price / avgPrice;
    
    if (priceRatio < 0.85) {
      timingAdvice = "buy";
      timingReason = `This price is ${Math.round((1 - priceRatio) * 100)}% below the average for this route. Great deal!`;
    } else if (priceRatio > 1.15) {
      timingAdvice = "wait";
      timingReason = `This price is ${Math.round((priceRatio - 1) * 100)}% above average. Consider waiting for better deals.`;
    } else if (daysUntilDeparture < 7) {
      timingAdvice = "buy";
      timingReason = "Less than a week until departure. Prices typically increase closer to travel date.";
    } else if (daysUntilDeparture >= 21 && daysUntilDeparture <= 45) {
      timingAdvice = "buy";
      timingReason = "You're in the sweet spot for booking. Current prices look competitive.";
    } else {
      timingAdvice = "neutral";
      timingReason = "Pricing is around average for this route and timing.";
    }
  } else {
    // Fallback timing logic
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
  }

  // Enhanced risk alerts
  const riskAlerts: RiskAlert[] = [];

  if (stops > 0 && priority !== "low_risk") {
    riskAlerts.push({
      type: "connection_risk",
      severity: "medium",
      message: `This route involves ${stops} connection(s). Ensure adequate layover time for transfers.`,
    });
  }

  if (stops >= 2) {
    riskAlerts.push({
      type: "multiple_connections",
      severity: "high",
      message: "Multiple connections increase delay risk and baggage issues. Consider direct or 1-stop options.",
    });
  }

  if (isLongHaul && !hasBags) {
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

  if (duration > 1200) { // More than 20 hours
    riskAlerts.push({
      type: "ultra_long_haul",
      severity: "low",
      message: "This is an ultra-long journey. Consider your comfort needs and layover rest options.",
    });
  }

  // Price volatility warning
  if (flights.length > 3 && maxPrice > minPrice * 2) {
    riskAlerts.push({
      type: "price_volatility",
      severity: "medium",
      message: "Prices vary significantly for this route. Compare multiple options before deciding.",
    });
  }

  const routeSummary = stops === 0 
    ? `${origin} to ${destination} (direct)`
    : `${origin} to ${destination} via ${stops} connection(s)`;

  return {
    recommendedRoute: {
      summary: routeSummary,
      airline,
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
    // Additional context for UI
    priceContext: flights.length > 0 ? {
      optionsFound: flights.length,
      averagePrice: Math.round(avgPrice),
      lowestPrice: Math.round(minPrice),
      highestPrice: Math.round(maxPrice),
    } : null,
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
    let userPlan = "free";
    let monthlyUses = 0;
    
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;
      
      if (userId) {
        // Check user's plan and usage
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("plan, monthly_optimizer_uses, last_optimizer_reset")
          .eq("user_id", userId)
          .single();
        
        if (profile) {
          userPlan = profile.plan || "free";
          
          // Check if we need to reset monthly uses
          const now = new Date();
          const lastReset = profile.last_optimizer_reset ? new Date(profile.last_optimizer_reset) : null;
          const needsReset = !lastReset || 
            (now.getMonth() !== lastReset.getMonth() || now.getFullYear() !== lastReset.getFullYear());
          
          if (needsReset) {
            monthlyUses = 0;
            await supabase.from("user_profiles").update({
              monthly_optimizer_uses: 0,
              last_optimizer_reset: now.toISOString(),
            }).eq("user_id", userId);
          } else {
            monthlyUses = profile.monthly_optimizer_uses || 0;
          }
          
          // Check subscription status for Pro users
          if (userPlan === "pro") {
            const { data: subscription } = await supabase
              .from("subscriptions")
              .select("status")
              .eq("user_id", userId)
              .single();
            
            if (subscription?.status !== "active") {
              userPlan = "free"; // Downgrade if subscription not active
            }
          }
        }
      }
    }
    
    // Enforce paywall: Free users get 1 optimization per month
    const FREE_LIMIT = 1;
    if (userPlan === "free" && monthlyUses >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({ 
          error: "paywall", 
          message: "You've used your free optimization this month. Upgrade to Pro for unlimited optimizations.",
          upgradeUrl: "/pricing"
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
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

    // Run the optimization with real API data
    const result = await generateOptimization(body);

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
