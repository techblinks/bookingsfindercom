# Flight Search Architecture Report — BookingsFinder.com

**Date**: 2026-07-19  
**Repository**: https://github.com/techblinks/bookingsfindercom  
**Live**: https://bookingsfinder.com/  
**Report Type**: INSPECTION-ONLY — Full End-to-End Audit

---

## SECTION 1 — Executive Summary

### Plain-English Architecture Description

BookingsFinder is a React/Vite SPA (Single-Page Application) that acts as a flight comparison frontend. Users enter a search on the homepage, which navigates to `/flights?origin=SYD&destination=MEL&departureDate=2026-08-01...`. The React hook `useFlightSearch` calls a **Supabase Edge Function** (`search-flights`), which in turn calls the **Travelpayouts API** (`aviasales/v3/prices_for_dates`). The response is a cached fare list, not live inventory. The frontend transforms the sparse API data into rich-looking flight cards, computes deal scores and price confidence locally, and renders intelligence features — some backed by Travelpayouts, some simulated, and some using random number generators. When a user clicks "View Deal", they go through an interstitial redirect page, then out to Aviasales (Travelpayouts' consumer brand) with affiliate markers.

The architecture is a **thin proxy over Travelpayouts' cached fare data**, wrapped in a polished UI with many locally-computed "intelligence" features that give the impression of deep analysis.

### Scores

| Metric | Score | Rationale |
|---|---|---|
| **Overall Architecture** | 3/10 | Functional but built on the wrong Travelpayouts endpoint for interactive flight search. Many features are simulated. |
| **Reliability** | 4/10 | Travelpayouts `prices_for_dates` is a cache, not live inventory. Results may be stale. No retry logic in frontend beyond abort/timeout. |
| **Scalability** | 5/10 | Edge Function architecture is scalable. Travelpayouts has rate limits. No client-side caching. Repeated searches hit API every time. |
| **Business Readiness** | 2/10 | Misleading "intelligence" features (simulated deal scores, fake seat counts, fake route page prices). Regulatory risk from deceptive urgency badges. |

### Biggest Strength

The UI/UX polish is genuinely good. The FlightCard component, mobile search forms, stub filtering, and interstitial redirect page are well-designed. The modular component architecture is clean.

### Biggest Weakness

The entire flight-search experience is built on **Travelpayouts' `prices_for_dates` cached endpoint**, which is designed for **price widgets and calendars, not interactive flight search**. It returns one price per airline per route per date — not actual flights, not multiple options, not live availability. The frontend then fabricates intelligence features on top of this sparse data.

### Most Urgent Risk

**Multiple features use simulated/mock data presented as if real** — the "seats left" badge (uses `Math.sin(price * 9301)`), the flexible dates matrix (uses `Math.random()`), and route page prices (uses a character-code hash of city names). These are potentially deceptive to consumers and could attract regulatory attention (FTC, ACCC, EU consumer protection).

---

## SECTION 2 — End-to-End Architecture

### Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. HOMEPAGE (src/pages/Index.tsx)                                   │
│    └─> HeroSection → ModernSearchBox → ModernFlightSearch            │
│        (or MobileHeroSearch → MobileFlightSearch on mobile)          │
│    Collects: origin, destination, departureDate, returnDate,         │
│              passengers (adults+children+infants), cabinClass        │
│    └─> Builds URL: /flights?origin=SYD&destination=MEL...           │
│        navigate(`/flights?${params.toString()}`)                     │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 2. FLIGHT RESULTS PAGE (src/pages/FlightResults.tsx)                │
│    Reads from URL: useSearchParams()                                 │
│    Gets geo currency: useGeoLocation() → currencyCode                │
│    Calls: useFlightSearch({origin, destination, departureDate,       │
│            returnDate, passengers, cabinClass, currency: currencyCode│
│    })                                                                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 3. FLIGHT SEARCH HOOK (src/hooks/useFlightSearch.ts)                │
│    Validates: IATA codes, required fields                           │
│    Tracks search: trackAffiliateEvent({type:'flight', action:'search'│
│    Builds request body: {origin, destination, depart_date,          │
│      return_date?, adults: passengers, currency}                     │
│    Calls: POST {SUPABASE_URL}/functions/v1/search-flights            │
│    Headers: Authorization: Bearer {sessionToken||anonKey},          │
│             apikey: {publishableKey}                                 │
│    Timeout: 30 seconds (AbortController)                             │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 4. EDGE FUNCTION (supabase/functions/search-flights/index.ts)       │
│    Validates with Zod: origin (3-char IATA), destination,           │
│      depart_date (YYYY-MM-DD), return_date?, adults (1-9),         │
│      currency (3-char, default 'USD')                                │
│    Gets config: getConfig() → TRAVELPAYOUTS_API_KEY, MARKER_ID      │
│    Calls: getFlightPrices(params, config)                            │
│           from _shared/travelpayouts.ts                              │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 5. TRAVELPAYOUTS SERVICE (_shared/travelpayouts.ts)                 │
│    Builds URL: api.travelpayouts.com/aviasales/v3/prices_for_dates  │
│      ?origin={origin}&destination={destination}                     │
│      &depart_date={departDate}&currency={currency||'AUD'}           │
│      &token={token}&marker={marker}                                  │
│      [&return_date={returnDate}] [&adults={adults}]                 │
│    Calls: GET (fetch)                                                │
│    Transforms: maps data.data[] to FlightResult[]                    │
│      id = "{origin}-{destination}-{departure_at}-{airline}-{index}" │
│      segments = [{from, to, depart_time, arrive_time: return_at}]   │
│    Deduplicates by ID                                                │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 6. TRAVELPAYOUTS API (External)                                     │
│    Endpoint: api.travelpayouts.com/aviasales/v3/prices_for_dates    │
│    Returns: {success: true, data: [{origin, destination,            │
│      departure_at, return_at, airline, price, flight_number,        │
│      transfers, duration, link, ...}], currency}                     │
│    Data type: CACHED fare data (NOT live inventory)                  │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 7. RESPONSE PROCESSING (useFlightSearch.ts)                         │
│    convertApiFlight(): maps API fields to Flight type                │
│    Deduplicate by ID                                                │
│    enhanceFlights(): adds deal_score, price_confidence, price_trend  │
│      deal_score = weighted(price 50% + duration 30% + stops 20%)    │
│      price_confidence = deviation from mean of results              │
│    detectWarnings(): long_layover, overnight_stop, self_transfer    │
│    calculateFilterRanges(): price & duration bounds                  │
│    applyFiltersAndSorting(): client-side filtering                   │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 8. RENDERING (FlightResults → FlightCard)                           │
│    FlightQuickSelect: Best/Cheapest/Fastest computed from results   │
│    FlightCard: airline, timeline, price, deal_score, warnings        │
│    FlexibleDatesMatrix: RANDOM prices around cheapest (-30% to +10%) │
│    PriceCalendar: Travelpayouts v2/prices/month-matrix              │
│    WeeklyPriceHeatmap: Travelpayouts v2/prices/month-matrix         │
│    UrgencyBadges: simulated seats-left (Math.sin), departure countdown│
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 9. BOOKING CLICK (handleBookNow)                                    │
│    Tracks click: trackAffiliateEvent({action:'click', ...})         │
│    Gets redirect URL: getRedirectUrl({id, type, link, ...})         │
│      → calls GET /functions/v1/get-redirect?id=...&link=...          │
│    get-redirect Edge Function:                                       │
│      If link provided → decodeURIComponent(link)                     │
│      Else builds Aviasales URL with marker ID                        │
│    Redirects: window.location.href = /redirect?url={redirectUrl}    │
└────────────────────────────────┬────────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────────┐
│ 10. INTERSTITIAL PAGE (src/pages/BookingRedirect.tsx)               │
│     Normalizes URL (handles double-encoding, relative paths)        │
│     Shows branded loading screen with trust signals                 │
│     Auto-redirects to Aviasales after 2.5 seconds                   │
│     FTC-compliant affiliate disclosure in footer                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Key URL Parameters

| Parameter | Source | Used by Backend? | Notes |
|---|---|---|---|
| `origin` | Search form | ✅ | 3-letter IATA, uppercased |
| `destination` | Search form | ✅ | 3-letter IATA, uppercased |
| `departureDate` | Search form | ✅ | YYYY-MM-DD format |
| `returnDate` | Search form | ✅ (optional) | Only when roundtrip |
| `passengers` | Search form (total) | ✅ (as `adults`) | adults+children+infants summed |
| `adults` | Search form | ❌ NOT sent to API | Included in URL but dropped |
| `children` | Search form | ❌ NOT sent to API | Included in URL but dropped |
| `infants` | Search form | ❌ NOT sent to API | Included in URL but dropped |
| `cabinClass` | Search form | ❌ NOT sent to API | Included in URL but dropped |
| `flexibleDates` | Search form checkbox | ❌ NOT used | Only for UI flag |
| `nearbyAirports` | Search form checkbox | ❌ NOT used | Only for UI flag |

---

## SECTION 3 — Travelpayouts Provider Audit

### Endpoints Used

#### 3.1 `GET /aviasales/v3/prices_for_dates` (PRIMARY)

- **File**: `supabase/functions/_shared/travelpayouts.ts`, lines 56-99
- **Purpose**: Fetch cached cheapest flight prices for specific origin-destination-date combinations
- **Request Parameters** (confirmed from code):
  - `origin` — 3-letter IATA (uppercased)
  - `destination` — 3-letter IATA (uppercased)
  - `depart_date` — YYYY-MM-DD
  - `return_date` — YYYY-MM-DD (optional)
  - `currency` — 3-letter code (default `'AUD'` in service, `'USD'` in Edge Function Zod schema)
  - `adults` — integer (optional)
  - `token` — API key
  - `marker` — affiliate marker
- **Response Shape** (confirmed from mapping code, lines 80-99):
  ```json
  {
    "success": true,
    "data": [{
      "origin": "SYD",
      "destination": "MEL",
      "departure_at": "2026-08-01T06:00:00Z",
      "return_at": "2026-08-05T18:00:00Z",
      "airline": "QF",
      "price": 189,
      "flight_number": "401",
      "transfers": 0,
      "duration": 90,
      "link": "https://www.aviasales.com/search/..."
    }],
    "currency": "aud"
  }
  ```
- **Data Type**: **CACHED FARE DATA** — These are the cheapest cached fares found by Travelpayouts' aggregation system. They are NOT live GDS queries. Travelpayouts crawls airline sites and OTAs periodically and caches the cheapest prices. This means:
  - Prices may be hours to days old
  - Only the single cheapest fare per airline per route on that date
  - No seat availability information
  - No booking class details
  - Links go to Aviasales search, not directly to booking
- **Suitability for Interactive Flight Search**: **POOR** — This endpoint is designed for price-calendar widgets, route price indicators, and "cheapest month" features. It is NOT designed for displaying full flight search results with multiple options, detailed itineraries, or real booking links.
- **Known Limitations Visible from Implementation**:
  1. `return_at` is mapped to `arrive_time` for the segment — this is conceptually wrong for one-way flights where `return_at` will be null
  2. Only one "flight" per airline per route — users never see alternatives
  3. No cabin class filtering capability
  4. No children/infant pricing
  5. No baggage information
  6. No aircraft information
  7. `flight_number` in the response is a single string, potentially the first-leg flight number only
  8. Link goes to Aviasales search page, not a specific flight booking

#### 3.2 `GET /v2/prices/month-matrix` (CALENDAR)

- **File**: `supabase/functions/get-price-calendar/index.ts`
- **Purpose**: Get a matrix of lowest prices for each day of a month
- **Parameters**: `origin`, `destination`, `month` (YYYY-MM), `currency`, `token`, `show_to_affiliates`
- **Used By**: `PriceCalendar` and `WeeklyPriceHeatmap` components
- **Data Type**: **CACHED FARE DATA** — similar to prices_for_dates but aggregated by day
- **Confidence**: ✅ CODE-CONFIRMED — Actually connected to real Travelpayouts API

#### 3.3 `GET /v1/city-directions` (POPULAR ROUTES)

- **File**: `supabase/functions/get-popular-directions/index.ts`
- **Purpose**: Get popular destinations from a given origin airport
- **Parameters**: `origin`, `currency`, `token`
- **Used By**: Popular routes feature (via `get-popular-directions` Edge Function)
- **Data Type**: **CACHED FARE DATA** with popular direction suggestions
- **Confidence**: ✅ CODE-CONFIRMED

### Endpoints NOT Used

- `aviasales/v3/latest` — Live search (this would be the correct endpoint for interactive search)
- `aviasales/v3/search` — Calendar search with filters
- `aviasales/v3/prices/cheap` — Cheapest tickets from origin
- `aviasales/v3/prices/direct` — Direct flight prices
- `aviasales/v3/airline_directions` — Airline-specific routes
- `aviasales/v3/flight_search` — Full flight search with segments

---

## SECTION 4 — Data Contract and Mapping Audit

### Flight Type Definition

- **File**: `src/types/flight.ts`

### Field-by-Field Audit

| Field | Source | Mapping | Status |
|---|---|---|---|
| `id` | Constructed: `{origin}-{destination}-{departure_at}-{airline}-{index}` | travelpayouts.ts:81 | ⚠️ Synthetic, not a real booking ID |
| `airline` | `flight.airline \|\| 'Unknown'` | travelpayouts.ts:82 | ⚠️ Only airline code, no full name |
| `airline_code` | `flight.airline` (duplicate) | travelpayouts.ts:83 | ✅ |
| `price` | `flight.price` | travelpayouts.ts:84 | ⚠️ Only cheapest cached fare |
| `currency` | `params.currency \|\| 'AUD'` | travelpayouts.ts:85 | ⚠️ Multiple conflicting defaults |
| `duration_minutes` | `flight.duration \|\| 0` | travelpayouts.ts:86 | ✅ |
| `stops` | `flight.transfers \|\| 0` | travelpayouts.ts:87 | ✅ |
| `segments[]` | Constructed from single flat data | travelpayouts.ts:88-96 | 🔴 MAJOR ISSUE |
| `segments[].from` | `flight.origin` | travelpayouts.ts:89 | ✅ |
| `segments[].to` | `flight.destination` | travelpayouts.ts:90 | ✅ |
| `segments[].depart_time` | `flight.departure_at` | travelpayouts.ts:91 | ✅ |
| `segments[].arrive_time` | `flight.return_at \|\| null` | travelpayouts.ts:92 | 🔴 WRONG — return date mapped as arrival time |
| `segments[].airline` | `flight.airline` | travelpayouts.ts:93 | ✅ |
| `segments[].airline_code` | duplicate | travelpayouts.ts:94 | ✅ |
| `segments[].flight_number` | `flight.flight_number` | travelpayouts.ts:95 | ⚠️ May be first leg only |
| `segments[].aircraft` | ❌ Not in API response | — | 🔴 MISSING |
| `segments[].duration_minutes` | ❌ Not in API response | — | 🔴 MISSING |
| `segments[].layover_minutes` | ❌ Not in API response | — | 🔴 MISSING |
| `is_deal` | Only from API if present | — | ⚠️ Rarely populated |
| `link` | `flight.link` | travelpayouts.ts:97 | ✅ Goes to Aviasales search |
| `deal_score` | Locally computed | useFlightSearch.ts:53-70 | ⚠️ Relative to current results only |
| `price_confidence` | Locally computed | useFlightSearch.ts:73-95 | ⚠️ Relative to current results only |
| `price_trend` | Locally computed | useFlightSearch.ts:73-95 | ⚠️ Relative to current results only |
| `warnings` | Locally detected | useFlightSearch.ts:98-140 | ⚠️ Partial detection |
| `average_price` | Locally computed | useFlightSearch.ts:90 | ⚠️ Mean of current results |
| `nearby_airport_savings` | ❌ Never populated | — | 🔴 UNUSED / STUB |
| `layover_cities` | ❌ Never populated | — | 🔴 UNUSED / STUB |
| `baggage_included` | ❌ Never populated | — | 🔴 UNUSED / STUB |
| `cabin_class` | ❌ Never populated | — | 🔴 UNUSED / STUB |

### Critical Mapping Bug

**Line 92, `_shared/travelpayouts.ts`**:
```typescript
arrive_time: flight.return_at || null,
```

For **one-way flights**, `return_at` is absent from the Travelpayouts response. This means `arrive_time` is `null`, and the FlightCard must calculate arrival time from `departure_time + duration_minutes`. This calculation ignores timezone differences, producing potentially incorrect arrival times. The `calculateArrivalInfo()` function in FlightCard.tsx (`getArrivalDate()`) uses local time arithmetic, not timezone-aware computation.

For **round-trip flights**, `return_at` is the return flight's departure time, NOT the outbound arrival time. This is a data corruption issue masked somewhat by the FlightCard's fallback calculation.

---

## SECTION 5 — Passenger and Cabin-Class Audit

### Trace Table

| Parameter | Collected in UI | Included in URL | Reaches Hook | Reaches Service | Reaches Edge Function | Reaches Travelpayouts |
|---|---|---|---|---|---|---|
| `adults` (distinct) | ✅ ModernFlightSearch.tsx L:62, MobileFlightSearch.tsx L:62 | ✅ L:126 (adults param) | ❌ FlightResults.tsx reads `passengers` (total) not `adults` | ❌ | ❌ | ❌ |
| `children` | ✅ ModernFlightSearch.tsx L:62 | ✅ L:127 (children param) | ❌ Not read from URL | ❌ | ❌ | ❌ |
| `infants` | ✅ ModernFlightSearch.tsx L:62 | ✅ L:128 (infants param) | ❌ Not read from URL | ❌ | ❌ | ❌ |
| `passengers` (total) | ✅ Computed L:85 | ✅ L:125 | ✅ FlightResults.tsx L:63 | ❌ Not passed separately (only adults) | ✅ As `adults` in Zod schema L:18 | ✅ As `adults` query param |
| `cabinClass` | ✅ ModernFlightSearch.tsx L:64 | ✅ L:129 | ✅ FlightResults.tsx L:64 | ❌ Not in request body | ❌ NOT in Zod schema | ❌ NOT in API call |

### Key Findings

1. **UI collects adults/children/infants separately** but the FlightResults page only reads `passengers` (total) from the URL. The individual counts are preserved in the URL but never read back.

2. **Edge Function only accepts `adults`** (1-9, default 1). It has NO field for children, infants, or cabin class.

3. **Travelpayouts API receives only `adults`** — the total passenger count is passed as adults.

4. **Cabin class is COMPLETELY IGNORED by the backend.** The Zod schema in `search-flights/index.ts` has no `cabin_class` field. The Travelpayouts `prices_for_dates` endpoint does not support cabin class filtering.

5. **The FlightCard displays cabin class** as `flight.cabin_class || "Economy"` (FlightCard.tsx line ~144), but the field is never populated from the API. It always falls back to "Economy", which may be inaccurate.

6. **Impact**: Users selecting "Business" or "First" class will see results at economy prices, because the search was always performed for economy. This is misleading.

---

## SECTION 6 — Currency Audit

### Complete Currency Trace

| Layer | Default | File | Line |
|---|---|---|---|
| Geolocation API | Country-based mapping | `useGeoLocation.ts` | Various |
| Search form UI | Uses `geoData.currency` | `ModernFlightSearch.tsx` | Calls `useGeoLocation()` |
| FlightResults page | `geoData?.currency \|\| "USD"` | `FlightResults.tsx` | L:69-71 |
| useFlightSearch hook | Passes `params.currency` from FlightResults | `useFlightSearch.ts` | Passed through |
| useFlightSearch request body | `currency: params.currency \|\| 'USD'` | `useFlightSearch.ts` | L:212 |
| travelApi.ts (standalone) | `params.currency \|\| 'AUD'` | `travelApi.ts` | L:120 |
| search-flights Edge Function | `z.string().length(3).default('USD')` | `search-flights/index.ts` | L:19 |
| travelpayouts.ts service | `params.currency \|\| 'AUD'` | `travelpayouts.ts` | L:57 |
| Travelpayouts API | Receives whatever is sent | External | — |
| get-price-calendar EF | `currency = "USD"` (default param) | `get-price-calendar/index.ts` | L:8 |
| usePriceCalendar hook | `currency = "USD"` | `usePriceCalendar.ts` | L:20 |
| RoutePage | Hardcoded `$` (USD) | `RoutePage.tsx` | Display only |
| FlightCard display | Uses `currency` prop passed from parent | `FlightCard.tsx` | Function param |

### Inconsistent Defaults

```
Layer                              Default
───────────────────────────────────────────
useFlightSearch (request body)     USD
travelApi.ts (standalone)          AUD
search-flights Zod schema          USD
travelpayouts.ts (actual API call) AUD
usePriceCalendar                   USD
get-price-calendar EF              USD
RoutePage display                  USD ($)
```

### Possible User-Facing Errors

1. **Australian user** (geo → AUD): Frontend sends AUD. Edge Function Zod defaults to USD if missing. travelpayouts.ts defaults to AUD if missing. Both could trigger, resulting in API returning USD prices displayed with A$ symbol, or API returning AUD prices displayed with $ symbol. **Inconsistent.**

2. **US user without geo** (fallback USD): Frontend sends USD. Currency likely consistent throughout.

3. **FlightResults page uses `$` symbol** for the mobile filter drawer (FlightResults.tsx line ~298: `currency="$"`) regardless of actual currency. This is a hardcoded override.

4. **PriceCalendar and WeeklyHeatmap** use a separate hook (`usePriceCalendar`) that defaults to USD regardless of geo location.

---

## SECTION 7 — Search Reliability

### Reasons Users May Receive Zero/Incorrect Results

| Cause | Likelihood | Impact | Details |
|---|---|---|---|
| **Travelpayouts cache miss** | High | High | `prices_for_dates` returns empty `data` array for routes with no cached fares. User sees "0 flights found". |
| **30-second timeout** | Medium | Medium | `useFlightSearch.ts` L:203-205 sets a 30-second timeout. Slow API responses are aborted. |
| **IATA code validation** | Low | Medium | Only 3-letter uppercase codes accepted (L:200-207). "LON" (metropolitan code) would fail. |
| **Outdated fares** | High | High | Cached prices may be sold out by the time user clicks through to Aviasales. |
| **Missing arrival time** | High | Low | One-way flights have null `arrive_time`. FlightCard calculates locally, timezone-naive. |
| **Currency mismatch** | Medium | Medium | Multiple conflicting defaults may show AUD prices with $ symbol or vice versa. |
| **Edge Function JWT rejection** | Medium | High | `search-flights` not in config.toml → `verify_jwt=true`. Anonymous users may get 401 if anon key isn't sufficient. |
| **Travelpayouts API downtime** | Low | High | All flight searches fail. No fallback provider. |
| **Rate limiting** | Medium | Medium | Travelpayouts has rate limits. No client-side throttling or queuing. |
| **Network errors** | Low | Medium | Frontend shows generic error message. No offline support. |
| **Duplicate flights** | Low | Low | Dedup by ID exists but ID generation includes index, so exact duplicates get unique IDs. |
| **Wrong dates** | Low | High | If URL params are malformed or user manipulates URL, Zod validation rejects with 400. |
| **Simulated "seats left"** | High | Medium | Shows 2-4 seats left for ~30% of results using sin(price). Could create false urgency. |
| **Cabin class silently wrong** | High | Medium | All searches are economy regardless of UI selection. |
| **Redirect failure** | Medium | Medium | If `flight.link` is missing/malformed from API, fallback URL construction may produce invalid Aviasales URLs. |

### Ranked by Risk (Likelihood × Impact)

1. 🔴 **Travelpayouts cache miss returning 0 results** — most common failure mode
2. 🔴 **Stale fares** — user clicks through to find price has changed
3. 🔴 **Cabin class silently ignored** — deceptive to users
4. 🟠 **JWT rejection for anonymous users** — if anon key isn't sufficient
5. 🟠 **Currency inconsistency** — confusing displayed prices
6. 🟡 **Timeout errors** — on slow API responses
7. 🟡 **Simulated urgency badges** — potential consumer harm

---

## SECTION 8 — UI Intelligence Audit

### Feature Classification

| Feature | Classification | Wording Concern | Details |
|---|---|---|---|
| **Best Deal** | Calculated from current results | LOW | Uses `deal_score` which is relative to current result set. Reasonable. |
| **Cheapest** | Calculated from current results | NONE | Just the min price. Accurate. |
| **Fastest** | Calculated from current results | NONE | Just the min duration. Accurate. |
| **Deal Score** | Calculated from current results | MEDIUM | "Excellent Deal" (score≥80) is relative to only the returned results, not the market. A batch of expensive flights all get high scores. |
| **Price Confidence** | Calculated from current results | **HIGH** ⚠️ | Tooltip says "based on historical data and current market trends" (`PriceConfidenceIndicator.tsx` L:91-93). In reality it's computed from deviation from the mean of the current batch of flights (`useFlightSearch.ts` L:73-95). This claim is **misleading**. |
| **Price Trend** | Calculated from current results | **HIGH** ⚠️ | "rising"/"falling"/"stable" labels are derived from the same deviation-from-mean formula. Not based on time-series data. |
| **Average Price** | Calculated from current results | LOW | "vs. average" is just the mean of returned flights, but could be interpreted as market average. |
| **Flexible Dates Matrix** | **SIMULATED** 🔴 | **CRITICAL** | Uses `Math.random()` (`FlightResults.tsx` L:41: `const variance = (Math.random() - 0.3) * 0.4`). Comment says "would come from backend in production". Displays prices as if they are real. |
| **Price Calendar** | Provider-backed | NONE | Uses Travelpayouts `month-matrix`. Actually real data. ✅ |
| **Weekly Heatmap** | Provider-backed | NONE | Uses Travelpayouts `month-matrix`. Actually real data. ✅ |
| **Nearby Airport suggestions** | **NOT IMPLEMENTED** | N/A | `nearby_airport_savings` field never populated. Component conditionally renders only if data exists. Effectively dead code. |
| **Long Layover warning** | Calculated locally | LOW | Detects >8h connections. Reasonable. |
| **Overnight Stop warning** | Calculated locally | LOW | Detects overnight layovers. Reasonable. |
| **Self-Transfer warning** | Calculated locally | LOW | Detects different airlines on segments. Reasonable. |
| **Airport Change warning** | **NOT IMPLEMENTED** | N/A | Defined in type system but `detectWarnings()` never produces it. |
| **Seats Left badge** | **SIMULATED** 🔴 | **CRITICAL** | `UrgencyBadges.tsx` L:14-19: `const hash = Math.abs(Math.sin(price * 9301 + 4927)) * 10`. Deterministic based on price. ~30% of flights show "X seats left". |
| **Price Trend badges** | Calculated from results | MEDIUM | "% below avg" is from current batch, not market. |
| **"Departs in X days" badge** | Real calculation | NONE | Uses actual date arithmetic. Accurate. |
| **"Hot Deal" badge** | Calculated from results | LOW | Based on deal_score ≥85. |
| **Route Page "Prices from"** | **FAKE** 🔴 | **CRITICAL** | `RoutePage.tsx` L:52-55: `const hash = (origin + dest).split("").reduce((a, b) => a + b.charCodeAt(0), 0); return 150 + (hash % 800)`. Deterministic fake price. |
| **"Prices shown are estimates"** | Disclaimer exists | LOW | RoutePage includes a disclaimer (L:262-266) but it's easy to miss. |

### Summary of Misleading Features

**CRITICAL (should be removed or fixed immediately)**:
1. Flexible Dates Matrix — pure `Math.random()` simulation
2. Seats Left badge — `Math.sin(price)` simulation  
3. Route Page "Prices from" — character hash fake price

**HIGH (wording is deceptive)**:
4. Price Confidence tooltip claims "historical data" but is just batch-relative
5. Price Trend labels suggest time-series analysis but are batch-relative

---

## SECTION 9 — Anonymous Access and Authentication

### Supabase Configuration

- **File**: `supabase/config.toml`
- **Project ID**: `nrxupicbzblbxolyxksg`

### Function `verify_jwt` Settings

| Function | Explicit in config.toml? | `verify_jwt` | Implication |
|---|---|---|---|
| `search-flights` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `get-redirect` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `sitemap` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `search-airports` | ✅ Listed | `false` | Public access |
| `get-price-calendar` | ✅ Listed | `false` | Public access |
| `track-affiliate-click` | ✅ Listed | `false` | Public access |
| `get-popular-directions` | ✅ Listed | `false` | Public access |
| `send-price-alert` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `check-price-alerts` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `send-welcome-email` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `send-bulk-email` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `unsubscribe` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `get-ads` | ❌ NOT listed | `true` (default) | Requires valid JWT |
| `get-admin-stats` | ❌ NOT listed | `true` (default) | Requires valid JWT |

### Supabase Client Initialization

- **File**: `src/integrations/supabase/client.ts`
- Uses `createClient(url, publishableKey)` — this is the **anon client**
- Auth config: localStorage, persistSession=true, autoRefreshToken=true
- No service_role key used on client side

### Request Headers (useFlightSearch.ts L:214-223)

```typescript
const session = (await supabase.auth.getSession()).data.session;
const authToken = session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';

const response = await fetch(`${SUPABASE_URL}/functions/v1/search-flights`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken}`,
    'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || '',
  },
  body: JSON.stringify(requestBody),
  signal: abortControllerRef.current.signal,
});
```

### Analysis

1. **Can an unauthenticated visitor search flights?**  
   **Likely YES** — The frontend falls back to using the anon publishable key as the Authorization token when no session exists. Supabase Edge Functions with `verify_jwt=true` typically accept the anon key for basic access (the anon key IS a valid JWT, just with an `anon` role). **Confidence: 80%** — This depends on Supabase's exact behavior with anon key JWTs against functions with `verify_jwt=true`.

2. **Is an anon key required?**  
   **YES** — The `apikey` header is always sent.

3. **What happens with no signed-in session?**  
   The anon key is used as the authorization token. This should work for `search-flights` at the Supabase level. However, `trackAffiliateEvent` (which writes to `affiliate_clicks` table) may fail if RLS policies require authentication.

4. **Theoretical risks**:  
   - If Supabase tightens `verify_jwt=true` to reject anon-key JWTs, `search-flights` and `get-redirect` would break for anonymous users
   - `search-flights` should be explicitly set to `verify_jwt=false` in config.toml for clarity and reliability
   - `get-redirect` should also be explicitly configured

### get-redirect Authorization Gap

- **File**: `src/services/travelApi.ts` lines 191-194
- The `getRedirectUrl` function makes a GET request with `Content-Type` header but **no Authorization header or apikey header**. This means the `get-redirect` Edge Function receives a request without JWT verification. Since it's not in config.toml (default `verify_jwt=true`), this should FAIL for anonymous users.
- **However**, the FlightResults page doesn't use `travelApi.getRedirectUrl` directly — it calls it from `handleBookNow` which is in FlightResults.tsx, and the redirect URL is generated server-side.

Actually wait — looking more carefully at `travelApi.ts` L:191-194:
```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/get-redirect?...`, {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

This has NO auth headers. But in `FlightResults.tsx`, `handleBookNow` calls `getRedirectUrl` which builds the URL and fetches without headers. This would fail if `verify_jwt=true`.

BUT — `FlightResults.tsx` L:178-190 actually calls `getRedirectUrl` from the same `travelApi.ts` service. So this IS a potential failure point.

**CONFIRMED**: The `get-redirect` endpoint is called without auth headers from `travelApi.ts` L:197. If `verify_jwt` is truly `true` (since it's not in config.toml), this call will fail with a 401 for unauthenticated users. **Confidence: 70%** — depends on Supabase runtime behavior with missing auth vs anon key auth.

---

## SECTION 10 — Affiliate Tracking and Redirect Flow

### Affiliate Flow Trace

```
1. SEARCH EVENT (useFlightSearch.ts L:192-199)
   trackAffiliateEvent({type:'flight', action:'search', origin, destination, ...})
   └─> supabase.from('affiliate_clicks').insert({...})   ← Direct DB write from client

