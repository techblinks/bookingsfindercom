# Supabase Independence Audit — BookingsFinder V2

**Branch**: `bookingsfinder-v2-supabase-independence`
**Date**: 2026-07-20
**Current Supabase Project**: Lovable-managed (`nrxupicbzblbxolyxksg`)

---

## 1. Current State

BookingsFinder V2 is tightly coupled to a Lovable-managed Supabase project. The project reference (`nrxupicbzblbxolyxksg`) appears in:

- **4 source files** as hardcoded fallback URLs
- **`supabase/config.toml`** as `project_id`
- **`.env`** file (tracked by Git) with the live project URL and anon key
- **Vite config** imports `lovable-tagger` (a dev-only Lovable utility)

The application cannot currently be deployed to a new Supabase project without code changes.

---

## 2. Lovable Dependencies

| Reference | Type | Action |
|---|---|---|
| `lovable-tagger` (v1.1.13) in `package.json` | Dev dependency | **Remove** — used only for Lovable's preview environment component tagging |
| `componentTagger` in `vite.config.ts` | Dev only (`mode === "development"`) | **Remove** — blocks Vite dev server without the package |
| Lovable-generated migration filenames (UUID format) | Historical | **Keep** — standard Supabase migrations, no functional dependency |

**Zero Lovable runtime dependencies remain after removing the tagger.**

---

## 3. Current Supabase Configuration

### Environment Variables (in `.env`)

| Variable | Source | Hardcoded | Git Tracked |
|---|---|---|---|
| `VITE_SUPABASE_PROJECT_ID` | `.env` | Yes | **Yes — security risk** |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `.env` | Yes | **Yes — security risk** |
| `VITE_SUPABASE_URL` | `.env` | Yes | **Yes — security risk** |

### Hardcoded Fallback URLs

These files use `import.meta.env.VITE_SUPABASE_URL || "https://nrxupicbzblbxolyxksg.supabase.co"`:

1. `src/components/sections/PopularRoutes.tsx` (line ~13)
2. `src/hooks/useFlightSearch.ts`
3. `src/hooks/usePriceCalendar.ts`
4. `src/services/travelApi.ts`

### Supabase Client

- **One central client** at `src/integrations/supabase/client.ts`
- Uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
- No service-role key in the browser client
- Auth config: localStorage persistence, auto-refresh enabled
- Imports from 30+ files via `@/integrations/supabase/client`

### VITE_SUPABASE_PUBLISHABLE_KEY Usage

Used in 3 files besides the client:
- `src/hooks/useFlightSearch.ts` — as auth fallback token and API key header
- `src/pages/AdminAlerts.tsx` — in a display note (truncated to 20 chars)

---

## 4. Database Inventory

### Tables (from `src/integrations/supabase/types.ts`)

| Table | Access Pattern | Source Files | RLS in Migrations |
|---|---|---|---|
| `ad_placements` | SELECT, INSERT, UPDATE | AdminAds, useAds, useHomeAds | `WITH CHECK (true)` |
| `admin_profiles` | SELECT, INSERT, UPDATE | AdminAuth | None found |
| `affiliate_clicks` | INSERT | travelApi | `WITH CHECK (true)` |
| `authorized_admins` | SELECT | AdminAuth | Admin-only |
| `blog_posts` | SELECT, INSERT, UPDATE, DELETE | Blog, BlogPost, AdminBlog | None found |
| `country_landing_pages` | SELECT, INSERT, UPDATE, DELETE | AdminCountryPages, CountryPage, useCountryPage | None found |
| `optimizer_requests` | INSERT, SELECT | useOptimizer | User-scoped RLS |
| `optimizer_results` | SELECT, INSERT | useOptimizer | `WITH CHECK (true)` |
| `press_releases` | SELECT, INSERT, UPDATE, DELETE | Press, PressRelease, AdminPress | None found |
| `price_history` | SELECT, INSERT | usePriceCalendar | `WITH CHECK (true)` |
| `route_price_cache` | SELECT, INSERT, UPDATE | PopularRoutes, DynamicDeals, usePriceAlerts | `WITH CHECK (true)` |
| `saved_searches` | SELECT, INSERT, UPDATE, DELETE | usePriceAlerts | User-scoped |
| `seo_route_pages` | SELECT, INSERT | RoutePage, AdminRouteGenerator | None found |
| `site_settings` | SELECT, INSERT, UPDATE | AdminSettings, useSiteSettings | `WITH CHECK (true)` |
| `subscribers` | SELECT, INSERT, UPDATE, DELETE | ExitIntentPopup, AdminSubscribers, etc. | `WITH CHECK (true)` |
| `subscriptions` | SELECT, INSERT, UPDATE | Pricing, Account, useSubscription | `WITH CHECK (true)` |
| `user_profiles` | SELECT, INSERT, UPDATE | Account, AdminAuth | User-scoped |
| `user_roles` | SELECT | useAdminAuth | None found |

### Database Functions (from generated types)

