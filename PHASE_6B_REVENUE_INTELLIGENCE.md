## Phase 6B — Revenue Intelligence Dashboard

### Purpose

The Phase 6B dashboard turns Phase 6A analytics data into a readable business intelligence view for the site owner. It reports searches, outbound affiliate clicks, CTR, White Label vs fallback usage, top routes/destinations, and partner performance across configurable date ranges.

### Truthful-data limitations

Phase 6B reports **searches and outbound clicks**. It DOES NOT report:
- Confirmed bookings
- Commission revenue
- Conversion rate
- Revenue per click

Travelpayouts confirmed-booking and commission attribution are not yet connected. The dashboard shows real, non-fabricated data from search_events and click_events tables.

### Metrics and formulas

| Metric | Formula |
|---|---|
| CTR | clicks / searches × 100 |
| Average Clicked Fare | Average of non-null positive click_events.price |
| Click Share | partner clicks / total clicks × 100 |
| Drop-off | searches − clicks |
| Drop-off % | drop-off / searches × 100 |
| WL % | white_label_used=true clicks / total flight clicks × 100 |
| Fallback % | fallback_used=true clicks / total flight clicks × 100 |

### Date-range behaviour

| Range | Calculation |
|---|---|
| Today | 00:00 to 23:59 in browser's local timezone |
| Yesterday | Previous calendar day |
| Last 7 days | 7 days ago to now |
| Last 30 days | 30 days ago to now |
| Custom | User-selected from/to dates |

- Timestamps stored in UTC, displayed in browser locale
- Inclusive start, exclusive end boundaries in DB queries
- Previous-period comparison: same duration before the selected range
- Range preserved in URL query parameters (`?range=7d` or `?from=...&to=...`)

### Database queries

All dashboard data is aggregated **server-side** via Supabase RPC functions. No raw rows are downloaded to the browser.

| RPC Function | Returns |
|---|---|
| get_dashboard_kpis(start, end) | All KPI counts, avg fare, dominant currency |
| get_top_routes(start, end, limit) | Origin, destination, searches, clicks, CTR, avg price, top partner |
| get_top_destinations(start, end, limit) | Destination, searches, clicks, CTR |
| get_partner_performance(start, end) | Partner, type, clicks, share, avg price, WL/FB split |
| get_airline_performance(start, end, limit) | Airline, clicks, avg price, top route |
| get_landing_page_performance(start, end) | Landing page, searches, clicks, CTR |
| get_traffic_sources(start, end) | UTM source/medium/campaign, searches, clicks, CTR |
| get_wl_vs_fallback(start, end) | WL/FB counts, percentages, top routes JSON |
| get_daily_trends(start, end) | Daily series: searches, clicks, CTR, WL, fallback |

### Security model

- RPC functions use SECURITY DEFINER with explicit search_path
- Execute privileges REVOKED from PUBLIC and anon
- GRANTed to authenticated only
- Admin dashboard uses useAdminAuth → user_roles check
- No service-role credentials in frontend
- Anonymous users cannot call any RPC
- Auth non-admin users cannot access /admin/analytics

### Indexes

Added non-redundant composite indexes:
- search_events(origin, destination, created_at)
- click_events(partner, created_at)
- click_events(white_label_used, fallback_used, created_at)
- click_events(airline, created_at)
- search_events(landing_page, created_at)
- click_events(landing_page, created_at)

### Currency handling

- Average clicked fare computed only for non-null, positive prices
- Dominant currency detected via MODE() aggregation
- Mixed-currency warning shown when multiple currencies exist
- No cross-currency averaging

### White Label reporting

- White Label clicks: click_events WHERE white_label_used = true
- Fallback clicks: click_events WHERE fallback_used = true
- Route breakdowns for both categories
- No changes to routing logic, rollout mode, or redirect behaviour

### Admin route protection

- /admin/analytics uses useAdminAuth (same as /admin)
- Logged-out → login form
- Auth non-admin → "Sign in to view analytics data"
- Admin → full dashboard with date filters

### Testing

20 test suites, 419 tests. New Phase 6B tests cover:
- Date-range boundaries
- CTR calculation / division-by-zero
- Flight vs hotel totals
- White Label vs fallback totals
- Top-route aggregation
- Destination aggregation
- Partner aggregation
- Landing-page aggregation
- Traffic-source grouping
- Mixed-currency handling
- Empty dashboard state
- Failed dashboard query
- Logged-out route protection
- Non-admin route protection
- Admin dashboard access
- No raw user_id/session_id displayed
- No fabricated revenue/bookings fields

### Deployment

- Single migration: 20260726010000_phase6b_dashboard_rpcs.sql
- Migration adds indexes, 10 RPC functions, and execute grants
- No data migration, no table changes
- Rollback: drop the migration's RPCs and indexes

### Future Travelpayouts commission integration

When Travelpayouts confirmed-booking API is connected, the following can be added:
- Confirmed bookings by day
- Commission revenue estimates
- Revenue per click
- Conversion rate (searches → clicks → bookings)
- ROI on ad campaigns

Until then, the dashboard truthfully reports only what is measured.
