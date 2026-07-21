# Phase 1A — Brand Foundation and Homepage Implementation Plan

**Date**: 2026-07-20  
**Branch**: `bookingsfinder-v2-phase0-trust-cleanup`  
**Status**: Planning — No source code changes in this phase  
**Based On**: BOOKINGSFINDER_V2_PRODUCT_BLUEPRINT.md Sections 1, 6, 7, 17

---

## 1. Brand Positioning

### One-Sentence Positioning
> "BookingsFinder helps you plan, prepare, and manage every trip — so you travel ready."

### Homepage Headline
> "Everything you need to be ready for your next trip."

### Supporting Statement
> "Plan your journey, understand the real cost, check what you need, and keep every booking and deadline in one place."

### Core Promise
> "We help you know exactly what you need, what it costs, and when to act — then connect you to booking partners when you're ready."

### Primary Audience
Value-conscious independent travellers aged 25–55 who research and book their own travel. Digitally comfortable but overwhelmed by fragmentation. They want confidence, not just price comparison.

### Secondary Audience
Australian and APAC travellers (initial geo-focus based on existing `useGeoLocation.ts` country configurations). Families managing multi-person trips. Frequent travellers with multiple active bookings.

### Brand Personality
- **Knowledgeable friend** — helpful without being pushy
- **Calm and organised** — reduces travel anxiety, never creates urgency
- **Transparent and honest** — clear about what we do, what partners do
- **Globally aware** — not Western-centric, respects all travellers
- **Practical** — focused on useful tools, not aspirational lifestyle content

### Tone of Voice
- Second person ("you") — direct and personal
- Plain English — no travel-industry jargon
- Honest about uncertainty — "Prices change often. We'll let you know when they drop."
- Never fake urgency, scarcity, or manipulation
- Affiliate relationships disclosed clearly, never buried
- Confident but never arrogant

### Words to Use
- "Travel partners" (not "hundreds of sites")
- "Available offers" (not "best deals")
- "Indicative prices" (not "live prices" or "real-time")
- "Compare options" (not "search hundreds of sites")
- "Plan your trip" (not "book now")
- "Travel ready" (not "confirmed" or "guaranteed")
- "We" and "you" (not "the platform" or "users")

### Words to Avoid
- "Best price" / "Best deal" / "Cheapest" as an absolute claim
- "Live" / "Real-time" unless technically accurate
- "Guaranteed" / "Instant" / "Exclusive"
- "Save up to X%" (unverifiable)
- "Hundreds of" / "500+" / "Millions of" (unverifiable)
- "24/7" (unless actually provided)
- "Trusted by" (unverifiable)
- Any countdown, scarcity, or urgency language

---

## 2. Brand Identity Direction

### Colour Palette

| Role | Name | HEX | Usage |
|---|---|---|---|
| **Primary** | Deep Teal | `#0D4F5C` | Primary buttons, header background, key accents |
| **Secondary** | Warm Navy | `#1A3A4A` | Text on light backgrounds, dark mode backgrounds |
| **Accent** | Coral Sun | `#E8734A` | CTAs, highlights, selected states, key interactive elements |
| **Neutral 100** | White Sand | `#FAF8F5` | Page background (light mode) |
| **Neutral 200** | Warm Grey | `#F0EDE8` | Card backgrounds, subtle section dividers |
| **Neutral 400** | Stone | `#C4BFB6` | Borders, disabled states |
| **Neutral 600** | Slate | `#6B6560` | Secondary text, muted elements |
| **Neutral 800** | Charcoal | `#2D2A28` | Primary text |
| **Success** | Muted Emerald | `#3B825D` | Readiness score, completion states, confirmed items |
| **Warning** | Warm Amber | `#C4823E` | Attention items, pending actions (never red for non-critical) |
| **Error** | Accessible Red | `#C23B3B` | Critical issues, destructive actions |
| **Info** | Soft Sky | `#5B8BA0` | Informational elements, links in content |

### Typography

| Role | Font | Weight | Size (Desktop) | Size (Mobile) |
|---|---|---|---|---|
| **Page Title (H1)** | Inter | 700 | 48px / 3rem | 32px / 2rem |
| **Section Heading (H2)** | Inter | 600 | 32px / 2rem | 24px / 1.5rem |
| **Card Title (H3)** | Inter | 600 | 20px / 1.25rem | 18px |
| **Body** | Inter | 400 | 16px / 1rem | 16px |
| **Small / Caption** | Inter | 400 | 14px / 0.875rem | 14px |
| **Price / Numbers** | Inter (tabular-nums) | 600 | Variable | Variable |
| **Code / Data** | JetBrains Mono | 400 | 14px | 13px |

Inter is already in the project — no change needed.

