import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { selectTopAdPerPlacement } from "../_shared/adSelection.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AdPlacement {
  id: string;
  name: string;
  type: 'sponsored_card' | 'html_embed' | 'banner' | 'native' | 'hero_banner' | 'inline_promo';
  placement: 'after_result_3' | 'bottom' | 'after_result_5' | 'hero_below' | 'between_sections' | 'sidebar' | 'footer_above';
  page: 'flights' | 'hotels' | 'both' | 'home' | 'all';
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

// Define valid placements per page type
const pagePlacements: Record<string, string[]> = {
  flights: ['after_result_3', 'after_result_5', 'bottom'],
  hotels: ['after_result_3', 'after_result_5', 'bottom'],
  home: ['hero_below', 'between_sections', 'sidebar', 'footer_above'],
};

// Ad types each surface's frontend actually renders. `html_embed` is
// deliberately excluded everywhere (BF-0R-7 Round 1 P0 XSS fix neutered its
// renderer — see AdEmbed.tsx) so a disabled/unsupported-type row can never
// win priority ordering over a type that would actually render.
const supportedTypesByPage: Record<string, string[]> = {
  flights: ['sponsored_card'],
  hotels: ['sponsored_card'],
  home: ['hero_banner', 'inline_promo', 'banner', 'native', 'sponsored_card'],
};

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

    if (!page || !['flights', 'hotels', 'home'].includes(page)) {
      return new Response(
        JSON.stringify({ error: 'Invalid page parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const now = new Date().toISOString();

    // Build page filter - include 'all' for pages that should show on all pages
    const pageFilter = page === 'home' 
      ? `page.eq.home,page.eq.all`
      : `page.eq.${page},page.eq.both,page.eq.all`;

    // Fetch active ads for the specified page and device
    const { data: ads, error } = await supabase
      .from('ad_placements')
      .select('*')
      .eq('is_active', true)
      .or(pageFilter)
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

    // Get valid placements for this page
    const validPlacements = pagePlacements[page] || [];
    const supportedTypes = supportedTypesByPage[page] || [];

    // Pick the highest-priority ad per placement, but only among types this
    // page's frontend actually supports — an unsupported/disabled type (e.g.
    // html_embed) must never suppress a lower-priority supported ad.
    const result = selectTopAdPerPlacement(filteredAds, validPlacements, supportedTypes);

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
