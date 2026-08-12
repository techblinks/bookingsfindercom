import { Shield, Plane, HeartHandshake, Library, ClipboardCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

/**
 * Shared trust content — V0 Visual Foundation.
 *
 * One approved copy source. Multiple contextual presentations.
 * Used by DesktopHome, MobileHome, and any future trust surface.
 */

export interface TrustItem {
  icon: LucideIcon;
  text: string;
}

export const TRUST_ITEMS: TrustItem[] = [
  {
    icon: Shield,
    text: "BookingsFinder is a travel comparison and planning platform.",
  },
  {
    icon: Plane,
    text: "BookingsFinder does not directly sell flights or accommodation.",
  },
  {
    icon: HeartHandshake,
    text: "Current prices and availability are confirmed by providers.",
  },
  {
    icon: Library,
    text: "Some outbound links may be affiliate links. BookingsFinder may earn a commission at no additional cost to you.",
  },
  {
    icon: ClipboardCheck,
    text: "Booking conditions, cancellations and payments are handled by the provider.",
  },
];

/**
 * Compact trust line — mobile V2.
 *
 * Same three commitments as TRUST_ITEMS, condensed to a single scannable
 * line for surfaces where the full disclosure block is too heavy. The full
 * wording still lives on the dedicated legal routes below.
 */
export const TRUST_LINE_ITEMS = [
  "Independent comparison",
  "We don't sell travel",
  "You book with the provider",
] as const;

export const TRUST_LEGAL_LINKS = [
  { label: "Affiliate disclosure", href: "/affiliate-disclosure" },
  { label: "Privacy policy", href: "/privacy" },
  { label: "Terms of service", href: "/terms" },
] as const;
