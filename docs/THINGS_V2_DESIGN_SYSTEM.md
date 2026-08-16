# BookingsFinder Things — V2 Design System (T3A)

**Phase:** THINGS V2 — T3A · Design System + Rome Destination + Activity Detail UX
**Status:** Specification only — no product code, no deployment
**Branch:** `spec/things-v2-design-system-rome`
**Base HEAD:** `9657aacd9278479092c2e86485dea3d4706b43d3`

---

## 0. How to use this document

This document is the **source of truth for the Things visual and interaction
system**. It is written so a future coding agent can implement the UI without
making independent product-design decisions.

Rules of use:

- **Every visual decision already made here is binding.** If a section says a
  token, a size, a state or a component contract, implement exactly that.
- Where a decision is **not** made here, implement the documented fallback,
  not an invention. When a section says "do not show unless X", the default is
  to not show.
- **Companion document:** `docs/THINGS_V2_ROME_UX_SPEC.md` consumes this
  system and never contradicts it. Where the Rome spec appears to add detail,
  that detail extends — it does not override — this document.
- **Authority order** (documentation authority rule):
  1. Current verified production behaviour
  2. Current main source at `9657aac`
  3. This T3A prompt
  4. Recent Things architecture (T2A → T2D)
  5. Older product docs

  Older documents that contradict 1–4 are explicitly marked **superseded**
  where relevant (see §5.3).

### Coverage map (T3A requirements → sections)

| T3A requirement | Section(s) |
|---|---|
| A. Product experience north star | §1 |
| B. Design principles | §3 |
| C. Anti-patterns | §4 |
| D. Brand identity | §5 |
| E. Colour tokens | §6 |
| F. Typography | §7 |
| G. Spacing | §8 |
| H. Grid / containers | §9 |
| I. Radius | §10 |
| J. Borders | §11 |
| K. Shadows | §12 |
| L. Iconography | §13 |
| M. Photography | §14 |
| N. Image ratios | §14.2 |
| O. Motion | §15 |
| P. Interaction feedback | §16 |
| Q. Accessibility | §22 |
| R. Mobile principles | §23 |
| S. Desktop principles | §24 |
| T. Content hierarchy | §18 |
| U. CTA hierarchy | §19 |
| V. Data honesty rules | §20 |
| W. Provider attribution rules | §21 |
| X. Loading states | §17.1 |
| Y. Empty states | §17.3 |
| Z. Error/unavailable states | §17.4 |
| AA. Skeleton behaviour | §17.2 |
| AB. Focus/keyboard behaviour | §22.3 |
| AC. Reduced-motion behaviour | §15.4 |
| AD. Component inventory | §29 |
| AE. Responsive breakpoints | §25 |
| AF. Performance rules | §26 |
| AG. SEO-aware design rules | §27 |
| AH. Analytics-semantic boundaries | §28 |
| Current product audit | §2 |
| Colour system detail | §6 |
| Typography detail | §7 |
| Layout system detail | §8–9 |
| Image system detail | §14 |
| Component inventory | §29 |
| Experience card critical spec | §30 |
| Content claim matrix | §33 |
| Klook benchmark (like / refuse) | §31 |
| Design differentiator | §32 |

---

## 1. Product experience north star

> **"Klook-level polish and interaction quality, but cleaner, less
> promotional, more premium, more decision-focused, and unmistakably
> BookingsFinder."**

Klook is a **visual / interaction benchmark only**. We do not clone Klook's
branding or its promotional density.

The BookingsFinder Things experience must feel:

- calm
- useful
- premium
- modern
- travel-native
- visual
- trustworthy
- action-oriented
- easy to scan
- excellent on mobile
- excellent on desktop

It must feel like a serious modern OTA/discovery product. It must never feel
like: a generic Tailwind dashboard, an affiliate blog, a card-grid template, a
coupon/deals site, a travel magazine, an admin interface, or a clone of Klook,
GetYourGuide, Viator, Expedia or Booking.com.

**The single design filter for every section:**

> "Do not show data because we have it. Show it only when it helps someone
> make a decision or take the next useful action."

---

## 2. Current product audit (recorded at T3A)

Audited at base `9657aac` against: `src/pages/ThingsToDo.tsx`,
`ThingsToDoDestinationPage.tsx`, `ThingsToDoActivityRoute.tsx`,
`components/activity/*`, `services/experiences.ts`,
`services/thingsActivityMapping.ts`, `services/thingsActivityDetail.ts`,
`types/experiences.ts`, `types/thingsActivity*.ts`,
`lib/thingsDestinations.ts`, `lib/thingsActivities.ts`,
`lib/thingsActivityDetail.ts`, `components/layout/Header.tsx`,
`components/layout/Footer.tsx`, `src/index.css`, `tailwind.config.ts`,
`worker/index.ts`, and historical docs.

### 2.1 Currently working (do not regress)

1. **Complete commercial flow is proven live:** real Tiqets inventory → exact
   provider identity → `map-provider-products` → mapped card shows "View
   details" → internal BookingsFinder canonical activity page → resolver-backed
   detail → genuine Tiqets affiliate "Check availability" CTA.
2. **Unmapped inventory keeps "View experience"** — a genuine provider outbound
   link with `rel="sponsored nofollow noopener"` and `target="_blank"`.
3. **No canonical URL is guessed.** The frontend never manufactures a slug;
   mappings are validated against requested provider identities and the exact
   slug contract.
4. **Provider URLs are preserved** exactly, including genuine affiliate
   partner parameters.
5. **Activity detail is noindex** at both layers: client
   `<meta name="robots" content="noindex,follow">` and server
   `X-Robots-Tag: noindex, follow` (Worker route-shape guard).
6. **Canonical activity URL works** via `things-activity-public` resolver
   (exact slug pair; `resolved | not-found | unavailable` states; retry
   genuinely re-runs the resolver).
7. **Provider-neutral detail presentation:** rating/review/price/description
   render only from a single offer with genuine values (unambiguous
   attribution); facts render only when every offer reports `true`;
   `unknown ≠ false` everywhere.
8. **Neutral offer ordering** (provider asc, then product ID) — never
   "best/cheapest/recommended".
9. **Failure isolation:** one provider failing never blanks the page; "nothing
   answered" (inventory unavailable) is distinguished from "something answered
   but no matches" (empty state). Mapping failure is enhancement-only and
   invisible.
10. **Registry-driven identity:** Rome destination registry (draft,
    Viator ref `511` sandbox-verified), fail-closed slug resolution, `?city=`
    migration bridge, canonical path helpers.
11. **Honest sort vocabulary:** "Provider order" (not "Recommended"), with
    documented provider-specific mapping.
12. **URL parameter syncing** for filters/sort/page; stale-response guard via
    request id.
13. **Mobile filter sheet** with draft state and Apply/Clear actions.
14. **Sticky global header**, skip-to-main link, mobile drawer with Escape
    handling, reduced-motion respect in framer-motion.
15. **Safe-area CSS variables** and `.safe-area-*` utilities exist in
    `index.css`.

### 2.2 Currently limited

1. **Destination hero is generic.** `/things-to-do/rome` renders the same
   compact "Find things to do" hero as the hub; there is no destination
   identity, no breadcrumb, no Rome context.
2. **No destination-specific page structure.** Page order today: hero →
   trust strip → category chips → results → "other destinations in these
   results" → how it works → cross-sell → disclosure. There is no planning
   context and no editorial layer.
3. **Experience card is a simple rectangle** (image + title + rating + price +
   button). It is not yet a travel decision surface with a defined hierarchy.
4. **Mapped and unmapped CTAs look identical** (same orange button); the
   semantic difference (internal research vs external booking) is not
   expressed beyond the icon.
5. **Desktop filters are a compact toolbar row** of selects/popovers — fine at
   the current filter count, but not yet a designed system.
6. **Activity detail has no sticky booking panel** — the aside scrolls with
   the page; there is no sticky action on mobile.
7. **No gallery** — a single hero image or the no-image panel; no
   multiple-image behaviour defined.
8. **No anchor/section navigation** on the detail page.
9. **"Good to know"** exists as fact chips gated by every-offer-true, but there
   is no designed signature module and no duration/meeting-point/language
   support (data absent).
10. **Category chips are free-text keyword labels**, not taxonomy. `activityTags`
    are sent to Tiqets as search keywords; Viator receives nothing (no genuine
    tag IDs), so a category filter is not honored by Viator.
11. **Pagination renders every page number** (24/page; can be many buttons).
12. **Mixed hard-coded hex values** are scattered through `ThingsToDo.tsx` and
    `ActivityDetailPage.tsx` (e.g. `#0F172A`, `#41536A`, `#8BA0B8`,
    `#D8E0E7`, `#EDF4FC`, `#001D45`, `#F7F9FC`) instead of tokens.
13. **Focus-visible styling is inconsistent** (some controls define it, some
    do not).
14. **"Other destinations in these results"** is derived from the current page
    of products — it is honest but can feel random; it must not be presented
    as a destination ranking.

### 2.3 Design debt (fix in T3B+)

- Tokenise all hard-coded Things colours (§6).
- Unify radius/shadow usage on cards, panels, inputs (§10–12).
- Replace `text-[#8BA0B8]` muted text usage where the text is essential
  (§6.4, §7).
- Standardise focus rings on every interactive control (§22.3).
- Cap pagination with a numbered window + ellipsis (§29).
- Make the no-image state a deliberate premium surface, not a "broken card"
  look (§14.4).
- Define the orange-on-white small-text rule (currently
  `text-[#D64A2A] text-xs` eyebrow fails strict AA — replace with
  `action-orange` `#D14525` bold or a `brand-primary` eyebrow in T3B) (§6.4).

