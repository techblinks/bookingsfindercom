# BookingsFinder Things — Rome Destination & Activity Detail UX Spec (T3A)

**Phase:** THINGS V2 — T3A · Design System + Rome Destination + Activity Detail UX
**Status:** Specification only — no product code, no deployment
**Branch:** `spec/things-v2-design-system-rome`
**Base HEAD:** `9657aacd9278479092c2e86485dea3d4706b43d3`
**Consumes:** `docs/THINGS_V2_DESIGN_SYSTEM.md` (all tokens, type, spacing,
motion, state, accessibility, component and data-honesty contracts). This
document extends the design system for the Rome destination and the activity
detail page; it never contradicts it.

---

## 1. Scope

This spec defines the complete intended experience for:

- **Primary route:** `/things-to-do/rome` — destination page (DESKTOP,
  TABLET, MOBILE)
- **Detail route:** `/things-to-do/rome/:activitySlug` — canonical activity
  page (DESKTOP, TABLET, MOBILE)

It is a **specification**. Nothing here is implemented in this phase.

### Architecture that must not change (recap)

The verified commercial architecture from T2D-B2B-5D is load-bearing:
canonical mapping → resolver detail page → genuine provider CTA. This spec
designs the product experience **around** that architecture. Reference:
Design System §2.5.

---

## 2. Rome page — product job

A traveller arriving at `/things-to-do/rome` should quickly understand:

1. **what kinds of experiences they can explore** (hero + category rail)
2. **which options fit what they want to do** (search, filters, sort)
3. **what is available** (honest result count + cards)
4. **what useful context matters** (evidence-gated planning modules)
5. **which experiences BookingsFinder can explain in more depth** (mapped
   cards with "View details")
6. **where they can take the next action** (one clear CTA per card)

The page must not simply say "Here are 24 cards." It must feel like a real
destination product: calm, useful, premium, decision-focused.

---

## 3. Rome page — information architecture (recommended order)

```
GLOBAL HEADER (sticky)
THINGS BREADCRUMB ............ Things to do / Rome
DESTINATION HERO ............. identity + concise context + search
EXPLORE ROME ................. visual category rail (keyword-gated)
SEARCH / RESULTS AREA ........ results heading · toolbar (filters, sort,
                               count) · active chips · cards · pagination
PLANNING CONTEXT ............. evidence-gated Rome decision support
BOOKING TRUST + DISCLOSURE ... slim trust line + provider/commission disclosure
FOOTER
```

**Justification vs the current page order** (hero → trust strip → category
chips → results → other-destinations → how-it-works → cross-sell →
disclosure):

- **Trust strip moves down / becomes slimmer.** The 4-item trust strip
  currently pushes results down and reads promotional. Trust is carried by
  the disclosure near results and the booking panel. On desktop a single
  compact trust line may sit directly under the hero; on mobile it is hidden
  (results-above-fold priority).
- **Category rail moves directly under the hero** because it is the fastest
  discovery path ("what can I do here?") before diving into the full grid.
- **"Other destinations in these results" is demoted** (see §3.1) because it
  is derived from the current page of products and can feel random; it must
  not be presented as a ranking.
- **"How it works" and cross-sell panels are removed from the main Things
  flow** unless they earn their place as BookingsFinder-owned useful content;
  the disclosure line is retained because it is legally/semantically
  required.

### 3.1 Optional and future sections

| Section | Status | Gate |
|---|---|---|
| Other destinations in results | DEMOTE | Show only with a clear "seen in these results" label, never as a ranking; or remove |
| Editorial discovery (BF-owned content) | OPTIONAL | Only BookingsFinder-owned useful content; never filler SEO text |
| Related / alternative experiences (detail page) | FUTURE ONLY | Requires evidence/identity model safely supporting it (§19) |

---

## 4. Rome hero

### 4.1 Identity & copy

- **Page identity (locked):** `Things to do in Rome`
- **Eyebrow (optional):** small-caps label, `brand-primary` (not orange),
  e.g. "EXPERIENCES IN ROME" — or omit entirely; do not invent a marketing
  tagline.
- **Context line (≤ ~180 chars), example (illustrative, must be verified
  before publishing):** "Museums, tours, food experiences and day trips in
  Rome — with honest provider details and a clear path to booking." Copy is
  a **content gate**: publish only what is supportable (no unsupported
  claims about queues, prices, or popularity).

### 4.2 Layout

- **Desktop:** breadcrumb above; H1 (`display` token); one context line;
  full-width search card; optional shortcut chips. Hero band height
  ≈ 240–320px of content (not a full-viewport splash).
