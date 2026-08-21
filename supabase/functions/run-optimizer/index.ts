/**
 * run-optimizer — Smart Trip Optimizer (BF-0R-2 trust integrity; BF-0R-4 auth
 * + atomic quota integrity).
 *
 * This file is a thin Deno adapter only: it implements `OptimizerDbPort`
 * against the real Supabase client, wires up the real Travelpayouts provider
 * call, and translates `handleOptimizerRequest`'s typed result into an HTTP
 * Response. Every actual decision — auth, atomic Free-quota claim/refund,
 * and what may be SAID to a traveller — lives in `optimizer-orchestrator.ts`
 * / `auth-quota-core.ts` / `optimizer-core.ts`, none of which touch a Deno
 * global, so the real orchestration logic is exercised directly by the
 * vitest suite (see __tests__/optimizer-orchestrator.test.ts) rather than
 * inferred from this file's source text.
 *
 * CORE RULE: NO PROVIDER DATA = NO INVENTED TRAVEL ANSWER.
 *
 * When Travelpayouts errors, times out, is unconfigured, returns nothing, or
 * returns nothing usable, this function fails CLOSED: it responds with the
 * typed `insufficient_live_data` state, writes NO result row, and (BF-0R-4)
 * refunds any Free-quota slot already claimed for the request.
 *
 * QUOTA RULE (BF-0R-4 round 2): for a Free or inactive-Pro user, no
 * Travelpayouts call happens unless a durable quota slot was first claimed
 * atomically via a Postgres compare-and-set — see optimizer-orchestrator.ts.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getFlightPrices, getConfig } from "../_shared/travelpayouts.ts";
import { buildOptimizerOutcome, insufficientLiveData, type InsufficientReason } from "./optimizer-core.ts";
import {
  handleOptimizerRequest,
  type OptimizerDbPort,
  type OptimizerRequestInput,
  type ProviderOutcome,
  type ProviderOutcomeOk,
  type ProfileRow,
} from "./optimizer-orchestrator.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
) {
  let config;
  try {
    config = getConfig();
  } catch (error) {
    console.error("Travelpayouts is not configured:", error);
    return { ok: false as const, reason: "provider_unavailable" as InsufficientReason };
  }

  try {
    const { flights } = await getFlightPrices(
      { origin, destination, departureDate, returnDate, currency },
      config,
    );
    return { ok: true as const, flights: Array.isArray(flights) ? flights : [] };
  } catch (error) {
    console.error("Travelpayouts request failed:", error);
    return { ok: false as const, reason: "provider_error" as InsufficientReason };
  }
}

async function callProvider(request: OptimizerRequestInput): Promise<ProviderOutcome> {
  const { origin, destination, travelWindowStart, travelWindowEnd, priority } = request;

  const provider = await fetchLivePrices(origin, destination, travelWindowStart, travelWindowEnd);

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
  }) as ProviderOutcome;
}

// deno-lint-ignore no-explicit-any
function makeDb(supabase: any): OptimizerDbPort {
  return {
    async getUser(token) {
      const { data, error } = await supabase.auth.getUser(token);
      return { userId: data?.user?.id ?? null, error: !!error };
    },

    async getProfile(userId): Promise<ProfileRow | null> {
      const { data, error } = await supabase
        .from("user_profiles")
        .select("plan, monthly_optimizer_uses, last_optimizer_reset")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        plan: data.plan || "free",
        monthlyOptimizerUses: data.monthly_optimizer_uses ?? 0,
        lastOptimizerReset: data.last_optimizer_reset,
      };
    },

    async getSubscriptionStatus(userId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("status")
        .eq("user_id", userId)
        .single();
      return data?.status ?? null;
    },

    async claimFreeSlot({ userId, expectedMonthlyUses, expectedLastReset, needsReset, nowIso }) {
      // Compare-and-set: the WHERE clause matches the EXACT row values this
      // request read. Postgres re-evaluates an UPDATE's WHERE against the
      // current committed row after acquiring the row lock, so a concurrent
      // winner's change is always visible to the loser's WHERE check —
      // meaning two concurrent callers reading the same pre-claim state can
      // never both match and update. The reset transition and the claim are
      // the SAME statement, so a fresh-month race can't double-reset either.
      const newValue = needsReset ? 1 : expectedMonthlyUses + 1;
      const query = supabase
        .from("user_profiles")
        .update(
          needsReset
            ? { monthly_optimizer_uses: 1, last_optimizer_reset: nowIso }
            : { monthly_optimizer_uses: newValue },
        )
        .eq("user_id", userId)
        .eq("monthly_optimizer_uses", expectedMonthlyUses)
        .eq("last_optimizer_reset", expectedLastReset)
        // Read back the ACTUAL stored values (never manufactured locally) —
        // this becomes the refund token's compare-and-set guard.
        .select("monthly_optimizer_uses, last_optimizer_reset")
        .maybeSingle();

      const { data, error } = await query;
      if (error || !data) return { claimed: false as const };
      return {
        claimed: true as const,
        token: {
          monthlyOptimizerUses: data.monthly_optimizer_uses,
          lastOptimizerReset: data.last_optimizer_reset,
        },
      };
    },

    async refundFreeSlot(userId, token) {
      // Compare-and-set on the FULL token — user_id, monthly_optimizer_uses
      // AND last_optimizer_reset. Matching on the counter alone would be an
      // ABA/month-boundary bug: a claim still in flight when UTC month rolls
      // over could refund a LATER request's freshly reset-and-claimed row,
      // which happens to land back on the same counter value in the new
      // month. The reset-timestamp guard makes that impossible — a stale
      // token's WHERE simply stops matching once the row moves to a new
      // generation, in either the counter OR the reset timestamp.
      const { data, error } = await supabase
        .from("user_profiles")
        .update({ monthly_optimizer_uses: Math.max(0, token.monthlyOptimizerUses - 1) })
        .eq("user_id", userId)
        .eq("monthly_optimizer_uses", token.monthlyOptimizerUses)
        .eq("last_optimizer_reset", token.lastOptimizerReset)
        .select("monthly_optimizer_uses")
        .maybeSingle();

      if (error) {
        // Fail conservatively: log only, never fall back to an unconditional
        // decrement. The slot stays consumed rather than risking a
        // double-refund race.
        console.error("Failed to refund optimizer quota claim:", error);
        return "error" as const;
      }
      if (!data) {
        // Zero rows matched — the row has moved on to a different quota
        // generation since this claim was made. Safe no-op; do not retry.
        return "stale" as const;
      }
      return "refunded" as const;
    },

    async insertOptimizerRequest(userId, body) {
      const { data, error } = await supabase
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
      if (error || !data?.id) {
        if (error) console.error("Error storing request:", error);
        return null;
      }
      return { id: data.id };
    },

    async insertOptimizerResult(requestId, outcome: ProviderOutcomeOk) {
      const { error } = await supabase.from("optimizer_results").insert({
        request_id: requestId,
        recommended_route: outcome.recommendedRoute,
        // Legacy schema: estimated_total_cost is NOT NULL. The provider fare is
        // the only monetary value we can substantiate, so it is stored here and
        // the fabricated estimate columns are explicitly left NULL.
        estimated_total_cost: outcome.fare,
        fare_estimate: outcome.fare,
        baggage_estimate: null,
        transfer_estimate: null,
        extra_fees_estimate: null,
        // Timing prediction is not produced. The column is NOT NULL with a
        // CHECK over ('buy','wait','neutral'); 'neutral' is the only honest
        // value, and the reason carries the scoped factual comparison.
        timing_advice: "neutral",
        timing_reason: outcome.fareComparison,
        risk_alerts: outcome.notes,
        affiliate_links: outcome.affiliateLinks,
      });
      if (error) {
        console.error("Error storing result:", error);
      }
    },
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

    const body: OptimizerRequestInput = await req.json();
    const authHeader = req.headers.get("Authorization");

    const result = await handleOptimizerRequest(
      makeDb(supabase),
      callProvider,
      () => new Date(),
      authHeader,
      body,
    );

    switch (result.kind) {
      case "auth-error":
      case "validation-error":
      case "service-error":
        return new Response(JSON.stringify(result.body), {
          status: result.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      case "paywall":
        return new Response(JSON.stringify(result.body), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      case "outcome":
        // The no-data state is a truthful outcome, not a server fault, so it
        // is returned with 200 and a typed status the client can render
        // honestly — same as a genuine provider-backed answer.
        return new Response(JSON.stringify(result.outcome), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
  } catch (error) {
    console.error("Optimizer error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
