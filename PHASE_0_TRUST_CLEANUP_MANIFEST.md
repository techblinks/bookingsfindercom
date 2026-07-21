# Phase 0 — Trust Cleanup Manifest

**Date**: 2026-07-20
**Branch**: `bookingsfinder-v2-phase0-trust-cleanup`  
**Based On**: FLIGHT_SEARCH_ARCHITECTURE_REPORT.md + BOOKINGSFINDER_V2_PRODUCT_BLUEPRINT.md  
**Status**: Evidence gathered — implementation pending

---

## Evidence Summary

### Confirmed Simulated / Misleading Features

| # | File | Component | Problem | Risk Level |
|---|---|---|---|---|
| S1 | `src/pages/FlightResults.tsx:37-55` | `generateFlexibleDates()` | `Math.random()` generates fake prices. Comment says "mock...would come from backend". | 🔴 CRITICAL |
| S2 | `src/components/flights/UrgencyBadges.tsx:12-19` | `getSeatsLeft()` | `Math.sin(price * 9301)` generates fake "X seats left". | 🔴 CRITICAL |
| S3 | `src/pages/RoutePage.tsx:53-56` | `getRoutePrice()` | `150 + (charCodeSum % 800)` — fake price from city name hash. | 🔴 CRITICAL |
| S4 | `src/components/flights/PriceConfidenceIndicator.tsx:86` | Price confidence tooltip | Claims "based on historical data and current market trends" but is batch-relative deviation. | 🔴 CRITICAL |
| S5 | `src/hooks/useFlightSearch.ts:83-84` | `calculatePriceConfidence()` | Comment says "simulated historical comparison". | 🔴 CRITICAL |
| S6 | `src/components/flights/DealScoreBadge.tsx` | Deal score labels | "Excellent Deal" label based on batch-relative score, not market data. | 🟠 HIGH |
| S7 | `src/components/search/HeroSearch.tsx:40-43` | `getFlexibleDatePrice()` | Another `Math.random()` fake price generator. Comment: "Mock...would come from an API". | 🔴 CRITICAL |
| S8 | `src/pages/BookingRedirect.tsx:30` | "Real-time availability confirmed" | Data is cached Travelpayouts, not real-time live inventory. | 🟠 HIGH |

### Unsupported Marketing Claims

| # | File(s) | Claim | Evidence |
|---|---|---|---|
| M1 | Multiple pages | "500+ Airlines" | No data source. Travelpayouts covers ~800 but this is unverified. |
| M2 | `src/pages/Index.tsx:75,182` | "50M+ Happy Travelers" | Unverifiable. No analytics to support. |
| M3 | `src/pages/HowItWorks.tsx:102` | "2M+ Happy Travelers" | Contradicts 50M+ claim. Both unverifiable. |
| M4 | `src/pages/Index.tsx:186` | "24/7 Customer Support" | BookingsFinder doesn't handle bookings or support. |
| M5 | Multiple pages | "Search hundreds of travel sites" | Only searches Travelpayouts (one API). |
| M6 | `src/pages/AboutUs.tsx:233` | "50M+" stat | Same as M2. |
| M7 | `src/components/sections/TopDealsOfTheDay.tsx:137` | "Updated live" | Prices are cached, not live. |
| M8 | `src/components/optimizer/OptimizerResults.tsx:285` | "See real-time availability" | Not real-time. Travelpayouts cached data. |

### Preserved Real-Data Features

| # | File | Component | Data Source |
|---|---|---|---|
| R1 | `src/components/flights/PriceCalendar.tsx` | Price Calendar | Travelpayouts `v2/prices/month-matrix` — REAL |
| R2 | `src/components/flights/WeeklyPriceHeatmap.tsx` | Weekly Heatmap | Travelpayouts `v2/prices/month-matrix` — REAL |
| R3 | `supabase/functions/get-popular-directions/` | Popular routes | Travelpayouts `v1/city-directions` — REAL |
| R4 | `supabase/functions/search-airports/` | Airport search | Local database + fuzzy matching — REAL |
| R5 | `supabase/functions/get-price-calendar/` | Calendar prices | Travelpayouts month-matrix — REAL |

