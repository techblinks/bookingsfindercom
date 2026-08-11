# Tiqets Phase 1B — Public Experience

## Overview

Phase 1B delivers the public-facing **Things to Do** page at `/things-to-do`. Unlike Phase 1A's admin-only proof-of-concept, this page is fully indexable, SEO-optimised, and designed for casual travellers browsing attractions.

| Aspect | Phase 1A (Admin) | Phase 1B (Public) |
|---|---|---|
| Route | `/admin/tiqets` | `/things-to-do` |
| Auth required | Admin role | None |
| Indexable | No (`noindex,nofollow`) | Yes |
| Edge Function | `tiqets-catalog` | `tiqets-public` (new) |
| Cache strategy | 30s in-memory Map | 5min in-memory Map (migration-ready) |
| Affiliate links | Plain `product_url` | `rel="sponsored"` + `target="_blank"` |
| Analytics | None | `experience-click` fire-and-forget |

---

## Page Architecture

### Route: `/things-to-do`

```
Route placement (in App.tsx):
  <Route path="/things-to-do" element={<ThingsToDo />} />  ← BEFORE catch-all
  <Route path="/:slug" element={<CountryLandingPage />} />  ← catch-all
```

The route must be placed **before** the `/:slug` catch-all to prevent slug-parsing collisions.

### Component tree

```
ThingsToDo (page)
├── Helmet (canonical, meta, structured data)
├── Hero Section (navy gradient, h1, search bar)
├── Trust Strip (4 brand-value points)
├── Featured Products Grid (server-controlled, loads on mount)
│   └── ProductCard[] (image, title, rating, price, badges, credit)
├── Load More Button (pagination via URL search params)
├── How It Works Section (3-step explainer)
├── Cross-Sell Links (flights, hotels, trip-cost)
├── Transparency Section (affiliate disclosure snippet)
└── Empty / Error / Loading states
```

### Separation from admin

| Concern | Admin (`AdminTiqets`) | Public (`ThingsToDo`) |
|---|---|---|
| Edge Function | `tiqets-catalog` (admin-only, POST, auth gated) | `tiqets-public` (no-auth, POST, validated inputs) |
| Destination picker | Manual numeric ID | Search-autocomplete or curated city list |
| Diagnostics panel | Yes (`<details>`) | No |
| Health check | Yes (`/health` action) | No |
| Sale status filter | Visible dropdown | Hidden from users |
| Language selector | Visible | Auto-detected or hidden |

---

## Visual Decisions

All visual choices reinforce the BookingsFinder brand identity:

| Element | Decision | Reason |
|---|---|---|
| Hero background | Navy gradient (`#0a1628` → `#0d2137`) | Matches homepage hero; signals trust |
| Hero CTA colour | Orange (`#f97316` / Tailwind `orange-500`) | Consistent brand accent across all CTAs |
| Card background | White with `border` and `rounded-lg` | Readable on light backgrounds |
| Rating stars | `fill-yellow-400` | Universal recognition |
| Feature badges | Gray `secondary` variant, `text-xs` | Non-intrusive, informative |
| "View Deal" link | Blue underline, `rel="sponsored"`, new tab | Standard affiliate pattern |
| Trust strip icons | Lucide `ShieldCheck`, `Eye`, `Sparkles`, `Globe` | Familiar iconography |
| Font | System stack via Tailwind (`font-sans`) | Performance; no custom font load |
| Reduced motion | `prefers-reduced-motion` respected by framer-motion | WCAG 2.1 AA |

---

## Official API Parameters

The `tiqets-public` Edge Function exposes two modes:

### 1. `featured` mode (server-controlled)

```json
{ "action": "products", "featured": true }
```

Returns a curated set of products. The server decides which products and how many. The client does not pass `destination_id`, `page`, or `sale_status`.

### 2. `search` mode (user-driven)

```json
{
  "action": "products",
  "query": "eiffel tower",
  "page": 1,
  "page_size": 10
}
```

**Validation rules** (Zod schema in Edge Function):

| Parameter | Constraint |
|---|---|
| `query` | `string.min(1).max(200)`, sanitised (no HTML injection) |
| `page` | `number.int().min(1).max(100)` |
| `page_size` | `number.int().min(1).max(20)` |
| `language` | `enum(["en","nl","fr","de","it","es","pt","ja","zh"])` |

