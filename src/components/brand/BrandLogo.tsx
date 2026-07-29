/**
 * BrandLogo — Phase 7D central logo component.
 *
 * Single reusable component replacing all direct logo imports.
 * Reads from BrandingProvider, falls back to built-in assets.
 *
 * Usage:
 *   <BrandLogo variant="default" className="h-9 w-auto" />
 *   <BrandLogo variant="icon" className="h-8 w-8" />
 *   <BrandLogo variant="light" className="h-10 w-auto" />
 */

import { useState, useCallback } from 'react';
import { useBranding } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';
import type { LogoVariant } from '@/types/branding';

// Built-in fallback assets (bundled at build time)
import fallbackLogo from '@/assets/logo.webp';

interface BrandLogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  /** Which logo variant to display. */
  variant?: LogoVariant;
  /** Additional CSS classes (e.g. sizing). */
  className?: string;
  /** Override alt text (defaults to site_name). */
  alt?: string;
}

const FALLBACK_MAP: Record<LogoVariant, string> = {
  default: fallbackLogo,
  light: fallbackLogo,
  dark: fallbackLogo,
  icon: fallbackLogo,
};

export function BrandLogo({
  variant = 'default',
  className,
  alt,
  ...rest
}: BrandLogoProps) {
  const { branding, getLogoUrl } = useBranding();
  const [imgError, setImgError] = useState(false);

  // Determine source URL
  const brandingUrl = getLogoUrl(variant);
  const fallback = FALLBACK_MAP[variant];
  const src = imgError ? fallback : brandingUrl;

  const handleError = useCallback(() => {
    if (!imgError) {
      setImgError(true);
    }
  }, [imgError]);

  // Reset error state if brandingUrl changes
  if (imgError && brandingUrl === src) {
    // This would mean the fallback also errored, but we guard against loops.
  }

  const altText = alt || branding.site_name || 'BookingsFinder';

  return (
    <img
      src={src}
      alt={altText}
      className={cn('object-contain', className)}
      onError={handleError}
      loading="eager"
      {...rest}
      // Prevent layout shift with fixed dimensions via className
    />
  );
}
