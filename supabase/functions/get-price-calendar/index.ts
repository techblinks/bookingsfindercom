import { corsHeaders } from "../_shared/cors.ts";
import { getConfig } from "../_shared/travelpayouts.ts";

const TRAVELPAYOUTS_API = "https://api.travelpayouts.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { origin, destination, month, currency = "AUD" } = await req.json();

    if (!origin || !destination || !month) {
      return new Response(
        JSON.stringify({ error: "origin, destination, and month (YYYY-MM) are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const config = getConfig();

    // Use the month-matrix endpoint for calendar prices
    const params = new URLSearchParams({
      origin: origin.toUpperCase(),
      destination: destination.toUpperCase(),
      month,
      currency,
      token: config.token,
      show_to_affiliates: "true",
    });

    const url = `${TRAVELPAYOUTS_API}/v2/prices/month-matrix?${params.toString()}`;
    console.log(`Fetching price calendar: ${origin} -> ${destination} for ${month}`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("API error:", data);
      return new Response(
        JSON.stringify({ error: data.error || "Failed to fetch price calendar" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // data.data is an array of { depart_date, return_date, origin, destination, value, ... }
    const prices = (data.data || []).map((item: any) => ({
      date: item.depart_date,
      price: item.value,
      returnDate: item.return_date || null,
      airline: item.gate || null,
      stops: item.number_of_changes ?? 0,
      tripDuration: item.trip_duration ?? null,
    }));

    return new Response(
      JSON.stringify({ prices, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Price calendar error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
