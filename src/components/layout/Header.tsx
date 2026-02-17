import { Menu, X, Plane, Building2, Bell, Sparkles, ChevronDown, ChevronRight, HelpCircle, MessageCircle, FileQuestion, Map } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import logo from "@/assets/logo.webp";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { label: "Flights", href: "/top-flight-destinations", icon: Plane },
    { label: "Hotels", href: "/top-hotel-destinations", icon: Building2 },
    { label: "Trip Optimizer", href: "/optimizer", icon: Sparkles },
    { label: "My Alerts", href: "/my-alerts", icon: Bell },
  ];

  const exploreItems = [
    { label: "Top Flight Destinations", href: "/top-flight-destinations", icon: Plane },
    { label: "Top Hotel Destinations", href: "/top-hotel-destinations", icon: Building2 },
    { label: "Flight Deals Guide", href: "/flight-deals-guide", icon: Map },
    { label: "Hotel Booking Guide", href: "/hotel-booking-guide", icon: Map },
    { label: "How It Works", href: "/how-it-works", icon: HelpCircle },
  ];

  const supportItems = [
    { label: "Help Center", href: "/help", icon: HelpCircle },
    { label: "FAQs", href: "/faqs", icon: FileQuestion },
    { label: "Contact Us", href: "/contact", icon: MessageCircle },
  ];

  const isActive = (href: string) => location.pathname === href;

  const close = () => setMobileMenuOpen(false);

  return (
    <>
      <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/50 safe-area-top">
        <div className="container flex h-14 lg:h-[60px] items-center justify-between gap-4">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 shrink-0 group" onClick={close}>
            <img
              src={logo}
              alt="BookingsFinder"
              className="h-9 lg:h-10 w-auto transition-transform duration-200 group-hover:scale-[1.03]"
            />
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map((item) => (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium rounded-full transition-all duration-150",
                  isActive(item.href)
                    ? "text-primary bg-primary/8"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent/60"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ))}

            {/* Explore Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3.5 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-full transition-all duration-150 hover:bg-accent/60 outline-none">
                  Explore
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-52">
                {exploreItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Support Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-1 px-3.5 py-2 text-[13px] font-medium text-muted-foreground hover:text-foreground rounded-full transition-all duration-150 hover:bg-accent/60 outline-none">
                  Help
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-44">
                {supportItems.map((item) => (
                  <DropdownMenuItem key={item.label} asChild>
                    <Link to={item.href} className="flex items-center gap-2 cursor-pointer">
                      <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                      {item.label}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden lg:flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="rounded-full text-[13px] h-9" asChild>
              <Link to="/account">Sign In</Link>
            </Button>
            <Button size="sm" className="rounded-full text-[13px] h-9 px-5" asChild>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm lg:hidden"
              onClick={close}
            />

            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed top-0 right-0 bottom-0 z-[70] w-[85%] max-w-sm bg-background shadow-2xl lg:hidden safe-area-top safe-area-bottom flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between px-5 h-14 border-b border-border/50">
                <Link to="/" onClick={close}>
                  <img src={logo} alt="BookingsFinder" className="h-7 w-auto" />
                </Link>
                <Button variant="ghost" size="icon" className="rounded-full h-9 w-9" onClick={close}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Scrollable Content */}
              <div className="flex-1 overflow-y-auto scroll-native py-3">
                {/* Main Navigation */}
                <div className="px-3">
                  {navItems.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.04, duration: 0.2 }}
                    >
                      <Link
                        to={item.href}
                        className={cn(
                          "flex items-center gap-3 px-4 py-3 text-[15px] font-medium rounded-xl transition-colors",
                          isActive(item.href)
                            ? "text-primary bg-primary/8"
                            : "text-foreground"
                        )}
                        onClick={close}
                      >
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-xl",
                          isActive(item.href) ? "bg-primary/15" : "bg-muted"
                        )}>
                          <item.icon className={cn("h-[18px] w-[18px]", isActive(item.href) ? "text-primary" : "text-muted-foreground")} />
                        </div>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="mx-5 my-3 h-px bg-border/60" />

                {/* Explore Section */}
                <div className="px-3">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Explore
                  </p>
                  {exploreItems.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (navItems.length + i) * 0.03, duration: 0.2 }}
                    >
                      <Link
                        to={item.href}
                        className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-foreground rounded-xl"
                        onClick={close}
                      >
                        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-muted">
                          <item.icon className="h-[18px] w-[18px] text-muted-foreground" />
                        </div>
                        <span className="flex-1">{item.label}</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                      </Link>
                    </motion.div>
                  ))}
                </div>

                <div className="mx-5 my-3 h-px bg-border/60" />

                {/* Support Section */}
                <div className="px-3">
                  <p className="px-4 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-widest">
                    Support
                  </p>
                  {supportItems.map((item, i) => (
                    <motion.div
                      key={item.label}
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: (navItems.length + exploreItems.length + i) * 0.03, duration: 0.2 }}
                    >
                      <Link
                        to={item.href}
                        className="flex items-center gap-3 px-4 py-3 text-[15px] font-medium text-foreground rounded-xl"
                        onClick={close}
                      >
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

              {/* Bottom Actions */}
              <div className="px-5 py-4 border-t border-border/50 space-y-2.5">
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