`destination_id` and `sale_status` are **not** exposed in public mode — they are admin-only.

---

## Normalized Fields (Official Tiqets Schema)

The Edge Function normalizes upstream Tiqets responses into a consistent BookingsFinder shape. Every field maps directly to an official Tiqets Distributor API v2 field.

| BookingsFinder field | Tiqets upstream field | Type |
|---|---|---|
| `id` | `id` | `string` (numeric IDs stringified) |
| `title` | `title` | `string` |
| `tagline` | `tagline` | `string \| null` |
| `city_name` | `city.name` | `string \| null` |
| `country_name` | `city.country.name` | `string \| null` |
| `venue` | `venue.name` | `string \| null` |
| `saleStatus` | `sale_status` | `"on_sale" \| "sold_out" \| "cancelled" \| null` |
| `ratings.average` | `rating.average` | `number \| null` |
| `ratings.total` | `rating.count` | `number \| null` |
| `price.amount` | `min_price.amount` | `number \| null` |
| `price.currency` | `min_price.currency` | `string \| null` |
| `wheelchair_access` | `wheelchair_accessible` | `boolean \| null` |
| `skip_line` | `skip_the_line` | `boolean \| null` |
| `product_url` | `product_url` | `string \| null` |
| `images[].smallUrl` | `images[].small` | `string` (URL-validated) |
| `images[].mediumUrl` | `images[].medium` | `string` (URL-validated) |
| `images[].largeUrl` | `images[].large` | `string` (URL-validated) |
| `images[].extraLargeUrl` | `images[].extra_large` | `string` (URL-validated) |
| `images[].altText` | `images[].alt_text` | `string \| null` |
| `images[].credit` | `images[].credit` | `string \| null` |

**Image URL validation**: Only `https://aws-tiqets-cdn.imgix.net/*` URLs pass. All other schemes and hostnames are rejected (empty string).

---

## Cache Design

### Phase 1B: In-Memory Map

```typescript
// Inside tiqets-public Edge Function
const cache = new Map<string, { data: unknown; ts: number }>();
const TTL_MS = 5 * 60 * 1000; // 5 minutes

function cacheKey(action: string, params: Record<string, unknown>): string {
  return `${action}:${JSON.stringify(params)}`;
}
```

| Property | Value |
|---|---|
| Storage | In-memory `Map` (per Function instance) |
| TTL | 5 minutes |
| Key format | `products:{"featured":true}` or `products:{"query":"paris","page":1}` |
| Warm-up | Featured products are pre-fetched on Function cold start via a lightweight health-check ping |
| Invalidation | Automatic via TTL expiry; no manual bust |

### Migration Path to DB Cache

The cache key is designed for direct migration to a `tiqets_public_cache` table:

```sql
-- Migration document (do not apply yet):
CREATE TABLE IF NOT EXISTS tiqets_public_cache (
  cache_key   TEXT PRIMARY KEY,
  payload     JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tiqets_public_cache_expires ON tiqets_public_cache (expires_at);
```

This migration is documented but **not applied** in Phase 1B. The Map-based cache provides sufficient performance for launch traffic.

---

## Security Boundaries

| Boundary | Rule |
|---|---|
| HTTP method | `POST` only — `GET`, `PUT`, `DELETE`, `PATCH` return `405` |
| Input validation | Zod schema rejects all malformed/invalid payloads before any upstream call |
| Token exposure | `TIQETS_API_TOKEN` read only via `Deno.env.get()` inside the Edge Function; never returned in responses |
| CORS | `Access-Control-Allow-Origin: https://bookingsfinder.com` (and `localhost` for dev) |
| Rate limiting | Respects upstream `Retry-After` header; returns `429` to client |
| Upstream timeout | 8-second `AbortController` |
| HTML in titles | Preserved as string; React handles XSS via JSX escaping — no `dangerouslySetInnerHTML` |
| Image URLs | Strict hostname allowlist (`aws-tiqets-cdn.imgix.net` only) |
| product_url | Passed through as-is from Tiqets; always opened with `rel="noopener sponsored"` |

---

## Affiliate Handoff

