import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock hotel search data - replace with actual API calls
const mockHotelResults = [
  {
    id: "ht-1",
    name: "The Grand Plaza Hotel",
    image: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800&q=80",
    location: "Downtown, 0.5 mi from center",
    stars: 5,
    guestScore: 9.2,
    reviewCount: 2341,
    price: 289,
    originalPrice: 349,
    currency: "USD",
    amenities: ["wifi", "parking", "breakfast", "gym", "pool"],
    isDeal: true,
    redirectId: "redir-ht-1",
  },
  {
    id: "ht-2",
    name: "Oceanview Resort & Spa",
    image: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&q=80",
    location: "Beach Area, 2.1 mi from center",
    stars: 4,
    guestScore: 8.8,
    reviewCount: 1892,
    price: 245,
    currency: "USD",
    amenities: ["wifi", "parking", "pool", "restaurant"],
    isDeal: false,
    redirectId: "redir-ht-2",
  },
  {
    id: "ht-3",
    name: "Urban Boutique Suites",
    image: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800&q=80",
    location: "Arts District, 1.8 mi from center",
    stars: 4,
    guestScore: 8.4,
    reviewCount: 967,
    price: 159,
    currency: "USD",
    amenities: ["wifi", "breakfast"],
    isDeal: false,
    redirectId: "redir-ht-3",
  },
  {
    id: "ht-4",
    name: "Sunset Tower Hotel",
    image: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800&q=80",
    location: "West Side, 1.2 mi from center",
    stars: 5,
    guestScore: 9.5,
    reviewCount: 3156,
    price: 425,
    originalPrice: 499,
    currency: "USD",
    amenities: ["wifi", "parking", "breakfast", "gym", "pool", "restaurant"],
    isDeal: true,
    redirectId: "redir-ht-4",
  },
  {
    id: "ht-5",
    name: "Marina Bay Inn",
    image: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800&q=80",
    location: "Marina, 3.5 mi from center",
    stars: 3,
    guestScore: 7.8,
    reviewCount: 542,
    price: 119,
    currency: "USD",
    amenities: ["wifi", "parking"],
    isDeal: false,
    redirectId: "redir-ht-5",
  },
];

interface HotelSearchRequest {
  destination: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  rooms?: number;
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

    // TODO: Replace with actual API calls to hotel providers
    // For now, return mock data with search params applied
    const results = mockHotelResults.map(hotel => ({
      ...hotel,
      location: `${body.destination}, ${hotel.location}`,
    }));

    const response = {
      success: true,
      searchParams: {
        destination: body.destination,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
        guests: body.guests || 2,
        rooms: body.rooms || 1,
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
