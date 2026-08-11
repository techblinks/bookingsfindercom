# Things to Do — Multi-Provider Architecture

## Status

- **Tiqets**: Live, connected to Content API via `tiqets-public` Edge Function
- **Viator**: Admin POC complete; **public provider DISABLED** pending Sandbox key replacement
- `VIATOR_PUBLIC_ENABLED = false` (compile-time flag in `src/types/experiences.ts`)

## Provider-Neutral Model

`src/types/experiences.ts` defines `ExperienceProduct` — a unified model that both Tiqets and Viator products are adapted into:

| Field | Source (Tiqets) | Source (Viator) |
|-------|----------------|-----------------|
| `provider` | `"tiqets"` | `"viator"` |
| `providerProductId` | `id` | `productCode` |
| `title` | `title` | `title` |
| `description` | N/A (null) | `description` |
| `city` | `city_name` | `destinations[0].name` |
| `rating` | `ratings.average` | `reviews.combinedAverageRating` |
| `reviewCount` | `ratings.total` | `reviews.totalReviews` |
| `price` | `price.amount` | `pricing.summary.fromPrice` |
| `outboundUrl` | `product_url` (HTTPS tiqets.com only) | `productUrl` (HTTPS viator.com only, preserved exactly) |
| `features.freeCancellation` | null | `flags.includes("FREE_CANCELLATION")` / null |
| `features.likelyToSellOut` | null | `flags.includes("LIKELY_TO_SELL_OUT")` / null |
| `features.skipLine` | `skip_line` | null |
| `features.wheelchairAccessible` | `wheelchair_access` | null |

**Null means unknown** — never converted to false unless the API explicitly guarantees it.

## Tiqets Adapter

Location: `src/services/experiences.ts` — `adaptTiqetsProduct()`

Maps the existing `BookingsFinderTiqetsProduct` (from `tiqets-public` Edge Function) to `ExperienceProduct`. Fields not available in Tiqets Basic Access are set to `null` (`description`, `freeCancellation`, `likelyToSellOut`).

The Tiqets Edge Function (`tiqets-public`) continues to operate normally — no schema changes needed.

## Viator Adapter

### Server-Side Normalizer

`supabase/functions/_shared/viator-normalizer.ts` normalizes raw Viator Basic Access `/products/search` responses into `NormalizedViatorProduct`.

### Image Handling

- Validates HTTPS only
- Allows `viator.com`, `tripadvisor.com`, and `*.viator.com`, `*.cdn.viator.com` hosts
- Rejects `javascript:`, `data:`, `blob:`, `file:`, `localhost`
- Prefers medium/large images suitable for 16:10 cards

### Mock Fixtures

`src/__fixtures__/viator-products.ts` — 8 realistic mock products for development/testing. Never exposed in production.

## Basic Access Limitations

Viator Basic Access is **non-transactional**. Bookings are completed on Viator.com. The API provides:
- `/products/search` — catalogue search
- `/products/{productCode}` — single product detail
- `/destinations` — taxonomy (future)
- `/products/tags` — tag metadata (future)

No Booking API endpoints are called.

## Viator Public Provider — Currently Disabled

`VIATOR_PUBLIC_ENABLED = false` prevents:
- Any Viator network request from the browser
- Any Viator fixture data appearing in production
- Any Viator-related API calls

When `true` (after Sandbox key replacement):
- The aggregator service (`searchExperiences`) will call both Tiqets and Viator
- Viator results will be adapted via the normalizer and merged with Tiqets
- Provider identity is preserved on each product card

## Outbound URL Attribution

Each product's `outboundUrl` is preserved exactly as returned by its provider:
- Tiqets: `https://www.tiqets.com/...` (with partner attribution)
- Viator: `https://www.viator.com/tours/...` (with Viator affiliate tracking)

URLs are validated for HTTPS and correct hostname before passing to the browser. Links open with `rel="sponsored noopener noreferrer" target="_blank"`.

## Provider Failure Isolation

One provider failing (e.g. Viator timeout) must never blank-screen the page. The aggregator returns `ProviderAvailability`:
```json
{ "tiqets": "available", "viator": "unavailable" }
```

Tiqets remains the primary provider — if it fails, an error state is shown.

## Future Work

### Destination Taxonomy
Viator's `/destinations` endpoint provides city/tree metadata. This will power real city autocomplete and destination filtering.

### Tag Ingestion
`/products/tags` provides activity category metadata. This replaces the current free-text keyword shortcuts with genuine tag-based filtering.

### Duplicate Detection Strategy
Products from different providers with the same normalized attraction name + destination + coordinates (when available) may be deduplicated. No fuzzy title matching will be applied — only exact normalized matches based on structured identifiers.

### Replacement Sandbox Key Activation Steps
1. Set `VIATOR_API_KEY` in Supabase project secrets
2. Verify `/admin/viator` health check passes (product search returns 200)
3. Set `VIATOR_PUBLIC_ENABLED = true` in `src/types/experiences.ts`
4. Deploy `viator-catalog` Edge Function
5. Deploy frontend build
6. Verify Viator results appear alongside Tiqets on `/things-to-do`
