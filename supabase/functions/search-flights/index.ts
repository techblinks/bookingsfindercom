import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRAVELPAYOUTS_API = "https://api.travelpayouts.com";

interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers?: number;
  cabinClass?: string;
  currency?: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_KEY');
    const markerId = Deno.env.get('MARKER_ID');
    if (!apiToken) {
      throw new Error('TRAVELPAYOUTS_API_KEY not configured');
    }

    const body: FlightSearchRequest = await req.json();
    
    // Validate required fields
    if (!body.origin || !body.destination || !body.departureDate) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: origin, destination, departureDate' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build Travelpayouts API URL for flight prices
    // Using the prices/cheap endpoint for one-way/round-trip cheap prices
    const params = new URLSearchParams({
      origin: body.origin.toUpperCase(),
      destination: body.destination.toUpperCase(),
      depart_date: body.departureDate,
      currency: body.currency || 'USD',
      token: apiToken,
    });

    if (body.returnDate) {
      params.append('return_date', body.returnDate);
    }

    // Fetch cheap flight prices from Travelpayouts
    const pricesUrl = `${TRAVELPAYOUTS_API}/aviasales/v3/prices_for_dates?${params.toString()}`;
    
    console.log(`Fetching flights: ${body.origin} -> ${body.destination}`);
    
    const apiResponse = await fetch(pricesUrl);
    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Travelpayouts API error:', apiData);
      throw new Error(apiData.error || 'Failed to fetch flight data');
    }

    // Transform Travelpayouts response to our format
    const flights = (apiData.data || []).map((flight: any, index: number) => ({
      id: `fl-${index + 1}`,
      airline: flight.airline || 'Unknown',
      airlineCode: flight.airline,
      departureTime: flight.departure_at ? new Date(flight.departure_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--',
      arrivalTime: flight.return_at ? new Date(flight.return_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--',
      departureAirport: flight.origin || body.origin.toUpperCase(),
      arrivalAirport: flight.destination || body.destination.toUpperCase(),
      duration: flight.duration ? `${Math.floor(flight.duration / 60)}h ${flight.duration % 60}m` : 'N/A',
      stops: flight.transfers || 0,
      price: flight.price,
      currency: body.currency || 'USD',
      isDeal: index < 3, // Mark top 3 as deals
      redirectId: `redir-fl-${flight.airline}-${flight.flight_number || index}`,
      flightNumber: flight.flight_number,
      link: flight.link, // Travelpayouts affiliate link
    }));

    const response = {
      success: true,
      searchParams: {
        origin: body.origin,
        destination: body.destination,
        departureDate: body.departureDate,
        returnDate: body.returnDate || null,
        passengers: body.passengers || 1,
        cabinClass: body.cabinClass || 'economy',
      },
      results: flights,
      totalResults: flights.length,
      currency: body.currency || 'USD',
      timestamp: new Date().toISOString(),
    };

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Flight search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
