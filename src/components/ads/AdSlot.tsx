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
    // BF-0R-7 Phase H (P0 security): AdEmbed fails closed unconditionally
    // for every html_embed row — including legacy rows created before
    // html_embed was removed from Admin's selectable types — so this
    // renders nothing rather than the previous unsanitized HTML/script
    // execution path. See AdEmbed.tsx.
    return (
      <AdEmbed
        ad={ad}
        onImpression={() => onImpression?.(ad.id)}
      />
    );
  }

  return null;
}
