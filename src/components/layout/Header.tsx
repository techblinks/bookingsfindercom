import { Menu, X, Bell, Plane, Building2, MapPin, ChevronDown, Sparkles, CreditCard, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Link } from "react-router-dom";
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

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/40 shadow-sm">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <img 
            src={logo} 
            alt="BookingsFinder" 
            className="h-9 w-auto transition-transform group-hover:scale-105" 
          />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map((item) => (
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
          ))}
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
          <Button variant="outline" size="sm" className="rounded-full">
            Sign In
          </Button>
          <Button size="sm" className="rounded-full bg-primary hover:bg-primary/90">
            Get Started
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden rounded-full"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-border/40 bg-background/98 backdrop-blur-md animate-in slide-in-from-top-2 duration-200">
          <nav className="container py-4 flex flex-col gap-1">
            {navItems.map((item) => (
              item.isLink ? (
                <Link
                  key={item.label}
                  to={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-accent/50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-accent/50"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.icon && <item.icon className="h-4 w-4" />}
                  {item.label}
                </a>
              )
            ))}
            
            {/* Mobile Help Links */}
            <div className="mt-2 pt-2 border-t border-border/40">
              <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Support</p>
              <Link
                to="/help"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-accent/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Help Center
              </Link>
              <Link
                to="/faqs"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-accent/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                FAQs
              </Link>
              <Link
                to="/contact"
                className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-xl hover:bg-accent/50"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
            </div>
            
            <div className="flex flex-col gap-2 mt-4 pt-4 border-t border-border/40 px-2">
              <Button variant="outline" className="w-full rounded-full">
                Sign In
              </Button>
              <Button className="w-full rounded-full">
                Get Started
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};

export default Header;
