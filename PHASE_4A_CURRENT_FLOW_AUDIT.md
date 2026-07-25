# Phase 4A — Current Flight Handoff Flow Audit

**Date**: 2026-07-24  
**Branch**: `bookingsfinder-v2-phase4-whitelabel`  
**Base**: `bookingsfinder-v2-phase3-travel-integration` (merged)  

---

## 1. Current Flight-Search Architecture

```
User ──→ [Internal Page] ──→ search-flights Edge Function ──→ Travelpayouts API
                                            │
                                    Returns flight results (IATA codes, prices, links)
                                            │
                       ┌────────────────────┤
                       ▼                    ▼
              FlightResults.tsx     BookingRedirect.tsx (interstitial)
              (internal cards)      └─→ /redirect?url=...
                                            │
                                   get-redirect Edge Function
                                   └─→ Build Aviasales/partner URL + marker
                                            │
                                   window.location.assign(partner URL)
```

### Key Layers

| Layer | File | Role |
|---|---|---|
| Partner config | `src/lib/travelConfig.ts` | Partner metadata, URL builders, IATA/date validation, White Label host support |
| Flight search API | `src/services/travelApi.ts` | `searchFlights()`, `getRedirectUrl()`, `trackAffiliateEvent()` |
| Flight search hook | `src/hooks/useFlightSearch.ts` | Full state machine (loading, results, filters, sort) |
| Results page | `src/pages/FlightResults.tsx` | Displays cards, handles booking clicks |
| Redirect interstitial | `src/pages/BookingRedirect.tsx` | 2.5s countdown, trust signals, auto-redirect |
| Edge Functions | `supabase/functions/` | `search-flights` (API), `get-redirect` (URL construction), `search-airports` (IATA lookup) |
| Affiliate tracking | `src/lib/outboundTracking.ts` + `src/services/travelApi.ts` | Sanitised payloads → `affiliate_clicks` table |
| Tracking DB | `public.affiliate_clicks` | `source_page`, `placement`, `outbound_host` columns added in Phase 3C |

---

## 2. Every Flight CTA and Its File/Location

| # | CTA | File | Label | Route/Host |
|---|---|---|---|---|
| 1 | Homepage flight handoff | `src/components/home-v2/FlightHandoff.tsx` | "Search flights" | `/flights` |
| 2 | IntentSelector card | `src/components/home-v2/IntentSelector.tsx` | "Compare flights" | `/flights` |
| 3 | Planner summary CTA | `src/components/trip-cost/FlightHandoffButton.tsx` | "Search real flights" | `/flights?departureDate=...&returnDate=...&passengers=N` |
| 4 | Flight result card CTA | `src/components/flights/FlightCard.tsx` | "View Deal" | `/redirect?url=...` → partner |
| 5 | Flight results page | `src/pages/FlightResults.tsx` `handleBookNow` | Internal → redirect | `/redirect?url=...` → partner |
| 6 | Footer link | `src/components/layout/Footer.tsx` | "Flights" | `/flights` |
| 7 | Redirect interstitial continue | `src/pages/BookingRedirect.tsx` | "Continue to Partner" | Direct partner URL (new tab) |

CTAs #1, #2, #3, #6 navigate to internal `/flights` page.  
CTAs #4, #5 go through the `/redirect` interstitial to the partner.  
CTA #7 is a direct `window.location.assign()`.

---

## 3. Every Outbound Redirect Path

### Path A: Internal search → Partner booking (full flow)

```
1. User arrives at /flights?origin=SYD&destination=DPS&departureDate=2026-08-15&passengers=1
2. FlightResults.tsx calls useFlightSearch({ origin, destination, departureDate, passengers, cabinClass })
3. useFlightSearch.ts calls searchFlights({ origin, destination, departureDate, passengers, currency })
4. searchFlights() calls getFunctionUrl("search-flights") → Edge Function
5. Edge Function calls Travelpayouts API, returns flights[]
6. User clicks "View Deal" on a FlightCard
7. handleBookNow() in FlightResults.tsx calls:
   a. trackAffiliateEvent({ type: "flight", action: "click", sourcePage: "flight_results", placement: "flight_result_card", ... })
   b. getRedirectUrl({ id: flightId, type: "flight", link, origin, destination, ... })
   c. window.location.href = `/redirect?url=${encodeURIComponent(result.redirectUrl)}`
8. BookingRedirect.tsx renders interstitial (2.5s countdown, trust signals)
9. window.location.assign(partner URL) → user arrives at Aviasales/Hotellook
```

### Path B: Direct Aviasales URL construction (Edge Function — get-redirect)