### Border Radius
- **Cards**: 12px (`rounded-xl`)
- **Buttons**: 12px (`rounded-xl`)
- **Inputs**: 10px (`rounded-lg`)
- **Modals**: 16px (`rounded-2xl`)
- **Pills/Badges**: 9999px (`rounded-full`)

### Spacing System (Tailwind-compatible)
- **Section padding (desktop)**: `py-20` (80px)
- **Section padding (mobile)**: `py-12` (48px)
- **Card padding**: `p-6` (24px)
- **Container max-width**: `max-w-6xl` (1152px) for most sections, `max-w-4xl` for content-heavy sections

### Shadow Usage
- **Cards**: `shadow-sm` on default, `shadow-md` on hover — subtle
- **No glow effects**, no gradient borders, no neon
- **Header**: `border-b border-border` with `bg-white/80 backdrop-blur-sm`
- **Elevated elements**: `shadow-lg` only for modals/dropdowns

### Icon Direction
- **Lucide React** (already in project) — consistent 20px/24px
- Icons used sparingly in section headers, abundantly in navigation/tools
- Travel-specific icons only where they add meaning (plane → flights, not "you are here")

### Illustration Direction
- **Abstract, geometric, warm** — not stock photography
- World map patterns (reuse existing `world-map-pattern.png`)
- Simple destination spot illustrations (circle dots on subtle maps)
- Timeline/checklist illustrations for readiness/planning concepts

### Photography Direction
- **Destination photography**: authentic, diverse, not stock-photo-generic
- No: laptops in cafes, generic beaches, Eiffel Tower at sunset
- Use: local detail shots, diverse travellers, geographic variety
- Human imagery: real-looking travellers, age/ethnicity diversity

### Animation Principles
- **Subtle**. Framer Motion (already in project).
- Page transitions: fade (keep existing — works well)
- Scroll reveals: gentle fade-up, 0.3s duration
- **No**: bounce, spin, pulse, or attention-grabbing animations
- Readiness score counting: calm, deliberate, not gamified
- Respect `prefers-reduced-motion`

---

## 3. Homepage Architecture

### Section Order and Design

#### Section 1: Header

| Field | Value |
|---|---|
| Goal | Clear navigation, brand recognition |
| Headline | (Logo only — BookingsFinder) |
| CTA | "Plan a Trip" (primary), "Sign In" (secondary) |
| Desktop | Horizontal nav: Discover · Plan · Tools · Trips · [Plan a Trip button] · [Sign In] |
| Mobile | Logo + hamburger. Bottom nav (5 items). |
| Visual | White/light background, subtle bottom border. Logo left. |
| Trust | None needed in header |
| Conversion | Click "Plan a Trip" → trip creation flow |
| Component | `HeaderV2` (adapt existing `Header.tsx`) |
| Path | `src/components/layout/Header.tsx` (refactor) |

#### Section 2: Hero

| Field | Value |
|---|---|
| Goal | State what BookingsFinder is. Capture intent. |
| Headline | "Everything you need to be ready for your next trip." |
| Supporting copy | "Plan your journey, understand the real cost, check what you need, and keep every booking and deadline in one place." |
| Primary CTA | "Plan a trip" → trip creation flow |
| Secondary CTA | "I already booked — organise my trip" → trip import |
| Desktop | Two-column: left = copy + CTAs, right = illustration (trip timeline preview or readiness score visual). Light, spacious. |
| Mobile | Stacked: copy → CTAs → subtle illustration below. |
| Visual | Deep Teal background (`#0D4F5C`) with world-map pattern overlay at 10% opacity. White text. Coral CTA button. |
| Interaction | CTA hover: subtle scale. Illustration: subtle parallax or fade-in on scroll. |
| Trust | Small text below CTAs: "We earn commission from partners at no extra cost to you." |
| Conversion | Primary: trip creation. Secondary: trip import. |
| Component | `HeroV2` |
| Path | `src/components/home-v2/HeroV2.tsx` |

#### Section 3: Traveller Intent Selector

| Field | Value |
|---|---|
| Goal | Route users to the right tool. Demonstrate breadth. |
| Headline | "What do you need help with?" |
| Supporting copy | (None — let the cards speak) |
| CTA | Each card is a navigation target |
| Desktop | 3×2 grid of intent cards (6 cards) |
| Mobile | 2-column grid, 3 rows |
| Visual | White cards on sand background. Each has: icon (Coral), label (Charcoal), short description (Slate). Subtle hover shadow. |
| Trust | None needed — this is utility navigation |
| Conversion | Click on any card → routed to appropriate tool/flow |
| Component | `IntentSelector` |
| Path | `src/components/home-v2/IntentSelector.tsx` |

**Cards**:

