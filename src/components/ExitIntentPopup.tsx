import { useState, useEffect, useCallback } from "react";
import { X, Bell, TrendingDown, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const POPUP_DISMISSED_KEY = "bf_exit_popup_dismissed";
const POPUP_COOLDOWN_HOURS = 24;

const ExitIntentPopup = () => {
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const shouldShow = useCallback(() => {
    const dismissed = localStorage.getItem(POPUP_DISMISSED_KEY);
    if (dismissed) {
      const dismissedAt = new Date(dismissed).getTime();
      if (Date.now() - dismissedAt < POPUP_COOLDOWN_HOURS * 60 * 60 * 1000) {
        return false;
      }
    }
    return true;
  }, []);

  useEffect(() => {
    if (!shouldShow()) return;

    let triggered = false;

    // Desktop: mouse leaving viewport
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !triggered) {
        triggered = true;
        setShow(true);
      }
    };

    // Mobile: scroll up quickly (back-to-top gesture) after scrolling down
    let lastScrollY = 0;
    let scrolledDown = false;
    const handleScroll = () => {
      const currentY = window.scrollY;
      if (currentY > 500) scrolledDown = true;
      if (scrolledDown && currentY < lastScrollY - 200 && !triggered) {
        triggered = true;
        setShow(true);
      }
      lastScrollY = currentY;
    };

    // Delay adding listeners so it doesn't fire immediately
    const timer = setTimeout(() => {
      document.addEventListener("mouseleave", handleMouseLeave);
      window.addEventListener("scroll", handleScroll, { passive: true });
    }, 15000); // Wait 15 seconds before enabling

    return () => {
      clearTimeout(timer);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("scroll", handleScroll);
    };
  }, [shouldShow]);

  const dismiss = () => {
    setShow(false);
    localStorage.setItem(POPUP_DISMISSED_KEY, new Date().toISOString());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsSubmitting(true);
    try {
      // BF-0R-5 round 3: subscribers has no raw client INSERT/SELECT grant
      // any more — subscribe_email() is the only client-reachable write
      // path (it upserts and never raises a unique-violation, closing the
      // email-existence oracle the old error-code check relied on).
      const { error } = await supabase.rpc("subscribe_email", {
        p_email: email.trim(),
        p_source: "exit_popup",
      });

      if (error) throw error;
      toast.success("You're in! We'll alert you when prices drop.");
      dismiss();
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={dismiss}
          />

          {/* Popup */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 md:inset-auto md:left-1/2 md:top-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-card border border-border rounded-2xl shadow-2xl z-[101] overflow-hidden"
          >
            {/* Header gradient */}
            <div className="bg-gradient-to-r from-primary to-primary/80 p-6 text-primary-foreground relative">
              <button
                onClick={dismiss}
                className="absolute top-3 right-3 p-1 rounded-full hover:bg-primary-foreground/20 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-primary-foreground/20">
                  <TrendingDown className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold">Wait! Don't Miss a Deal</h3>
                </div>
              </div>
              <p className="text-sm text-primary-foreground/80">
                Prices change every hour. Get notified when flights to your destination drop in price.
              </p>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Bell className="h-4 w-4 text-primary shrink-0" />
                  <span>Free price drop alerts — no spam, just savings</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full px-4 py-3 rounded-xl bg-muted border border-border text-foreground placeholder:text-muted-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full gap-2"
                  size="lg"
                >
                  <Sparkles className="h-4 w-4" />
                  {isSubmitting ? "Subscribing..." : "Get Price Alerts"}
                </Button>
              </form>

              <p className="text-[11px] text-muted-foreground text-center mt-3">
                Unsubscribe anytime. We never share your email.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ExitIntentPopup;
