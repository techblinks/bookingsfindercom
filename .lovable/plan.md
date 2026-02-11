

# Airline Special Offers Feed on Homepage

## Overview
Add a dynamic "Airline Special Offers" section to the homepage that displays real-time deals from the Travelpayouts API, replacing the current hardcoded `TopDeals` component with live data.

## Approach
The Travelpayouts `/v2/prices/special-offers` endpoint returns XML, which adds parsing complexity. Instead, we will use the **`/v2/prices/latest`** endpoint (JSON) with `sorting=price` and the user's geo-detected origin to fetch the cheapest recent flight deals. This provides real, fresh deal data in a clean JSON format.

We will also attempt the **`/v3/get_special_offers`** endpoint first (if it returns usable JSON data), with a fallback to `/v2/prices/latest`.

## What Changes

### 1. New Edge Function: `get-special-offers`
- Calls Travelpayouts API to fetch the latest cheap deals
- Uses the user's origin (from geo-detection) to personalize results
- Returns up to 8 deals with origin, destination, price, airline, departure date, and affiliate link
- Includes basic caching (1-hour TTL) via the existing `route_price_cache` table to reduce API calls

### 2. New Component: `AirlineOffers.tsx`
- Replaces or sits alongside the existing hardcoded `TopDeals` section
- Displays a horizontal scrollable card grid (mobile-friendly)
- Each card shows:
  - Airline logo (using existing `getAirlineLogo` helper)
  - Route (origin to destination city names)
  - Price with currency
  - Departure date
  - "Found X hours ago" freshness indicator
  - Number of stops
  - Affiliate-safe CTA: "View Live Prices"
- Skeleton loading state while data fetches
- Framer Motion animations (consistent with Popular Routes)
- Graceful fallback to existing hardcoded deals if API returns empty

### 3. Homepage Integration
- Add the new `AirlineOffers` section to `Index.tsx`
- Position it where `TopDeals` currently sits (or alongside it)
- Pass geo-detected origin and currency from the existing `useGeoLocation` hook

### 4. New Hook: `useSpecialOffers.ts`
- Fetches offers from the new edge function
- Accepts origin IATA code and currency
- Returns loading state, offers array, and error state
- Auto-refreshes on origin/currency change

## Technical Details

### Edge Function (`supabase/functions/get-special-offers/index.ts`)
- Endpoint: POST with `{ origin, currency, limit }`
- Calls: `https://api.travelpayouts.com/v2/prices/latest?origin={origin}&currency={currency}&sorting=price&limit=8&period_type=year&show_to_affiliates=true`
- Uses existing `getConfig()` from `_shared/travelpayouts.ts` for API token
- Returns normalized JSON array of deal objects
- Generates Aviasales affiliate links using the existing marker

### Component Structure
- Cards use the existing `Card` UI component
- Airline logos from `getAirlineLogo()`
- Airline names from `getAirlineName()`
- Click tracking via existing `trackAffiliateEvent()`
- Links route to the flight search page with pre-filled params

### Files to Create
- `supabase/functions/get-special-offers/index.ts`
- `src/components/sections/AirlineOffers.tsx`
- `src/hooks/useSpecialOffers.ts`

### Files to Modify
- `src/pages/Index.tsx` -- add the AirlineOffers section
- `supabase/config.toml` -- will auto-update with new function