| Label | Description | Icon | Route | Account? | Launch |
|---|---|---|---|---|---|
| Plan a new trip | Start from scratch with destination and dates | `MapPin` | `/trips/new` | Yes | MVP |
| Check visa and requirements | Know exactly what documents you need | `FileCheck` | `/tools/visa` | No | Post-MVP |
| Understand the true cost | See flights + bags + transfers + more | `Calculator` | `/trip-cost` | No | Post-MVP |
| Organise existing booking | Forward your confirmation email | `Mail` | `/trips/new?import=true` | Yes | MVP |
| Compare flights | Search and compare across airlines | `Plane` | `/flights` (handoff) | No | MVP |
| Prepare for departure | Checklist, packing, last-minute checks | `ClipboardCheck` | `/trips` | Yes | MVP |

#### Section 4: Travel Readiness Preview

| Field | Value |
|---|---|
| Goal | Show the core value proposition visually |
| Headline | "Never board a flight wondering if you forgot something." |
| Supporting copy | "BookingsFinder checks your passport, visas, bookings, and deadlines — then tells you exactly what to do and when." |
| Primary CTA | "See how it works" → animated demo or trip creation |
| Secondary CTA | None |
| Desktop | Two-column: left = animated readiness score (45% → 95% as items complete), right = checklist animating. |
| Mobile | Stacked: headline → static illustration → CTA |
| Visual | Light card with checklist items appearing and score ticking up. Muted Emerald for completed items. |
| Interaction | Scroll-triggered animation (respects reduced-motion) |
| Trust | "We don't replace official sources — we help you find them." |
| Conversion | Trip creation / account signup |
| Component | `ReadinessPreview` |
| Path | `src/components/home-v2/ReadinessPreview.tsx` |

#### Section 5: True Trip Cost Preview

| Field | Value |
|---|---|
| Goal | Show cost transparency as a differentiator |
| Headline | "That flight price isn't the whole story." |
| Supporting copy | "We show you the real cost — flights, bags, transfers, insurance, visas — so you can compare honestly." |
| Primary CTA | "Calculate your trip cost" → trip creation |
| Secondary CTA | None |
| Desktop | Side-by-side: "Advertised flight price: $620" vs "Estimated true cost: $1,340" with itemised breakdown. |
| Mobile | Stacked comparison |
| Visual | Two cards: one small (flight only), one larger (full breakdown). Clean numbers, clear labels. |
| Interaction | Static display (demo data for Sydney → Bali) |
| Trust | "Estimates based on available data. Not a quote." |
| Conversion | Trip creation |
| Component | `TrueTripCostPreview` |
| Path | `src/components/home-v2/TrueTripCostPreview.tsx` |

#### Section 6: Trip Workspace Preview

| Field | Value |
|---|---|
| Goal | Show the trip management experience |
| Headline | "All your trips, organised." |
| Supporting copy | "Forward your booking emails and we'll build your trip timeline automatically. Check readiness. Get deadline reminders. Travel with confidence." |
| CTA | "Create your first trip" |
| Desktop | Screenshot/card mockup of trip workspace: timeline with flights, hotels, readiness score, action items. |
| Mobile | Static card mockup |
| Visual | Card-based mockup showing a real-looking trip (not wireframe). Coral accents on action items. |
| Trust | "Your data is yours. We never share it." |
| Conversion | Account creation + trip creation |
| Component | `TripWorkspacePreview` |
| Path | `src/components/home-v2/TripWorkspacePreview.tsx` |

#### Section 7: Flight Search Handoff

| Field | Value |
|---|---|
| Goal | Catch users who came primarily to search flights |
| Headline | "Search flights with our travel partners." |
| Supporting copy | "Compare prices across airlines. We'll connect you to our booking partner to complete your booking." |
| CTA | "Search flights" button |
| Desktop | Compact single-row search bar (origin, destination, dates, passengers) — Google Flights style |
| Mobile | Full-width stacked form |
| Visual | Minimal. Not the dominant element. Light card with subtle border. |
| Interaction | Search redirects to `flights.bookingsfinder.com` (White Label, Phase 2) |
| Trust | "We earn a commission when you book through our partners at no extra cost to you." |
| Conversion | Flight search → affiliate booking |
| Component | `FlightHandoff` |
| Path | `src/components/home-v2/FlightHandoff.tsx` |

#### Section 8: Destination Discovery

| Field | Value |
|---|---|
| Goal | Inspire and show breadth. Monetise via destination content. |
| Headline | "Not sure where to go?" |
| Supporting copy | "Browse destinations, see indicative flight prices from your nearest airport, and find the best time to visit." |
| CTA | Each destination card is clickable |
| Desktop | Grid of 6–8 destination cards (image, city name, "Flights from $X", "Best time: [Month]") |
| Mobile | 2-column grid, scrollable |
| Visual | Destination images with overlay text. Real prices from Travelpayouts month-matrix API. |
| Interaction | Hover: subtle scale. Click → destination page. |
| Trust | "Prices shown are indicative and based on recent searches." |
| Conversion | Click → destination page → flight search → affiliate booking |
| Component | `DestinationDiscovery` |
| Path | `src/components/home-v2/DestinationDiscovery.tsx` |