2. CLICK EVENT (FlightResults.tsx L:161-174, handleBookNow)
   trackAffiliateEvent({type:'flight', action:'click', origin, destination, ...})
   └─> supabase.from('affiliate_clicks').insert({...})   ← Direct DB write from client

3. GET REDIRECT URL (FlightResults.tsx L:178-190)
   getRedirectUrl({id, type:'flight', link: flight.link, origin, destination, ...})
   └─> GET /functions/v1/get-redirect?id=...&link=...&origin=...&...
       (travelApi.ts L:191-198)

4. REDIRECT EDGE FUNCTION (get-redirect/index.ts)
   If params.link exists → decodeURIComponent(params.link) → uses as-is
   Else builds Aviasales URL:
     /search/{origin}{depDate}{destination}{retDate}1?origin_iata=...&marker={MARKER_ID}
   Returns: {success, redirectUrl, partner, type}

5. INTERSTITIAL PAGE
   window.location.href = /redirect?url={encodeURIComponent(redirectUrl)}
   └─> BookingRedirect.tsx renders for 2.5s
       └─> window.location.assign(safeUrl) → Aviasales.com
```

### Marker/Affiliate ID

- **File**: `supabase/functions/get-redirect/index.ts` L:36
- Uses `Deno.env.get("MARKER_ID")` 
- Only used when building Aviasales URLs programmatically (fallback path)
- When `params.link` is provided (normal path), the link from Travelpayouts API already contains the marker embedded in the URL from Travelpayouts

### Failure Points

| Point | Risk | Description |
|---|---|---|
| **Missing link from API** | Medium | If Travelpayouts doesn't return a `link`, the fallback URL uses `get-redirect` to build one. This fallback includes `MARKER_ID` as a query param, but the Aviasales URL format may be incorrect. |
| **get-redirect auth** | Medium | No auth headers sent to `get-redirect` endpoint (travelApi.ts L:197). May fail if JWT required. |
| **Double-encoding** | Low | The redirect URL goes through `encodeURIComponent` twice — once in `handleBookNow` and again potentially in the interstitial page. `BookingRedirect.tsx` has a `normalizeAffiliateUrl` function that repeatedly decodes to handle this. |
| **Malformed URLs** | Low | The `normalizeAffiliateUrl` handles relative paths, protocol-relative URLs, and missing schemes. Robust. |
| **Lost attribution** | Medium | If the user bookmarks the Aviasales page and returns later, the session-based marker may be lost. No server-side click tracking at redirect time (only client-side `trackAffiliateEvent` before navigation). |
| **Missing analytics** | Medium | `trackAffiliateEvent` writes directly to `affiliate_clicks` table from the client. If the user's network drops or the page unloads, the click event may not be recorded. No `navigator.sendBeacon` or server-side click logging. |
| **RLS on affiliate_clicks** | Unknown | If `affiliate_clicks` has RLS policies requiring authenticated users, anonymous click tracking silently fails (caught by try/catch, logged to console only). |
| **UX: redirect page** | Low | 2.5-second interstitial with animation. Well-designed but adds friction. The "Continue to Partner" link opens in new tab. |

### Security Concerns

1. **Client-side affiliate tracking** — The `affiliate_clicks` table is written from the client using the anon key. This means anyone can inject arbitrary records into this table by sending requests to the Supabase REST API with the anon key.

2. **No CSRF protection** — The `trackAffiliateEvent` function makes an unauthenticated write. If RLS is not configured, this is vulnerable to data pollution.

3. **URL injection via link parameter** — The `get-redirect` Edge Function uses `decodeURIComponent(params.link)` directly as the redirect URL. While the interstitial page validates URLs, the Edge Function itself does not validate that the link goes to an expected domain.

---

## SECTION 11 — Performance and Scalability

### Architecture Assessment by Load

| Load | Edge Function | Travelpayouts API | Database | Client | Verdict |
|---|---|---|---|---|---|
| **1,000/day** (~1/min) | ✅ Trivial | ✅ Within free tier typically | ✅ Low write volume | ✅ No issue | **Works** |
| **10,000/day** (~7/min) | ✅ Manageable | ⚠️ Rate limits unknown | ✅ Low volume | ✅ No issue | **Should work** |
| **100,000/day** (~70/min) | ⚠️ Cold starts could slow | 🔴 Rate limits likely | ⚠️ `affiliate_clicks` grows | ⚠️ Client processing of large results | **Needs optimization** |
| **1,000,000/day** (~700/min) | 🔴 Deno Deploy costs spike | 🔴 Requires enterprise plan | 🔴 Needs partitioning | 🔴 Bundle size, client filtering | **Not viable without major changes** |

### Specific Findings

1. **No caching**: Every search hits Travelpayouts API. No Edge Function response caching. No client-side caching (e.g., React Query is in package.json but `useFlightSearch` uses raw `useState`/`useEffect`). Repeated searches for the same route within a session re-fetch everything.

2. **No request deduplication**: If the user rapidly clicks "Search" multiple times, multiple requests are sent (the previous one is aborted, but a new one starts). No debounce.

3. **No rate limiting**: No client-side or server-side rate limiting visible. Travelpayouts API may impose its own limits.

4. **All filtering is client-side**: The entire result set is filtered and sorted in the browser. With large result sets (unlikely with current Travelpayouts endpoint), this could slow the UI.

5. **`affiliate_clicks` write on every search/click**: Direct Supabase insert. At scale, this table grows unbounded. No visible cleanup/archival strategy.

6. **Cost risks at scale**:
   - Supabase Edge Function invocations (billed per invocation)
   - Deno Deploy CPU time
   - Travelpayouts API (enterprise plan needed at scale)
   - `affiliate_clicks` database writes (included in Supabase plan, but could hit limits)

7. **Timeout handling**: 30-second client timeout. Travelpayouts response times not measured or logged.

---

## SECTION 12 — SEO Compatibility

### Architecture: React/Vite SPA

- **File**: `vite.config.ts` — Standard Vite SPA build, no SSR
- **File**: `index.html` — Single entry point with `<div id="root"></div>`

### SEO Assessment

| Page Type | Crawlable? | Indexable? | Structured Data? | Assessment |
|---|---|---|---|---|
| Homepage (`/`) | ⚠️ JS required | ⚠️ Depends on Google rendering | ✅ WebSite + SearchAction | Google renders React, but slower than SSR |
| Flight Results (`/flights?...`) | ⚠️ JS required | ⚠️ May not be indexed | ✅ FlightSearchSchema | Query params may not be indexed |
| Route Pages (`/flights/:slug`) | ⚠️ JS required | ⚠️ May work | ✅ FAQPage | Good metadata via Helmet, DB-driven content |
| Country Pages (`/:slug`) | ⚠️ JS required | ⚠️ May work | ✅ FAQPage + WebPage + Breadcrumbs | Good schema, DB-driven |
| Blog Posts | ⚠️ JS required | ⚠️ May work | Not checked | — |
| Destination Pages (`/d/:slug`) | ⚠️ JS required | ⚠️ May work | Not checked | — |

### Sitemap

- **Dynamic Sitemap**: `supabase/functions/sitemap/index.ts`
- Accessible at: `https://bookingsfinder.com/sitemap.xml` (via `robots.txt` reference)
- Includes: static pages, hardcoded route pages (~80), blog posts from DB, country pages from DB, press releases from DB
- **Re-route**: Route pages are listed in sitemap at `/${routeSlug}` (e.g., `/london-to-dubai`), but the App.tsx routing shows they're at `/flights/:slug`. This appears to be a **sitemap URL mismatch** — the sitemap lists `/{slug}` but the route is `/flights/{slug}`.

