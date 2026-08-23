import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { computeEffectiveQuotaView } from "./quota-view.ts";

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
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabase.auth.getUser(token);

    if (userError || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;

    // Get user profile
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("plan, monthly_optimizer_uses, last_optimizer_reset")
      .eq("user_id", userId)
      .single();

    // Get subscription details
    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at_period_end")
      .eq("user_id", userId)
      .single();

    // PR #65 round 4: READ-ONLY view of quota — no write to
    // monthly_optimizer_uses / last_optimizer_reset happens here; see
    // quota-view.ts. run-optimizer remains the sole writer of these fields.
    const { effectiveMonthlyUses } = computeEffectiveQuotaView(
      profile?.monthly_optimizer_uses,
      profile?.last_optimizer_reset,
      new Date(),
    );
    const monthlyUses = effectiveMonthlyUses;

    const plan = profile?.plan || "free";
    const isProActive = plan === "pro" && subscription?.status === "active";
    
    // Free users get 1 optimization per month
    const freeLimit = 1;
    const canOptimize = isProActive || monthlyUses < freeLimit;
    const remainingOptimizations = isProActive ? -1 : Math.max(0, freeLimit - monthlyUses);

    return new Response(JSON.stringify({
      plan,
      isProActive,
      canOptimize,
      monthlyUses,
      remainingOptimizations, // -1 means unlimited
      subscription: subscription ? {
        status: subscription.status,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      } : null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error getting subscription status:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
