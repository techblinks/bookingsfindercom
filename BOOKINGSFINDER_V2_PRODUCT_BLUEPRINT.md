# BookingsFinder V2 — Product & Architecture Blueprint

**Date**: 2026-07-19  
**Version**: V2 Strategic Blueprint  
**Status**: Planning — Not Yet Implemented  
**Strategic Direction**: Travel Intelligence Platform (not generic flight comparison)

---

## SECTION 1 — Executive Vision

### What BookingsFinder V2 Is

BookingsFinder V2 is a **travel problem-solving platform** that helps travellers make confident decisions before, during, and after every trip. It combines destination discovery, trip planning, cost intelligence, travel readiness, document management, and booking comparison into a single customer-owned workspace. Flight and hotel booking is one feature inside the platform, not the platform itself.

### What BookingsFinder V2 Is Not

- Not another flight meta-search engine (Skyscanner, Kayak, Momondo)
- Not an OTA (Booking.com, Expedia)
- Not an AI trip-planning chatbot (Layla, Mindtrip)
- Not a travel blog with affiliate links
- Not a booking white-label frontend
- Not a travel agency

### Target Market

**Primary**: Value-conscious independent travellers (25-55) who research, compare, and book their own travel. They are comfortable with digital tools but overwhelmed by the fragmentation of modern travel planning.

**Secondary**: Australian and APAC travellers (initial geo-focus based on current AU country config in `useGeoLocation.ts`), expanding to UK, Europe, North America.

**Tertiary**: Families, digital nomads, and frequent short-haul travellers who manage multiple trips per year.

### Core Customer Promise

> "One place to plan, prepare, and manage every trip. We help you know exactly what you need, what it costs, and when to act — then get out of your way for booking."

### Primary Competitive Advantage

**Trip readiness as a product**. No competitor currently combines trip planning, cost intelligence, documentation checking, deadline management, and booking into a single customer-owned timeline. Skyscanner owns search. Booking.com owns booking. Nobody owns "am I ready to travel?"

### Why Travellers Would Return

1. **Saved trips with timeline** — a living workspace, not a one-time search
2. **Deadline-driven reminders** — passport expiry, visa deadlines, check-in windows, price-drop alerts
3. **True trip cost** — transparent comparison across dates, routes, and extras
4. **Disruption assistance** — when things go wrong, BookingsFinder is the first place to check
5. **Future trip recommendations** — based on travel history and preferences

### How It Differs

| Competitor | What They Do | BookingsFinder V2 Difference |
|---|---|---|
| Skyscanner | Flight meta-search | Trip workspace + readiness + search as one feature |
| Booking.com | OTA (own inventory) | Customer-owned planning, not inventory-push |
| Expedia | OTA + packages | Independent comparison, not upsell-driven |
| Google Flights | Flight search | Trip management, readiness, documentation |
| Layla / Mindtrip | AI trip planner | Structured planning + actionable readiness, not chat |
| TripIt | Itinerary management | Cost intelligence + readiness, not just calendar view |
| Hopper | Price prediction | Broader trip readiness, not just price watching |

### Proposed One-Sentence Positioning

> "Plan smarter, travel ready — BookingsFinder helps you know what you need before you go."

### Proposed Homepage Headline

> "Your trips, planned and ready."

### Proposed Supporting Statement

> "From finding the right destination to knowing exactly what documents you need, what it really costs, and when to book — BookingsFinder keeps every trip organised in one place."

### Recommended Brand Personality

- **Knowledgeable friend**, not travel agent
- **Calm and organised**, not urgent or pushy
- **Transparent and honest**, not slick and hidden-fee
- **Helpful and practical**, not aspirational or luxury
- **Globally aware**, not Western-centric

### Recommended Tone of Voice

- Direct, clear, second person ("you")
- Never use fake urgency, fake scarcity, or manipulative language
- Use plain English, not travel-industry jargon
- Be honest about uncertainty ("Prices change often — we'll let you know when they drop")
- Affiliate relationships disclosed clearly, not buried

---

## SECTION 2 — Customer Problems

### Problem Catalogue

#### Choosing a Destination

| Element | Detail |
|---|---|
| Customer statement | "I want to go somewhere but I don't know where." |
| Emotional pain | Overwhelm. Too many options. Fear of choosing wrong. |
| Practical consequence | Endless browsing, decision paralysis, booking nothing. |
| Proposed solution | Destination Finder — filters by budget, season, vibe, visa requirements, flight duration from user's nearest airport. |
| Monetisation | Affiliate bookings from destination pages. |
| Implementation difficulty | Medium (needs destination data, seasonality data, flight price data). |
| Trust risk | Low. |

#### Deciding When to Travel

| Element | Detail |
|---|---|
| Customer statement | "I know where I want to go but I don't know which month or which exact dates." |
| Emotional pain | Anxiety about getting a bad deal. Fear of bad weather or crowds. |
| Practical consequence | Booking suboptimal dates, overpaying, or missing the trip entirely. |
| Proposed solution | Best Time to Visit tool — combines price calendar, weather data, crowd data, and local events. |
| Monetisation | Affiliate bookings from calendar click-through. |
| Implementation difficulty | Medium (needs price data from Travelpayouts month-matrix, weather API, events data). |
| Trust risk | Low. |

#### Deciding When to Book

| Element | Detail |
|---|---|
| Customer statement | "Should I book now or wait?" |
| Emotional pain | Fear of missing out. Anxiety about prices rising. Regret. |
| Practical consequence | Overpaying by booking too late, or watching prices rise after waiting too long. |
| Proposed solution | Price Alerts with trend data from Travelpayouts month-matrix. "Buy now" vs "wait" guidance based on route-specific historical patterns. |
| Monetisation | Affiliate bookings. Premium alerts (more routes, faster notifications). |
| Implementation difficulty | Low-Medium (Travelpayouts API provides price history). |
| Trust risk | **Medium** — price predictions must be clearly labelled as estimates, never as guarantees. |

#### Understanding the Real Cost

| Element | Detail |
|---|---|
| Customer statement | "The flight says $500 but I know it'll cost way more than that." |
| Emotional pain | Frustration with hidden costs. Feeling deceived by advertised prices. Budget anxiety. |
| Practical consequence | Going over budget. Not budgeting for baggage, transfers, insurance. |
| Proposed solution | True Trip Cost Calculator — flight + baggage + transfers + insurance + visas + estimated daily spend. |
| Monetisation | Affiliate for each component (baggage add-ons, insurance, transfers). |
| Implementation difficulty | Medium (needs baggage cost data from airline APIs or estimates). |
| Trust risk | **Medium** — estimates must be clearly labelled. Not "this is your final cost." |

#### Visa and Entry Requirements

| Element | Detail |
|---|---|
| Customer statement | "Do I need a visa? How do I get one? What documents do I need?" |
| Emotional pain | Deep anxiety. Fear of being denied boarding or entry. Confusion. |
| Practical consequence | Denied boarding. Wasted tickets. Ruined trips. Emergency visa applications. |
| Proposed solution | Visa and Entry Checker — nationality + destination + passport validity → requirements. |
| Monetisation | Affiliate for visa services, expedited processing. Premium document reminders. |
| Implementation difficulty | **High** — visa requirements change frequently. Must use trusted API or curated data with strong disclaimers. |
| Trust risk | **CRITICAL** — incorrect visa information can ruin a trip. Must have ironclad disclaimers, never present as authoritative. Always direct to official sources. |

#### Passport Validity

| Element | Detail |
|---|---|
| Customer statement | "Is my passport valid long enough? I heard some countries require 6 months." |
| Emotional pain | Last-minute panic. Fear of being turned away at the airport. |
| Practical consequence | Emergency passport renewal. Ruined trips. |
| Proposed solution | Passport Validity Checker — expiry date + destination → requirement check + deadline reminder. |
| Monetisation | None directly (trust feature). Drives retention and account creation. |
| Implementation difficulty | Low (rules-based, requires user to enter expiry date). |
| Trust risk | **High** — must include clear disclaimer to verify with official sources. |

#### Travel Documentation

| Element | Detail |
|---|---|
| Customer statement | "I have a million confirmations, PDFs, and emails. I can never find what I need." |
| Emotional pain | Stress. Disorganisation. Fear of missing something critical. |
| Practical consequence | Missing check-in deadlines. Unable to show booking at airport. Oversharing documents via email. |
| Proposed solution | Travel Document Vault — store booking PDFs, confirmation numbers, e-ticket numbers, visa copies, insurance docs in one encrypted location. |
| Monetisation | Premium subscription (storage, sharing, family vault). |
| Implementation difficulty | Medium (Supabase storage, encryption, PDF parsing). |
| Trust risk | **High** — storing personal documents. Must be encrypted. Australian Privacy Principles apply. GDPR. |

#### Baggage Confusion

| Element | Detail |
|---|---|
| Customer statement | "Does my fare include a checked bag? Is cabin bag free? How much will they charge me?" |
| Emotional pain | Annoyance. Feeling nickel-and-dimed. Airport surprise. |
| Practical consequence | Paying €60+ at the gate. Repacking at check-in. Buying bags you don't need. |
| Proposed solution | Baggage Cost Estimator — airline + fare class → baggage allowance and cost. |
| Monetisation | Affiliate for baggage-friendly fares. |
| Implementation difficulty | Medium-Hard (baggage rules vary by airline, route, fare class, frequent flyer status). |
| Trust risk | **High** — must be clearly labelled as estimate. Airlines change policies. |

#### Airport Transfers

| Element | Detail |
|---|---|
| Customer statement | "How do I get from the airport to my hotel? Is it safe? How much should it cost?" |
| Emotional pain | Post-flight exhaustion. Vulnerability in unfamiliar city. Fear of being ripped off. |
| Practical consequence | Overpaying for taxis. Taking unsafe transport. Wasting time. |
| Proposed solution | Airport Transfer Finder — shows options, estimated costs, booking links. |
| Monetisation | Affiliate for transfer bookings (GetYourGuide, Viator, local providers). |
| Implementation difficulty | Low-Medium (partner APIs exist). |
| Trust risk | Low. |

#### Connection Risk

| Element | Detail |
|---|---|
| Customer statement | "I have a 45-minute connection in Dubai. Is that enough time?" |
| Emotional pain | Pre-trip anxiety. Fear of missing connection. Uncertainty. |
| Practical consequence | Missed connections. Stranded at intermediate airport. Ruined trip timing. |
| Proposed solution | Connection Risk Checker — minimum connection time + terminal change + immigration requirements + historical on-time performance. |
| Monetisation | Affiliate bookings (suggesting longer connections or direct flights). |
| Implementation difficulty | Medium (needs airport MCT data, terminal maps). |
| Trust risk | **Medium** — must be guidance only, not a guarantee. |

#### Travelling with Children

| Element | Detail |
|---|---|
| Customer statement | "I don't know what documents my kids need, what seats work, or how to handle baggage." |
| Emotional pain | Parental anxiety. Fear of getting something wrong that affects the children. |
| Practical consequence | Additional airport stress. Forgetting critical documents. Booking unsuitable flights. |
| Proposed solution | Family Travel Planner — child document requirements, family seating advice, baggage for children, airport family facilities. |
| Monetisation | Affiliate bookings. Premium family trip planning. |
| Implementation difficulty | Medium (rules-based + destination data). |
| Trust risk | **Medium** — document requirements vary and change. |

#### Travel Insurance

| Element | Detail |
|---|---|
| Customer statement | "Do I actually need insurance? Which one? What does it cover?" |
| Emotional pain | Confusion. Skepticism about insurance value. Fear of being under-covered. |
| Practical consequence | Travelling uninsured or under-insured. Wasting money on unnecessary coverage. |
| Proposed solution | Travel Insurance comparison — destination-aware, activity-aware, pre-existing condition guidance. |
| Monetisation | Affiliate commission (insurance comparison partners). |
| Implementation difficulty | Low (insurance comparison APIs exist). |
| Trust risk | **Medium** — must not present as financial advice. |

#### eSIM and Connectivity

| Element | Detail |
|---|---|
| Customer statement | "How do I get data on my phone without paying $10/day roaming?" |
| Emotional pain | Frustration with carrier pricing. Fear of being disconnected. |
| Practical consequence | Overpaying for roaming. Buying wrong eSIM. No connectivity on arrival. |
| Proposed solution | eSIM Finder — destination → compatible eSIM plans with pricing. |
| Monetisation | Affiliate (Airalo, Holafly, Nomad partners). |
| Implementation difficulty | Low (eSIM comparison APIs available). |
| Trust risk | Low. |

#### Currency and Payments

| Element | Detail |
|---|---|
| Customer statement | "Should I exchange cash? Use my card? What's the best way to pay?" |
| Emotional pain | Fear of being ripped off. Confusion about exchange rates. |
| Practical consequence | Poor exchange rates. Excessive fees. Carrying too much cash. |
| Proposed solution | Currency guide per destination — card acceptance, ATM advice, cash recommendations. |
| Monetisation | Affiliate (Wise, Revolut). |
| Implementation difficulty | Low (curated content + affiliate links). |
| Trust risk | Low (with financial disclaimer). |

#### Packing

| Element | Detail |
|---|---|
| Customer statement | "I always forget something. Or I pack way too much." |
| Emotional pain | Pre-trip stress. Overpacking anxiety. |
| Practical consequence | Paying excess baggage. Buying things you forgot. Lugging heavy bags. |
| Proposed solution | Smart Packing List — destination-aware, season-aware, trip-length-aware. |
| Monetisation | Affiliate (packing products, luggage). |
| Implementation difficulty | Low (rules engine + curated lists). |
| Trust risk | Low. |

