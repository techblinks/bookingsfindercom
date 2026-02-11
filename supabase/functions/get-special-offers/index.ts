import { corsHeaders, handleCors, jsonResponse, errorResponse } from "../_shared/cors.ts";
import { getConfig } from "../_shared/travelpayouts.ts";

const TRAVELPAYOUTS_API = "https://api.travelpayouts.com";

function buildOffer(deal: any, origin: string, marker: string) {
  const dest = deal.destination || "";
  const dep = deal.depart_date || deal.departure_at || "";
  return {
    id: `${origin}-${dest}-${dep}`,
    origin: origin.toUpperCase(),
    destination: dest.toUpperCase(),
    price: deal.value || deal.price || 0,
    airline: deal.airline || deal.gate || "",
    departure_date: dep || null,
    return_date: deal.return_date || deal.return_at || null,
    stops: deal.number_of_changes ?? deal.transfers ?? 0,
    found_at: deal.found_at || new Date().toISOString(),
    flight_number: deal.flight_number || null,
    duration_minutes: deal.duration || 0,
    link: dest && dep
      ? `https://www.aviasales.com/search/${origin}${dep.replace(/-/g, "").slice(2, 6)}${dest}1?marker=${marker}`
      : "",
  };
}

Deno.serve(async (req) => {
  const corsResp = handleCors(req);
  if (corsResp) return corsResp;

  try {
    const { origin = "LHR", currency = "USD", limit = 8 } = await req.json();
    const config = getConfig();

    const searchParams = new URLSearchParams({
      origin: origin.toUpperCase(),
      currency,
      sorting: "price",
      limit: String(Math.min(limit, 20)),
      period_type: "year",
      show_to_affiliates: "true",
      token: config.token,
    });

    const url = `${TRAVELPAYOUTS_API}/v2/prices/latest?${searchParams}`;
    console.log(`Fetching special offers from: ${origin}`);

    const response = await fetch(url);
    if (!response.ok) {
      console.error(`API error: ${response.status}`);
      return errorResponse("Failed to fetch offers", response.status);
    }

    const data = await response.json();

    if (!data.success || !data.data) {
      return jsonResponse({ offers: [], source: "empty" });
    }

    // All items are deal objects with destination inside each entry
    const rawDeals = Array.isArray(data.data) ? data.data : Object.values(data.data);
    let offers = rawDeals.map((deal: any) => buildOffer(deal, origin.toUpperCase(), config.marker));

    offers = offers.filter((o: any) => o.destination && o.destination.length >= 2 && o.price > 0);

    // Sort by price ascending
    offers.sort((a: any, b: any) => a.price - b.price);

    return jsonResponse({
      offers: offers.slice(0, limit),
      currency,
      source: "travelpayouts_latest",
    });
  } catch (error) {
    console.error("Error in get-special-offers:", error);
    return errorResponse(error.message || "Internal error", 500);
  }
});
