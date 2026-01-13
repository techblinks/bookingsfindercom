import { ExternalLink, BadgeCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface AdPreviewData {
  type: string;
  title?: string;
  description?: string;
  image_url?: string;
  cta_text?: string;
  destination_url?: string;
  advertiser_name?: string;
  html_content?: string;
}

interface AdPreviewProps {
  ad: AdPreviewData;
}

export function AdPreview({ ad }: AdPreviewProps) {
  // Sponsored Card Preview
  if (ad.type === 'sponsored' || ad.type === 'sponsored_card') {
    return (
      <Card className="overflow-hidden border-dashed border-muted-foreground/30 bg-muted/30">
        <CardContent className="p-0">
          <div className="flex flex-col sm:flex-row">
            {/* Image */}
            {ad.image_url && (
              <div className="relative w-full sm:w-48 h-32 sm:h-auto shrink-0 bg-muted">
                <img
                  src={ad.image_url}
                  alt={ad.title || 'Sponsored'}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
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
                {ad.title ? (
                  <h3 className="font-semibold text-foreground leading-tight">
                    {ad.title}
                  </h3>
                ) : (
                  <div className="h-5 bg-muted rounded w-3/4" />
                )}
                {ad.description ? (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {ad.description}
                  </p>
                ) : (
                  <div className="h-4 bg-muted rounded w-full" />
                )}
              </div>
              
              {/* CTA */}
              <div className="flex items-center justify-end">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 pointer-events-none"
                >
                  {ad.cta_text || 'Learn More'}
                  <ExternalLink className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  // HTML Embed Preview
  if (ad.type === 'embed' || ad.type === 'html_embed') {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 overflow-hidden">
        {/* Disclosure Label */}
        <div className="px-3 py-1.5 bg-muted/50 border-b border-muted-foreground/20">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            <BadgeCheck className="h-3 w-3" />
            Partner Deal
          </span>
        </div>
        
        {/* Embed Preview */}
        <div className="p-4">
          {ad.html_content ? (
            <div className="text-xs font-mono bg-muted p-3 rounded max-h-32 overflow-auto text-muted-foreground">
              <pre className="whitespace-pre-wrap">{ad.html_content.slice(0, 300)}{ad.html_content.length > 300 ? '...' : ''}</pre>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground text-center py-4">
              HTML content will appear here
            </div>
          )}
        </div>
      </div>
    );
  }

  // Banner / Native Preview
  return (
    <Card className="overflow-hidden border-dashed border-muted-foreground/30 bg-muted/30">
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Image placeholder */}
          {ad.image_url ? (
            <div className="w-24 h-16 shrink-0 rounded overflow-hidden bg-muted">
              <img
                src={ad.image_url}
                alt={ad.title || 'Ad'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            </div>
          ) : (
            <div className="w-24 h-16 shrink-0 rounded bg-muted flex items-center justify-center text-muted-foreground text-xs">
              No image
            </div>
          )}
          
          {/* Content */}
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                AD
              </span>
              {ad.advertiser_name && (
                <span className="text-xs text-muted-foreground">
                  {ad.advertiser_name}
                </span>
              )}
            </div>
            {ad.title ? (
              <h4 className="font-medium text-sm">{ad.title}</h4>
            ) : (
              <div className="h-4 bg-muted rounded w-2/3" />
            )}
            {ad.description ? (
              <p className="text-xs text-muted-foreground line-clamp-1">{ad.description}</p>
            ) : (
              <div className="h-3 bg-muted rounded w-full" />
            )}
          </div>
          
          {/* CTA */}
          <Button variant="outline" size="sm" className="shrink-0 pointer-events-none text-xs">
            {ad.cta_text || 'View'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
