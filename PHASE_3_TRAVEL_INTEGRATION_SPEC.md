# Phase 3: Travel Integration — Implementation Specification

**Branch**: `bookingsfinder-v2-phase3-travel-integration`
**Date**: 2026-07-22
**Status**: Specification — implementation deferred

---

## Table of Contents

1. [Current-State Audit](#1-current-state-audit)
2. [Existing Reusable Code](#2-existing-reusable-code)
3. [Gaps and Risks](#3-gaps-and-risks)
4. [Recommended Architecture](#4-recommended-architecture)
5. [Exact Files to Create](#5-exact-files-to-create)
6. [Exact Files to Modify](#6-exact-files-to-modify)
7. [Database Migration Requirements](#7-database-migration-requirements)
8. [Supabase Function Requirements](#8-supabase-function-requirements)
9. [Environment Variables](#9-environment-variables)
10. [Route Changes](#10-route-changes)
11. [UI States and Copy](#11-ui-states-and-copy)
12. [Security and Privacy Controls](#12-security-and-privacy-controls)
13. [Test Plan](#13-test-plan)
14. [Rollout Plan](#14-rollout-plan)
15. [Rollback Plan](#15-rollback-plan)
16. [Acceptance Criteria](#16-acceptance-criteria)
17. [Recommended Implementation Order](#17-recommended-implementation-order)
18. [Commit Plan](#18-commit-plan)

---

## 1. Current-State Audit

### 1.1 Travel Integration Status

Travelpayouts is **already partially integrated** through Supabase Edge Functions:

| Component | Status | Details |
|---|---|---|
| Flight search API | **Operational** | `search-flights` Edge Function → Travelpayouts `/aviasales/v3/prices_for_dates` |
| Price calendar | **Operational** | `get-price-calendar` → Travelpayouts `/v2/prices/month-matrix` |
| Popular directions | **Operational** | `get-popular-directions` → Travelpayouts `/v1/city-directions` |
| Route prices | **Operational** | `get-route-prices` → batch Travelpayouts queries |
| Redirect/resolve | **Operational** | `get-redirect` → builds Aviasales/Hotellook URLs with marker |
| Affiliate tracking | **Operational** | `affiliate_clicks` table → `trackAffiliateEvent()` in `travelApi.ts` |
| Booking interstitial | **Operational** | `/redirect` → `BookingRedirect.tsx` (2.5s countdown, trust signals) |
| Flight results page | **Operational** | `/flights` → `FlightResults.tsx` with filters, cards, price tools |
| Hotel search API | **Partial** | `searchHotels()` exists in `travelApi.ts`; `HotelResults` page imported in router |
| White Label (flights.bookingsfinder.com) | **Not configured** | Redirect uses `aviasales.com/search` directly; no CNAME/subdomain |

### 1.2 Affiliate Flow (Current)

```
User searches flights → Edge Function → Travelpayouts API
                                    ↓
                            search-flights returns array
                                    ↓
                     FlightResults displays cards with prices
                                    ↓
                     User clicks "Book" → getRedirectUrl()
                                    ↓
                            get-redirect builds Aviasales URL
                            + marker ID for commission
                                    ↓
                     window.location = /redirect?url=...
                                    ↓
                     BookingRedirect interstitial (2.5s)
                     → window.location.assign(partner URL)
```

### 1.3 What Is Missing

1. **Trip Budget Planner → Flight search bridge**: No "Search real flights" CTA from the Trip Budget Planner
2. **Central travel partner config**: Travelpayouts token/marker is embedded in Edge Functions only; no client-side configuration layer
3. **Hotel search UI**: `searchHotels()` API exists, `HotelResults` page is routed, but hotel card/filter/search UX is unimplemented
4. **Affiliate tracking enhancement**: Current tracking uses anonymous DB inserts; has no session/visit correlation or source-page tracking
5. **White Label subdomain**: `flights.bookingsfinder.com` CNAME not configured; redirect shows `aviasales.com/search` URLs
6. **Trust copy on handoff**: Flight cards say "Book Now" — should say "Check availability" or "View on partner site"
7. **No planner-to-search parameter validation**: Direct URL manipulation could produce malformed search requests

---

## 2. Existing Reusable Code

### 2.1 Services & APIs

| File | What It Provides |
|---|---|
| `src/services/travelApi.ts` | `searchFlights()`, `searchHotels()`, `getRedirectUrl()`, `trackAffiliateEvent()`, `FlightSearchParams`, `HotelSearchParams` |
| `src/hooks/useFlightSearch.ts` | Full flight search state machine: loading, error, results, filters, sort, pagination |
| `src/lib/supabaseConfig.ts` | `getSupabaseUrl()`, `getFunctionUrl()`, `isSupabaseConfigured()` |

### 2.2 UI Components

| Component | Reusable For |
|---|---|
| `src/pages/FlightResults.tsx` | Full flight search results page — already working |
| `src/pages/BookingRedirect.tsx` | Interstitial redirect page with trust signals, auto-redirect |
| `src/components/flights/FlightCard.tsx` | Individual flight result card |
| `src/components/flights/FlightFiltersPanel.tsx` | Sidebar filters |
| `src/components/flights/FlightCardSkeleton.tsx` | Loading skeleton |
| `src/components/flights/EmptyFlightState.tsx` | Error/empty states |
| `src/components/flights/SearchingIndicator.tsx` | Progress indicator |
| `src/components/trip-cost/TripCostPlanner.tsx` | Full planner state + summary |
| `src/components/trip-cost/useTripCostPlanner.ts` | Planner state hook |

### 2.3 Edge Functions (23 total, 5 travel-relevant)

| Function | Purpose | Deploy Priority |
|---|---|---|
| `search-flights` | Flight search via Travelpayouts | Required for launch |
| `get-redirect` | Build affiliate redirect URL | Required for launch |
| `get-route-prices` | Batch route price cache | Required for PopularRoutes |
| `get-popular-directions` | Popular routes from origin | Optional |
| `get-price-calendar` | Price calendar matrix | Optional |
| `_shared/travelpayouts.ts` | Shared Travelpayouts API client | Foundation (not a deployable function) |

### 2.4 Database

| Table | Use |
|---|---|
| `affiliate_clicks` | Tracks all outbound partner clicks (type, action, origin, destination, price, redirect_url) |
| `route_price_cache` | Cached Travelpayouts prices with expiry |

---

## 3. Gaps and Risks

### 3.1 High-Risk Items

| Risk | Severity | Mitigation |
|---|---|---|
| Travelpayouts API key exposed if placed in client-side code | **High** | Keep token in Edge Function only; client never accesses Travelpayouts directly |
| Redirect showing `aviasales.com` breaks White Label promise | **Medium** | Configure `flights.bookingsfinder.com` CNAME via Travelpayouts dashboard (owner action) |
| Malformed planner-to-search mapping produces bad search requests | **Medium** | Validate origin/destination before constructing search URL; use IATA code lookup |
| Affiliate tracking failure blocks user redirect | **Medium** | Fire-and-forget tracking; never await tracking before redirect |
| Hotel search page not yet built | **Low** | Use existing `searchHotels()` API; start with simple search form + partner handoff |

### 3.2 Trust & Compliance Risks

| Risk | Mitigation |
|---|---|
| "Book Now" implies BookingsFinder is the merchant | Change to "Check availability" or "View on partner site" |
| "Best price" / "Lowest fare" language | Already removed in Phase 0 — verify no regression |
| Price shown as guaranteed | Disclaimers already present — verify consistency across all handoff points |
| Commission not disclosed | Affiliate disclosure linked from footer and interstitial |

---

## 4. Recommended Architecture

### 4.1 Central Travel Partner Configuration

Create `src/lib/travelConfig.ts` as the client-safe configuration layer:

```
travelConfig.ts
  ├── TRAVEL_PARTNERS (static metadata: name, id, website, disclosure)
  ├── getTravelPartnerConfig(partnerId) → partner metadata
  ├── buildFlightSearchUrl({ origin, destination, dates, travellers })
  ├── buildHotelSearchUrl({ destination, dates, guests })
  ├── validateFlightSearchParams(params) → ValidationResult
  └── getTravelPartnerDisclosure(partnerId) → trust copy string
```

This layer:
- Never contains API tokens (those stay in Edge Functions)
- Handles URL construction with correct affiliate parameters
- Provides trust copy for each partner
- Validates search parameters before constructing URLs
- Works whether or not a White Label CNAME is configured

### 4.2 Planner-to-Flight Bridge

Add a `FlightHandoffButton` component inside the TripCostPlanner summary panel:

```
TripCostPlanner summary
  └── "Search real flights" action
       ├── Validates: origin, destination, departure date
       ├── Maps planner state → FlightSearchParams
       ├── Opens /flights?origin=SYD&destination=DPS&departureDate=2026-08-15&passengers=2
       └── Disabled with helper text when fields incomplete
```

### 4.3 Affiliate Tracking Enhancement

Enhance `trackAffiliateEvent()` to include:
- `source_page`: The page from which the user initiated the booking
- `session_id`: Anonymous session identifier for visit correlation
- `placement`: Context where the CTA appeared (e.g., "flight_results_card", "planner_summary")

The existing `affiliate_clicks` table already supports `INSERT` with `WITH CHECK (true)` for anonymous tracking. No schema changes required — just richer payloads.

### 4.4 Hotel Search Entry Point

Implement a minimal hotel search page at `/hotels`:
1. Search form: destination, check-in, check-out, guests
2. Results pass-through to Hotellook via `get-redirect` Edge Function
3. Hotel cards with Trust copy (same pattern as flights)
4. Future: White Label widget embed when available

### 4.5 White Label Preparation

Document the required Travelpayouts dashboard steps for White Label configuration. The code should work both with and without White Label — the subdomain merely improves trust/UX by hiding the `aviasales.com` domain.

---

## 5. Exact Files to Create

| File | Purpose |
|---|---|
| `src/lib/travelConfig.ts` | Central travel partner configuration, URL builders, validation |
| `src/lib/__tests__/travelConfig.test.ts` | Tests for URL generation, validation, partner metadata |
| `src/components/trip-cost/FlightHandoffButton.tsx` | "Search real flights" CTA inside planner summary |
| `src/components/search/HotelSearchForm.tsx` | Hotel search form (destination, dates, guests) |
| `src/components/hotels/HotelCard.tsx` | Individual hotel result card |
| `src/components/hotels/HotelFiltersPanel.tsx` | Hotel search filters (stars, price range, amenities) |
| `src/components/hotels/HotelCardSkeleton.tsx` | Loading skeleton for hotel cards |
| `src/components/hotels/EmptyHotelState.tsx` | Empty/error state for hotel search |

---

## 6. Exact Files to Modify

| File | Change |
|---|---|
| `src/components/trip-cost/TripCostSummary.tsx` | Add `FlightHandoffButton` below CTA | 
| `src/pages/FlightResults.tsx` | Update "Book Now" → "Check availability"; add trust disclosure per card; add `source_page` and `placement` to tracking calls |
| `src/services/travelApi.ts` | Add `source_page` and `session_id` to `trackAffiliateEvent` payload; add `buildFlightSearchUrl` export |
| `src/components/flights/FlightCard.tsx` | Update CTA label and trust copy |
| `src/pages/HotelResults.tsx` | Build minimal hotel search page (or verify existing — needs inspection) |
| `src/lib/supabaseConfig.ts` | Add `getTravelpayoutsConfig()` for client-safe partner metadata |
| `src/App.tsx` | No route changes needed (routes already exist) |
| `src/components/home-v2/FlightHandoff.tsx` | Update handoff copy to reference "Check availability" |

---

## 7. Database Migration Requirements

### 7.1 No new tables required

The existing `affiliate_clicks` table already supports the enhanced tracking fields. The schema has:

| Column | Type | Current Usage | Phase 3 Enhancement |
|---|---|---|---|
| `type` | TEXT | `flight` / `hotel` | No change |
| `action` | TEXT | `search` / `click` / `compare` / `view_deal` / `view_live_prices` | No change |
| `origin` | TEXT | IATA code | No change |
| `destination` | TEXT | IATA code | No change |
| `departure_date` | DATE | ISO date | No change |
| `price` | NUMERIC | Price at click time | No change |
| `redirect_url` | TEXT | Partner URL | Add `source_page` context |
| `user_agent` | TEXT | Browser UA | No change |

### 7.2 Optional: Add `source_page` and `session_id` columns

If preferred over encoding in existing fields:

```sql
ALTER TABLE public.affiliate_clicks 
  ADD COLUMN source_page TEXT,
  ADD COLUMN session_id TEXT;
```

**Decision**: Not required for Phase 3 MVP. Encode `source_page` in `redirect_url` query parameter or use a separate tracking call. The existing schema is sufficient.

### 7.3 No migration file needed

Phase 3 requires **zero database migrations** unless the optional columns above are desired.

---

## 8. Supabase Function Requirements

### 8.1 No new functions required

All required Edge Functions already exist and are deployed.

### 8.2 Functions to verify

| Function | Verify |
|---|---|
| `search-flights` | Handles requests without auth tokens (public access) |
| `get-redirect` | Uses `MARKER_ID` for commission; works for both flights and hotels |
| `get-route-prices` | Cached prices used by PopularRoutes on homepage |

### 8.3 Travelpayouts configuration (in Edge Function secrets)

| Secret | Purpose | Location |
|---|---|---|
| Travelpayouts API token | Authenticates to Travelpayouts API | Supabase dashboard → Edge Function secrets |
| `MARKER_ID` | Affiliate marker for commission tracking | Supabase dashboard → Edge Function secrets |

These are **already configured** in the existing Supabase project. The owner must set these same secrets in any new project.

---

## 9. Environment Variables

### 9.1 Client-side (VITE_ prefixed)

| Variable | Required | Purpose |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Yes | Supabase anon key |

### 9.2 No new variables

Phase 3 introduces **zero new environment variables**. The travel partner configuration is static metadata in `travelConfig.ts`.

### 9.3 Server-side (Edge Function secrets)

No changes. Existing `MARKER_ID` and Travelpayouts token continue to be used.

---

## 10. Route Changes

### 10.1 No new routes

All routes already exist:

| Route | Page | Status |
|---|---|---|
| `/flights` | `FlightResults` | Operational |
| `/flights/:slug` | `RoutePage` | Operational |
| `/hotels` | `HotelResults` | Routed — page needs implementation |
| `/redirect` | `BookingRedirect` | Operational |
| `/trip-cost` | `TripCostPlannerPage` | Operational |

### 10.2 Planner-to-Flights navigation

The `FlightHandoffButton` navigates to `/flights?origin=...&destination=...&departureDate=...&passengers=...` — same query parameters already consumed by `FlightResults`.

---

## 11. UI States and Copy

### 11.1 Flight Card CTA

```
Current:  "Book Now"
Phase 3:  "Check availability"  (or "View on partner site")
```

Trust disclosure below each card:
> "Price is indicative from our travel partner. Final price confirmed on the partner site."

### 11.2 Planner-to-Flight CTA

```
Button: "Search real flights"
Helper (when fields incomplete): "Add departure, destination and dates to search flights."
Helper (when ready): "Compare live prices from our travel partner."
```

### 11.3 Hotel Search

```
Empty state: "Search hotels at your destination."
Loading state: FlightCardSkeleton-style animated placeholders
Error state: "Could not search hotels. Please try again."
Handoff CTA: "Check availability on partner site"
```

### 11.4 Trust Copy (All Handoff Points)

```
"BookingsFinder is a travel comparison site. We may earn a commission 
when you book through our partners at no extra cost to you. Final prices 
and availability are confirmed by the booking provider."
```

### 11.5 White Label State (When Configured)

If `flights.bookingsfinder.com` CNAME is configured:
- Redirect URLs use the subdomain → partner sees `flights.bookingsfinder.com` referrer
- No visible `aviasales.com` domain in user's browser

If not configured:
- Redirect shows `aviasales.com/search` in the interstitial URL
- "Continue to Partner" link is clearly labeled
- Trust copy explains the handoff

---

## 12. Security and Privacy Controls

### 12.1 API Token Protection

- Travelpayouts API token: **Edge Function only** (Deno.env.get), never in VITE_ variables
- `MARKER_ID`: **Edge Function only**, never in client-side code
- Supabase anon key: Public by design (RLS enforced)

### 12.2 Affiliate Tracking Privacy

| Tracked | Not Tracked |
|---|---|
| Event type (search/click) | User email |
| Origin/destination airports | User name |
| Departure/return dates | IP address (beyond server logs) |
| Price at click time | Browser fingerprint |
| Partner name | Full User-Agent string (already in DB — remove in future) |
| Source page | |

### 12.3 Redirect Safety

- `BookingRedirect` validates URL before `window.location.assign()`
- No open redirect vulnerability — URL must pass `new URL()` validation
- External links use `rel="noopener noreferrer"`
- Tracking failure never blocks redirect (fire-and-forget in try/catch)

### 12.4 RLS Review

| Table | Current RLS | Phase 3 Impact |
|---|---|---|
| `affiliate_clicks` | `WITH CHECK (true)` for INSERT | No change — anonymous tracking is intentional |
| `route_price_cache` | `USING (true)` for SELECT | No change — public price data |

---

## 13. Test Plan

### 13.1 Unit Tests — travelConfig.ts

| Test | Coverage |
|---|---|
| `buildFlightSearchUrl()` with valid params | Correct URL format |
| `buildFlightSearchUrl()` with missing origin | Returns null + validation error |
| `buildHotelSearchUrl()` with valid params | Correct URL format |
| `validateFlightSearchParams()` with IATA codes | Rejects invalid formats |
| `getTravelPartnerConfig("aviasales")` | Returns correct metadata |
| `getTravelPartnerDisclosure("aviasales")` | Returns trust copy |
| No API tokens in client config | Assert `travelConfig.ts` has no string matching token pattern |

### 13.2 Unit Tests — FlightHandoffButton

| Test | Coverage |
|---|---|
| Disabled when destination missing | Button is disabled, helper text shown |
| Disabled when departure date missing | Button is disabled |
| Enabled when all required fields present | Button links to correct `/flights?` URL |
| Correct parameter mapping | Origin, destination, departureDate, passengers from planner state |

### 13.3 Unit Tests — Affiliate Tracking

| Test | Coverage |
|---|---|
| `trackAffiliateEvent` adds source_page | Payload includes source_page string |
| `trackAffiliateEvent` handles failure | Error caught, no throw, redirect continues |
| `trackAffiliateEvent` with session_id | Payload includes anonymous session identifier |

### 13.4 Integration Tests

| Test | Coverage |
|---|---|
| Planner → Flights parameter mapping | Full round-trip: planner state → URL params → FlightResults receives correct values |
| Missing Supabase config doesn't crash flights page | FlightResults pre-search state renders normally |
| Redirect page validates URLs | Malformed URLs show error; valid URLs auto-redirect |

### 13.5 Existing Tests

All 242 existing tests must continue passing. No regressions permitted.

---

## 14. Rollout Plan

### Stage 1: Foundation (15 minutes)
- Create `travelConfig.ts` + tests
- No UI changes

### Stage 2: Flight Card Trust Copy (10 minutes)
- Update CTA labels on FlightCard, FlightResults
- Update trust disclosures

### Stage 3: Planner Bridge (15 minutes)
- Create FlightHandoffButton
- Wire into TripCostSummary

### Stage 4: Affiliate Tracking Enhancement (10 minutes)
- Add source_page and placement to tracking calls
- Add tests

### Stage 5: Hotel Search MVP (30 minutes)
- Create HotelSearchForm
- Create HotelCard, HotelFilters, HotelCardSkeleton, EmptyHotelState
- Wire into HotelResults page

### Stage 6: White Label Documentation (5 minutes)
- Document Travelpayouts dashboard steps
- Verify code works with/without White Label

### Stage 7: Validation (15 minutes)
- Run all tests
- Run build
- Manual review

**Total estimated implementation time**: ~100 minutes

---

## 15. Rollback Plan

### Per-Stage Rollback

Each stage is independent and can be reverted individually:

| Stage | Rollback |
|---|---|
| 1. travelConfig | Remove file + its import |
| 2. Flight Card copy | Revert label strings |
| 3. Planner Bridge | Remove button component + import |
| 4. Tracking | Revert tracking call changes |
| 5. Hotel Search | Remove new hotel components; revert HotelResults to placeholder |
| 6. Docs | No code to roll back |

### Full Rollback

```
git revert [commit-range-for-phase-3]
npm run build   # verify
npm run test:run # verify 242 tests pass
```

### No Database Rollback Needed

Zero database migrations mean no `supabase db reset` or migration revert required.

---

## 16. Acceptance Criteria

### The Phase 3 implementation is complete when:

- [ ] `travelConfig.ts` centralises all travel partner configuration
- [ ] Flight cards show "Check availability" instead of "Book Now"
- [ ] Trip Budget Planner has a working "Search real flights" button
- [ ] Planner correctly maps destination/dates/travellers to flight search params
- [ ] Affiliate tracking includes `source_page` and `placement`
- [ ] Tracking failure never blocks user redirect
- [ ] Hotel search page at `/hotels` shows a working search form
- [ ] Hotel results hand off to partner site via `/redirect` interstitial
- [ ] All trust copy is consistent across flights, hotels, planner bridge, and redirect
- [ ] No Travelpayouts API tokens in client-side code
- [ ] No new environment variables required
- [ ] No database migrations required
- [ ] All 242 existing tests pass
- [ ] New tests pass (travelConfig, FlightHandoffButton, tracking, hotel)
- [ ] `npm run build` passes
- [ ] Zero new lint issues in Phase 3 files
- [ ] White Label configuration steps documented for owner
- [ ] Code works both with and without White Label CNAME

---

## 17. Recommended Implementation Order

```
1. src/lib/travelConfig.ts + tests           (Foundation — no UI)
2. Update FlightCard + FlightResults copy    (Trust fix — low risk)
3. FlightHandoffButton + TripCostSummary     (Planner bridge — core feature)
4. Affiliate tracking enhancement            (Invisible — low risk)
5. Hotel search page + components            (New feature — highest complexity)
6. White Label documentation                 (Docs only)
7. Full validation                           (build, test, lint)
```

---

## 18. Commit Plan

| Commit | Files | Message |
|---|---|---|
| 1 | `travelConfig.ts`, `travelConfig.test.ts` | `feat: add central travel partner configuration` |
| 2 | `FlightCard.tsx`, `FlightResults.tsx`, `FlightHandoff.tsx` | `feat: update flight booking trust copy and disclosures` |
| 3 | `FlightHandoffButton.tsx`, `TripCostSummary.tsx` | `feat: add flight search bridge from Trip Budget Planner` |
| 4 | `travelApi.ts` | `feat: enhance affiliate tracking with source context` |
| 5 | `HotelSearchForm.tsx`, `HotelCard.tsx`, `HotelFiltersPanel.tsx`, `HotelCardSkeleton.tsx`, `EmptyHotelState.tsx`, `HotelResults.tsx` | `feat: add hotel search entry point` |
| 6 | Documentation updates | `docs: add White Label configuration guide` |

---

## Appendix A: Travelpayouts White Label Configuration (Owner Action)

1. Log into Travelpayouts dashboard
2. Navigate to Tools → White Label
3. Configure subdomain: `flights.bookingsfinder.com`
4. Add CNAME record in DNS:
   ```
   flights.bookingsfinder.com → [Travelpayouts-provided hostname]
   ```
5. Verify the subdomain resolves to Travelpayouts
6. Update `get-redirect` Edge Function to use the White Label hostname instead of `aviasales.com/search`

---

## Appendix B: Current Flight Search Architecture (Reference)

```
Browser                          Supabase Edge Function           Travelpayouts API
  │                                      │                              │
  │  POST /functions/v1/search-flights   │                              │
  │─────────────────────────────────────→│                              │
  │                                      │  GET /aviasales/v3/          │
  │                                      │      prices_for_dates        │
  │                                      │─────────────────────────────→│
  │                                      │                              │
  │                                      │  { flights: [...], ... }     │
  │                                      │←─────────────────────────────│
  │  { flights: [...], meta: {...} }     │                              │
  │←─────────────────────────────────────│                              │
  │                                      │                              │
  │  User clicks "Book"                  │                              │
  │  → getRedirectUrl() → /redirect      │                              │
  │                                      │                              │
  │  GET /functions/v1/get-redirect      │                              │
  │─────────────────────────────────────→│                              │
  │                                      │  Build Aviasales URL         │
  │                                      │  + marker ID                 │
  │  { redirectUrl: "https://..." }      │                              │
  │←─────────────────────────────────────│                              │
  │                                      │                              │
  │  BookingRedirect interstitial        │                              │
  │  → window.location.assign(partner)   │                              │
```
