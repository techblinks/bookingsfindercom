import { useEffect } from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { HomeAdPlacement } from '@/hooks/useHomeAds';

interface HomeAdSlotProps {
  ad: HomeAdPlacement | null;
  placement: string;
  onImpression?: (adId: string) => void;
  onClick?: (adId: string) => void;
}

export function HomeAdSlot({ ad, placement, onImpression, onClick }: HomeAdSlotProps) {
  useEffect(() => {
    if (ad && onImpression) {
      onImpression(ad.id);
    }
  }, [ad, onImpression]);

  if (!ad) return null;

  const handleClick = () => {
    if (onClick) onClick(ad.id);
    if (ad.destination_url) {
      window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
    }
  };

  // Hero Banner - full width prominent placement
  if (ad.type === 'hero_banner') {
    return (
      <div className="w-full bg-gradient-to-r from-primary/10 via-primary/5 to-accent/10 border-y border-border">
        <div className="container py-6 md:py-8">
          <div 
            className="flex flex-col md:flex-row items-center gap-6 cursor-pointer group"
            onClick={handleClick}
          >
            {ad.image_url && (
              <div className="w-full md:w-1/3 aspect-video md:aspect-[4/3] rounded-lg overflow-hidden">
                <img 
                  src={ad.image_url} 
                  alt={ad.title || 'Sponsored'} 
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
            )}
            <div className="flex-1 text-center md:text-left">
              <Badge variant="secondary" className="mb-2 text-xs">
                Sponsored
              </Badge>
              {ad.title && (
                <h3 className="text-xl md:text-2xl font-bold mb-2 group-hover:text-primary transition-colors">
                  {ad.title}
                </h3>
              )}
              {ad.description && (
                <p className="text-muted-foreground mb-4 max-w-xl">
                  {ad.description}
                </p>
              )}
              {ad.cta_text && (
                <Button className="group-hover:bg-primary/90">
                  {ad.cta_text}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Inline Promo - compact card style
  if (ad.type === 'inline_promo') {
    return (
      <div className="container py-6">
        <Card 
          className="overflow-hidden cursor-pointer hover:shadow-lg transition-all border-primary/20 bg-gradient-to-r from-background to-muted/50"
          onClick={handleClick}
        >
          <CardContent className="p-0">
            <div className="flex flex-col sm:flex-row items-center gap-4 p-4">
              {ad.image_url && (
                <div className="w-full sm:w-32 h-24 rounded-md overflow-hidden shrink-0">
                  <img 
                    src={ad.image_url} 
                    alt={ad.title || 'Sponsored'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1 text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-1">
                  <Badge variant="outline" className="text-xs">
                    Sponsored
                  </Badge>
                  {ad.advertiser_name && (
                    <span className="text-xs text-muted-foreground">{ad.advertiser_name}</span>
                  )}
                </div>
                {ad.title && (
                  <h4 className="font-semibold text-lg">{ad.title}</h4>
                )}
                {ad.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">{ad.description}</p>
                )}
              </div>
              {ad.cta_text && (
                <Button variant="default" size="sm" className="shrink-0">
                  {ad.cta_text}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Banner Ad - simple banner style
  if (ad.type === 'banner') {
    return (
      <div className="container py-4">
        <div 
          className="relative w-full rounded-lg overflow-hidden cursor-pointer group"
          onClick={handleClick}
        >
          {ad.image_url ? (
            <img 
              src={ad.image_url} 
              alt={ad.title || 'Sponsored'} 
              className="w-full h-auto max-h-32 object-cover"
            />
          ) : (
            <div className="w-full h-24 bg-gradient-to-r from-primary/20 to-accent/20 flex items-center justify-center">
              <div className="text-center">
                {ad.title && <h4 className="font-semibold">{ad.title}</h4>}
                {ad.description && <p className="text-sm text-muted-foreground">{ad.description}</p>}
              </div>
            </div>
          )}
          <Badge 
            variant="secondary" 
            className="absolute top-2 right-2 text-xs opacity-70"
          >
            Ad
          </Badge>
        </div>
      </div>
    );
  }

  // Native Ad - blends with content
  if (ad.type === 'native' || ad.type === 'sponsored_card') {
    return (
      <div className="container py-6">
        <Card 
          className="overflow-hidden cursor-pointer hover:shadow-md transition-all"
          onClick={handleClick}
        >
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              {ad.image_url && (
                <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                  <img 
                    src={ad.image_url} 
                    alt={ad.title || 'Sponsored'} 
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="secondary" className="text-xs">Sponsored</Badge>
                </div>
                {ad.title && <h4 className="font-semibold">{ad.title}</h4>}
                {ad.description && (
                  <p className="text-sm text-muted-foreground mt-1">{ad.description}</p>
                )}
              </div>
              {ad.cta_text && (
                <Button variant="outline" size="sm">
                  {ad.cta_text}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // HTML Embed — DISABLED, fails closed (BF-0R-7 Phase H, P0 security).
  // Previously rendered ad.html_content via dangerouslySetInnerHTML with
  // no sanitization of any kind — a same-origin XSS surface. html_embed
  // has been removed from Admin's selectable ad types (AdminAds.tsx); this
  // branch additionally renders nothing for any existing html_embed row,
  // so a legacy row cannot render/execute here either. See AdEmbed.tsx for
  // the equivalent fix on the other ad-rendering path.
  if (ad.type === 'html_embed') {
    return null;
  }

  return null;
}
