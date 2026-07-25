# Phase 4C — Travelpayouts White Label Deep-Link Protocol

**Date**: 2026-07-24
**Source**: Live browser observation at `https://flights.bookingsfinder.com`

---

## 1. Critical Finding: URL Format Is Entirely Different

Phase 4B assumed the White Label uses the standard Aviasales `/search/ORIGINDATEDESTRETDATE1` path format with only the hostname changing. This is **incorrect**.

The live White Label uses a completely different query-parameter-based deep-link protocol.

---

## 2. Format Comparison

### 2.1 Standard Aviasales Format (current `buildFlightSearchUrl`)

```
https://www.aviasales.com/search/SYD20261225DPS1
  ?origin_iata=SYD
  &destination_iata=DPS
  &depart_date=2026-12-25
  &return_date=2027-01-10
  &adults=2
  &marker=12345
```

- Path-based routing: `/search/` + encoded route string
- Date format: `YYYYMMDD` (8 chars per date)
- Query params appended separately
- One-way: `/search/SYD20261225DPS1`
- Return: `/search/SYD20261225DPS202701101`

### 2.2 Actual White Label Format (verified from live browser)

```
https://flights.bookingsfinder.com/
  ?flightSearch=BNE2008SYD2908
  &destination_airports=0
  &origin_airports=1
```

- **Query-parameter-based**: single `flightSearch` param, no path routing
- **Date format**: `DDMM` (4 chars per date, day+month only — no year)
- **Encoding**: `ORIGIN + DDMM + DEST + DDMM` concatenated
- **Airport flags**: `origin_airports=1`, `destination_airports=0`
- **No separate query params** for IATA codes, dates, or adults

### 2.3 Encoding Breakdown

The observed value `BNE2008SYD2908` decodes as:

```
BNE    = Origin IATA (Brisbane)
2008   = Outbound date (20 August, year inferred)
SYD    = Destination IATA (Sydney)
2908   = Return date (29 August, year inferred)
```

**Total length**: 3 + 4 + 3 + 4 = 14 characters for a return trip.

For one-way trips (unverified, needs live testing):
```
SYD2012DPS = SYD + 20 Dec + DPS (10 chars)
```
or possibly:
```
SYD2012DPS- = SYD + 20 Dec + DPS + "-"
```
?

---

## 3. Parameter Encoding Table

| Parameter | Standard Aviasales | White Label | Verified? |
|---|---|---|---|
| Origin IATA | `origin_iata=SYD` query param | `flightSearch` prefix (first 3 chars) | ✅ |
| Destination IATA | `destination_iata=DPS` query param | `flightSearch` chars 7-9 | ✅ |
| Outbound date | `depart_date=YYYY-MM-DD` | `flightSearch` chars 3-6 as `DDMM` | ✅ |
| Return date | `return_date=YYYY-MM-DD` | `flightSearch` chars 10-13 as `DDMM` | ✅ |
| One-way trips | `/search/SYD20261225DPS1` (no return) | **UNVERIFIED** — need to test `flightSearch=SYD2012DPS` or similar | ❓ |
| Adults | `adults=N` query param | **UNVERIFIED** — may be embedded in `flightSearch` or separate param | ❓ |
| Children | Unknown | **UNVERIFIED** | ❓ |
| Infants | Unknown | **UNVERIFIED** | ❓ |
| Cabin class | `cabin_class=business` | **UNVERIFIED** — may be separate param | ❓ |
| Currency | None (server-side) | **UNVERIFIED** | ❓ |
| Locale | None (server-side) | **UNVERIFIED** | ❓ |
| Airport flags | Not applicable | `origin_airports=1`, `destination_airports=0` | ✅ |
| Marker (affiliate) | `marker=12345` query param | **UNVERIFIED** — may not exist on White Label (integrated at Travelpayouts level) | ❓ |

---

## 4. Behaviour Verification

### 4.1 URL State Survives Reload
✅ Confirmed — the `flightSearch` parameter is read by the White Label SPA on load. Refreshing the page preserves the search.

### 4.2 Works in Private/Incognito
✅ Expected — no cookies/localStorage dependency for search state. The URL IS the state.

### 4.3 Does `/search/...` Work on White Label?
**UNVERIFIED** — need to test `https://flights.bookingsfinder.com/search/BNE20080815SYD1`.

Hypothesis: The White Label SPA may not recognize the Aviasales-style path format. The `flightSearch` query parameter appears to be the primary interface.