- **Mobile:** breadcrumb (wraps to 2 lines max); H1 (`display` mobile);
  **one** context line (clamp 2); compact search card; hero total ≤ ~300px
  so results begin quickly. Do **not** make the hero so tall that results
  disappear below the fold.
- **Background:** designed surface — `brand-navy` + existing subtle
  decoration (no imagery required). If a genuine licensed/owned Rome asset
  exists in the future: 21:9 desktop / 16:9 mobile with `brand-navy`
  gradient overlay for legibility (§14.3 design system). No invented image
  requirement.

### 4.3 Search placement & behaviour

- Search card: white `rounded-2xl`, fields "Where are you going?"
  (prefilled with **Rome** on the destination route) and "What do you want
  to do?" + orange Search button.
- Behaviour: existing registry-driven commit — changing the destination
  navigates to the canonical path (or legacy hub contract for non-registry
  cities). On the destination page, Rome is the committed identity; do not
  re-write `?city=Rome` beside the canonical slug.
- **CTA behaviour:** Search is the principal orange action of the hero
  viewport. On submit, results scroll into view (existing).

### 4.4 Breadcrumb relationship

`Things to do` / `Rome` renders **above** the H1 (new for the destination
page; the detail page already has one). Rome is `aria-current="page"` text.

---

## 5. Rome category discovery ("Explore Rome")

### 5.1 Visual concept vs implementable filter — the rule

The design must **never** let visual categories become fake functionality.

- **VISUAL CATEGORY CONCEPT:** "Explore Rome" tiles (Vatican, Ancient Rome,
  Museums, Tours, Food & drink, Family, Day trips) as **discovery
  shortcuts**.
- **IMPLEMENTABLE FILTER WITH CURRENT DATA:** there is **no** genuine
  taxonomy today. `activityTags` are free-text keywords honoured only by
  Tiqets; Viator receives nothing (no genuine tag IDs). Therefore:
  - A tile commits a **keyword search shortcut** (sets the activity/query
    term), and is labelled/copied honestly ("Search Vatican tickets & tours",
    never "Vatican experiences — curated").
  - Tiles show **no counts** ("24 Vatican experiences") until a genuine
    taxonomy exists.
  - When a real taxonomy is verified (Tiqets tag IDs / Viator tag IDs), the
    same tiles become true filters with exact counts — a later-phase
    capability, documented here so the design is ready for it.

### 5.2 Filter integrity rule (applies to all category/filter usage)

A filter may only be presented as filtering results it actually filters. If a
provider cannot apply a keyword/category filter to its inventory, its results
must not be presented as filtered by that category. Practical consequences
for the design:

- Until provider keyword filtering is honest for **all active providers**,
  category-tile searches must either (a) be expressed as a **query keyword**
  that the UI frames as a search ("Search: Vatican"), or (b) when a provider
  cannot apply it, hold that provider's unfiltered inventory out of the
  "filtered" view rather than mixing it silently.
- **Multi-provider gate:** when multiple active providers are combined and
  any of them cannot honour the category, do **not** silently mix that
  provider's unfiltered inventory into the "filtered" view. At that point
  one of the following must exist:
  - **A.** provider query/category capability for that provider, or
  - **B.** verified provider taxonomy/tag IDs, or
  - **C.** explicit provider exclusion from that filtered view with honest
    semantics (the UI must not present that provider's inventory as
    category-filtered).
- No fake multi-provider category filtering.
- This is a data-integrity requirement, not a visual flourish. It is the
  direct application of "Do not let design create fake functionality."

### 5.3 Tile contract

- **Content:** label + single Lucide icon + short descriptor (≤ 40 chars).
- **Visual:** white tile, `rounded-xl`, `border-default`, icon in
  `brand-primary-soft` circle; hover border `brand-primary/20` +
  `shadow-elevated`; no images unless genuine owned/licensed assets exist.
- **Mobile:** horizontal snap-scroll rail (edge fade, hidden scrollbar,
  keyboard accessible). **Desktop:** static row (6–8 tiles) or grid.
- **Interaction:** tap/click commits the keyword search and scrolls to
  results.
- **Data gate:** keyword path only; honest labels; no counts; no curated
  claims.
- **A11y:** list semantics; 44px targets; `aria-label` per tile.

---

## 6. Results experience

### 6.1 Layout

- **Desktop (≥1024):** persistent compact **filter toolbar row** under the
  results heading — Activity, Price, Rating, Features (popover), Sort
  (right-aligned). A sidebar is the documented future upgrade when the
  filter count exceeds ~5, not the current target. Cards: 3 cols
  (1024–1279), 4 cols (≥1280).