#### Disruption, Cancellations, Delays

| Element | Detail |
|---|---|
| Customer statement | "My flight is cancelled. What do I do? Am I entitled to compensation?" |
| Emotional pain | Panic. Helplessness. Anger. |
| Practical consequence | Stranded. Not claiming entitled compensation. Paying for emergency accommodation unnecessarily. |
| Proposed solution | Disruption Assistant — flight status monitoring, compensation eligibility checker, rebooking guidance, airline contact information. |
| Monetisation | Affiliate (hotel bookings for stranded travellers, alternative flights). |
| Implementation difficulty | Medium (flight status API, compensation rules engine). |
| Trust risk | **Low** — clearly labelled as guidance. |

#### Safety and Emergencies

| Element | Detail |
|---|---|
| Customer statement | "Is it safe to travel there right now?" |
| Emotional pain | Deep fear. Concern from family members. |
| Practical consequence | Cancelling trips unnecessarily. Travelling to unsafe areas unknowingly. |
| Proposed solution | Destination Safety Guide — government travel advisories, neighbourhood guidance, emergency numbers. |
| Monetisation | None (trust feature). |
| Implementation difficulty | Low (government advisory APIs exist). |
| Trust risk | **CRITICAL** — safety information must cite official government sources. Never make own safety assessments. |

#### Managing Multiple Bookings

| Element | Detail |
|---|---|
| Customer statement | "I have 4 flights, 3 hotels, 2 activities, and I can't keep track." |
| Emotional pain | Chaos. Disorganisation. Fear of double-booking or missing something. |
| Practical consequence | Missed check-ins. Overlapping bookings. Wasted time re-checking. |
| Proposed solution | Trip Workspace — all bookings in one timeline, regardless of where they were booked. |
| Monetisation | Premium subscription (unlimited trips, sharing, family accounts). |
| Implementation difficulty | Medium (booking import, manual entry, timeline UI). |
| Trust risk | Low. |

#### Remembering Deadlines

| Element | Detail |
|---|---|
| Customer statement | "I forgot to check in online. I forgot my visa expires. I forgot to renew my passport." |
| Emotional pain | Regret. Self-blame. Stress. |
| Practical consequence | Paying airport check-in fees. Losing bookings. Denied boarding. |
| Proposed solution | Deadline Reminders — check-in windows, visa expiry, passport expiry, booking free-cancellation deadlines. |
| Monetisation | Retention driver. Premium for SMS/push reminders. |
| Implementation difficulty | Low (rules engine + notification system). |
| Trust risk | **Low** — but must not miss critical deadlines. |

### Problem Priority Matrix

| Priority | Problem | Impact | Monetisation | Complexity | Trust Risk |
|---|---|---|---|---|---|
| **P1** | Understanding real trip cost | Highest | High | Medium | Medium |
| **P1** | Managing multiple bookings (Trip Workspace) | Highest | Medium | Medium | Low |
| **P2** | Deciding when to book | High | High | Low | Medium |
| **P2** | Visa and entry requirements | High | Medium | High | Critical |
| **P3** | Passport validity | High | Low | Low | High |
| **P3** | Disruption (delays, cancellations) | High | Medium | Medium | Low |
| **P3** | Packing | Medium | Low | Low | Low |
| **P4** | Baggage confusion | Medium | Medium | High | High |
| **P4** | Airport transfers | Medium | Medium | Low | Low |
| **P4** | Travel insurance | Medium | Medium | Low | Medium |
| **P4** | eSIM | Medium | Low | Low | Low |
| **P5** | Choosing a destination | Medium | Medium | Medium | Low |
| **P5** | Connection risk | Medium | Low | Medium | Medium |
| **P5** | Safety and emergencies | Low | None | Low | Critical |
| **P5** | Travel documentation storage | Medium | Medium | Medium | High |

---

## SECTION 3 — Product Pillars

### Pillar 1: Discover

| Element | Detail |
|---|---|
| Purpose | Help travellers find their next destination with confidence. |
| User outcome | "I know where I want to go and why." |
| Key features | Destination Finder, Best Time to Visit, Destination Guides, Deals from your airport, Travel inspiration content |
| Data requirements | Destination database, seasonality data, flight price data (month-matrix), weather data, events data, government advisories |
| AI requirements | Light — recommendation engine, not generative. Deterministic filtering + price data. |
| Monetisation | Affiliate bookings from destination pages. Sponsored destination placement (transparently labelled). |
| MVP status | **Must Have** (minimum: destination pages with real prices) |
| Future potential | Personalised recommendations from travel history. Social proof ("X travellers from Sydney went to Bali this month"). |

### Pillar 2: Plan

| Element | Detail |
|---|---|
| Purpose | Give travellers a single workspace for their trip. |
| User outcome | "Everything for my trip is in one place." |
| Key features | Trip Workspace, Trip Timeline, Booking Import (email parsing), Manual trip creation, Shared trips, Saved destinations |
| Data requirements | User accounts, trip records, booking records, document storage |
| AI requirements | Email parsing (extract booking details from confirmation emails). |
| Monetisation | Premium subscription for advanced features. |
| MVP status | **Must Have** — this is the retention core. |
| Future potential | Group trip planning, voting on destinations/activities, collaborative itineraries. |

### Pillar 3: Compare

| Element | Detail |
|---|---|
| Purpose | Help travellers make informed booking decisions. |
| User outcome | "I know which option is best for me, at the right price." |
| Key features | Flight search (White Label), Hotel search, True Trip Cost comparison, Price Alerts, Deal Alerts |
| Data requirements | Travelpayouts API, hotel API, baggage data, transfer cost data |
| AI requirements | None — this is data presentation, not intelligence. |
| Monetisation | **Primary revenue pillar** — affiliate commissions on all bookings. |
| MVP status | **Must Have** — this is the monetisation core. |
| Future potential | Multi-city optimisation, stopover recommendations, airline alliance optimisation. |

### Pillar 4: Prepare

| Element | Detail |
|---|---|
| Purpose | Ensure travellers are ready before they leave. |
| User outcome | "I know exactly what I need and I've done it all." |
| Key features | Travel Readiness Score, Visa Checker, Passport Validity Checker, Smart Packing List, Document Vault, Action Centre with deadlines, Baggage Cost Estimator |
| Data requirements | Visa rules database, destination entry requirements, user passport data, booking data |
| AI requirements | Light — structured rules engine, not generative. |
| Monetisation | Affiliate (visa services, insurance, eSIM, luggage). Premium document storage and sharing. |
| MVP status | **Must Have** (minimum: Readiness Score + Action Centre) |
| Future potential | Automated document collection. Pre-filled visa application forms. Photo requirements checker. |

### Pillar 5: Protect

| Element | Detail |
|---|---|
| Purpose | Support travellers when things go wrong. |
| User outcome | "If something happens, I know what to do and I have help." |
| Key features | Disruption Assistant, Flight Status monitoring, Compensation Checker, Emergency Information per destination, Insurance Comparison |
| Data requirements | Flight status API, compensation rules database, destination emergency contacts, government advisories |
| AI requirements | None — rules engine + external APIs. |
| Monetisation | Affiliate (hotels for stranded travellers, alternative flights, insurance). |
| MVP status | **Should Have** (flight status + disruption basics in MVP) |
| Future potential | Automatic rebooking suggestions, lounge access booking, real-time disruption alerts. |

### Pillar 6: Travel

| Element | Detail |
|---|---|
| Purpose | Be useful during the trip itself. |
| User outcome | "I have what I need, right now, on the ground." |
| Key features | Offline document access, Currency converter, eSIM activation guide, Airport transfer info, Local emergency info |
| Data requirements | Destination data, user documents (offline-cached), live flight data |
| AI requirements | None. |
| Monetisation | Affiliate (last-minute activities, transfers, eSIM). |
| MVP status | **Later** — post-MVP. |
| Future potential | Real-time translation help, local recommendation engine, check-in reminders. |

### Pillar 7: Manage

| Element | Detail |
|---|---|
| Purpose | Keep users engaged between and across trips. |
| User outcome | "BookingsFinder has my back for every trip." |
| Key features | Upcoming trip dashboard, Travel history, Future trip recommendations, Loyalty programme tracking, Saved searches and alerts |
| Data requirements | User trip history, preferences, saved data |
| AI requirements | Light — recommendation engine based on history. |
| Monetisation | Retention driver → repeat affiliate bookings. Premium subscription. |
| MVP status | **Should Have** (basic dashboard + history) |
| Future potential | Carbon tracking, travel year-in-review, community features. |

---

## SECTION 4 — Complete Feature Map

### Feature Classification Legend

- **Must Have**: In MVP
- **Should Have**: In first 6 months post-MVP
- **Later**: Roadmap beyond 6 months
- **Reject**: Not aligned with strategy

### Feature Catalogue

| # | Feature | Classification | Problem Solved | Revenue | Retention | Data Dep. | API Dep. | Legal Risk | Complexity |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Trip Workspace (saved trips + timeline) | **Must Have** | Managing multiple bookings | Premium sub | **Highest** | User accounts, bookings | None | Low | Medium |
| 2 | Travel Readiness Score | **Must Have** | Deadline anxiety | Premium sub | High | User data, bookings, rules engine | None | Medium | Low |
| 3 | True Trip Cost Calculator | **Must Have** | Understanding real cost | Affiliate | High | Price data, baggage data, transfer data | Travelpayouts, transfer APIs | Medium | Medium |
| 4 | Action Centre (deadline reminders) | **Must Have** | Remembering deadlines | Retention | High | User data, notifications | None | Low | Low |
| 5 | Flight Search (White Label) | **Must Have** | Booking flights | Affiliate (core) | Medium | Travelpayouts | Travelpayouts | Low | Low |
| 6 | Destination Pages with Prices | **Must Have** | Choosing destination | Affiliate | Medium | Destination data, price data | Travelpayouts | Low | Low |
| 7 | Price Alerts | **Should Have** | When to book | Affiliate | High | Price history | Travelpayouts | Medium | Low |
| 8 | Visa and Entry Checker | **Should Have** | Visa anxiety | Affiliate | High | Visa rules database | Visa API or curated | **Critical** | High |
| 9 | Passport Validity Checker | **Should Have** | Passport anxiety | None (trust) | High | User passport data | None | High | Low |
| 10 | Booking Import (email parsing) | **Should Have** | Manual entry pain | Retention | High | Email forwarding | AI/LLM for parsing | Medium | Medium |
| 11 | Smart Packing List | **Should Have** | Packing stress | Affiliate | Medium | Destination data, season data | Weather API | Low | Low |
| 12 | Travel Insurance Comparison | **Should Have** | Insurance confusion | Affiliate | Low | Insurance partner data | Insurance API | Medium | Low |
| 13 | eSIM Finder | **Should Have** | Roaming costs | Affiliate | Low | eSIM partner data | eSIM API | Low | Low |
| 14 | Destination Finder | **Should Have** | Choosing destination | Affiliate | Medium | Destination data, price data | Travelpayouts, weather | Low | Medium |
| 15 | Disruption Assistant | **Should Have** | Flight delays/cancellation | Affiliate | Medium | Flight status data | Flight status API | Low | Medium |
| 16 | Travel Document Vault | **Later** | Document chaos | Premium sub | High | Encrypted storage | None | **High** (privacy) | Medium |
| 17 | Flight Status monitoring | **Later** | Disruption awareness | None (trust) | Medium | Flight data | Flight status API | Low | Low |
| 18 | Airport Transfer Finder | **Later** | Transfer confusion | Affiliate | Low | Transfer partner data | Transfer API | Low | Low |
| 19 | Compensation Checker | **Later** | Knowing rights | None (trust) | Medium | Compensation rules | None | Medium | Low |
| 20 | Currency Guide | **Later** | Payment confusion | Affiliate | Low | None (curated) | None | Low | Low |
| 21 | Trip Sharing | **Later** | Group coordination | Premium sub | Medium | User accounts, sharing logic | None | Medium | Medium |
| 22 | Destination Safety Guide | **Later** | Safety fear | None (trust) | Medium | Government advisories | Gov advisory APIs | **Critical** | Low |
| 23 | Emergency Information | **Later** | Emergency help | None (trust) | Low | Destination data | None | **Critical** | Low |
| 24 | Connection Risk Checker | **Later** | Connection anxiety | Affiliate | Low | Airport MCT data | Airport data | Medium | Medium |
| 25 | Baggage Cost Estimator | **Later** | Baggage confusion | Affiliate | Low | Airline baggage rules | Airline APIs | High | High |
| 26 | Family Travel Planner | **Later** | Family travel stress | Affiliate | Medium | Destination data | Multiple | Medium | Medium |
| 27 | AI Trip Planner | **Later** | Planning from scratch | Premium sub | Medium | Destination data, LLM | LLM API | Medium | High |
| 28 | Travel Budget Tracker | **Later** | Budget management | None (retention) | Medium | User spending data | None | Low | Low |
| 29 | Loyalty Programme Tracker | **Later** | Points management | None (retention) | Medium | Airline programme data | None | Low | Medium |
| 30 | Travel History | **Later** | Trip memories | Retention | Medium | User data | None | Low | Low |
| 31 | Hotel Search | **Later** | Hotel booking | Affiliate | Medium | Hotel API | Hotel API | Low | Medium |
| 32 | Best Time to Visit tool | **Reject (MVP)** | When to travel | Affiliate | Medium | Weather, events, price data | Multiple | Low | High |
| 33 | Airport Guide | **Reject** | Airport navigation | None | Low | Airport data | None | Low | Low |
| 34 | Shared itinerary voting | **Reject** | Group decisions | None | Low | Complex logic | None | Low | High |
| 35 | Carbon offset tracking | **Reject** | Environmental concern | None | Very low | Carbon data | Carbon API | Medium | Medium |