When a user clicks "View Deal" on a product card:

```tsx
<a
  href={product.product_url}
  target="_blank"
  rel="noopener sponsored"
  onClick={() => logExperienceClick(product.id, product.title)}
>
  View Deal on Tiqets
  <ExternalLink className="h-3 w-3 ml-1" />
</a>
```

| Attribute | Value | Reason |
|---|---|---|
| `target` | `_blank` | Opens Tiqets in new tab; user doesn't lose BookingsFinder |
| `rel` | `noopener sponsored` | Prevents `window.opener` attacks; signals affiliate relationship to search engines |
| `onClick` | `logExperienceClick()` | Fire-and-forget analytics (see below) |

---

## Analytics Design

### `experience-click` Event

Fire-and-forget — never blocks navigation, never throws.

```typescript
async function logExperienceClick(
  productId: string,
  productTitle: string,
): Promise<void> {
  try {
    await supabase.from("click_events").insert({
      session_id: getSessionId(),
      partner: "tiqets",
      partner_type: "experience",
      route: productTitle,        // human-readable label
      device: getDevice(),
      landing_page: "/things-to-do",
    });
  } catch (err) {
    console.warn("[analytics] experience-click failed:", err);
  }
}
```

| Field | Value |
|---|---|
| `partner` | `"tiqets"` |
| `partner_type` | `"experience"` (new enum value, distinct from `"flight"` / `"hotel"`) |
| `route` | Product title (descriptive, not an IATA code) |
| `white_label_used` | `false` |
| `fallback_used` | `false` |

### Search event

When a user submits a search:

```typescript
await supabase.from("search_events").insert({
  session_id: getSessionId(),
  destination: searchQuery,   // free-text query
  device: getDevice(),
  landing_page: "/things-to-do",
});
```

---

## Accessibility

| Requirement | Implementation |
|---|---|
| Heading hierarchy | `h1` (hero) → `h2` (sections: Featured, How It Works, etc.) → `h3` (card titles) |
| Alt text | Every product image uses `images[].altText` or falls back to `product.title` |
| Keyboard navigation | All interactive elements (search, cards, "Load More") are focusable; `Enter`/`Space` activate |
| Screen readers | Search input has `aria-label="Search attractions"`; cards have `role="article"` |
| Reduced motion | `useReducedMotion()` from framer-motion; page transitions respect `prefers-reduced-motion: reduce` |
| Colour contrast | Navy hero text on light background meets 4.5:1 ratio; orange CTAs pass on white |
| Error messages | `role="alert"` on error banners; live-region announcements for async state changes |

---

## SEO

| Element | Value |
|---|---|
| Canonical URL | `<link rel="canonical" href="https://bookingsfinder.com/things-to-do" />` |
| Meta title | `Things to Do — Find Tours, Attractions & Experiences | BookingsFinder` |
| Meta description | `Discover the best tours, attractions and experiences worldwide. Compare ratings, skip-the-line access, and wheelchair-friendly options — all in one place.` |
| `og:title` | Same as meta title |
| `og:description` | Same as meta description |
| `og:image` | First featured product image or site default |
| Structured data | `@type: CollectionPage` with `ItemList` of products (JSON-LD) |
| `robots` | `index, follow` (default, not explicitly set) |

### Structured Data Example

```json
{
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  "name": "Things to Do — Tours, Attractions & Experiences",
  "description": "Discover the best tours and attractions worldwide.",
  "url": "https://bookingsfinder.com/things-to-do",
  "mainEntity": {
    "@type": "ItemList",
    "itemListElement": [
      {
        "@type": "TouristAttraction",
        "position": 1,
        "name": "Eiffel Tower Skip-the-Line",
        "aggregateRating": { "@type": "AggregateRating", "ratingValue": "4.6", "reviewCount": "2840" }
      }
    ]
  }
}
```

---

## Migrations

### `tiqets_public_cache` (Document Only — Do Not Apply)

```sql
-- File: supabase/migrations/YYYYMMDDHHMMSS_tiqets_public_cache.sql
-- Status: DOCUMENT ONLY for Phase 1B

CREATE TABLE IF NOT EXISTS tiqets_public_cache (
  cache_key   TEXT PRIMARY KEY,
  payload     JSONB NOT NULL,
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tiqets_public_cache_expires
  ON tiqets_public_cache (expires_at);

COMMENT ON TABLE tiqets_public_cache IS
  'Public Tiqets cache for /things-to-do. Phase 1C+ migration target.';
```

