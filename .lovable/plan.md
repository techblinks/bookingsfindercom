

# Native-Like Mobile UI Redesign for Capacitor App

## Overview

This plan transforms the mobile search experience into a truly native-feeling interface optimized for Capacitor deployment. The focus is on making date selection (and all search inputs) feel like they belong on iOS/Android rather than a web app.

---

## Current Issues Identified

1. **Date Picker UX Problems**
   - Calendar cells are too small (9x9 = 36px) for comfortable touch targets (Apple recommends 44px minimum)
   - Navigation arrows are tiny and hard to tap
   - No swipe gestures to change months
   - Calendar appears inside a drawer but lacks the "full-screen takeover" feel of native apps

2. **General Mobile Search Issues**
   - Location sheets use 85vh height but don't feel truly full-screen
   - Keyboard handling could be smoother
   - Missing haptic feedback patterns used in native apps
   - No iOS-style "Cancel" or "Done" affordances in selection screens

3. **Visual Inconsistencies**
   - Touch states use `active:` which is too brief; native apps use sustained press feedback
   - Missing "safe area" handling for notched phones

---

## Proposed Changes

### Phase 1: Full-Screen Native Date Picker

Create a new `NativeDatePicker` component that replaces the drawer-based calendar:

```text
+----------------------------------+
|  [X]    Select Date       [Done] |   <- Fixed header with safe area
+----------------------------------+
|   January 2026                   |   <- Large month/year with swipe
|  Su  Mo  Tu  We  Th  Fr  Sa      |
| +----+----+----+----+----+----+  |
| | 1  | 2  | 3  | 4  | 5  | 6  |  |   <- 44px+ touch targets
| +----+----+----+----+----+----+  |
| | 7  | 8  | 9  | 10 | 11 | 12 |  |
| | ...                         |  |
+----------------------------------+
|  Quick Picks (horizontal scroll) |
|  [Today] [Tomorrow] [+1 Week]    |
+----------------------------------+
```

Key features:
- Full-screen modal (100vh) with safe-area padding
- Touch targets of 48x48px for each day cell
- Swipe left/right to change months (using Framer Motion)
- Large, tappable month navigation
- Selected date highlighted with spring animation
- iOS-style header with Cancel/Done buttons

### Phase 2: Native Location Picker

Update `LocationCombobox` and Sheet usage for a more native feel:

```text
+----------------------------------+
|  [<]   Where to?           [X]   |
+----------------------------------+
|  +------------------------------+|
|  |  Search airports...         ||   <- Large input, auto-focus
|  +------------------------------+|
+----------------------------------+
|  RECENT                          |
|  +------------------------------+|
|  | [icon] London (LHR)         ||
|  | Heathrow, United Kingdom    ||
|  +------------------------------+|
|  POPULAR                         |
|  | [icon] New York (JFK)       ||
|  ...                             |
+----------------------------------+
```

Key features:
- Full-screen takeover with smooth slide-up animation
- Native keyboard handling with input always visible
- Larger list items with 56px minimum height
- Clear section headers
- Smooth list animations on search results

### Phase 3: Enhanced Mobile Search Form

Redesign `MobileFlightSearch` and `MobileHotelSearch`:

```text
+----------------------------------+
|         Book Your Trip           |
|  [Flights]  [Hotels]  tabs       |
+----------------------------------+
|                                  |
|  +------------------------------+|
|  | From                         ||
|  | [icon] Select departure     ||
|  +------------------------------+|
|        [swap button]             |
|  +------------------------------+|
|  | To                           ||
|  | [icon] Select destination   ||
|  +------------------------------+|
|                                  |
|  +------------------------------+|
|  | Dates                        ||
|  | [icon] Feb 10 - Feb 17      ||
|  +------------------------------+|
|                                  |
|  +------------------------------+|
|  | Travelers & Class            ||
|  | [icon] 2 Adults, Economy    ||
|  +------------------------------+|
|                                  |
|  +------------------------------+|
|  |        Search Flights        ||   <- Full-width, 56px height
|  +------------------------------+|
+----------------------------------+
```

Key improvements:
- Larger touch areas (minimum 56px row height)
- Cards have subtle shadow and pressed states
- Smooth transitions between states
- Loading states with skeleton animations

### Phase 4: iOS/Android Safe Area Support

Add proper safe-area handling for notched devices:

- Add `env(safe-area-inset-*)` CSS support
- Header and footer respect safe areas
- Modals account for home indicator

### Phase 5: Native Calendar Component

Create an enhanced calendar with mobile-optimized sizes:

```text
Updated Calendar Classnames:
- head_cell: "w-12 h-12" (48px touch targets)
- day: "w-12 h-12 text-base"
- nav_button: "h-10 w-10" (larger nav buttons)
- Month header: larger font, tappable for month picker
```

---

## Technical Implementation Details

### Files to Create

1. **`src/components/search/NativeDatePicker.tsx`**
   - Full-screen date selection modal
   - Swipe gesture support using Framer Motion
   - Range selection for round trips
   - Quick date chips
   - iOS-style header with Cancel/Done

2. **`src/components/search/NativeLocationPicker.tsx`**
   - Full-screen location search
   - Enhanced keyboard handling
   - Larger touch targets
   - Smooth result animations

3. **`src/components/ui/native-calendar.tsx`**
   - Mobile-optimized calendar with 48px cells
   - Swipe navigation between months
   - Visual feedback on selection

### Files to Modify

1. **`src/components/search/MobileFlightSearch.tsx`**
   - Replace Drawer-based date picker with NativeDatePicker
   - Replace Sheet-based location with NativeLocationPicker
   - Increase all touch targets to 56px minimum
   - Add pressed states for better tactile feedback

2. **`src/components/search/MobileHotelSearch.tsx`**
   - Same enhancements as flight search

3. **`src/components/search/MobileHeroSearch.tsx`**
   - Add smooth tab transitions
   - Ensure proper spacing for safe areas

4. **`src/index.css`**
   - Add safe-area CSS utilities
   - Add native-like pressed states
   - Mobile-specific animation utilities

5. **`src/components/layout/Header.tsx`**
   - Add safe-area padding for top
   - Optimize for Capacitor status bar

6. **`index.html`**
   - Add viewport-fit=cover for edge-to-edge display
   - Add theme-color meta tag for status bar

---

## Design Tokens for Native Feel

| Element | Current | Proposed |
|---------|---------|----------|
| Day cell | 36x36px | 48x48px |
| List item | 52px | 56px |
| Button height | 48px | 56px (primary) |
| Input height | 48px | 52px |
| Nav button | 28px | 40px |
| Touch feedback | active: | 150ms press state |

---

## Animation Strategy

Using Framer Motion for:
- Page/modal transitions (slide up/down)
- Month swipe navigation
- Selection highlight (scale + color)
- List item appearance (staggered fade)

---

## Capacitor-Specific Considerations

1. **Status Bar**: Ensure content doesn't overlap the status bar
2. **Safe Areas**: Handle notches and home indicators
3. **Keyboard**: Inputs remain visible when keyboard opens
4. **Haptics**: (Future) Add haptic feedback on selection
5. **Back Button**: Handle Android back button in modals

---

## Expected Outcome

After implementation, the mobile search experience will:
- Feel indistinguishable from a native iOS/Android app
- Have properly sized touch targets (44-56px)
- Use full-screen modals instead of partial drawers
- Support swipe gestures for navigation
- Handle safe areas for modern phones
- Provide smooth, 60fps animations