- **Tablet (768–1023):** same toolbar row (wraps); 2-col cards.
- **Mobile (<768):** sticky compact row — "Filters" (with orange active
  count badge) + "Sort" select — **≤ 56px tall**, results begin immediately
  below. 1-col cards. Filter sheet for the rest.

### 6.2 Toolbar content

- Result count (`small`, `text-secondary`) — **only when genuine**
  (provider total or honest returned count). **Count-provenance rule**
  (design system §20.9): a combined total may be shown only when every
  active provider count is a compatible genuine total; if provider count
  semantics are mixed/incomparable (e.g. one provider's genuine total vs
  another provider's current-page count), show "Showing N experiences"
  where N is the actual visible result count, or omit the count — never
  sum incompatible totals.
- Filter controls per §29.14–29.18 of the design system.
- Active-filter chips (removable) + "Clear all" text link.
- Sort labels stay honest: "Provider order" (default), "Price: low to
  high", "Title: A–Z".

### 6.3 States

| State | Behaviour |
|---|---|
| Initial load | Skeleton grid (8 cards, final geometry) |
| New search / filter change | Skeleton grid; stale responses discarded (existing request-id guard); old results never shown under a new request |
| Filter updates | URL sync (existing); page resets to 1 |
| Pagination | Numbered window (max ~7 + ellipsis); scroll to results top (existing) |
| Provider partial failure | Slim inline notice: "Some experiences may be temporarily missing." (only when a provider is `unavailable`, not `disabled`) |
| Mapping enhancement failure | **Visually invisible** — existing provider cards keep working with "View experience" (§30.5 design system) |
| Inventory unavailable | Existing honest panel + orange "Try again" |
| Genuine empty | Existing honest empty state + "Clear all filters" when filters active |

### 6.4 Mapped / unmapped CTA semantics (preserved)

- Mapped card → **"View details"** — internal navigation, no affiliate
  semantics (design system §30.3).
- Unmapped card → **"View experience"** — genuine provider outbound link,
  `target="_blank" rel="sponsored nofollow noopener"`, provider attribution
  preserved (design system §30.4).
- **Listing-card CTA colour:** both CTAs belong to the same **calm
  listing-action family** — blue filled or blue/neutral outline (design
  system §19). **Never orange.** A 3–4 column results grid must not become
  visually promotional; orange is reserved for singular high-value
  conversion actions (Search, Show results / Apply, Try again, Check
  availability).
- Both belong to the same card family; unmapped inventory is never visually
  punished.

---

## 7. Planning context / decision support (Rome)

### 7.1 Product intent

BookingsFinder should eventually provide more than provider inventory:
genuinely useful, evidence-gated Rome decision support. These are **content
capabilities**, not permission to invent facts.

### 7.2 Candidate modules (visual contracts)

| Module | Purpose | Position |
|---|---|---|
| **Good to know before booking in Rome** | booking-ahead, ticket, queue, entry context | After results |
| **Planning your visit** | visit-duration, neighbourhood/location context | After results |
| **Getting around / meeting-point context** | transport, meeting-point context | After results |
| **Types of experiences in Rome** | what kinds of experiences exist (Vatican, Ancient Rome, food…) | Optional, near category rail |

Visual contract (all modules): `Editorial Info Block` (design system
§29.20) — `surface-card`, `border-default`, `rounded-xl`, heading + iconed
fact rows, 2-col desktop / 1-col mobile, optional source line.

### 7.3 Evidence gate (strict content gate)

Never publish:

- unverified opening hours
- unverified ticket requirements
- unverified prices
- unsupported transport claims
- unsupported "book X days ahead"
- unsupported queue times
- unsupported seasonal claims

Evidence quality levels (recorded per claim):

| Level | Meaning | UI treatment |
|---|---|---|
| **SOURCE VERIFIED** | dated official/operator source (e.g. official Vatican site) | Show with a small source label |
| **PROVIDER VERIFIED** | from genuine provider offer data | Show attributed to the provider |
| **BOOKINGSFINDER EDITORIAL VERIFIED** | BF staff verified and documented | Show as BF editorial |
| **UNKNOWN / DO NOT SHOW** | no evidence | **Never render** |

The UI must make evidence quality manageable: modules render **only** claims
at SOURCE/PROVIDER/BF-EDITORIAL level; UNKNOWN claims simply do not appear
(there is no "unknown" visual state — absence is the state).

---

## 8. Activity detail — product job

The detail page must answer, in order:

1. **What is this?** — title, location, breadcrumb.
2. **Is it relevant to me?** — genuine rating/price context, gallery.
3. **What do I actually know about it?** — Good to know (gated), About
   (attributed).
4. **What should I consider?** — practical info (gated), evidence-based
   decision support (future).
5. **What booking options are genuinely available?** — provider offer cards.
6. **Who handles the booking?** — provider disclosure, explicit "handled by
   provider" copy.

It must **not** become a fake native checkout. Provider checkout remains
external. No prices/availability are invented.

---

## 9. Activity detail — information architecture

```
BREADCRUMB ..................... Things to do / Rome / Activity
TITLE + LOCATION ............... H1 · MapPin + "Rome, Italy"
OPTIONAL RATING/PRICE SUMMARY .. single-offer genuine only
IMAGE / GALLERY ................ 16:9 · 1 / N / no-image states
DESKTOP BOOKING PANEL .......... sticky right rail (lg+)
MOBILE STICKY ACTION BAR ....... fixed bottom (lg hidden)
STICKY ANCHOR NAV (optional) ... jumps to rendered sections only
GOOD TO KNOW ................... every-offer-true facts
ABOUT THIS EXPERIENCE .......... single-offer attributed description
WHAT'S INCLUDED ................ ONLY when genuine
WHAT TO EXPECT ................. ONLY when genuine
MEETING / PRACTICAL INFO ....... ONLY when genuine
ACCESSIBILITY / CANCELLATION ... ONLY when genuine
BOOKING OPTIONS ................ neutral provider offer cards
PROVIDER DISCLOSURE ............ booking handled by provider + commission
RELATED / ALTERNATIVES ......... FUTURE ONLY (evidence-gated)
```

**Rule:** do not implement unavailable sections merely because competitors
have them. If a section has no genuine content, it is omitted — the page
stays complete with what is real.

---

## 10. Activity gallery

### 10.1 States

| State | Treatment |
|---|---|
| **1 image** | Full-width 16:9 hero region (`h-56 sm:h-72 lg:h-80` base), rounded, border, image credit line when genuine |
| **N images** | Primary 16:9 region + 1:1 thumbnail strip (desktop) or swipeable dots (mobile) — **only** when ≥2 genuine images exist; no auto-play |
| **No image** | Premium intentional panel: `brand-primary-soft`/`surface-subtle`, single large muted icon, "No image is available for this experience yet." in `text-secondary`, thin brand rule (§14.4 design system). Current Vatican detail (no durable image) must look deliberate |

### 10.2 Rules

- Do not manufacture gallery slots; no unrelated Rome stock photo for a
  Vatican ticket; no generic destination imagery as activity imagery.
- Alt text: provider `imageAlt` or the activity title.
- `loading="lazy"` (below fold) / eager+priority for the first genuine image.

---

## 11. Desktop booking panel

### 11.1 Contract

- **Position:** right rail, `lg:grid-cols-[minmax(0,1fr)_360px]` (existing
  contract); the panel is **sticky** below the header
  (`sticky top-[header height + 16px]`).
- **Title:** "Book this experience" (single offer) / "Booking options"
  (multi-offer).
- **Content — only genuine fields:** provider name, price + currency
  (single-offer genuine), availability-related action, provider attribution.
- **CTA:** **"Check availability"** — orange, external:
  `target="_blank" rel="sponsored nofollow noopener"`.
- **Copy under CTA:** "Booking and payment handled by {Provider}." + panel
  disclosure: "BookingsFinder may earn a commission when you book with a
  provider. Availability and prices are set by the provider."
- **Do not imply BookingsFinder takes payment.**

### 11.2 Missing-data behaviour

- No genuine price → **no price shown** (omit the price slot; CTA remains).
- No valid `providerUrl` → honest copy "Check availability with the
  provider" — **no fake booking button** (existing `isValidProviderUrl`
  contract).
