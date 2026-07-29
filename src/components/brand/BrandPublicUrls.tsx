/**
 * BrandPublicUrls — Travelpayouts integration notice with copyable URLs.
 */

import { Info, Copy, FileImage, Image, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface BrandPublicUrlsProps {
  logoUrl: string | null;
  iconUrl: string | null;
  faviconUrl: string | null;
  onCopyUrl: (url: string, label: string) => void;
}

export function BrandPublicUrls({
  logoUrl,
  iconUrl,
  faviconUrl,
  onCopyUrl,
}: BrandPublicUrlsProps) {
  const hasUrls = logoUrl || iconUrl || faviconUrl;

  return (
    <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900">
      <CardContent className="pt-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
              <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div>
            <h4 className="font-medium text-blue-900 dark:text-blue-100">
              Travelpayouts White Label
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
              Travelpayouts White Label branding must still be updated manually.
              The branding on this page does not automatically sync to Travelpayouts.
            </p>
            {hasUrls && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-blue-800 dark:text-blue-200">
                  Copyable public URLs:
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                  {logoUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => onCopyUrl(logoUrl, 'Main Logo')}
                    >
                      <FileImage className="h-3 w-3" />
                      Main Logo
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {iconUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => onCopyUrl(iconUrl, 'Icon')}
                    >
                      <Image className="h-3 w-3" />
                      Icon
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                  {faviconUrl && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => onCopyUrl(faviconUrl, 'Favicon')}
                    >
                      <Globe className="h-3 w-3" />
                      Favicon
                      <Copy className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