### 2.4 Data limitations (design must respect)

- Rating, review count, price, description, image: present only when a single
  offer carries a genuine value; multi-offer ambiguity suppresses the summary.
- `duration`, `meetingPoint`, `availabilityState`, `language`,
  age/access requirements: **no current source populates these** — the UI must
  treat them as unknown, never render negative statements.
- Current Vatican canonical activity has **no durable image** — the no-image
  state must look intentional.
- Category labels are free-text search keywords for Tiqets only; Viator has no
  tag filtering until genuine tag IDs exist.
- Viator page size cap (20) differs from Tiqets (24); count semantics differ.
- Rome destination is `draft` (noindex) — destination pages support
  indexable-ready design but stay noindex until the publication gate is passed.
- No editorial/official-verified content exists yet for Rome planning context.
- `likelyToSellOut` exists in the model but must **not** be rendered as
  scarcity; there is no evidence policy for it.

### 2.5 Architecture that must not change

The following are load-bearing and **out of scope for any redesign**:

1. `map-provider-products` canonical mapping flow (provider identity only,
   batched, validated, enhancement-only).
2. Resolver-backed detail page (`things-activity-public` resolve; exact slug
   pair; fail-closed states).
3. `ThingsActivity` (BookingsFinder-owned identity) vs `ThingsActivityOffer`
   (provider-scoped) separation — no provider ID or product ID in canonical
   URLs.
4. Activity detail noindex at client and server layers; canonical self-link
   emitted only after identity genuinely resolves.
5. Provider URLs preserved exactly (genuine affiliate parameters intact);
   outbound links always `target="_blank" rel="sponsored nofollow noopener"`.
6. Neutral offer ordering; single-offer gating for rating/price/description;
   every-offer-true gating for activity facts.
7. `unknown ≠ false`; no fabricated popularity/urgency/prices/reviews.
8. Viator enablement stays server-side; no frontend constant gates it.
9. `recordActivity` stays on committed-search boundaries only.
10. Fail-closed slug resolution; legacy `?city=` migration bridge unchanged.

---

## 3. Design principles

Every design decision in this system is filtered through these principles:

1. **Useful before impressive.** A component earns its place by helping a
   decision, not by looking clever.
2. **Context before content.** Tell the traveller what they are looking at
   before dumping data (section headers, breadcrumbs, honest result framing).
3. **Evidence before AI.** Claims come from verified data or provider
   evidence, never from inference. AI may explain evidence; it never
   manufactures it.
4. **Action before analytics.** One clear next action per viewport; analytics
   never drives what is shown.
5. **Progressive disclosure.** Summaries first; detail on demand
   (cards → detail page → provider checkout).
6. **Calm over promotional.** Restraint is a feature. One accent colour doing
   one job.
7. **Trust over urgency.** No scarcity, no countdowns, no fake popularity.
8. **Decision support over data density.** Show what helps someone choose;
   hide what merely fills space.

---

## 4. Anti-patterns

Never ship any of the following in the Things experience:

- fake discount badges, "save X%", crossed-out prices, "was/now" pricing
- "best seller", "top pick", "popular", "recommended", "likely to sell out",
  "usually sells out", "book X days ahead", queue-time claims — without
  verified evidence
- countdowns, limited-time urgency, "only X left"
- badge overload (more than 2 factual chips on a card, more than 1 pill per
  image)
- unexplained recommendation labels
- teal as primary (superseded), green as a brand colour, purple SaaS
  gradients, neon, excessive gradients, glassmorphism everywhere, gradient
  borders, glowing buttons, overly dark surfaces
- giant promotional banners between sections
- carousel auto-play, pulsing CTAs, bouncing animations, scroll-jacking, long
  page entrance sequences
