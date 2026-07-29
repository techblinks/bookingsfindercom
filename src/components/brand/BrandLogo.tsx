/**
 * BrandLogo — Phase 7D central logo component.
 *
 * Single reusable component replacing all direct logo imports.
 * Reads from BrandingProvider, falls back to built-in assets.
 *
 * Usage:
 *   <!-- Auto-sized from branding settings -->
 *   <BrandLogo variant="default" context="desktop" />
 *   <BrandLogo variant="default" context="mobile" />
 *   <BrandLogo variant="default" context="footer" />
 *
 *   <!-- Manual sizing (overrides context) -->
 *   <BrandLogo variant="icon" className="h-8 w-8" />
 *   <BrandLogo variant="default" className="h-16 md:h-20 w-auto" />
 */

import { useState, useCallback, useMemo } from 'react';
import { useBranding } from '@/hooks/useBranding';
import { cn } from '@/lib/utils';
import { DEFAULT_BRANDING, type LogoVariant, type LogoContext } from '@/types/branding';

// Built-in fallback assets (bundled at build time)
import fallbackLogo from '@/assets/logo.webp';

interface BrandLogoProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  /** Which logo variant to display. */
  variant?: LogoVariant;
  /** Which UI context — auto-sizes from branding settings. */
  context?: LogoContext;
  /** Additional CSS classes. If context is set, height is automatic; manual className adds extra classes. */
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

/** Safe logo height lookup — falls back to DEFAULT_BRANDING if DB hasn't been updated. */
function getContextHeight(
  context: LogoContext | undefined,
  desktop: unknown,
  mobile: unknown,
  footer: unknown,
): number | undefined {
  if (!context) return undefined;

  let value: unknown;
  let fallback: number;

  switch (context) {
    case 'desktop':
      value = desktop;
      fallback = DEFAULT_BRANDING.logo_height_desktop;
      break;
    case 'mobile':
      value = mobile;
      fallback = DEFAULT_BRANDING.logo_height_mobile;
      break;
    case 'footer':
      value = footer;
      fallback = DEFAULT_BRANDING.logo_height_footer;
      break;
  }

  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  // DB column not yet applied — use default
  return fallback;
}

export function BrandLogo({
  variant = 'default',
  context,
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

  const altText = alt || branding.site_name || 'BookingsFinder';

  // ── Compute height from branding context ────────────────────
  const contextHeight = useMemo(() => {
    return getContextHeight(
      context,
      branding.logo_height_desktop,
      branding.logo_height_mobile,
      branding.logo_height_footer,
    );
  }, [context, branding.logo_height_desktop, branding.logo_height_mobile, branding.logo_height_footer]);

  // Combine classes: if context is set, use its height via inline style
  const style = contextHeight
    ? { height: `${contextHeight}px`, width: 'auto', ...rest.style }
    : rest.style;

  const finalClassName = cn(
    'object-contain',
    className,
    // Bare-minimum fallback only if no context AND no className was provided
    !context && !className && 'h-9 w-auto',
  );

  return (
    <img
      src={src}
      alt={altText}
      className={finalClassName}
      style={style}
      onError={handleError}
      loading="eager"
      {...rest}
    />
  );
}