### Key SEO Concerns

1. **SPA without SSR**: All content requires JavaScript execution. Google claims to render JS, but it's slower and less reliable than server-rendered HTML. Bing, DuckDuckGo, and other crawlers may not render JS at all.

2. **Route page URL mismatch**: Sitemap shows `/{slug}` but actual route is `/flights/{slug}`. Also, `/:slug` in App.tsx routing is a catch-all that renders `CountryLandingPage`, not `RoutePage`. The `CountryLandingPage` component will try to load a country page for a slug like "london-to-dubai", which likely won't match. This means **ALL route pages in the sitemap may render the wrong component or fail**.

3. **Canonical URLs**: Correctly set via `react-helmet-async` on each page.

4. **Structured Data**: Good implementation of JSON-LD for WebSite, FAQPage, BreadcrumbList. However, FlightSearchSchema component exists but JSON-LD for flight results is not the standard `Flight` schema type.

5. **robots.txt**: Well-configured. Disallows `/admin` and `/redirect`.

---

## SECTION 13 — Architecture Options

### Option A: Improve Current Travelpayouts Architecture

**Benefits**:
- Fastest path — already partially built
- No provider migration needed
- Affiliate relationship already established
- Low regulatory overhead (already registered)

**Limitations**:
- `prices_for_dates` endpoint fundamentally wrong for interactive search
- Would need to switch to `aviasales/v3/latest` or `flight_search` endpoint
- Travelpayouts data is cached, never live
- Limited data richness (no cabins, bags, seats, detailed segments)
- Still linking out to Aviasales, not owning the customer
- Brand dilution — users book on Aviasales

