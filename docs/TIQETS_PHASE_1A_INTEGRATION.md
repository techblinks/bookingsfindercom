# Tiqets Phase 1A Integration

## Current Permissions

| Permission | Status |
|---|---|
| Content API | ✓ |
| Availability & Pricing API | ✓ |
| Reporting API (through Essential API) | ✓ |
| Booking API | ✗ |
| RSA key | ✗ |
| Images API | May not yet be enabled |
| Reviews API | May not yet be enabled |
| Recommendations API | May not yet be enabled |

## Architecture

- **Server-side only**: Edge Function `tiqets-catalog` proxies the Tiqets Content API.
- **Shared client**: `_shared/tiqets-client.ts` centralizes authentication, timeouts, and error handling.
- **Frontend**: `src/services/tiqets.ts` calls the Edge Function through the Supabase client.
- **Admin page**: `src/pages/AdminTiqets.tsx` at route `/admin/tiqets`.
- **Types**: `src/types/tiqets.ts` with strict models.

## Secret Names

- `TIQETS_API_TOKEN` — stored in Supabase project secrets.
- `TIQETS_API_BASE_URL` — optional; defaults to `https://api.tiqets.com/v2`.

## Server-Only Credential Rule

- The token is read **only** inside `supabase/functions/_shared/tiqets-client.ts`.
- It **never** appears in frontend bundles.
- It **never** appears in logs.
- It **never** is returned in API responses.

## Official Endpoint(s) Used

- `GET /products` — Tiqets Content API v2
- Authentication: `Authorization: Token <API_TOKEN>` header

## Normalized Response Model

The Edge Function normalizes Tiqets product fields into a BookingsFinder product model containing:

- `id`, `title`, `tagline`, `city`, `country`, `venue`
- `saleStatus`, `rating` (average + count)
- `wheelchairAccessible`, `skipTheLine`
- `minPrice` (amount + currency)
- `productUrl`
- `images` (url, width, height, credit)

Only fields genuinely returned by Tiqets are included.

## Rate-Limit Behaviour

- Respects the `Retry-After` header from upstream.
- No uncontrolled automatic retries.
- Upstream timeout: **8 seconds**.
- Capped page size: **20**.

## Current Non-Durable Cache

- In-memory `Map` in the Edge Function.
- **30-second TTL**.
- Not shared across Function instances.
- For admin proof-of-concept only — **not production-grade**.

## Missing Features (Pending Permissions)

- Images API (image URLs may not be populated)
- Reviews API
- Recommendations API
- No Booking API access
- No RSA key for booking authentication

## Deployment Steps

1. Set `TIQETS_API_TOKEN` in Supabase project secrets.
2. Optionally set `TIQETS_API_BASE_URL`.
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy tiqets-catalog
   ```
4. Deploy the frontend build.

## Manual Test Steps

1. Navigate to `/admin/tiqets` as admin.
2. Click **"Test Connection"** — verify a green checkmark appears.
3. Select a language; optionally set a destination ID.
4. Click **"Load Products"** — verify product cards render.
5. Verify the empty state with an unknown destination ID.
6. Verify the error state by temporarily removing the token.

## Next Phase 1B Scope

- Public Things to Do page
- Images API integration (once enabled)
- Durable caching strategy
- Destination search/browse
- Category filtering
- Affiliate link construction (when available)
