

# Mobile Landing Page UX Redesign

## Problems Identified
- Hero section is too tall — search form pushes everything below the fold
- Too many elements compete for attention (trip type toggle, flexible dates, popular routes, all visible at once)
- Trip Optimizer CTA and email capture add clutter below search on mobile
- The "How It Works" banner, "Why Book With Us", and CTA sections are generic and text-heavy
- Exit intent popup ("Wait! Don't Miss a Deal") fires aggressively
- Bottom nav "Flights" and "Hotels" navigate to results pages with no search params, likely showing empty states

## Plan

### 1. Streamline the Mobile Hero Section
**File: `src/components/home/HeroSection.tsx`**
- Reduce vertical padding on mobile (`py-6` instead of `py-10`)
- Make headline tighter: remove subtitle on mobile or make it single-line
- Hide Trip Optimizer CTA on mobile (it's in the bottom nav / menu already)
- Hide HeroEmailCapture on mobile hero — move it to a standalone section below fold instead
- Result: search form visible above the fold with the CTA button

### 2. Simplify Mobile Search Form
**File: `src/components/search/MobileFlightSearch.tsx`**
- Collapse trip type + flexible dates into a single compact row
- Combine From/To into a single stacked card (Google Flights style) — reduce spacing between them
- Remove "Popular routes" chips from inside the search form (move to section below)
- Reduce field label font size and vertical spacing
- Make the search button sticky at the bottom of the search card area

**File: `src/components/search/MobileHeroSearch.tsx`**
- Remove swipe indicator dots (unnecessary for 2 tabs)
- Tighten tab bar spacing

### 3. Fix Bottom Nav Behavior
**File: `src/components/layout/BottomNav.tsx`**
- Change "Flights" tab to navigate to `/` and auto-focus the flight search tab
- Change "Hotels" tab to navigate to `/` and auto-focus the hotel search tab
- Pass search type via URL hash or query param (`/?tab=flights`, `/?tab=hotels`)

**File: `src/components/home/HeroSection.tsx` / `MobileHeroSearch.tsx`**
- Accept a `defaultTab` prop driven by URL query param
- When user taps "Flights" in bottom nav → scroll to hero and show flight search
- When user taps "Hotels" in bottom nav → scroll to hero and show hotel search

### 4. Redesign Below-Fold Mobile Sections
**File: `src/pages/Index.tsx`**
- Reorder mobile sections for conversion:
  1. Hero + Search (above fold)
  2. Trust bar — compact horizontal strip (500+ airlines, 1M+ hotels) — move from bottom to right after hero
  3. Popular Routes (already exists, keep)
  4. Email capture (moved from hero)
  5. How It Works (keep as-is, it's already compact)
  6. Top Deals
  7. Footer

- Hide "Explore Top Flight Destinations" CTA card on mobile (redundant with Popular Routes)
- Hide AirlineOffers section on mobile if it loads slowly or shows few results
- Hide "Why Book With Us" on mobile (clutters the page)

### 5. Compact Trust Stats Bar
**File: `src/pages/Index.tsx`**
- On mobile, render trust stats as a single horizontal scrollable strip with smaller text right below the hero
- Format: `500+ Airlines • 1M+ Hotels • 50M+ Travelers`

### 6. Mobile-Optimized Email Capture Section
**File: `src/components/home/HeroEmailCapture.tsx`**
- On mobile, render as a standalone card section (not inside hero)
- Simpler design: icon + one line text + email input + button, all in a card with brand bg

## Technical Details
- All changes are CSS/layout only on mobile via responsive classes — desktop stays unchanged
- No database changes needed
- No new dependencies
- Bottom nav uses `useSearchParams` or hash to communicate tab selection to hero
- Affiliate flow and search functionality remain untouched

## What Improves
- Search form fully visible above the fold on mobile
- Clear visual hierarchy: search → trust → routes → deals
- Bottom nav actually works as navigation (flights/hotels open the right search)
- Less clutter, faster perceived performance
- Matches UX patterns from Google Flights, Skyscanner, Kayak mobile

