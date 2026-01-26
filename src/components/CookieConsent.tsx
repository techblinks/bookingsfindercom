import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X, Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "react-router-dom";

const CONSENT_KEY = "bf_cookie_consent";
const CONSENT_VERSION = "1.0";

interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  advertising: boolean;
  version: string;
  timestamp: string;
}

const defaultPreferences: ConsentPreferences = {
  necessary: true, // Always required
  analytics: false,
  advertising: false,
  version: CONSENT_VERSION,
  timestamp: "",
};

export const CookieConsent = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [preferences, setPreferences] = useState<ConsentPreferences>(defaultPreferences);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored) as ConsentPreferences;
        // Check if consent version matches
        if (parsed.version === CONSENT_VERSION) {
          setPreferences(parsed);
          return;
        }
      } catch {
        // Invalid stored data, show banner
      }
    }
    // Show banner after a short delay for better UX
    const timer = setTimeout(() => setShowBanner(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const saveConsent = (prefs: ConsentPreferences) => {
    const toSave = {
      ...prefs,
      version: CONSENT_VERSION,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(CONSENT_KEY, JSON.stringify(toSave));
    setPreferences(toSave);
    setShowBanner(false);
    setShowSettings(false);
  };

  const handleAcceptAll = () => {
    saveConsent({
      ...preferences,
      analytics: true,
      advertising: true,
    });
  };

  const handleRejectAll = () => {
    saveConsent({
      ...preferences,
      analytics: false,
      advertising: false,
    });
  };

  const handleSavePreferences = () => {
    saveConsent(preferences);
  };

  return (
    <>
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6"
          >
            <div className="mx-auto max-w-4xl rounded-2xl border border-border bg-card shadow-2xl">
              <div className="p-4 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="hidden md:flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
                    <Cookie className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-foreground">
                          We Value Your Privacy
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                          We use cookies to enhance your browsing experience, serve personalized ads or content, 
                          and analyze our traffic. By clicking "Accept All", you consent to our use of cookies. 
                          Read our{" "}
                          <Link to="/cookies" className="text-primary hover:underline">
                            Cookie Policy
                          </Link>{" "}
                          and{" "}
                          <Link to="/privacy" className="text-primary hover:underline">
                            Privacy Policy
                          </Link>{" "}
                          for more information.
                        </p>
                      </div>
                      <button
                        onClick={handleRejectAll}
                        className="shrink-0 rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        aria-label="Close cookie banner"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <Button
                        onClick={handleAcceptAll}
                        className="flex-1 sm:flex-none"
                        size="lg"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Accept All
                      </Button>
                      <Button
                        onClick={handleRejectAll}
                        variant="outline"
                        className="flex-1 sm:flex-none"
                        size="lg"
                      >
                        Reject All
                      </Button>
                      <Button
                        onClick={() => setShowSettings(true)}
                        variant="ghost"
                        className="flex-1 sm:flex-none"
                        size="lg"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Manage Preferences
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cookie Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Cookie Preferences
            </DialogTitle>
            <DialogDescription>
              Manage your cookie preferences below. You can enable or disable different types of cookies.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Necessary Cookies */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="necessary" className="text-base font-medium cursor-pointer">
                  Strictly Necessary Cookies
                </Label>
                <Checkbox
                  id="necessary"
                  checked={true}
                  disabled
                  className="opacity-50"
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies are essential for the website to function properly. They enable core functionality 
                such as security, network management, and accessibility. You cannot disable these cookies.
              </p>
            </div>

            {/* Analytics Cookies */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="analytics" className="text-base font-medium cursor-pointer">
                  Analytics Cookies
                </Label>
                <Checkbox
                  id="analytics"
                  checked={preferences.analytics}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, analytics: checked as boolean })
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies help us understand how visitors interact with our website by collecting and 
                reporting information anonymously. This helps us improve our website and services.
              </p>
            </div>

            {/* Advertising Cookies */}
            <div className="space-y-3 rounded-lg border border-border p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="advertising" className="text-base font-medium cursor-pointer">
                  Advertising Cookies
                </Label>
                <Checkbox
                  id="advertising"
                  checked={preferences.advertising}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, advertising: checked as boolean })
                  }
                />
              </div>
              <p className="text-sm text-muted-foreground">
                These cookies are used to deliver advertisements that are relevant to you. They also help 
                limit the number of times you see an ad and measure the effectiveness of advertising campaigns. 
                We partner with Google AdSense to display relevant ads.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button onClick={handleRejectAll} variant="outline" className="w-full sm:w-auto">
              Reject All
            </Button>
            <Button onClick={handleAcceptAll} variant="outline" className="w-full sm:w-auto">
              Accept All
            </Button>
            <Button onClick={handleSavePreferences} className="w-full sm:w-auto">
              Save Preferences
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

// Hook to check consent status
export const useCookieConsent = () => {
  const [consent, setConsent] = useState<ConsentPreferences | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(CONSENT_KEY);
    if (stored) {
      try {
        setConsent(JSON.parse(stored));
      } catch {
        setConsent(null);
      }
    }
  }, []);

  return {
    hasConsent: consent !== null,
    analytics: consent?.analytics ?? false,
    advertising: consent?.advertising ?? false,
    consent,
  };
};

export default CookieConsent;
