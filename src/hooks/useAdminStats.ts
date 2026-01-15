import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface AdminStats {
  activeAlerts: number;
  searchesToday: number;
  clicksToday: number;
  totalAlerts: number;
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['admin-stats'],
    queryFn: async (): Promise<AdminStats> => {
      const today = new Date().toISOString().split('T')[0];
      
      // Get the current session to include the access token
      const { data: { session } } = await supabase.auth.getSession();
      
      // Fetch all stats in parallel
      const [alertsResult, clicksResult] = await Promise.all([
        // Active alerts count
        supabase
          .from('saved_searches')
          .select('id', { count: 'exact', head: true })
          .eq('is_active', true),
        
        // Today's affiliate clicks (we need to use edge function since affiliate_clicks has restricted SELECT)
        // Pass the session token explicitly in headers
        session?.access_token 
          ? supabase.functions.invoke('get-admin-stats', {
              body: { date: today },
              headers: {
                Authorization: `Bearer ${session.access_token}`
              }
            })
          : Promise.resolve({ data: null, error: new Error('No session') })
      ]);

      // Handle affiliate clicks - if edge function exists, use it; otherwise fallback to 0
      let searchesToday = 0;
      let clicksToday = 0;
      
      if (clicksResult.data && !clicksResult.error) {
        searchesToday = clicksResult.data.searchesToday ?? 0;
        clicksToday = clicksResult.data.clicksToday ?? 0;
      }

      return {
        activeAlerts: alertsResult.count ?? 0,
        searchesToday,
        clicksToday,
        totalAlerts: alertsResult.count ?? 0,
      };
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 10000, // Consider data stale after 10 seconds
  });
}