### 4.4 Is Only `flightSearch` Required?
Appears so. The `origin_airports` and `destination_airports` flags are present but may be defaults. Testing with only `?flightSearch=BNE2008SYD2908` would confirm.

---

## 5. Impact on Phase 4B

### 5.1 Code That Incorrectly Assumes Only Hostname Changes

| File | Function | Issue |
|---|---|---|
| `src/lib/travelConfig.ts` | `buildFlightSearchUrl()` | Uses `/search/` path format — White Label doesn't use this |
| `supabase/functions/get-redirect/index.ts` | `get-redirect` | Builds `${AVIASALES_BASE}/search/...` — this URL path won't work on White Label |
| `src/lib/__tests__/travelConfig.test.ts` | `buildFlightSearchUrl` tests | Expect `/search/SYD...` path format — White Label uses `?flightSearch=...` |

The Phase 4B host-change infrastructure is still correct — `getWhiteLabelHost()`, `isApprovedHost()`, and `APPROVED_HOSTS` expansion remain valid. The URL builder itself needs a parallel implementation for White Label, not a replacement.

### 5.2 Code That Is Still Correct

- `getWhiteLabelHost()` — host normalization and caching ✅
- `isApprovedHost()` — host allowlist expansion ✅
- `getEffectiveBaseUrl()` — host preference logic ✅
- Edge Function `AVIASALES_BASE` env-driven config ✅

---

## 6. Recommended Typed URL Builder Contract

### 6.1 New Function: `buildWhiteLabelFlightUrl()`

```typescript
interface WhiteLabelFlightParams {
  origin: string;          // 3-char IATA code (required)
  destination: string;     // 3-char IATA code (required)
  outboundDate: string;    // "YYYY-MM-DD" (required)
  returnDate?: string;     // "YYYY-MM-DD" (optional — for return trips)
  adults?: number;         // **UNVERIFIED** — default 1 if supported
  children?: number;       // **UNVERIFIED**
  infants?: number;        // **UNVERIFIED**
  cabinClass?: string;     // **UNVERIFIED**
  currency?: string;       // **UNVERIFIED**
}

interface WhiteLabelUrlResult {
  success: boolean;
  url: string | null;
  reason?: string;
  /** Parameters that could not be encoded because they are unverified. */
  unverifiedParams?: string[];
}
```

### 6.2 Encoding Rules (Verified Only)

1. Convert outbound date from `YYYY-MM-DD` to `DDMM` (take substring 8,9 + 5,6 → "DDMM")
2. If return date exists, convert to `DDMM` and append after destination
3. If no return date, append **nothing** after destination (one-way) — **NEEDS VERIFICATION**
4. Construct: `{host}?flightSearch={ORIGIN}{DDMM}{DEST}[{DDMM}]&origin_airports=1&destination_airports=0`
5. Use `URL` + `URLSearchParams` for construction — never string concatenation
6. If White Label is not configured, return failure (don't fall back to Aviasales path format — caller should use `buildFlightSearchUrl()` instead)

---

## 7. Safest Fallback to Internal `/flights`

When White Label is not configured OR the desired parameter is unverified:

1. Navigate to `/flights?origin=...&destination=...&departureDate=...&passengers=...`
2. Let the user complete the search on the internal page with the onboard airport selectors
3. From `/flights`, the user can use the Search form which calls `search-flights` Edge Function

This fallback is already implemented in `buildInternalFlightUrl()` and `mapPlannerToFlightHandoff()`.

---

## 8. Unresolved Parameters

| Parameter | Priority | How to Verify |
|---|---|---|
| One-way trip format | **High** | Test `flightSearch=SYD2012DPS` on White Label |
| Adults count | **High** | Test adding `&adults=2` or embed in `flightSearch` |
| Children/infants | Medium | Test with Travelpayouts docs or live trial |
| Cabin class | Medium | Test adding `&cabinClass=business` |
| Currency | Medium | Test adding `&currency=AUD` |
| Locale | Low | Test adding `&locale=en` |
| Marker/affiliate | **High** | Ask Travelpayouts support — may be configured at project level |
| Origin/destination airport flags | Low | Already observed: `origin_airports=1`, `destination_airports=0` |

---

## 9. Implementation Status

- [x] Document protocol differences
- [x] Compare existing vs. White Label formats
- [x] Identify Phase 4B code that needs redesign
- [ ] Create White Label URL builder (only verified parameters)
- [ ] Add tests using verified URL formats
- [ ] Keep rollout disabled (WHITE_LABEL_HOST unset by default)
- [ ] Do NOT replace existing `buildFlightSearchUrl()` or Edge Function logic
