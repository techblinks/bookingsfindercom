import { AdPlacement } from '@/hooks/useAds';
import { SponsoredCard } from './SponsoredCard';
import { AdEmbed } from './AdEmbed';

interface AdSlotProps {
  ad: AdPlacement | null;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
}

export function AdSlot({ ad, onImpression, onClick }: AdSlotProps) {
  if (!ad) return null;

  if (ad.type === 'sponsored_card') {
    return (
      <SponsoredCard
        ad={ad}
        onImpression={() => onImpression?.(ad.id)}
        onClick={() => onClick?.(ad.id)}
      />
    );
  }

  if (ad.type === 'html_embed') {
    return (
      <AdEmbed
        ad={ad}
        onImpression={() => onImpression?.(ad.id)}
      />
    );
  }

  return null;
}
