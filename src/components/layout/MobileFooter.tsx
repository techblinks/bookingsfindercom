import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { FOOTER_DISCLOSURE, FOOTER_LINKS, type FooterLink } from "./footerLinks";

/**
 * Mobile V2 footer — collapsed by default.
 *
 * Every route from the desktop footer is still reachable; the navigation
 * groups are collapsed so the footer costs roughly one viewport instead of
 * three. Legal links and the single disclosure paragraph stay expanded.
 */

const GROUPS: { id: string; title: string; links: FooterLink[] }[] = [
  { id: "plan", title: "Plan", links: FOOTER_LINKS.plan },
  { id: "compare", title: "Search & Compare", links: FOOTER_LINKS.compare },
  { id: "tools", title: "Tools", links: FOOTER_LINKS.tools },
  { id: "company", title: "Company", links: FOOTER_LINKS.company },
];

function FooterGroup({ id, title, links }: { id: string; title: string; links: FooterLink[] }) {
  const [open, setOpen] = useState(false);
  const panelId = `footer-group-${id}`;

  return (
    <div className="border-b border-border/60">
      <h3>
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full min-h-[48px] items-center justify-between gap-3 py-3 text-left text-[15px] font-semibold text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          {title}
          <ChevronDown
            className={cn(
              "h-4 w-4 shrink-0 text-muted-foreground motion-safe:transition-transform",
              open && "rotate-180",
            )}
            aria-hidden="true"
          />
        </button>
      </h3>
      <div id={panelId} hidden={!open}>
        <ul className="pb-2">
          {links.map(link => (
            <li key={link.href}>
              <Link
                to={link.href}
                className="flex min-h-[44px] items-center text-[15px] text-[hsl(var(--text-secondary))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

const MobileFooter = () => (
  <div
    className="px-4"
    style={{ paddingBottom: "calc(80px + env(safe-area-inset-bottom, 0px))" }}
  >
    <nav aria-label="Footer navigation" className="border-t border-border/60">
      {GROUPS.map(group => (
        <FooterGroup key={group.id} {...group} />
      ))}
    </nav>

    <ul className="mt-4 flex flex-wrap items-center gap-x-4">
      {FOOTER_LINKS.legal.map(link => (
        <li key={link.href}>
          <Link
            to={link.href}
            className="flex min-h-[44px] items-center text-[13px] font-medium text-primary underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            {link.label}
          </Link>
        </li>
      ))}
    </ul>

    <p className="mt-3 text-[12px] leading-[16px] text-[hsl(var(--text-secondary))]">{FOOTER_DISCLOSURE}</p>

    <p className="mt-4 text-[12px] leading-[16px] text-[hsl(var(--text-secondary))]">
      &copy; {new Date().getFullYear()} BookingsFinder. Based in Queensland, Australia.
    </p>
  </div>
);

export default MobileFooter;