- hover-only information (nothing essential lives behind `:hover`)
- clickable `div`s in place of links/buttons
- showing unrelated stock photography for an activity
- showing a negative statement because a field is null ("no free
  cancellation" when the field is unknown)
- presenting filter results as taxonomy-filtered when the underlying search is
  keyword-only or unfiltered for a provider
- duplicate provider descriptions scraped verbatim without attribution
- SEO text walls / keyword stuffing / thin generated copy

---

## 5. Brand identity

### 5.1 Locked direction

- **Deep BookingsFinder blue** + **warm orange** + **white / warm-neutral
  canvas**. This three-part system is non-negotiable.
- Primary brand colour: **`#01367F`** (locked). It **overrides** any older
  repository documentation that specifies teal `#0D4F5C` or another
  historical colour.
- Warm orange is used **sparingly** for the principal action, selected/action
  states, the booking CTA, and high-value interactions.
- The final system must remain compatible with the existing production
  surfaces: navy hero `#001D45`, pale blue canvas `#F7F9FC`, white cards.

### 5.2 Brand personality (Things-specific)

- Knowledgeable friend, not travel agent.
- Calm and organised, not urgent.
- Transparent and honest: we say what we know, who provides it, and what
  happens next.
- Practical: decision support over data density.

### 5.3 Superseded documentation (do not copy)

| Older rule | Where it appeared | Status |
|---|---|---|
| Primary teal `#0D4F5C` / `#0D4F5C` deep teal | `PHASE_1A_BRAND_HOMEPAGE_SPEC.md` §2 | **Superseded** by `#01367F` |
| Accent "Coral Sun" `#E8734A` | `PHASE_1A_BRAND_HOMEPAGE_SPEC.md` §2 | **Superseded** by action orange `#D14525` (production-ready fill; `#D64A2A` retained only as the historical visual orange reference) |
| Viator gated by compile-time flag `VIATOR_PUBLIC_ENABLED` in `src/types/experiences.ts` | `docs/THINGS_TO_DO_MULTI_PROVIDER.md` | **Superseded** — enablement is server-side only |
| "View Deal" blue underline as the primary card action | `docs/TIQETS_PHASE_1B_PUBLIC_EXPERIENCE.md` | **Superseded** by the verified mapped "View details" flow (T2D-B2B-5C) |
| Orange `#f97316` hero CTA | `docs/TIQETS_PHASE_1B_PUBLIC_EXPERIENCE.md` | **Superseded** by action orange `#D14525` (production-ready fill; `#D64A2A` retained only as the historical visual orange reference) |

---

## 6. Colour system

### 6.1 Action orange — corrected accessibility position

`#D64A2A` (HSL `15 68% 50%`) is the **established historical/current visual
orange** and is retained here for reference only. It is **not** the
production fill token: white text on `#D64A2A` measures ≈ **4.3:1**, which
**fails** WCAG AA normal text (needs ≥ 4.5:1). The earlier assumption that
4.3:1 is acceptable for 14px bold button labels is **incorrect** — 14px bold
is normal text, not "large text" (the large-text exemption begins at 18pt /
24px regular or 14pt / ≈ 18.7px bold), and "UI component" contrast (3:1)
never waives text contrast.

**Production-ready filled action orange: `#D14525`.** It is visually very
close to `#D64A2A` while giving white text ≈ **4.58:1** — WCAG AA normal
text (≥ 4.5:1). Hover `#B83D22` ≈ 5.7:1 and pressed `#A8331C` ≈ 6.7:1 are
both darker and AA-compliant.

Action-orange contrast obligations:

- White normal-size text on a filled CTA must meet **≥ 4.5:1**.
- Do **not** rely on "UI component contrast" (3:1) to waive text contrast —
  text inside a button is text.
- Do **not** rely on 14px bold counting as "large text".
- Small orange text on white must also meet text contrast (≥ 4.5:1), or use
  `brand-primary` / `text-secondary` instead.

Implementation is **not** modified in this phase; T3B will adopt the
corrected token.

### 6.2 Token tables

Every token below has a UX purpose. Do not add decorative colours.

**Brand (blue) tokens**

| Token | Hex | Purpose |
|---|---|---|
| `brand-primary` | `#01367F` | Brand identity; primary buttons; selected chips; links on light; active pagination |
| `brand-primary-hover` | `#012B66` | Hover for primary blue controls (matches production `--primary-hover`) |
| `brand-primary-strong` | `#00224F` | Active/pressed blue state (production `--primary-strong`) |
| `brand-primary-soft` | `#EDF4FC` | Selection tint, icon tint, active-chip background, hover fills on blue |
| `brand-primary-surface` | `#F7F9FC` | Pale canvas panels, trust line background |
| `brand-navy` | `#001D45` | Hero / anchor surfaces (production `--surface-anchor`) |

**Action (orange) tokens**

| Token | Hex | Purpose |
|---|---|---|
| `action-orange` | `#D14525` | **Primary action only**: booking CTA, search submit, apply-filters, principal action per viewport. White text ≈ 4.58:1 → WCAG AA normal text (≥ 4.5:1) |
| `action-orange-hover` | `#B83D22` | Hover for orange controls (white text ≈ 5.7:1) |
| `action-orange-strong` | `#A8331C` | Pressed/active orange state (white text ≈ 6.7:1) |
| `action-orange-soft` | `#FCEBE5` | Orange tint for selected/action accents (active filter counts, highlights) — background only, never text |

> `#D64A2A` is the historical/current visual orange, retained for reference
> only. White text on it ≈ 4.3:1 **fails** AA normal text; it is not a
> production fill token. Never use `#D64A2A` for filled CTA labels.

**Text tokens**

| Token | Hex | Purpose | Contrast on white |
|---|---|---|---|
| `text-primary` | `#0F172A` | Headings, titles, emphasis | ≈ 16:1 (AAA) |
| `text-secondary` | `#41536A` | Body copy, metadata | ≈ 7.9:1 (AAA) |
| `text-muted` | `#8BA0B8` | **Non-essential** captions, legal, image credits, timestamp-style notes | ≈ 2.7:1 — essential text must not use this token (§6.4) |
| `text-on-dark` | `#FFFFFF` / `white/90` / `white/70` / `white/50` | Text on `brand-navy` and images | white on `#001D45` ≈ 16:1 |

**Surface tokens**

| Token | Hex | Purpose |
|---|---|---|
| `surface-page` | `#F7F9FC` | Page canvas |
| `surface-card` | `#FFFFFF` | Cards, panels, sheets, inputs |
| `surface-subtle` | `#F0F2F5` | Inset areas, secondary skeleton blocks, hover fills on white |
| `surface-raised` | `#FFFFFF` | Elevated cards/drawers (with `shadow-elevated`/`shadow-modal`) |
| `surface-anchor` | `#001D45` | Hero band, dark surfaces |
| `skeleton-base` | `#E5E9EE` | Primary skeleton block |

**Border tokens**

| Token | Hex | Purpose |
|---|---|---|
| `border-default` | `#D8E0E7` | Card/panel/input borders |
| `border-subtle` | `#E5E9EE` | Divider lines, skeleton borders |
| `border-strong` | `#BEC8D6` | Emphasis borders, focus-adjacent selected outlines |

**Semantic tokens (functional, not brand)**

| Token | Hex | Purpose |
|---|---|---|
| `success` | `#2E7D54` | Genuine positive facts ("Good to know"), confirmation states |
| `success-soft` | `#EAF5EF` | Success tint backgrounds |
| `warning` | `#B57A2E` | Attention states that are not errors |
| `warning-soft` | `#FBF3E7` | Warning tint backgrounds |
| `error` | `#C23B3B` | Errors, destructive actions |
| `error-soft` | `#FBEBEB` | Error tint backgrounds |
| `info` | `#2E6DB4` | Informational notes |
| `info-soft` | `#EAF2FB` | Info tint backgrounds |

### 6.3 Where orange SHOULD and SHOULD NOT appear

**Orange appears only for:**
1. The **principal action** of a viewport (search submit; the booking CTA on
   the detail page; "Show results" in the filter sheet; "Try again" on an
   unavailable state). Experience listing cards never use orange CTAs (§19).
2. **Selected/active action states** that are themselves actions (active
   primary filter button).
3. The active-count badge on the mobile Filters trigger.
4. High-value interaction affordances when blue would be ambiguous (e.g. the
   external "Check availability" CTA on a provider offer).

**Orange must NOT appear for:**
- Section headers, headings, body text, metadata (except the rules in §6.4).
- Decorative elements, gradient flourishes, dividers, borders.
- More than one competing CTA per viewport (never two orange CTAs side by
  side).
- Badges that are informational rather than actions (informational chips use
  `surface-card` + `border-default` or `success`/`info` semantics only).
- Eyebrow text at small sizes (see §6.4 — orange text on white must meet
  ≥ 4.5:1; use `brand-primary` or `text-secondary`, or `action-orange`
  `#D14525` at ≥600 weight if orange text is required).

### 6.4 WCAG notes (conceptual checks)

- White on `brand-primary` `#01367F`: ≈ 11.9:1 → **AAA**.
- `brand-primary` on white: ≈ 10.5:1 → **AAA**.
- White on `action-orange` `#D14525`: ≈ 4.58:1 → **AA normal text**
  (≥ 4.5:1). All filled-CTA labels, including 14px bold, must meet this.
- White on `#D64A2A` (historical reference only): ≈ 4.3:1 → **fails** AA
  normal text; not a production fill token.
- `action-orange-hover` `#B83D22` on white / white on it: ≈ 5.7:1 → AA.
  `action-orange-strong` `#A8331C`: ≈ 6.7:1 → AA.
- **Text contrast rules**: text inside a button is text — "UI component"
  contrast (3:1) never waives it; 14px bold is **not** "large text" (large
  text begins at 18pt / 24px regular or 14pt / ≈ 18.7px bold).
- **Orange as text**: orange text on white must meet ≥ 4.5:1.
  `action-orange` `#D14525` at ≥600 weight meets this (≈ 4.58:1);
  `#D64A2A` (≈ 4.3:1) must never be used as text on white. Prefer
  `brand-primary` or `text-secondary` where orange text is not required.
  Current product debt: the hero eyebrow `text-[#D64A2A] text-xs` — replace
  with `action-orange` bold or a `brand-primary` eyebrow in T3B.
- `text-muted` `#8BA0B8` (≈ 2.7:1) is for non-essential text only. Essential
  instructions, prices, availability and disclosure copy use `text-secondary`
  `#41536A` or `text-primary`.
- Semantic tints (`*-soft`) are backgrounds for icons/status; never place
  small essential text on them below AA.

---

## 7. Typography

**Stack:** keep the existing `Inter` + system fallback stack from
`tailwind.config.ts`. **No new font dependency in this phase.** Prices and
counts use `tabular-nums`.

Do not use giant SaaS landing-page typography, ultra-light weights (below 400
for body, below 600 for UI emphasis), or overly dense metadata.

| Role | Desktop | Mobile | Weight | Usage |
|---|---|---|---|---|
| `display` (hero H1) | 40px / 1.15 | 30px / 1.2 | 800 (extrabold), tracking-tight | Destination hero title only ("Things to do in Rome") |
| `h1` (page title) | 32px / 1.2 | 24px / 1.25 | 700 | Activity detail title, standalone page titles |
| `h2` (section) | 24px / 1.3 | 20px / 1.35 | 700 | Section headers ("Explore Rome", "Good to know", "Booking options") |
| `h3` (block/card title) | 16px / 1.4 | 16px / 1.4 | 600 | Card titles, sub-blocks |
| `body-large` | 18px / 1.6 | 17px / 1.6 | 400 | Hero subcopy, lead paragraphs |
| `body` | 16px / 1.6 | 16px / 1.6 | 400 | Editorial copy, descriptions |
| `small` | 14px / 1.5 | 14px / 1.5 | 400 | Metadata, card location, secondary copy |
| `caption` | 12px / 1.45 | 12px / 1.45 | 400 | Credits, timestamps, legal (non-essential) |
| `label` (eyebrow) | 12px / 1.2, uppercase, tracking-widest | 12px | 700 | Section eyebrows ("EXPLORE ROME") — use `brand-primary` or `text-secondary` |
| `button` | 14px / 1.2 | 14px / 1.2 | 600 | All buttons; orange fills use `action-orange` `#D14525` so white labels meet ≥ 4.5:1; keep ≥600 weight |
| `price` | 20px / 1.2 (card), 24px / 1.2 (booking panel) | 18–20px | 700, tabular-nums | Genuine prices only |
| `rating` | 14px / 1.2 | 14px / 1.2 | 600, tabular-nums | Rating value |
| `metadata` | 13px / 1.4 | 13px / 1.4 | 400 | Provider attribution lines, filter labels |

Line-length rule: running text max ≈ 70ch; captions/legal max ≈ 60ch.
Headings: max 2 lines; card titles clamp to 2 lines.

---

## 8. Spacing

- **Base unit:** 4px (Tailwind default scale). Use only scale steps:
  2, 4, 6, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80.
- **Page gutters:** mobile 16px, tablet 24px, desktop 32px.
- **Section rhythm:** desktop 64–80px between major sections; mobile
  40–48px.
- **Card padding:** 16–20px (`p-4`–`p-5`). **Card gaps:** 20px
  (`gap-5`) mobile/tablet, 24px (`gap-6`) desktop.
- **Detail column gap:** 40px (`gap-10`) between main column and booking
  panel.
- **Vertical spacing inside cards:** image flush to top; 16px to content
  block; 8–12px between title/location/rating/price lines; 16px before the
  footer row.
- **Touch targets:** ≥44×44px where practicable; 44px minimum height for all
  buttons and tappable rows (§22.4).
- Generous whitespace is required, but the results area must begin quickly —
  the hero and rails must not push results below the fold on mobile.

---

## 9. Grid / containers

- **Listing & hub pages:** `max-w-7xl` (1280px) container, centered.
- **Activity detail:** `max-w-6xl` (1152px) container, centered.
- **Hero band:** full-bleed background (`brand-navy`), contained content
  inside the page container.
- **Full-bleed elements:** global header, hero band, footer. Everything else
  is contained.
- **Results grid:** 1 col (<640), 2 cols (640–1023), 3 cols (1024–1279),
  4 cols (≥1280). Cards are uniform height; footer row pinned to bottom
  (`flex flex-col` + `mt-auto`).
- **Detail layout:** `grid lg:grid-cols-[minmax(0,1fr)_360px]` — main column +
  360px booking panel (existing contract preserved).
- **Category rail:** horizontal scroll on mobile/tablet (snap, hidden
  scrollbar), static grid or centered row on desktop.
- No masonry, no justified card stretching.

---

## 10. Radius

| Surface | Radius |
|---|---|
| Cards (experience, offer, info block) | 12px (`rounded-xl`) |
| Buttons | 8–12px (`rounded-lg`–`rounded-xl`); pill `rounded-full` only for chips/filters |
| Inputs | 10–12px (`rounded-lg`–`rounded-xl`) |
| Hero search container | 16px (`rounded-2xl`) |
| Modals / sheets | 16px top (`rounded-t-2xl`) |
| Chips / pills | `rounded-full` |
| Skeleton blocks | inherit from the surface they mock |

---

## 11. Borders

- Default interactive/card border: 1px `border-default` `#D8E0E7`.
- Dividers inside cards/panels: 1px `border-subtle` `#E5E9EE`.
- Emphasis (selected outline, strong separators): `border-strong`
  `#BEC8D6`.
- Hover border on interactive cards: `brand-primary` at 20–40% opacity or
  `border-strong` (do not jump to full brand blue on hover — keep calm).
- No gradient borders, no double borders, no glow borders.

---

## 12. Shadows

Restrained, blue-tinted elevation (existing production tokens):

| Level | Token | Use |
|---|---|---|
| `shadow-sm` | `0 1px 2px rgb(1 54 127 / 0.04)` | Default resting elevation |
| `shadow-card` | production `--shadow-card` | Card resting state |
| `shadow-elevated` | production `--shadow-elevated` | Card hover, sticky bars when elevated |
| `shadow-modal` | production `--shadow-modal` | Sheets, drawers, popovers, header when scrolled |

No glow, no drop-shadow decoration on buttons, no colored shadows.

---

## 13. Iconography

- **Lucide React** (already in the project), stroke width 2, consistent set.
- Sizes: 16px inline metadata, 18–20px controls/rows, 24px hero/inline empty
  states, 24–32px category tiles.
- Icons are decorative (`aria-hidden="true"`) when the adjacent text is
  sufficient; when an icon alone conveys meaning it gets an accessible label.
- Do not mix filled and outline icon families.
- Icon colour follows semantic intent: `brand-primary` for informational
  icons on light, `success` for genuine positive facts, `text-muted` for
  decorative/inactive, white on dark surfaces.
- Rating stars: filled amber (`fill-amber-400 text-amber-400`) only for
  genuine provider ratings.

---

## 14. Photography & image system

### 14.1 Principles

Photography carries emotional/visual value but **never substitutes for
truth**:

- Use large travel imagery **only where genuine imagery exists**.
- **Never** show unrelated stock imagery for an activity; never use a random
  destination image as an activity image; never invent imagery.
- When genuine activity imagery is missing, use a **premium neutral fallback**
  — never a broken-card appearance. The current Vatican detail (no durable
  image) must look intentional.

### 14.2 Ratios

| Surface | Ratio | Notes |
|---|---|---|
| Experience card image | 16:10 (`aspect-[16/10]`) | Keep existing contract |
| Destination hero (image mode) | 21:9 desktop, 16:9 mobile | Only with a genuine licensed/owned asset; otherwise designed surface (§14.3) |
| Activity detail hero/gallery | 16:9 (`h-56 sm:h-72 lg:h-80` ≈ 16:9 at width) | Keep existing heights as a base |
| Mobile gallery thumbnails | 1:1 square | Only when multiple genuine images exist |
| No-image panels | match the surface ratio they replace | same box, same height |

### 14.3 Destination hero treatment

- **Default state (current):** designed surface — `brand-navy` background with
  the existing subtle line/curve decoration, no imagery required. This is the
  documented safe state.
- **Image state (future, gated):** only a genuine licensed/owned Rome asset.
  Use 21:9 crop with a `brand-navy`→transparent gradient overlay at 30–40%
  opacity for text legibility. Never letterbox, never stretch.

### 14.4 No-image fallback (activity/card)

- A composed panel in `brand-primary-soft`/`surface-subtle` with a single
  large muted icon (`MapPin` or `ImageOff`), the activity title in
  `text-secondary` at `small`, and no clutter.
- Card no-image: `ImageFallbackPanel` (existing) refined to token colours —
  same aspect ratio as the image slot, so the card keeps its shape.
- Detail no-image: existing `ActivityHeroImage` fallback refined to tokens —
  centered icon + "No image is available for this experience yet." in
  `text-secondary`; add a thin brand rule so the state reads as intentional.
- Never render a broken image glyph, an empty box, or a stock photo.

### 14.5 Loading behaviour

- `loading="lazy"` on all below-the-fold images; `eager` + `fetchpriority`
  for the first hero/detail image when one genuinely exists.
- `onError` swaps to the no-image fallback (never a broken-image icon).
- Preserve image aspect-ratio containers to prevent layout shift (CWV).

### 14.6 Alt text

- Use provider-supplied `imageAlt` when genuine; else the activity title.
- Never leave alt empty for a meaningful image; decorative panels use
  `aria-hidden`/`role="presentation"` semantics only.

---

## 15. Motion

### 15.1 What motion is for

Motion communicates structure: it explains what changed, where things came
from, and what is sticky. It never performs.

### 15.2 Allowed

- Card image subtle zoom on hover: **desktop only**, `scale(1.04–1.05)`,
  300ms ease-out (existing pattern).
- Filter sheet: fade + slide-up 200–300ms (existing `animate-slide-up`).
- Skeleton: gentle `animate-pulse` (existing).
- Sticky bars (toolbar/booking panel/action bar): elevation transition
  (background/border/shadow) when the bar becomes elevated on scroll.
- Popover/menu: quick fade/slide 150–200ms.
- Focus ring transitions: ≤150ms.

### 15.3 Forbidden

- Bouncing, pulsing CTAs, carousel auto-play, attention traps, long page
  entrance sequences, scroll-jacking, parallax on scroll, animated number
  count-ups, confetti/celebration effects.
- Hover-driven layout shifts.

### 15.4 Reduced motion

- Respect `prefers-reduced-motion`: disable non-essential transforms and
  transitions (framer-motion already exposes `useReducedMotion`; apply the
  same contract to CSS animations).
- All motion must be complete ≤300ms.

---

## 16. Interaction feedback

| State | Contract |
|---|---|
| Default | Resting colours per tokens; no shadow emphasis on cards (or `shadow-card`) |
| Hover | Desktop: card border → `brand-primary/20` + `shadow-elevated`; buttons darken to hover tokens; links underline or colour shift |
| Focus | Visible 2px ring (`ring-2 ring-offset-2`), `brand-primary` for blue contexts, `action-orange` for orange controls (§22.3) |
| Active/pressed | Darken one step (`brand-primary-strong` / `action-orange-strong`); optional `scale-[0.98]` on touch buttons |
| Selected | Blue fill (`brand-primary`) + white text for selected filters/chips; `brand-primary-soft` background for non-action selections |
| Loading | Component-level skeletons; buttons show `Loader2` spin + disable pointer; never block the whole page |
| Disabled | 40% opacity, `cursor-not-allowed`, no hover elevation |
| Error | Honest copy + retry action; never fabricate; see §17 |
| Touch pressed | `active:opacity-70 active:scale-[0.98]` (existing `.native-touch`) |
| Sheet open | Backdrop `bg-black/50`, sheet slide-up, focus trapped, Escape closes |
| Sticky state | Bar elevation appears when scrolled past its anchor |

Never rely on hover alone to reveal information (mobile has no hover).

---

## 17. State system

### 17.1 Loading states

- **Search/results:** skeleton grid — same column count and aspect as the real
  grid; 8 skeleton cards; `aria-busy="true"` on the region; no old results
  shown under a new request (existing request-id guard).
- **Detail page:** existing `ActivityDetailSkeleton` refined to tokens —
  breadcrumb bar, title/location bars, image block, facts block, booking panel
  block; `aria-busy="true"`.
- **Buttons:** inline spinner + disabled during their own async action.
- Never show partial real content blended with skeletons in a way that could
  be mistaken for final content.

### 17.2 Skeleton behaviour

- Blocks: `skeleton-base` `#E5E9EE` (primary) and `surface-subtle` `#F0F2F5`
  (secondary), `animate-pulse`.
- Shapes mirror final layout 1:1 (aspect ratios, column counts, panel
  geometry) to prevent layout shift and set expectations.
- Screen readers: region-level `aria-label` + `aria-busy`; individual blocks
  are decorative.

### 17.3 Empty states

- Triggered only when **at least one provider answered healthily** and
  genuinely returned zero matches (existing `anyProviderAnswered` rule).
- Copy: "No experiences matched your search" + guidance + "Clear all filters"
  when filters are active. Never tell the user the site is broken when the
  inventory is genuinely empty; never suggest it is their fault when the
  infrastructure failed.
- Visual: centered, `surface-subtle` dashed-border panel, one `info` icon,
  `text-primary` heading, `text-secondary` body, one outline button max.

### 17.4 Error / unavailable states

- **Inventory unavailable (nothing answered):** existing honest panel — "This
  is on our side — please try again shortly" + `Try again` (orange, the
  principal action). Never expose provider/infrastructure details.
