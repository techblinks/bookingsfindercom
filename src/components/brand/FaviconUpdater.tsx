/**
 * FaviconUpdater — Phase 7D dynamic favicon.
 *
 * Client-side only. Reads branding.favicon_url from BrandingProvider
 * and updates <link rel="icon"> in <head>. Preserves the static
 * fallback favicon defined in index.html if no custom favicon is set.
 *
 * Must be rendered inside <BrandingProvider>.
 */

import { useEffect } from 'react';
import { useBranding } from '@/hooks/useBranding';

export function FaviconUpdater() {
  const { branding } = useBranding();

  useEffect(() => {
    if (!branding.favicon_url) return;

    // Find existing favicon link(s)
    const existingLinks = document.querySelectorAll<HTMLLinkElement>(
      'link[rel="icon"], link[rel="shortcut icon"]',
    );

    if (existingLinks.length > 0) {
      // Update the first favicon link; remove duplicates
      let first = true;
      existingLinks.forEach((link) => {
        if (first) {
          link.href = branding.favicon_url!;
          first = false;
        } else {
          link.remove();
        }
      });
    } else {
      // No favicon tag exists — create one
      const link = document.createElement('link');
      link.rel = 'icon';
      link.type = 'image/png';
      link.href = branding.favicon_url;
      document.head.appendChild(link);
    }
  }, [branding.favicon_url]);

  // This component renders nothing visually
  return null;
}
