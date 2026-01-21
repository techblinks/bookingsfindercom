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
      { label: "About Us", href: "/about" },
      { label: "Careers", href: "/careers" },
      { label: "Press", href: "/press" },
      { label: "Blog", href: "/blog" },
    ],
    support: [
      { label: "Help Center", href: "/help" },
      { label: "Contact Us", href: "/contact" },
      { label: "FAQs", href: "/faqs" },
      { label: "Why We Don't Sell Tickets", href: "/why-we-dont-sell-tickets" },
    ],
    legal: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
      { label: "Cookie Policy", href: "/cookies" },
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
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="block mb-4">
              <img src={logo} alt="BookingsFinder" className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Compare prices across hundreds of travel sites to find the best deals.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Headquarters</p>
              <p>13 Wildflower Street</p>
              <p>Yarrabilba, 4207</p>
              <p>Brisbane, Australia</p>
            </div>
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

        {/* Bottom Bar with Meta-Search Disclosure */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
              <strong className="text-foreground">Important:</strong> BookingsFinder is a travel meta-search platform. We do not sell flights, hotels, or any travel products. We compare prices from third-party travel sites and redirect you to complete your booking directly with our partners. When you book through our links, we may earn an affiliate commission at no extra cost to you.
            </p>
          </div>
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
