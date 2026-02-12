import { corsHeaders } from "../_shared/cors.ts";
import { getConfig } from "../_shared/travelpayouts.ts";

const TRAVELPAYOUTS_API = "https://api.travelpayouts.com";

// City name lookup - common IATA codes
const cityNames: Record<string, string> = {
  SYD: "Sydney", MEL: "Melbourne", BNE: "Brisbane", PER: "Perth", ADL: "Adelaide",
  LHR: "London", LON: "London", MAN: "Manchester", EDI: "Edinburgh", LGW: "London Gatwick", STN: "London Stansted",
  JFK: "New York", NYC: "New York", LAX: "Los Angeles", SFO: "San Francisco", ORD: "Chicago", MIA: "Miami", ATL: "Atlanta", BOS: "Boston", SEA: "Seattle", DEN: "Denver", DFW: "Dallas",
  DEL: "Delhi", BOM: "Mumbai", BLR: "Bangalore", MAA: "Chennai", CCU: "Kolkata", HYD: "Hyderabad", GOI: "Goa",
  SIN: "Singapore", BKK: "Bangkok", HKG: "Hong Kong", NRT: "Tokyo", TYO: "Tokyo", KIX: "Osaka", ICN: "Seoul", SEL: "Seoul",
  DXB: "Dubai", AUH: "Abu Dhabi", DOH: "Doha", RUH: "Riyadh", BAH: "Bahrain",
  CDG: "Paris", PAR: "Paris", AMS: "Amsterdam", FRA: "Frankfurt", FCO: "Rome", ROM: "Rome", BCN: "Barcelona", MAD: "Madrid", LIS: "Lisbon", VIE: "Vienna", PRG: "Prague", BUD: "Budapest", WAW: "Warsaw", ZRH: "Zurich", MUC: "Munich", BER: "Berlin", CPH: "Copenhagen", OSL: "Oslo", HEL: "Helsinki", ATH: "Athens",
  IST: "Istanbul", CAI: "Cairo", JNB: "Johannesburg", NBO: "Nairobi", CMN: "Casablanca",
  YYZ: "Toronto", YVR: "Vancouver", YUL: "Montreal", MEX: "Mexico City", GRU: "São Paulo", EZE: "Buenos Aires", BOG: "Bogota", SCL: "Santiago", LIM: "Lima",
  KUL: "Kuala Lumpur", CGK: "Jakarta", MNL: "Manila", TPE: "Taipei", PVG: "Shanghai", PEK: "Beijing", BJS: "Beijing",
  DPS: "Bali", HNL: "Honolulu", CUN: "Cancun", PMI: "Palma", AGP: "Malaga",
  MLE: "Maldives", CMB: "Colombo", KTM: "Kathmandu",
  AKL: "Auckland", MOW: "Moscow", LED: "St Petersburg", BEG: "Belgrade", TAS: "Tashkent", AYT: "Antalya", BSZ: "Bishkek",
  LOS: "Lagos", ACC: "Accra", DAR: "Dar es Salaam",
};

function getCityName(iata: string): string {
  return cityNames[iata?.toUpperCase()] || iata;
}

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

    const config = getConfig();

    // Fetch popular directions from the origin
    const params = new URLSearchParams({
      origin: origin.toUpperCase(),
      currency,
      token: config.token,
    });

    const url = `${TRAVELPAYOUTS_API}/v1/city-directions?${params.toString()}`;
    console.log(`Fetching popular directions from: ${origin}`);

    const response = await fetch(url);
    const data = await response.json();

    if (!response.ok) {
      console.error("API error:", data);
      return new Response(
        JSON.stringify({ error: "Failed to fetch popular directions" }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // data is { success: true, data: { "IATA": { ... }, ... }, currency }
    const directionsData = data.data || {};
    
    const routes = Object.entries(directionsData)
      .slice(0, limit)
      .map(([destCode, info]: [string, any]) => ({
        origin: info.origin || origin.toUpperCase(),
        originName: getCityName(info.origin || origin),
        destination: info.destination || destCode,
        destinationName: getCityName(info.destination || destCode),
        price: info.price || null,
        airline: info.airline || null,
        departureDate: info.departure_at || null,
        returnDate: info.return_at || null,
        stops: info.transfers ?? 0,
        flightNumber: info.flight_number || null,
        expiresAt: info.expires_at || null,
      }));

    return new Response(
      JSON.stringify({ routes, currency: data.currency || currency, success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Popular directions error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
