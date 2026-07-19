import { Link } from "react-router-dom";
import logo from "@/assets/logo.webp";

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
    <footer className="bg-card border-t border-border pb-20 lg:pb-0">
      <div className="container py-12">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
          {/* Brand */}
          <div className="col-span-2">
            <Link to="/" className="block mb-4">
              <img src={logo} alt="BookingsFinder" className="h-10 w-auto" />
            </Link>
            <p className="text-sm text-muted-foreground mb-4">
              Plan your trip, understand the real cost, and keep every booking organised. BookingsFinder helps you travel ready.
            </p>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Headquarters</p>
              <p>13 Wildflower Street</p>
              <p>Yarrabilba, 4207</p>
              <p>Brisbane, Australia</p>
            </div>
          </div>

          {/* Plan */}
          <div>
            <h4 className="font-semibold text-foreground mb-4">Plan</h4>
            <ul className="space-y-2">
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
            <h4 className="font-semibold text-foreground mb-4">Tools</h4>
            <ul className="space-y-2">
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
            <h4 className="font-semibold text-foreground mb-4">Book</h4>
            <ul className="space-y-2">
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
            <h4 className="font-semibold text-foreground mb-4">Company</h4>
            <ul className="space-y-2 mb-6">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
            <h4 className="font-semibold text-foreground mb-4">Legal</h4>
            <ul className="space-y-2">
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

        {/* Bottom Bar with Meta-Search Disclosure */}
        <div className="mt-12 pt-8 border-t border-border">
          <div className="bg-muted/50 rounded-lg p-4 mb-6">
            <p className="text-xs text-muted-foreground text-center max-w-3xl mx-auto">
              <strong className="text-foreground">Important:</strong> BookingsFinder is a travel planning and comparison platform. We do not sell flights, hotels, or any travel products. We compare offers from third-party travel sites and connect you to our booking partners. When you book through our links, we may earn an affiliate commission at no extra cost to you.
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
