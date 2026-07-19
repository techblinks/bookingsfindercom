import { MapPin, FileCheck, Calculator, Mail, Plane, ClipboardCheck } from "lucide-react";

export interface IntentCard {
  id: string;
  label: string;
  description: string;
  icon: string;
  route: string;
  accountRequired: boolean;
  launchStatus: "mvp" | "post-mvp" | "coming-soon";
}

export const intentCards: IntentCard[] = [
  {
    id: "plan-trip",
    label: "Plan a new trip",
    description: "Start from scratch with destination, dates, and travellers",
    icon: "MapPin",
    route: "/plan",
    accountRequired: true,
    launchStatus: "coming-soon",
  },
  {
    id: "check-visa",
    label: "Check travel requirements",
    description: "Know exactly what documents you need for your destination",
    icon: "FileCheck",
    route: "/tools/visa",
    accountRequired: false,
    launchStatus: "coming-soon",
  },
  {
    id: "trip-cost",
    label: "Understand the true trip cost",
    description: "See flights, bags, transfers, insurance, and more",
    icon: "Calculator",
    route: "/trip-cost",
    accountRequired: false,
    launchStatus: "coming-soon",
  },
  {
    id: "existing-booking",
    label: "Organise an existing booking",
    description: "Forward your confirmation email. We'll build your trip.",
    icon: "Mail",
    route: "/plan?import=true",
    accountRequired: true,
    launchStatus: "coming-soon",
  },
  {
    id: "compare-flights",
    label: "Compare flights",
    description: "Search and compare prices across airlines",
    icon: "Plane",
    route: "/flights",
    accountRequired: false,
    launchStatus: "mvp",
  },
  {
    id: "prepare-departure",
    label: "Prepare for departure",
    description: "Checklist, packing list, and last-minute essentials",
    icon: "ClipboardCheck",
    route: "/trips",
    accountRequired: true,
    launchStatus: "coming-soon",
  },
];

export const iconMap: Record<string, React.ComponentType<Record<string, never>>> = {
  MapPin: MapPin,
  FileCheck: FileCheck,
  Calculator: Calculator,
  Mail: Mail,
  Plane: Plane,
  ClipboardCheck: ClipboardCheck,
};

export interface LaunchBadgeInfo {
  label: string;
  className: string;
}

export const launchBadge: Record<string, LaunchBadgeInfo | null> = {
  mvp: null,
  "post-mvp": { label: "Soon", className: "bg-accent/10 text-accent border-accent/20" },
  "coming-soon": { label: "Coming soon", className: "bg-muted text-muted-foreground border-border" },
};