- **Detail resolver unavailable:** existing `ActivityDetailUnavailable` —
  distinct from not-found; "We couldn't load this experience right now";
  `Try again` genuinely re-runs the resolver. Never claim the activity does
  not exist.
- **Not found:** existing `NotFound` (noindex), no fabricated alternatives.
- **Provider partial failure:** when one provider is `unavailable` (not
  `disabled`, not silently absent) while another answered, show a slim
  inline notice above results: "Some experiences may be temporarily missing."
  `disabled` contributes nothing and shows nothing.
- **Mapping failure:** **visually invisible** — the provider card with its
  outbound "View experience" link remains the working fallback (§30.5).

---

## 18. Content hierarchy

Per viewport, in order:

1. **Identity** — breadcrumb + H1 (what am I looking at).
2. **Context** — one concise supporting line (where, why it matters).
3. **Action** — search / primary CTA.
4. **Discovery** — category shortcuts (rail).
5. **Evidence** — results with honest count, filters, sort.
6. **Decision support** — Good to know, planning context (gated).
7. **Disclosure** — provider attribution + affiliate disclosure.
8. **Wayfinding** — footer.

Within a card: image → factual indicator(s) → title → location → rating →
price → provider attribution → action (§30).

Within the detail page: breadcrumb → title → location → optional
rating/price → gallery → anchor nav → Good to know → About → included /
expect / practical (gated) → booking options → provider disclosure → future
related.