```
get-redirect Edge Function:
  - If params.link exists: use it directly (decoded, validated by Zod)
  - If params.type === "flight": build Aviasales search URL:
    `${AVIASALES_BASE}/search/${origin}${depDate}${destination}${retDate}1?${params}`
    Base: https://www.aviasales.com
    params: origin_iata, destination_iata, depart_date, return_date, marker
  - If params.type === "hotel": build Hotellook URL:
    `${HOTELLOOK_BASE}/hotels?destination=...&checkIn=...&checkOut=...&marker=...`
    Base: https://search.hotellook.com
```

### Path C: BookingRedirect URL normalization

```
BookingRedirect.tsx normalizeAffiliateUrl():
  - Decodes up to 3 levels of encoding
  - Converts relative paths (/search/..., /hotels) to absolute URLs
  - Adds https:// for protocol-relative URLs
  - Adds missing scheme for domain-like strings
```

---

## 4. Current Destination Hosts and Allowlisting

| Host | Where Used | Approved? |
|---|---|---|
| `aviasales.com` | Edge Function `get-redirect`, `travelConfig.ts` `APPROVED_HOSTS`, outbound tracking | ✅ Primary flight partner |
| `search.hotellook.com` | Edge Function `get-redirect`, `travelConfig.ts` `PARTNERS`, outbound tracking | ✅ Primary hotel partner |
| `api.travelpayouts.com` | Edge Function `_shared/travelpayouts.ts` (server-side only) | ✅ API endpoint |
| `flights.bookingsfinder.com` | **Not configured** — `VITE_TRAVEL_WHITE_LABEL_HOST` env var (empty) | ⬜ Future White Label |

### allowlist mechanisms:

1. **`travelConfig.ts` `APPROVED_HOSTS`** — validates `buildFlightSearchUrl()` & `isApprovedHost()`. Only `aviasales.com` and `hotellook.com`.
2. **`outboundTracking.ts` `APPROVED_HOSTS`** — validates outbound host in tracking payloads. Same two hosts.
3. **`BookingRedirect.tsx` `normalizeAffiliateUrl()`** — converts relative paths to known Aviasales/Hotellook absolute URLs. No host allowlist here — accepts any domain-like string.

---

## 5. Which Flows Have Trusted IATA Codes

| Flow | Has IATA? | Source |
|---|---|---|
| `/flights?origin=SYD&destination=DPS` | ✅ Yes | URL params → validated by `useFlightSearch` → forwarded to Edge Function |
| Flight results page (URL params) | ✅ Yes | `searchParams.get("origin")`, `searchParams.get("destination")` — IATA codes from URL |
| Flight Card "View Deal" click | ✅ Yes | `flight.airline_code`, `origin` and `destination` from URL params → passed to `getRedirectUrl()` |
| `search-flights` Edge Function | ✅ Yes | Zod-validated: `origin`/`destination` must be 3 uppercase letters |
| `get-redirect` Edge Function | ✅ Yes | Builds Aviasales URL with origin/destination IATA from query params |
| `search-airports` Edge Function | ✅ Yes | Returns airport objects with IATA `code` fields |
| `NativeLocationPicker` component | ✅ Yes | Returns `Airport` objects with `code` (IATA) fields |
| `LocationCombobox` component | ✅ Yes | Searches airports via Edge Function, returns IATA codes |
| Homepage → `/flights` | ⚠️ None | Just navigates to `/flights` with no params |
| Trip Budget Planner handoff | ❌ No | Free-text city/country only; navigates to `/flights?departureDate=...&passengers=N` without origin/destination |
| `validateFlightParams()` | ✅ Validates | Requires `^[A-Z]{3}$` IATA pattern |

---

## 6. Which Flows Only Have Free-Text City Names

| Flow | Has Free Text? | What It Does |
|---|---|---|
| Trip Budget Planner | `departureCity`, `departureCountry`, `destinationCity`, `destinationCountry` (all free text) | **Stops at internal handoff** — maps to `/flights?departureDate=...&passengers=N`, no origin/destination IATA |
| Hotel search form | `destination` (free text) | Passes through to `/hotels?destination=...` — no IATA constraint |
| Homepage FlightHandoff | None | Just navigates to `/flights` |

**No city-to-IATA mapping exists anywhere in the codebase.** The planner and hotel form work with free-text names. Only the flight search page and airport pickers use IATA codes.

---

## 7. Current Homepage Search Parameter Shape

The homepage **does not have a search form**. It has CTAs that navigate to internal routes:

| CTA | Route | Parameters |
|---|---|---|
| FlightHandoff "Search flights" | `/flights` | None |
| IntentSelector "Compare flights" | `/flights` | None |
| Footer "Flights" | `/flights` | None |

Users arrive at `/flights` with no params, see the pre-search state ("Enter your origin, destination and travel dates"), and must use the onboard search form.

---

## 8. Current /flights Query Parameter Shape

As consumed by `FlightResults.tsx`:

