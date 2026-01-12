import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HOTELLOOK_API = "https://engine.hotellook.com/api/v2";

interface HotelSearchRequest {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests?: number;
  rooms?: number;
  currency?: string;
  limit?: number;
}

// Helper to create MD5 hash
async function md5(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("MD5", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Map city names to IATA codes (common ones)
const cityToIata: Record<string, string> = {
  'paris': 'PAR',
  'london': 'LON',
  'new york': 'NYC',
  'los angeles': 'LAX',
  'tokyo': 'TYO',
  'rome': 'ROM',
  'barcelona': 'BCN',
  'amsterdam': 'AMS',
  'berlin': 'BER',
  'dubai': 'DXB',
  'singapore': 'SIN',
  'sydney': 'SYD',
  'miami': 'MIA',
  'las vegas': 'LAS',
  'san francisco': 'SFO',
  'chicago': 'CHI',
  'boston': 'BOS',
  'seattle': 'SEA',
  'washington': 'WAS',
  'bangkok': 'BKK',
  'hong kong': 'HKG',
  'bali': 'DPS',
  'phuket': 'HKT',
  'maldives': 'MLE',
  'cancun': 'CUN',
};

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
    
    if (!apiToken || !markerId) {
      throw new Error('TRAVELPAYOUTS_API_KEY or MARKER_ID not configured');
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

    const adultsCount = body.guests || 2;
    const currency = body.currency || 'USD';
    const lang = 'en';
    
    // Convert city name to IATA code if possible
    const destinationLower = body.destination.toLowerCase().trim();
    let iata = cityToIata[destinationLower] || body.destination.toUpperCase();
    
    // If destination is 3 chars, assume it's already an IATA code
    if (body.destination.length === 3) {
      iata = body.destination.toUpperCase();
    }

    console.log(`Searching hotels in: ${body.destination} (IATA: ${iata})`);

    // Create signature for start search
    // Format: token:marker:adultsCount:checkIn:checkOut:currency:customerIP:iata:lang:waitForResult
    const customerIP = '127.0.0.1'; // Using localhost as we're server-side
    const waitForResult = '1'; // Wait for immediate results
    
    const signatureString = `${apiToken}:${markerId}:${adultsCount}:${body.checkIn}:${body.checkOut}:${currency}:${customerIP}:${iata}:${lang}:${waitForResult}`;
    const signature = await md5(signatureString);

    console.log(`Starting hotel search with signature...`);

    // Start search request
    const startParams = new URLSearchParams({
      iata: iata,
      checkIn: body.checkIn,
      checkOut: body.checkOut,
      adultsCount: adultsCount.toString(),
      customerIP: customerIP,
      lang: lang,
      currency: currency,
      waitForResult: waitForResult,
      marker: markerId,
      signature: signature,
    });

    const startUrl = `${HOTELLOOK_API}/search/start.json?${startParams.toString()}`;
    
    const startResponse = await fetch(startUrl);
    const startText = await startResponse.text();
    
    console.log(`Start search response: ${startText.substring(0, 200)}`);

    // Check if response is valid JSON
    if (!startText.startsWith('{') && !startText.startsWith('[')) {
      console.error('Non-JSON response from start search:', startText.substring(0, 100));
      // Return empty results gracefully
      return new Response(
        JSON.stringify({
          success: true,
          searchParams: {
            destination: body.destination,
            iata: iata,
            checkIn: body.checkIn,
            checkOut: body.checkOut,
            guests: adultsCount,
            rooms: body.rooms || 1,
          },
          results: [],
          totalResults: 0,
          currency: currency,
          message: 'Hotel search API unavailable or no results',
          timestamp: new Date().toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startData = JSON.parse(startText);

    // If we got results with waitForResult=1
    let hotels: any[] = [];
    
    if (startData.result && Array.isArray(startData.result)) {
      hotels = startData.result.slice(0, body.limit || 20).map((hotel: any, index: number) => ({
        id: `ht-${hotel.id || index + 1}`,
        hotelId: hotel.id,
        name: hotel.name || `Hotel ${index + 1}`,
        image: hotel.photos?.[0] ? `https://photo.hotellook.com/image_v2/limit/${hotel.photos[0]}/800/520.auto` : `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80`,
        location: `${body.destination}`,
        stars: hotel.stars || 3,
        guestScore: hotel.rating ? hotel.rating / 10 : 7.5,
        reviewCount: hotel.popularity || 0,
        price: hotel.minPriceTotal || hotel.minPrice || 0,
        originalPrice: hotel.fullPrice && hotel.fullPrice > hotel.minPriceTotal ? hotel.fullPrice : undefined,
        currency: currency,
        amenities: hotel.amenities?.slice(0, 5) || ['wifi'],
        isDeal: hotel.discount && hotel.discount > 0,
        redirectId: `redir-ht-${hotel.id || index}`,
        link: `https://search.hotellook.com/hotels?destination=${encodeURIComponent(body.destination)}&checkIn=${body.checkIn}&checkOut=${body.checkOut}&adults=${adultsCount}&marker=${markerId}${hotel.id ? `&hotelId=${hotel.id}` : ''}`,
      }));
    } else if (startData.searchId) {
      // Need to poll for results
      console.log(`Got searchId: ${startData.searchId}, fetching results...`);
      
      // Create signature for getResult
      const limit = body.limit || 20;
      const offset = 0;
      const roomsCount = body.rooms || 1;
      const sortBy = 'popularity';
      const sortAsc = '0';
      
      const resultSignatureString = `${apiToken}:${markerId}:${limit}:${offset}:${roomsCount}:${startData.searchId}:${sortAsc}:${sortBy}`;
      const resultSignature = await md5(resultSignatureString);

      // Wait a moment for results to be ready
      await new Promise(resolve => setTimeout(resolve, 2000));

      const resultParams = new URLSearchParams({
        searchId: startData.searchId,
        marker: markerId,
        signature: resultSignature,
        limit: limit.toString(),
        offset: offset.toString(),
        roomsCount: roomsCount.toString(),
        sortBy: sortBy,
        sortAsc: sortAsc,
      });

      const resultUrl = `${HOTELLOOK_API}/search/getResult.json?${resultParams.toString()}`;
      const resultResponse = await fetch(resultUrl);
      const resultText = await resultResponse.text();

      if (resultText.startsWith('{') || resultText.startsWith('[')) {
        const resultData = JSON.parse(resultText);
        
        if (resultData.result && Array.isArray(resultData.result)) {
          hotels = resultData.result.slice(0, limit).map((hotel: any, index: number) => ({
            id: `ht-${hotel.id || index + 1}`,
            hotelId: hotel.id,
            name: hotel.name || `Hotel ${index + 1}`,
            image: hotel.photos?.[0] ? `https://photo.hotellook.com/image_v2/limit/${hotel.photos[0]}/800/520.auto` : `https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80`,
            location: `${body.destination}`,
            stars: hotel.stars || 3,
            guestScore: hotel.rating ? hotel.rating / 10 : 7.5,
            reviewCount: hotel.popularity || 0,
            price: hotel.minPriceTotal || hotel.minPrice || 0,
            originalPrice: hotel.fullPrice && hotel.fullPrice > hotel.minPriceTotal ? hotel.fullPrice : undefined,
            currency: currency,
            amenities: hotel.amenities?.slice(0, 5) || ['wifi'],
            isDeal: hotel.discount && hotel.discount > 0,
            redirectId: `redir-ht-${hotel.id || index}`,
            link: `https://search.hotellook.com/hotels?destination=${encodeURIComponent(body.destination)}&checkIn=${body.checkIn}&checkOut=${body.checkOut}&adults=${adultsCount}&marker=${markerId}${hotel.id ? `&hotelId=${hotel.id}` : ''}`,
          }));
        }
      }
    }

    const response = {
      success: true,
      searchParams: {
        destination: body.destination,
        iata: iata,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        guests: adultsCount,
        rooms: body.rooms || 1,
      },
      results: hotels,
      totalResults: hotels.length,
      currency: currency,
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
