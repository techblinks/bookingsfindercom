import { Menu, X, Plane, Building2, Map, Wrench, HelpCircle, MessageCircle, FileQuestion, ChevronRight, Ticket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useEffect, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { cn } from "@/lib/utils";
import { logInternalNavigation } from "@/lib/analytics";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  const navItems = [
    { label: "Flights", href: "/flights", icon: Plane },
    { label: "Stays", href: "/hotels", icon: Building2 },
    { label: "Things to Do", href: "/things-to-do", icon: Ticket },
    { label: "Trip Cost", href: "/trip-cost", icon: Map },
    { label: "Optimizer", href: "/optimizer", icon: Wrench },
  ];

  const isActive = (href: string) => location.pathname === href;
  const close = useCallback(() => setMobileMenuOpen(false), []);

  // Escape key closes mobile menu
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [mobileMenuOpen, close]);

  // Track internal navigation clicks safely (non-blocking)
  const trackNav = (label: string, href: string) => {
    try { logInternalNavigation({ label, source: "header", href }); } catch (_) {}
  };

  return (
    <>
      {/* Skip to main content — visible on focus for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[100] focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-lg focus:text-sm focus:font-semibold focus:shadow-lg"
      >
        Skip to main content
      </a>

      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container max-w-7xl mx-auto flex h-16 lg:h-[68px] items-center justify-between gap-4 px-4">
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" onClick={close} aria-label="BookingsFinder - Go to homepage">
            <div className="h-14 w-auto transition-transform duration-200 group-hover:scale-[1.03] drop-shadow-sm">
              <BrandLogo variant="default" context="desktop" />
            </div>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1 justify-center" aria-label="Main navigation">
            {navItems.map((item) => (
              <Link key={item.label} to={item.href} aria-label={item.label}
                aria-current={isActive(item.href) ? "page" : undefined}
                onClick={() => trackNav(item.label, item.href)}
                className={cn("flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-full transition-all duration-150",
                  isActive(item.href) ? "text-primary bg-primary/10" : "text-foreground/70 hover:text-foreground hover:bg-muted")}>
                <item.icon className="h-4 w-4" aria-hidden="true" />{item.label}
              </Link>
            ))}
            <Link to="/help" className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-foreground/70 hover:text-foreground rounded-full transition-all duration-150 hover:bg-muted">
              <HelpCircle className="h-4 w-4" aria-hidden="true" />Help
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="rounded-full text-sm h-9" asChild>
              <Link to="/account">Sign In</Link>
            </Button>
            <Button variant="conversion" size="sm" className="rounded-full text-sm h-10 px-6" asChild>
              <Link to="/trip-cost">Plan a Trip</Link>
            </Button>
          </div>

          <Button variant="ghost" size="icon" className="lg:hidden rounded-full h-10 w-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden" onClick={close} />
            <motion.div
              initial={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
              animate={prefersReducedMotion ? { opacity: 1 } : { x: 0 }}
              exit={prefersReducedMotion ? { opacity: 0 } : { x: "100%" }}
              transition={prefersReducedMotion ? { duration: 0 } : { type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-[85%] max-w-sm bg-background shadow-2xl lg:hidden safe-area-top safe-area-bottom flex flex-col"
              role="dialog" aria-label="Mobile navigation" aria-modal="true">
              <div className="flex items-center justify-between px-5 h-14 border-b border-border/50">
                <Link to="/" onClick={close}><BrandLogo variant="default" context="mobile" /></Link>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={close} aria-label="Close menu"><X className="h-5 w-5" /></Button>
              </div>
              <div className="flex-1 overflow-y-auto scroll-native py-3">
                <div className="px-3">
                  {navItems.map((item, i) => (
                    <motion.div key={item.label}
                      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
                      animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                      transition={prefersReducedMotion ? { duration: 0 } : { delay: i * 0.04, duration: 0.2 }}>
                      <Link to={item.href}
                        className={cn("flex items-center gap-3 px-4 py-3 text-[15px] font-medium rounded-xl transition-colors",
                          isActive(item.href) ? "text-primary bg-primary/8" : "text-foreground")}
                        onClick={() => { close(); trackNav(item.label, item.href); }}>
                        <div className={cn("flex items-center justify-center w-9 h-9 rounded-xl",
                          isActive(item.href) ? "bg-primary/15" : "bg-muted")}>
                          <item.icon className={cn("h-[18px] w-[18px]", isActive(item.href) ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
                <div className="mx-5 my-3 h-px bg-border/60" />
                <div className="px-3">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">Help</p>
                  {[ { label: "Help Center", href: "/help", icon: HelpCircle },
                     { label: "FAQs", href: "/faqs", icon: FileQuestion },
                     { label: "Contact Us", href: "/contact", icon: MessageCircle } ]
                    .map((item, i) => (
                      <motion.div key={item.label}
                        initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, x: 16 }}
                        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, x: 0 }}
                        transition={prefersReducedMotion ? { duration: 0 } : { delay: (navItems.length + i) * 0.03, duration: 0.2 }}>
                        <Link to={item.href} className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-foreground rounded-xl" onClick={close}>
                          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted">
                            <item.icon className="h-[18px] w-[18px] text-muted-foreground" />
                          </div>
                          <span className="flex-1">{item.label}</span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                        </Link>
                      </motion.div>
                    ))}
                </div>
              </div>
              <div className="px-5 py-4 border-t border-border/50 space-y-2.5">
                <Button variant="outline" className="w-full h-12 rounded-xl text-[15px] font-semibold" asChild>
                  <Link to="/account" onClick={close}>Sign In</Link>
                </Button>
                <Button variant="conversion" className="w-full h-12 rounded-xl text-[15px] font-semibold" asChild>
                  <Link to="/trip-cost" onClick={close}>Plan a Trip</Link>
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default Header;
