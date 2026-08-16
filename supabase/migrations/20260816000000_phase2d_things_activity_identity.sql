-- Phase 2D (T2D-A): BookingsFinder canonical activity identity + provider offers
-- ============================================================================
-- Foundation for stable, provider-independent activity URLs:
--
--   /things-to-do/:destinationSlug/:activitySlug
--
-- TWO concepts, never collapsed:
--
--   things_activities        — the activity BookingsFinder OWNS. Its identity
--                              (id, destination_slug, slug, canonical_title) is
--                              ours and stable; provider fields never appear.
--   things_activity_offers   — one provider's listing for that activity
--                              (provider + provider_product_id), explicitly
--                              provider-scoped. Many offers may later point at
--                              one canonical activity.
--
-- Provider IDs never define public URL identity: the canonical URL is built
-- from things_activities (destination_slug, slug) only.
--
-- LOCAL DEVELOPMENT ONLY. Do NOT apply remotely in this phase.
-- No deployment, no `supabase db push`, no remote migration.

-- ═══════════════════════════════════════════════════════════════════
-- 1. things_activities — canonical activity identity
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.things_activities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- BookingsFinder destination identity (a ThingsDestination slug).
  destination_slug   text NOT NULL,
  -- BookingsFinder canonical slug. Generated from the canonical title ONLY at
  -- creation time; a later title change must NEVER re-derive it (a stored
  -- column, deliberately — see note below).
  slug               text NOT NULL,
  -- BookingsFinder canonical title — BookingsFinder's own copy, not the
  -- provider's.
  canonical_title    text NOT NULL,
  -- Default draft: never indexable, never sitemap-published.
  publication_status text NOT NULL DEFAULT 'draft'
                     CHECK (publication_status IN ('draft', 'published', 'archived')),
  -- Honest verification/evidence record. No value means "not yet verified".
  verification       jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),

  -- Slugs are the same lowercase hyphen-separated contract as destination
  -- slugs. (POSIX regex — Postgres CHECK does not support (?:...) groups.)
  CONSTRAINT ck_things_activities_destination_slug CHECK (
    destination_slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  CONSTRAINT ck_things_activities_slug CHECK (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
  ),
  CONSTRAINT ck_things_activities_slug_length CHECK (
    char_length(slug) <= 80
  ),
  CONSTRAINT ck_things_activities_canonical_title CHECK (
    char_length(btrim(canonical_title)) > 0
  ),

  -- Final authority for the collision contract: an activity slug is unique
  -- WITHIN a destination. Two different destinations may reuse a slug; the
  -- same destination may not. Deterministic candidate generation happens in
  -- the application layer; this constraint is what makes a race impossible.
  CONSTRAINT ux_things_activities_destination_slug UNIQUE (destination_slug, slug)
);

CREATE INDEX IF NOT EXISTS ix_things_activities_destination_status
  ON public.things_activities (destination_slug, publication_status);

-- NOTE: unlike the provider catalogue cache (experience_products.slug, which
-- is GENERATED ALWAYS from the provider title), things_activities.slug is a
-- plain stored column. A canonical slug is immutable after creation: title
-- changes must not silently rewrite public URLs.

-- ═══════════════════════════════════════════════════════════════════
-- 2. things_activity_offers — provider-scoped offers for an activity
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.things_activity_offers (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  activity_id         uuid NOT NULL REFERENCES public.things_activities(id)
                      ON DELETE CASCADE,
  -- Currently known providers. Public URLs never name a provider — this
  -- column is for offer scoping only. Extend the list when a new provider is
  -- genuinely integrated; do NOT add speculative values.
  provider            text NOT NULL
                      CHECK (provider IN ('viator', 'tiqets')),
  -- The provider's own product ID — NEVER a BookingsFinder activity ID or
  -- slug, and NEVER a public URL suffix.
  provider_product_id text NOT NULL,
  -- Provider checkout URL (provider-scoped, never canonical).
  provider_url        text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT ck_things_activity_offers_product_id CHECK (
    char_length(btrim(provider_product_id)) > 0
  ),
  CONSTRAINT ck_things_activity_offers_url CHECK (
    provider_url IS NULL OR provider_url ~ '^https?://'
  ),

  -- A provider product may be offered ONCE across the whole catalogue: the
  -- same Viator product cannot be linked to two different BookingsFinder
  -- activities. Cross-provider deduplication of activities is deliberately
  -- NOT automated — a Viator product and a Tiqets product are never assumed
  -- to be the same activity because titles look similar.
  CONSTRAINT ux_things_activity_offers_provider_product UNIQUE (provider, provider_product_id)
);

CREATE INDEX IF NOT EXISTS ix_things_activity_offers_activity
  ON public.things_activity_offers (activity_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. RLS — locked down
-- ═══════════════════════════════════════════════════════════════════

-- No public write access. No broad "authenticated users can write" policy.
-- No public read policy either: catalogue mutation AND reads happen
-- server-side (service_role bypasses RLS) until a genuine public-read use
-- case is required. Opening data prematurely is what this phase avoids.

ALTER TABLE public.things_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.things_activity_offers ENABLE ROW LEVEL SECURITY;

-- Deliberately NO policies on either table: anon and authenticated roles can
-- neither read nor write. Adding a policy later is an explicit, reviewed act.