---

## 19. CTA hierarchy

Per viewport, exactly **one** principal action; everything else is
secondary or tertiary.

| Level | Token | Examples |
|---|---|---|
| Primary (1 per viewport) | `action-orange` fill (`#D14525`), white bold text (≥ 4.5:1) | Search submit; "Check availability" (booking CTA); "Show results"; "Try again" |
| Secondary | `brand-primary` fill (blue) OR `surface-card` + `border-default` outline | "View details" (mapped card, internal); "View experience" (unmapped card, external); "Clear all"; "Plan a trip" |
| Tertiary | text link | Breadcrumb links, "Clear all filters", "Remove filter" chip |

Rules:

- The booking CTA on the detail page ("Check availability") is orange.
- The mapped-card "View details" is **internal navigation** — it may be a
  blue or outline secondary action; it must not carry affiliate semantics
  (§30.3).
- The unmapped-card "View experience" is **external** — same calm
  listing-action family as the mapped CTA (blue filled or blue/neutral
  outline), **never orange**; preserve provider attribution and open with
  `rel="sponsored nofollow noopener"`; the external icon distinguishes it
  (§30.4). Unmapped inventory is not visually punished.
- **Experience listing cards never use orange CTAs** (mapped or unmapped) —
  a 3–4 column results grid must not become visually promotional. Orange is
  reserved for singular high-value conversion actions: Search, Show
  results / Apply, Try again, Check availability.
- Never place two orange CTAs in the same card or the same viewport region.
- Text links use `brand-primary` and underline on hover; never orange except
  per §6.4.

---

## 20. Data honesty rules

1. **Do not show data because we have it.** Show it only when it supports a
   decision or a next action.
2. **`null` means unknown, not false.** A missing field never renders as a
   negative statement.
3. **Single-offer gating:** rating/review/price/description render only when
   exactly one offer carries a genuine value (unambiguous attribution).
4. **Every-offer-true gating:** activity-level facts render only when every
   offer reports `true`; a fact one offer reports and another doesn't is
   never promoted to an activity claim.
5. **No fabricated popularity/urgency/prices/reviews/availability.** No
   "best", "cheapest", "recommended", "popular", "best seller", "top pick",
   "likely to sell out", "save X%", countdowns, or queue-time claims without
   verified evidence.
6. **Evidence categories** (see §33): SOURCE VERIFIED / PROVIDER VERIFIED /
   BOOKINGSFINDER EDITORIAL VERIFIED / UNKNOWN — DO NOT SHOW.
7. **AI explains evidence; AI never manufactures recommendation evidence.**
8. **Filters must be honest about what they filter.** A keyword shortcut is a
   keyword shortcut, not a taxonomy filter. If a provider cannot apply a
   filter, results from that provider must not be presented as filtered
   (§16 in Rome spec; §29 filter contracts).
9. **Counts are genuine only — count-provenance rule.** Result counts come
   from the provider's real total, or the honest returned-product count when
   the total is unknown. A combined total (e.g. "148 experiences") may be
   shown **only** when every active provider count being combined represents
   a compatible genuine total (e.g. Tiqets may provide a genuine upstream
   total; Viator may provide only the current returned-page/product count
   depending on the adapter/provider contract). If semantics are
   mixed/incomparable, prefer **"Showing N experiences"** where N is the
   actual visible result count, or omit the count. **Never sum** one
   provider's genuine total with another provider's current-page count and
   present that as a total.

---

## 21. Provider attribution rules

1. **Provider identity is always visible** on cards, offers, and the booking
   panel ("Provided by Tiqets" / "Booking and payment handled by Viator.").
2. **Mapped card:** the "View details" CTA is internal BookingsFinder
   navigation — no `target="_blank"`, no `rel="sponsored"`, no external icon,
   no affiliate semantics. Provider attribution still appears in the card
   footer ("Provided by Tiqets").
3. **Unmapped card:** "View experience" is the genuine provider outbound link
   — `target="_blank" rel="sponsored nofollow noopener"`, external icon,
   provider attribution in the footer. Unmapped inventory is **not visually
   punished** — it belongs to the same card family.
4. **Detail offers:** each provider offer card shows the provider name, the
   provider price (when genuine), the provider CTA, and the line "Booking and
   payment handled by {Provider}."
5. **Neutral ordering:** offers sort by provider name, then product ID —
   never by commission, never by "best".
6. **Disclosure copy** (bottom of booking panel / card footer): "BookingsFinder
   may earn a commission when you book with a provider. Availability and
   prices are set by the provider."
7. No provider identity is ever hidden, merged, or re-branded.

---

## 22. Accessibility

### 22.1 Semantics & landmarks

- One `main` per page (`id="main-content"`), one `h1` per page.
- Logical heading order (`h1 → h2 → h3`), no skipped levels.
- Sections labelled with `aria-labelledby` pointing at their headings.
- `<nav aria-label="Breadcrumb">` for breadcrumbs; `<nav aria-label="...">`
  for filter/category rails; `<aside aria-label="Booking options">` for the
  booking panel.
- Lists for cards/offers/chips (`ul`/`ol` + `li`), not bare divs.

### 22.2 Link vs button semantics

- **Links** navigate: "View details" (internal `Link`), "View experience"
  (external `a`), breadcrumb links, "Clear all filters" when it resets to a
  URL state that is represented as a link.
- **Buttons** perform actions: filter toggles, sort selects, search submit,
  sheet open/close/apply, pagination, "Try again".
- Never use clickable `div`s or `span`s with `onClick` for these roles.
- Toggle chips use `aria-pressed`; filter groups use `role="group"` or
  fieldset/legend semantics.

### 22.3 Focus & keyboard

- Every interactive control has a visible focus ring: `focus-visible:ring-2
  ring-offset-2` — `brand-primary` ring for blue contexts, `action-orange`
  ring on orange controls, `info`/`brand-primary` for inputs.
- Keyboard: all controls reachable and operable; Escape closes sheets,
  drawers, popovers (existing pattern); arrow keys for rails/selects where
  applicable.
- Focus management on sheet open (move focus into sheet, trap within,
  restore on close) — the mobile filter sheet and mobile nav drawer need a
  documented focus trap in T3F.
- Skip-to-main link already exists in the header — keep on every Things
  page.
- `:focus-visible` only — do not show focus rings on mouse click for
  non-keyboard users where the platform default is acceptable; but never
  suppress focus styles entirely.

### 22.4 Touch targets

- ≥44×44px for all tappable controls where practicable (buttons, chips with
  removal, pagination arrows, sheet close, sticky action).
- Chip remove buttons currently `p-0.5` — raise to ≥40px hit area with
  padding/negative-margin technique in T3F.
- Sticky bottom bars: ≥56px height (existing `.native-button` convention).

### 22.5 Screen readers

- Loading regions: `aria-busy="true"` + `aria-label`.
- Empty/unavailable states: `role="status"` (polite) for result-state panels.
- Filter counts: `aria-label="Filters, N active"`; sort: `aria-label="Sort
  results"`.
- Images: meaningful alt from `imageAlt`/title; decorative icons
  `aria-hidden="true"`.
- Price/rating summaries use `dl`/`dt`/`dd` (existing pattern) or equivalent
  labelled structure.

### 22.6 Colour & non-colour state indicators

- State is never conveyed by colour alone: selected chips also carry
  `aria-pressed` and a check icon; disabled controls also change
  pointer-events; focus has a ring; errors have text.
- Contrast per §6.4.

---

## 23. Mobile principles

- **Results above the fold is a hard requirement.** The hero is visually rich
  but efficient; no tall hero; category rail and toolbar are compact.
- **Thumb ergonomics:** primary actions in the lower reach zone; filter
  controls in a sticky compact row, never dominating the viewport.
- **Bottom sheets** for filters (draft-apply model, existing); sticky bottom
  action bar on detail pages with safe-area padding.
- **Horizontal rails** for categories and discovery (snap, hidden scrollbar,
  edge fade).
- **1-column cards**; touch targets ≥44px; pressed states (`scale`/opacity).
- **Safe areas:** use existing `--sat/--sar/--sab/--sal` and
  `.safe-area-*`; sticky bars add `env(safe-area-inset-bottom)`.
- No desktop controls shrunk onto mobile: selects become sheets or native
  selects; long popovers become sheets; multi-row toolbars collapse.
- Keyboard: when inputs are focused, sticky bars must not cover the field.

---

## 24. Desktop principles

- Use wide layouts deliberately; never stretch mobile vertically.
- Persistent context: breadcrumb + H1 visible; sticky header; sticky booking
  panel on detail; sticky results toolbar with filters + sort.
- Larger image areas: hero 21:9 (image mode), card 16:10, detail gallery
  16:9.
- Multi-column cards (3–4), visible rail/grid for categories, visible
  contextual content (Good to know, planning context) beside results where
  useful.
- Hover affordances (card elevation, image zoom) but never hover-only
  information.
- Keyboard-friendly horizontal rows; all content accessible without hover.

---

## 25. Responsive breakpoint contract

Breakpoints follow Tailwind defaults (`sm 640 · md 768 · lg 1024 ·
xl 1280 · 2xl 1400`). Behaviour, not just widths:

| Range | What changes | What moves | Sticky | Horizontal scroll | Sheet/drawer | Columns |
|---|---|---|---|---|---|---|
| `< 640` (mobile) | Hero compacts (H1 30px, search card); trust line hidden; toolbar collapses to "Filters" + "Sort"; detail grid stacks; booking panel becomes bottom action bar | Booking panel content → bottom sticky action; planning context below results; gallery full width | Header; results toolbar; bottom action bar | Category rail; discovery rail; gallery thumbnails | Mobile filter sheet; mobile nav drawer | 1 card |
| `640–767` (small tablet) | Same as mobile; hero slightly larger; trust line may return as one line | — | Header; results toolbar | Rails | Sheets | 2 cards |
| `768–1023` (tablet) | Filter toolbar row returns (selects wrap); detail grid still stacks (booking panel scrolls with page or becomes sticky at lg only) | Planning context 2-col grid | Header | Rails (optional grid) | Sheets (or inline) | 2 cards |
| `1024–1279` (desktop) | Filter toolbar persistent; detail gets `lg:grid-cols-[1fr_360px]` with sticky booking panel; anchor nav visible | Booking panel → sticky right rail; gallery beside panel | Header; booking panel (top ≈ header height); results toolbar | None (static rows) | Popovers | 3 cards |
| `≥ 1280` (desktop wide) | 4-card grid; hero full width (21:9 image mode when genuine asset); more breathing room | — | As above | None | Popovers | 4 cards |

Rules: sticky bars must not overlap content on scroll (add offset/scroll
margin); anything that becomes horizontal scroll on mobile must have a
visible affordance (edge fade + snap) and keyboard access.

---

## 26. Performance rules

- **Images:** responsive `srcset`/`sizes` where provider images allow;
  `loading="lazy"` below the fold; `fetchpriority="high"` for the first
  genuine hero/detail image; aspect-ratio boxes to prevent CLS; never depend
  on giant unoptimised images.
- **Layout stability:** no layout shifts on data arrival — skeletons match
  final geometry; card footers pinned with `mt-auto`.
- **JS:** minimal above-fold JS; no heavy gallery libraries; the current
  stack (React + Tailwind + lucide + framer-motion) is sufficient.
- **Fonts:** no new font dependency; `font-display` stability (Inter already
  in project); `tabular-nums` for prices to prevent jitter.
- **Animation budget:** ≤300ms; `prefers-reduced-motion` disables
  non-essential animation.
- **Network:** mapping batch is one request per visible page (existing N+1
  guard); no per-card requests.

---

## 27. SEO-aware design rules

- Activity detail pages remain **noindex,follow** (client + server). This is
  a **publication gate**, not a design toggle — design must not assume
  indexability.
- Destination pages (Rome) currently `draft` → noindex until published;
  design must be indexable-ready: clear H1, logical H2 structure, useful
  internal links, crawlable useful text, accessible link text, canonical
  self-link.
- Avoid: keyword stuffing, giant SEO text walls, thin generated copy,
  verbatim duplicate provider descriptions, faceted index explosion
  (filters/sort/pagination are **not** independent SEO landing pages by
  default — they must stay `noindex` or non-canonical via the existing
  pattern).
- Design supports: `title` + `description` per destination, JSON-LD WebPage
  (existing), ItemList for results (existing), canonical host non-www.
- The page exists ≠ the page is indexable. No design element may imply
  indexation status.

---

## 28. Analytics-semantic boundaries

- **Analytics never drives product semantics.** Click counts, session data,
  or affiliate performance are **not** sources for "popular", "recommended",
  "trending", or ranking claims in the UI.
- **Event types are semantically distinct and must not blur:** internal
  navigation (`logInternalNavigation`, "View details" mapped links) vs
  outbound affiliate clicks (provider links, `experience-click`) vs
  committed searches (`recordActivity` at the committed-search boundary).
- Instrumentation must not change behaviour: no redirects, no delays, no
  event-gated rendering.
- The design does not add analytics-driven UI (e.g., "most viewed" rails).

---

## 29. Component inventory

Each contract: **Purpose / Content / Visual / Interaction / Desktop /
Mobile / Data gate / Accessibility / Failure behaviour.**

### 29.1 Global Header
- **Purpose:** persistent wayfinding + brand.
- **Content:** logo, main nav (Flights, Stays, Things to Do, Trip Cost,
  Optimizer, Help), Sign In, "Plan a Trip".
- **Visual:** sticky, `bg-background/95 backdrop-blur`, 64–68px, border-bottom.
- **Interaction:** active item = `brand-primary` text + `brand-primary/10`
  pill; mobile drawer slide-in.
- **Desktop:** full nav row. **Mobile:** hamburger + drawer (existing).
- **Data gate:** none.
- **A11y:** skip link, `aria-current="page"`, Escape closes drawer, focus
  trap in T3F.
- **Failure:** n/a (static).

### 29.2 Things Breadcrumb
- **Purpose:** location context + escape hatch.
- **Content:** `Things to do` / `Rome` (/ `Activity title` on detail).
- **Visual:** `small` text, `text-secondary`, `/` separators,
  `text-muted`; current item `text-primary`, truncate with `max-w`.
- **Interaction:** links navigate; current is text.
- **Desktop/Mobile:** same; wraps to 2 lines max on mobile.
- **Data gate:** registry-driven labels only (never free text).
- **A11y:** `nav aria-label="Breadcrumb"`, `ol/li`, `aria-current="page"`.
- **Failure:** unknown destination never renders breadcrumb (route fails
  closed to NotFound).

### 29.3 Destination Hero
- **Purpose:** destination identity + search action (see Rome spec §14).
- **Content:** breadcrumb, eyebrow (optional), H1 "Things to do in Rome",
  1 concise context line (≤ ~180 chars), search surface, optional shortcuts.
- **Visual:** `brand-navy` band, subtle decoration, contained content;
  compact mobile.
- **Interaction:** search commits (existing registry-driven routing).
- **Desktop:** taller band, larger H1 (display token), full-width search
  card. **Mobile:** compact (results above fold).
- **Data gate:** imagery only if genuine licensed/owned asset; context copy
  only if verified.
- **A11y:** one H1, labelled search fields.
- **Failure:** destination unknown → NotFound (existing).

### 29.4 Things Search
- **Purpose:** refine/launch a search.
- **Content:** destination field (prefilled with route identity on
  destination pages), activity/interest field, orange Search button.
- **Visual:** white `rounded-2xl` card, labels above fields, focus rings.
- **Interaction:** Enter submits; city change navigates per registry rules
  (existing).
- **Desktop:** side-by-side fields + button. **Mobile:** stacked fields,
  full-width button, 44px targets.
- **Data gate:** destination autocomplete from existing destination data;
  no invented suggestions.
- **A11y:** labels + `htmlFor`, no placeholder-only labels.
- **Failure:** non-registry city falls back to legacy hub contract
  (existing).

### 29.5 Destination Category Rail ("Explore Rome")
- **Purpose:** fast visual discovery (see Rome spec §15).
- **Content:** tiles — label, icon, short descriptor; e.g. Vatican, Ancient
  Rome, Museums, Tours, Food & drink, Family, Day trips (labels are
  **concepts**, see data gate).
- **Visual:** white cards with icon in `brand-primary-soft` circle; horizontal
  rail on mobile; static grid/row on desktop.
- **Interaction:** tile commits a **keyword search shortcut** (never a claim
  of a curated collection or taxonomy filter).
- **Mobile:** snap-scroll rail. **Desktop:** 6–8 tiles in a row.
- **Data gate:** **visual concept ≠ implementable filter.** A tile is a
  search shortcut only when the keyword path is honest for the active
  providers (§15 Rome spec). No "X experiences" counts unless real taxonomy
  exists. No images unless genuine owned/licensed assets exist.
- **A11y:** rail `role="group"`/list semantics; keyboard scroll.
- **Failure:** if a keyword cannot be honoured by a provider, the tile must
  not present mixed results as filtered (see filter integrity rule).

### 29.6 Section Header
- **Purpose:** label a page region.
- **Content:** eyebrow (optional), H2, optional one-line supporting copy.
- **Visual:** H2 `text-primary`, optional `brand-primary` eyebrow; 8–12px
  rhythm; 16–24px below header to content.
- **Desktop/Mobile:** same scale (mobile 20px).
- **Data gate:** copy only when supported (no filler).
- **A11y:** `aria-labelledby` on the section.
- **Failure:** n/a.

### 29.7 Experience Card
- **Purpose:** decision surface (critical spec in §30).
- **Content:** image, genuine indicators, title, location, rating, price,
  provider attribution, action.
- **Visual:** white card, `rounded-xl`, `border-default`, `shadow-card`,
  16:10 image, footer row.
- **Interaction:** hover elevation (desktop), image zoom (desktop), CTA per
  mapping state.
- **Desktop:** 3–4 col grid. **Mobile:** 1 col (2 col ≥640).
- **Data gate:** per §30 hierarchy; no fabricated fields.
- **A11y:** `role="article"`, heading `h3`, link/button semantics.
- **Failure:** no image → premium fallback (§14.4); mapping unavailable →
  unmapped CTA (§30.5).

### 29.8 Mapped CTA
- **Purpose:** internal navigation to the canonical detail page.
- **Content/label:** "View details".
- **Visual:** secondary CTA (blue or outline); no external icon; no
  sponsored rel.
- **Interaction:** React Router `Link` (same tab).
- **Data gate:** present **only** when the server-validated mapping exists
  for this exact provider identity (existing contract).
- **A11y:** link semantics, accessible label.
- **Failure:** mapping missing/unavailable → card falls back to unmapped
  CTA (existing).

### 29.9 Unmapped CTA
- **Purpose:** genuine provider outbound link.
- **Content/label:** "View experience" + external icon.
- **Visual:** same calm listing-action family as the mapped CTA (blue fill
  or blue/neutral outline per §19); **never orange**; external icon
  distinguishes it.
