
# Geo-Based Currency Display

## Problem
Currency is hardcoded across the app -- `"AUD"` in flight search, `"USD"` in hotel search, and `"$"` as the symbol in dozens of component props. Users in India see prices in AUD/USD instead of INR, users in the UK see `$` instead of GBP, etc.

## Solution
Use the existing `useGeoLocation` hook (which already provides `currency` and `currencySymbol`) to dynamically set currency everywhere.

## Changes

### 1. Flight Search -- Pass geo currency to API
**File: `src/hooks/useFlightSearch.ts`**
- Accept `currency` as a parameter (default `"USD"`)
- Use it in the API request body instead of hardcoded `'AUD'`
- Use it in `convertApiFlight` default currency

### 2. Flight Results Page
**File: `src/pages/FlightResults.tsx`**
- Import and call `useGeoLocation`
- Pass `geoData.currency` to `useFlightSearch`
- Replace all hardcoded `"AUD"` and `"$"` with geo values:
  - `FlightSearchSchema` currency prop
  - `PriceAlertDialog` currency prop
  - `FlightFiltersPanel` currency prop (x2: desktop + mobile)
  - `FlightQuickSelect` currency prop
  - `FlexibleDatesMatrix` currency prop
  - `PriceCalendar` currency prop
  - `NearbyAirportSuggestion` currency prop
  - Cheapest price display in the header bar

### 3. Hotel Results Page
**File: `src/pages/HotelResults.tsx`**
- Import and call `useGeoLocation`
- Replace all hardcoded `"USD"` and `"$"`:
  - `HotelSearchSchema` currency prop
  - `HotelQuickSelect` currency prop
  - `HotelResultCard` currency prop

### 4. Popular Routes Section
**File: `src/components/sections/PopularRoutes.tsx`**
- Already uses `useGeoLocation` for routes; pass geo currency to `PriceAlertDialog` instead of hardcoded `"USD"`

### 5. Top Hotel Destinations
**File: `src/pages/TopHotelDestinations.tsx`**
- Use geo currency in `Intl.NumberFormat` instead of hardcoded `"USD"`

### 6. Edge Functions
**File: `supabase/functions/search-flights/index.ts`**
- Verify it respects the `currency` parameter from the request body (it likely already does via Travelpayouts API)

## What stays unchanged
- Component default props (e.g., `currency = "$"`) remain as safe fallbacks
- Static placeholder/demo data keeps `"$"` since it's illustrative
- The `useGeoLocation` hook itself -- no changes needed
- `AirlineOffers` section -- already uses geo currency correctly

## Technical Notes
- The `useGeoLocation` hook caches results in localStorage for 24 hours, so there's no performance concern
- Currency conversion is handled by the upstream APIs (Travelpayouts returns prices in the requested currency)
- If geolocation fails, USD / `$` is used as the fallback