**Development Complexity**: Medium (swap endpoint, rebuild data mapping, fix UI features)

**Operating Cost**: Low-Medium (Travelpayouts API is free/low-cost for affiliates)

**Revenue Model**: Affiliate commission only (Travelpayouts rev-share)

**Customer Ownership**: None — users book on Aviasales

**Support Burden**: Low (booking issues handled by Aviasales/airlines)

**Scalability**: Limited by Travelpayouts rate limits and cached data freshness

**Time to Launch**: 2-4 weeks to fix current issues

---

### Option B: Migrate to Duffel

**Benefits**:
- Live GDS inventory — real availability, real-time pricing
- Rich data: seats, bags, cabins, detailed segments, aircraft
- Direct booking API — could build native checkout
- Modern REST API with excellent documentation
- Build customer relationships (own the booking flow)

**Limitations**:
- Requires commercial agreement with Duffel
- More complex integration (webhooks, payment handling)
- May need IATA accreditation or work through Duffel's accreditation
- Higher per-transaction costs
- Must handle cancellations, refunds, customer service
- Content limited to Duffel's airline partnerships (~100+ airlines)

**Development Complexity**: High (4-6 months for full integration)

**Operating Cost**: Medium-High (Duffel per-search + per-booking fees, payment processing)

**Revenue Model**: Markup on fares, service fees, upsells (bags, seats, insurance)

