import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRAVELPAYOUTS_API = "https://api.travelpayouts.com";

interface FlightSearchRequest {
  origin: string;
  destination: string;
  depart_date: string;
  return_date?: string;
  adults?: number;
  currency?: string;
}

async function createFlightSearch(params: {
  origin: string;
  destination: string;
  depart_date: string;
  return_date?: string;
  adults: number;
  currency: string;
  token: string;
  marker: string;
}): Promise<{ search_id: string }> {
  const searchParams = new URLSearchParams({
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    depart_date: params.depart_date,
    adults: params.adults.toString(),
    currency: params.currency,
    token: params.token,
    marker: params.marker,
  });

  if (params.return_date) {
    searchParams.append('return_date', params.return_date);
  }

  const url = `${TRAVELPAYOUTS_API}/aviasales/v3/prices_for_dates?${searchParams.toString()}`;
  console.log(`Creating flight search: ${params.origin} -> ${params.destination}`);

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to create flight search');
  }

  // For prices_for_dates endpoint, we get results directly
  // Return a synthetic search_id based on the request
  return {
    search_id: `${params.origin}-${params.destination}-${params.depart_date}-${Date.now()}`,
    ...data
  };
}

async function getFlightResults(searchId: string, params: {
  origin: string;
  destination: string;
  depart_date: string;
  return_date?: string;
  currency: string;
  token: string;
}): Promise<{ flights: any[]; meta: { is_complete: boolean } }> {
  const searchParams = new URLSearchParams({
    origin: params.origin.toUpperCase(),
    destination: params.destination.toUpperCase(),
    depart_date: params.depart_date,
    currency: params.currency,
    token: params.token,
  });

  if (params.return_date) {
    searchParams.append('return_date', params.return_date);
  }

  const url = `${TRAVELPAYOUTS_API}/aviasales/v3/prices_for_dates?${searchParams.toString()}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to fetch flight results');
  }

  const flights = (data.data || []).map((flight: any, index: number) => ({
    id: `${flight.origin}-${flight.destination}-${flight.departure_at}-${flight.airline}-${index}`,
    airline: flight.airline || 'Unknown',
    airline_code: flight.airline,
    price: flight.price,
    currency: params.currency,
    duration_minutes: flight.duration || 0,
    stops: flight.transfers || 0,
    segments: [
      {
        from: flight.origin || params.origin.toUpperCase(),
        to: flight.destination || params.destination.toUpperCase(),
        depart_time: flight.departure_at,
        arrive_time: flight.return_at || null,
        airline: flight.airline,
        flight_number: flight.flight_number,
      }
    ],
    link: flight.link,
    flight_number: flight.flight_number,
  }));

  return {
    flights,
    meta: {
      is_complete: true // prices_for_dates returns complete results
    }
  };
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
    const markerId = Deno.env.get('MARKER_ID') || '';
    
    if (!apiToken) {
      throw new Error('TRAVELPAYOUTS_API_KEY not configured');
    }

    const body: FlightSearchRequest = await req.json();
    const {
      origin,
      destination,
      depart_date,
      return_date,
      adults = 1,
      currency = 'AUD'
    } = body;

    // Validate required fields
    if (!origin || !destination || !depart_date) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: origin, destination, depart_date' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1️⃣ Create search
    console.log(`Starting flight search: ${origin} -> ${destination} on ${depart_date}`);
    
    const searchResp = await createFlightSearch({
      origin,
      destination,
      depart_date,
      return_date,
      adults,
      currency,
      token: apiToken,
      marker: markerId,
    });

    const searchId = searchResp.search_id;
    let allFlights: any[] = [];
    let isComplete = false;
    let attempts = 0;

    // 2️⃣ Poll until complete (max 30 attempts, 1.5s delay)
    while (!isComplete && attempts < 30) {
      const resultResp = await getFlightResults(searchId, {
        origin,
        destination,
        depart_date,
        return_date,
        currency,
        token: apiToken,
      });

      if (Array.isArray(resultResp.flights)) {
        allFlights.push(...resultResp.flights);
      }

      isComplete = resultResp.meta?.is_complete === true;
      attempts++;

      if (!isComplete) {
        await new Promise(r => setTimeout(r, 1500));
      }
    }

    // 3️⃣ Deduplicate flights by ID
    const uniqueFlights = Object.values(
      allFlights.reduce((acc: Record<string, any>, flight) => {
        acc[flight.id] = flight;
        return acc;
      }, {})
    );

    console.log(`Search complete: found ${uniqueFlights.length} unique flights after ${attempts} attempts`);

    const response = {
      flights: uniqueFlights,
      meta: {
        total_found: uniqueFlights.length,
        is_complete: isComplete
      }
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
        error: 'Flight search failed', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
