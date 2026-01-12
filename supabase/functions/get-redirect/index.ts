import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Travelpayouts affiliate base URLs
const AVIASALES_BASE = "https://www.aviasales.com";
const HOTELLOOK_BASE = "https://search.hotellook.com";

interface RedirectRequest {
  id: string;
  type?: 'flight' | 'hotel';
  // Flight params
  origin?: string;
  destination?: string;
  departureDate?: string;
  returnDate?: string;
  airline?: string;
  // Hotel params
  hotelId?: string;
  checkIn?: string;
  checkOut?: string;
  guests?: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const markerId = Deno.env.get('MARKER_ID') || '';
    const url = new URL(req.url);
    
    const id = url.searchParams.get('id');
    const type = url.searchParams.get('type') as 'flight' | 'hotel' | null;
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse redirect parameters from query string
    const origin = url.searchParams.get('origin');
    const destination = url.searchParams.get('destination');
    const departureDate = url.searchParams.get('departureDate');
    const returnDate = url.searchParams.get('returnDate');
    const airline = url.searchParams.get('airline');
    const hotelId = url.searchParams.get('hotelId');
    const checkIn = url.searchParams.get('checkIn');
    const checkOut = url.searchParams.get('checkOut');
    const guests = url.searchParams.get('guests');
    const directLink = url.searchParams.get('link');

    let redirectUrl = '';
    let partner = '';

    // If a direct link was provided (from API response), use it
    if (directLink) {
      redirectUrl = decodeURIComponent(directLink);
      partner = type === 'hotel' ? 'Hotellook' : 'Aviasales';
    } else if (type === 'flight' || id.startsWith('redir-fl')) {
      // Build Aviasales search URL
      const flightParams = new URLSearchParams();
      if (origin) flightParams.append('origin_iata', origin);
      if (destination) flightParams.append('destination_iata', destination);
      if (departureDate) flightParams.append('depart_date', departureDate);
      if (returnDate) flightParams.append('return_date', returnDate);
      if (markerId) flightParams.append('marker', markerId);
      
      redirectUrl = `${AVIASALES_BASE}/search/${origin}${departureDate?.replace(/-/g, '')}${destination}${returnDate ? returnDate.replace(/-/g, '') : ''}1?${flightParams.toString()}`;
      partner = 'Aviasales';
    } else if (type === 'hotel' || id.startsWith('redir-ht')) {
      // Build Hotellook search URL
      const hotelParams = new URLSearchParams();
      if (destination) hotelParams.append('destination', destination);
      if (checkIn) hotelParams.append('checkIn', checkIn);
      if (checkOut) hotelParams.append('checkOut', checkOut);
      if (guests) hotelParams.append('adults', guests);
      if (hotelId) hotelParams.append('hotelId', hotelId);
      if (markerId) hotelParams.append('marker', markerId);
      
      redirectUrl = `${HOTELLOOK_BASE}/hotels?${hotelParams.toString()}`;
      partner = 'Hotellook';
    } else {
      return new Response(
        JSON.stringify({ error: 'Unable to determine redirect type' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the click for analytics
    console.log(`Redirect click: ${id} -> ${partner} | ${redirectUrl}`);

    const response = {
      success: true,
      id: id,
      redirectUrl: redirectUrl,
      partner: partner,
      type: type || (id.startsWith('redir-fl') ? 'flight' : 'hotel'),
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
    console.error('Redirect error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