---

## SECTION 5 — MVP Definition

### MVP Scope

The V2 MVP consists of **five product capabilities** that together create a defensibly different experience from any existing travel site:

1. **Trip Workspace** — create, save, and view trips with timeline
2. **Travel Readiness Score** — at-a-glance readiness for each trip
3. **True Trip Cost** — flight + baggage + transfers + insurance estimate
4. **Action Centre** — deadline-driven checklist for each trip
5. **Flight Search (White Label)** — Travelpayouts-powered search at `flights.bookingsfinder.com`

### Exactly What the MVP Is

A traveller visits BookingsFinder.com, creates a trip (or imports one via email), and immediately sees:
- Their trip on a timeline
- A readiness score (e.g., "65% ready — 3 actions needed")
- The estimated true cost (not just the flight price)
- A dated action list (renew passport by X, apply for visa by Y, check in on Z)
- A search box to find flights, which hands off to the white-label experience

### Exactly What the MVP Is Not

- Not an AI chat interface
- Not a full booking engine (booking still happens on partner sites)
- Not a document vault (documents stored locally or referenced, not uploaded)
- Not a social/group feature
- Not a mobile app (responsive web only)
- Not a travel agency or OTA

### User Journey

1. **Landing**: User arrives at new homepage. CTA: "Plan a trip" or "I already booked — organise my trip."
2. **Create Trip**: Enters destination, dates, and trip name. Optionally forwards a booking email.
3. **Trip Dashboard**: Sees readiness score, action items, cost estimate.
4. **Search Flights** (if not booked): Clicks "Find flights" → handed off to `flights.bookingsfinder.com` with prefilled parameters.
5. **Book**: Books on Aviasales partner site. Forwards confirmation email to BookingsFinder.
6. **Return**: Trip auto-updates with booking details. Readiness score updates.
7. **Prepare**: Completes action items. Readiness score approaches 100%.
8. **Travel**: Trip timeline shows during travel. Flight status monitored.
9. **Return**: Post-trip. Trip saved to history. Future destination recommendations appear.

### Free vs Account-Required

| Feature | Free | Account Required |
|---|---|---|
| Browse destination pages | ✅ | No |
| Search flights (White Label) | ✅ | No |
| View homepage and content | ✅ | No |
| Create 1 trip | ✅ | Yes (basic account) |
| Readiness score for 1 trip | ✅ | Yes |
| True trip cost estimate | ✅ | Yes |
| Action centre for 1 trip | ✅ | Yes |
| Multiple trips | ❌ | Yes (free tier = 3 trips) |
| Booking import | ❌ | Yes |
| Price alerts | ❌ | Yes |
| Document vault | ❌ | Premium |
| Trip sharing | ❌ | Premium |
| SMS reminders | ❌ | Premium |

### Monetised Actions

| Action | Revenue Type |
|---|---|
| Flight search → booking | Affiliate (Travelpayouts) |
| Insurance click-through | Affiliate |
| eSIM purchase | Affiliate |
| Visa service click-through | Affiliate |
| Transfer booking | Affiliate |
| Premium subscription (unlimited trips, document vault, sharing, SMS) | Subscription |

### Success Metrics

| Metric | Target |
|---|---|
| Trip creation rate | >5% of homepage visitors create a trip |
| Readiness score engagement | >50% of trip creators complete ≥3 action items |
| Return rate | >20% of users return within 30 days |
| Flight search handoff rate | >10% of trip views click "Find flights" |
| Affiliate conversion | >2% of flight searches result in booking |
| Premium conversion | >3% of registered users upgrade |
| NPS | >40 |

### Launch Criteria

- [ ] New homepage live with problem/intent selector
- [ ] Trip creation flow working (manual entry)
- [ ] Readiness score algorithm working for at least 5 checks
- [ ] Action Centre generating deadline-driven items
- [ ] True Trip Cost showing flight + at least 3 extra cost categories
- [ ] `flights.bookingsfinder.com` subdomain configured with Travelpayouts White Label
- [ ] Main domain flight page redirecting/messaging correctly
- [ ] Account creation and login working
- [ ] Affiliate tracking working across subdomains
- [ ] All simulated/mock features from V1 removed
- [ ] Legal disclaimers on visa, insurance, and cost estimate features

---

## SECTION 6 — Homepage Information Architecture

### Design Principles

- The homepage is NOT a flight search form with decoration
- It leads with traveller problems, not search widgets
- Flight search exists as one clear option among several
- Every section has a single conversion goal

### Section Order

#### 1. Hero

| Element | Detail |
|---|---|
| Purpose | State what BookingsFinder is and who it's for. |
| Headline | "Your trips, planned and ready." |
| Supporting copy | "One place to plan, prepare, and manage every trip. Know exactly what you need, what it costs, and when to act." |
| CTA | Two buttons: **"Plan a new trip"** (primary), **"I already booked — organise my trip"** (secondary) |
| UI concept | Clean typography. Subtle world-map illustration (reuse existing asset `world-map-pattern.png`). No search form in hero. |
| Trust element | "Trusted by travellers worldwide" — with small counter (real, not fake). |
| Mobile behaviour | Stacked CTAs. Full-bleed hero. |
| Conversion goal | Click "Plan a new trip" → trip creation flow. Click secondary → trip import flow. |

#### 2. Problem Selector ("What do you need help with?")

| Element | Detail |
|---|---|
| Purpose | Let users self-select their need. Demonstrates breadth immediately. |
| Headline | "What brings you here today?" |
| Supporting copy | (None — let the options speak) |
| CTA | Card grid: "I'm planning a trip", "I want to know my trip's real cost", "I need to know if I'm ready to travel", "I need visa or document help", "I booked — help me organise", "Just show me cheap flights" |
| UI concept | 6 cards in 3×2 grid (desktop). Horizontally scrollable cards (mobile). Each card has an icon, label, and subtle hover state. |
| Trust element | None needed — this is navigation, not persuasion. |
| Mobile behaviour | Horizontal scroll with snap. |
| Conversion goal | Route user to the right tool or flow. |

#### 3. Travel Readiness (Value Demo)

| Element | Detail |
|---|---|
| Purpose | Show the core product value visually. |
| Headline | "Never board a flight wondering if you forgot something." |
| Supporting copy | "BookingsFinder checks your passport, visas, bookings, and deadlines — then tells you exactly what to do and when." |
| CTA | "See how it works" → demo or animated walkthrough. |
| UI concept | Animated readiness score ticking up from 45% to 95% as checklist items complete. Simplified visual demo, not interactive. |
| Trust element | "We don't replace official sources — we help you find them." |
| Mobile behaviour | Static illustration replacing animation. |
| Conversion goal | Account creation. |

#### 4. True Trip Cost (Value Demo)

| Element | Detail |
|---|---|
| Purpose | Show the cost transparency value. |
| Headline | "That $500 flight? It'll probably cost $1,200." |
| Supporting copy | "We show you the real cost — flights, bags, transfers, insurance, visas — so you can compare honestly." |
| CTA | "Calculate your trip cost" → trip creation flow. |
| UI concept | Side-by-side comparison: "Advertised price" vs "Estimated true cost" with itemised breakdown. Static example (e.g., Sydney→Bali). |
| Trust element | "Estimates based on real data. Not a quote." |
| Mobile behaviour | Stacked, not side-by-side. |
| Conversion goal | Trip creation. |

#### 5. Discover Destinations

| Element | Detail |
|---|---|
| Purpose | Inspire and show breadth. |
| Headline | "Not sure where to go?" |
| Supporting copy | "Browse destinations, see what flights cost from your nearest airport, and find the best time to visit." |
| CTA | Destination cards with prices. |
| UI concept | Grid of destination cards (6-8) with hero image, city name, "Flights from $X" (real data from month-matrix), and "Best time: [Month]" badge. |
| Trust element | Real prices from Travelpayouts. Badges cite data source ("Based on average flight prices"). |
| Mobile behaviour | 2-column grid. |
| Conversion goal | Click to destination page → flight search → affiliate booking. |

#### 6. Search Flights (Compact)

| Element | Detail |
|---|---|
| Purpose | Catch users who came to search flights immediately. |
| Headline | "Or search flights now." |
| Supporting copy | "Compare hundreds of airlines. We'll redirect you to our booking partner." |
| CTA | Compact search form: origin, destination, dates, passengers. "Search flights" button. |
| UI concept | Single-line search bar (Google Flights style). Not the dominant hero element. |
| Trust element | "Powered by trusted airline partners." |
| Mobile behaviour | Full-width stacked form. |
| Conversion goal | Handoff to `flights.bookingsfinder.com`. |

#### 7. How It Works

| Element | Detail |
|---|---|
| Purpose | Build understanding of the platform model. |
| Headline | "Plan with us. Book with our partners." |
| Supporting copy | Three-step visual: "1. Create your trip → 2. We check everything → 3. Book with confidence and travel ready." |
| CTA | "Start your first trip" |
| UI concept | Three-column illustration (desktop), stacked (mobile). Clean icons. |
| Trust element | "We earn commission from partners at no extra cost to you." |
| Mobile behaviour | Stacked with connectors. |
| Conversion goal | Trip creation. |

#### 8. Popular Tools

| Element | Detail |
|---|---|
| Purpose | Show tool breadth. |
| Headline | "Everything you need for every trip." |
| Supporting copy | Grid of tool cards: Visa Checker, Passport Validity, Packing List, Insurance Comparison, eSIM Finder, Currency Guide. |
| CTA | Each card links to the tool. |
| UI concept | 3×2 grid of icon-led cards (desktop). 2-column (mobile). |
| Trust element | Small disclaimer on each card where applicable. |
| Mobile behaviour | 2-column grid. |
| Conversion goal | Tool engagement → account creation. |

#### 9. Trust and Testimonials

| Element | Detail |
|---|---|
| Purpose | Social proof. |
| Headline | "Travellers who plan with BookingsFinder." |
| Supporting copy | Real testimonials (or curated pull quotes from reviews). |
| CTA | None. |
| UI concept | 3 testimonial cards with name, trip, quote. |
| Trust element | "We never fabricate reviews." |
| Mobile behaviour | Single-column carousel. |
| Conversion goal | Trust building, not direct conversion. |

#### 10. Email Capture

| Element | Detail |
|---|---|
| Purpose | Lead capture for non-converting visitors. |
| Headline | "Get travel tips, deal alerts, and destination ideas." |
| Supporting copy | "One email a week. No spam. Unsubscribe anytime." |
| CTA | Email input + "Subscribe" button. |
| UI concept | Clean, minimal. Background tinted differently to separate from main content. |
| Trust element | "We'll never share your email." |
| Mobile behaviour | Full-width stacked. |
| Conversion goal | Email capture. |

#### 11. Footer

| Element | Detail |
|---|---|
| Purpose | Navigation, legal, trust. |
| See Section 7 for full footer design. |

---

## SECTION 7 — Navigation and Sitemap

### Desktop Navigation

```
[BookingsFinder Logo]    Discover ▼   Plan   Tools ▼   Trips   Deals   [Search Flights]   [Sign In]
```

- **Discover**: Destinations, Best time to visit, Travel guides
- **Plan**: Trip workspace, True trip cost, Readiness check
- **Tools**: Visa checker, Passport check, Packing list, Insurance, eSIM
- **Trips**: My trips (requires account)
- **Deals**: Flight deals, Deal alerts
- **Search Flights**: Direct link to `flights.bookingsfinder.com`
- **Sign In / Account**: Auth state dependent

### Mobile Navigation

**Bottom Nav** (5 items):
1. **Home** (house icon)
2. **Discover** (compass icon)
3. **Trips** (suitcase icon)
4. **Tools** (wrench icon)
5. **Account** (person icon)

**Hamburger Menu** (supplemental):
- Search Flights
- Deals
- Guides
- Help
- Settings

### Footer Navigation

**Column 1 — Plan**
- Trip Workspace
- True Trip Cost
- Travel Readiness
- Destination Finder

**Column 2 — Tools**
- Visa Checker
- Passport Validity
- Packing List
- Insurance Comparison
- eSIM Finder

**Column 3 — Book**
- Search Flights
- Flight Deals
- Price Alerts
- How We Compare

**Column 4 — Company**
- About
- How It Works
- Blog
- Press
- Careers
- Contact

**Column 5 — Legal**
- Privacy Policy
- Terms
- Cookie Policy
- Affiliate Disclosure
- Why We Don't Sell Tickets

### Account Navigation (Dropdown)

- My Trips
- My Alerts
- Travel Readiness
- Document Vault (Premium)
- Travel History
- Settings
- Sign Out

### Proposed Sitemap

