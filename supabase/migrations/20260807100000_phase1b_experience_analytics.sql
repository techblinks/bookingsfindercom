-- Phase 1B: Experience Analytics — Tiqets affiliate-click tracking
-- Extends click_events to support partner_type='experience' and adds a
-- dedicated experience_click_events table for Tiqets-specific telemetry.
-- Also provides a fire-and-forget RPC for zero-dependency client logging.

-- ═══════════════════════════════════════════════════════════════════
-- 1. Extend click_events.partner_type to accept 'experience'
-- ═══════════════════════════════════════════════════════════════════

-- The original CREATE TABLE defined an inline CHECK:
--   partner_type TEXT CHECK (partner_type IN ('flight', 'hotel'))
-- Phase 6A hardening added a named constraint:
--   ck_partner_type_valid CHECK (partner_type IS NULL OR …)
-- Drop both so we can replace them with a single constraint that
-- also allows 'experience'.

ALTER TABLE public.click_events
  DROP CONSTRAINT IF EXISTS ck_partner_type_valid;

-- Remove any remaining auto-named CHECK on the partner_type column
-- (the inline constraint from the original CREATE TABLE).
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid  = 'public.click_events'::regclass
      AND contype  = 'c'
      AND conname  LIKE '%partner_type%'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.click_events DROP CONSTRAINT IF EXISTS %I',
      r.conname
    );
  END LOOP;
END $$;

-- Replace with a single constraint covering all three partner types.
-- NULLs are allowed (existing hardening behaviour preserved).
ALTER TABLE public.click_events
  ADD CONSTRAINT ck_click_events_partner_type
  CHECK (partner_type IS NULL OR partner_type IN ('flight', 'hotel', 'experience'));

-- ═══════════════════════════════════════════════════════════════════
-- 2. Dedicated experience_click_events table (Tiqets telemetry)
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.experience_click_events (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  partner           text NOT NULL DEFAULT 'Tiqets',
  product_id        text,
  city              text,
  displayed_price   numeric,
  currency          text,
  page_source       text,
  outbound_hostname text,
  session_id        text,
  created_at        timestamptz DEFAULT now()
);

-- Index for dashboard / time-series queries
CREATE INDEX IF NOT EXISTS idx_exp_click_events_created_at
  ON public.experience_click_events (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_exp_click_events_city
  ON public.experience_click_events (city)
  WHERE city IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_exp_click_events_session
  ON public.experience_click_events (session_id);

-- ═══════════════════════════════════════════════════════════════════
-- 3. Fire-and-forget RPC: log_experience_click
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.log_experience_click(
  p_product_id        text,
  p_city              text,
  p_displayed_price   numeric,
  p_currency          text,
  p_page_source       text,
  p_outbound_hostname text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Validate: product_id required
  IF p_product_id IS NULL OR length(trim(p_product_id)) = 0 THEN
    RETURN false;
  END IF;
  IF length(p_product_id) > 100 THEN
    RETURN false;
  END IF;
  -- Validate: city length
  IF p_city IS NOT NULL AND length(p_city) > 80 THEN
    RETURN false;
  END IF;
  -- Validate: price non-negative and bounded
  IF p_displayed_price IS NOT NULL AND p_displayed_price < 0 THEN
    RETURN false;
  END IF;
  IF p_displayed_price IS NOT NULL AND p_displayed_price > 999999.99 THEN
    RETURN false;
  END IF;
  -- Validate: currency 3-letter code
  IF p_currency IS NOT NULL AND p_currency !~ '^[A-Z]{3}$' THEN
    RETURN false;
  END IF;
  -- Validate: page_source length
  IF p_page_source IS NOT NULL AND length(p_page_source) > 50 THEN
    RETURN false;
  END IF;
  -- Validate: outbound hostname — tiqets.com or subdomain only
  IF p_outbound_hostname IS NULL OR length(trim(p_outbound_hostname)) = 0 THEN
    RETURN false;
  END IF;
  IF length(p_outbound_hostname) > 253 THEN
    RETURN false;
  END IF;
  -- Reject non-domain characters: only a-zA-Z0-9 dot dash underscore allowed
  IF p_outbound_hostname !~ '^[a-zA-Z0-9._-]+$' THEN
    RETURN false;
  END IF;
  -- Exact hostname match: tiqets.com or *.tiqets.com only
  IF p_outbound_hostname != 'tiqets.com' AND p_outbound_hostname NOT LIKE '%.tiqets.com' THEN
    RETURN false;
  END IF;

  INSERT INTO public.experience_click_events (
    partner, product_id, city, displayed_price, currency, page_source, outbound_hostname
  ) VALUES (
    'Tiqets', trim(p_product_id), p_city, p_displayed_price, upper(p_currency), p_page_source, p_outbound_hostname
  );

  RETURN true;
END;
$$;
$$;

REVOKE ALL ON FUNCTION public.log_experience_click FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_experience_click TO anon, authenticated;

-- ═══════════════════════════════════════════════════════════════════
-- 4. RLS on experience_click_events
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.experience_click_events ENABLE ROW LEVEL SECURITY;

-- Allow anon + authenticated users to insert (fire-and-forget from browser)
CREATE POLICY "Anon and auth can insert experience clicks"
  ON public.experience_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read the data
CREATE POLICY "Admin can select experience clicks"
  ON public.experience_click_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  ));
 THEN
    RETURN;
  END IF;
  IF p_page_source IS NOT NULL AND length(p_page_source) > 50 THEN
    RETURN;
  END IF;
  IF p_outbound_hostname IS NULL OR length(p_outbound_hostname) = 0 THEN
    RETURN;
  END IF;
  IF p_outbound_hostname !~* '^(www.)?(tiqets.com|.*.tiqets.com|aws-tiqets-cdn.imgix.net)
END;
$$;

REVOKE ALL ON FUNCTION public.log_experience_click FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_experience_click TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════
-- 4. RLS on experience_click_events
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.experience_click_events ENABLE ROW LEVEL SECURITY;

-- Allow anon + authenticated users to insert (fire-and-forget from browser)
CREATE POLICY "Anon and auth can insert experience clicks"
  ON public.experience_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read the data
CREATE POLICY "Admin can select experience clicks"
  ON public.experience_click_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  ));
 THEN
    RETURN;
  END IF;
  IF p_outbound_hostname LIKE '%<%' THEN
    RETURN;
  END IF;

  INSERT INTO public.experience_click_events (
    partner, product_id, city, displayed_price, currency, page_source, outbound_hostname
  ) VALUES (
    'Tiqets', trim(p_product_id), p_city, p_displayed_price, upper(p_currency), p_page_source, p_outbound_hostname
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_experience_click FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_experience_click TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════
-- 4. RLS on experience_click_events
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.experience_click_events ENABLE ROW LEVEL SECURITY;

-- Allow anon + authenticated users to insert (fire-and-forget from browser)
CREATE POLICY "Anon and auth can insert experience clicks"
  ON public.experience_click_events FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Only admins can read the data
CREATE POLICY "Admin can select experience clicks"
  ON public.experience_click_events FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_roles.user_id = auth.uid()
      AND user_roles.role = 'admin'
  ));
