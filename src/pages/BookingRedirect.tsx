import { useEffect, useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, Lock, CheckCircle, Plane, Building2, ExternalLink, Clock, TrendingUp, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { validateRedirectHost } from "@/lib/travelConfig";

/**
 * White-Label Interstitial Page for BookingsFinder.com
 * 
 * UX STRATEGY (Kayak/Skyscanner Pattern):
 * 1. Branded experience - user stays within BookingsFinder ecosystem
 * 2. Trust signals - security badges, partner logos, guarantees
 * 3. Value reinforcement - remind user of savings/deal found
 * 4. Quick redirect (2.5s) - fast enough to feel seamless
 * 5. Clear CTA - "Continue to booking" not "Go to Aviasales"
 * 
 * AFFILIATE COMPLIANCE:
 * - FTC-compliant disclosure in footer
 * - Links to full disclosure page
 * - No deceptive claims about ownership
 */

const REDIRECT_DELAY_MS = 2500;
const COUNTDOWN_START = 3;

// Value propositions shown during redirect
const VALUE_PROPS = [
  { icon: TrendingUp, text: "Price comparison complete" },
  { icon: Shield, text: "Verified booking partner" },
  { icon: Clock, text: "Prices compared for you" },
];

const BookingRedirect = () => {
  const [searchParams] = useSearchParams();
  const [countdown, setCountdown] = useState(COUNTDOWN_START);
  const [progress, setProgress] = useState(0);
  const [currentProp, setCurrentProp] = useState(0);

  // Support multiple URL param formats for backwards compatibility
  const urlParam = useMemo(() => {
    return (
      searchParams.get("url") ||
      searchParams.get("redirect") ||
      searchParams.get("redirectUrl") ||
      searchParams.get("link") ||
      ""
    );
  }, [searchParams]);

  // Get optional metadata for enhanced UX
  const price = searchParams.get("price");
  const origin = searchParams.get("origin");
  const destination = searchParams.get("destination");

  /**
   * Normalize affiliate URL to absolute external URL
   * Handles: double-encoding, relative paths, protocol-relative URLs
   */
  const normalizeAffiliateUrl = (input: string): string => {
    let v = (input || "").trim();
    if (!v) return "";

    // Decode repeatedly to handle double-encoded values
    for (let i = 0; i < 3; i++) {
      if (!/%[0-9a-f]{2}/i.test(v)) break;
      try {
        const decoded = decodeURIComponent(v);
        if (decoded === v) break;
        v = decoded;
      } catch {
        break;
      }
    }

    // Handle spaces encoded as +
    v = v.replace(/\+/g, "%20");

    // Convert relative Aviasales paths to absolute URLs
    if (v.startsWith("/search")) return `https://www.aviasales.com${v}`;
    if (v.startsWith("search/")) return `https://www.aviasales.com/${v}`;
    
    // Convert relative Hotellook paths to absolute URLs
    if (v.startsWith("/hotels")) return `https://search.hotellook.com${v}`;
    if (v.startsWith("hotels")) return `https://search.hotellook.com/${v}`;
    
    // Protocol-relative URLs
    if (v.startsWith("//")) return `https:${v}`;

    // Add https if missing scheme but looks like domain
    if (!/^https?:\/\//i.test(v) && /^[\w.-]+\.[a-z]{2,}/i.test(v)) {
      return `https://${v}`;
    }

    return v;
  };

  const redirectUrl = useMemo(() => normalizeAffiliateUrl(urlParam), [urlParam]);
  
  // Validate the redirect host against approved partners
  const hostValidation = useMemo(() => {
    if (!redirectUrl) return { valid: false, hostname: null, reason: "No URL" };
    return validateRedirectHost(redirectUrl);
  }, [redirectUrl]);

  // Determine if this is a hotel or flight booking
  const isHotel = useMemo(() => {
    return redirectUrl.includes("hotellook") || redirectUrl.includes("/hotels");
  }, [redirectUrl]);

  // Cycle through value propositions
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentProp(prev => (prev + 1) % VALUE_PROPS.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  // Progress and countdown animation
  useEffect(() => {
    const totalTicks = Math.max(1, Math.round(REDIRECT_DELAY_MS / 50));

    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(100, prev + (100 / totalTicks));
      });
    }, 50);

    const countdownInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownInterval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(progressInterval);
      clearInterval(countdownInterval);
    };
  }, []);

  // Auto-redirect after delay — only if host is approved
  useEffect(() => {
    if (!hostValidation.valid) return;

    const timer = setTimeout(() => {
      try {
        const safeUrl = redirectUrl.replace(/\s/g, "%20");
        window.location.assign(safeUrl);
      } catch (err) {
        console.error("Invalid redirect URL:", err);
      }
    }, REDIRECT_DELAY_MS);

    return () => clearTimeout(timer);
  }, [redirectUrl, hostValidation.valid]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background flex flex-col">
      {/* Main Content - Centered */}
      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full text-center">
          {/* Brand Logo */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="mb-6"
          >
            <BrandLogo variant="default" className="h-12 w-auto mx-auto" />
          </motion.div>

          {/* Route Info (if available) */}
          {origin && destination && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-4"
            >
              <p className="text-sm text-muted-foreground">
                {origin} → {destination}
                {price && <span className="font-semibold text-foreground ml-2">${price}</span>}
              </p>
            </motion.div>
          )}

          {/* Host rejected error state */}
          {!hostValidation.valid && redirectUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mb-6 bg-destructive/10 border border-destructive/20 rounded-xl p-4"
            >
              <AlertTriangle className="h-8 w-8 text-destructive mx-auto mb-2" />
              <h1 className="text-lg font-semibold text-foreground mb-1">Cannot redirect</h1>
              <p className="text-sm text-muted-foreground">
                The destination host is not an approved partner.
              </p>
              {hostValidation.hostname && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  {hostValidation.hostname}
                </p>
              )}
              <a href="/" className="inline-block mt-3 text-primary hover:underline font-medium text-sm">
                Return to homepage
              </a>
            </motion.div>
          )}

          {/* Animated Loader — only when redirect is valid */}
          {hostValidation.valid && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="mb-6"
            >
              <div className="relative w-20 h-20 mx-auto">
                {/* Background ring */}
                <div className="absolute inset-0 rounded-full border-4 border-secondary" />
                {/* Progress ring */}
                <svg className="absolute inset-0 w-20 h-20 -rotate-90">
                  <circle
                    cx="40"
                    cy="40"
                    r="36"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - progress / 100)}`}
                    className="transition-all duration-100"
                  />
                </svg>
                {/* Icon */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    animate={{ y: [0, -4, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                  >
                    {isHotel ? (
                      <Building2 className="h-8 w-8 text-primary" />
                    ) : (
                      <Plane className="h-8 w-8 text-primary" />
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Status Text */}
          {hostValidation.valid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="mb-6"
            >
              <h1 className="text-xl md:text-2xl font-bold text-foreground mb-2">
                Connecting to booking partner...
              </h1>

              {/* Rotating value propositions */}
              <div className="h-6 overflow-hidden">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentProp}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    className="flex items-center justify-center gap-2 text-sm text-emerald-600 dark:text-emerald-400"
                  >
                    {(() => {
                      const Prop = VALUE_PROPS[currentProp];
                      return (
                        <>
                          <Prop.icon className="h-4 w-4" />
                          <span>{Prop.text}</span>
                        </>
                      );
                    })()}
                  </motion.div>
                </AnimatePresence>
              </div>
            </motion.div>
          )}

          {/* Progress Bar */}
          {hostValidation.valid && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="mb-6"
            >
              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
              {countdown > 0 && (
                <p className="text-xs text-muted-foreground mt-2">
                  Redirecting in {countdown}...
                </p>
              )}
            </motion.div>
          )}

          {/* Trust Badge */}
          {hostValidation.valid && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.4 }}
              className="bg-card border border-border rounded-xl p-4 mb-6"
            >
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-500" />
                  Secure partner site
                </span>
                <span className="flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-emerald-500" />
                  Verified partner
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                  Price compared
                </span>
              </div>
            </motion.div>
          )}

          {/* Manual Continue Link */}
          {hostValidation.valid && redirectUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
            >
              <a
                href={redirectUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Continue to Partner
                <ExternalLink className="h-4 w-4" />
              </a>
              <p className="text-xs text-muted-foreground mt-2">
                Not redirecting automatically? Click above.
              </p>
            </motion.div>
          )}

          {/* No URL Error State */}
          {!redirectUrl && (
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Unable to process booking link.
              </p>
              <a href="/" className="text-primary hover:underline font-medium">
                Return to search
              </a>
            </div>
          )}
        </div>
      </main>

      {/* Footer - FTC Compliant Disclosure */}
      <footer className="py-4 px-4 text-center border-t border-border bg-card/50">
        <p className="text-xs text-muted-foreground max-w-lg mx-auto">
          BookingsFinder is a travel comparison site. We may earn a commission when you book through our partners at no extra cost to you.{" "}
          <a href="/affiliate-disclosure" className="text-primary hover:underline">
            Learn more
          </a>
        </p>
      </footer>
    </div>
  );
};

export default BookingRedirect;
