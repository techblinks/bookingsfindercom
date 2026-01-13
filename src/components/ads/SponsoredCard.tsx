import { useEffect, useRef } from 'react';
import { ExternalLink, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { AdPlacement } from '@/hooks/useAds';

interface SponsoredCardProps {
  ad: AdPlacement;
  onImpression?: () => void;
  onClick?: () => void;
}

export function SponsoredCard({ ad, onImpression, onClick }: SponsoredCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const hasTrackedImpression = useRef(false);

  // Track impression when card becomes visible
  useEffect(() => {
    if (!cardRef.current || hasTrackedImpression.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          hasTrackedImpression.current = true;
          onImpression?.();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );

    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [onImpression]);

  const handleClick = () => {
    onClick?.();
    if (ad.destination_url) {
      window.open(ad.destination_url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <Card 
      ref={cardRef}
      className="overflow-hidden border-dashed border-muted-foreground/30 bg-muted/30"
    >
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          {/* Image */}
          {ad.image_url && (
            <div className="relative w-full sm:w-48 h-32 sm:h-auto shrink-0">
              <img
                src={ad.image_url}
                alt={ad.title || 'Sponsored'}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 p-4 flex flex-col justify-between gap-3">
            {/* Sponsor Label */}
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded">
                <BadgeCheck className="h-3 w-3" />
                Sponsored
              </span>
              {ad.advertiser_name && (
                <span className="text-xs text-muted-foreground">
                  by {ad.advertiser_name}
                </span>
              )}
            </div>
            
            {/* Title & Description */}
            <div className="space-y-1">
              {ad.title && (
                <h3 className="font-semibold text-foreground leading-tight">
                  {ad.title}
                </h3>
              )}
              {ad.description && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {ad.description}
                </p>
              )}
            </div>
            
            {/* CTA */}
            <div className="flex items-center justify-end">
              <Button
                onClick={handleClick}
                variant="outline"
                size="sm"
                className="gap-1.5"
              >
                {ad.cta_text || 'Learn More'}
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
      
      {/* nofollow sponsored link for SEO */}
      <a
        href={ad.destination_url}
        rel="nofollow sponsored noopener"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
      >
        {ad.title}
      </a>
    </Card>
  );
}
