/**
 * BrandPreviewPanel — preview tabs showing how branding looks on the site.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BrandLogo } from '@/components/brand/BrandLogo';
import { isValidHexColor } from '@/types/branding';

interface BrandPreviewPanelProps {
  siteName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  faviconUrl: string | null;
}

export function BrandPreviewPanel({
  siteName,
  primaryColor,
  secondaryColor,
  accentColor,
  faviconUrl,
}: BrandPreviewPanelProps) {
  const pValid = isValidHexColor(primaryColor);
  const sValid = isValidHexColor(secondaryColor);
  const aValid = isValidHexColor(accentColor);

  return (
    <div className="space-y-6 mt-6">
      {/* Desktop Header Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Desktop Header Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-xl p-4 bg-card">
            <div className="flex items-center gap-4">
              <BrandLogo variant="default" context="desktop" />
              <div className="flex gap-2">
                <div className="h-8 w-20 rounded-full bg-muted" />
                <div className="h-8 w-20 rounded-full bg-muted" />
                <div className="h-8 w-20 rounded-full bg-muted" />
              </div>
              <div className="ml-auto">
                <div
                  className="h-9 w-28 rounded-full"
                  style={{ backgroundColor: pValid ? primaryColor : '#ccc' }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Mobile Header Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Mobile Header Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border border-border rounded-xl p-3 bg-card max-w-sm">
            <div className="flex items-center justify-between">
              <BrandLogo variant="default" context="mobile" />
              <div className="w-8 h-8 rounded-lg bg-muted" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Favicon Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Favicon Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="p-3 border rounded-lg bg-muted/50 inline-flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-card border rounded-md shadow-sm">
                {faviconUrl ? (
                  <img
                    src={faviconUrl}
                    alt="Favicon"
                    className="h-4 w-4"
                  />
                ) : (
                  <BrandLogo variant="icon" className="h-4 w-4" />
                )}
                <span className="text-xs text-muted-foreground">
                  {siteName || 'BookingsFinder'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Colour Swatches */}
      <Card>
        <CardHeader>
          <CardTitle>Colour Swatches</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <ColorSwatch color={primaryColor} label="Primary" />
            <ColorSwatch color={secondaryColor} label="Secondary" />
            <ColorSwatch color={accentColor} label="Accent" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ColorSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="text-center">
      <div
        className="w-20 h-20 rounded-xl shadow-sm border mb-2"
        style={{ backgroundColor: isValidHexColor(color) ? color : '#ccc' }}
      />
      <span className="text-xs font-mono">{color}</span>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}
