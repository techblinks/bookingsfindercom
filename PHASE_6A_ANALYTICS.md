# Phase 6A — Analytics Foundation

## Architecture

```
User Actions: Flight Search | Hotel Search | View Deal Click
     │              │              │
     ▼              ▼              ▼
  Analytics Service (src/lib/analytics.ts)
  fire-and-forget, non-blocking
     │              │              │
     ▼              ▼              ▼
  search_events  click_events  [daily_metrics]
     │              │
     ▼              ▼
  Admin Dashboard (/admin/analytics)
```

## Database Schema

### search_events

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, gen_random_uuid() |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| session_id | TEXT | NOT NULL, max 128 chars |
| user_id | UUID | FK auth.users, ON DELETE SET NULL |
| origin | TEXT | NULL or uppercase 3-letter IATA |
| destination | TEXT | NULL or uppercase 3-letter IATA |
| departure_date | DATE | nullable |
| return_date | DATE | nullable |
| adults | INTEGER | NULL or >= 1 |
| children | INTEGER | NULL or >= 0 |
| infants | INTEGER | NULL or >= 0 |
| cabin_class | TEXT | NULL or one of: economy, premium_economy, business, first |
| trip_type | TEXT | CHECK: oneway, roundtrip, multi |
| currency | TEXT | NULL or uppercase 3-letter code |
| device | TEXT | mobile / tablet / desktop |
| landing_page | TEXT | max 256 chars |
| referrer | TEXT | max 1024 chars |
| utm_source | TEXT | max 256 chars |
| utm_medium | TEXT | max 256 chars |
| utm_campaign | TEXT | max 256 chars |

### click_events

| Column | Type | Constraints |
|---|---|---|
| id | UUID | PK, gen_random_uuid() |
| created_at | TIMESTAMPTZ | NOT NULL, DEFAULT now() |
| search_event_id | UUID | FK search_events, ON DELETE SET NULL |
| partner | TEXT | NOT NULL, max 128 chars |
| partner_type | TEXT | CHECK: flight, hotel |
| route | TEXT | nullable |
| airline | TEXT | nullable |
| price | NUMERIC(10,2) | NULL or >= 0 |
| currency | TEXT | nullable |
| white_label_used | BOOLEAN | DEFAULT FALSE |
| fallback_used | BOOLEAN | DEFAULT FALSE |
| outbound_host | TEXT | NULL, max 256 chars, no dangerous protocols |
| landing_page | TEXT | nullable |
| device | TEXT | nullable |
| session_id | TEXT | NOT NULL, max 128 chars |

### daily_metrics

**Status: NOT POPULATED.** The table schema exists but there is currently:
- No database trigger
- No scheduled Edge Function
- No pg_cron job
- No manual aggregation process

The admin dashboard queries `search_events` and `click_events` directly using `getDashboardSummary()`. The `getDailyMetrics()` function exists but returns an empty array until a population mechanism is implemented (Phase 6B+).

## RLS Policies (v2 — security hardened)

```sql
-- search_events: anon INSERT (no user_id)
CREATE POLICY "Anon can insert search events without user_id"
  ON public.search_events FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

-- search_events: auth INSERT (own user_id or NULL)
CREATE POLICY "Auth can insert own search events"
  ON public.search_events FOR INSERT TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- search_events: admin SELECT only
CREATE POLICY "Admin can select search events"
  ON public.search_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'));

-- click_events: public INSERT (no user_id column)
CREATE POLICY "Public can insert click events"
  ON public.click_events FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- click_events: admin SELECT only
CREATE POLICY "Admin can select click events"
  ON public.click_events FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'));

-- daily_metrics: admin SELECT only
CREATE POLICY "Admin can select daily metrics"
  ON public.daily_metrics FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'admin'));
```

## Data Minimisation

- **destination_url replaced with outbound_host**: Only the hostname is stored (e.g., `flights.bookingsfinder.com`), never the full URL with query parameters. This prevents accidental storage of API keys, tokens, credentials, PII in query strings, or fragments.
- **No user_id for anonymous users**: `logSearch()` never sets `user_id`. RLS enforces `user_id IS NULL` for anon inserts.
- **No secrets**: No API tokens, passwords, or affiliate secrets in any analytics payload.
- **Approved hosts only (defence in depth)**: Host validation is performed client-side before insert, with a database CHECK constraint rejecting known dangerous protocols (`javascript:`, `data:`, `file:`, `vbscript:`).

## Fire-and-Forget Pattern

All analytics logging uses `void` + `.catch()` to ensure:
- Never blocks navigation
- Never delays redirects
- Never throws unhandled rejections
- Failures are silent (`console.warn` only, no `console.error`)

```typescript
void logSearch({ origin, destination, ... }).catch(() => {});
void logAffiliateClick({ partner, ... }).catch(() => {});
```

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/…_phase6a_analytics.sql` | Base tables + initial RLS |
| `supabase/migrations/…_phase6a_security_hardening.sql` | Hardened RLS + CHECKs + outbound_host |
| `src/lib/analytics.ts` | Service: logSearch, logAffiliateClick, dashboard queries |
| `src/lib/__tests__/analytics.test.ts` | 15 tests covering security, validation, failure isolation |
| `src/services/travelApi.ts` | void logSearch() in searchFlights + searchHotels |
| `src/pages/FlightResults.tsx` | void logAffiliateClick() in handleBookNow |
| `src/pages/HotelResults.tsx` | void logAffiliateClick() in handleViewDeal |
| `src/pages/AdminAnalytics.tsx` | Dashboard: KPIs, top routes, recent activity |
| `src/App.tsx` | Route /admin/analytics + import |

## Future Roadmap

- Phase 6B: daily_metrics aggregation edge function
- Phase 6C: Charts and trend visualization
- Phase 6D: Revenue estimation from affiliate events
- Phase 6E: Health monitoring and alerting

## Quality

- Tests: 413 passed (20 suites)
- TypeScript: 0 errors
- Build: Passing
- Lint: 0 warnings on new code
- No behavior changes to existing user flows
