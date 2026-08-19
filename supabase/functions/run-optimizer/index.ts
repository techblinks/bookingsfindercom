/**
 * run-optimizer — Smart Trip Optimizer (BF-0R-2 trust integrity).
 *
 * This file is I/O and orchestration only: auth, plan/quota enforcement, the
 * Travelpayouts call, persistence, and the HTTP envelope. Every decision about
 * what may be SAID to a traveller lives in `optimizer-core.ts`, which cannot
 * invent a value.
 *
 * CORE RULE: NO PROVIDER DATA = NO INVENTED TRAVEL ANSWER.
 *
 * When Travelpayouts errors, times out, is unconfigured, returns nothing, or
 * returns nothing usable, this function fails CLOSED: it responds with the
 * typed `insufficient_live_data` state and writes NO result row. There is no
 * rule-based fare estimator, no synthetic airline, no invented duration or stop
 * count, no baggage/transfer/extra-fee figure and no BUY/WAIT advice.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFlightPrices, getConfig } from "../_shared/travelpayouts.ts";
import {
  buildOptimizerOutcome,
  insufficientLiveData,
  type InsufficientReason,
  type OptimizerOutcome,
  type ProviderFlightObservation,
  type TravelPriority,
} from "./optimizer-core.ts";

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
  priority: TravelPriority;
}

/**
 * Fetch live prices.
 *
 * Provider failure is REPORTED, never swallowed. The previous implementation
 * caught every error and returned `[]`, which made an outage indistinguishable
 * from "no flights" and sent the caller straight into fabricated fallbacks.
 */
async function fetchLivePrices(
  origin: string,
  destination: string,
  departureDate: string,
  returnDate: string | undefined,
  currency = "USD",
): Promise<
  | { ok: true; flights: ProviderFlightObservation[] }
  | { ok: false; reason: InsufficientReason }
> {
  let config;
  try {
    config = getConfig();
  } catch (error) {
    console.error("Travelpayouts is not configured:", error);
    return { ok: false, reason: "provider_unavailable" };
  }

  try {
    const { flights } = await getFlightPrices(
      { origin, destination, departureDate, returnDate, currency },
      config,
    );
    return { ok: true, flights: Array.isArray(flights) ? flights : [] };
  } catch (error) {
    console.error("Travelpayouts request failed:", error);
    return { ok: false, reason: "provider_error" };
  }
}

async function runOptimization(request: OptimizerRequest): Promise<OptimizerOutcome> {
  const { origin, destination, travelWindowStart, travelWindowEnd, priority } = request;

  const provider = await fetchLivePrices(
    origin,
    destination,
    travelWindowStart,
    travelWindowEnd,
  );

  if (!provider.ok) {
    console.log(`Optimizer failing closed: ${provider.reason}`);
    return insufficientLiveData(provider.reason);
  }

  console.log(`Provider returned ${provider.flights.length} option(s)`);

  return buildOptimizerOutcome({
    origin,
    destination,
    priority,
    flights: provider.flights,
    marker: Deno.env.get("MARKER_ID") || "",
  });
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

    if (!body.origin || !body.destination || !body.travelWindowStart) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: origin, destination, travelWindowStart" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // ── Auth, plan and quota (unchanged behaviour) ────────────────────────
    let userId: string | null = null;
    let userPlan = "free";
    let monthlyUses = 0;

    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.replace("Bearer ", "");
      const { data: userData } = await supabase.auth.getUser(token);
      userId = userData?.user?.id || null;

      if (userId) {
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("plan, monthly_optimizer_uses, last_optimizer_reset")
          .eq("user_id", userId)
          .single();

        if (profile) {
          userPlan = profile.plan || "free";

          const now = new Date();
          const lastReset = profile.last_optimizer_reset
            ? new Date(profile.last_optimizer_reset)
            : null;
          const needsReset =
            !lastReset ||
            now.getMonth() !== lastReset.getMonth() ||
            now.getFullYear() !== lastReset.getFullYear();

          if (needsReset) {
            monthlyUses = 0;
            await supabase
              .from("user_profiles")
              .update({
                monthly_optimizer_uses: 0,
                last_optimizer_reset: now.toISOString(),
              })
              .eq("user_id", userId);
          } else {
            monthlyUses = profile.monthly_optimizer_uses || 0;
          }

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

    const FREE_LIMIT = 1;
    if (userPlan === "free" && monthlyUses >= FREE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "paywall",
          message: "You've used your free optimization this month. Upgrade to Pro for unlimited optimizations.",
          upgradeUrl: "/pricing",
        }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Record the request. This is a record of what was asked, not a claim
    // about travel, so it is stored regardless of the provider outcome.
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

    const result = await runOptimization(body);

    // ── Persistence guard ────────────────────────────────────────────────
    // A result row is written ONLY for a genuine provider-backed answer. The
    // no-data state is never persisted, so no fabricated row can ever enter
    // optimizer_results, and a run that produced no answer does not consume
    // the traveller's quota.
    if (result.status === "ok" && requestData?.id) {
      const { error: resultError } = await supabase.from("optimizer_results").insert({
        request_id: requestData.id,
        recommended_route: result.recommendedRoute,
        // Legacy schema: estimated_total_cost is NOT NULL. The provider fare is
        // the only monetary value we can substantiate, so it is stored here and
        // the fabricated estimate columns are explicitly left NULL.
        estimated_total_cost: result.fare,
        fare_estimate: result.fare,
        baggage_estimate: null,
        transfer_estimate: null,
        extra_fees_estimate: null,
        // Timing prediction is not produced. The column is NOT NULL with a
        // CHECK over ('buy','wait','neutral'); 'neutral' is the only honest
        // value, and the reason carries the scoped factual comparison.
        timing_advice: "neutral",
        timing_reason: result.fareComparison,
        risk_alerts: result.notes,
        affiliate_links: result.affiliateLinks,
      });

      if (resultError) {
        console.error("Error storing result:", resultError);
      }

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

    // The no-data state is a truthful outcome, not a server fault, so it is
    // returned with 200 and a typed status the client can render honestly.
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Optimizer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