| Route | Page | Launch? | Notes |
|---|---|---|---|
| `/` | Homepage | ✅ | New design |
| `/discover` | Destination discovery | ✅ | Grid of destinations with prices |
| `/discover/:slug` | Destination detail page | ✅ | Inherits from current `CountryLandingPage` + `RoutePage` concepts |
| `/plan` | Trip workspace (redirects to /trips if logged in) | ✅ | Gated behind account |
| `/trips` | My trips dashboard | ✅ | Requires account |
| `/trips/:id` | Individual trip | ✅ | Timeline + readiness + actions + cost |
| `/trips/new` | Trip creation flow | ✅ | |
| `/flights` | Flight landing page (info + handoff) | ✅ | Retire current `FlightResults` — redirect to subdomain |
| `/tools` | Tools directory | ✅ | |
| `/tools/visa` | Visa checker | Post-MVP | |
| `/tools/passport` | Passport checker | Post-MVP | |
| `/tools/packing` | Packing list | Post-MVP | |
| `/tools/insurance` | Insurance comparison | Post-MVP | |
| `/tools/esim` | eSIM finder | Post-MVP | |
| `/trip-cost` | True trip cost calculator | Post-MVP | |
| `/readiness` | Readiness overview | Post-MVP | |
| `/deals` | Flight deals | ✅ | Curated or automated deals from API |
| `/guides` | Travel guides index | ✅ | |
| `/guides/:slug` | Individual guide | ✅ | |
| `/blog` | Blog | ✅ | Preserve existing |
| `/blog/:slug` | Blog post | ✅ | Preserve existing |
| `/about` | About | ✅ | |
| `/how-it-works` | How it works | ✅ | |
| `/contact` | Contact | ✅ | |
| `/privacy` | Privacy | ✅ | |
| `/terms` | Terms | ✅ | |
| `/cookies` | Cookie policy | ✅ | |
| `/affiliate-disclosure` | Affiliate disclosure | ✅ | |
| `/account` | Account settings | ✅ | |
| `/account/alerts` | Price alerts management | ✅ | |
| `/account/preferences` | User preferences | Post-MVP | |
| `/admin/*` | Admin dashboard | ✅ | Preserve, clean up |
| `/redirect` | Booking interstitial | ✅ | Preserve — redirects to partner |
| `flights.bookingsfinder.com/*` | White Label flight search | ✅ | Travelpayouts subdomain |

### What Happens to Current Routes

| Current Route | Action |
|---|---|
| `/flights` (FlightResults.tsx) | **Retire**. Replace with flight landing page that explains the search experience and links to `flights.bookingsfinder.com`. |
| `/flights/:slug` (RoutePage.tsx) | **Preserve and improve**. Route pages are SEO gold. Replace fake prices with real API data. Fix URL routing. |
| `/hotels` | **Defer**. Keep as-is for now. |
| `/:slug` (CountryLandingPage.tsx) | **Preserve**. Move to `/discover/:slug`. Keep current content structure. |
| `/d/:slug` (DestinationPage.tsx) | **Preserve**. Integrate into `/discover/:slug`. |
| `/redirect` | **Preserve**. Critical affiliate compliance. |

---

## SECTION 8 — User Journeys

### Journey 1: First-Time Visitor Planning a Holiday

**Entry point**: Organic search → "cheap flights bali august" → destination page or Google → homepage.

**Goal**: Plan and book a trip to Bali with confidence.

| Step | Action | System | Data Collected | Value Delivered |
|---|---|---|---|---|
| 1 | Lands on `/discover/bali` | Destination page loads with real prices, best time to visit, entry requirements | None | Sees Bali is affordable in August, needs visa |
| 2 | Clicks "Plan a trip to Bali" | Trip creation flow opens | Destination: Bali. Dates: August (from context) | Quick start |
| 3 | Adjusts dates, sets trip name | Trip created | Trip name, dates, destination | Trip appears in workspace |
| 4 | Views Readiness Score | Readiness engine runs | Australian passport, Bali entry rules | Score: 45% — "Visa on arrival needed, passport valid, 3 more checks" |
| 5 | Views True Trip Cost | Cost calculator runs | Flight price from API, baggage estimate, transfer estimate | "$1,340 estimated total — $620 flights, $160 baggage, $80 visa, $80 transfers, $400 spending" |
| 6 | Clicks "Find flights" | Handoff to flights.bookingsfinder.com | Origin (geo-detected SYD), destination DPS, dates | White label search loads with prefilled params |
| 7 | Browses flights, clicks one | Redirect to Aviasales | Click tracked with affiliate marker | Booking on partner site |
| 8 | Forwards booking confirmation email | Email parser extracts booking | Flight details added to trip | Trip auto-updated. Readiness score now 72% |
| 9 | Checks Action Centre | Deadline engine runs | "Apply for visa on arrival — bring USD $35 cash. Check in online: Aug 12, 2pm. Pack: adapter (Type C/F)" | Clear action list |
| 10 | Returns weekly | Readiness updates, price alerts | Countdown, any price changes | 95% ready by departure day |

**Account creation moment**: Step 3 (creating the trip requires account).

**Monetisation moment**: Step 7 (flight booking affiliate), Step 9 (insurance/eSIM/transfer affiliates).

**Retention loop**: Readiness score updates + countdown + "you're not ready yet" emails.

**Failure states**: Trip creation without account (prompt to register). Email parsing fails (manual entry fallback). Price changes between search and booking (disclosed as estimate).

### Journey 2: Traveller Who Already Booked a Trip

**Entry point**: Direct or email → "Already booked? Organise your trip."

| Step | Action | System | Data Collected | Value Delivered |
|---|---|---|---|---|
| 1 | Clicks "I already booked" | Trip import flow | None yet | Two options: forward email or enter manually |
| 2 | Forwards booking confirmation | Email parser processes | Flight: QF41 SYD-CGK, Aug 10, confirmation # | Flight added to trip |
| 3 | Adds return flight email | Parser processes second email | Return: QF42 CGK-SYD, Aug 20 | Both flights on timeline |
| 4 | Views readiness | Readiness engine runs | "Passport expires Feb 2027 — valid. Indonesia: visa on arrival. Travel insurance: not detected. Hotel booking: not detected." | Score: 60% — 4 items need attention |
| 5 | Adds hotel manually | Quick-add hotel form | Hotel name, dates, confirmation | Timeline now complete |
| 6 | Checks Action Centre | Actions generated | "Get travel insurance by Aug 5. Download boarding passes Aug 9. Check passport has 2 blank pages." | All deadlines visible |
| 7 | Purchases insurance via affiliate link | Click tracked | Insurance purchased | Score: 85% |
| 8 | Returns before trip | Pre-trip checklist | Packing list, eSIM recommendation, currency info | 100% ready |

**Account creation moment**: Step 1 (must register to save trip).

**Monetisation moment**: Step 7 (insurance affiliate), plus flight booking if they search for better fares.

**Retention loop**: "Your trip to Jakarta is in 3 days. You're 85% ready. 2 items remaining."

### Journey 3: Family Travelling with Children

| Step | Action | System |
|---|---|---|
| 1 | Creates family trip | Trip creation with "travelling with children" toggle |
| 2 | Enters child ages | Readiness engine checks child-specific requirements |
| 3 | Passport check for all members | "Child passport expires in 4 months — needs renewal. Adult passports valid." |
| 4 | Seating alert | "Airlines don't guarantee free family seating on this route. Consider paying for seat selection." |
| 5 | Baggage estimate | "2 adults × 23kg + 2 children × 23kg = 92kg total. Stroller: usually free at gate." |
| 6 | Visa check | "Children need visas too. Apply 4 weeks before." |
| 7 | Family packing list | Age-appropriate items auto-added |
| 8 | Insurance recommendation | "Family policy recommended — covers all 4 on one policy." |

**Monetisation**: Insurance affiliate, seat selection upsell, family-friendly hotel bookings.

### Journey 4: Traveller Worried About Visa Requirements

| Step | Action | System |
|---|---|---|
| 1 | Lands on visa checker or homepage | "Do I need a visa?" intent |
| 2 | Enters nationality (AU) + destination (Vietnam) | Visa engine checks rules |
| 3 | Result: "Australian citizens: e-Visa required. Apply at [official site]. Processing: 3 business days. Cost: ~$25 USD. Passport must be valid 6 months beyond entry." | Clear, sourced answer |
| 4 | Disclaimer displayed: "Visa rules change. Always verify at [official government source]." | Trust safeguard |
| 5 | Adds to Action Centre | "Apply for Vietnam e-Visa by [date]" added to trip |
| 6 | Clicks affiliate link for visa service | Optional: assisted application |

**Account creation moment**: To save the visa deadline, user must create account or add to trip.

### Journey 5: Traveller Comparing True Trip Cost

| Step | Action | System |
|---|---|---|
| 1 | Selects "Compare trip cost" | Enters destination and dates |
| 2 | System fetches cheapest flight | Travelpayouts prices_for_dates |
| 3 | System adds baggage estimate | Airline rules lookup |
| 4 | System adds transfer estimate | Airport transfer API |
| 5 | System adds visa cost | Visa rules lookup |
| 6 | System adds insurance estimate | Insurance API |
| 7 | System adds daily spend estimate | Destination cost data |
| 8 | Displays total | "Sydney → Bali, Aug 10-20: ~$1,340 estimated" |
| 9 | User can adjust (different airline, no baggage, etc.) | Recalculates |
| 10 | User compares to alternative dates/destinations | Side-by-side cost comparison |

**Monetisation**: Each cost line has an affiliate opportunity (flight, baggage upgrade, insurance, visa service, transfer).

### Journey 6: Traveller Dealing with a Flight Delay

| Step | Action | System |
|---|---|---|
| 1 | Gets push notification (or checks app) | "QF41 delayed 3 hours. New departure: 1pm." |
| 2 | Opens trip | Sees updated flight status |
| 3 | Clicks "What are my rights?" | Compensation checker |
| 4 | Result: "Australian domestic flight: no statutory compensation, but airline may provide meal vouchers. Check at Qantas service desk." | Clear, jurisdiction-aware |
| 5 | System suggests nearby hotels (if overnight) | Affiliate hotel links |
| 6 | System suggests lounge access (if long delay) | Affiliate lounge booking |

**Monetisation**: Hotel bookings, lounge access, alternative flights.

### Journey 7: Returning User Managing Multiple Trips

| Step | Action | System |
|---|---|---|
| 1 | Logs in | Dashboard shows 3 upcoming trips |
| 2 | "Melbourne weekend: 95% ready. Bali: 72% ready. Tokyo: 15% ready (just added)." | At-a-glance readiness |
| 3 | Tokyo trip needs most attention | "Passport check, visa check, flights not booked" |
| 4 | Clicks into Tokyo trip | Full workspace |
| 5 | Searches flights for Tokyo | Handoff to White Label |
| 6 | Books | Affiliate revenue |
| 7 | Returns to dashboard | All 3 trips progressing |
| 8 | System suggests "Based on your trips to Melbourne and Bali, you might like Fiji next." | Recommendation engine |

**Retention loop**: Multiple active trips = natural retention. Dashboard is the home screen for logged-in users.

---

## SECTION 9 — Travelpayouts White Label Architecture

### Architecture Decision

Flight search will use **Travelpayouts White Label** (Page type), hosted at `flights.bookingsfinder.com`. The main domain will NOT host the flight search UI.

### Subdomain: `flights.bookingsfinder.com`

| Aspect | Detail |
|---|---|
| Technology | Travelpayouts White Label (hosted by Travelpayouts, served on custom subdomain) |
| CNAME | `flights.bookingsfinder.com` → Travelpayouts White Label server |
| Branding | BookingsFinder logo, colours, header/footer consistency |
| Search experience | Full Travelpayouts search — live results, filters, multi-provider comparison |
| Booking flow | Clicks go to Aviasales (or direct to airline/OTA) with BookingsFinder affiliate marker |
| Mobile | Responsive. Travelpayouts White Label is mobile-optimised |
| Analytics | Cross-subdomain tracking via shared cookie domain or URL parameters |
| SEO | Subdomain indexed separately or `noindex` on search result pages |

### Main Domain: `bookingsfinder.com/flights`

| Aspect | Detail |
|---|---|
| What it is | Landing page that introduces flight search |
| What it is NOT | A search results page |
| Content | "Search flights with our trusted partner. We'll redirect you to our flight search." |
| Pre-search options | Destination suggestions, popular routes, current flight deals |
| Handoff | "Search flights" button → `flights.bookingsfinder.com` with prefilled parameters |
| URL parameters passed | `?origin=SYD&destination=DPS&depart_date=2026-08-01&return_date=2026-08-15&adults=2&currency=AUD&marker={MARKER_ID}` |

### Search Handoff Flow

```
bookingsfinder.com/flights
  → User fills in compact search form
  → Clicks "Search flights"
  → Redirected to: flights.bookingsfinder.com/search/SYD260801DPS2608152?marker=XXXXX
  → (where the URL format follows Travelpayouts White Label URL structure)
  → Travelpayouts renders search results
  → User browses, filters, compares
  → Clicks a flight
  → Travelpayouts redirects to Aviasales/partner with marker
  → Booking occurs on partner site
  → "Return to BookingsFinder" link (if configurable) or manual return
```

### Cross-Subdomain Tracking

| Method | Implementation |
|---|---|
| Affiliate marker | `MARKER_ID` environment variable passed to Travelpayouts White Label config |
| Click tracking | JavaScript event listener on White Label (if API allows) or postMessage from iframe |
| Return tracking | Partner return URL or booking confirmation email import |
| Analytics | Same GA4/Plausible property across both domains using `linker` parameter |

### Affiliate Attribution

- Travelpayouts White Label uses the same `MARKER_ID` as current Edge Functions
- Revenue tracked through Travelpayouts affiliate dashboard
- Internal analytics: search events logged at `bookingsfinder.com` before handoff
- Booking events tracked via confirmation email forwarding (post-booking)

### What to Retire from Current Flight Search