- **Interaction:** `a target="_blank" rel="sponsored nofollow noopener"`.
- **Data gate:** only when `outboundUrl` validates as http(s).
- **A11y:** link semantics; the external icon is decorative.
- **Failure:** no valid URL → no CTA; provider attribution line remains.

### 29.10 Provider Attribution
- **Purpose:** who supplies this inventory/offer.
- **Content:** "Provided by {Provider}" (cards); "Booking and payment handled
  by {Provider}." (offer CTA area).
- **Visual:** `metadata`/`caption` size, `text-secondary`/`text-muted`
  (non-essential).
- **Data gate:** provider name from the provider field only.
- **Failure:** n/a.

### 29.11 Rating Summary
- **Purpose:** genuine rating evidence.
- **Content:** star icon, rating to 1 decimal, review count.
- **Visual:** `rating` token, amber filled star, `text-secondary` count.
- **Data gate:** only single-offer genuine values (existing
  `getActivityRatingSummary`); on cards only when the provider supplies
  genuine rating+count.
- **Failure:** absent when ambiguous/unknown — never a placeholder.

### 29.12 Price Summary
- **Purpose:** genuine price evidence.
- **Content:** "From {price}" (cards), "From {price}" (detail summary).
- **Visual:** `price` token, `tabular-nums`, `text-primary`.
- **Data gate:** only genuine single-offer price+currency (existing
  `getActivityPriceSummary`); never a fabricated "price on request" substitute
  — when unknown show nothing or neutral "Check availability" copy.
- **Failure:** absent when unknown.

### 29.13 Feature Chip
- **Purpose:** genuine factual indicator.
- **Content:** one fact (Skip the line, Free cancellation, Instant
  confirmation, Mobile ticket, Wheelchair accessible).
- **Visual:** pill on image (white/90, `text-primary`, 10px) **or** inline
  chip with `success` check icon in Good to know. Max 2 on a card image.