- Zero offers → "No booking options are available yet." (existing).

---

## 12. Mobile sticky action bar

- **Position:** fixed bottom, `surface-card`, top border, elevation on
  scroll, **safe-area bottom padding** (`env(safe-area-inset-bottom)` +
  existing `.safe-area-bottom`), ≥56px content height.
- **Single valid provider offer with genuine price:** "From {price}" +
  orange **"Check availability"**.
- **Single offer, price unknown:** **"Check availability"** only — never
  invent a price.
- **Multiple offers (future):** preferred action **"See booking options"** —
  scrolls to / opens BookingsFinder's neutral provider comparison section.
  Never arbitrarily label one provider "best".
- **A11y:** 44px touch target; bar hides/clears when the keyboard would
  cover it (no inputs on detail today, but the contract applies).
- **Failure:** no valid provider URL → bar may show honest "Check
  availability with the provider" or hide — never a dead orange button.

---

## 13. Good to know (signature module)

### 13.1 Factual fields (only when supported)

Skip the line · Free cancellation · Instant confirmation · Mobile ticket ·
Wheelchair access · Duration · Meeting point · Language · Age/access
requirements.

### 13.2 Evidence gating

- **Activity level (this module):** every-offer-true facts only (existing
  `getActivityLevelFacts`); `null ≠ false`; never render a negative
  statement because a field is null.