#### Section 9: Popular Travel Tools

| Field | Value |
|---|---|
| Goal | Show tool breadth. Build account signups. |
| Headline | "Tools for every stage of your journey." |
| Supporting copy | None — grid of tool cards |
| CTA | Each tool card links to the tool |
| Desktop | 3×2 grid of icon-led tool cards |
| Mobile | 2-column grid |
| Visual | Cards with Coral-accented icons, tool name, one-line description. |
| Trust | Small disclaimer text on cards where needed |
| Conversion | Tool engagement → account creation (for gated tools) |
| Component | `TravelToolsGrid` |
| Path | `src/components/home-v2/TravelToolsGrid.tsx` |

**Tool cards**: Visa Checker, Passport Validity, Packing List, Insurance Comparison, eSIM Finder, Currency Guide. (Most launch post-MVP — show as "Coming soon" with email capture for interest.)

#### Section 10: Trust and Transparency

| Field | Value |
|---|---|
| Goal | Build credibility through radical transparency |
| Headline | "How we work." |
| Supporting copy | "BookingsFinder is a travel planning platform. We don't sell tickets. We don't take bookings. We help you plan, prepare, and compare — then connect you to our booking partners. We earn a commission when you book through our partners, at no extra cost to you." |
| CTA | "Learn more" → `/how-it-works` |
| Desktop | Clean text section with three small icon-led points: "Compare with partners" / "Plan in one place" / "Travel ready" |
| Mobile | Stacked |
| Visual | Minimal text section. No cards. Clean typography. |
| Trust | This IS the trust section — be radically honest |
| Conversion | Informed trust → account creation |
| Component | `TrustTransparency` |
| Path | `src/components/home-v2/TrustTransparency.tsx` |

#### Section 11: Email / Trip Capture

| Field | Value |
|---|---|
| Goal | Capture leads from non-converting visitors |
| Headline | "Get travel tips, deal alerts, and destination ideas." |
| Supporting copy | "One email a week. No spam. Unsubscribe anytime." |
| CTA | Email input + "Subscribe" |
| Desktop | Centered, narrow. Different background tint to separate from main content. |
| Mobile | Full-width |
| Visual | Subtle. Not aggressive. Coral subscribe button. |
| Trust | "We'll never share your email." |
| Conversion | Email capture |
| Component | `FinalCTA` (adapt existing `HeroEmailCapture`) |
| Path | `src/components/home-v2/FinalCTA.tsx` |

#### Section 12: Footer

| Field | Value |
|---|---|
| Goal | Navigation, legal, trust |
| See Section 6 below for exact footer design |
| Component | Refactor existing `Footer.tsx` |
| Path | `src/components/layout/Footer.tsx` |

---

## 4. Hero Design — Three Alternative Headlines

### Option A (Recommended)
> **"Everything you need to be ready for your next trip."**
>
> Plan your journey, understand the real cost, check what you need, and keep every booking and deadline in one place.

**Why**: States the value proposition directly. "Ready" is the core differentiator. Works for planners and already-booked travellers.

### Option B
> **"One place for every trip."**
>
> Plan, compare costs, check documents, manage bookings — all in one organised workspace.

**Why**: Simpler, broader. Less differentiated but clearer. Good for brand awareness stage.

### Option C
> **"Your trips, planned and ready."**
>
> From finding the right destination to knowing exactly what you need before you go — BookingsFinder keeps every trip organised.

**Why**: From the blueprint. Good rhythm. Slightly less direct about the value.

**Recommended**: **Option A** — it leads with the outcome (being ready), which is the core differentiator from every other travel site.

---

## 5. Traveller Intent Selector — Final Card Definitions

| # | Label | Description | Icon (Lucide) | Route | Account Required | Launch Status |
|---|---|---|---|---|---|---|
| 1 | Plan a new trip | Start from scratch with destination, dates, and travellers | `MapPin` | `/trips/new` | Yes | MVP |
| 2 | Check visa and requirements | Know exactly what documents you need for your destination | `FileCheck` | `/tools/visa` | No | Post-MVP (Phase 4) |
| 3 | Understand the true cost | See flights + bags + transfers + insurance + more | `Calculator` | `/trip-cost` | No | Post-MVP (Phase 5) |
| 4 | Organise an existing booking | Forward your confirmation email. We'll build your trip. | `Mail` | `/trips/new?import=true` | Yes | MVP |
| 5 | Compare flights | Search and compare prices across airlines | `Plane` | `/flights` | No | MVP (handoff to White Label in Phase 2) |
| 6 | Prepare for departure | Checklist, packing list, last-minute essentials | `ClipboardCheck` | `/trips` | Yes | MVP |

