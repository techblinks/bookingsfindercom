import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from "../_shared/cors.ts";
import { createTravelpayoutsProvider } from "../_shared/travelpayoutsProvider.ts";

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
  cached: boolean;
}

const CACHE_TTL_HOURS = 1;

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
    // BF1-E: Travelpayouts access now goes through the FlightProvider adapter.
    const provider = createTravelpayoutsProvider();
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { routes, currency = 'USD' } = await req.json() as { 
      routes: RouteRequest[]; 
      currency?: string;
    };

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
      return new Response(
        JSON.stringify({ error: "Routes array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
    }

    // Limit to 10 routes per request to avoid timeout
    const limitedRoutes = routes.slice(0, 10);
    const prices: RoutePrice[] = [];
    const routesToFetch: RouteRequest[] = [];

    // Step 1: Check cache for all routes
    for (const route of limitedRoutes) {
      const { data: cached } = await supabase
        .from('route_price_cache')
        .select('price')
        .eq('origin', route.origin.toUpperCase())
        .eq('destination', route.destination.toUpperCase())
        .eq('departure_date', route.departureDate)
        .eq('currency', currency)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (cached && cached.price !== null) {
        prices.push({
          origin: route.origin,
          destination: route.destination,
          price: Number(cached.price),
          cached: true,
        });
      } else {
        routesToFetch.push(route);
      }
    }

    // Step 2: Fetch missing prices from API (with timeout)
    if (routesToFetch.length > 0) {
      const fetchWithTimeout = async (route: RouteRequest): Promise<RoutePrice> => {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000); // 8 second timeout per route

        try {
          const price = await provider.getLowestPrice(
            {
              origin: route.origin,
              destination: route.destination,
              departureDate: route.departureDate,
              returnDate: route.returnDate || null,
              currency,
            },
          );

          clearTimeout(timeoutId);

          // Cache the result
          if (price !== null) {
            const expiresAt = new Date();
            expiresAt.setHours(expiresAt.getHours() + CACHE_TTL_HOURS);

            await supabase
              .from('route_price_cache')
              .upsert({
                origin: route.origin.toUpperCase(),
                destination: route.destination.toUpperCase(),
                departure_date: route.departureDate,
                return_date: route.returnDate || null,
                currency,
                price: price.amountMajor,
                cached_at: new Date().toISOString(),
                expires_at: expiresAt.toISOString(),
              }, {
                onConflict: 'origin,destination,departure_date,return_date,currency'
              });
          }

          return {
            origin: route.origin,
            destination: route.destination,
            price: price.amountMajor,
            cached: false,
          };
        } catch (error) {
          clearTimeout(timeoutId);
          console.error(`Error/timeout fetching price for ${route.origin}-${route.destination}:`, error);
          
          // Try to get stale cache as fallback
          const { data: staleCache } = await supabase
            .from('route_price_cache')
            .select('price')
            .eq('origin', route.origin.toUpperCase())
            .eq('destination', route.destination.toUpperCase())
            .eq('departure_date', route.departureDate)
            .eq('currency', currency)
            .maybeSingle();

          return {
            origin: route.origin,
            destination: route.destination,
            price: staleCache?.price ? Number(staleCache.price) : null,
            cached: true,
          };
        }
      };

      const fetchedPrices = await Promise.all(routesToFetch.map(fetchWithTimeout));
      prices.push(...fetchedPrices);
    }

    return new Response(
      JSON.stringify({ prices, currency }),
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
