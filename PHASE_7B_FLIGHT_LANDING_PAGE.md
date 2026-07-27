# Phase 7B — Flight Landing Page & Conversion UX

## Status
✅ Ready for PR

## Audit Findings

| # | Finding | Action |
|---|---------|--------|
| 1 | `/flights` form-mode had only a heading + form + one link | Added 7 sections: hero, trust strip, popular routes, why-us, tools, FAQ, disclosure |
| 2 | Multi-city tab visible but unsupported (single-leg only) | Added `hideMultiCity` prop to ModernFlightSearch |
| 3 | Validation warning appeared on clean `/flights` (cabinClass default in prefill) | Fixed `hasPrefill` to exclude cabinClass |
| 4 | 3 of 4 tool cards linked to PlaceholderPage | Removed placeholder tools; only Trip Cost Planner remains |
| 5 | Route-aware heading used codes only (`BNE to SYD`) | Added IATA→city lookup for 80+ common airports; city names preferred |
| 6 | File exceeded 700 lines mixing landing-page and results-page concerns | Extracted landing page into `FlightLandingPage.tsx` (364 lines). FlightResults.tsx reduced to 484 lines |

## Page Structure

```
1. Header
2. Hero (dynamic city-name heading) + ModernFlightSearch (hideMultiCity)
3. Trust strip (4 honest claims)
4. Popular routes (6 route cards, route-prefill aware)
5. Why use BookingsFinder (4 value cards)
6. Helpful tools (Trip Cost Planner — verified working)
7. Flight-search FAQ (6 accordion items)
8. Affiliate disclosure
9. Footer
```

## Component Architecture

| Component | Lines | Responsibility |
|-----------|-------|----------------|
| `FlightResults.tsx` | 484 | Route-mode selection, results mode, delegates form mode |
| `FlightLandingPage.tsx` | 364 | Landing page UI: hero, form, trust, routes, values, tools, FAQ, disclosure |
| `ModernFlightSearch.tsx` | ~990 | Canonical flight search form |

FlightLandingPage receives `prefill` and `validationErrors` as props. No validation or routing logic is duplicated.

## Dynamic Route Behaviour

- **Untouched `/flights`**: "Compare flights with BookingsFinder"
- **`/flights?origin=BNE&destination=SYD`**: "Compare flights from Brisbane to Sydney" (city names from 80+ airport lookup)
- **Unknown codes**: Falls back to code display (`KHI to LHE`)
- **Popular route matching**: Same-route card gets highlighted border
- **Invalid prefill**: Validation banner appears only when user-supplied invalid URL params exist

## Validation-Banner Behaviour

| URL | Banner shown? | Reason |
|-----|---------------|--------|
| `/flights` | No | No params = clean state |
| `/flights?origin=BNE&destination=SYD` | No | Valid codes, no error |
| `/flights?origin=BRIS&destination=SYD&departureDate=2026-08-10` | Yes | BRIS is not a valid IATA code |
| `/flights?origin=BNE&destination=SYD&departureDate=bad` | Yes | `bad` is not a valid date |
| `/flights?origin=BNE&destination=SYD&cabinClass=luxury` | Yes | Unsupported cabin class |

## Verified Working Tools

| Tool | Route | Status |
|------|-------|--------|
| Trip Cost Planner | `/trip-cost` | ✅ Real page (TripCostPlannerPage.tsx) |

Removed (placeholder only):
- Passport Validity (`/passport-validity` → PlaceholderPage)
- Visa Requirements (`/visa-requirements` → PlaceholderPage)
- Packing Checklist (`/packing-checklist` → PlaceholderPage)

## SEO

- Dynamic `<title>`: "Compare Brisbane to Sydney Flights | BookingsFinder"
- Dynamic `<meta description>` per route
- Canonical URL: `https://bookingsfinder.com/flights`
- Results-mode SEO unchanged
- No fake route content indexed

## Accessibility

- Single H1 on the page
- Proper heading hierarchy (H1 → H2 → H3)
- Visible focus states (ring styling)
- Keyboard-accessible route cards (Link elements)
- FAQ accordions use Radix Accordion (native aria attributes)
- Validation error banner uses `role="alert"`
- Icons marked `aria-hidden="true"`

## Mobile Behaviour

- Fields stack cleanly at 375px
- No horizontal overflow
- Trust strip wraps to 2 columns
- Route cards stack cleanly
- FAQ accordions are tappable
- BottomNav padding present
- Submit CTA prominent and accessible

## Tests

22 tests covering:
- Hero heading (default, route-aware city names, fallback codes)
- Validation banner (absent on clean, present on invalid)
- Multi-city hidden, Round trip + One way present
- Trust strip renders
- Popular routes render + link structure
- Working tools: Trip Cost Planner only, no placeholders
- Tool link resolves to valid route
- FAQ renders
- Single H1
- Results mode unchanged
- Edit button preserves params

## Files Changed

| File | Action |
|------|--------|
| `src/pages/flight/FlightLandingPage.tsx` | **NEW** — Extracted landing page (364 lines) |
| `src/pages/FlightResults.tsx` | **MODIFIED** — Delegates form mode to FlightLandingPage (484 lines, down from 700+) |
| `src/components/search/ModernFlightSearch.tsx` | **MODIFIED** — Added `hideMultiCity` prop |
| `src/pages/__tests__/FlightResults.form.test.tsx` | **MODIFIED** — 22 tests |
| `PHASE_7B_FLIGHT_LANDING_PAGE.md` | **NEW** — This documentation |

## Deployment

```bash
npm test          # 24 files, ~520 tests
npm run build     # TypeScript + Vite
npm run lint      # No new errors
```

## Rollback

1. Revert FlightResults.tsx form-mode → restore inline JSX
2. Delete FlightLandingPage.tsx
3. Remove `hideMultiCity` from ModernFlightSearch call
4. Revert test file

## Known Limitations

1. Multi-city hidden but not implemented
2. IATA→city lookup covers ~80 airports; unknown codes fall back gracefully
3. Trip Cost Planner is the only verified working tool (3 removed as placeholders)
4. FAQ structured data not implemented
5. iOS safe-area bottom padding may need tuning