| Function | Purpose |
|---|---|
| `cleanup_expired_price_cache` | Scheduled cleanup |
| `has_role(user_id, role)` | RLS helper for admin checks |

### Enums & Triggers

- **Enums**: `app_role` enum type (admin, etc.) — defined in migrations
- **Triggers**: `on_auth_user_created_admin_check` — auto-creates admin profiles

### Edge Functions (25 total)

`check-price-alerts`, `create-checkout-session`, `generate-route-page`, `generate-seo-content`, `get-admin-stats`, `get-ads`, `get-popular-directions`, `get-price-calendar`, `get-redirect`, `get-route-prices`, `get-special-offers`, `get-subscription-status`, `publish-scheduled-pages`, `run-optimizer`, `search-airports`, `search-flights`, `search-hotels`, `send-bulk-email`, `send-price-alert`, `send-welcome-email`, `sitemap`, `stripe-webhook`, `track-affiliate-click`, `unsubscribe`

Shared utilities in `_shared/`: `cors.ts`, `helpers.ts`, `travelpayouts.ts`, `validation.ts`

Most functions have `verify_jwt = false` (publicly accessible).

### Storage

No storage bucket references found in frontend code. No storage migrations.

---

## 5. Authentication Inventory

### Methods
- Email/password (`signInWithPassword`, `signUp`)
- No magic link, no OAuth providers configured

### Auth Usage
- `useAdminAuth` hook: admin login
- `Account` page: user sign-in/sign-up
- `useSubscription`, `Pricing` page: Stripe integration
- Session persistence via localStorage

### Required Redirect URLs (for new project)
- `http://localhost:8080/**`
- `https://bookingsfinder.com/**`
- Any preview/staging domains

### Protected Routes
- `/account` — requires authentication
- `/admin/*` — requires admin role
- Most public pages (homepage, flights, trip-cost, blog) work without auth

---

## 6. Migration Completeness

### Classification: **Partially reproducible**

**Present in migrations (16 files):**
- All core tables with CREATE TABLE statements
- RLS policies (some permissive, some user-scoped)
- Enums (`app_role`)
- Triggers (`on_auth_user_created_admin_check`)
- Functions (`has_role`)
- Indexes on frequently queried columns

**Missing from migrations:**
- Storage bucket configuration (if used)
- Some RLS policies for tables like `blog_posts`, `admin_profiles`, `seo_route_pages`, `press_releases` — these appear in generated types but may not have explicit CREATE POLICY statements in migrations
- Edge Function secrets documentation

---

## 7. Security Concerns

| Issue | Severity | Detail |
|---|---|---|
| `.env` tracked by Git | **High** | Contains live project URL and anon key in Git history |
| Hardcoded fallback URLs | **Medium** | 4 files fall back to Lovable project if env var missing |
| Permissive RLS (`WITH CHECK (true)`) | **Medium** | Several tables allow unrestricted public inserts |
| `verify_jwt = false` on Edge Functions | **Medium** | Most functions publicly callable (some intentional: search, sitemap) |
| `VITE_SUPABASE_PUBLISHABLE_KEY` exposed in AdminAlerts UI note | **Low** | Truncated to 20 chars in a help note |

**No service-role key found in frontend code.** ✅

---

## 8. Required New-Project Configuration

### Environment Variables

```
VITE_SUPABASE_URL=https://[new-project-ref].supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=[new-anon-key]
```

### Optional (Edge Functions only)

Supabase project secrets for Edge Functions (Stripe keys, Travelpayouts API token, email service credentials, etc.).

### Manual Supabase Dashboard Steps

1. Create new project
2. Enable auth (email/password, optionally magic link)
3. Configure redirect URLs
4. Deploy Edge Functions (25 functions)
5. Set function secrets
6. Apply RLS policies
7. Configure storage (if needed)

---

## 9. SQL/Migration Execution Order

```
supabase db push
# or for manual:
supabase migration up
```

All 16 migrations in `supabase/migrations/` apply sequentially.

---

## 10. Type-Generation Command

```bash
supabase gen types typescript --project-id [new-project-ref] > src/integrations/supabase/types.ts
```

---

## 11. Items Requiring Old Project Access

- Data export (auth users, subscribers, blog posts, settings)
- Edge Function secrets retrieval
- Migration verification against live schema
- None of these are possible without project-owner access

---

## 12. Final Independence Checklist

- [ ] Remove `lovable-tagger` from `package.json`
- [ ] Remove `componentTagger` from `vite.config.ts`
- [ ] Remove hardcoded fallback URLs in 4 source files
- [ ] Create `.env.example` with safe placeholders
- [ ] Add `.env` to `.gitignore`
- [ ] Untrack `.env` from Git
- [ ] Owner creates new Supabase project
- [ ] Owner applies migrations to new project
- [ ] Owner regenerates database types
- [ ] Owner deploys Edge Functions
- [ ] Owner configures auth redirect URLs
- [ ] Owner populates `.env` with new project values
- [ ] Build passes
- [ ] Tests pass
- [ ] Production deployment works