| Param | Key | Type | Required? |
|---|---|---|---|
| Origin | `origin` | 3-letter IATA | Yes (for search) |
| Destination | `destination` | 3-letter IATA | Yes (for search) |
| Departure date | `departureDate` | `YYYY-MM-DD` | Yes (for search) |
| Return date | `returnDate` | `YYYY-MM-DD` | No |
| Passengers | `passengers` | Integer | No (defaults to 1) |
| Cabin class | `cabinClass` | String | No (defaults to "economy") |

The page has a pre-search state: `if (!hasSearch)` → shows prompt text. `hasSearch = !!(origin && destination && departureDate)`.

---

## 9. Current Planner Handoff Parameter Shape

As produced by `tripCostFlightHandoff.ts` → `buildInternalFlightUrl()`:

| Param | Key | Source |
|---|---|---|
| Departure date | `departureDate` | `state.tripDetails.departureDate` |
| Return date | `returnDate` | `state.tripDetails.returnDate` (if present) |
| Passengers | `passengers` | `adults + children + infants` (total, min 1) |

**Does NOT pass**: `origin`, `destination`, `cabinClass`. The planner has no IATA codes or cabin selection. Users fill in origin/destination on the flight search page.

Disabled when: departure date is missing OR return date is before departure date.

---

## 10. Current Tracking Metadata and Database Fields

### `affiliate_clicks` table

| Column | Type | Populated? |
|---|---|---|
| `type` | TEXT | ✅ "flight" \| "hotel" |
| `action` | TEXT | ✅ "search" \| "click" |
| `origin` | TEXT | ✅ IATA code (from search/click) |
| `destination` | TEXT | ✅ IATA code |
| `departure_date` | DATE | ✅ |
| `return_date` | DATE | ✅ (nullable) |
| `airline_code` | TEXT | ✅ (flight clicks) |
| `flight_number` | TEXT | ✅ (flight clicks) |
| `hotel_id` | TEXT | ✅ (hotel clicks) |
| `price` | NUMERIC | ✅ |
| `currency` | TEXT | ✅ |
| `redirect_url` | TEXT | ✅ (from `trackAffiliateEvent`) |
| `user_agent` | TEXT | ✅ (`navigator.userAgent`) |
| `source_page` | TEXT | ✅ (Phase 3C — allowlisted values) |
| `placement` | TEXT | ✅ (Phase 3C) |
| `outbound_host` | TEXT | ⬜ Not currently sent from any caller |

### Tracking events dispatched

| Event | Source Page | Placement |
|---|---|---|
| Flight search | `"flight_results"` | (none) |
| Flight card click | `"flight_results"` | `"flight_result_card"` |
| Hotel search | `"hotel_results"` | (none) |
| Hotel card click | `"hotel_results"` | `"hotel_result_card"` |
| Hotel form submit | `"hotel_results"` | (none) |

---

## 11. Current Fallback Behaviour

| Scenario | Behaviour |
|---|---|
| `VITE_SUPABASE_URL` not set | `getFunctionUrl()` returns `null` → search/redirect throw controlled errors |
| `VITE_TRAVEL_WHITE_LABEL_HOST` not set | `getWhiteLabelHost()` returns `null` → `PARTNERS.aviasales.whiteLabelHost` is `null` → `getEffectiveBaseUrl()` falls back to `searchBaseUrl` (`aviasales.com`) |
| `MARKER_ID` not set in Edge Function | Falls back to empty string `""` — no marker appended to affiliate URL |
| `TRAVELPAYOUTS_API_KEY` not set | `getConfig()` in Edge Function throws → search/redirect returns 500 |
| Flight search Edge Function unavailable | `searchFlights()` returns `{ success: false, error: "..." }` → `FlightResults.tsx` shows `toast.error()` |
| Redirect URL generation fails | `getRedirectUrl()` returns `{ success: false }` → `handleBookNow()` shows `toast.error("Could not generate booking link")` |
| Tracking insert fails | `trackAffiliateEvent()` catches error in `try/catch` → silently logged, redirect proceeds |
| Invalid/missing search params on `/flights` | Shows pre-search state: "Enter your origin, destination and travel dates" |

---

## 12. Risks and Blockers for White Label Integration

### Blockers

| # | Blocker | Detail |
|---|---|---|
| 1 | White Label subdomain not configured | No CNAME `flights.bookingsfinder.com` exists. Required DNS + Travelpayouts dashboard action by owner. |
| 2 | `get-redirect` Edge Function hardcodes `aviasales.com` | Uses `const AVIASALES_BASE = "https://www.aviasales.com"`. White Label would require `BASE = "https://flights.bookingsfinder.com"`. Need to make this configurable via environment variable. |
| 3 | `travelConfig.ts` `searchBaseUrl` hardcoded | `searchBaseUrl: "https://www.aviasales.com"` in PARTNERS config. White Label host is read from `VITE_TRAVEL_WHITE_LABEL_HOST` but only used in `getEffectiveBaseUrl()`. The Edge Function doesn't read this client-side value. |

