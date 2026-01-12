import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const TRAVELPAYOUTS_API = "https://engine.hotellook.com/api/v2";

interface HotelSearchRequest {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
  currency?: string;
  limit?: number;
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
    const apiToken = Deno.env.get('TRAVELPAYOUTS_API_TOKEN');
    if (!apiToken) {
      throw new Error('TRAVELPAYOUTS_API_TOKEN not configured');
    }

    const body: HotelSearchRequest = await req.json();
    
    // Validate required fields
    if (!body.destination || !body.checkIn || !body.checkOut) {
      return new Response(
        JSON.stringify({ 
          error: 'Missing required fields: destination, checkIn, checkOut' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // First, lookup the location ID for the destination
    const lookupParams = new URLSearchParams({
      query: body.destination,
      lang: 'en',
      lookFor: 'both',
      limit: '1',
      token: apiToken,
    });

    const lookupUrl = `${TRAVELPAYOUTS_API}/lookup.json?${lookupParams.toString()}`;
    console.log(`Looking up location: ${body.destination}`);
    
    const lookupResponse = await fetch(lookupUrl);
    const lookupData = await lookupResponse.json();

    let locationId = null;
    let locationType = 'city';

    if (lookupData.results?.locations?.[0]) {
      locationId = lookupData.results.locations[0].id;
      locationType = lookupData.results.locations[0].locationType || 'city';
    } else if (lookupData.results?.hotels?.[0]) {
      locationId = lookupData.results.hotels[0].locationId;
    }

    if (!locationId) {
      // Fallback: try to use destination as city code
      locationId = body.destination;
    }

    // Fetch hotel prices from Travelpayouts/Hotellook
    const hotelParams = new URLSearchParams({
      location: locationId.toString(),
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adults: (body.guests || 2).toString(),
      limit: (body.limit || 20).toString(),
      currency: body.currency || 'USD',
      token: apiToken,
    });

    const hotelsUrl = `${TRAVELPAYOUTS_API}/cache.json?${hotelParams.toString()}`;
    console.log(`Fetching hotels for location: ${locationId}`);
    
    const apiResponse = await fetch(hotelsUrl);
    const apiData = await apiResponse.json();

    if (!apiResponse.ok) {
      console.error('Travelpayouts API error:', apiData);
      throw new Error(apiData.error || 'Failed to fetch hotel data');
    }

    // Transform Travelpayouts response to our format
    const hotels = (Array.isArray(apiData) ? apiData : []).map((hotel: any, index: number) => ({
      id: `ht-${hotel.hotelId || index + 1}`,
      hotelId: hotel.hotelId,
      name: hotel.hotelName || `Hotel ${index + 1}`,
      image: hotel.photoUrl || `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80`,
      location: `${body.destination}`,
      stars: hotel.stars || 3,
      guestScore: hotel.rating ? (hotel.rating / 10) : 7.5,
      reviewCount: hotel.reviews || 0,
      price: hotel.priceFrom || hotel.price || 0,
      originalPrice: hotel.priceAvg && hotel.priceAvg > hotel.priceFrom ? hotel.priceAvg : undefined,
      currency: body.currency || 'USD',
      amenities: ['wifi'], // Travelpayouts doesn't provide amenities in cache endpoint
      isDeal: hotel.priceFrom < hotel.priceAvg,
      redirectId: `redir-ht-${hotel.hotelId || index}`,
      link: `https://search.hotellook.com/hotels?destination=${encodeURIComponent(body.destination)}&checkIn=${body.checkIn}&checkOut=${body.checkOut}&hotelId=${hotel.hotelId}`,
    }));

    const response = {
      success: true,
      searchParams: {
        destination: body.destination,
        locationId: locationId,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        guests: body.guests || 2,
        rooms: body.rooms || 1,
      },
      results: hotels,
      totalResults: hotels.length,
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
    console.error('Hotel search error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
