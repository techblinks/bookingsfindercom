import { Link } from "react-router-dom";
import { BrandLogo } from "@/components/brand/BrandLogo";
import MobileFooter from "./MobileFooter";
import { FOOTER_DISCLOSURE, FOOTER_LINKS } from "./footerLinks";

const Footer = () => {
  const footerLinks = FOOTER_LINKS;

  return (
    <footer className="bg-card border-t border-border">
      {/* Mobile / tablet: collapsed footer (matches the lg:hidden bottom nav) */}
      <div className="lg:hidden">
        <MobileFooter />
      </div>

      {/* Desktop: unchanged grid footer */}
      <div className="hidden lg:block container max-w-7xl mx-auto px-4 py-14">
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

          {/* Search & Compare */}
          <div>
            <h4 className="text-sm font-semibold text-foreground mb-4">Search &amp; Compare</h4>
            <ul className="space-y-2.5">
              {footerLinks.compare.map((link) => (
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
              <strong className="text-foreground">Important:</strong> {FOOTER_DISCLOSURE}
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