### Risks

| # | Risk | Detail |
|---|---|---|
| 1 | Edge Function URL construction diverges from client | `buildFlightSearchUrl()` client-side and `get-redirect` Edge Function both build Aviasales URLs independently. White Label must update BOTH consistently. |
| 2 | Approved host allowlist needs White Label domain | `APPROVED_HOSTS` and outbound tracking `APPROVED_HOSTS` only allow `aviasales.com` and `hotellook.com`. `flights.bookingsfinder.com` would be rejected unless added. |
| 3 | BookingRedirect URL normalization may need updates | Handles `/search/` → `aviasales.com` conversion. White Label paths should be identical format but under different base. |
| 4 | Travelpayouts API token remains in Edge Function only | No risk — already correctly isolated. White Label doesn't change authentication. |

### No Risk

| Area | Why |
|---|---|
| IATA code validation | White Label doesn't change parameter format — same `origin`, `destination`, `depart_date`, `return_date` params |
| Affiliate tracking | `source_page`/`placement` are BookingsFinder-internal identifiers — unaffected |
| Trip Budget Planner | No IATA codes → never builds partner URLs → White Label doesn't apply |
| Hotel handoff | Hotellook doesn't support White Label → no change needed |

---

## 13. Exact Files Likely to Change in Later Phase 4 Work

| File | Change |
|---|---|
| `supabase/functions/get-redirect/index.ts` | Make `AVIASALES_BASE` configurable via `Deno.env.get("WHITE_LABEL_HOST")` or similar |
| `src/lib/travelConfig.ts` | Add White Label host pattern to `APPROVED_HOSTS` aviasales entry (allow `bookingsfinder.com` subdomain); potentially add `whiteLabelSearchBaseUrl` |
| `src/lib/outboundTracking.ts` | Add `flights.bookingsfinder.com` as approved outbound host suffix |
| `src/pages/BookingRedirect.tsx` | Verify URL normalization handles White Label paths identically |
| `src/integrations/supabase/types.ts` | No change expected (no schema changes) |
| `supabase/functions/search-flights/index.ts` | No change expected (uses Travelpayouts API, not search URLs) |
| `supabase/config.toml` | No change (project-level config) |
| `.env.example` | Add `VITE_TRAVEL_WHITE_LABEL_HOST=` (already present in code, may need doc update) |
| `PHASE_4_WHITELABEL_INTEGRATION_SPEC.md` | Reference document |

**Files NOT expected to change:**
- All planner files — no IATA codes, no partner URL construction
- Hotel files — Hotellook has no White Label
- Affiliate tracking files — internal identifiers only
- Flight results page — display layer, not URL construction
- Homepage components — navigate to `/flights` only

---

## 14. Recommended Safest Integration Order

| Step | Action | Risk |
|---|---|---|
| 1 | Owner configures `flights.bookingsfinder.com` CNAME in DNS and Travelpayouts dashboard | None (manual) |
| 2 | Add `WHITE_LABEL_HOST` Edge Function secret, update `get-redirect` to use it when set | Low — additive env var |
| 3 | Update `travelConfig.ts` `APPROVED_HOSTS` to accept `bookingsfinder.com` subdomains | Low — expands allowlist |
| 4 | Update `outboundTracking.ts` `APPROVED_HOSTS` to accept White Label host | Low — expands allowlist |
| 5 | Verify `BookingRedirect.tsx` URL normalization handles White Label paths | Low — review only |
| 6 | Deploy updated Edge Function, verify redirect chain end-to-end | Medium — production change |
| 7 | Update `.env.example` documentation for `VITE_TRAVEL_WHITE_LABEL_HOST` | Trivial |
| 8 | Run full test suite, verify all 327+ tests pass | Low — automated |

---

## 15. Confirmation

- ✅ No production behaviour was changed during this audit
- ✅ All 327 tests pass
- ✅ Production build succeeds
- ✅ No code was modified — audit documentation only
- ✅ No `flights.bookingsfinder.com` found in any source file
- ✅ No `whitelabel.travelpayouts.com` found in any source file
- ✅ No Travelpayouts White Label URL patterns found
- ✅ `MARKER_ID` is in Edge Function secrets only — not in client code
- ✅ `TRAVELPAYOUTS_API_KEY` is in Edge Function secrets only — not in client code
- ✅ No direct city-to-IATA mappings exist in the codebase
- ✅ `VITE_TRAVEL_WHITE_LABEL_HOST` env var is already handled in `travelConfig.ts` but empty by default
