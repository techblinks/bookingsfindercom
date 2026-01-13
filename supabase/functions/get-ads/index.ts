import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdPlacement {
  id: string;
  name: string;
  type: 'sponsored_card' | 'html_embed';
  placement: 'after_result_3' | 'bottom' | 'after_result_5';
  page: 'flights' | 'hotels' | 'both';
  device: 'mobile' | 'desktop' | 'all';
  geo: string[];
  title?: string;
  description?: string;
  image_url?: string;
  cta_text?: string;
  destination_url?: string;
  advertiser_name?: string;
  html_content?: string;
  priority: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { page, device, countryCode } = await req.json();

    if (!page || !['flights', 'hotels'].includes(page)) {
      return new Response(
        JSON.stringify({ error: 'Invalid page parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    // Fetch active ads for the specified page and device
    const { data: ads, error } = await supabase
      .from('ad_placements')
      .select('*')
      .eq('is_active', true)
      .or(`page.eq.${page},page.eq.both`)
      .or(`device.eq.${device || 'all'},device.eq.all`)
      .or(`start_date.is.null,start_date.lte.${now}`)
      .or(`end_date.is.null,end_date.gte.${now}`)
      .order('priority', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch ads' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Filter by geo-targeting if countryCode is provided
    const filteredAds = (ads || []).filter((ad: AdPlacement) => {
      // If no geo restrictions, show to everyone
      if (!ad.geo || ad.geo.length === 0) {
        return true;
      }
      // If user's country is in the geo list, show the ad
      if (countryCode && ad.geo.includes(countryCode)) {
        return true;
      }
      // If geo is set but user country doesn't match, hide the ad
      return false;
    });

    // Group ads by placement
    const adsByPlacement: Record<string, AdPlacement[]> = {
      after_result_3: [],
      after_result_5: [],
      bottom: [],
    };

    filteredAds.forEach((ad: AdPlacement) => {
      if (adsByPlacement[ad.placement]) {
        adsByPlacement[ad.placement].push(ad);
      }
    });

    // Return only the highest priority ad for each placement
    const result: Record<string, AdPlacement | null> = {
      after_result_3: adsByPlacement.after_result_3[0] || null,
      after_result_5: adsByPlacement.after_result_5[0] || null,
      bottom: adsByPlacement.bottom[0] || null,
    };

    return new Response(
      JSON.stringify({ ads: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