This migration exists only as documentation. Phase 1B uses the in-memory Map. Apply this migration when traffic patterns justify DB-backed caching (Phase 1C or later).

---

## Deployment Order

1. **Normalizer**: Update `_shared/tiqets-client.ts` to support `city_name`, `country_name`, `ratings.average`, `ratings.total`, `price`, `wheelchair_access`, `skip_line` normalised field names (in addition to existing camelCase variants for backward compatibility).

2. **Edge Function**: Create `supabase/functions/tiqets-public/index.ts`:
   - POST-only, no auth required
   - Zod validation for `featured` and `search` actions
   - Map-based cache with 5-minute TTL
   - Calls `_shared/tiqets-client.ts`

3. **Frontend page**: Create `src/pages/ThingsToDo.tsx` with all sections.

4. **Route**: Add `<Route path="/things-to-do" element={<ThingsToDo />} />` to `App.tsx` **before** the `/:slug` catch-all.

5. **Deploy**:
   ```bash
   supabase functions deploy tiqets-public
   npm run build
   npm run deploy   # or wrangler deploy
   ```

---

## Local Testing Steps

1. **Start dev server**: `npm run dev`
2. **Navigate** to `http://localhost:5173/things-to-do`
3. **Verify hero**: Navy gradient background, orange search CTA, `h1` heading
4. **Verify featured products** load on mount (no user action required)
5. **Type a search** (e.g., "paris") and submit — verify URL updates to `/things-to-do?q=paris`
6. **Verify product cards**: Image, title, rating, price, badges render
7. **Click "View Deal"** — verify new tab opens with `rel="sponsored"`
8. **Verify "Load More"** loads next page (URL `?q=paris&page=2`)
9. **Clear search** — verify featured products reload
10. **Verify trust strip**: 4 icons with labels render
11. **Verify How It Works**: 3 steps render
12. **Verify cross-sell**: Links to `/flights`, `/hotels`, `/trip-cost`
13. **Test edge**: Disconnect network → error state with retry button
14. **Test empty**: Search for "zzzzzzxzxzxz" → "No experiences found" empty state

---

## Production Smoke Test Steps

1. **Deploy** Edge Function and frontend build.
2. **Visit** `https://bookingsfinder.com/things-to-do`
3. **Check `<head>`**:
   - Canonical tag present
   - Meta description present
   - Structured data (JSON-LD) present
   - No `noindex` meta tag
4. **Lighthouse audit**: Target ≥ 90 Performance, 100 Accessibility, 100 SEO
5. **Verify caching**: Second page load within 5 minutes should use cached data (no upstream API call)
6. **Click "View Deal"**: Confirm `rel="sponsored"` in rendered HTML; analytics event fires (check `click_events` table)
7. **Search for "london"**: URL updates, results render, "Load More" paginates
8. **Mobile**: Hero stacks vertically, cards are full-width, bottom nav includes "Experiences" link
9. **No console errors**: Open DevTools → Console → zero errors or warnings
10. **Crawl test**: `curl -I https://bookingsfinder.com/things-to-do` returns `200` with correct `Content-Type`

---

## Phase 1C Scope

| Feature | Description |
|---|---|
| City pages | `/things-to-do/paris`, `/things-to-do/new-york` — destination-specific attraction listings with localised hero images |
| Attraction detail page | `/things-to-do/attraction/:id` — full product details, image gallery, expanded description |
| Checkout info | `/things-to-do/checkout/:id` — what to expect when completing booking on Tiqets (transparency page) |
| Availability calendar | Embedded availability widget (requires Availability & Pricing API; pending permission confirmation) |
| DB-backed cache | Migrate from in-memory Map to `tiqets_public_cache` table |
| Category filtering | Filter by category (museums, tours, outdoor, etc.) via Tiqets Content API category endpoint |
| Image gallery lightbox | Click-to-expand image viewer on attraction detail page |
| Server-side rendering | Pre-render city pages at build time for SEO (Phase 1D) |
