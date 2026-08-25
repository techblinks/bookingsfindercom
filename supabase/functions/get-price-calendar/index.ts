import { corsHeaders } from "../_shared/cors.ts";
import { createTravelpayoutsProvider } from "../_shared/travelpayoutsProvider.ts";
import { TravelpayoutsError } from "../_shared/travelpayouts.ts";
import { toWireCalendarPrice } from "../_shared/flightWire.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, month, currency = "USD" } = await req.json();

    if (!origin || !destination || !month) {
      return new Response(
        JSON.stringify({ error: "origin, destination, and month (YYYY-MM) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // BF1-E: upstream call + fail-closed validation + raw->domain mapping now
    // live behind the FlightProvider adapter; the HTTP contract is unchanged.
    const provider = createTravelpayoutsProvider();
    const calendar = await provider.getPriceCalendar({
      origin,
      destination,
      month,
      currency,
    });

    return new Response(
      JSON.stringify({ prices: calendar.entries.map(toWireCalendarPrice), success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Price calendar error:", error);

    if (error instanceof TravelpayoutsError) {
      return new Response(
        JSON.stringify({ error: error.message || "Failed to fetch price calendar" }),
        { status: error.statusCode, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