---

## 6. Navigation

### Desktop Navigation (5 items max)

```
[BookingsFinder Logo]    Discover · Plan · Tools · Trips · [Plan a Trip] · [Sign In]
```

- **Discover**: `/discover` — destination pages, best time to visit
- **Plan**: `/trips/new` — trip creation (or `/trips` if logged in)
- **Tools**: `/tools` — visa, passport, packing, insurance, eSIM
- **Trips**: `/trips` — my trips (account required)
- **[Plan a Trip]**: Coral accent button — primary CTA
- **[Sign In]**: Secondary — becomes avatar/dropdown when logged in

### Mobile Navigation (Bottom Nav — 5 items)

1. **Home** (`/`) — House icon
2. **Discover** (`/discover`) — Compass icon
3. **Trips** (`/trips`) — Suitcase icon
4. **Tools** (`/tools`) — Wrench icon
5. **Account** (`/account`) — Person icon

**Hamburger menu** (supplemental): Search Flights, Deals, Guides, Help, Settings

### Logged-In Navigation
- "Sign In" becomes user avatar with dropdown
- Dropdown: My Trips, My Alerts, Travel Readiness, Settings, Sign Out
- "Plan a Trip" button remains prominent

### Footer Columns

| Plan | Tools | Book | Company | Legal |
|---|---|---|---|---|
| Trip Workspace | Visa Checker | Search Flights | About | Privacy Policy |
| True Trip Cost | Passport Validity | Flight Deals | How It Works | Terms |
| Travel Readiness | Packing List | Price Alerts | Blog | Cookie Policy |
| Destination Finder | Insurance | — | Press | Affiliate Disclosure |
| — | eSIM Finder | — | Contact | Why We Don't Sell |

### Persistent Mobile CTA
- "Plan a Trip" floating action button (bottom-right, above bottom nav)
- Only visible when not on trip creation page
- Coral colour, subtle shadow

---

## 7. Homepage Component Migration Map

| Current Component | Path | Classification | V2 Action |
|---|---|---|---|
| `Header` | `src/components/layout/Header.tsx` | **Adapt** | Update nav items. Keep layout. |
| `Footer` | `src/components/layout/Footer.tsx` | **Adapt** | Update columns and copy. Keep structure. |
| `HeroSection` | `src/components/home/HeroSection.tsx` | **Replace** | New `HeroV2`. Archive current. |
| `ModernSearchBox` | `src/components/search/ModernSearchBox.tsx` | **Archive** | Replaced by `FlightHandoff` (compact). Not dominant. |
| `MobileHeroSearch` | `src/components/search/MobileHeroSearch.tsx` | **Archive** | Replaced by `FlightHandoff` mobile variant. |
| `ModernFlightSearch` | `src/components/search/ModernFlightSearch.tsx` | **Archive** | Flight search moves to White Label. Homepage only has compact handoff. |
| `MobileFlightSearch` | `src/components/search/MobileFlightSearch.tsx` | **Archive** | Same as above. |
| `PopularRoutes` | `src/components/sections/PopularRoutes.tsx` | **Adapt** | Keep for destination discovery. Update copy. |
| `HowItWorks` | `src/components/sections/HowItWorks.tsx` | **Replace** | New `TrustTransparency` section. Different design. |
| `WhyBookWithUs` | `src/components/sections/WhyBookWithUs.tsx` | **Remove** | Content absorbed into Trust section. |
| `TopDeals` | `src/components/sections/TopDeals.tsx` | **Archive** | "Deals" concept replaced by destination discovery with real prices. |
| `AirlineOffers` | `src/components/sections/AirlineOffers.tsx` | **Remove** | Specific airline offers not aligned with V2 positioning. |
| `HeroEmailCapture` | `src/components/home/HeroEmailCapture.tsx` | **Adapt** | Move to Section 11 (FinalCTA). Keep email capture logic. |
| Trust stats (`Index.tsx` inline) | In `src/pages/Index.tsx` | **Remove** | Stats section replaced by TrustTransparency. |
| `BottomNav` | `src/components/layout/BottomNav.tsx` | **Adapt** | Update 5 items to new navigation. |
| `CookieConsent` | `src/components/CookieConsent.tsx` | **Preserve** | Works. Keep. |
| `ExitIntentPopup` | `src/components/ExitIntentPopup.tsx` | **Preserve** | Keep for email capture. |
| `SplashScreen` | `src/components/SplashScreen.tsx` | **Preserve** | Works. Keep. |

---

## 8. Homepage Implementation File Plan