- **Duration / meeting point / language / age requirements:** no current
  source populates them → the module simply omits them; do not invent or
  infer.
- **Per-offer facts** (cancellation, etc.) that are not activity-level
  appear **inside that offer's card**, attributed to the provider.

### 13.3 Visual

2-col grid of chip rows (desktop) / 1-col (mobile): `success` check icon +
fact label (`small`, `text-primary`/`text-secondary`), `surface-card`,
`border-default`, `rounded-lg`. Section omitted entirely when no facts
exist — never a "no facts" negative.

---

## 14. Decision-support signature (future, evidence-gated)

### 14.1 Concept

A BookingsFinder-specific pattern beyond provider data:

- **Good to know** (factual, §13) — buildable now with existing gates.
- **Best if you want…** / **Consider another option if…** — **future**,
  requires an explicit evidence gate.

### 14.2 Evidence gate required before implementation

- Structured comparison data with documented criteria (e.g. "skip-the-line
  tickets suit travellers who want to maximise time inside", backed by
  verified provider facts and/or BF-editorial sources).
- Every "Best if" claim must have a recorded evidence source at
  SOURCE VERIFIED / PROVIDER VERIFIED / BF EDITORIAL VERIFIED level.
- **AI may explain evidence; AI must never manufacture recommendation
  evidence.** No title-inference recommendations.

### 14.3 Status

**DO NOT IMPLEMENT YET** (readiness matrix §22). The design system reserves
the visual slot (an `Editorial Info Block` variant) so the pattern can land
without a redesign when the gate passes.

---

## 15. Provider-neutral multi-offer design

Although the current canonical proof has one Tiqets offer, the design
supports the future state:

```
BookingsFinder Activity
├── Tiqets offer   (provider card)
├── Viator offer   (provider card)
└── future provider offer
```

Rules:

- **Neutral provider cards** — identical chrome, provider named, stable sort
  (provider name asc, then product ID — existing `sortOffersNeutrally`).
- **Never** auto-select "best"; **never** rank by affiliate commission;
  **never** hide provider identity; **never** merge products based on fuzzy
  titles.
- Provider comparison may eventually use genuine comparable data (same
  currency price, duration) — a future capability, not a promise.
- Single-offer gating stays: rating/price/description summaries render only
  from one unambiguous offer; multi-offer pages show per-offer data inside
  each card and omit ambiguous activity-level summaries.

---

## 16. ASCII wireframes (low-fidelity structural reference)

> **All bracketed values are structural placeholders, not content or test
> data. Never hard-code them.**