### Decorative UI-only Math.random (SAFE — not customer-facing data)

| # | File | Usage |
|---|---|---|
| D1 | `src/components/ui/FlipBoard.tsx:17,22` | Character flipping animation |
| D2 | `src/components/ui/sidebar.tsx:536` | Skeleton loading placeholder widths |

---

## Cleanup Actions

### CATEGORY A — IMMEDIATE REMOVAL (Simulated Data)

#### A1: FlexibleDatesMatrix mock prices
- **File**: `src/pages/FlightResults.tsx`, lines 36-55 (function), line 113-116 (call), line 461-469 (render)
- **File**: `src/components/flights/FlexibleDatesMatrix.tsx` (entire component)
- **File**: `src/components/search/HeroSearch.tsx`, lines 40-43 (mock function), lines 224-232 (usage), lines 367-371 and 445-449 (render)
- **Action**: **REMOVE** — Delete `generateFlexibleDates()`, `getFlexibleDatePrice()`, `FlexibleDatesMatrix` component, all usages and imports
- **Dependencies**: FlightResults.tsx imports FlexibleDatesMatrix (line 15). HeroSearch.tsx has inline mock.
- **Regression risk**: LOW — This is a standalone component. Remove its import and render block.
- **Verification**: `git grep FlexibleDatesMatrix` returns no results. Build succeeds.

#### A2: UrgencyBadges "seats left" simulation
- **File**: `src/components/flights/UrgencyBadges.tsx`, lines 12-19 (`getSeatsLeft`), lines 32-50 (seats badge render)
- **Action**: **REMOVE** — Delete `getSeatsLeft()`, the `seatsLeft` variable, and the entire "seats left" badge render block (lines 35-50). Keep the price-trend badge, departure-countdown badge, and hot-deal badge as they use real data or relative calculations.
- **Dependencies**: Imported and used in `FlightCard.tsx` (line 11), rendered at line 293-298
- **Regression risk**: LOW — Other badges in UrgencyBadges remain functional.
- **Verification**: `git grep getSeatsLeft` returns no results. "seats left" text not in codebase.

#### A3: RoutePage fake price generation
- **File**: `src/pages/RoutePage.tsx`, lines 53-56 (`getRoutePrice`), line 107 (usage), line 117-119 (uses basePrice in meta description), line 198-200 (price display)
- **Action**: **REMOVE** — Delete `getRoutePrice()`. Replace price display with "View live prices →" CTA linking to `/flights?origin=...&destination=...`. Remove dollar amount from meta description (use "Compare cheap flights" without fake price).
- **Dependencies**: BasePrice used in meta description, intro text, FAQ answers (lines 117, 119, 140, 146), and hero display (line 198-200).
- **Regression risk**: MEDIUM — Multiple references to basePrice throughout the component. Must carefully replace all usages.
- **Verification**: `git grep getRoutePrice` returns no results. RoutePage renders without $ price in hero.

#### A4: PriceConfidenceIndicator misleading claim
- **File**: `src/components/flights/PriceConfidenceIndicator.tsx`, line 86 (tooltip text)
- **File**: `src/hooks/useFlightSearch.ts`, line 83 (comment says "simulated")
- **Action**: **REWORD** — Change tooltip from "Price confidence is based on historical data and current market trends" to "Price confidence compares this flight to others in current search results." Also update the comment in useFlightSearch.ts.
- **Dependencies**: FlightCard.tsx renders PriceConfidenceIndicator
- **Regression risk**: NONE — Text-only change.
- **Verification**: New tooltip text appears. Old text gone.

### CATEGORY B — REWORD (Unsupported Marketing Claims)

#### B1: "Real-time availability confirmed"
- **File**: `src/pages/BookingRedirect.tsx`, line 30
- **Action**: **REWORD** to "Prices compared for you"
- **Regression risk**: NONE

