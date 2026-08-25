# BF1-E CONTRACT-PARITY CLOSEOUT working notes

## Baseline (7745ddd) observable contracts — extracted

### get-special-offers (baseline)
- success populated: `{ offers: [...], currency, source: "travelpayouts_latest" }`
- upstream !success or !data: `{ offers: [], source: "empty" }`   <-- FIX 1 TARGET
- provider non-ok w/ any body: `errorResponse("Failed to fetch offers", response.status)` (real status!)
- throw / invalid JSON from provider: catch -> 500 `{ error: message || "Internal error" }`
- found_at fabricated: `deal.found_at || new Date().toISOString()`  <-- SANCTIONED REMOVAL

### get-popular-directions (baseline)
- missing origin -> 400 `{ error: "origin IATA code is required" }`
- success: `{ routes, currency: data.currency || currency, success: true }`  <-- FIX 2 TARGET (upstream currency FIRST)
- provider non-ok: status = response.status, body = `{ error: "Failed to fetch popular directions" }`
- BUT: `await response.json()` runs BEFORE ok-check => non-JSON error body THROWS -> catch -> 500
- catch: 500 `{ error: error.message || "Internal error" }`

### get-price-calendar (baseline)
- missing origin/destination/month -> 400
- success: `{ prices, success: true }` (no top-level origin/destination/month/currency echo)
- provider non-ok WITH parseable JSON body: status = response.status, body = `{ error: data.error || "Failed to fetch price calendar" }`
- provider non-ok with NON-JSON body: response.json() THROWS -> catch -> 500 generic   <-- FIX 3 nuance
- catch: 500 `{ error: error.message || "Internal error" }`

## BF1-E current-state observations

travelpayoutsProvider.getPriceCalendar:
- `await response.json()` BEFORE ok-check (same as baseline) -> non-JSON error body still throws untyped -> handler catch -> 500. SAME as legacy for that case.
- non-ok + parseable JSON -> throws TravelpayoutsError(data.error||..., response.status). Handler then returns errorResponse(msg, statusCode) => REAL STATUS EXPOSED.
  => This matches legacy behavior for JSON-error bodies! Legacy ALSO returned response.status there.

## TODO verify in BF1-E handlers + wire + tests
- [ ] get-price-calendar/index.ts handler error mapping (does it pass through TravelpayoutsError.statusCode?)
- [ ] flightWire.ts serializers (source values, currency handling, field shapes)
- [ ] get-popular-directions/index.ts handler (currency echo source)
- [ ] get-route-prices + search-flights baselines vs BF1-E