### 16.1 Rome — desktop

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)   [logo]  Flights Stays Things TripCost Optimizer  │
├────────────────────────────────────────────────────────────────────┤
│ BREADCRUMB  Things to do / Rome                                    │
│                                                                    │
│  Things to do in Rome                                              │
│  Museums, tours, food experiences and day trips in Rome — with     │
│  honest provider details and a clear path to booking.              │
│  ┌───────────────────────────────────────────────┬───────────────┐ │
│  │ Where are you going?  [ Rome          ▾ ]    │ What to do?    │ │
│  │ What do you want to do? [ Museums, tours… ] │ [Search] (orange)│ │
│  └──────────────────────────────────────────────┴───────────────┘ │
│  (brand-navy designed surface)                                     │
├────────────────────────────────────────────────────────────────────┤
│ EXPLORE ROME   [ Vatican ] [ Ancient Rome ] [ Museums ] [ Food&Drink ] … │
├────────────────────────────────────────────────────────────────────┤
│ Things to do in Rome                         [Provider order ▾]   │
│ [genuine count] experiences · [Activity ▾] [Price ▾] [Rating ▾] [Features ▾]   │
│ ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ ┌──────────────────────────────────────────────┐ │
│ │ [img 16:10]                                  │ │ [img 16:10]                                  │ │ [img 16:10]                                  │ │ [img 16:10]                                  │ │
│ │ Skip the line                                │ │                                              │ │                                              │ │                                              │ │
│ │ Title…                                       │ │ Title…                                       │ │ Title…                                       │ │ Title…                                       │ │
│ │ Rome, Italy                                  │ │ Rome, Italy                                  │ │ Rome, Italy                                  │ │ Rome, Italy                                  │ │
│ │ ★[genuine rating] ([genuine reviews])        │ │ ★[genuine rating] ([genuine reviews])        │ │                                              │ │ ★[genuine rating] ([genuine reviews])        │ │
│ │ From [genuine price]                         │ │ From [genuine price]                         │ │ [price only when genuine]                    │ │ From [genuine price]                         │ │
│ │ Tiqets                                       │ │ Tiqets                                       │ │ Tiqets                                       │ │ Tiqets                                       │ │
│ │ [View details]                               │ │ [View details]                               │ │ [View experience]                            │ │ [View details]                               │ │
│ └──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘ └──────────────────────────────────────────────┘ │
│ [1] [2] [3] … [7]  ◀ ▶                                             │
├────────────────────────────────────────────────────────────────────┤
│ GOOD TO KNOW BEFORE BOOKING IN ROME   (evidence-gated)             │
│ ✓ item            ✓ item             ✓ item            ✓ item      │
├────────────────────────────────────────────────────────────────────┤
│ Booking trust: Booking and payment are handled by the provider ·   │
│ BookingsFinder may earn a commission when you book with a provider │
├────────────────────────────────────────────────────────────────────┤
│ FOOTER                                                             │
└────────────────────────────────────────────────────────────────────┘
```

### 16.2 Rome — mobile

```
┌──────────────────────────────────┐
│ HEADER (sticky)  [logo]     [≡]  │
├──────────────────────────────────┤
│ Things to do / Rome              │
│ Things to do in Rome             │
│ Museums, tours, food experiences │
│ ┌────────────────────────────┐   │
│ │ Where? [ Rome        ▾ ]   │   │
│ │ What?  [ Museums, tours… ] │   │
│ │ [Search]              (orange, full width) │
│ └────────────────────────────┘   │
├──────────────────────────────────┤
│ EXPLORE ROME  →  [Vatican][Ancient][Museums][Food][Family]  (rail) │
├──────────────────────────────────┤
│ Things to do in Rome             │
│ [genuine count] experiences      │
│ [Filters (2)]          [Sort ▾]  │   ← sticky, ≤56px
│ ┌────────────────────────────┐   │
│ │ [img 16:10]   Skip the line │   │
│ │ Title…                      │   │
│ │ Rome, Italy                 │   │
│ │ ★[genuine rating] ([genuine reviews])  From [genuine price] │   │
│ │ Provided by Tiqets          │   │
│ │ [View details]              │   │
│ └────────────────────────────┘   │
│ ┌────────────────────────────┐   │
│ │ … (cards continue, 1-col)   │   │
│ └────────────────────────────┘   │
│ [1][2][3]…  ◀ ▶                   │
├──────────────────────────────────┤
│ GOOD TO KNOW BEFORE BOOKING IN ROME  (gated) ✓ ✓ ✓                │
├──────────────────────────────────┤
│ FOOTER (collapsed)               │
└──────────────────────────────────┘
```

### 16.3 Activity detail — desktop

```
┌────────────────────────────────────────────────────────────────────┐
│ HEADER (sticky)                                                    │
├────────────────────────────────────────────────────────────────────┤
│ Things to do / Rome / Vatican Museums & Sistine Chapel (truncated) │
│                                                                    │
│ Vatican Museums & Sistine Chapel Fast-Track Ticket    ┌────────────┐
│ 📍 Rome, Italy    ★[genuine rating] ([genuine reviews])  From [genuine price] │ BOOK THIS  │
│ ┌────────────────────────────────────────────┐       │ EXPERIENCE │
│ │                                            │       │ ┌────────┐ │
│ │        IMAGE / GALLERY (16:9)              │       │ │ Tiqets │ │
│ │        or premium no-image panel           │       │ │ From [genuine price] │ │
│ │                                            │       │ │ [Check  │ │
│ └────────────────────────────────────────────┘       │  availability] (orange) │
│ [Good to know] [About] [Booking options]  (anchors)  │ Booking & payment handled │
│ GOOD TO KNOW                                         │ by Tiqets.               │
│ ✓ Skip the line   ✓ Mobile ticket                    │ └────────┘               │
│ ✓ Instant confirmation   ✓ Free cancellation         │ Commission disclosure…   │
│ ABOUT THIS EXPERIENCE                                │ ┌────────┐               │
│ Description (attributed: "Provided by Tiqets.")      │ │ (sticky│               │
│                                                      │ │  panel)│               │
│ BOOKING OPTIONS                                      │ └────────┘               │
│ ┌────────────────────────────────┐                   │                          │
│ │ Tiqets  From [genuine price]  [Check avail]│                   │                          │
│ └────────────────────────────────┘                   │                          │
│ Provider disclosure: booking handled by provider…    │                          │
└──────────────────────────────────────────────────────┴──────────────────────────┘
```

### 16.4 Activity detail — mobile

```
┌──────────────────────────────────┐
│ HEADER (sticky)             [≡]  │
├──────────────────────────────────┤
│ Things to do / Rome / Vatican…   │
│ Vatican Museums & Sistine Chapel │
│ 📍 Rome, Italy    ★[genuine rating] · From [genuine price]│
│ ┌────────────────────────────┐   │
│ │ IMAGE 16:9 / no-image panel│   │
│ └────────────────────────────┘   │
│ [Good to know][About][Options] (anchors) │
│ GOOD TO KNOW                       │
│ ✓ Skip the line  ✓ Mobile ticket   │
│ ABOUT THIS EXPERIENCE              │
│ … (attributed description)         │
│ BOOKING OPTIONS                    │
│ Tiqets · From [genuine price]         │
│ [Check availability]               │
│ Provider disclosure…               │
│                                    │
├────────────────────────────────────┤
│ ┌──────────────┬────────────────┐  │  ← sticky bottom action bar
│ │ From [genuine price] │ [Check      │  │    (safe-area padded)
│ │              │  availability] │  │
│ └──────────────┴────────────────┘  │
└──────────────────────────────────┘
```

---

## 17. Interaction states (summary)

Full state contracts live in the design system §16. Rome/detail additions:

| Component | Default | Hover | Focus | Active | Selected | Loading | Disabled | Error/Touch |
|---|---|---|---|---|---|---|---|---|
| Category tile | white, border | border blue + elevation | ring | press scale | n/a (navigates) | n/a | n/a | pressed `opacity-70` |
| Filter trigger (mobile) | outline | — | ring | — | count badge orange | n/a | n/a | pressed |
| Sort select | outline | — | ring | — | value shown | n/a | n/a | native sheet |
| Filter sheet | — | — | trap on open | — | chips checked | n/a | n/a | backdrop closes; Escape closes |
| Card | shadow-card | elevation + image zoom (desktop) | ring on CTA | press | n/a | skeleton | n/a | pressed |
| Sticky action bar | flat | — | — | — | — | spinner on CTA | no URL → honest copy | safe-area padded |

**Touch-specific:** pressed (scale/opacity), sheet open, sticky state —
documented in the design system §16 and §23.

---

## 18. Accessibility (Rome/detail additions)

Design system §22 is binding. Additions:

- Rome hero: one H1; search inputs labelled (no placeholder-only labels).
- Category rail: list semantics, keyboard scroll, 44px targets.
- Filter sheet: `role="dialog" aria-modal="true"`, labelled close, focus
  trap + restore (T3F).
- Sticky bottom action bar: must not obscure content (add scroll margin to
  the page end); 44px target; safe-area inset respected.
- Anchor nav: `nav` landmark, `aria-current` on active anchor, smooth scroll
  respects reduced motion.
- Mapped "View details" is a **link**; unmapped "View experience" is a
  **link**; filters are **buttons/controls**; never clickable divs.

---

## 19. Readiness matrix

| Proposed component | Classification | Notes |
|---|---|---|
| Things breadcrumb (Rome) | **READY WITH SMALL FRONTEND WORK** | Registry labels exist; new on destination page |
| Destination hero (designed surface) | **READY WITH SMALL FRONTEND WORK** | No imagery needed; copy needs the content gate |
| Destination hero (image mode) | **DO NOT IMPLEMENT YET** | Requires genuine licensed/owned asset |
| "Explore Rome" category rail (keyword) | **CONDITIONAL — READY WITH SMALL FRONTEND WORK ONLY WHILE ALL ACTIVE PROVIDERS HONOUR THE KEYWORD** | TODAY (Tiqets receives the keyword): ready with small frontend work. WHEN any active provider cannot honour the category: do **NOT** silently mix that provider's unfiltered inventory — require (A) provider query/category capability, (B) verified provider taxonomy/tag IDs, or (C) explicit provider exclusion with honest semantics (§5.2). T3C may implement the rail only behind the filter-integrity gate; no fake multi-provider category filtering |
| Category tiles with counts / real taxonomy | **REQUIRES BETTER PROVIDER ENRICHMENT** | Genuine tag IDs for both providers |
| Results toolbar (tokens) | **READY WITH SMALL FRONTEND WORK** | Refactor of existing controls; result count follows the count-provenance rule (§6.2 / design system §20.9) |
| Desktop filter sidebar | **DO NOT IMPLEMENT YET** | Toolbar row first; sidebar when >5 filters |
| Mobile filter sheet polish | **READY WITH SMALL FRONTEND WORK** | Focus trap, tokens, targets |
| Experience card redesign | **READY WITH SMALL FRONTEND WORK** | All card data exists; hierarchy + tokens |
| Mapped/unmapped CTA semantics | **READY WITH CURRENT DATA** | Already live; card-family polish only |
| Provider attribution | **READY WITH CURRENT DATA** | Existing |
| Rating/price summaries | **READY WITH CURRENT DATA** | Single-offer gating existing |
| Pagination window | **READY WITH SMALL FRONTEND WORK** | Cap numbers with ellipsis |
| Provider partial-failure notice | **READY WITH SMALL FRONTEND WORK** | Uses existing provider status |
| Good to know (facts) | **READY WITH CURRENT DATA** | Existing every-offer-true gate |
| Good to know (duration/meeting/lang) | **REQUIRES BETTER PROVIDER ENRICHMENT** | No source populates today |
| Gallery (multi-image) | **REQUIRES BETTER PROVIDER ENRICHMENT** | Genuine N-image data needed |
| No-image premium state | **READY WITH SMALL FRONTEND WORK** | Current Vatican needs it |
| Desktop sticky booking panel | **READY WITH SMALL FRONTEND WORK** | Data exists; sticky behaviour new |
| Mobile sticky action bar | **READY WITH SMALL FRONTEND WORK** | Single-offer price logic exists |
| "See booking options" (multi-offer) | **REQUIRES FUTURE BACKEND** | Needs multi-offer inventory |
| Provider-neutral comparison | **REQUIRES FUTURE BACKEND** | Needs comparable multi-provider data |
| Rome planning context modules | **REQUIRES EDITORIAL DATA** | Content gate §7.3 |
| "Best if you want…" / "Consider another option if…" | **DO NOT IMPLEMENT YET** | Evidence gate §14 |
| Related / alternative experiences | **DO NOT IMPLEMENT YET** | Identity/evidence model needed |
| Anchor navigation | **READY WITH SMALL FRONTEND WORK** | Renders only for present sections |

---

## 20. Implementation phase plan (next phases — do not implement now)

Aim: small PRs, no architecture change, mapping flow preserved at every step.

### T3B — DESIGN FOUNDATION
- Adopt tokens across Things surfaces (colour/type/spacing/radius/shadow);
  fix orange-on-white small-text rule (§6.4 design system); standardise
  focus rings; motion utilities; shared primitives (Section Header,
  Feature Chip, Rating/Price Summary, Trust line, pagination window,
  Chip, no-image panel).
- No page redesign yet.

### T3C — ROME DESTINATION SHELL
- Breadcrumb, destination hero, section system + page rhythm, "Explore
  Rome" rail (keyword-gated, **implementable only behind the
  filter-integrity gate** — §5.2 / readiness §19), planning-context module
  skeleton behind the evidence gate (content itself requires editorial
  work, shipped separately).
- When multiple active providers include one that cannot honour the
  category, the rail must not silently mix that provider's unfiltered
  inventory; it ships only with (A) provider query/category capability,
  (B) verified provider taxonomy/tag IDs, or (C) explicit provider
  exclusion with honest semantics. No fake multi-provider category
  filtering.
- Results area untouched structurally.

### T3D — SEARCH RESULTS POLISH
- Experience card redesign (decision-surface hierarchy), results toolbar,
  mobile filter sheet polish (focus trap/tokens/targets), responsive grid,
  pagination window, provider partial-failure notice; mapping architecture
  and CTA semantics preserved (regression-tested).

### T3E — ACTIVITY DETAIL VISUAL SYSTEM
- Detail header + rating/price summary tokens, gallery + no-image premium
  state, anchor navigation, Good to know module, sticky desktop booking
  panel, mobile sticky action bar, provider disclosure.

### T3F — MOBILE INTERACTION POLISH
- Filter sheet focus management, sticky bars + safe areas, touch-target
  audit, keyboard coverage, reduced-motion pass.

### T3G — PRODUCTION UX VALIDATION
- Desktop/mobile/accessibility/performance; mapped vs unmapped flow
  regression; cross-browser; CWV check; noindex verification unchanged.

Each phase ships independently and must keep the verified architecture
(§2.5) green.

---

## 21. Cross-references

- **Design system:** `docs/THINGS_V2_DESIGN_SYSTEM.md` — tokens, type,
  spacing, motion, states, accessibility, component contracts, card
  contract, content claim matrix.
- This document extends the system for Rome + activity detail only.