#### B2: "Updated live" on TopDealsOfTheDay
- **File**: `src/components/sections/TopDealsOfTheDay.tsx`, line 137
- **Action**: **REWORD** to "Best prices found for you" or remove the live claim
- **Regression risk**: NONE

#### B3: "See real-time availability" in OptimizerResults
- **File**: `src/components/optimizer/OptimizerResults.tsx`, line 285
- **Action**: **REWORD** to "See availability and pricing from our booking partners"
- **Regression risk**: NONE

#### B4: "24/7 Customer Support"
- **File**: `src/pages/Index.tsx`, line 186
- **Action**: **REWORD** to "Price Alerts & Monitoring" (more accurate)
- **Regression risk**: LOW — Layout: the 4-stat grid becomes 4 items still. Must maintain layout.

#### B5: "50M+ Travelers" and "50M+ Happy Travelers"
- **File**: `src/pages/Index.tsx`, lines 75, 182-183
- **File**: `src/pages/AboutUs.tsx`, line 233
- **Action**: **REMOVE** both. Replace Index stat with "Compare & Save" or similar verifiable claim. Replace AboutUs stat with different metric or remove.
- **Regression risk**: MEDIUM — Layout changes in stat grid. Need to maintain 4-column balance.

#### B6: "2M+ Happy Travelers"
- **File**: `src/pages/HowItWorks.tsx`, lines 102-103, 324
- **Action**: **REWORD** to "Join travelers who save" (no number)
- **Regression risk**: LOW

#### B7: "Search hundreds of travel sites"
- **File**: `src/components/home/HeroSection.tsx` line 34, `src/components/layout/Footer.tsx` line 65, and multiple other pages
- **Action**: **REWORD** to "Compare prices from our travel partners" (more accurate — currently one API, may expand)
- **Regression risk**: LOW — Text-only.

### CATEGORY C — PRESERVE (Real Data Features)

These features MUST NOT be modified in Phase 0:
- `src/components/flights/PriceCalendar.tsx` — Real Travelpayouts month-matrix data
- `src/components/flights/WeeklyPriceHeatmap.tsx` — Real Travelpayouts month-matrix data
- `src/components/flights/FlightWarningBadges.tsx` — Real logic, no simulation
- `src/components/flights/FlightCard.tsx` — Real flight data display (keep the card, remove simulated sub-components)
- `supabase/functions/get-price-calendar/` — Real API
- `supabase/functions/get-popular-directions/` — Real API
- `supabase/functions/search-airports/` — Real fuzzy search
- `src/hooks/useFlightSearch.ts` — Core hook (remove only `calculateDealScore()` and `calculatePriceConfidence()` simulated functions, keep the rest)

### CATEGORY D — WILL BE REPLACED BY WHITE LABEL (Phase 2+)

These are currently functional but will be retired when White Label is live. Do NOT modify in Phase 0 except for trust cleanup:
- `src/pages/FlightResults.tsx` — Retain but with A1 fix applied
- `src/components/flights/FlightCard.tsx` — Retain but with A2, A4 fixes
- `src/components/flights/FlightFiltersPanel.tsx` — Retain
- `src/components/flights/FlightQuickSelect.tsx` — Retain (uses cheapest/fastest from results — real data)
- `supabase/functions/search-flights/` — Retain

### CATEGORY E — ALREADY SAFE (No Change Needed)

- `src/components/flights/FlightCardSkeleton.tsx` — Loading skeleton
- `src/components/flights/EmptyFlightState.tsx` — Error/empty states
- `src/components/flights/SearchingIndicator.tsx` — Search progress
- `src/components/flights/SortDropdown.tsx` — Sort options
- `src/components/flights/PriceAlertDialog.tsx` — Price alerts (placeholder text uses real price for estimate)
- `src/components/flights/MobileQuickEditBar.tsx` — Quick edit bar
- `src/components/flights/SavedSearchesPanel.tsx` — Saved searches
- `src/components/flights/PriceDropNotification.tsx` — Price drop UI
- `src/components/seo/FlightSearchSchema.tsx` — Schema markup (metadata, not user-visible prices)