**Customer Ownership**: Full — native booking experience

**Support Burden**: High — responsible for booking issues

**Scalability**: High — Duffel designed for production scale

**Time to Launch**: 4-6 months

---

### Option C: Hybrid Architecture

**Benefits**:
- Best of both worlds — keep Travelpayouts for price comparison/meta-search, add Duffel for direct booking
- Gradual migration — test with one route or airline first
- Diversified revenue — affiliate + direct booking markup
- Risk mitigation — not dependent on single provider

**Limitations**:
- Most complex to build and maintain
- Two API integrations to manage
- Potential for inconsistent pricing between providers
- Higher initial development cost

**Development Complexity**: Very High (6-9 months for complete hybrid)

**Operating Cost**: Medium (two provider costs, more infrastructure)

**Revenue Model**: Hybrid — affiliate + direct booking + upsells

**Customer Ownership**: Partial — own the comparison, optionally own the booking

**Support Burden**: Medium — hybrid of both models

**Time to Launch**: 3-4 months for MVP hybrid, 6-9 months for full

---

### Ranking for BookingsFinder

1. **Option A (Improve Travelpayouts)** — Best short-term choice. Fix the endpoint, remove simulated features, add transparency. Takes 2-4 weeks. Low risk.

2. **Option C (Hybrid)** — Best medium-term strategy. Start with improved Travelpayouts, gradually introduce Duffel for high-value routes. Mitigates risk.

