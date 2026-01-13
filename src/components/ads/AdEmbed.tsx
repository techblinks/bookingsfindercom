import { useEffect, useRef } from 'react';
import { BadgeCheck } from 'lucide-react';
import { AdPlacement } from '@/hooks/useAds';

interface AdEmbedProps {
  ad: AdPlacement;
  onImpression?: () => void;
}

export function AdEmbed({ ad, onImpression }: AdEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const hasTrackedImpression = useRef(false);
  const hasRendered = useRef(false);

  // Track impression when visible
  useEffect(() => {
    if (!containerRef.current || hasTrackedImpression.current) return;

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

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [onImpression]);

  // Render HTML content safely (only for trusted admin-uploaded content)
  useEffect(() => {
    if (!containerRef.current || !ad.html_content || hasRendered.current) return;
    
    hasRendered.current = true;
    const embedContainer = containerRef.current.querySelector('.ad-embed-content');
    if (embedContainer) {
      embedContainer.innerHTML = ad.html_content;
      
      // Execute any scripts in the content
      const scripts = embedContainer.querySelectorAll('script');
      scripts.forEach((script) => {
        const newScript = document.createElement('script');
        Array.from(script.attributes).forEach((attr) => {
          newScript.setAttribute(attr.name, attr.value);
        });
        newScript.textContent = script.textContent;
        script.parentNode?.replaceChild(newScript, script);
      });
    }
  }, [ad.html_content]);

  if (!ad.html_content) return null;

  return (
    <div 
      ref={containerRef}
      className="rounded-lg border border-dashed border-muted-foreground/30 bg-muted/30 overflow-hidden"
    >
      {/* Disclosure Label */}
      <div className="px-3 py-1.5 bg-muted/50 border-b border-muted-foreground/20">
        <span className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
          <BadgeCheck className="h-3 w-3" />
          Partner Deal
        </span>
      </div>
      
      {/* Embed Container */}
      <div className="ad-embed-content p-4" />
    </div>
  );
}
