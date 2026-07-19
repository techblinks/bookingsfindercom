import { MapPin, FileCheck, Calculator, Mail, Plane, ClipboardCheck, Hotel, Car, Shield, Wifi, Bus, UtensilsCrossed, Ticket, PiggyBank, DollarSign, Globe } from "lucide-react";

// ── Intent Card types and data ──

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
  { id: "plan-trip", label: "Plan a new trip", description: "Start from scratch with destination, dates, and travellers", icon: "MapPin", route: "/plan", accountRequired: true, launchStatus: "coming-soon" },
  { id: "check-visa", label: "Check travel requirements", description: "Know exactly what documents you need for your destination", icon: "FileCheck", route: "/tools/visa", accountRequired: false, launchStatus: "coming-soon" },
  { id: "trip-cost", label: "Understand the true trip cost", description: "See flights, bags, transfers, insurance, and more", icon: "Calculator", route: "/trip-cost", accountRequired: false, launchStatus: "coming-soon" },
  { id: "existing-booking", label: "Organise an existing booking", description: "Forward your confirmation email. We'll build your trip.", icon: "Mail", route: "/plan?import=true", accountRequired: true, launchStatus: "coming-soon" },
  { id: "compare-flights", label: "Compare flights", description: "Search and compare prices across airlines", icon: "Plane", route: "/flights", accountRequired: false, launchStatus: "mvp" },
  { id: "prepare-departure", label: "Prepare for departure", description: "Checklist, packing list, and last-minute essentials", icon: "ClipboardCheck", route: "/trips", accountRequired: true, launchStatus: "coming-soon" },
];

export const iconMap: Record<string, React.ComponentType<Record<string, never>>> = { MapPin, FileCheck, Calculator, Mail, Plane, ClipboardCheck };

export interface LaunchBadgeInfo { label: string; className: string; }

export const launchBadge: Record<string, LaunchBadgeInfo | null> = {
  mvp: null,
  "post-mvp": { label: "Soon", className: "bg-accent/10 text-accent border-accent/20" },
  "coming-soon": { label: "Coming soon", className: "bg-muted text-muted-foreground border-border" },
};

// ── Trip Cost Preview types and example data ──

export interface TripCostCategory { label: string; amount: number; icon: string; note?: string; }

export const exampleTripCostCategories: TripCostCategory[] = [
  { label: "Flights", amount: 620, icon: "Plane", note: "Round trip — Sydney to Bali" },
  { label: "Accommodation", amount: 480, icon: "Hotel", note: "7 nights, mid-range hotel" },
  { label: "Airport transfers", amount: 85, icon: "Car", note: "Both ends, private transfer" },
  { label: "Travel insurance", amount: 65, icon: "Shield", note: "Standard single-trip cover" },
  { label: "eSIM / mobile data", amount: 25, icon: "Wifi", note: "7-day data plan" },
  { label: "Local transport", amount: 40, icon: "Bus", note: "Scooter hire, taxis" },
  { label: "Food and daily spending", amount: 210, icon: "UtensilsCrossed", note: "~$30/day for 7 days" },
  { label: "Activities", amount: 120, icon: "Ticket", note: "Tours, entry fees, experiences" },
  { label: "Contingency", amount: 100, icon: "PiggyBank", note: "Unexpected costs buffer" },
];

export const exampleTripCostTotal = exampleTripCostCategories.reduce((sum, c) => sum + c.amount, 0);

export const costIconMap: Record<string, React.ComponentType<Record<string, never>>> = { Plane, Hotel, Car, Shield, Wifi, Bus, UtensilsCrossed, Ticket, PiggyBank };

// ── Trip Workspace Preview types and example data ──

export interface WorkspaceTimelineItem { label: string; status: "confirmed" | "pending" | "attention"; detail: string; icon: string; }

export const exampleWorkspaceItems: WorkspaceTimelineItem[] = [
  { label: "Flight booking", status: "confirmed", detail: "QF41 SYD→DPS — Aug 15, 9:30am — confirmed", icon: "Plane" },
  { label: "Accommodation", status: "confirmed", detail: "7 nights at Kuta Seaside — confirmed", icon: "Hotel" },
  { label: "Passport validity", status: "confirmed", detail: "Valid until Feb 2027 — 8 months beyond return", icon: "Shield" },
  { label: "Travel insurance", status: "pending", detail: "Not yet arranged — compare options now", icon: "Shield" },
  { label: "Airport transfer", status: "pending", detail: "Book DPS airport pickup — ~$25", icon: "Car" },
  { label: "Visa on arrival", status: "attention", detail: "Available at DPS — bring USD $35 cash", icon: "Ticket" },
  { label: "Packing checklist", status: "pending", detail: "Adapter Type C/F, sunscreen, insect repellent", icon: "PiggyBank" },
];

export const workspaceIconMap: Record<string, React.ComponentType<Record<string, never>>> = { Plane, Hotel, Shield, Car, Ticket, PiggyBank };

// ── Travel Tools types and data ──

export interface ToolCard { id: string; label: string; description: string; icon: string; route: string; launchStatus: "coming-soon"; }

export const toolCards: ToolCard[] = [
  { id: "trip-cost-planner", label: "Trip Cost Planner", description: "See the categories that contribute to the full cost of a journey.", icon: "Calculator", route: "/trip-cost", launchStatus: "coming-soon" },
  { id: "passport-validity", label: "Passport Validity Guide", description: "Understand what to check before travelling with your passport.", icon: "FileCheck", route: "/passport-validity", launchStatus: "coming-soon" },
  { id: "visa-requirements", label: "Visa Requirements Guide", description: "Find official sources for entry and visa information.", icon: "Globe", route: "/visa-requirements", launchStatus: "coming-soon" },
  { id: "packing-checklist", label: "Packing Checklist", description: "Organise essential items before departure.", icon: "ClipboardCheck", route: "/packing-checklist", launchStatus: "coming-soon" },
  { id: "currency-converter", label: "Currency Converter", description: "Convert currencies using current exchange-rate information.", icon: "DollarSign", route: "/currency-converter", launchStatus: "coming-soon" },
  { id: "travel-insurance", label: "Travel Insurance Guide", description: "Learn what to review when comparing travel insurance.", icon: "Shield", route: "/travel-insurance", launchStatus: "coming-soon" },
];

export const toolIconMap: Record<string, React.ComponentType<Record<string, never>>> = { Calculator, FileCheck, ClipboardCheck, DollarSign, Shield, Globe };

// ── Trust principles ──

export interface TrustPrinciple { title: string; description: string; }

export const trustPrinciples: TrustPrinciple[] = [
  { title: "No fake urgency", description: "We do not invent countdowns, traveller counts or scarcity messages." },
  { title: "Clear partner handoff", description: "When you continue to a travel provider, your booking and payment happen with that provider." },
  { title: "Affiliate transparency", description: "We may earn a commission from selected links without changing the price you pay." },
  { title: "Official-source policy", description: "For entry rules, passports and travel requirements, we direct you to official sources and encourage you to verify before travel." },
];
