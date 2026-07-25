-- Phase 6A v2: Security hardening — RLS + CHECK constraints + outbound_host
-- Replaces the original Phase 6A migration which had permissive RLS policies.

-- ── Fix 1: Drop original permissive INSERT policies ────────────
DROP POLICY IF EXISTS "Public can insert search events" ON public.search_events;
DROP POLICY IF EXISTS "Public can insert click events" ON public.click_events;

-- ── Fix 2: Replace with user_id-aware INSERT policies ──────────

-- Anon users: user_id must be NULL
CREATE POLICY "Anon can insert search events without user_id"
  ON public.search_events FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL);

-- Auth users: user_id must be NULL or own ID
CREATE POLICY "Auth can insert own search events"
  ON public.search_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- click_events has no user_id column, so simple INSERT is fine
CREATE POLICY "Public can insert click events"
  ON public.click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- ── Fix 3: Data validation CHECK constraints ───────────────────

-- search_events constraints
ALTER TABLE public.search_events
  ADD CONSTRAINT ck_adults_positive CHECK (adults IS NULL OR adults >= 1),
  ADD CONSTRAINT ck_children_nonnegative CHECK (children IS NULL OR children >= 0),
  ADD CONSTRAINT ck_infants_nonnegative CHECK (infants IS NULL OR infants >= 0),
  ADD CONSTRAINT ck_origin_iata CHECK (origin IS NULL OR origin ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT ck_destination_iata CHECK (destination IS NULL OR destination ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT ck_currency_code CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT ck_cabin_class CHECK (
    cabin_class IS NULL OR
    cabin_class IN ('economy', 'premium_economy', 'business', 'first')
  ),
  ADD CONSTRAINT ck_session_id_length CHECK (session_id IS NOT NULL AND char_length(session_id) <= 128),
  ADD CONSTRAINT ck_landing_page_length CHECK (landing_page IS NULL OR char_length(landing_page) <= 256),
  ADD CONSTRAINT ck_referrer_length CHECK (referrer IS NULL OR char_length(referrer) <= 1024),
  ADD CONSTRAINT ck_utm_source_length CHECK (utm_source IS NULL OR char_length(utm_source) <= 256),
  ADD CONSTRAINT ck_utm_medium_length CHECK (utm_medium IS NULL OR char_length(utm_medium) <= 256),
  ADD CONSTRAINT ck_utm_campaign_length CHECK (utm_campaign IS NULL OR char_length(utm_campaign) <= 256);

-- click_events constraints
ALTER TABLE public.click_events
  ADD CONSTRAINT ck_price_nonnegative CHECK (price IS NULL OR price >= 0),
  ADD CONSTRAINT ck_partner_length CHECK (partner IS NOT NULL AND char_length(partner) <= 128),
  ADD CONSTRAINT ck_partner_type_valid CHECK (
    partner_type IS NULL OR partner_type IN ('flight', 'hotel')
  ),
  ADD CONSTRAINT ck_session_id_len CHECK (session_id IS NOT NULL AND char_length(session_id) <= 128),
  ADD CONSTRAINT ck_outbound_host_length CHECK (outbound_host IS NULL OR char_length(outbound_host) <= 256);

-- ── Fix 4: Replace destination_url with outbound_host ──────────
-- Drop the old column and add the new one
ALTER TABLE public.click_events
  DROP COLUMN IF EXISTS destination_url;

ALTER TABLE public.click_events
  ADD COLUMN IF NOT EXISTS outbound_host TEXT;

-- Add safety CHECK: reject dangerous protocols in outbound_host
ALTER TABLE public.click_events
  ADD CONSTRAINT ck_outbound_host_safe CHECK (
    outbound_host IS NULL OR
    outbound_host !~* '^(javascript|data|file|vbscript):'
  );

-- ── Fix 5: daily_metrics — document as not yet populated ───────
-- The daily_metrics table exists for future use but currently has
-- no automated population mechanism (no trigger, cron, or edge function).
-- The admin dashboard queries search_events/click_events directly.