### New Component Structure

```
src/
  components/
    home-v2/
      HeroV2.tsx                    # New hero (problem-focused)
      IntentSelector.tsx            # 6-card intent grid
      ReadinessPreview.tsx          # Animated readiness demo
      TrueTripCostPreview.tsx       # Cost comparison demo
      TripWorkspacePreview.tsx      # Workspace mockup
      FlightHandoff.tsx             # Compact flight search bar
      DestinationDiscovery.tsx       # Destination cards with real prices
      TravelToolsGrid.tsx           # Tool cards grid
      TrustTransparency.tsx         # How we work / transparency
      FinalCTA.tsx                  # Email capture
    layout/
      Header.tsx                    # REFACTOR — new nav items
      Footer.tsx                    # REFACTOR — new columns
      BottomNav.tsx                 # REFACTOR — new 5 items
  pages/
    Index.tsx                       # REPLACE — new homepage composition
```

### Shared Types

```typescript
// src/types/homepage.ts
interface IntentCard {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  route: string;
  accountRequired: boolean;
  launchStatus: 'mvp' | 'post-mvp' | 'coming-soon';
}

interface DestinationCard {
  slug: string;
  city: string;
  country: string;
  imageUrl: string;
  indicativePrice?: number;
  currency?: string;
  bestMonth?: string;
}
```

### Configuration

- `src/config/homepage.ts` — Intent cards array, destination cards array, tool cards array
- Data separated from presentation
- Cards can be reordered, enabled/disabled via config

### Responsive Breakpoints
- Use existing Tailwind breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Section layout: single column mobile → two-column tablet → multi-column desktop
- Cards: 1-col mobile → 2-col tablet → 3-col desktop
- Navigation: hamburger mobile → horizontal desktop

### Analytics Events (Define Only — Don't Implement Yet)

| Event Name | Trigger | Properties |
|---|---|---|
| `hero_plan_trip_clicked` | Primary CTA click | `{source: 'hero'}` |
| `hero_existing_trip_clicked` | Secondary CTA click | `{source: 'hero'}` |
| `intent_card_clicked` | Any intent card | `{card_id, card_label}` |
| `readiness_cta_clicked` | Readiness CTA | `{source: 'readiness_preview'}` |
| `trip_cost_cta_clicked` | Cost CTA | `{source: 'cost_preview'}` |
| `flight_handoff_clicked` | Flight search submit | `{origin, destination, dates}` |
| `destination_card_clicked` | Destination card | `{destination_slug, position}` |
| `tool_card_clicked` | Tool card | `{tool_id, tool_label}` |
| `email_captured` | Email subscribe | `{source: 'homepage_final_cta'}` |
| `account_created` | Registration | `{source: 'homepage'}` |

### Loading States
- Hero: renders immediately (static content)
- Intent selector: renders immediately (static config)
- Readiness/Cost previews: static demo — no loading
- Destination cards: skeleton cards while prices load
- Flight search: compact form renders immediately

### Empty States
- Destination cards: show without prices if API unavailable — "View destination" CTA
- Tool cards: "Coming soon" badge for post-MVP tools

---

## 9. SEO Requirements

### Homepage Meta

| Field | Value |
|---|---|
| Title | `BookingsFinder — Plan, Prepare, and Travel Ready` |
| Meta Description | `Plan your trip, understand the real cost, check visa and passport requirements, and keep every booking organised. BookingsFinder helps you travel ready.` |
| Canonical | `https://bookingsfinder.com` |
| OG Title | `BookingsFinder — Plan, Prepare, and Travel Ready` |
| OG Description | `One place to plan, prepare, and manage every trip. Know what you need, what it costs, and when to act.` |
| OG Image | Custom OG image showing brand + value proposition (not a flight search screenshot) |

### Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "BookingsFinder",
  "url": "https://bookingsfinder.com",
  "description": "Plan, prepare, and manage every trip. Know what you need, what it costs, and when to act.",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://bookingsfinder.com/flights?origin={origin}&destination={destination}",
    "query-input": "required name=origin,destination"
  }
}
```

### Heading Hierarchy
- H1: Hero headline (single, unique)
- H2: Section headlines (Intent Selector, Readiness, Cost, etc.)
- H3: Card titles within sections
- No skipped heading levels

### Internal Links
- Destination cards → `/discover/:slug`
- Tool cards → `/tools/:tool` or `/trips`
- Intent cards → respective routes
- Flight handoff → `/flights`
- Footer → full sitemap

### SSR / Prerender
- **Vite prerender** for homepage, `/discover`, `/flights`, `/guides` — static pages
- Dynamic pages (trip workspace) remain SPA
- Homepage must deliver meaningful content without JavaScript

### JS-Free Content
- Hero headline and CTAs visible without JS (they're static HTML)
- Intent selector labels visible (links work even without JS)
- Footer navigation complete
- Structured data embedded in HTML

### Claims Verification
- **No** unverifiable numbers ("500+", "50M+", etc.)
- **No** absolute price claims
- "Indicative prices" or "Available offers" language only
- All affiliate relationships disclosed

---

## 10. Accessibility Requirements

### Target: WCAG 2.2 Level AA

### Keyboard Navigation
- All interactive elements reachable via Tab
- Visible focus indicators (2px Coral outline offset)
- Skip-to-content link at top of page
- No keyboard traps

### Focus States
- `focus-visible:ring-2 focus-visible:ring-[#E8734A] focus-visible:ring-offset-2`
- Consistent across all interactive elements
- Never use `outline: none` without replacement

### Colour Contrast
- All text/background combinations ≥ 4.5:1 (AA)
- Primary (#0D4F5C) on white (#FAF8F5): ~8.5:1 ✅
- Coral (#E8734A) on white: ~3.5:1 ❌ — Coral should be used on dark backgrounds or as accent, not as text on white
- **Fix**: Coral used only as button background with white text, or as icon colour (not required to meet contrast for decorative elements)

### Reduced Motion
- Respect `prefers-reduced-motion`
- Readiness demo: static image instead of animation
- Fade-in scroll reveals: instant instead of animated

### Semantic Structure
- `<header>`, `<main>`, `<footer>`, `<nav>`, `<section>`, `<article>`
- Each `<section>` has an `aria-label` or `aria-labelledby`
- Navigation: `<nav aria-label="Main navigation">`

### Form Labels
- All inputs have visible labels (not just placeholders)
- Flight search form: "From", "To", "Departure", "Return", "Passengers" — all with `<label>` elements
- Error states announced via `aria-live`

### Touch Targets
- Minimum 44×44px (Apple HIG) / 48×48px (Material)
- All buttons, links, card click targets meet this
- Adequate spacing between touch targets (≥8px)

### Screen Reader Text
- Icon-only buttons have `aria-label`
- Decorative images have `alt=""` or are CSS backgrounds
- Destination card images have descriptive `alt` text
- Animated demos have `aria-describedby` explaining static version

### Mobile Usability
- Viewport: `width=device-width, initial-scale=1` (already set)
- No horizontal scroll at 320px width
- Font size never below 14px (avoid iOS zoom on input focus)

---

## 11. Analytics Plan (Define Only)

| Event | Trigger | Minimum Properties |
|---|---|---|
| `hero_plan_trip_clicked` | Primary hero CTA | `{source: 'hero', timestamp}` |
| `hero_existing_trip_clicked` | Secondary hero CTA | `{source: 'hero', timestamp}` |
| `intent_card_clicked` | Any intent selector card | `{card_id, card_label, timestamp}` |
| `readiness_cta_clicked` | Readiness section CTA | `{source: 'readiness_preview', timestamp}` |
| `trip_cost_cta_clicked` | Cost section CTA | `{source: 'cost_preview', timestamp}` |
| `trip_workspace_cta_clicked` | Workspace preview CTA | `{source: 'workspace_preview', timestamp}` |
| `flight_handoff_submitted` | Flight search form submit | `{origin, destination, departure_date, return_date?, passengers, cabin_class, timestamp}` |
| `destination_card_clicked` | Destination card | `{destination_slug, destination_name, position, has_price, timestamp}` |
| `tool_card_clicked` | Tool card | `{tool_id, tool_label, launch_status, timestamp}` |
| `trust_learn_more_clicked` | Trust section CTA | `{source: 'trust_transparency', timestamp}` |
| `email_subscribed` | Email capture | `{source: 'homepage_final_cta', timestamp}` |
| `account_created` | Successful registration | `{source: 'homepage', referrer, timestamp}` |

**Privacy**: No PII in analytics events. No cross-site tracking. Use Plausible or Umami (self-hosted if possible).

---

## 12. Acceptance Criteria for Phase 1 Implementation

### Visual
- [ ] New homepage renders without visual regressions from current site
- [ ] All 12 sections present in correct order
- [ ] Brand colours applied consistently (Deep Teal, Coral, Sand neutrals)
- [ ] Typography: Inter at specified sizes, tabular-nums on prices
- [ ] Card border radius 12px, consistent shadow usage
- [ ] No simulated/animated features visible (all fake features removed in Phase 0)

### Responsive
- [ ] Mobile (320px–767px): single column, stacked sections
- [ ] Tablet (768px–1023px): two-column grids where appropriate
- [ ] Desktop (1024px+): full multi-column layouts
- [ ] No horizontal scroll at any breakpoint
- [ ] Touch targets ≥44px on mobile
- [ ] Bottom nav visible and functional on mobile

### Accessibility
- [ ] Keyboard-navigable: Tab through all interactive elements
- [ ] Focus states visible on all elements
- [ ] All images have alt text
- [ ] Colour contrast passes AA (4.5:1 for text)
- [ ] Semantic HTML: header, main, footer, nav, section
- [ ] Screen reader: sections announced, icons labelled

### Performance
- [ ] Lighthouse mobile score ≥80
- [ ] First Contentful Paint <2s
- [ ] Largest Contentful Paint <3s
- [ ] Cumulative Layout Shift <0.1
- [ ] Total bundle <500kB gzipped (current: ~432kB — maintain)

### SEO
- [ ] Single H1 on page
- [ ] Meta title and description set via react-helmet-async
- [ ] Canonical URL correct
- [ ] OG tags set
- [ ] Structured data (WebSite + SearchAction) present
- [ ] Meaningful content visible without JavaScript
- [ ] No unverifiable claims in visible copy

### Trust
- [ ] No fake urgency, scarcity, or countdown language
- [ ] No unverifiable numbers ("500+", "50M+", "2M+")
- [ ] No "live", "real-time", "best price", "guaranteed" language unless verifiable
- [ ] Affiliate disclosure visible (footer + trust section)
- [ ] All claims supportable by evidence

### Navigation
- [ ] Desktop nav: 5 items max + Plan a Trip CTA + Sign In
- [ ] Mobile bottom nav: 5 items
- [ ] Hamburger menu for secondary items
- [ ] All routes resolve (no 404s from nav links)
- [ ] Account dropdown shows when logged in

### Regression
- [ ] Existing pages still render correctly (About, Blog, Contact, etc.)
- [ ] Admin pages unaffected
- [ ] Auth flow still works
- [ ] Flight search (current custom, not White Label yet) still functional via `/flights`
- [ ] Destination/country/route pages still render

### Build Quality
- [ ] `npm run build` passes with zero errors
- [ ] `npm run lint` passes (no new errors beyond pre-existing 67)
- [ ] TypeScript strict mode: no new `any` usage
- [ ] No console errors on page load

---

## 13. Final Design Recommendation

### Final Headline
> **"Everything you need to be ready for your next trip."**

### Final Colour Palette
| Role | HEX |
|---|---|
| Primary | `#0D4F5C` (Deep Teal) |
| Accent | `#E8734A` (Coral Sun) |
| Background | `#FAF8F5` (White Sand) |
| Card BG | `#F0EDE8` (Warm Grey) |
| Text Primary | `#2D2A28` (Charcoal) |
| Text Secondary | `#6B6560` (Slate) |
| Success | `#3B825D` (Muted Emerald) |
| Warning | `#C4823E` (Warm Amber) |
| Error | `#C23B3B` (Accessible Red) |

### Final Typography
- **Font**: Inter (already in project)
- **Weights**: 400 (body), 600 (headings, emphasis), 700 (hero)
- **Size scale**: 14/16/18/20/24/32/48px

### Final Navigation
- **Desktop**: Discover · Plan · Tools · Trips · [Plan a Trip] · [Sign In]
- **Mobile**: Home · Discover · Trips · Tools · Account (bottom nav)
- **Footer**: 5 columns: Plan, Tools, Book, Company, Legal

### Final Homepage Section Order
1. Header
2. Hero (problem-led, not search-form-led)
3. Traveller Intent Selector (6 cards)
4. Travel Readiness Preview (value demo)
5. True Trip Cost Preview (value demo)
6. Trip Workspace Preview
7. Flight Search Handoff (compact, not dominant)
8. Destination Discovery
9. Popular Travel Tools
10. Trust and Transparency
11. Email / Trip Capture
12. Footer

### Components to Keep (from current)
- `SplashScreen`, `CookieConsent`, `ExitIntentPopup` — preserve as-is
- `BottomNav` — refactor with new items
- `Header`, `Footer` — refactor with new content
- `LocationCombobox` — reuse in FlightHandoff
- `PopularRoutes` — adapt for DestinationDiscovery
- `HeroEmailCapture` — adapt for FinalCTA

### Components to Retire
- `HeroSection` (old) — replace with HeroV2
- `ModernSearchBox`, `MobileHeroSearch`, `ModernFlightSearch`, `MobileFlightSearch` — archive entire search/ directory
- `WhyBookWithUs`, `TopDeals`, `AirlineOffers` — remove
- Inline trust stats in `Index.tsx`

### First Implementation Task for Phase 1B
**Create `src/components/home-v2/HeroV2.tsx`** — the new problem-led hero with dual CTAs and no dominant search form. This is the most visible change and sets the tone for the entire V2 homepage.

---

*Specification complete. Ready for Phase 1B implementation upon approval.*