3. **Option B (Duffel Only)** — Too risky as a full replacement. High cost, long timeline. Better as part of a hybrid strategy.

---

## SECTION 14 — Reuse vs Rebuild

### Components Worth Preserving

| Component | Reason |
|---|---|
| `FlightCard.tsx` | Well-designed, comprehensive. Would work with any data source after remapping. |
| `FlightFiltersPanel.tsx` | Good filter UI. Reusable with any result set. |
| `FlightWarningBadges.tsx` | Good warning display. Detection logic needs work but UI is solid. |
| `BookingRedirect.tsx` | Excellent interstitial page with FTC compliance. Reusable. |
| `ModernFlightSearch.tsx` | Polished search form. May need updated fields for new provider. |
| `MobileFlightSearch.tsx` | Good mobile UX. |
| `LocationCombobox.tsx` | Functional airport search with fuzzy matching. |
| `SearchingIndicator.tsx` | Good loading state. |
| `FlightCardSkeleton.tsx` | Good skeleton loading. |
| `PriceAlertDialog.tsx` | Good feature, needs backend. |
| `FlightQuickSelect.tsx` | Good UX pattern. |
| `SortDropdown.tsx` | Simple, functional. |

### Hooks Worth Preserving

| Hook | Reason |
|---|---|
| `useFlightSearch.ts` | Core search logic is sound. Main issue is data source, not hook architecture. |
| `useGeoLocation.ts` | Good geolocation with caching. |
| `usePriceCalendar.ts` | Works correctly with real API. |

