import { Menu, X, Bell, Plane, Building2, MapPin, ChevronDown, ChevronRight, Sparkles, CreditCard, HelpCircle, MessageCircle, FileQuestion } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.webp";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { label: "Trip Optimizer", href: "/optimizer", isLink: true, icon: Sparkles },
    { label: "Flights", href: "/#flights", icon: Plane },
    { label: "Hotels", href: "/#hotels", icon: Building2 },
    { label: "My Alerts", href: "/my-alerts", isLink: true, icon: Bell },
    { label: "Destinations", href: "/#destinations", icon: MapPin },
    { label: "Pricing", href: "/pricing", isLink: true, icon: CreditCard },
  ];

  const supportItems = [
    { label: "Help Center", href: "/help", icon: HelpCircle },
    { label: "FAQs", href: "/faqs", icon: FileQuestion },
    { label: "Contact Us", href: "/contact", icon: MessageCircle },
  ];

  const close = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm safe-area-top">
        <div className="container flex h-14 lg:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <img
              src={logo}
              alt="BookingsFinder"
              className="h-8 lg:h-9 w-auto transition-transform group-hover:scale-105"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) =>
              item.isLink ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-accent/50"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-all rounded-full hover:bg-accent/50"
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </a>
              )
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-1 rounded-full">
                  Help
                  <ChevronDown className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link to="/help">Help Center</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/faqs">FAQs</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/contact">Contact Us</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="outline" size="sm" className="rounded-full" asChild>
              <Link to="/account">Sign In</Link>
            </Button>
            <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90" asChild>
              <Link to="/account">Get Started</Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden rounded-full h-10 w-10"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </header>

      {/* Full-screen Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={close}
            />

            {/* Slide-in Panel */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-[85%] max-w-sm bg-background shadow-2xl lg:hidden safe-area-top safe-area-bottom flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-border/40">
                <span className="text-base font-semibold text-foreground">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-9 w-9"
                  onClick={close}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto scroll-native py-2">
                {/* Navigation Items */}
                <div className="px-3">
                  {navItems.map((item, i) => {
                    const content = (
                      <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.04, duration: 0.2 }}
                        key={item.label}
                      >
                        {item.isLink ? (
                          <Link
                            to={item.href}
                            className="flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground rounded-xl native-press"
                            onClick={close}
                          >
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                              {item.icon && <item.icon className="h-[18px] w-[18px] text-primary" />}
                            </div>
                            <span className="flex-1">{item.label}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                          </Link>
                        ) : (
                          <a
                            href={item.href}
                            className="flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground rounded-xl native-press"
                            onClick={close}
                          >
                            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10">
                              {item.icon && <item.icon className="h-[18px] w-[18px] text-primary" />}
                            </div>
                            <span className="flex-1">{item.label}</span>
                            <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                          </a>
                        )}
                      </motion.div>
                    );
                    return content;
                  })}
                </div>

                {/* Divider */}
                <div className="mx-5 my-3 h-px bg-border/60" />

                {/* Support Section */}
                <div className="px-3">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Support
                  </p>
                  {supportItems.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (navItems.length + i) * 0.04, duration: 0.2 }}
                    >
                      <Link
                        to={item.href}
                        className="flex items-center gap-3 px-4 py-3.5 text-[15px] font-medium text-foreground rounded-xl native-press"
                        onClick={close}
                      >
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted">
                          <item.icon className="h-[18px] w-[18px] text-muted-foreground" />
                        </div>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="px-5 py-4 border-t border-border/40 space-y-2.5">
                <Button variant="outline" className="w-full h-12 rounded-xl text-[15px] font-semibold" asChild>
                  <Link to="/account" onClick={close}>Sign In</Link>
                </Button>
                <Button className="w-full h-12 rounded-xl text-[15px] font-semibold" asChild>
                  <Link to="/account" onClick={close}>Get Started</Link>
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
