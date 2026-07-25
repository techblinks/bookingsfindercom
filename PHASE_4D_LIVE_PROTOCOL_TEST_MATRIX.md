# Phase 4D — Live Protocol Test Matrix

**Date**: 2026-07-24
**Purpose**: Owner-populated verification of every White Label URL parameter

---

## Instructions for the Owner

1. Open `https://flights.bookingsfinder.com` in a browser
2. Perform each search scenario listed below
3. Copy the resulting URL from the browser address bar
4. Test: refresh the page, open in a new tab, open in Incognito/Private mode
5. Note whether the search executes immediately or only pre-fills the form
6. Paste the URL and notes into the table

**Do not guess.** Leave any cell blank if you couldn't test it.

---

## Required Live Test Scenarios

| # | Trip Type | Origin | Dest | Dep Date | Ret Date | Adults | Children | Infants | Cabin | Currency | Language | Resulting URL | Refresh OK? | New Tab OK? | Incognito OK? | Immediate Search? | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | Return | BNE | SYD | 2026-08-20 | 2026-08-29 | 1 | 0 | 0 | Economy | USD | English | ✅ `?flightSearch=BNE2008SYD2908&destination_airports=0&origin_airports=1` | | | | |
| 2 | One-way | SYD | DPS | 2026-12-20 | — | 1 | 0 | 0 | Economy | USD | English | | | | | |
| 3 | Return | SYD | MEL | 2026-09-10 | 2026-09-15 | 2 | 0 | 0 | Economy | USD | English | | | | | |
| 4 | Return | LAX | JFK | 2026-10-01 | 2026-10-07 | 1 | 1 | 0 | Economy | USD | English | | | | | |
| 5 | Return | LHR | DXB | 2026-11-15 | 2026-11-22 | 1 | 0 | 1 | Economy | USD | English | | | | | |
| 6 | Return | SYD | BNE | 2026-09-01 | 2026-09-05 | 1 | 0 | 0 | Business | USD | English | | | | | |
| 7 | Return | SYD | DPS | 2026-12-25 | 2027-01-10 | 1 | 0 | 0 | Economy | AUD | English | | | | | |
| 8 | Return | PAR | LON | 2026-10-10 | 2026-10-20 | 1 | 0 | 0 | Economy | USD | French | | | | | |

---

## Parameter Encoding Reference

From the live verified sample `BNE2008SYD2908`:

```
BNE    = Origin IATA (Brisbane) — chars 1–3
2008   = Outbound date DDMM (20 August) — chars 4–7
SYD    = Destination IATA (Sydney) — chars 8–10
2908   = Return date DDMM (29 August) — chars 11–14
```

The `flightSearch` parameter is 14 characters for return trips, 10 characters for one-way trips.

---

## Decision Matrix After Live Tests

| Parameter | What to check | Decision |
|---|---|---|
| One-way `flightSearch` format | Does `flightSearch=SYD2012DPS` work? | |
| Adults count | Does adding `&adults=2` change results? Or is it embedded differently? | |
| Children count | Does `&children=1` work? What format? | |
| Infants count | Does `&infants=1` work? What format? | |
| Cabin class | Does `&cabinClass=business` work? Or embedded in `flightSearch`? | |
| Currency | Does `&currency=AUD` work? | |
| Language/locale | Does `&locale=fr` or `&lang=fr` work? | |
| Marker/affiliate | Is it automatic via the project configuration? Or does it need a query param? | Travelpayouts support question |
| Airport flags | Are `origin_airports=1` and `destination_airports=0` required or defaults? | Verify by removing them |
```

---

## Attribution Verification

After the owner confirms that White Label searches work and produce the expected URLs, the following must be verified:

1. **Affiliate commission attribution**: Does the owner see BookingsFinder in their Travelpayouts dashboard after a test booking?
2. **White Label project configuration**: Is `bookingsfinder.com` correctly linked as the White Label domain?
3. **SSL certificate**: Does `https://flights.bookingsfinder.com` load without warnings?
4. **DNS propagation**: Does `flights.bookingsfinder.com` resolve from multiple locations?
