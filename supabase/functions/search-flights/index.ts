import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock flight search data - replace with actual API calls
const mockFlightResults = [
  {
    id: "fl-1",
    airline: "Delta Air Lines",
    airlineCode: "DL",
    departureTime: "06:30",
    arrivalTime: "09:45",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 15m",
    stops: 0,
    price: 289,
    currency: "USD",
    isDeal: true,
    redirectId: "redir-fl-1",
  },
  {
    id: "fl-2",
    airline: "United Airlines",
    airlineCode: "UA",
    departureTime: "08:15",
    arrivalTime: "14:30",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "6h 15m",
    stops: 1,
    price: 245,
    currency: "USD",
    isDeal: false,
    redirectId: "redir-fl-2",
  },
  {
    id: "fl-3",
    airline: "American Airlines",
    airlineCode: "AA",
    departureTime: "10:00",
    arrivalTime: "13:20",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 20m",
    stops: 0,
    price: 312,
    currency: "USD",
    isDeal: false,
    redirectId: "redir-fl-3",
  },
  {
    id: "fl-4",
    airline: "Southwest Airlines",
    airlineCode: "WN",
    departureTime: "14:45",
    arrivalTime: "21:15",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "6h 30m",
    stops: 1,
    price: 198,
    currency: "USD",
    isDeal: true,
    redirectId: "redir-fl-4",
  },
  {
    id: "fl-5",
    airline: "JetBlue Airways",
    airlineCode: "B6",
    departureTime: "16:30",
    arrivalTime: "19:50",
    departureAirport: "JFK",
    arrivalAirport: "LAX",
    duration: "5h 20m",
    stops: 0,
    price: 329,
    currency: "USD",
    isDeal: false,
    redirectId: "redir-fl-5",
  },
];

interface FlightSearchRequest {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  passengers: number;
  cabinClass: string;
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

    // TODO: Replace with actual API calls to flight providers
    // For now, return mock data with search params applied
    const results = mockFlightResults.map(flight => ({
      ...flight,
      departureAirport: body.origin.toUpperCase().slice(0, 3),
      arrivalAirport: body.destination.toUpperCase().slice(0, 3),
      searchDate: body.departureDate,
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
      results: results,
      totalResults: results.length,
      currency: 'USD',
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
