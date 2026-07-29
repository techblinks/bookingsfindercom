import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";

const Footer = () => {
  const footerLinks = {
    plan: [
      { label: "Trip Planner", href: "/plan" },
      { label: "Trip Cost Planner", href: "/trip-cost" },
      { label: "My Trips", href: "/trips" },
    ],
    tools: [
      { label: "Passport Validity", href: "/passport-validity" },
      { label: "Visa Requirements", href: "/visa-requirements" },
      { label: "Packing Checklist", href: "/packing-checklist" },
      { label: "Currency Converter", href: "/currency-converter" },
      { label: "Travel Insurance", href: "/travel-insurance" },
    ],
    book: [
      { label: "Flights", href: "/flights" },
    ],
    company: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Blog", href: "/blog" },
    ],
    legal: [
      { label: "Affiliate Disclosure", href: "/affiliate-disclosure" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  };

  return (
    <footer className="bg-card border-t border-border pb-24 lg:pb-0">
      <div className="container max-w-7xl mx-auto px-4 py-14">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-10">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="block mb-4">
              <BrandLogo variant="default" context="footer" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4 leading-relaxed max-w-xs">
              Plan your trip, understand the real cost, and keep every booking organised. BookingsFinder helps you travel ready.
            </p>
            <p className="text-sm text-muted-foreground">
              Based in Queensland, Australia
            </p>
          </div>

          {/* Plan */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Plan</h4>
            <ul className="space-y-2.5">
              {footerLinks.plan.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Tools */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Tools</h4>
            <ul className="space-y-2.5">
              {footerLinks.tools.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Book */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Book</h4>
            <ul className="space-y-2.5">
              {footerLinks.book.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company + Legal */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2.5 mb-6">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="text-sm font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2.5">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="bg-muted/40 rounded-xl p-4 mb-6">
            <p className="text-xs text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
              <strong className="text-foreground">Important:</strong> BookingsFinder is a travel planning and comparison platform. We do not sell flights, hotels, or travel products. We compare offers from third-party sites and connect you to booking partners. We may earn an affiliate commission at no extra cost to you.
            </p>
          </div>
          <div className="flex flex-col items-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} BookingsFinder. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
