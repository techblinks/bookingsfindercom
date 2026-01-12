import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mock redirect data store - replace with database lookup
const mockRedirects: Record<string, { url: string; partner: string; type: string }> = {
  "redir-fl-1": {
    url: "https://example.com/book/delta-jfk-lax",
    partner: "Delta Air Lines",
    type: "flight",
  },
  "redir-fl-2": {
    url: "https://example.com/book/united-jfk-lax",
    partner: "United Airlines",
    type: "flight",
  },
  "redir-fl-3": {
    url: "https://example.com/book/american-jfk-lax",
    partner: "American Airlines",
    type: "flight",
  },
  "redir-fl-4": {
    url: "https://example.com/book/southwest-jfk-lax",
    partner: "Southwest Airlines",
    type: "flight",
  },
  "redir-fl-5": {
    url: "https://example.com/book/jetblue-jfk-lax",
    partner: "JetBlue Airways",
    type: "flight",
  },
  "redir-ht-1": {
    url: "https://example.com/book/grand-plaza",
    partner: "Booking.com",
    type: "hotel",
  },
  "redir-ht-2": {
    url: "https://example.com/book/oceanview-resort",
    partner: "Hotels.com",
    type: "hotel",
  },
  "redir-ht-3": {
    url: "https://example.com/book/urban-boutique",
    partner: "Expedia",
    type: "hotel",
  },
  "redir-ht-4": {
    url: "https://example.com/book/sunset-tower",
    partner: "Booking.com",
    type: "hotel",
  },
  "redir-ht-5": {
    url: "https://example.com/book/marina-bay",
    partner: "Agoda",
    type: "hotel",
  },
};

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
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameter: id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Replace with database lookup and affiliate link generation
    const redirectData = mockRedirects[id];
    
    if (!redirectData) {
      return new Response(
        JSON.stringify({ error: 'Redirect not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Log the click for analytics (TODO: store in database)
    console.log(`Redirect click: ${id} -> ${redirectData.partner}`);

    // Return redirect data (client will handle the actual redirect)
    const response = {
      success: true,
      id: id,
      redirectUrl: redirectData.url,
      partner: redirectData.partner,
      type: redirectData.type,
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