| Component | Action |
|---|---|
| `src/pages/FlightResults.tsx` | **Retire** — no longer renders search results |
| `src/hooks/useFlightSearch.ts` | **Retire** — search handled by White Label |
| `src/services/travelApi.ts` (flight search) | **Retire** — search handled by White Label |
| `src/components/flights/FlightCard.tsx` | **Archive** — may repurpose for trip workspace flight display |
| `src/components/flights/FlightFiltersPanel.tsx` | **Archive** — White Label has own filters |
| `src/components/flights/FlightQuickSelect.tsx` | **Archive** |
| `src/components/flights/*` (most) | **Archive** — White Label replaces search UI |
| `src/components/flights/EmptyFlightState.tsx` | **Archive** |
| `src/components/flights/SearchingIndicator.tsx` | **Archive** |
| `supabase/functions/search-flights/` | **Retire** — White Label handles search API |
| `supabase/functions/_shared/travelpayouts.ts` | **Partial retire** — keep `getLowestPrice` for price alerts, `getConfig` for marker |
| Price calendar components | **Preserve** — these use `month-matrix` API, not search API |
| Deal score, price confidence, urgency badges | **Retire completely** — misleading features identified in audit |

### What to Preserve

| Component | Action |
|---|---|
| `supabase/functions/get-price-calendar/` | Preserve — used for price calendar on destination pages |
| `supabase/functions/get-popular-directions/` | Preserve — used for popular routes |
| `supabase/functions/get-redirect/` | Preserve — may still be needed for non-flight redirects |
| `supabase/functions/track-affiliate-click/` | Preserve — tracking endpoint |
| `src/pages/BookingRedirect.tsx` | Preserve — interstitial page for non-White-Label redirects |
| `src/types/flight.ts` | Refactor — simplify, remove simulated fields |
| `supabase/functions/search-airports/` | Preserve — airport search for trip creation |
| `src/hooks/useGeoLocation.ts` | Preserve — location detection for defaults |
| `src/hooks/usePriceCalendar.ts` | Preserve |

---

## SECTION 10 — Existing Repository Reuse Audit

### Classification Key

- **Preserve**: Keep as-is with minor updates
- **Refactor**: Keep concept but significantly change implementation
- **Replace**: New implementation needed
- **Remove**: Delete entirely
- **Archive**: Keep in repo for reference, not used in production

### Full Audit

| Path | Classification | Reason | Migration Risk | Recommended Action |
|---|---|---|---|---|
| `src/App.tsx` | **Refactor** | Routes change significantly. V2 has different page structure. | Medium — routing changes are breaking | Plan new route map, migrate incrementally |
| `src/pages/Index.tsx` | **Replace** | New homepage design. Current is search-form-centric. | Low — isolated page | Build new homepage, swap |
| `src/pages/FlightResults.tsx` | **Remove** | White Label replaces flight search UI | Low | Remove after White Label live |
| `src/pages/BookingRedirect.tsx` | **Preserve** | Interstitial page for affiliate redirects. Good compliance. | None | Keep, update branding |
| `src/pages/RoutePage.tsx` | **Refactor** | Good SEO structure, fake prices. Fix price data, routing. | Medium | Connect to real API, fix sitemap URLs |
| `src/pages/CountryLandingPage.tsx` | **Refactor** | Good structure. Move to `/discover/:slug`. | Low | Move route, update |
| `src/pages/DestinationPage.tsx` | **Refactor** | Integrate with CountryLandingPage | Low | Merge concepts |
| `src/pages/Account.tsx` | **Replace** | Needs trip dashboard, readiness, action centre | Medium | New account page with trip workspace |
| `src/pages/Admin*.tsx` (all admin) | **Preserve** | Internal tools. Not customer-facing. | Low | Keep, update as needed |
| `src/pages/AboutUs.tsx` | **Preserve** | Static page. Update copy only. | None | Minor copy updates |
| `src/pages/HowItWorks.tsx` | **Replace** | New how-it-works reflects V2 model | None | Rewrite |
| `src/pages/Blog.tsx`, `BlogPost.tsx` | **Preserve** | Blog is fine. | None | Keep |
| `src/hooks/useFlightSearch.ts` | **Remove** | White Label replaces search | Low | Remove after transition |
| `src/hooks/useGeoLocation.ts` | **Preserve** | Location detection for defaults, currency, airport | None | Keep |
| `src/hooks/usePriceCalendar.ts` | **Preserve** | Price calendar for destination pages | None | Keep |
| `src/hooks/usePriceAlerts.ts` | **Refactor** | Keep alerts, update for V2 trip model | Low | Update data model |
| `src/services/travelApi.ts` | **Refactor** | Remove search, keep redirect and tracking | Medium | Strip search functions |
| `src/types/flight.ts` | **Refactor** | Remove deal_score, price_confidence, price_trend, simulated fields | Low | Simplify to essential fields |
| `src/components/home/HeroSection.tsx` | **Replace** | New hero design. No search-centric hero. | Low | Build new |
| `src/components/search/ModernFlightSearch.tsx` | **Archive** | Keep as reference. White Label replaces. | None | Archive |
| `src/components/search/MobileFlightSearch.tsx` | **Archive** | Same as above | None | Archive |
| `src/components/search/MobileHeroSearch.tsx` | **Archive** | Same as above | None | Archive |
| `src/components/search/ModernSearchBox.tsx` | **Archive** | Replaced by new homepage design | None | Archive |
| `src/components/search/SearchBox.tsx` | **Remove** | Old search box. Already superseded. | None | Remove |
| `src/components/search/LocationCombobox.tsx` | **Preserve** | Airport search for trip creation | None | Keep |
| `src/components/search/*` (other search comps) | **Archive** | Most replaced by White Label | Low | Archive |
| `src/components/flights/FlightCard.tsx` | **Archive** | May repurpose for trip workspace flight display | Low | Archive |
| `src/components/flights/DealScoreBadge.tsx` | **Remove** | Simulated feature. Remove. | None | Remove |
| `src/components/flights/FlexibleDatesMatrix.tsx` | **Remove** | Mock data (Math.random()). Remove. | None | Remove |
| `src/components/flights/PriceConfidenceIndicator.tsx` | **Remove** | Misleading. Remove. | None | Remove |
| `src/components/flights/UrgencyBadges.tsx` | **Remove** | Simulated "seats left". Remove immediately. | None | Remove |
| `src/components/flights/NearbyAirportSuggestion.tsx` | **Remove** | Never populated. Dead code. | None | Remove |
| `src/components/flights/PriceCalendar.tsx` | **Preserve** | Real data. Use on destination pages. | None | Keep |
| `src/components/flights/WeeklyPriceHeatmap.tsx` | **Preserve** | Real data. Use on destination pages. | None | Keep |
| `src/components/flights/FlightWarningBadges.tsx` | **Preserve** | Real detection logic. Use in trip workspace. | None | Keep |
| `src/components/flights/PriceAlertDialog.tsx` | **Preserve** | Keep. | None | Keep |
| `src/components/flights/FlightQuickSelect.tsx` | **Archive** | Replaced by White Label | None | Archive |
| `src/components/flights/*` (remaining) | **Archive** | Replaced by White Label | Low | Archive |
| `src/components/layout/Header.tsx` | **Refactor** | New navigation structure | Medium | Update nav items |
| `src/components/layout/Footer.tsx` | **Refactor** | New footer links | Low | Update links |
| `src/components/layout/BottomNav.tsx` | **Refactor** | New bottom nav items | Low | Update items |
| `src/components/cards/` | **Preserve** | Generic components | None | Keep |
| `src/components/ui/` | **Preserve** | Shadcn UI components | None | Keep |
| `src/components/sections/` | **Refactor** | New sections for new homepage | Low | Update |
| `src/components/ads/` | **Preserve** | Ad infrastructure | None | Keep |
| `src/components/states/` | **Preserve** | Error and empty states | None | Keep |
| `src/components/seo/` | **Preserve** | SEO components | None | Keep |
| `src/integrations/supabase/client.ts` | **Preserve** | Supabase client. Works. | None | Keep |
| `src/lib/` | **Preserve** | Utilities | None | Keep |
| `src/data/destinationData.ts` | **Preserve** | Destination data. Expand. | None | Expand |
| `supabase/config.toml` | **Refactor** | Add missing function configs, update verify_jwt | Medium | Add all functions |
| `supabase/functions/search-flights/` | **Remove** | White Label replaces | Low | Remove after transition |
| `supabase/functions/_shared/travelpayouts.ts` | **Refactor** | Keep price functions, remove search | Medium | Strip search, keep config + prices |
| `supabase/functions/get-redirect/` | **Preserve** | Still needed | None | Keep |
| `supabase/functions/get-price-calendar/` | **Preserve** | Price calendar for destination pages | None | Keep |
| `supabase/functions/get-popular-directions/` | **Preserve** | Popular routes | None | Keep |
| `supabase/functions/search-airports/` | **Preserve** | Airport search | None | Keep |
| `supabase/functions/track-affiliate-click/` | **Preserve** | Affiliate tracking | None | Keep |
| `supabase/functions/sitemap/` | **Refactor** | Fix route page URLs, add new routes | Low | Update |
| `supabase/functions/check-price-alerts/` | **Preserve** | Price alerts cron | None | Keep |
| `supabase/functions/send-price-alert/` | **Preserve** | Alert notifications | None | Keep |
| `supabase/functions/send-welcome-email/` | **Preserve** | Welcome emails | None | Keep |
| `supabase/functions/generate-seo-content/` | **Preserve** | SEO content generation | None | Keep |
| `supabase/functions/generate-route-page/` | **Preserve** | Route page generation | None | Keep |
| `supabase/migrations/` | **Preserve** | Existing schema. Extend for V2. | High | Add new tables, don't modify existing |
| `tailwind.config.ts` | **Refactor** | New brand colours | Low | Update colour palette |
| `vite.config.ts` | **Preserve** | Build config. Works. | None | Keep, may add SSR later |
| `index.html` | **Refactor** | Updated meta tags for new positioning | None | Update |
| `public/robots.txt` | **Preserve** | Good config | None | Update sitemap URL if needed |
| `package.json` | **Preserve** | Dependencies. May add email parsing lib. | Low | Add incrementally |

### Simulated Features — Immediate Removal List

From the architecture audit, these features must be **removed immediately** in Phase 0:

1. `src/components/flights/FlexibleDatesMatrix.tsx` — `Math.random()` price generation
2. `src/components/flights/UrgencyBadges.tsx` — `Math.sin(price * 9301)` seat count
3. `src/components/flights/DealScoreBadge.tsx` — calculated from batch-relative data, labelled as "Excellent Deal" absolutes
4. `src/components/flights/PriceConfidenceIndicator.tsx` — "based on historical data" claim is false
5. `src/pages/RoutePage.tsx` lines 52-55 — fake price generation `150 + charCodeSum % 800`

### Current Assets to Keep and Build Around

1. Supabase infrastructure (project, auth, Edge Functions, database)
2. Destination and country landing page system (SEO value)
3. Airport search with fuzzy matching
4. Price calendar and popular directions (real Travelpayouts data)
5. Blog and content management
6. Admin dashboard
7. Shadcn UI component library
8. Geo-location hook
9. Affiliate tracking infrastructure
10. Email capture system

---

## SECTION 11 — New Technical Architecture

### Technology Stack Decision

**Keep the current stack**: React + Vite + TypeScript + Supabase + Tailwind. This is an excellent stack for a solo founder. The problems identified in the audit are not technology problems — they are product and data-source problems.

### Frontend

| Concern | Decision | Rationale |
|---|---|---|
| Framework | React 18 + Vite (keep) | Fast, mature, huge ecosystem |
| Routing | React Router (keep) | Already integrated |
| State | React Query (already in package.json, underused) + Zustand or React Context for app state | React Query for server state, Context/Zustand for UI state |
| Styling | Tailwind + Shadcn (keep) | Excellent DX, fast iteration |
| Rendering | **SPA for app, pre-rendered static pages for SEO content** | Routes like `/discover/:slug`, `/guides/:slug`, `/blog/:slug` should be pre-rendered or SSR'd for SEO. Dynamic app features (trip workspace) can remain SPA. |
| SSR | **Not yet** — use pre-rendering for static pages via `react-snap` or Vite prerender plugin. Migrate to SSR (Vite + express or similar) only when SEO impact is proven. | SSR adds significant complexity. Pre-rendering is a 1-day task. |

### Backend

| Concern | Decision |
|---|---|
| API layer | Supabase Edge Functions (Deno) — keep |
| Database | Supabase PostgreSQL — keep |
| Auth | Supabase Auth — keep |
| File storage | Supabase Storage — keep (for document vault) |
| Scheduled jobs | Supabase Edge Functions with `pg_cron` or external cron trigger — keep pattern |

### Database

| Concern | Decision |
|---|---|
| Current schema | Preserve all existing tables |
| New tables | Add `trips`, `trip_bookings`, `trip_members`, `trip_readiness_checks`, `action_items`, `travel_documents`, `user_preferences` |
| RLS | Enable on new tables. Users own their data. Trip sharing via policies. |
| Migrations | Additive only. Never modify existing migration files. |

### Authentication

Keep Supabase Auth. Add:
- Email/password (existing)
- Magic link (existing via Supabase)
- Google OAuth (recommend adding for lower friction)
- Anonymous session for browsing (can view destination pages without account)
- Account required for trip creation, readiness, document storage

### APIs

| API | Purpose | Status |
|---|---|---|
| Travelpayouts | Flight prices, price calendar, popular directions | Existing |
| Travelpayouts White Label | Flight search UI | New — replaces custom search |
| Hotel API (Travelpayouts Hotellook or alternative) | Hotel search | Deferred |
| Visa/Entry API (e.g., Sherpa, iVisa, or curated) | Visa requirements | New — Post-MVP |
| Insurance comparison API | Insurance quotes | New — Post-MVP |
| eSIM API (Airalo, Holafly) | eSIM plans | New — Post-MVP |
| Flight status API (Aviationstack, FlightAware) | Live flight status | New — Post-MVP |
| Weather API (Open-Meteo free) | Destination weather, packing advice | New — Low priority |
| Email parsing (self-hosted with AI) | Booking confirmation extraction | New — MVP feature |