### Backend Functions Worth Preserving

| Function | Reason |
|---|---|
| `search-airports` | Works well, standalone, fuzzy search. |
| `get-price-calendar` | Uses real Travelpayouts data. |
| `get-popular-directions` | Uses real Travelpayouts data. |
| `_shared/cors.ts` | Clean CORS handling. |
| `_shared/validation.ts` | Good Zod validation pattern. |
| `sitemap` | Dynamic sitemap generation (needs URL fix). |

### Database Tables Worth Preserving

| Table | Inferred from migrations |
|---|---|
| `affiliate_clicks` | For analytics |
| `route_price_cache` | For caching |
| `seo_route_pages` | For route landing pages |
| `country_landing_pages` | For country pages |
| `blog_posts` | For content |
| `price_alerts` | For alert feature |

### Features That Should Be Removed

1. **FlexibleDatesMatrix (mock version)** — Replace with real data from month-matrix
2. **Seats Left urgency badge** — Remove the `Math.sin` simulation entirely
3. **Price Confidence tooltip text** — Remove "based on historical data" claim
4. **RoutePage fake prices** — Replace with actual API calls or remove price display
5. **Empty "Baggage" section in FlightCard** — Either implement or remove "Details at booking"

### Features That Should Be Rebuilt

1. **Deal Score** — Connect to real market data (Travelpayouts month-matrix for route averages)
2. **Price Confidence** — Either implement with real historical data or clearly label as "relative to current search"
3. **Cabin class filtering** — Must reach the API. Switch to an endpoint that supports it.
4. **Passenger breakdown** — Send adults/children/infants to API
5. **Nearby airports** — Either implement or remove the UI
6. **Route Page** — Connect to real price data, fix URL routing

### Features That Are Currently Misleading or Premature

1. "500+ Airlines" — Marketing claim, not verified
2. "50M+ Happy Travelers" — Marketing claim, not verified
3. "24/7 Customer Support" — BookingsFinder doesn't handle bookings
4. "Real-time availability confirmed" (on redirect page) — Data is cached, not real-time
5. "Price comparison complete" — Only compares cached fares from one provider
6. "Great deals available!" — Based on relative deal score, not market data

