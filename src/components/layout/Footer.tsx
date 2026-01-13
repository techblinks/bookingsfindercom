import { Link } from "react-router-dom";
import logo from "@/assets/logo.webp";

const Footer = () => {
  const footerLinks = {
    explore: [
      { label: "Flights", href: "/flights" },
      { label: "Hotels", href: "/hotels" },
      { label: "Deals", href: "#deals" },
      { label: "Destinations", href: "#destinations" },
    ],
    company: [
      { label: "About Us", href: "#" },
      { label: "Careers", href: "#" },
      { label: "Press", href: "#" },
      { label: "Blog", href: "#" },
    ],
    support: [
      { label: "Help Center", href: "#" },
      { label: "Contact Us", href: "#" },
      { label: "FAQs", href: "#" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "#cookies" },
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
    ],
  };

  const renderLink = (link: { label: string; href: string }) => {
    if (link.href.startsWith("/")) {
      return (
        <Link
          to={link.href}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          {link.label}
        </Link>
      );
    }
    return (
      <a
        href={link.href}
        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        {link.label}
      </a>
    );
  };

  return (
    <footer className="bg-card border-t border-border">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link to="/" className="block mb-4">
              <img src={logo} alt="BookingsFinder" className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground">
              Compare prices across hundreds of travel sites to find the best deals.
            </p>
          </div>

          {/* Explore */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Explore</h4>
            <ul className="space-y-2">
              {footerLinks.explore.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2">
              {footerLinks.company.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Support</h4>
            <ul className="space-y-2">
              {footerLinks.support.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>{renderLink(link)}</li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar with FTC-Compliant Disclosure */}
        <div className="mt-12 pt-8 border-t border-border">
          <p className="text-xs text-muted-foreground text-center mb-4 max-w-2xl mx-auto">
            BookingsFinder is a travel comparison site. When you book through links on our site, we may earn an affiliate commission at no extra cost to you. This helps us keep our service free.
          </p>
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BookingsFinder. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
              <Link to="/affiliate-disclosure" className="hover:text-foreground transition-colors">Affiliate Disclosure</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
