# Trip Cost Planner — MVP Specification

**Branch**: `bookingsfinder-v2-phase2a-trip-cost-spec`
**Date**: 2026-07-20
**Status**: Specification (implementation deferred to later phase)
**Route**: `/trip-cost`
**Product**: Trip Budget Planner

---

## Table of Contents

1. [Product Positioning](#1-product-positioning)
2. [MVP User Journey](#2-mvp-user-journey)
3. [Information Architecture](#3-information-architecture)
4. [Trip Details](#4-trip-details)
5. [Travellers](#5-travellers)
6. [Flights and Airport Costs](#6-flights-and-airport-costs)
7. [Accommodation](#7-accommodation)
8. [Daily Spending](#8-daily-spending)
9. [Insurance and Connectivity](#9-insurance-and-connectivity)
10. [Activities](#10-activities)
11. [Contingency](#11-contingency)
12. [Optional Budget Mode](#12-optional-budget-mode)
13. [Calculation Model](#13-calculation-model)
14. [State Model](#14-state-model)
15. [Validation Rules](#15-validation-rules)
16. [Summary Panel](#16-summary-panel)
17. [Category Breakdown Visual](#17-category-breakdown-visual)
18. [Print, PDF and Share](#18-print-pdf-and-share)
19. [Reset and Draft Handling](#19-reset-and-draft-handling)
20. [Accessibility](#20-accessibility)
21. [Responsive Design](#21-responsive-design)
22. [Design System](#22-design-system)
23. [SEO](#23-seo)
24. [Analytics](#24-analytics)
25. [Trust and Safety Copy](#25-trust-and-safety-copy)
26. [Technical Implementation Plan](#26-technical-implementation-plan)
27. [Testing Plan](#27-testing-plan)
28. [Performance](#28-performance)
29. [Deliberate MVP Exclusions](#29-deliberate-mvp-exclusions)
30. [Future Phases](#30-future-phases)
31. [Implementation Sequence](#31-implementation-sequence)
32. [Acceptance Criteria](#32-acceptance-criteria)
33. [Spec Decisions Summary](#33-spec-decisions-summary)
34. [Repository Inspection](#34-repository-inspection)

---

## 1. Product Positioning

### Product Name

**Trip Budget Planner**

### Primary User Question

> "How much will my whole trip actually cost?"

### What the MVP Is

- A planning tool where the user enters their own estimated values
- A calculator that derives totals, per-person costs and per-day costs from user input
- A shareable, printable budget summary
- Accessible, mobile-first and usable without login
- Built entirely client-side — no server requests for calculations

### What the MVP Is Not

- A live quote generator
- A provider comparison engine
- Financial or insurance advice
- A guarantee of actual travel cost
- A destination cost database
- An AI-powered recommendation tool

### Route

```
/trip-cost
```

Replaces the existing placeholder route. The current placeholder at `src/App.tsx:83` renders `<PlaceholderPage title="Trip Cost Planner" description="Estimate the full cost of your journey — coming soon." />`.

### Page Metadata

- **Title**: `Trip Budget Planner — Estimate the Full Cost of Your Trip`
- **H1**: `Plan the full cost of your trip.`
- **Supporting copy**: `Add flights, accommodation, daily spending and other travel costs to build a complete trip budget.`
- **Canonical**: `https://bookingsfinder.com/trip-cost`
- **Indexable**: Yes (remove `noindex` from placeholder)

---

## 2. MVP User Journey

### First-Time Empty State

1. User navigates to `/trip-cost`
2. Sees the page heading, a short explanation, and the planning disclaimer
3. Sees collapsed accordion sections for each cost category
4. Sees an empty summary panel showing `$0` totals
5. The first accordion section (Trip Details) is expanded by default
6. All other sections are collapsed

### Sensible Defaults

| Field | Default |
|---|---|
| Currency | AUD |
| Adults | 1 |
| Children | 0 |
| Infants | 0 |
| Departure date | Today |
| Return date | Today + 7 days |
| Accommodation nights | Auto-calculated from trip dates (7) |
| Daily spending days | Auto-calculated from trip dates (8) |
| Contingency | 10% |
| Activity quantity | 1 |

### Progressive Disclosure

1. **Trip Details** expand first — user sets destination and dates
2. Once dates are set, **Accommodation** nights and **Daily Spending** days auto-populate
3. **Travellers** helps per-person calculations
4. Each cost section expands as the user fills in preceding sections
5. The **Summary Panel** updates immediately with every valid input change
6. **Print/Share** actions appear only when at least one cost category has a value above $0

### Error States

| State | Behaviour |
|---|---|
| Return date before departure | Inline error on return date field; date-derived values show `—` |
| Zero travellers | Inline error on traveller fields; per-person costs show `—` |
| Negative values | Inline error; value excluded from totals |
| Non-numeric input | Inline error; field treated as `0` with visible warning |
| localStorage unavailable | Silent fallback; draft saving disabled with console notice |
| localStorage corrupted | Parse safely; discard corrupted draft; notify user once |

### Reset Flow

1. User clicks "Reset" (destructive button)
2. Confirmation dialog: "Reset all trip data? Your current entries will be lost."
3. On confirm: all state reverts to defaults, saved draft is cleared
4. On cancel: no action

### Print Flow

1. User clicks "Print or save as PDF"
2. Browser print dialog opens
3. Print stylesheet hides navigation, footer, form controls, CTAs
4. Printed output shows trip details, category totals, final totals, disclaimer, generated date

### Share Flow

1. User clicks "Share"
2. If `navigator.share` is available: Web Share API opens with text summary
3. If not available: text summary copied to clipboard
4. Toast confirmation: "Trip summary copied to clipboard" or "Shared successfully"
5. No server upload, no public URL generation

### Mobile Flow

1. All sections are accordion-collapsed except Trip Details
2. A compact sticky total bar appears at the top after scrolling past the heading
3. The sticky bar shows: destination (if set), total cost, currency
4. The sticky bar does not overlap the bottom navigation (`pb-20` safe zone)
5. Accordion headers are `min-h-[56px]` for touch targets

### Desktop Flow

1. Two-column layout: form (left, ~60%) + sticky summary (right, ~40%)
2. Summary remains visible as the user scrolls
3. Sections are visible cards (not accordions) at `lg+`
4. Accordion behaviour applies at `md` and below

---

## 3. Information Architecture

### Page Structure (Top to Bottom)

```
1. Global Header
2. Breadcrumb: Home > Trip Budget Planner
3. Page heading (H1) + supporting copy
4. Planning disclaimer
5. Sticky mobile total bar (mobile only, hidden until scrolled past heading)
6. Trip Details (accordion section / desktop card)
7. Travellers (accordion section / desktop card)
8. Flights and airport costs (accordion section / desktop card)
9. Accommodation (accordion section / desktop card)
10. Daily spending (accordion section / desktop card)
11. Insurance and connectivity (accordion section / desktop card)
12. Activities (accordion section / desktop card)
13. Contingency (accordion section / desktop card)
14. Summary Panel (sticky right on desktop, normal flow on mobile)
15. Category Breakdown (horizontal bar chart)
16. Print / PDF / Share actions
17. Educational note
18. Global Footer
```

### Desktop Layout

```
+------------------------------------------+
|              Global Header               |
+------------------------------------------+
| Breadcrumb                               |
+------------------------------------------+
| H1 + supporting copy + disclaimer        |
+------------------------------------------+
|  Form (60%)      | Summary Panel (40%)   |
|                  |   (sticky)            |
| Trip Details     |                       |
| Travellers       |  Trip name/currency   |
| Flights          |  Dates & travellers   |
| Accommodation    |  Category subtotals   |
| Daily spending   |  Contingency          |
| Insurance        |  Total                |
| Activities       |  Per traveller        |
| Contingency      |  Per day              |
|                  |                       |
| Category         |                       |
| Breakdown        |                       |
|                  |                       |
| Print / Share    |                       |
|                  |                       |
| Educational note |                       |
+------------------------------------------+
|              Global Footer               |
+------------------------------------------+
```

### Mobile Layout

```
+------------------------------------------+
|              Global Header               |
+------------------------------------------+
| Breadcrumb                               |
| H1 + supporting copy + disclaimer        |
+------------------------------------------+
| [Sticky total bar - after scroll]        |
+------------------------------------------+
| ▸ Trip Details                           |
| ▸ Travellers                             |
| ▸ Flights and airport costs              |
| ▸ Accommodation                          |
| ▸ Daily spending                         |
| ▸ Insurance and connectivity             |
| ▸ Activities                             |
| ▸ Contingency                            |
+------------------------------------------+
| Summary Panel (full width)               |
| Category Breakdown                       |
| Print / Share                            |
| Educational note                         |
+------------------------------------------+
|              Global Footer               |
+------------------------------------------+
```

---

## 4. Trip Details

### Fields

| Field | Type | Required | Default | Notes |
|---|---|---|---|---|
| Trip name | text (optional) | No | `""` | Max 100 chars; placeholder "e.g. Bali 2026" |
| Departure country | text | No | `""` | Free text; placeholder "e.g. Australia" |
| Departure city | text | No | `""` | Free text; placeholder "e.g. Sydney" |
| Destination country | text | No | `""` | Free text |
| Destination city | text | No | `""` | Free text |
| Departure date | date | No | Today | Native date input |
| Return date | date | No | Today + 7 | Native date input |
| Currency | select | Yes | AUD | Static list; see below |

### Currency Behaviour

**Supported currencies (static list):**

| Code | Symbol | Display decimal |
|---|---|---|
| AUD | $ | 2 decimals |
| USD | $ | 2 decimals |
| NZD | $ | 2 decimals |
| GBP | £ | 2 decimals |
| EUR | € | 2 decimals |
| CAD | $ | 2 decimals |
| JPY | ¥ | 0 decimals |

- **Default**: AUD
- **No conversion**: Changing currency changes the display symbol only
- **Disclaimer**: "Enter all amounts in your selected currency. No currency conversion is performed."
- **JPY special case**: Displayed without decimal places; internal calculations still use full precision

### Date Calculations

```
nights = differenceInCalendarDays(returnDate, departureDate)
days = nights + 1
```

- Use `date-fns/differenceInCalendarDays` (already in project)
- `days` = calendar days including both departure and return
- If departure date only: `nights = 0`, `days = 1`
- If no dates: `nights = 0`, `days = 0` — display `—`
- Return date must be after departure date
- Departure date may be today or any future/past date (no restriction — planning is forward-looking but users may plan retrospectively)

### Missing Date Behaviour

When dates are missing:
- Accommodation nights default displays `—`
- Daily spending days default displays `—`
- User can still manually enter nights/days
- Per-day calculations show `—`

---

## 5. Travellers

### Fields

| Field | Type | Required | Default | Min | Max |
|---|---|---|---|---|---|
| Adults | number | Yes | 1 | 0 | 20 |
| Children | number | No | 0 | 0 | 20 |
| Infants | number | No | 0 | 0 | 20 |

### Rules

- At least one traveller total (adults + children + infants ≥ 1)
- Whole numbers only (step = 1)
- Total travellers cannot exceed 20
- Display total: "3 travellers (2 adults, 1 child)"

### Infants

- Infants count toward total traveller count
- Infants count toward cost-per-traveller calculation
- Category costs remain user-entered; no automatic age-based inference
- Airfare fields are separate per age group (adult fare × adults, child fare × children, infant fare × infants)

### Error Validation

| Condition | Error |
|---|---|
| Adults + Children + Infants = 0 | "At least one traveller is required" |
| Total > 20 | "Maximum 20 travellers" |
| Negative value | "Must be 0 or more" |
| Decimal value | "Must be a whole number" |

---

## 6. Flights and Airport Costs

### Fields

| Field | Type | Multiplier | Default |
|---|---|---|---|
| Adult airfare | number ($) | × adults | `""` |
| Child airfare | number ($) | × children | `""` |
| Infant airfare | number ($) | × infants | `""` |
| Checked baggage | number ($) | — fixed | `""` |
| Seat selection | number ($) | — fixed | `""` |
| Airport parking | number ($) | — fixed | `""` |
| Departure transfer | number ($) | — fixed | `""` |
| Arrival transfer | number ($) | — fixed | `""` |
| Other flight costs | number ($) | — fixed | `""` |

### Labels (to avoid ambiguity)

```
Adult airfare (per adult)
Child airfare (per child)
Infant airfare (per infant)
Checked baggage (total)
Seat selection (total)
Airport parking (total)
Departure airport transfer (total)
Arrival airport transfer (total)
Other flight-related costs (total)
```

### Calculation

```
flightsSubtotal =
  (adultAirfare × adults) +
  (childAirfare × children) +
  (infantAirfare × infants) +
  checkedBaggage +
  seatSelection +
  airportParking +
  departureTransfer +
  arrivalTransfer +
  otherFlightCosts
```

### Rules

- Airfares are multiplied by their respective traveller count
- Fixed extras (baggage, seats, transfers) are NOT multiplied
- Clear field labels distinguish "per person" from "total"
- No live airfare data, no fallback values, no hidden defaults
- All fields accept 0 or empty (treated as 0)

---

## 7. Accommodation

### Accommodation Type

Select field with options:

| Value | Label |
|---|---|
| `hotel` | Hotel |
| `apartment` | Apartment |
| `hostel` | Hostel |
| `resort` | Resort |
| `holiday-rental` | Holiday rental |
| `family-friends` | Staying with family or friends |
| `other` | Other |

Default: `hotel`

### Cost Fields

| Field | Type | Default | Notes |
|---|---|---|---|
| Cost per night | number ($) | `""` | |
| Number of nights | number | auto | Auto from trip dates, editable |
| Accommodation taxes | number ($) | `""` | Fixed total |
| Cleaning fee | number ($) | `""` | Fixed total |
| Resort fee | number ($) | `""` | Fixed total |
| Booking fee | number ($) | `""` | Fixed total |
| Other accommodation costs | number ($) | `""` | Fixed total |

### Night Auto-Calculation and Manual Override

1. When valid trip dates exist: `nights = calculatedNights`
2. When the user manually edits the nights field: a flag `nightsManuallySet = true` is set
3. When trip dates change:
   - If `nightsManuallySet === false`: auto-update nights
   - If `nightsManuallySet === true`: preserve user's manual value
4. When the user clears the field and blurs: reset to auto-calculated value and clear the flag
5. A small note below the field: "Auto-filled from trip dates" (when auto) or "Manually set" (when overridden)

### Calculation

```
accommodationSubtotal =
  (costPerNight × nights) +
  taxes +
  cleaningFee +
  resortFee +
  bookingFee +
  otherAccommodationCosts
```

---

## 8. Daily Spending

### Categories

| Category | Daily Amount Field | Days Field | Default Days |
|---|---|---|---|
| Food and drinks | `foodDrinksDaily` | `foodDrinksDays` | Trip days |
| Local transport | `transportDaily` | `transportDays` | Trip days |
| Shopping | `shoppingDaily` | `shoppingDays` | Trip days |
| Entertainment | `entertainmentDaily` | `entertainmentDays` | Trip days |
| Miscellaneous | `miscDaily` | `miscDays` | Trip days |

### Days Auto-Calculation

Same pattern as accommodation nights — auto-populated from trip dates, manually overridable, with a `[category]DaysManuallySet` flag per category.

### Calculation

```
dailySpendingSubtotal =
  (foodDrinksDaily × foodDrinksDays) +
  (transportDaily × transportDays) +
  (shoppingDaily × shoppingDays) +
  (entertainmentDaily × entertainmentDays) +
  (miscDaily × miscDays)
```

### Clarification

- Values represent the total amount per day for the whole trip, not per traveller
- A small note: "Enter the total amount per day for the whole trip, not per traveller."
- Per-person daily spending is derived in the summary: `dailySpendingSubtotal ÷ travellers`

---

## 9. Insurance and Connectivity

### Fields

All fields are fixed totals (not per-person, not per-day).

| Field | Type | Default |
|---|---|---|
| Travel insurance | number ($) | `""` |
| eSIM or mobile data | number ($) | `""` |
| Roaming charges | number ($) | `""` |
| Vaccinations / travel health | number ($) | `""` |
| Visa or entry fees | number ($) | `""` |
| Passport-related costs | number ($) | `""` |
| Other preparation costs | number ($) | `""` |

### Calculation

```
preparationSubtotal = sum of all entered values
```

### Disclaimer (displayed in this section)

> "Use official government and provider sources to confirm requirements and fees. Values entered here are for planning only."

---

## 10. Activities

### Repeatable Activity Rows

Each row:

| Field | Type | Default | Required |
|---|---|---|---|
| Activity name | text | `""` | Yes, if cost > 0 |
| Cost | number ($) | `""` | No |
| Quantity | number | 1 | No |
| Remove button | action | — | — |

### Rules

- Quantity defaults to 1
- Activity name required when cost is entered
- Cost cannot be negative
- Quantity must be a positive whole number (≥ 1)
- "Add activity" button appends a new empty row
- "Remove" button (trash icon) removes the row
- Support at least 20 rows without layout problems
- Rows are in a `<ul>` with semantic labels
- Each row has a unique `id` for React keys (use `crypto.randomUUID()` or incrementing counter)

### Empty State

- "No activities added yet. Add tours, excursions and experiences."
- First row is NOT pre-populated — user explicitly adds

### Calculation

```
activitiesSubtotal = sum of (cost × quantity) for all rows
```

### Accessibility

- Each row has `aria-label="Activity {n}: {name}"`
- Remove button has `aria-label="Remove {activity name}"`
- Add button has `aria-label="Add activity"`
- Focus moves to new activity name field after adding

---

## 11. Contingency

### Options

| Mode | Value | Notes |
|---|---|---|
| None | 0% | Zero contingency |
| 5% | 5% | |
| 10% (default) | 10% | |
| 15% | 15% | |
| Custom % | user-entered | 0–100% |
| Custom $ | user-entered | Fixed dollar amount |

### Default

**10%**

### Calculation

```
subtotalBeforeContingency =
  flightsSubtotal +
  accommodationSubtotal +
  dailySpendingSubtotal +
  preparationSubtotal +
  activitiesSubtotal

if mode === "none":
  contingencyAmount = 0
if mode is percentage:
  contingencyAmount = subtotalBeforeContingency × (percentage / 100)
if mode is fixed:
  contingencyAmount = userEnteredFixedAmount

total = subtotalBeforeContingency + contingencyAmount
```

### Rules

- Custom percentage: 0–100%
- Fixed amount: cannot be negative
- Switching modes preserves previously entered custom values within the current session
- Percentage-based contingency recalculates when any input changes
- Fixed contingency stays constant unless user changes it
- Contingency shown as a separate line in the summary, not hidden in totals

---

## 12. Optional Budget Mode

### Decision: **Excluded from Phase 2A MVP**

**Reasoning:**

Budget Modes (Budget, Comfort, Premium, Luxury, Custom) imply destination-based dollar pre-fills. Without a verified destination-cost data source, these would be:

- Fake marketing claims if hardcoded
- Misleading if labelled as "average" without provenance
- Technically complex to implement correctly

**Future path (Phase 2C):**

When a verified destination-cost data strategy exists, Budget Modes can be reintroduced as optional organisational labels with:

- Clear disclaimers about data source and accuracy
- No pre-fill without a documented, reproducible data pipeline
- Australian market focus in the `.com.au` edition

**MVP alternative:**

Users can create their own labels using the optional Trip Name field. No auto-pricing.

---

## 13. Calculation Model

### Complete Formula

```
// ── Subtotals ──

flightsSubtotal = (adultAirfare × adults) + (childAirfare × children) + (infantAirfare × infants)
                + checkedBaggage + seatSelection + airportParking
                + departureTransfer + arrivalTransfer + otherFlightCosts

accommodationSubtotal = (costPerNight × nights) + taxes + cleaningFee + resortFee
                       + bookingFee + otherAccommodationCosts

dailySpendingSubtotal = (foodDrinksDaily × foodDrinksDays) + (transportDaily × transportDays)
                       + (shoppingDaily × shoppingDays) + (entertainmentDaily × entertainmentDays)
                       + (miscDaily × miscDays)

preparationSubtotal = travelInsurance + esimMobileData + roaming + vaccinations
                     + visaFees + passportCosts + otherPreparationCosts

activitiesSubtotal = Σ (activity.cost × activity.quantity) for all activities

subtotalBeforeContingency = flightsSubtotal + accommodationSubtotal + dailySpendingSubtotal
                           + preparationSubtotal + activitiesSubtotal

contingencyAmount =
  | mode=none            → 0
  | mode=percentage(pct) → subtotalBeforeContingency × (pct / 100)
  | mode=fixed(amt)      → amt

total = subtotalBeforeContingency + contingencyAmount

// ── Derived totals ──

totalTravellers = adults + children + infants

costPerTraveller = totalTravellers > 0 ? total / totalTravellers : undefined
tripDays = (returnDate && departureDate) ? differenceInCalendarDays(returnDate, departureDate) + 1 : undefined
costPerDay = tripDays > 0 ? total / tripDays : undefined
costPerTravellerPerDay = (tripDays > 0 && totalTravellers > 0) ? total / tripDays / totalTravellers : undefined
```

### Division-by-Zero Handling

| Condition | Display |
|---|---|
| Total travellers = 0 | `—` for cost-per-traveller |
| Trip days = 0 or missing | `—` for cost-per-day |
| Both zero | `—` for both |
| Never display `NaN`, `Infinity`, or `$0` incorrectly | |

### Rounding

- Calculations use full JavaScript floating-point internally
- Display values formatted to 2 decimal places (0 decimal for JPY)
- `Intl.NumberFormat` for locale-aware formatting
- No silent rounding of user input values
- Totals may display minor floating-point precision (acceptable for MVP)

### Currency Formatting

```typescript
function formatCurrency(amount: number, currency: string): string {
  if (currency === "JPY") {
    return `¥${Math.round(amount).toLocaleString()}`;
  }
  const decimals = 2;
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
}
```

---

## 14. State Model

### TypeScript Interfaces

```typescript
// ── types.ts ──

export type CurrencyCode = "AUD" | "USD" | "NZD" | "GBP" | "EUR" | "CAD" | "JPY";

export type AccommodationType = "hotel" | "apartment" | "hostel" | "resort" | "holiday-rental" | "family-friends" | "other";

export type ContingencyMode = "none" | "pct-5" | "pct-10" | "pct-15" | "pct-custom" | "fixed";

export interface TripDetails {
  tripName: string;
  departureCountry: string;
  departureCity: string;
  destinationCountry: string;
  destinationCity: string;
  departureDate: string;        // ISO date "YYYY-MM-DD"
  returnDate: string;           // ISO date "YYYY-MM-DD"
  currency: CurrencyCode;
}

export interface Travellers {
  adults: number;
  children: number;
  infants: number;
}

export interface FlightCosts {
  adultAirfare: number;
  childAirfare: number;
  infantAirfare: number;
  checkedBaggage: number;
  seatSelection: number;
  airportParking: number;
  departureTransfer: number;
  arrivalTransfer: number;
  otherFlightCosts: number;
}

export interface AccommodationCosts {
  type: AccommodationType;
  costPerNight: number;
  nights: number;
  nightsManuallySet: boolean;
  taxes: number;
  cleaningFee: number;
  resortFee: number;
  bookingFee: number;
  otherCosts: number;
}

export interface DailySpending {
  foodDrinksDaily: number;
  foodDrinksDays: number;
  foodDrinksDaysManual: boolean;
  transportDaily: number;
  transportDays: number;
  transportDaysManual: boolean;
  shoppingDaily: number;
  shoppingDays: number;
  shoppingDaysManual: boolean;
  entertainmentDaily: number;
  entertainmentDays: number;
  entertainmentDaysManual: boolean;
  miscDaily: number;
  miscDays: number;
  miscDaysManual: boolean;
}

export interface PreparationCosts {
  travelInsurance: number;
  esimMobileData: number;
  roaming: number;
  vaccinations: number;
  visaFees: number;
  passportCosts: number;
  otherCosts: number;
}

export interface ActivityItem {
  id: string;
  name: string;
  cost: number;
  quantity: number;
}

export interface ContingencyConfig {
  mode: ContingencyMode;
  customPercentage: number;       // saved when switching away from pct-custom
  customFixedAmount: number;      // saved when switching away from fixed
}

export interface TripCostPlannerState {
  tripDetails: TripDetails;
  travellers: Travellers;
  flightCosts: FlightCosts;
  accommodationCosts: AccommodationCosts;
  dailySpending: DailySpending;
  preparationCosts: PreparationCosts;
  activities: ActivityItem[];
  contingency: ContingencyConfig;
}

export interface TripCostSummary {
  flightsSubtotal: number;
  accommodationSubtotal: number;
  dailySpendingSubtotal: number;
  preparationSubtotal: number;
  activitiesSubtotal: number;
  subtotalBeforeContingency: number;
  contingencyAmount: number;
  total: number;
  totalTravellers: number;
  tripNights: number | undefined;
  tripDays: number | undefined;
  costPerTraveller: number | undefined;
  costPerDay: number | undefined;
  costPerTravellerPerDay: number | undefined;
}
```

### Default (Initial) State

```typescript
const today = new Date();
const returnDefault = addDays(today, 7);

const INITIAL_STATE: TripCostPlannerState = {
  tripDetails: {
    tripName: "",
    departureCountry: "",
    departureCity: "",
    destinationCountry: "",
    destinationCity: "",
    departureDate: format(today, "yyyy-MM-dd"),
    returnDate: format(returnDefault, "yyyy-MM-dd"),
    currency: "AUD",
  },
  travellers: { adults: 1, children: 0, infants: 0 },
  flightCosts: {
    adultAirfare: 0, childAirfare: 0, infantAirfare: 0,
    checkedBaggage: 0, seatSelection: 0, airportParking: 0,
    departureTransfer: 0, arrivalTransfer: 0, otherFlightCosts: 0,
  },
  accommodationCosts: {
    type: "hotel", costPerNight: 0, nights: 7, nightsManuallySet: false,
    taxes: 0, cleaningFee: 0, resortFee: 0, bookingFee: 0, otherCosts: 0,
  },
  dailySpending: {
    foodDrinksDaily: 0, foodDrinksDays: 8, foodDrinksDaysManual: false,
    transportDaily: 0, transportDays: 8, transportDaysManual: false,
    shoppingDaily: 0, shoppingDays: 8, shoppingDaysManual: false,
    entertainmentDaily: 0, entertainmentDays: 8, entertainmentDaysManual: false,
    miscDaily: 0, miscDays: 8, miscDaysManual: false,
  },
  preparationCosts: {
    travelInsurance: 0, esimMobileData: 0, roaming: 0,
    vaccinations: 0, visaFees: 0, passportCosts: 0, otherCosts: 0,
  },
  activities: [],
  contingency: { mode: "pct-10", customPercentage: 10, customFixedAmount: 0 },
};
```

### Local Persistence

**Decision: Include in MVP**

**Implementation:**

- Storage key: `trip_cost_planner_draft_v1`
- Autosave on every state change with a 500ms debounce
- On page load: attempt restore from localStorage
- If restore succeeds: show toast "Restored your saved draft"
- If stored data is malformed or from an older version: discard and use defaults
- "Clear saved draft" button in the header/drawer area
- No server communication

**Storage adapter:**

```typescript
// tripCostStorage.ts

const STORAGE_KEY = "trip_cost_planner_draft_v1";

export function saveDraft(state: TripCostPlannerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or unavailable — silent fail with console.info in dev
  }
}

export function loadDraft(): TripCostPlannerState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as TripCostPlannerState;
  } catch {
    return null; // Corrupted data
  }
}

export function clearDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
```

**Trust note near autosave indicator:**

> "Your trip data is saved in this browser only. It is not sent to our servers."

---

## 15. Validation Rules

### Complete Validation Table

| Field | Required | Type | Min | Max | Default | Error Message |
|---|---|---|---|---|---|---|
| Trip name | No | text | — | 100 chars | `""` | "Trip name is too long" |
| Departure country | No | text | — | 100 chars | `""` | — |
| Departure city | No | text | — | 100 chars | `""` | — |
| Destination country | No | text | — | 100 chars | `""` | — |
| Destination city | No | text | — | 100 chars | `""` | — |
| Departure date | No | date | today | — | today | — |
| Return date | No | date | after departure | — | today+7 | "Return date must be after departure date" |
| Currency | Yes | select | — | — | AUD | "Select a currency" |
| Adults | Yes | number | 0 | 20 | 1 | "Must be 0–20" |
| Children | No | number | 0 | 20 | 0 | "Must be 0–20" |
| Infants | No | number | 0 | 20 | 0 | "Must be 0–20" |
| Total travellers | Yes* | derived | 1 | 20 | — | "At least one traveller is required" |
| All cost fields ($) | No | number | 0 | 9,999,999 | 0 or `""` | "Enter a positive amount" |
| Activity name | Conditional | text | — | 100 chars | `""` | "Activity name required when cost is entered" |
| Activity cost | No | number | 0 | 9,999,999 | `""` | "Enter a positive amount" |
| Activity quantity | No | number | 1 | 99 | 1 | "Must be 1 or more" |
| Custom percentage | Conditional | number | 0 | 100 | 10 | "Enter 0–100" |
| Custom fixed amount | Conditional | number | 0 | 9,999,999 | 0 | "Enter a positive amount" |
| Accommodation nights | No | number | 0 | 365 | auto | "Must be 0–365" |
| Daily spending days | No | number | 0 | 365 | auto | "Must be 0–365" |

### Error Behaviour

- **Inline errors**: appear below each field, associated via `aria-describedby`
- **No error summary**: inline errors are sufficient for this form
- **Live calculation continues**: invalid fields are treated as 0 in calculations (with visible warning)
- **Never silently convert**: if a user types "abc" into a number field, show the error and do not treat it as 0
- **On blur**: validate the field and show/hide error
- **On submit-style action** (Print/Share): validate all fields, focus first error

---

## 16. Summary Panel

### Contents

| Row | Content | Format |
|---|---|---|
| Destination | Destination city or trip name | Text |
| Currency | Selected currency code | Badge |
| Dates | Departure → Return | Text |
| Travellers | "2 adults, 1 child" | Text |
| Nights / Days | "7 nights, 8 days" | Text |
| Flights | $ amount | Right-aligned |
| Accommodation | $ amount | Right-aligned |
| Daily spending | $ amount | Right-aligned |
| Preparation | $ amount | Right-aligned |
| Activities | $ amount | Right-aligned |
| Subtotal | $ amount (before contingency) | Bold, right-aligned |
| Contingency | $ amount (% label) | Right-aligned |
| **Total** | **$ amount** | **Large, bold, Deep Teal text** |
| Per traveller | $ amount | Text |
| Per day | $ amount | Text |
| Per traveller / day | $ amount | Text |

### UX

- Updates immediately on every valid input change
- Sticky on desktop (`position: sticky; top: 80px`)
- Normal flow on mobile (below all form sections)
- No animation required
- Category icons optional (can reuse from `homeV2Config`)
- Totals clearly distinguished with larger font and primary colour
- Disclosure at bottom of summary: "Values based on your entries. Confirm actual prices with providers."

---

## 17. Category Breakdown Visual

### Decision: **Horizontal bar chart**

A simple CSS-based horizontal bar breakdown (no chart library).

### Visual Design

- Each category gets a horizontal bar proportional to its share of the total
- Bars use V2 design tokens (Deep Teal, Coral, Emerald, Amber, muted shades)
- Category label + percentage + dollar amount displayed beside each bar
- Same data is always available as a text table below the chart
- Zero-value categories omitted from chart but remain visible in the summary table
- Chart uses semantic `<dl>` or `<table>` structure for accessibility
- Print output includes both chart and table

### Accessibility

- Each bar has `aria-label="Flights: $620 (36%)"`
- Table below chart provides equivalent text data
- No information communicated only by colour — labels always present
- Chart is `role="img"` with a descriptive `aria-label`

### Mobile

- Bars stack vertically with label beside each
- No horizontal overflow
- Chart container max-width 100%

---

## 18. Print, PDF and Share

### Print

**Trigger**: "Print or save as PDF" button

**Print stylesheet** (`@media print`):

```
Hide:
- Global Header
- Global Footer
- Bottom navigation
- All form inputs (show values as text instead)
- All accordion expand/collapse controls
- Print/Share/Reset buttons
- Sticky mobile bar
- Analytics scripts

Show:
- Trip details (dates, destination, currency, travellers)
- All category subtotals
- Contingency
- Final total
- Per-person/per-day breakdown
- Category breakdown chart + table
- Planning disclaimers
- Generated date: "Trip budget generated on [date] by BookingsFinder"
- BookingsFinder logo (small, top)
```

**Implementation**: CSS-only with a `.print-only` / `.no-print` class approach. No JavaScript print manipulation beyond `window.print()`.

### Download PDF

**Decision: Browser print → Save as PDF (no PDF library)**

**Label**: "Print or save as PDF"

**Button text**: "Print or save as PDF"

Rationale:
- `@media print` CSS handles the layout
- Users can select "Save as PDF" in the browser print dialog
- Avoids adding a heavy PDF library (`jspdf` ≈ 200kB+) in MVP
- Works identically across Chrome, Firefox, Safari, Edge

### Share

**Trigger**: "Share" button (if Web Share API is available) or "Copy summary" button

**Web Share API format**:

```typescript
const shareData = {
  title: "Trip Budget — Bali 2026",
  text: `Trip Budget for Bali 2026
7 nights, 2 travellers
Total: $1,745 AUD
Estimated using BookingsFinder Trip Budget Planner`,
  url: "https://bookingsfinder.com/trip-cost",
};

if (navigator.share) {
  await navigator.share(shareData);
} else {
  await navigator.clipboard.writeText(shareData.text);
  toast.success("Trip summary copied to clipboard");
}
```

**Share text format**:
```
Trip Budget for {destination}
{nights} nights, {travellers} travellers
Total: {total} {currency}
Estimated using BookingsFinder Trip Budget Planner
```

**Rules**:
- No full trip state in URL
- No server upload
- No sensitive data in share text
- Toast feedback on success/failure

---

## 19. Reset and Draft Handling

### Actions

| Action | Trigger | Behaviour |
|---|---|---|
| Reset planner | Click "Reset" | Confirmation dialog → revert to defaults → clear localStorage |
| Clear saved draft | Click "Clear saved draft" | Remove localStorage draft → toast confirmation |
| Start new plan | Same as Reset | |

### Reset Confirmation

```
Dialog title: "Reset trip data?"
Dialog body: "Your current entries will be lost. This cannot be undone."
Actions: "Cancel" (outline) | "Reset" (destructive)
```

### Autosave Behaviour

- Debounce: 500ms after last state change
- Only saves when state differs from last saved state
- Does not save during initial load (avoids overwriting with defaults before restore)
- Gracefully handles `localStorage` quota exceeded (silent, logged in dev)
- Does not save transient validation error messages (but preserves field values)

---

## 20. Accessibility

### Semantic Structure

- `<form>` wrapping all input sections (or `<div role="form">` if no submit)
- `<fieldset>` + `<legend>` for each cost category section
- `<label>` associated with every input via `htmlFor`
- No placeholder-only labels
- `<input type="number" inputMode="numeric">` for cost fields
- `<input type="date">` for date fields

### Keyboard

- Logical tab order: top to bottom
- Accordion headers are `<button>` elements with `aria-expanded`
- Activity rows: Tab through fields, Enter on "Add" appends row, Delete/Backspace on "Remove" triggers removal (when focused)
- Reset button reachable via Tab
- All interactive elements have visible `focus-visible` rings

### Screen Reader Announcements

| Event | Announcement |
|---|---|
| Section expand | "Trip details section expanded" |
| Section collapse | "Trip details section collapsed" |
| Total updates | Debounced (1s): "Updated total: $1,745" via `aria-live="polite"` region |
| Activity added | "Activity added: {name}" |
| Activity removed | "Activity {name} removed" |
| Error on field | Error message associated via `aria-describedby` |
| Draft restored | Toast: "Restored your saved draft" |

### Status Region

```html
<div aria-live="polite" aria-atomic="true" class="sr-only">
  <!-- Debounced total announcement inserted here -->
</div>
```

### Touch Targets

- All interactive elements ≥ 44px × 44px
- Accordion headers `min-h-[56px]`
- Number inputs have adequate padding
- Activity remove buttons are `h-10 w-10` minimum

### Reduced Motion

- Respect `prefers-reduced-motion` (global CSS rule already in place)
- Accordion open/close: instant when reduced motion is preferred
- No animated counter or transition on totals

### Contrast

- All text-on-background meets WCAG AA (already verified in Phase 1B)
- Coral `#CC4D28` on White Sand: 4.51:1 ✅
- Deep Teal on White Sand: 9.17:1 ✅
- Charcoal on White Sand: 13.45:1 ✅

---

## 21. Responsive Design

### Breakpoints

| Width | Layout |
|---|---|
| 1440px | Two-column: form (60%) + sticky summary (40%) |
| 1280px | Two-column: form (60%) + sticky summary (40%) |
| 1024px | Two-column: form (55%) + summary (45%) |
| 768px | Stacked; accordion sections; summary above actions |
| 390px | Single column; accordion; compact sticky bar |
| 320px | Single column; no overflow; smallest text sizes |

### Desktop (≥1024px)

- Form sections are visible cards (not accordions)
- Summary panel is sticky: `position: sticky; top: 80px`
- Summary width: ~360–420px
- Form sections use `max-w-2xl` within their column

### Tablet (768–1023px)

- Sections use accordions
- Summary flows normally (not sticky)
- Summary appears between form sections and breakdown chart
- Two-column within form sections where sensible (e.g., flight cost pairs)

### Mobile (<768px)

- All sections collapsed by default except Trip Details
- Compact sticky total bar appears after scrolling past heading:
  ```
  +------------------------------------------+
  | Bali 2026  |  Total: $1,745 AUD          |
  +------------------------------------------+
  ```
- Sticky bar respects `pb-20` (bottom nav safe zone)
- Sticky bar has `z-40` (below header, above content)
- Numeric keyboard via `inputMode="decimal"`
- Activity rows stack: name full width, cost + quantity side by side, remove below
- No horizontal overflow on any element

---

## 22. Design System

### Colours (Existing V2 Tokens)

| Token | Usage |
|---|---|
| `--background` (White Sand) | Page background |
| `--card` (White) | Section cards |
| `--muted` (Warm Grey) | Accordion backgrounds, table stripes |
| `--primary` (Deep Teal) | Primary buttons, total text |
| `--accent` (Coral) | Highlights, focus rings |
| `--success` (Emerald) | Positive indicators |
| `--warning` (Amber) | Warnings |
| `--foreground` (Charcoal) | Body text |
| `--muted-foreground` (Slate) | Secondary text |
| `--border` (Stone) | Card borders, dividers |

### Component Patterns

| Pattern | Implementation |
|---|---|
| Section card | `bg-card rounded-2xl border border-border p-5 md:p-6` |
| Form group | `<fieldset>` with `<legend>` styled as card header |
| Numeric input | `<Input type="number" inputMode="decimal" className="h-12 rounded-xl" />` |
| Currency prefix | `<span className="text-muted-foreground">$</span>` inside input group |
| Summary card | `bg-card rounded-2xl border border-border p-6 sticky top-20` |
| Subtotal row | `flex justify-between py-2 text-sm` |
| Total row | `flex justify-between py-3 text-lg font-bold text-primary border-t border-border` |
| Accordion header | `<button>` with ChevronDown icon, `min-h-[56px]`, `aria-expanded` |
| Destructive action | `variant="destructive"` or `variant="outline"` with red text "Reset" |
| Badge | `bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[11px]` |
| Disclaimer | `text-xs text-muted-foreground leading-relaxed` |

### Existing Reusable Components

From `src/components/ui/`:

| Component | Use |
|---|---|
| `accordion` | Mobile section collapse/expand |
| `button` | CTAs, actions |
| `card` | Section containers |
| `input` | Text and number fields |
| `select` | Currency, accommodation type, contingency mode |
| `badge` | Currency badge, "Coming soon" labels |
| `label` | Form field labels |
| `sonner` (toast) | Confirmations, errors |
| `dialog` | Reset confirmation |
| `breadcrumb` | Page breadcrumb |
| `separator` | Visual dividers |

---

## 23. SEO

### Metadata

```html
<title>Trip Budget Planner — Estimate the Full Cost of Your Trip</title>
<meta name="description" content="Plan the full cost of your trip with flights, accommodation, daily spending, insurance, activities and contingency in one editable budget." />
<link rel="canonical" href="https://bookingsfinder.com/trip-cost" />
```

### Page Structure

- **One H1**: "Plan the full cost of your trip."
- **H2s**: Each cost category section heading
- **Breadcrumb**: Home > Trip Budget Planner
- **Indexable**: Yes (`noindex` removed from placeholder)
- **No FAQ schema**: Unless real visible FAQ content is added
- **No calculator schema**: No valid schema.org type for a manual budget planner

### Crawlable Content

- H1 and supporting copy
- Section headings
- Educational notes and disclaimers
- Trust copy

---

## 24. Analytics

### Events (Privacy-Conscious)

| Event | Trigger | Payload |
|---|---|---|
| `trip_cost_planner_view` | Page load | `{ currency }` |
| `trip_cost_section_open` | Accordion expand | `{ section: string }` |
| `trip_cost_activity_added` | Add activity row | (no values) |
| `trip_cost_contingency_changed` | Change contingency mode | `{ mode: string }` |
| `trip_cost_print` | Click print | (no values) |
| `trip_cost_share` | Click share | `{ method: "web-share" \| "clipboard" }` |
| `trip_cost_reset` | Confirm reset | (no values) |
| `trip_cost_draft_restored` | Draft restored on load | (no values) |

### Explicitly NOT Sent

- Destination free-text values
- Trip names
- Entered cost amounts
- Dates
- Traveller counts
- Personal information

---

## 25. Trust and Safety Copy

### Near Top (below heading)

> "This planner uses the amounts you enter. It does not provide live prices or guarantee what your trip will cost."

### Near Summary

> "Your total is an estimate based on your entries. Confirm actual prices and fees with the relevant provider before booking."

### In Insurance / Visa / Passport Section

> "Use official government and provider sources to confirm requirements and fees. Values entered here are for planning only."

### Near Autosave Indicator

> "Your trip data is saved in this browser only. It is not sent to our servers."

### In Footer (Existing)

> "BookingsFinder is a travel planning and comparison platform. We do not sell flights, hotels, or travel products."

### Category Breakdown (Below Chart)

> "Based on your entered values. Percentages may not sum to 100% due to rounding."

---

## 26. Technical Implementation Plan

### File Structure

```
src/
  components/
    trip-cost/
      TripCostPlanner.tsx           # Main orchestrator component
      TripDetailsSection.tsx        # Trip name, dates, currency
      TravellersSection.tsx         # Adults, children, infants
      FlightCostsSection.tsx        # Airfare + airport costs
      AccommodationSection.tsx      # Accommodation type + costs
      DailySpendingSection.tsx      # Food, transport, shopping, etc.
      PreparationCostsSection.tsx   # Insurance, esim, visa, etc.
      ActivitiesSection.tsx         # Repeatable activity rows
      ContingencySection.tsx        # Contingency mode selector
      TripCostSummary.tsx           # Sticky desktop summary panel
      TripCostBreakdown.tsx         # Horizontal bar chart + table
      TripCostActions.tsx           # Print, share, reset buttons
      TripCostAccordion.tsx         # Reusable accordion wrapper
      tripCostConfig.ts             # Static constants (currencies, defaults)
      tripCostCalculations.ts       # Pure calculation functions
      tripCostValidation.ts         # Validation functions
      tripCostStorage.ts            # localStorage adapter
      types.ts                      # TypeScript interfaces
      index.ts                      # Barrel exports
  pages/
    TripCostPlannerPage.tsx         # Page component (Helmet, Header, Footer)
```

### File Responsibilities

| File | Responsibility |
|---|---|
| `types.ts` | All TypeScript interfaces and types |
| `tripCostConfig.ts` | Currency list, defaults, accommodation type options, contingency modes |
| `tripCostCalculations.ts` | Pure functions: `calculateSummary(state) → TripCostSummary`, `calculateNights()`, `calculateDays()` |
| `tripCostValidation.ts` | Pure functions: `validateTripDetails()`, `validateTravellers()`, `validateField()` returning error messages |
| `tripCostStorage.ts` | `saveDraft()`, `loadDraft()`, `clearDraft()` |
| `TripCostPlanner.tsx` | Main state container, connects form sections to calculations |
| `TripCostSummary.tsx` | Displays derived `TripCostSummary` |
| `TripCostBreakdown.tsx` | Bar chart + table |
| `TripCostAccordion.tsx` | Shared accordion wrapper for mobile sections |
| `TripCostPlannerPage.tsx` | Page shell: Helmet, Header, Footer, TripCostPlanner |

### Pure Calculation Functions

```typescript
// tripCostCalculations.ts

export function calculateNights(departureDate: string, returnDate: string): number | undefined {
  if (!departureDate || !returnDate) return undefined;
  return differenceInCalendarDays(new Date(returnDate), new Date(departureDate));
}

export function calculateDays(departureDate: string, returnDate: string): number | undefined {
  const nights = calculateNights(departureDate, returnDate);
  return nights !== undefined ? nights + 1 : undefined;
}

export function calculateSummary(state: TripCostPlannerState): TripCostSummary {
  // Pure function — no side effects
  // Returns all derived totals
}
```

These functions are:
- Pure (no side effects)
- Testable in isolation
- Not embedded in React components
- Reusable across the planner

---

## 27. Testing Plan

### Testing Infrastructure (Minimum)

Add `vitest` and `@testing-library/react` only. Do not introduce a broad repository-wide testing refactor in Phase 2A. Testing is scoped to:

- Pure calculation functions (`tripCostCalculations.ts`)
- Validation functions (`tripCostValidation.ts`)
- localStorage persistence and migration (`tripCostStorage.ts`)
- Critical planner interactions (activity add/remove, reset confirmation, summary updates)

No end-to-end tests, no visual regression tests, no snapshot tests in this phase.

### Unit Tests (Pure Functions)

```
tripCostCalculations.test.ts:
  - calculateNights: same day → 0, next day → 1, missing dates → undefined
  - calculateDays: same day → 1, next day → 2
  - flightsSubtotal: adult × 2, child × 1, infant × 1, fixed extras
  - accommodationSubtotal: cost × nights + fees
  - dailySpendingSubtotal: sum of category × days
  - activitiesSubtotal: sum of cost × quantity
  - contingency: none → 0, 10% → subtotal × 0.1, fixed → exact
  - total: subtotal + contingency
  - costPerTraveller: undefined when 0 travellers
  - costPerDay: undefined when 0 days
  - JPY formatting: ¥1234, not ¥1,234.00

tripCostValidation.test.ts:
  - validateTravellers: 0 total → error, negative → error, 21 → error
  - validateReturnDate: before departure → error, same day → ok, after → ok
  - validatePercentage: 0 → ok, 100 → ok, -1 → error, 101 → error
  - validateActivityName: empty + cost → error, name + no cost → ok

tripCostStorage.test.ts:
  - save/load roundtrip
  - corrupted JSON → null
  - missing key → null
  - localStorage unavailable → no throw
```

### Component Tests

```
TripDetailsSection.test.tsx:
  - renders all fields with defaults
  - changing departure date updates nights display
  - currency selector shows all 7 options

ActivitiesSection.test.tsx:
  - renders empty state
  - add activity → new row appears
  - remove activity → row removed
  - activity name required when cost present

TripCostSummary.test.tsx:
  - shows $0 when no costs entered
  - updates when costs change
  - shows — for per-person when 0 travellers

Reset flow:
  - dialog opens on click
  - cancel closes dialog
  - confirm resets state and clears localStorage
```

### Manual Tests (All Breakpoints)

| Width | Tests |
|---|---|
| 1440px | Two-column layout, sticky summary visible throughout scroll |
| 1024px | Two-column, no horizontal overflow |
| 768px | Accordion behaviour, summary in flow |
| 390px | Stacked, sticky bar, numeric keyboard |
| 320px | No overflow, readable text |

---

## 28. Performance

### Targets

- No heavy chart library (pure CSS bars)
- No PDF library (browser print)
- No API requests required
- All calculations client-side
- Bundle-size impact: estimate +15–25 kB gzip for the planner module
- Render performance: use `useMemo` for derived totals, avoid unnecessary re-renders

### Strategies

- Pure calculation functions (memoizable)
- Controlled form state in single reducer or `useState` + `useMemo`
- Accordion sections render children only when expanded (conditional rendering)
- Lazy-load the page route (already standard with React Router)
- No external dependencies beyond existing `date-fns`, `lucide-react`, `react-helmet-async`

---

## 29. Deliberate MVP Exclusions

| Exclusion | Reason | Future Phase |
|---|---|---|
| Live flight prices | No real-time API integration | 2C+ |
| Hotel prices | No provider integration | 2C+ |
| Currency conversion | Complex, error-prone if not live | 2C+ |
| Destination cost database | No verified data source | 2C |
| AI recommendations | No AI infrastructure | Later |
| Account login | Complex, premature for MVP | 2B |
| Cloud saving | Requires auth + backend | 2B |
| Multi-scenario comparison | Scope expansion | 2B |
| Collaborative planning | Scope expansion | Later |
| Booking email import | Requires parsing + privacy review | 2E |
| Weather integration | External API dependency | Later |
| Budget mode dollar presets | Requires verified data | 2C |
| Visa advice | Legal risk | Never |

---

## 30. Future Phases

### Phase 2B — Multi-Scenario
- Save multiple scenarios per browser
- Compare two scenarios side by side
- Duplicate a plan
- Rename plans
- Delete plans

### Phase 2C — Destination Data
- Verified destination-cost data source
- Regional defaults for Australian cities
- Budget-mode starting points with documented data provenance
- Australia-specific AUD defaults on `.com.au`

### Phase 2D — Insights
- Rule-based budget insights
- Identify dominant cost categories
- Show adjustable saving scenarios
- No AI initially

### Phase 2E — Trip Workspace Integration
- Connect planner output to Trip Workspace
- Bookings ↔ costs linking
- Readiness integration
- Flight handoff from within the planner

### Australian Edition (`bookingsfinder.com.au`)

Same planner, different defaults:
- AUD default currency
- Australian departure cities pre-populated
- Australian airport parking terminology
- Smartraveller links in passport/visa sections
- Australian school holiday awareness
- Region-specific terminology (e.g., "hire car" vs "rental car")

---

## 31. Implementation Sequence

### Stage 1: Types and Calculations
- Create `types.ts` with all interfaces
- Implement `tripCostCalculations.ts` with all pure functions
- **Completion**: All types defined; all calculations pass unit tests

### Stage 2: Validation
- Implement `tripCostValidation.ts`
- Write validation unit tests
- **Completion**: All validation rules have tests; edge cases covered

### Stage 3: State and Persistence
- Implement `tripCostStorage.ts`
- Create state management hook or reducer in `TripCostPlanner.tsx`
- **Completion**: State initialised from defaults; draft save/restore works

### Stage 4: Core Form Sections
- Build `TripDetailsSection.tsx` + `TravellersSection.tsx`
- Build `TripCostAccordion.tsx` wrapper
- **Completion**: Trip details and travellers editable; dates calculate nights

### Stage 5: Cost Sections
- Build `FlightCostsSection.tsx`, `AccommodationSection.tsx`, `DailySpendingSection.tsx`
- Build `PreparationCostsSection.tsx`
- **Completion**: All cost categories accept input; per-person multipliers work

### Stage 6: Summary
- Build `TripCostSummary.tsx`
- Implement sticky desktop positioning
- **Completion**: Summary updates live; sticky on desktop; mobile flow correct

### Stage 7: Responsive Layout
- Two-column desktop layout
- Accordion mobile behaviour
- Sticky mobile total bar
- **Completion**: Passes all breakpoint checks

### Stage 8: Activities
- Build `ActivitiesSection.tsx`
- Add/remove row logic
- **Completion**: Activities add/remove; totals update

### Stage 9: Contingency
- Build `ContingencySection.tsx`
- Percentage + fixed modes
- **Completion**: Contingency modes switch; totals recalculate

### Stage 10: Print/Share
- Build `TripCostActions.tsx`
- `@media print` stylesheet
- Share via Web Share API + clipboard fallback
- **Completion**: Print output clean; share works

### Stage 11: Accessibility
- Semantic HTML audit
- ARIA labels and announcements
- Keyboard navigation
- Focus management
- **Completion**: Passes axe-core or manual audit

### Stage 12: Tests
- All unit tests passing
- Key component tests passing
- **Completion**: CI-ready test suite

### Stage 13: SEO
- Replace placeholder route
- Add page metadata
- Remove `noindex`
- **Completion**: Page indexable with correct metadata

### Stage 14: Manual Validation
- Cross-browser testing
- Responsive screenshots
- Performance profiling
- **Completion**: All acceptance criteria met

---

## 32. Acceptance Criteria

### The MVP is complete when:

- [ ] `/trip-cost` is operational (not placeholder)
- [ ] Page has one H1, correct title, meta description, canonical
- [ ] No login required
- [ ] Dates calculate correctly (nights = return - departure)
- [ ] Manual night/day override works
- [ ] All cost categories calculate correctly
- [ ] Activity rows add/remove correctly
- [ ] Contingency modes all work
- [ ] Totals never show `NaN` or `Infinity`
- [ ] Per-person and per-day totals show `—` when divisor is zero
- [ ] JPY formatted without decimals
- [ ] Currency selector changes display symbol only
- [ ] Validation errors appear inline
- [ ] Desktop sticky summary works (`position: sticky`)
- [ ] Mobile accordion sections work
- [ ] Mobile sticky total bar does not overlap bottom nav
- [ ] Print/save as PDF output is clean
- [ ] Share copies text or opens Web Share API
- [ ] Draft autosave to localStorage with debounce
- [ ] Reset clears state and draft (with confirmation)
- [ ] All trust disclaimers visible
- [ ] No APIs required
- [ ] No fake pricing
- [ ] No `noindex` on the page
- [ ] `npm run build` passes
- [ ] No new lint errors
- [ ] Unit tests pass
- [ ] Accessibility checks pass (axe-core or manual)
- [ ] No horizontal overflow at 320px
- [ ] Touch targets ≥ 44px

---

## 33. Spec Decisions Summary

| Decision | Value |
|---|---|
| Final public name | Trip Budget Planner |
| Route | `/trip-cost` |
| Default currency | AUD |
| Supported currencies | AUD, USD, NZD, GBP, EUR, CAD, JPY |
| Local autosave | Included (localStorage, debounced, versioned key) |
| Chart type | CSS horizontal bars (no library) |
| PDF strategy | Browser print → Save as PDF |
| Share strategy | Web Share API with clipboard fallback |
| Budget modes | Excluded (move to Phase 2C) |
| Daily spending | Whole-trip, not per-person (per-person derived in summary) |
| Accommodation nights | Auto from dates, with manual override flag |
| Contingency default | 10% |
| Traveler upper limit | 20 |
| Page indexable | Yes |
| Phase 2B+ scope | Multi-scenario, destination data, insights, workspace integration |

---

## 34. Repository Inspection

### Current State

| Aspect | Finding |
|---|---|
| `/trip-cost` route | Exists as `PlaceholderPage` at `src/App.tsx:83` |
| Placeholder wording | "Trip Cost Planner — Estimate the full cost of your journey — coming soon." |
| Design tokens | Fully established (Phase 1A–1E): Deep Teal, Coral, White Sand, Warm Grey |
| UI components | Rich shadcn/ui library: `accordion`, `input`, `button`, `card`, `badge`, `select`, `dialog`, `breadcrumb`, `sonner` |
| Form utilities | `react-hook-form` not present; controlled components preferred |
| localStorage patterns | Established in `CookieConsent`, `ExitIntentPopup`, `LocationCombobox` |
| Testing | No test framework configured; `vitest` needs setup |
| Print styles | No existing `@media print` rules |
| Chart libraries | `recharts` in `package.json` (used in admin analytics); available but not recommended for MVP bars |
| Date utilities | `date-fns` already in project (`format`, `addDays`, `differenceInCalendarDays`) |
| Currency formatting | No existing utility; `Intl.NumberFormat` preferred |
| Homepage config | `homeV2Config.ts` has `exampleTripCostCategories` and `exampleTripCostTotal` — reusable reference data |

### Reusable Components Found

| Component | Location | Use |
|---|---|---|
| `accordion` | `src/components/ui/accordion.tsx` | Mobile section collapse/expand |
| `button` | `src/components/ui/button.tsx` | CTAs, actions |
| `input` | `src/components/ui/input.tsx` | Text and number fields |
| `select` | `src/components/ui/select.tsx` | Currency, accommodation type |
| `badge` | `src/components/ui/badge.tsx` | Labels |
| `label` | `src/components/ui/label.tsx` | Form field labels |
| `card` | `src/components/ui/card.tsx` | Section containers |
| `dialog` | `src/components/ui/dialog.tsx` | Reset confirmation |
| `breadcrumb` | `src/components/ui/breadcrumb.tsx` | Page breadcrumb |
| `sonner` | `src/components/ui/sonner.tsx` | Toast notifications |
| `SectionContainer` | `src/components/home-v2/SectionContainer.tsx` | Page section wrapper |
| `SectionHeading` | `src/components/home-v2/SectionHeading.tsx` | H2 + supporting copy |
| `Header` | `src/components/layout/Header.tsx` | Global header |
| `Footer` | `src/components/layout/Footer.tsx` | Global footer |
| `costIconMap` | `src/components/home-v2/homeV2Config.ts` | Reusable category icons |

### Implementation Risks

| Risk | Mitigation |
|---|---|
| No test framework | Add `vitest` + `@testing-library/react` as minimum testing infrastructure (see below) |
| localStorage corruption | Graceful parse with fallback; versioned keys |
| Floating-point precision | Display rounding only; internal calculation uses raw values |
| Mobile sticky bar overlapping nav | `pb-20` safe zone; z-index management |
| Print stylesheet complexity | Start simple; add `@media print` incrementally |
| Accordion accessibility | Reuse shadcn `accordion` which already has `aria-expanded` |
| Activity row performance at 20+ rows | Each row is simple; memoize list |
| Currency symbol collision (AUD/USD/NZD/CAD all `$`) | Display currency code beside amount: `$1,745 AUD` |

---

## Appendix A: Currency Config

```typescript
export const CURRENCIES: { code: CurrencyCode; symbol: string; label: string; decimals: number }[] = [
  { code: "AUD", symbol: "$", label: "AUD — Australian Dollar", decimals: 2 },
  { code: "USD", symbol: "$", label: "USD — US Dollar", decimals: 2 },
  { code: "NZD", symbol: "$", label: "NZD — New Zealand Dollar", decimals: 2 },
  { code: "GBP", symbol: "£", label: "GBP — British Pound", decimals: 2 },
  { code: "EUR", symbol: "€", label: "EUR — Euro", decimals: 2 },
  { code: "CAD", symbol: "$", label: "CAD — Canadian Dollar", decimals: 2 },
  { code: "JPY", symbol: "¥", label: "JPY — Japanese Yen", decimals: 0 },
];
```

## Appendix B: Accommodation Types Config

```typescript
export const ACCOMMODATION_TYPES: { value: AccommodationType; label: string }[] = [
  { value: "hotel", label: "Hotel" },
  { value: "apartment", label: "Apartment" },
  { value: "hostel", label: "Hostel" },
  { value: "resort", label: "Resort" },
  { value: "holiday-rental", label: "Holiday rental" },
  { value: "family-friends", label: "Staying with family or friends" },
  { value: "other", label: "Other" },
];
```

## Appendix C: Contingency Mode Config

```typescript
export const CONTINGENCY_MODES = [
  { value: "none", label: "No contingency" },
  { value: "pct-5", label: "5%" },
  { value: "pct-10", label: "10% (recommended)" },
  { value: "pct-15", label: "15%" },
  { value: "pct-custom", label: "Custom percentage" },
  { value: "fixed", label: "Fixed amount" },
] as const;
```
