import { useEffect, useRef, useState, useCallback } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";

/**
 * Trip.com Hotel Search Widget — iframe host.
 *
 * Accepts a `variant` prop: "desktop" or "mobile".
 * Desktop is used inline on the /hotels landing page.
 * Mobile is mounted only inside a full-screen dialog.
 */

const GRACE_MS = 500;
const MIN_H = 180;
const MAX_H = 2000;

type Variant = "desktop" | "mobile";

const DESKTOP_CFG = {
  src: "/tripcom-hotel-widget-desktop.html",
  title: "Trip.com desktop accommodation search",
  iframeW: 0,
  fallbackH: 200,
};
const MOBILE_CFG = {
  src: "/tripcom-hotel-widget-mobile.html",
  title: "Trip.com mobile accommodation search",
  iframeW: 320,
  fallbackH: 480,
};

type WidgetState = "loading" | "ready" | "error";

export default function TripComHotelWidget({
  variant,
  className = "",
}: {
  variant: Variant;
  className?: string;
}) {
  const cfg = variant === "desktop" ? DESKTOP_CFG : MOBILE_CFG;
  const [state, setState] = useState<WidgetState>("loading");
  const [iframeH, setIframeH] = useState(cfg.fallbackH);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const retryCount = useRef(0);
  const MAX_RETRY = 1;
  const graceTimer = useRef<ReturnType<typeof setTimeout>>();
  const keyRef = useRef(0);

  // ── postMessage listener ───────────────────────────────────────

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (!event.data) return;
      if (
        iframeRef.current?.contentWindow &&
        event.source !== iframeRef.current.contentWindow
      )
        return;
      if (
        event.data.type === "tripcom-widget-height" &&
        event.data.variant === variant
      ) {
        const h = Number(event.data.height);
        if (Number.isFinite(h) && h >= MIN_H && h <= MAX_H) setIframeH(h);
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [variant]);

  useEffect(() => {
    return () => {
      if (graceTimer.current) clearTimeout(graceTimer.current);
    };
  }, []);

  const handleRetry = useCallback(() => {
    if (retryCount.current >= MAX_RETRY) return;
    retryCount.current += 1;
    setState("loading");
    setIframeH(cfg.fallbackH);
    keyRef.current += 1;
    if (graceTimer.current) clearTimeout(graceTimer.current);
  }, [cfg.fallbackH]);

  const handleIframeLoad = useCallback(() => {
    graceTimer.current = setTimeout(() => setState("ready"), GRACE_MS);
  }, []);

  const handleIframeError = useCallback(() => {
    if (graceTimer.current) clearTimeout(graceTimer.current);
    setState("error");
  }, []);

  const isLoading = state === "loading";
  const isError = state === "error";

  return (
    <div className={`relative w-full flex justify-center ${className}`}>
      <div
        className="relative"
        style={{ width: cfg.iframeW > 0 ? `min(${cfg.iframeW}px, 100%)` : "100%", minHeight: iframeH }}
      >
        <iframe
          key={keyRef.current}
          ref={iframeRef}
          src={cfg.src}
          title={cfg.title}
          onLoad={handleIframeLoad}
          onError={handleIframeError}
          style={{ width: "100%", height: iframeH, border: 0, display: "block" }}
          aria-label={cfg.title}
        />
        {isLoading && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center bg-background/90 rounded-xl"
            role="status"
            aria-label="Loading accommodation search tool"
          >
            <Loader2 className="h-8 w-8 text-primary animate-spin mb-3" aria-hidden="true" />
            <p className="text-sm text-muted-foreground">Loading accommodation search…</p>
          </div>
        )}
        {isError && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center text-center bg-background/95 rounded-xl"
            role="alert"
          >
            <div className="mx-auto w-14 h-14 rounded-full bg-amber-500/10 flex items-center justify-center mb-3">
              <AlertTriangle className="h-7 w-7 text-amber-500" aria-hidden="true" />
            </div>
            <p className="text-sm text-muted-foreground mb-3 max-w-sm">
              The accommodation search tool could not be loaded. Please try again.
            </p>
            {retryCount.current < MAX_RETRY && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <RefreshCw className="h-4 w-4" /> Retry
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
