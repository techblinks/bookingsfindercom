# Phase 6A — Analytics Foundation

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  User Actions                    │
│  Flight Search │ Hotel Search │ View Deal Click │
└────────┬──────────────┬──────────────┬──────────┘
         │              │              │
         ▼              ▼              ▼
   ┌─────────────────────────────────────────┐
   │       Analytics Service                  │
   │  src/lib/analytics.ts                    │
   │                                          │
   │  logSearch()       ──► search_events     │
   │  logHotelSearch()  ──► search_events     │
   │  logAffiliateClick()──► click_events     │
   │                                          │
   │  getDashboardSummary() ◄── Supabase      │
   │  getTopRoutes()                            │
   │  getTopDestinations()                      │
   │  getDailyMetrics()                         │
   └─────────────────────────────────────────┘
         │                              ▲
         ▼                              │
   ┌──────────┐              ┌──────────────────┐
   │ Supabase │              │  Admin Dashboard  │
   │   DB     │              │  /admin/analytics │
   └──────────┘              └──────────────────┘
```

## Database Schema

### search_events

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Event timestamp |
| session_id | TEXT | Browser session identifier |
| user_id | UUID (nullable) | Authenticated user |
| origin | TEXT | IATA origin code |
| destination | TEXT | IATA destination code |
| departure_date | DATE | Outbound date |
| return_date | DATE | Return date (nullable) |
| adults | INTEGER | Adult count |
| children | INTEGER | Child count |
| infants | INTEGER | Infant count |
| cabin_class | TEXT | Cabin class |
| trip_type | TEXT | oneway / roundtrip / multi |
| currency | TEXT | Currency code |
| country | TEXT | User country (nullable) |
| device | TEXT | mobile / tablet / desktop |
| landing_page | TEXT | Page where search occurred |
| referrer | TEXT | HTTP referrer |
| utm_source | TEXT | UTM tracking |
| utm_medium | TEXT | UTM tracking |
| utm_campaign | TEXT | UTM tracking |

### click_events

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| created_at | TIMESTAMPTZ | Event timestamp |
| search_event_id | UUID (nullable) | Links to search_events |
| partner | TEXT | Partner name |
| partner_type | TEXT | flight / hotel |
| route | TEXT | Origin-Destination |
| airline | TEXT | Airline code |
| price | NUMERIC | Price displayed |
| currency | TEXT | Currency code |
| white_label_used | BOOLEAN | White Label routing used |
| fallback_used | BOOLEAN | Aviasales fallback used |
| destination_url | TEXT | Redirect destination |
| landing_page | TEXT | Page where click occurred |
| device | TEXT | mobile / tablet / desktop |
| session_id | TEXT | Browser session identifier |

### daily_metrics

Aggregated daily statistics table. Populated by edge function or cron job (future phase).

| Column | Type | Description |
|---|---|---|
| id | UUID | Primary key |
| date | DATE | Date of metrics |
| total_searches | INTEGER | Combined searches |
| total_clicks | INTEGER | Combined clicks |
| flight_searches | INTEGER | Flight-only searches |
| hotel_searches | INTEGER | Hotel-only searches |
| flight_clicks | INTEGER | Flight-only clicks |
| hotel_clicks | INTEGER | Hotel-only clicks |
| white_label_clicks | INTEGER | White Label clicks |
| fallback_clicks | INTEGER | Fallback clicks |
| unique_sessions | INTEGER | Unique session count |
| ctr | NUMERIC | Generated click-through rate |
| created_at | TIMESTAMPTZ | Record created |
| updated_at | TIMESTAMPTZ | Record updated |

## Data Flow

### Logging (fire-and-forget)

1. **Flight search**: `searchFlights()` in `travelApi.ts` calls `logSearch()` after successful API response. Parameters include origin, destination, dates, passenger count, cabin class, currency.

2. **Hotel search**: `searchHotels()` in `travelApi.ts` calls `logSearch()` after successful API response.

3. **View Deal click**: `handleBookNow` in `FlightResults.tsx` calls `logAffiliateClick()` with partner, route, price, White Label/fallback flags, and destination URL. Hotel clicks in `HotelResults.tsx` follow the same pattern.

All logging is **fire-and-forget** — failures never throw, never block navigation, and never affect the user experience. Errors are logged to `console.warn` only.

### Dashboard (admin only)

1. Admin navigates to `/admin/analytics`
2. `useAdminAuth` hook checks admin role via `user_roles` table
3. `AdminAnalytics` component calls `getDashboardSummary()` which queries:
   - Today's search count from `search_events`
   - Today's click count from `click_events`
   - Top routes and destinations (computed in-memory from today's data)
   - Recent searches and clicks (last 10 each)

## Security

### Row Level Security

| Table | Public (anon/authenticated) | Admin |
|---|---|---|
| search_events | INSERT only | SELECT |
| click_events | INSERT only | SELECT |
| daily_metrics | None | SELECT |

Admin access is enforced via `user_roles` table check (`role = 'admin'`).

No secrets, tokens, or environment variables are exposed to the client. All queries use the existing Supabase client with standard RLS policies.

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260725153000_phase6a_analytics.sql` | New tables + RLS |
| `src/lib/analytics.ts` | Analytics service (365 lines) |
| `src/lib/__tests__/analytics.test.ts` | Unit tests (10 tests) |
| `src/services/travelApi.ts` | +2 `logSearch()` calls |
| `src/pages/FlightResults.tsx` | +1 `logAffiliateClick()` call |
| `src/pages/HotelResults.tsx` | +1 `logAffiliateClick()` call |
| `src/pages/AdminAnalytics.tsx` | Admin dashboard (301 lines) |
| `src/App.tsx` | +1 route `/admin/analytics` |

## Future Roadmap

- **Phase 6B**: Edge function for daily_metrics aggregation
- **Phase 6C**: Charts and trend visualization
- **Phase 6D**: Revenue estimation from affiliate events
- **Phase 6E**: Health monitoring and alerting
- **Phase 6F**: SEO performance analytics

## Quality

- **Tests**: 408 passed (20 suites)
- **TypeScript**: 0 errors
- **Build**: Passing
- **No behavior changes**: All existing tracking, routing, and redirect logic unchanged
- **No TODOs, no console.log, no debug code**
