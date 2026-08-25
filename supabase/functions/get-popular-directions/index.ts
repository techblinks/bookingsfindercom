import { corsHeaders } from "../_shared/cors.ts";
import { createTravelpayoutsProvider } from "../_shared/travelpayoutsProvider.ts";
import { TravelpayoutsError } from "../_shared/travelpayouts.ts";
import { toWireRouteSuggestion } from "../_shared/flightWire.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, currency = "USD", limit = 10 } = await req.json();

    if (!origin) {
      return new Response(
        JSON.stringify({ error: "origin IATA code is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BF1-E: upstream call, fail-closed validation, the static display-name
    // lookup and raw->domain mapping now live behind the FlightProvider
    // adapter; the HTTP contract (including route field names and display
    // names) is unchanged.
    const provider = createTravelpayoutsProvider();
    const result = await provider.getRouteSuggestions({
      origin,
      currency,
      limit,
    });

    return new Response(
      // CONTRACT-PARITY CLOSEOUT (Fix 2): `currency` is the adapter-resolved
      // legacy value (upstream-declared `data.currency` when stated, else the
      // requested currency) — restoring pre-BF1-E `data.currency || currency`.
      JSON.stringify({ routes: result.routes.map(toWireRouteSuggestion), currency: result.currency, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Popular directions error:", error);

    if (error instanceof TravelpayoutsError) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to fetch popular directions" }),
        { status: error.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