### AI Provider Layer

| Concern | Decision |
|---|---|
| Provider | OpenAI (GPT-4o-mini) for email parsing and structured extraction. Not for open-ended chat. |
| Approach | **AI as structured data extractor**, not as conversational agent. Email → JSON booking object. |
| Guardrails | Output validation against Zod schema. Never present AI output as guaranteed fact. |
| Cost | GPT-4o-mini is extremely cheap (~$0.15/1M input tokens). Parsing 10,000 booking emails would cost under $1. |

### Caching

| What | How |
|---|---|
| Destination pages | CDN cache (already via Supabase potentially) or pre-rendered static HTML |
| Price data | Client-side React Query with 15-minute stale time |
| Visa rules | Server-side cache, 24-hour TTL (rules don't change minute-to-minute) |
| Destination data | Static JSON or database with CDN cache |

### Scheduled Jobs

| Job | Frequency |
|---|---|
| Price alert checks | Every 6 hours (existing) |
| Readiness score recalculation | Daily (new) |
| Deadline reminders | Daily (new) |
| Flight status monitoring | Every 30 min during active trip windows (new) |
| Sitemap regeneration | Daily (existing) |
| SEO content generation | On-demand or weekly (existing) |

### Notifications

| Channel | Use |
|---|---|
| Email | Price alerts, deadline reminders, trip countdown, weekly digest |
| In-app | Action Centre (always visible in trip view) |
| Push (future) | Disruption alerts, check-in reminders |
| SMS (premium) | Urgent alerts only |

### Email

Keep using Supabase Edge Functions for email (Resend, SendGrid, or similar integration). Add:
- Trip countdown emails (7 days, 3 days, 1 day before)
- Readiness summary emails (weekly)
- Deadline reminder emails
- Post-trip feedback
- Future destination recommendations

### Analytics

| Tool | Purpose |
|---|---|
| Plausible or Umami (self-hosted) | Privacy-friendly analytics. Better than GA4 for a trust-focused brand. |
| Travelpayouts dashboard | Affiliate revenue tracking |
| Custom events table | Internal feature usage tracking |

### Search

| Type | Implementation |
|---|---|
| Airport search | Existing fuzzy search Edge Function (keep) |
| Flight search | Travelpayouts White Label (new) |
| Destination search | PostgreSQL full-text search or simple filter (keep) |
| Blog/content search | PostgreSQL full-text (existing or new) |

### Content Management

| Content Type | Management |
|---|---|
| Blog posts | Admin dashboard + Supabase (existing) |
| Destination pages | Admin + generated pages (existing `generate-seo-content`, `generate-route-page`) |
| Country pages | Admin dashboard (existing) |
| Travel guides | New — similar to blog but different schema |

### Deployment

| Concern | Decision |
|---|---|
| Frontend | Vite build → static hosting (Vercel, Netlify, Cloudflare Pages). Currently likely on Vercel/Netlify given Lovable integration. |
| Edge Functions | Supabase CLI deploy |
| Subdomain | CNAME `flights.bookingsfinder.com` → Travelpayouts White Label |
| CI/CD | GitHub Actions or Vercel Git integration |

### Monitoring and Error Tracking

| Tool | Purpose |
|---|---|
| Sentry (free tier) or GlitchTip (self-hosted) | Frontend error tracking |
| Supabase logs | Edge Function monitoring |
| Custom health check edge function | Uptime monitoring trigger |

---

## SECTION 12 — Data Model

### High-Level Entity Relationships

```
users (Supabase Auth)
  ├── traveller_profiles (1:many — user, family members)
  ├── trips (1:many)
  │     ├── trip_members (many:many — traveller_profiles)
  │     ├── trip_bookings (1:many)
  │     │     ├── flight_segments
  │     │     ├── accommodations
  │     │     └── activities
  │     ├── trip_readiness_checks (1:many)
  │     ├── action_items (1:many)
  │     ├── cost_estimates (1:1)
  │     └── travel_documents (1:many)
  ├── saved_destinations (1:many)
  ├── price_alerts (1:many)
  ├── affiliate_clicks (existing — 1:many)
  └── user_preferences (1:1)
```

### Key Tables

#### `traveller_profiles`
- `id`, `user_id` (FK → auth.users), `first_name`, `last_name`, `date_of_birth`, `nationality`, `passport_number`, `passport_expiry`, `passport_country`, `frequent_flyer_numbers` (JSONB), `created_at`
- RLS: User can read/write their own profiles

#### `trips`
- `id`, `user_id` (FK → auth.users, owner), `name`, `destination`, `destination_iata`, `start_date`, `end_date`, `status` (planning/booked/travelling/completed/cancelled), `readiness_score`, `trip_type` (solo/family/business), `created_at`, `updated_at`
- RLS: Owner + shared members can read

#### `trip_members`
- `id`, `trip_id`, `traveller_profile_id`, `role` (owner/member)
- RLS: Trip owner can manage

#### `trip_bookings`
- `id`, `trip_id`, `booking_type` (flight/hotel/activity/transfer/insurance/other), `provider`, `confirmation_number`, `booking_date`, `total_amount`, `currency`, `status`, `raw_email_id`, `details` (JSONB), `created_at`
- RLS: Trip members can read

#### `flight_segments`
- `id`, `trip_booking_id`, `airline`, `airline_code`, `flight_number`, `departure_airport`, `arrival_airport`, `departure_time`, `arrival_time`, `cabin_class`, `booking_reference`, `created_at`
- RLS: Inherited from trip_booking

#### `accommodations`
- `id`, `trip_booking_id`, `name`, `address`, `check_in`, `check_out`, `room_type`, `confirmation_number`, `created_at`

#### `trip_readiness_checks`
- `id`, `trip_id`, `check_type` (passport/visa/insurance/booking_complete/baggage/documents), `status` (pass/fail/pending/not_applicable), `details` (text), `deadline`, `checked_at`, `created_at`

#### `action_items`
- `id`, `trip_id`, `title`, `description`, `deadline`, `completed`, `completed_at`, `category`, `priority` (high/medium/low), `created_at`

#### `cost_estimates`
- `id`, `trip_id`, `flight_cost`, `baggage_cost`, `visa_cost`, `insurance_cost`, `transfer_cost`, `daily_spend_estimate`, `total_estimate`, `currency`, `confidence_level` (estimate/quote/actual), `created_at`

#### `travel_documents`
- `id`, `trip_id`, `name`, `document_type`, `file_path` (Supabase Storage), `expiry_date`, `notes`, `created_at`
- RLS: Trip owner only (or premium users)

#### `saved_destinations`
- `id`, `user_id`, `destination`, `destination_iata`, `notes`, `created_at`

#### `user_preferences`
- `id`, `user_id`, `home_airport`, `currency`, `nationality`, `notification_preferences` (JSONB), `email_frequency`, `created_at`, `updated_at`

### Security Considerations

- All tables use RLS (Row Level Security)
- Users can only access their own trips
- Trip sharing uses `trip_members` with explicit roles
- Document storage encrypted at rest (Supabase Storage)
- Passport numbers encrypted or stored with field-level encryption (consider Supabase Vault)
- No PII in logs
- GDPR/APP: data export and deletion supported via account settings

---

## SECTION 13 — AI Strategy

### Where AI Adds Real Value

| Capability | Classification | AI Model | Why AI? | Hallucination Safeguard |
|---|---|---|---|---|
| Booking email parsing | **AI** | GPT-4o-mini | Confirmation emails have infinite formats. Deterministic parsing fails. AI extracts structured JSON. | Output validated against Zod schema. Required fields enforced. User reviews extracted data before saving. |
| Destination content generation | **Hybrid** | GPT-4o + human review | SEO content at scale. Current `generate-seo-content` function exists. | Human review in admin before publishing. Factual claims checked. |
| Packing list generation | **Rules Engine** | None | Deterministic: destination + season + trip length + activities → packing list. No AI needed. | N/A |
| Destination recommendations | **Hybrid** | Simple ML or rules | "Based on your trips to Melbourne and Bali, you might like Fiji." User history + similarity. No LLM needed. | Recommendations labelled as "suggestions", not predictions. |
| Trip readiness analysis | **Rules Engine** | None | Passport expiry > 6 months from return? Visa needed for nationality + destination? Bookings confirmed? All rule-based. | N/A |
| Visa guidance | **External API + Rules Engine** | None | Rules engine queries visa API or curated database. AI should NEVER generate visa advice from training data. | Result always cites official source. "Verify at [government URL]." |
| Disruption assistance | **Rules Engine + External API** | None | Flight status → delay detected → compensation rules lookup → guidance. Deterministic. | Jurisdiction-aware. "Check with airline." |
| True trip cost | **External API + Rules Engine** | None | Flight cost + baggage rules + transfer estimates + visa fees + insurance quotes. No AI. | Every line item labelled "estimate" or "quote". |
| Safety information | **External API** | None | Government advisories only. NEVER AI-generated safety advice. | Direct quote from official source. "Source: Australian Government Smartraveller, updated [date]." |
| Itinerary planning | **Hybrid** | GPT-4o (later) | "Plan a 10-day Bali trip for a family with young children." AI can suggest structure, but bookings must be made by user. | Suggestions only. "This is an AI suggestion. Verify all details before booking." |
| Document extraction | **AI** | GPT-4o-mini | Extract passport expiry, visa details from uploaded images. | User reviews extracted data. Never auto-save without confirmation. |

### AI Principles

1. **AI extracts and suggests, never decides.** Travel decisions are human decisions.
2. **AI never generates visa, safety, legal, or health advice from training data.** These must come from official APIs or curated databases.
3. **Every AI output is reviewable before it affects the user's trip.**
4. **AI usage is disclosed.** "This was generated by AI and reviewed by our team" or "AI-extracted — please verify."
5. **Structured output always.** Use function calling / structured JSON. Never free-text generation for critical data.

### Where NOT to Use AI

- Price predictions (use statistical methods on API data, not LLM)
- Visa requirement generation (use API or curated data)
- Safety assessments (use government sources)
- Medical advice (never)
- Insurance recommendations (use comparison API, not LLM)

---

## SECTION 14 — Monetisation Model

### Revenue Streams

#### 1. Flight Affiliate Revenue

| Aspect | Detail |
|---|---|
| Mechanism | Travelpayouts White Label → Aviasales/partner booking → commission |
| Customer value | Free flight comparison |
| Revenue potential | **Primary revenue driver** (est. $2-20 per booking depending on ticket value) |
| Trust risk | Low — standard meta-search model |
| Implementation cost | Already implemented (marker ID, affiliate relationship) |
| Time to revenue | Immediate (existing relationship) |

#### 2. Hotel Affiliates

| Aspect | Detail |
|---|---|
| Mechanism | Travelpayouts Hotellook or direct hotel affiliate programs |
| Customer value | Hotel price comparison |
| Revenue potential | Secondary (est. 5-10% commission on bookings) |
| Trust risk | Low |
| Implementation cost | Medium (need hotel API integration) |
| Time to revenue | 2-3 months |

#### 3. Insurance Affiliates

| Aspect | Detail |
|---|---|
| Mechanism | Insurance comparison → click-through → commission per policy |
| Customer value | Find right insurance at right price |
| Revenue potential | Medium (est. $5-20 per policy sold) |
| Trust risk | Medium — must not present as advice |
| Implementation cost | Low (comparison APIs exist) |
| Time to revenue | 1-2 months |

#### 4. eSIM Affiliates

| Aspect | Detail |
|---|---|
| Mechanism | eSIM plan comparison → purchase → commission |
| Customer value | Avoid roaming charges |
| Revenue potential | Low ($2-5 per purchase) |
| Trust risk | Low |
| Implementation cost | Low (Airalo/Holafly partner programs) |
| Time to revenue | 1 month |

#### 5. Transfer and Activity Affiliates

| Aspect | Detail |
|---|---|
| Mechanism | Airport transfer or activity booking → commission |
| Customer value | Book trusted transfers/activities |
| Revenue potential | Low-Medium |
| Trust risk | Low |
| Implementation cost | Medium |
| Time to revenue | 3-4 months |

#### 6. Premium Subscription

| Aspect | Detail |
|---|---|
| Mechanism | Monthly/annual subscription for advanced features |
| Customer value | Unlimited trips, document vault, trip sharing, SMS reminders, family profiles, advanced cost comparison |
| Revenue potential | Medium (est. $5-10/month, targeting 3-5% conversion) |
| Trust risk | Low (transparent pricing, clear value) |
| Implementation cost | Medium (feature gating, payment integration) |
| Time to revenue | 4-6 months |

#### 7. One-Time Trip Upgrade

| Aspect | Detail |
|---|---|
| Mechanism | Pay-per-trip for premium features on a single trip (no subscription) |
| Customer value | Full readiness, document storage, sharing for one important trip |
| Revenue potential | Low-Medium ($3-5 per trip) |
| Trust risk | Low |
| Implementation cost | Low (same features, different billing model) |
| Time to revenue | 5-7 months |

#### 8. Sponsored Destinations

| Aspect | Detail |
|---|---|
| Mechanism | Tourism boards pay for promoted placement in destination discovery |
| Customer value | Discover new destinations |
| Revenue potential | Medium (B2B sales required) |
| Trust risk | **Medium** — must be clearly labelled as sponsored |
| Implementation cost | Low (ad placement system already exists) |
| Time to revenue | 6-12 months (requires sales) |

#### 9. Lead Generation

| Aspect | Detail |
|---|---|
| Mechanism | Qualified traveller leads to travel agents or tour operators (with consent) |
| Customer value | Personalised trip planning assistance |
| Revenue potential | Medium (high value per lead) |
| Trust risk | **High** — must have explicit consent, clear disclosure |
| Implementation cost | Medium |
| Time to revenue | 6-12 months |

#### 10. Display Advertising

| Aspect | Detail |
|---|---|
| Mechanism | Programmatic or direct-sold ads on content pages |
| Customer value | None (negative if overdone) |
| Revenue potential | Low (travel CPMs are moderate) |
| Trust risk | Medium — degrades experience |
| Implementation cost | Low (existing ad infrastructure) |
| Time to revenue | Immediate |

### Recommended Initial Monetisation Stack (MVP)

1. **Flight affiliate** (already working, primary)
2. **Insurance affiliate** (add at launch, high intent during trip prep)
3. **eSIM affiliate** (add at launch, low effort)
4. **Email capture** → future trip promotions (existing, improve)
5. **Premium subscription** (add at Month 3-4, after retention proves value)

---

## SECTION 15 — Retention Strategy

### Why Users Return

#### Weekly
- **Trip countdown**: "7 days until Bali! You're 85% ready. 2 items need attention."
- **Price alerts**: "Flight to Tokyo dropped $120. Worth checking."
- **New content**: "New guide: Best time to visit Japan."

#### Monthly
- **New destination recommendations**: "Based on your trips, you might like Fiji."
- **Deal digest**: "Flight deals from Sydney this month."
- **Readiness refresh**: Passport and visa reminders.

#### Before Every Trip
- **Pre-trip checklist**: Comprehensive readiness in the 2 weeks before departure.
- **Packing list**: Generated for the specific trip.
- **Document check**: Final passport, visa, insurance verification.

### Retention Loops

```
Trip Creation
  └─> Readiness Score (low → motivates action)
       └─> Action Items (deadlines → return visits)
            └─> Completing items → Score improves → satisfaction
                 └─> Cost transparency → booking
                      └─> Booking confirmed → trip timeline
                           └─> Countdown begins → pre-trip emails
                                └─> Travel → disruption support
                                     └─> Post-trip → saved to history
                                          └─> Future recommendations → new trip
```

### Retention Features by Priority

| Feature | Retention Mechanism | Implementation |
|---|---|---|
| Trip workspace | Core retention. Users come back to check and update. | MVP |
| Readiness score | Gamification. Users want to see 100%. | MVP |
| Action Centre + deadlines | "You have 3 things to do." Email reminders. | MVP |
| Price alerts | "Price changed." Brings users back. | Post-MVP |
| Flight status + disruption | "Your flight is delayed." Critical moment. | Post-MVP |
| Countdown emails | "3 days until your trip!" | Post-MVP |
| Post-trip history | Builds travel identity. | Later |
| Recommendations | "Where next?" | Later |

---

## SECTION 16 — Trust, Safety and Compliance

### Affiliate Disclosure

- **Every page with affiliate links** includes a visible disclosure: "We may earn a commission when you book through our links at no extra cost to you."
- The interstitial redirect page already does this well (`BookingRedirect.tsx` footer). Keep and expand to all relevant pages.
- Link to full `/affiliate-disclosure` page (already exists).

### AI Disclosure

- Any content generated by AI must be labelled: "Generated with AI assistance and reviewed by our team."
- AI-extracted data from emails must show: "Extracted automatically — please verify."
- Never present AI output as human-authored or guaranteed fact.

### Travel Information Disclaimers

- **Standard disclaimer on all travel information pages**: "Travel requirements change. Always verify with official sources before booking or travelling."
- This applies to: visa pages, passport pages, destination guides, entry requirements.

### Visa Information

- **CRITICAL**: Never present as authoritative.
- Required disclaimer: "Visa information is provided as a guide only. Requirements change frequently. Always check the official government website of your destination country. BookingsFinder is not a visa service and does not guarantee the accuracy of this information."
- Always link to the official government source.
- Do not generate visa advice with AI.

### Passport Advice

- "Passport requirements vary by country. This is a general guide. Verify with the embassy of your destination country."
- Never store unencrypted passport numbers without explicit consent and encryption.

### Insurance

- "We are not insurance providers. This comparison is for informational purposes. Read the Product Disclosure Statement before purchasing."
- Australian financial services regulation may apply. Seek legal advice before launching insurance comparison.

### Health Information

- **Never provide medical advice.**
- "Consult your doctor or a travel health specialist before travelling. Vaccination requirements change."
- Link to official health sources (CDC, WHO, Australian Government Smartraveller).

### Safety Information

- **Only cite official government advisories.** Never make independent safety assessments.
- "Source: Australian Government Smartraveller, updated [date]."
- Link to: smartraveller.gov.au, travel.state.gov (US), gov.uk/foreign-travel-advice.

### Privacy

- Australian Privacy Principles (APP) apply if operating from Australia or targeting Australian users.
- GDPR applies if targeting EU users.
- Privacy policy must address: what data is collected, how it's used, where it's stored (Supabase — check region), how to delete it.
- Document vault: encrypted at rest. Users can delete documents. Clear retention policy.

### Document Storage

- Passports, visas, booking confirmations are sensitive.
- Encrypt at rest (Supabase Storage encryption).
- Encrypt in transit (HTTPS).
- User-managed keys optional (future).
- Clear "delete all my data" function.

### Email Import

- Users forward booking emails.
- Store only extracted structured data (not the raw email unless the user explicitly opts in).
- Process email server-side (Edge Function), not client-side.
- Delete raw email after processing (or within 30 days).

### Data Deletion

- Account deletion must delete all associated data (or offer export first).
- Clear process in account settings.
- "Delete my data" button with confirmation.

### Consent

- Cookie consent (already implemented — `CookieConsent.tsx`).
- Email marketing consent (separate from account creation).
- Document storage consent (explicit for sensitive documents).
- Trip sharing consent (explicit).

### Accessibility

- Target WCAG 2.1 AA compliance.
- Shadcn UI components are generally accessible.
- Test with screen readers before launch.
- Colour contrast: new colour palette must pass AA contrast ratios.

### Misleading Urgency Claims — Remediation

From the architecture audit, the following features were found to be simulated/misleading:

| Feature | Finding | Remediation |
|---|---|---|
| Flexible Dates Matrix | `Math.random()` prices | **Removed**. Replaced with real month-matrix data on destination pages only. |
| "Seats left" badge | `Math.sin(price * 9301)` | **Removed entirely**. No fake scarcity. |
| Route page prices | Character hash `150 + hash % 800` | **Replaced with real API data** from Travelpayouts. If API unavailable, show "View live prices" without a number. |
| "Price Confidence" | Claims "historical data" but uses batch mean | **Removed**. If re-implemented, use real historical data from month-matrix with clear labelling. |
| Deal Score "Excellent Deal" | Relative to current batch only | **Removed**. If re-implemented, compare to route averages from month-matrix and label as "compared to average for this route." |
| "Great deals available!" | Based on relative deal score | **Removed**. |
| "50M+ Happy Travelers" | Unverifiable | **Removed** from homepage. Use only verifiable claims. |
| "24/7 Customer Support" | Misleading — BF doesn't handle bookings | **Removed**. Replace with "Help centre" or accurate description. |

---

## SECTION 17 — Visual Design Direction

### Design Personality

- **Calm competence**, not hype
- **Spatial generosity** — breathing room between elements
- **Information clarity** — typography-led, not decoration-led
- **Quiet confidence** — no neon, no urgency colours, no countdown timers

### How It Should Feel Different

| Competitor | Their Feel | BookingsFinder V2 Feel |
|---|---|---|
| Skyscanner | Busy, search-dominant, slightly cluttered | Calm, organised, spacious |
| Booking.com | Urgent, deal-heavy, "only 1 room left!" | Honest, transparent, no fake urgency |
| Expedia | Corporate, upsell-heavy, orange everywhere | Independent, clean, blue-trust palette |
| Generic AI SaaS | Gradient-heavy, dark-mode default, "platform" aesthetic | Travel-specific warmth, light and optimistic |

### Colour Direction

Move away from the current primary blue (`#003680`) toward a more distinctive palette:

- **Primary**: Deep teal/navy — trust, travel, water (#0D4F5C or similar)
- **Accent**: Warm coral/sunset — energy, optimism (#E8734A or similar)
- **Neutrals**: Warm grey rather than cold grey. Sand tones for backgrounds.
- **Success**: Muted emerald (never neon green)
- **Warning**: Muted amber (never red for non-critical items)
- **Error**: Accessible red

The colour system should feel "travel" without being "airline blue" or "OTA orange."

### Typography

- **Headings**: Clean geometric sans-serif (Inter or similar — already in the stack)
- **Body**: Readable at 16px minimum
- **Numbers**: Tabular-nums for all prices, dates, scores
- **Hierarchy**: Clear. Two weights (regular + bold). No light weights in body text.

### Spacing

- Generous whitespace. Content density is lower than Skyscanner/Booking.com.
- Card padding: 24px (desktop), 16px (mobile).
- Section spacing: 80px (desktop), 48px (mobile).

### Cards

- Rounded (12-16px border radius), subtle border, very light shadow on hover.
- No "glow" effects. No gradient borders.
- Information hierarchy inside card: icon → title → key data → action.

### Navigation

- **Desktop**: Clean horizontal nav. No dropdowns over 5 items. Active state: subtle underline or colour shift.
- **Mobile**: Bottom nav with 5 icons. Hamburger for secondary items. No floating "Filters" button (that's the old flight-search paradigm).

### Icons

- Lucide React (already in project). Consistent 24px grid.
- Use travel-specific icons sparingly. Not every section needs a plane icon.
- The "travel" feel should come from imagery and colour, not icon overload.

### Imagery

- Destination photography: high-quality, authentic, not stock-photo-generic.
- Avoid: photos of laptops in cafes, generic beaches, overused landmarks.
- Use: real traveller photography, local detail shots, geographic diversity.
- Human imagery: real travellers, not models. Diversity in age, ethnicity, family structure.

### Animation

- **Subtle**. Framer Motion (already in project).
- Page transitions: fade (keep current — it works).
- Scroll reveals: gentle fade-up.
- No: bounce, spin, pulse, or attention-grabbing animations.
- The readiness score counting up is the most animated element — and even that should be calm.

### Mobile Design

- Full-width layouts. No side margins under 16px.
- Bottom nav (already exists — `BottomNav.tsx` — update items).
- Touch targets: minimum 44px (Apple HIG) / 48px (Material).
- No horizontal scroll unless it's a deliberate card carousel.
- Forms: full-width stacked, not side-by-side.
- Typography scales down proportionally but maintains readability.

### Accessibility

- Colour contrast: all text/background combinations ≥ 4.5:1 (AA).
- Focus indicators: visible on all interactive elements.
- Screen reader: all icons have aria-labels. All images have alt text.
- Keyboard navigation: all interactive elements reachable via Tab.
- Reduced motion: respect `prefers-reduced-motion`.

### Trust Signals

- "We earn commissions from partners at no cost to you" — visible, not buried.
- No fake scarcity, no fake urgency, no countdown timers, no "only X left."
- Real data sources cited: "Flight prices from Travelpayouts."
- Government sources linked: "Visa information verified against official government websites."
- Secure: HTTPS. Padlock icon near document storage features. "Your documents are encrypted."

---

## SECTION 18 — Phased Roadmap

### Phase 0 — Preserve and Stabilise (Weeks 1-2)

**Objective**: Fix critical issues. Remove misleading features. Prepare for V2.

**Scope**:
- Remove all simulated/mock features (FlexibleDatesMatrix, UrgencyBadges, DealScoreBadge, PriceConfidence, RoutePage fake prices)
- Fix `arrive_time` mapping in travelpayouts.ts
- Add missing Edge Functions to `config.toml`
- Standardize currency handling
- Fix `getRedirectUrl` auth headers in travelApi.ts
- Fix sitemap route URLs

**Dependencies**: None
**Files affected**: `src/components/flights/FlexibleDatesMatrix.tsx`, `UrgencyBadges.tsx`, `DealScoreBadge.tsx`, `PriceConfidenceIndicator.tsx`, `src/pages/RoutePage.tsx`, `supabase/functions/_shared/travelpayouts.ts`, `supabase/config.toml`, `src/services/travelApi.ts`
**Deliverables**: Clean codebase with no simulated features. Stable existing functionality.
**Risks**: Breaking existing flight search (mitigate by keeping FlightResults.tsx operational until White Label is live).
**Complexity**: Low
**What NOT to build**: Any new V2 features. This is purely cleanup.

### Phase 1 — Brand and Homepage (Weeks 3-4)

**Objective**: Launch new brand direction and homepage. Signal the pivot.

**Scope**:
- New colour palette in Tailwind config
- New homepage with problem-selector layout (not search-centric hero)
- New navigation (desktop + mobile + footer)
- Updated logo treatment (or keep logo, update surrounding design)
- All misleading claims removed from homepage and static pages
- Updated meta tags, OG images

**Dependencies**: Phase 0 complete
**Files affected**: `tailwind.config.ts`, `src/pages/Index.tsx`, `src/components/home/HeroSection.tsx` (replace), `src/components/layout/Header.tsx`, `Footer.tsx`, `BottomNav.tsx`, `index.html`
**Deliverables**: Live new homepage at `bookingsfinder.com`
**Acceptance criteria**: Homepage has no simulated features, no fake urgency, problem-selector design, search form not dominant
**Risks**: SEO impact from major homepage change (mitigate: preserve key meta tags, canonical URL, structured data)
**Complexity**: Medium
**What NOT to build**: Any backend changes, trip workspace, readiness score

### Phase 2 — White Label Flights (Weeks 5-6)

**Objective**: Replace custom flight search with Travelpayouts White Label.

**Scope**:
- Configure `flights.bookingsfinder.com` subdomain with CNAME to Travelpayouts White Label
- Apply BookingsFinder branding to White Label
- Create new `/flights` landing page on main domain (explain + handoff)
- Redirect or archive current `FlightResults.tsx`
- Ensure affiliate marker is correctly configured
- Test cross-subdomain tracking

**Dependencies**: Travelpayouts White Label setup (apply for access if not already)
**Files affected**: New flight landing page, DNS configuration, `src/pages/FlightResults.tsx` (archive), `src/App.tsx` (route update)
**Deliverables**: `flights.bookingsfinder.com` live with White Label. `bookingsfinder.com/flights` as landing page.
**Acceptance criteria**: Flight search works end-to-end. Affiliate revenue tracking works. Branding consistent.
**Risks**: Travelpayouts White Label approval process. DNS propagation delay.
**Complexity**: Low-Medium
**What NOT to build**: Trip workspace integration with White Label (Phase 3+)

### Phase 3 — Trip Workspace (Weeks 7-10)

**Objective**: Build the core retention feature. Users can create and manage trips.

**Scope**:
- Trip creation (manual entry: destination, dates, name)
- Trip dashboard (timeline, basic readiness placeholder)
- Account system (login, register, profile)
- Database: `trips`, `trip_bookings`, `traveller_profiles` tables
- Email parsing for booking import (basic: structured forward → extract)
- New account page with trip list

**Dependencies**: Phase 2 complete (flights link from trip workspace)
**Files affected**: New pages (`/trips`, `/trips/:id`, `/trips/new`), new hooks, new components, new Edge Functions (email parsing), new database migrations
**Deliverables**: Working trip workspace. Users can create trip, see timeline, add bookings manually or via email.
**Acceptance criteria**: Trip creation < 30 seconds. Timeline renders correctly. Email parsing works for major airline confirmation formats (Qantas, Jetstar, Virgin, Emirates, Singapore Airlines).
**Risks**: Email parsing accuracy (mitigate: always show extracted data for user confirmation; allow manual correction)
**Complexity**: High
**What NOT to build**: Readiness score (Phase 4), document vault, trip sharing, premium features

### Phase 4 — Readiness and Action Centre (Weeks 11-13)

**Objective**: Add the core value proposition. Travellers know if they're ready.

**Scope**:
- Readiness Score algorithm (passport, visa, bookings, insurance, documents)
- Action Centre with deadline-driven items
- Database: `trip_readiness_checks`, `action_items`
- Email reminders for upcoming deadlines
- Trip countdown display

**Dependencies**: Phase 3 complete (needs trip data)
**Files affected**: New components (ReadinessScore, ActionCentre, ActionItem), new Edge Functions (readiness calculation, notification scheduling), new database migrations
**Deliverables**: Working readiness score for each trip. Action items with deadlines. Email reminders.
**Acceptance criteria**: Readiness score updates as user completes items. Email reminders sent on schedule. Score calculation covers at least: passport validity, visa requirement, booking confirmation, travel insurance.
**Risks**: Accuracy of readiness checks (visa rules especially). Mitigate: always cite sources, never present as authoritative.
**Complexity**: Medium
**What NOT to build**: Full visa database (use rules engine with curated data for top 20 destinations), smart packing list (Phase 6)

### Phase 5 — True Trip Cost (Weeks 14-15)

**Objective**: Differentiate with cost transparency.

**Scope**:
- Cost estimate engine (flight + baggage + visa + insurance + transfers + daily spend)
- Cost display on trip dashboard
- Breakdown view with adjustable parameters
- Affiliate links for each cost category
- Database: `cost_estimates`

**Dependencies**: Phase 3 (needs trip data), Phase 2 (needs flight prices)
**Files affected**: New components, new Edge Function, new database migrations
**Deliverables**: Working true trip cost estimate for each trip.
**Acceptance criteria**: Cost estimate includes at least 5 categories. Each category shows data source. "Estimate" label prominent. User can adjust parameters.
**Risks**: Accuracy expectations (mitigate: "estimate" labelling, not "quote")
**Complexity**: Medium
**What NOT to build**: Real-time price comparison across dates (Phase 7)

### Phase 6 — Intelligence and Automation (Weeks 16-20)

**Objective**: Add intelligence features and automation.

**Scope**:
- Smart packing list
- Visa and entry checker (curated data for top 50 destinations)
- Passport validity checker
- Destination recommendations based on history
- Flight status monitoring (basic)
- Disruption assistant (basic)

**Dependencies**: Phases 3-5 complete
**Files affected**: Multiple new components and Edge Functions
**Deliverables**: Working intelligence features
**Complexity**: High (breadth, not depth)
**What NOT to build**: AI trip planner (too complex, high hallucination risk), hotel search, transfer booking

### Phase 7 — Monetisation Expansion (Weeks 21-24)

**Objective**: Layer in additional revenue streams.

**Scope**:
- Premium subscription (unlimited trips, document vault, trip sharing, SMS)
- Insurance comparison and affiliate
- eSIM comparison and affiliate
- Travel document vault (encrypted storage)
- Trip sharing (basic)

**Dependencies**: Phases 3-6
**Files affected**: Payment integration, feature gating, new Edge Functions, document storage, sharing logic
**Deliverables**: Premium tier live. Insurance and eSIM affiliate revenue flowing.
**Complexity**: High
**What NOT to build**: Sponsored destinations (requires sales team), lead generation (legal complexity), hotel search (separate project)

---

## SECTION 19 — First 30-Day Build Plan

### Week 1 — Cleanup and Stabilise (Days 1-7)

**Goal**: Remove all problematic code. Fix critical bugs. Ship nothing new.

| Day | Task | Files |
|---|---|---|
| 1 | Remove FlexibleDatesMatrix, UrgencyBadges, DealScoreBadge, PriceConfidenceIndicator | Delete component files. Remove imports from FlightCard and FlightResults. |
| 2 | Fix RoutePage fake prices — replace with "View live prices" CTA | `src/pages/RoutePage.tsx` lines 52-55 |
| 3 | Fix `arrive_time` mapping in travelpayouts.ts | `supabase/functions/_shared/travelpayouts.ts` line 92 |
| 4 | Add missing functions to `supabase/config.toml`, fix `getRedirectUrl` auth headers | `supabase/config.toml`, `src/services/travelApi.ts` |
| 5 | Standardize currency defaults (single source) | `src/hooks/useFlightSearch.ts`, `supabase/functions/search-flights/index.ts`, `_shared/travelpayouts.ts` |
| 6 | Fix sitemap route URLs, remove misleading marketing claims from homepage | `supabase/functions/sitemap/index.ts`, `src/pages/Index.tsx` |
| 7 | Test everything. Deploy Phase 0. | All affected files |

### Week 2 — Brand Foundation (Days 8-14)

**Goal**: New colour palette, typography, global styles. No layout changes yet.

| Day | Task |
|---|---|
| 8 | Define and implement new colour palette in `tailwind.config.ts`. Update CSS custom properties. |
| 9 | Audit all pages for colour consistency with new palette. Fix contrast issues. |
| 10 | Update typography scale if needed. Ensure minimum 16px body text. |
| 11 | Update Header and Footer with new nav structure (content only, not full redesign). |
| 12 | Update BottomNav items. |
| 13 | Update `index.html` meta tags, OG image placeholder. |
| 14 | Test on mobile. Deploy brand foundation. |

### Week 3 — New Homepage (Days 15-21)

**Goal**: Ship new homepage design.

| Day | Task |
|---|---|
| 15 | Build new Hero section (problem-statement, not search form). |
| 16 | Build Problem Selector section (6-card grid). |
| 17 | Build Travel Readiness and True Trip Cost value demo sections. |
| 18 | Build Destination Discovery section (using real price data from existing API). |
| 19 | Build compact search section + How It Works + Tools grid. |
| 20 | Build Trust + Email Capture + Footer sections. |
| 21 | Test all sections, mobile responsiveness. Deploy new homepage. |

### Week 4 — White Label Setup + Flight Handoff (Days 22-30)

**Goal**: Get White Label configured. Replace flight results page.

| Day | Task |
|---|---|
| 22 | Apply for/setup Travelpayouts White Label. Configure CNAME. |
| 23 | Build `/flights` landing page explaining the search experience with handoff. |
| 24 | Test White Label with prefilled parameters. Verify affiliate marker. |
| 25 | Archive current FlightResults and related components (keep files, remove routes). |
| 26 | Create redirect from old `/flights?params` to White Label search with prefilled params. |
| 27 | Test cross-subdomain cookie/tracking. |
| 28 | Update App.tsx routes. Update sitemap. |
| 29 | Full integration test: homepage → flight landing → White Label → booking → redirect. |
| 30 | Deploy Phase 2. Monitor. Fix issues. |

**Deliverable at Day 30**: Clean codebase with no simulated features. New homepage live. Flight search via White Label. Ready to begin Phase 3 (Trip Workspace).

---

## SECTION 20 — Final Recommendation

### Final Product Definition

BookingsFinder V2 is a **travel readiness platform** that helps independent travellers plan, prepare, and manage their trips in one organised workspace. Flight booking is one feature inside the platform — handled by Travelpayouts White Label at a subdomain — not the defining experience. The platform earns trust through radical transparency (no fake urgency, no simulated intelligence, clear affiliate disclosure) and earns revenue through affiliate commissions on bookings and premium subscriptions for advanced features.

### Final Positioning

> "BookingsFinder helps you know exactly what you need, what it costs, and when to act — so you travel ready."

### Recommended MVP

| Capability | Status |
|---|---|
| New homepage with problem-selector design | ✅ MVP |
| Flight search via Travelpayouts White Label at `flights.bookingsfinder.com` | ✅ MVP |
| Trip Workspace (create, save, timeline) | ✅ MVP |
| Travel Readiness Score + Action Centre | ✅ MVP |
| True Trip Cost estimate | ✅ MVP |
| Email-based booking import | ✅ MVP |
| Account system (register, login, profile) | ✅ MVP |

### Recommended Homepage Structure

1. Hero (problem statement + dual CTA: "Plan new trip" / "Organise existing trip")
2. Problem Selector (6 intent cards)
3. Travel Readiness demo
4. True Trip Cost demo
5. Destination Discovery (real price data)
6. Compact Flight Search
7. How It Works
8. Popular Tools grid
9. Testimonials
10. Email Capture
11. Footer

### Top 5 Features to Build First

1. **New homepage** — signals the pivot, captures intent, builds email list
2. **Travelpayouts White Label** — fixes the fundamental search problem, monetises immediately
3. **Trip Workspace** — core retention, the reason users come back
4. **Readiness Score** — core value proposition, differentiates from all competitors
5. **Email booking import** — reduces friction, demonstrates intelligence, feeds trip data

### Top 5 Features to Defer

1. AI trip planner — high hallucination risk, needs human-in-loop, complex
2. Hotel search — separate integration, lower priority than flights
3. Document vault — privacy complexity, premium feature, not MVP
4. Trip sharing — network effects needed first, build after solo use cases
5. Flight status monitoring — needs real-time API, post-MVP

### Top 5 Current Assets to Keep

1. Supabase infrastructure (auth, database, Edge Functions, storage)
2. Destination/country landing page system (SEO value, generated content)
3. Airport search with fuzzy matching (reusable for trip creation)
4. Price calendar and popular directions (real Travelpayouts data for destination pages)
5. Affiliate redirect interstitial page (FTC-compliant, well-designed)

### Top 5 Systems to Remove

1. Custom flight search UI (FlightResults, FlightCard, filters, sorting — replaced by White Label)
2. All simulated features (FlexibleDatesMatrix, UrgencyBadges, DealScoreBadge, PriceConfidenceIndicator)
3. Fake route page price generation
4. Inconsistent currency handling across 6 layers
5. "search-flights" Edge Function (replaced by White Label)

### Biggest Product Risk

**Trust destruction from simulated features.** If a user or journalist discovers that the "Flexible Dates" prices are `Math.random()`, the "seats left" is `Math.sin()`, and the "Price Confidence" has nothing to do with historical data, trust in the entire platform evaporates. This must be remediated before any V2 launch.

### Biggest Technical Risk

**Travelpayouts White Label approval and configuration.** If the White Label is not approved, delayed, or lacks the necessary customisation, flight search remains stuck on the current broken architecture. Mitigate by starting White Label application immediately (Week 4 of 30-day plan) and having a fallback plan (keep current search functional with fixes until White Label is live).

### Biggest Trust Risk

**Visa and entry requirement accuracy.** Incorrect visa information can ruin a trip and create liability. Mitigate by: never generating visa advice with AI, always citing official government sources, using clear disclaimers, and starting with a small curated set of high-traffic routes before scaling.

### Clearest Monetisation Opportunity

**Flight affiliate revenue through White Label.** This is the most immediate, proven, and scalable revenue stream. The affiliate relationship already exists (MARKER_ID in Edge Functions). Moving to White Label increases booking conversion by providing a better search experience. All other monetisation (insurance, eSIM, premium) is secondary to this.

### Recommended Immediate Next Task

**Apply for Travelpayouts White Label access.** While waiting for approval, execute Phase 0 (remove all simulated features and fix critical bugs). Phase 0 should take 1 week and leaves the current site stable and trustworthy. Phase 1 (new homepage) can start in parallel with White Label approval.

---

*Blueprint completed 2026-07-19. Based on architectural inspection of the complete BookingsFinder codebase and Travelpayouts API integration.*
*All recommendations verified against existing repository structure, files, and implementation patterns.*
