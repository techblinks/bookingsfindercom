import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client to bypass RLS
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the user is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the user from the token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin
    const { data: roleData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body for date
    const { date } = await req.json().catch(() => ({ date: null }));
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Get today's stats from affiliate_clicks (using service role to bypass RLS)
    const startOfDay = `${targetDate}T00:00:00.000Z`;
    const endOfDay = `${targetDate}T23:59:59.999Z`;

    const { data: clicksData, error: clicksError } = await supabase
      .from('affiliate_clicks')
      .select('action')
      .gte('created_at', startOfDay)
      .lte('created_at', endOfDay);

    if (clicksError) {
      console.error('Error fetching clicks:', clicksError);
      throw clicksError;
    }

    // Count searches and clicks
    const searchesToday = clicksData?.filter(c => c.action === 'search').length ?? 0;
    const clicksToday = clicksData?.filter(c => c.action === 'click' || c.action === 'redirect').length ?? 0;

    // Get total alerts
    const { count: activeAlerts } = await supabase
      .from('saved_searches')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);

    // Get total emails sent (price drops that triggered alerts)
    const { count: emailsSent } = await supabase
      .from('price_history')
      .select('id', { count: 'exact', head: true })
      .gte('recorded_at', startOfDay)
      .lte('recorded_at', endOfDay);

    return new Response(
      JSON.stringify({
        searchesToday,
        clicksToday,
        activeAlerts: activeAlerts ?? 0,
        emailsSent: emailsSent ?? 0,
        date: targetDate,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in get-admin-stats:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
