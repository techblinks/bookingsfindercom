import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Json } from '@/integrations/supabase/types';

export interface HomepageSections {
  flights: boolean;
  hotels: boolean;
  popular_routes: boolean;
  how_it_works: boolean;
  why_book: boolean;
  top_deals: boolean;
  trust_stats: boolean;
}

export interface HeroSearchTabs {
  flights: boolean;
  hotels: boolean;
}

interface SiteSetting {
  id: string;
  key: string;
  value: Json;
  description: string | null;
  updated_at: string;
}

const defaultHomepageSections: HomepageSections = {
  flights: true,
  hotels: true,
  popular_routes: true,
  how_it_works: true,
  why_book: true,
  top_deals: true,
  trust_stats: true,
};

const defaultHeroSearchTabs: HeroSearchTabs = {
  flights: true,
  hotels: true,
};

export function useSiteSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading, error } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('*');

      if (error) throw error;
      
      // Transform array to key-value map
      const settingsMap: Record<string, SiteSetting> = {};
      (data || []).forEach((setting) => {
        settingsMap[setting.key] = setting as SiteSetting;
      });
      
      return settingsMap;
    },
    staleTime: 30000, // Cache for 30 seconds
  });

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: Json }) => {
      const { error } = await supabase
        .from('site_settings')
        .update({ value })
        .eq('key', key);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['site-settings'] });
    },
  });

  // Helper getters with defaults - safely parse JSON values
  const parseHomepageSections = (value: Json | undefined): HomepageSections => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return defaultHomepageSections;
    }
    return { ...defaultHomepageSections, ...value } as HomepageSections;
  };

  const parseHeroSearchTabs = (value: Json | undefined): HeroSearchTabs => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
      return defaultHeroSearchTabs;
    }
    return { ...defaultHeroSearchTabs, ...value } as HeroSearchTabs;
  };

  const homepageSections = parseHomepageSections(settings?.homepage_sections?.value);
  const heroSearchTabs = parseHeroSearchTabs(settings?.hero_search_tabs?.value);

  return {
    settings,
    isLoading,
    error,
    homepageSections,
    heroSearchTabs,
    updateSetting: updateSetting.mutate,
    isUpdating: updateSetting.isPending,
  };
}