---

## SECTION 15 — Final Verdict

### Brutal but Fair Assessment

BookingsFinder is a **well-designed facade over a single Travelpayouts cached-data endpoint**. The UI is polished, the component architecture is clean, and the user flow works end-to-end. However, the core flight-search experience is built on the wrong API endpoint (`prices_for_dates` instead of `latest` or `flight_search`), and multiple "intelligence" features are simulated using random number generators or relative comparisons presented as absolute market insights.

The site is **functional as an affiliate price-comparison widget** but does not yet deliver the depth of flight search that the UI promises. The simulated features create regulatory risk and erode user trust if discovered.

### Top 10 Confirmed Findings

1. Only **one Travelpayouts endpoint** is used for flight search: `aviasales/v3/prices_for_dates` — a cached fare endpoint, not live inventory. (travelpayouts.ts:56)
2. **Cabin class is collected in the UI but completely ignored** by the backend. All searches are effectively economy. (search-flights/index.ts Zod schema has no cabin_class field)
3. **Flexible Dates Matrix uses `Math.random()`** to generate prices. Explicitly labeled as "mock" in comments. (FlightResults.tsx:41)
4. **"Seats left" urgency badge uses `Math.sin(price * 9301)`** — deterministic pseudo-random. (UrgencyBadges.tsx:14-19)
5. **Route Page prices are a hash of city names** — `150 + (charCodeSum % 800)`. (RoutePage.tsx:52-55)
6. **`arrive_time` is mapped from `return_at`** — wrong for one-way flights (null) and semantically wrong for round-trip. (travelpayouts.ts:92)
7. **Currency defaults conflict** across 6 different layers: geo→USD vs service→AUD vs Edge Function→USD. (currency audit section)
8. **`search-flights` Edge Function is NOT in `config.toml`**, meaning it defaults to `verify_jwt=true`, but the frontend sends only the anon key for unauthenticated users. (config.toml)
9. **`get-redirect` endpoint called without auth headers** from `travelApi.ts`, which may fail for anonymous users. (travelApi.ts:191-198)
10. **Price Confidence tooltip claims "based on historical data"** but is actually calculated from the deviation of the current batch's mean. (PriceConfidenceIndicator.tsx:91-93)

### Top 10 Risks

1. 🔴 Consumer deception from simulated features (flexible dates, seats left, fake route prices)
2. 🔴 Regulatory risk (FTC, ACCC, EU consumer law) from misleading "intelligence" features
3. 🔴 Zero results for routes not in Travelpayouts cache
4. 🔴 Stale/outdated fares — user clicks through to find price changed
5. 🟠 Cabin class silently wrong — business class searches return economy prices
6. 🟠 Anonymous users may fail to get redirect URLs (JWT issue)
7. 🟠 Currency display inconsistency across components
8. 🟠 Route page sitemap URLs don't match actual routing
9. 🟡 Lost affiliate attribution (client-side tracking, no sendBeacon)
10. 🟡 SPA without SSR limits SEO for key landing pages

### Top 10 Reusable Assets

1. FlightCard component (well-designed)
2. BookingRedirect interstitial page (FTC-compliant)
3. search-airports Edge Function (fuzzy search, standalone)
4. get-price-calendar Edge Function (real data)
5. get-popular-directions Edge Function (real data)
6. FlightFiltersPanel component
7. ModernFlightSearch/MobileFlightSearch UI
8. Shared CORS/validation utilities
9. Geo-location hook with caching
10. Dynamic sitemap generator (with URL fix)

### Top 10 Things to Remove or Replace

1. FlexibleDatesMatrix mock data → replace with month-matrix data
2. `Math.sin` seats-left simulation → remove entirely
3. RoutePage fake price generation → connect to real API
4. Price Confidence "historical data" claim → relabel or implement
5. `arrive_time` = `return_at` mapping → fix for one-way flights
6. Empty Baggage section → remove or implement
7. Unimplemented NearbyAirport suggestions → remove dead code
8. "50M+ Happy Travelers" → remove or add source
9. "Real-time availability" claim on redirect → change to "Prices compared"
10. Multiple conflicting currency defaults → standardize

### Top 20 Improvements (Priority Order)

1. **Switch to `aviasales/v3/latest` endpoint** for real flight search
2. **Remove all simulated features**: flexible dates mock, seats-left, route page fake prices
3. **Add `search-flights` and `get-redirect` to `config.toml`** with `verify_jwt = false`
4. **Fix `arrive_time` mapping** (don't use `return_at` for outbound arrival)
5. **Wire cabin class through** to the API (requires endpoint that supports it)
6. **Standardize currency defaults** — single source of truth
7. **Fix Route Page routing** — sitemap URLs should match actual routes
8. **Add server-side affiliate click tracking** (webhook or sendBeacon)
9. **Implement proper children/infant handling** in search
10. **Add client-side caching** for repeated searches (React Query)
11. **Add `navigator.sendBeacon`** for click tracking reliability
12. **Remove or reword misleading marketing claims** on redirect page
13. **Add actual baggage information** from API or remove section
14. **Implement SSR for SEO-critical pages** (route pages, country pages)
15. **Fix Price Calendar currency** to match geo-detected currency
16. **Add `apikey` header to `getRedirectUrl` call** in travelApi.ts
17. **Add rate limiting** at Edge Function level
18. **Add response caching** at Edge Function level (stale-while-revalidate)
19. **Implement proper error boundaries** with fallback UI
20. **Add structured logging** for search performance metrics

### Recommended Next Technical Phase

**Phase 1 — Fix & Stabilize (2 weeks)**
- Remove all simulated features (flexible dates mock, seats-left, fake route prices)
- Fix `arrive_time` mapping
- Configure `config.toml` properly for all Edge Functions
- Standardize currency handling
- Fix `getRedirectUrl` auth headers

**Phase 2 — Upgrade Provider Integration (4 weeks)**
- Switch flight search to `aviasales/v3/latest` or `flight_search`
- Wire cabin class and passenger breakdown to API
- Rebuild data mapping for richer segment data
- Connect FlexibleDates to real month-matrix data
- Implement React Query for client-side caching

**Phase 3 — Enhance & Scale (6 weeks)**
- Add SSR for SEO-critical pages
- Implement proper deal scores with market data
- Add error boundaries and improved error states
- Add server-side analytics
- Performance optimization

### Recommended Next Business Phase

1. **Transparency audit**: Review all copy for misleading claims
2. **Legal review**: Have counsel review simulated features for consumer law compliance
3. **Provider diversification**: Explore adding a second data source (Duffel, Skyscanner API)
4. **Revenue model clarity**: Decide whether to remain pure affiliate or add direct booking
5. **SEO investment**: SSR migration for key landing pages to capture organic traffic

---

*Report generated by architectural inspection of the complete codebase. All findings confirmed from source code unless marked as inference.*
*File paths and line numbers are based on the code as of 2026-07-19.*
