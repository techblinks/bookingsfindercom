/**
 * Single source of truth for footer routes.
 *
 * Shared by the desktop footer grid and the collapsed mobile footer so the
 * two treatments can never drift apart or silently drop a route.
 */

export interface FooterLink {
  label: string;
  href: string;
}

export const FOOTER_LINKS: Record<"plan" | "compare" | "tools" | "company" | "legal", FooterLink[]> = {
  plan: [
    { label: "Trip Planner", href: "/plan" },
    { label: "Trip Cost Planner", href: "/trip-cost" },
    { label: "My Trips", href: "/trips" },
  ],
  compare: [
    { label: "Flights", href: "/flights" },
    { label: "Stays", href: "/hotels" },
    { label: "Things to Do", href: "/things-to-do" },
  ],
  tools: [
    { label: "Passport Validity", href: "/passport-validity" },
    { label: "Visa Requirements", href: "/visa-requirements" },
    { label: "Packing Checklist", href: "/packing-checklist" },
    { label: "Currency Converter", href: "/currency-converter" },
    { label: "Travel Insurance", href: "/travel-insurance" },
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

/** The one approved footer disclosure paragraph. */
export const FOOTER_DISCLOSURE =
  "BookingsFinder is a travel planning and comparison platform. We do not sell flights, hotels, or travel products. We compare offers from third-party sites and connect you to booking partners. We may earn an affiliate commission at no extra cost to you.";
