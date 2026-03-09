
# Enhance Mobile Flights & Hotels Tabs

## Overview
Improve the mobile experience for both the Flights and Hotels search tabs on the homepage, as well as the mobile view of the results pages, with richer features and a more polished, app-like feel.

---

## Changes

### 1. Mobile Flight Search Tab Enhancements (MobileFlightSearch.tsx)
- Add **recent searches** section below the search button showing the user's last 2-3 searches as tappable chips (stored in localStorage)
- Add **popular route suggestions** as quick-tap pills (e.g., "London to NYC", "Dubai to Paris") that auto-fill the from/to fields
- Add a subtle **"Flexible dates?"** toggle that, when enabled, shows a badge on the search button indicating flexible date search
- Improve the swap button animation with a rotation effect on tap

### 2. Mobile Hotel Search Tab Enhancements (MobileHotelSearch.tsx)
- Add a **"Tonight" / "This Weekend" / "Next Week"** quick date picker row above the date fields as tappable chips that auto-fill check-in/check-out
- Expand the popular destinations list with more cities and add small flag/emoji indicators
- Add a **guest presets** row ("Solo", "Couple", "Family") as tappable chips that auto-set guest/room counts
- Add recent hotel searches from localStorage

### 3. Mobile Hero Search Tab Bar Polish (MobileHeroSearch.tsx)
- Add result count badges on the tab labels (e.g., "Flights" with a subtle dot indicator)
- Add haptic-style micro-animation on tab switch (scale bounce)
- Add swipe indicator dots below the content area

### 4. Flight Results Mobile Improvements (FlightResults.tsx)
- Make the mobile filter button position account for the bottom nav bar (move it higher)
- Add a sticky "From $X" price summary chip at the top on mobile when scrolling past the quick select cards
- Collapse the PriceCalendar and WeeklyPriceHeatmap into an expandable "Price Tools" accordion on mobile to reduce initial scroll depth

### 5. Hotel Results Mobile Improvements (HotelResults.tsx)
- Same filter button repositioning for bottom nav clearance
- Add a "Sort" chip next to the filter button on mobile instead of the desktop-only dropdown
- Hotel cards: show the guest score badge more prominently on mobile with the label text visible

---

## Technical Details

### Files to Create
- None (all changes are within existing files)

### Files to Modify
1. **src/components/search/MobileFlightSearch.tsx** -- Add recent searches (localStorage), popular routes chips, flexible dates toggle
2. **src/components/search/MobileHotelSearch.tsx** -- Add quick date presets, guest presets, expanded popular destinations, recent searches
3. **src/components/search/MobileHeroSearch.tsx** -- Add swipe dots indicator, micro-animation on tab switch
4. **src/pages/FlightResults.tsx** -- Collapsible price tools accordion on mobile, fix filter button position for bottom nav, sticky price chip
5. **src/pages/HotelResults.tsx** -- Fix mobile filter button position, add mobile sort chip, improve hotel card score visibility

### Implementation Approach
- Use localStorage for recent searches persistence (no backend needed)
- Use existing framer-motion for animations
- Use existing Collapsible component from radix for the price tools accordion
- Follow existing design patterns: pill-style chips, `native-press`/`native-touch` classes, `bg-primary-foreground/95` input style
- All touch targets remain at least 48px for accessibility