- **Data gate:** `true` only; `null`/`false` never render (existing
  every-offer-true on detail; card chips per offer's own `true` features).
- **Failure:** absent when unknown.

### 29.14 Filter Trigger
- **Purpose:** open filter UI.
- **Content:** "Filters" + active-count badge (mobile); per-filter selects
  (desktop).
- **Visual:** outline button, `ListFilter` icon, orange count badge (the one
  sanctioned orange badge).
- **Interaction:** opens sheet (mobile) / popover (desktop).
- **A11y:** `aria-expanded`, `aria-controls`, count in label.
- **Failure:** n/a.

### 29.15 Desktop Filter Panel
- **Purpose:** persistent filter context on desktop.
- **Content:** Activity, Price, Rating, Features (skip line, wheelchair),
  each a labelled control.
- **Visual:** compact toolbar row under the results heading; grouped with
  `gap-3`; sort right-aligned (existing layout refined to tokens).
- **Interaction:** instant apply (URL sync, existing).
- **Data gate:** only filters the active providers can honour honestly (§20.8;
  Rome spec §16).
- **A11y:** labelled controls (`aria-label` per select).
- **Failure:** provider cannot apply a filter → see filter integrity rule.

### 29.16 Mobile Filter Sheet
- **Purpose:** filter UI for touch.
- **Content:** heading, filter groups (Activity, Price range, Rating,
  Features, Accessibility), Clear all + Show results.
- **Visual:** bottom sheet `rounded-t-2xl`, max-h 85vh, scrollable,
  backdrop.
- **Interaction:** draft state, Apply commits, Clear resets (existing);
  Escape closes; focus trap (T3F).
- **A11y:** `role="dialog" aria-modal`, labelled close, focus management.
- **Failure:** n/a.

### 29.17 Sort Control
- **Purpose:** honest result ordering.
- **Content:** "Provider order" (default), "Price: low to high", "Title: A–Z".
- **Visual:** labelled select (desktop right-aligned; mobile compact).
- **Data gate:** labels must describe the actual source of order; "Provider
  order" (never "Recommended"/"Popular"); provider-specific mapping exists
  (existing `VIATOR_SORT`).
- **A11y:** `aria-label="Sort results"`.
- **Failure:** unsupported sort for a provider maps to provider default
  (existing, honest).

### 29.18 Results Toolbar
- **Purpose:** count + filters + sort in one row.
- **Content:** result count (genuine), filter controls, sort, active-filter
  chips.
- **Visual:** count in `small` `text-secondary`; chips removable; clear-all
  text link.
- **Mobile:** sticky compact row ("Filters" + badge, "Sort") that must not
  dominate the viewport (≤56px).
- **Data gate:** count only when genuine (`totalCount` semantics existing); a
  combined total requires compatible genuine totals across **all** active
  providers, else "Showing N experiences" (visible count) or omit (§20.9).
- **Failure:** provider partial failure notice above (§17.4).

### 29.19 Pagination
- **Purpose:** page through results.
- **Content:** prev/next arrows + numbered window (max ~7 numbers with
  ellipsis).
- **Visual:** square buttons, `rounded-lg`, active = `brand-primary` fill.
- **Interaction:** URL `page` sync + scroll to results top (existing).
- **A11y:** `aria-label` on arrows, `aria-current="page"`.
- **Failure:** single page → hidden (existing).

### 29.20 Editorial Info Block
- **Purpose:** Rome planning/decision context (gated).
- **Content:** heading + iconed fact rows + optional source line.
- **Visual:** `surface-card` panel, `border-default`, `rounded-xl`, 2-col
  grid desktop / 1-col mobile.
- **Data gate:** SOURCE VERIFIED / PROVIDER VERIFIED / BF EDITORIAL VERIFIED
  only (§33; Rome spec §17). Unknown → do not show.
- **Failure:** nothing to show → section omitted entirely.

### 29.21 Good To Know Block
- **Purpose:** signature factual module (see Rome spec §23).
- **Content:** activity-level facts (every-offer-true) with `success` check
  icons; optional duration/meeting-point/language when genuinely supported.
- **Visual:** 2-col grid of chips/rows on desktop, 1-col mobile.
- **Data gate:** every-offer-true on detail; `null ≠ false`; never render
  negative statements from nulls; no duration/meeting-point/language until a
  source populates them.
- **Failure:** no facts → section omitted (never a "no facts available"
  negative).

### 29.22 Provider Booking Card (offer card)
- **Purpose:** one provider's genuine booking offer.
- **Content:** provider name, price (genuine), CTA, provider-handles-booking
  line.
- **Visual:** `surface-card` inner panel, `rounded-lg`, `border-default`.
- **Interaction:** CTA only when `providerUrl` validates (existing
  `isValidProviderUrl`); otherwise honest copy "Check availability with the
  provider" (no fake button).
- **A11y:** link semantics for CTA; labelled provider.
- **Failure:** no URL → honest copy (existing).

### 29.23 Desktop Sticky Booking Panel
- **Purpose:** persistent booking context on detail (see Rome spec §21).
- **Content:** title ("Book this experience" / "Booking options"), offer
  cards, disclosure.
- **Visual:** `surface-card`, `rounded-xl`, `border-default`, `shadow-card`,
  `sticky top-[header height + 16px]`.
- **Interaction:** CTAs per offer; panel stays visible while main column
  scrolls.
- **Data gate:** only genuine fields; no price when unknown.
- **A11y:** `aside aria-label="Booking options"`.
- **Failure:** zero offers → honest "No booking options are available yet."

### 29.24 Mobile Sticky Action Bar
- **Purpose:** persistent booking action on detail (see Rome spec §22).
- **Content:** price (genuine) + "Check availability" OR "See booking options"
  (multi-offer) OR "Check availability" (no price).
- **Visual:** fixed bottom bar, `surface-card`, top border, elevation on
  scroll, safe-area bottom padding, ≥56px content height.
- **Interaction:** one CTA per state; never invents a price; multi-offer →
  scroll to booking options (not a fake "best").
- **A11y:** 44px target; hidden when keyboard covers it (no inputs on detail,
  but contract applies).
- **Failure:** no valid provider URL → bar may hide or show honest
  "Check availability with the provider" — never a dead orange button.

### 29.25 Activity Gallery
- **Purpose:** visual evidence (see Rome spec §20).
- **Content:** 1 image / N images / no image.
- **Visual:** 16:9 hero region; N-image: primary + 1:1 thumbnail strip
  (desktop) or swipeable (mobile) — only when ≥2 genuine images exist.
- **Interaction:** thumbnail select; no auto-play.
- **Data gate:** only genuine offer images; never slot-manufactured; no
  unrelated stock.
- **A11y:** alt from `imageAlt`/title; thumbnails labelled.
- **Failure:** 0 images → premium no-image panel (§14.4).

### 29.26 Activity Anchor Navigation / Tabs
- **Purpose:** jump to detail sections.
- **Content:** Good to know · About · What's included · Practical info ·
  Booking options (only sections that genuinely render).
- **Visual:** horizontal text tabs/anchors under the header region
  (desktop); optional sticky sub-nav on mobile.
- **Interaction:** smooth scroll to section; active anchor `brand-primary`.
- **Data gate:** anchors render only for sections with content.
- **A11y:** nav landmark, `aria-current` on active anchor.
- **Failure:** single-section page → hide the anchor nav entirely.

### 29.27 Loading Skeleton
- **Purpose:** honest loading (see §17.2).
- **Content:** blocks mirroring final layout.
- **Visual:** `skeleton-base`/`surface-subtle` + `animate-pulse`.
- **Data gate:** n/a. **A11y:** `aria-busy` region label.
- **Failure:** n/a.

### 29.28 Empty Results State
- **Purpose:** genuine zero-result (see §17.3).
- **Content:** heading, guidance, optional clear-filters.
- **Visual:** dashed `surface-subtle` panel, one icon.
- **Data gate:** only when a provider answered healthily.
- **A11y:** `role="status"`.
- **Failure:** never confused with unavailable state.

### 29.29 Provider Partial-Failure State
- **Purpose:** honest coverage note.
- **Content:** "Some experiences may be temporarily missing."
- **Visual:** slim inline notice above results, `warning`/`info` tint,
  `small`.
- **Data gate:** only when a provider status is `unavailable` (not
  `disabled`, not absent).
- **A11y:** polite region.
- **Failure:** n/a.

### 29.30 Inventory Unavailable State
- **Purpose:** nothing answered (see §17.4).
- **Content:** "Experiences are temporarily unavailable", "this is on our
  side", Try again.
- **Visual:** dashed panel, `info` icon, orange retry (principal action).
- **Data gate:** `anyProviderAnswered === false`.
- **A11y:** `role="status"`.
- **Failure:** n/a.

### 29.31 Mapping-Failure Behaviour
- **Purpose:** mapping is enhancement-only.
- **Content:** nothing visible changes.
- **Interaction:** provider cards keep "View experience" outbound CTAs; no
  error surface.
- **Data gate:** `status: "unavailable"` or validation rejection (existing).
- **Failure:** invisible by design (§17.4, §30.5).

### 29.32 No-Image State
- **Purpose:** premium fallback (see §14.4).
- **Content:** icon + optional short label.
- **Visual:** `brand-primary-soft`/`surface-subtle` panel, token colours,
  same aspect as the slot.
- **Data gate:** no genuine image.
- **A11y:** decorative panel; title conveyed by adjacent text.
- **Failure:** n/a (it IS the failure state, designed).

---

## 30. Experience Card — critical contract

The card is a **travel decision surface**, not an image + title + button
rectangle.

### 30.1 Hierarchy (top → bottom)

1. **Image** — 16:10, genuine only, premium fallback otherwise.
2. **Useful factual indicator(s)** — only genuine: max 2 pills on the image
   (Skip the line, Free cancellation, Instant confirmation). No fake badges.
3. **Title** — `h3`, semibold, 2-line clamp.
4. **Location/context** — `MapPin` + "City, Country" when genuine (`small`,
   `text-secondary`).
5. **Rating/review** — only genuine: star + value + count.
6. **Price** — only genuine: "From {price}" (`price` token). When unknown,
   **omit** the price slot (or neutral "Check availability" only in the CTA
   zone) — never a crossed-out or invented price.
7. **Provider attribution** — "Provided by {Provider}" (`metadata`).
8. **Action** — one CTA: mapped → "View details"; unmapped → "View
   experience".

### 30.2 Shared family

- Mapped and unmapped cards share: card chrome, image treatment, typography,
  spacing, footer row, provider attribution. The only differences are the CTA
  label/behaviour and the external icon.
- **Unmapped inventory is never visually punished.** No "out of stock" tint,
  no dashed borders, no muted treatment.

### 30.3 Mapped card CTA

- Label: **"View details"**.
- Semantics: **internal BookingsFinder navigation** — React Router `Link`,
  same tab, no `target="_blank"`, no `rel="sponsored"`, no external icon, no
  affiliate semantics.
- Data gate: present **only** when the validated mapping API returned a
  canonical path for this exact `provider:providerProductId`.
- Visual: secondary CTA per §19 — blue fill or blue/neutral outline from the
  calm listing-action family; **never orange** (listing cards do not use
  orange CTAs). The internal action is research, the external action is
  booking; orange stays reserved for the detail-page "Check availability"
  conversion action.

### 30.4 Unmapped card CTA

- Label: **"View experience"**.
- Semantics: genuine provider outbound link —
  `target="_blank" rel="sponsored nofollow noopener"`, external icon.
- Data gate: only when `outboundUrl` validates as http(s); preserve the URL
  exactly (including genuine affiliate parameters).
- Visual: same calm listing-action family as the mapped CTA (blue fill or
  blue/neutral outline per §19); **never orange**; the external icon
  communicates outbound.

### 30.5 Mapping-failure behaviour (card level)

- Mapping API unavailable, rejected, or empty → the card renders as unmapped
  (existing "View experience" flow). **Invisible failure by design.** No
  error UI, no degraded styling, no loss of provider inventory.
- A mapping for a different provider identity or a malformed path is ignored
  (existing validation) — never a repaired/guessed URL.

### 30.6 Forbidden on cards

fake discount badge · "best seller" · "likely to sell out" · "top pick" ·
"recommended" · "popular" · scarcity · countdown · crossed-out fake price ·
unrelated stock imagery · invented ratings · invented prices.

---

## 31. Klook benchmark

### 31.1 What we take (interaction/visual inspiration)

- cohesive destination discovery rhythm (hero → categories → results)
- visual categories (tiles/rail)
- large destination imagery
- clean horizontal content rails
- attractive, consistent experience cards
- strong detail title / location hierarchy
- large gallery
- clear price/action hierarchy
- sticky detail navigation
- progressive disclosure
- mobile filter/sort ergonomics
- clean category exploration

### 31.2 What we refuse

- heavy promo density
- badge overload
- coupons everywhere
- fake scarcity
- unexplained recommendation labels
- visually noisy discounts
- giant promotional banners between every section
- excessive orange
- "sale marketplace" feeling
- too many competing CTAs

BookingsFinder feels **calmer and more premium**.

---

## 32. Design differentiator

**Why would someone prefer the BookingsFinder Things experience?**

> BookingsFinder is the calm place to **understand** an experience before you
> book it. We show exactly what we know, name exactly who provides it, and
> keep research and checkout clearly separated — so a traveller can compare
> honestly, choose confidently, and leave to book only when ready.

Concrete differentiators:

1. **Transparent provider handling** — every card and offer names its
   provider; no hidden rebranding, no fake "marketplace" aggregation.
2. **Clean decision context** — destination hero, category shortcuts and
   planning context that help a traveller choose, without promotional noise.
3. **Honest missing-data states** — unknown stays unknown; no invented
   prices, ratings, popularity or urgency.
4. **Clear research ↔ checkout separation** — "View details" is internal
   research; "Check availability" is external booking; both are obvious.
5. **Useful planning context** — evidence-gated "Good to know" and Rome
   planning modules a traveller can actually act on.
6. **Less promotional noise** — one action per viewport, scarce orange,
   calm surfaces.
7. **Consistent destination → activity flow** — breadcrumbs, canonical
   identity, and a stable journey from city to experience to provider.

---

## 33. Content claim matrix

| Claim/field | SAFE TO SHOW WHEN PRESENT | REQUIRES PROVIDER EVIDENCE | REQUIRES EDITORIAL/OFFICIAL SOURCE | FORBIDDEN WITHOUT EVIDENCE |
|---|---|---|---|---|
| Activity title (canonical) | ✅ (BF-owned identity) | — | — | — |
| Location / city / country | ✅ (registry or provider field) | — | — | — |
| Provider name | ✅ (provider field) | — | — | — |
| Price ("From X") | ✅ single-offer genuine value | — | — | ❌ any other case |
| Currency | ✅ with price | — | — | ❌ |
| Rating value | ✅ single-offer genuine | — | — | ❌ |
| Review count | ✅ single-offer genuine | — | — | ❌ |
| Duration | — | ✅ (provider field, when populated) | — | ❌ until source exists |
| Cancellation ("Free cancellation") | — | ✅ provider `true`; activity-level only every-offer-true | — | ❌ null/false as negative |
| Skip the line | — | ✅ provider `true` | — | ❌ |
| Instant confirmation | — | ✅ provider `true` | — | ❌ |
| Mobile ticket | — | ✅ provider `true` | — | ❌ |
| Wheelchair access | — | ✅ provider `true` | — | ❌ |
| Meeting point | — | ✅ provider field, when populated | — | ❌ until source exists |
| Language | — | ✅ provider field, when populated | — | ❌ |
| Age/access requirements | — | ✅ provider field, when populated | — | ❌ |
| Image | ✅ provider genuine image (alt+credit kept) | — | — | ❌ unrelated stock |
| "Popular" / "Top pick" / "Best seller" | — | — | — | ❌ always |
| "Recommended" | — | — | — | ❌ always |
| "Likely to sell out" / "Usually sells out" | — | — | — | ❌ always (model field exists but no evidence policy) |
| "Save 30%" / crossed-out price | — | — | — | ❌ always |
| Countdown / scarcity | — | — | — | ❌ always |
| "Book X days ahead" | — | — | ✅ only with dated official/operator source | ❌ |
| Queue time | — | — | ✅ only with dated official/operator source | ❌ |
| Opening hours / ticket requirements | — | — | ✅ only with dated official/operator source | ❌ |
| Transport claims ("Metro A to...") | — | — | ✅ only with dated official/operator source | ❌ |
| Seasonal claims ("busiest in August") | — | — | ✅ only with dated official/operator source | ❌ |
| "Best if you want…" / "Consider another option if…" | — | — | ✅ only after documented editorial evidence gate (Rome spec §24) | ❌ from title inference or AI opinion |
| Booking handled by provider | ✅ (true by architecture) | — | — | — |
| Commission disclosure | ✅ (true by architecture) | — | — | — |

---

## 34. Cross-references

- **Rome destination UX** (IA, hero, categories, results, planning context,
  activity detail, wireframes, readiness, phases):
  `docs/THINGS_V2_ROME_UX_SPEC.md`.
- The Rome spec consumes this system; where it adds component-level detail it
  extends, never contradicts.
