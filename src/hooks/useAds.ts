import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { useGeoLocation } from '@/hooks/useGeoLocation';

export interface AdPlacement {
  id: string;
  name: string;
  type: 'sponsored_card' | 'html_embed';
  placement: 'after_result_3' | 'bottom' | 'after_result_5';
  page: 'flights' | 'hotels' | 'both';
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

interface UseAdsReturn {
  ads: Record<string, AdPlacement | null>;
  isLoading: boolean;
  trackImpression: (adId: string) => void;
  trackClick: (adId: string) => void;
}

export function useAds(page: 'flights' | 'hotels'): UseAdsReturn {
  const [ads, setAds] = useState<Record<string, AdPlacement | null>>({});
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
            page, 
            device,
            countryCode: geoData?.countryCode || null,
          },
        });

        if (error) {
          console.error('Failed to fetch ads:', error);
          return;
        }

        setAds(data.ads || {});
      } catch (err) {
        console.error('Error fetching ads:', err);
      } finally {
        setIsLoading(false);
      }
    };

    // Delay ad fetch to not block main content
    const timer = setTimeout(fetchAds, 100);
    return () => clearTimeout(timer);
  }, [page, isMobile, geoData?.countryCode]);

  const trackImpression = (adId: string) => {
    if (impressionTracked.has(adId)) return;
    setImpressionTracked(prev => new Set(prev).add(adId));
    // Fire and forget - don't await to avoid blocking UI
    // Tracking via analytics or separate endpoint would be better in production
  };

  const trackClick = (adId: string) => {
    // Fire and forget - tracking happens async
    console.log('Ad clicked:', adId);
  };

  return { ads, isLoading, trackImpression, trackClick };
}
