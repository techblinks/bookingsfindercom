import { corsHeaders } from "../_shared/cors.ts";
import { getLowestPrice, getConfig } from "../_shared/travelpayouts.ts";

interface RouteRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
}

interface RoutePrice {
  origin: string;
  destination: string;
  price: number | null;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const config = getConfig();
    const { routes } = await req.json() as { routes: RouteRequest[] };

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Routes array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Limit to 10 routes per request to avoid timeout
    const limitedRoutes = routes.slice(0, 10);

    // Fetch prices for all routes in parallel
    const pricePromises = limitedRoutes.map(async (route): Promise<RoutePrice> => {
      try {
        const price = await getLowestPrice(
          {
            origin: route.origin,
            destination: route.destination,
            departureDate: route.departureDate,
            returnDate: route.returnDate || null,
          },
          config
        );
        return {
          origin: route.origin,
          destination: route.destination,
          price,
        };
      } catch (error) {
        console.error(`Error fetching price for ${route.origin}-${route.destination}:`, error);
        return {
          origin: route.origin,
          destination: route.destination,
          price: null,
        };
      }
    });

    const prices = await Promise.all(pricePromises);

    return new Response(
      JSON.stringify({ prices }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in get-route-prices:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
