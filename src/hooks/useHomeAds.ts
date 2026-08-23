import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeoLocation } from '@/hooks/useGeoLocation';

export interface HomeAdPlacement {
  id: string;
  name: string;
  type: 'sponsored_card' | 'html_embed' | 'banner' | 'native' | 'hero_banner' | 'inline_promo';
  placement: 'hero_below' | 'between_sections' | 'sidebar' | 'footer_above';
  page: 'home' | 'all';
  device: 'mobile' | 'desktop' | 'all';
  title?: string;
  description?: string;
  image_url?: string;
  cta_text?: string;
  destination_url?: string;
  advertiser_name?: string;
  html_content?: string;
  priority: number;
  geo?: string[];
}

interface UseHomeAdsReturn {
  ads: Record<string, HomeAdPlacement | null>;
  isLoading: boolean;
  trackImpression: (adId: string) => void;
  trackClick: (adId: string) => void;
}

export function useHomeAds(): UseHomeAdsReturn {
  const [ads, setAds] = useState<Record<string, HomeAdPlacement | null>>({});
  const [isLoading, setIsLoading] = useState(true);
  const isMobile = useIsMobile();
  const { geoData } = useGeoLocation();
  const [impressionTracked, setImpressionTracked] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchAds = async () => {
      try {
        const device = isMobile ? 'mobile' : 'desktop';
        
        const { data, error } = await supabase.functions.invoke('get-ads', {
          body: { 
            page: 'home', 
            device,
            countryCode: geoData?.countryCode || null,
          },
        });

        if (error) {
          console.error('Failed to fetch home ads:', error);
          return;
        }

        setAds(data.ads || {});
      } catch (err) {
        console.error('Error fetching home ads:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay ad fetch to not block main content
    const timer = setTimeout(fetchAds, 200);
    return () => clearTimeout(timer);
  }, [isMobile, geoData?.countryCode]);

  // BF-0R-5 round 3: anon/authenticated no longer have a raw UPDATE grant on
  // ad_placements — impression/click tracking goes through two narrow
  // SECURITY DEFINER RPCs that can only add exactly one to one counter on
  // one active row (supabase/migrations/20260820000000_bf0r5_...).
  const trackImpression = async (adId: string) => {
    if (impressionTracked.has(adId)) return;
    setImpressionTracked(prev => new Set(prev).add(adId));

    try {
      const { error } = await supabase.rpc('increment_ad_impression', { p_ad_id: adId });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to track impression:', err);
    }
  };

  const trackClick = async (adId: string) => {
    try {
      const { error } = await supabase.rpc('increment_ad_click', { p_ad_id: adId });
      if (error) throw error;
    } catch (err) {
      console.error('Failed to track click:', err);
    }
  };

  return { ads, isLoading, trackImpression, trackClick };
}
