-- Phase 1B: Tiqets public cache table (documentation only — do not apply automatically)
-- Provides durable server-side caching for the public Things to Do experience.
-- Managed exclusively by the tiqets-public Edge Function using service-role access.

-- ═══════════════════════════════════════════════════════════════
-- 1. Cache table
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.tiqets_public_cache (
  cache_key          text PRIMARY KEY,          -- hashed request fingerprint
  payload            jsonb NOT NULL,             -- normalized product response
  fetched_at         timestamptz NOT NULL,       -- when upstream was fetched
  expires_at         timestamptz NOT NULL,       -- when cache entry expires
  upstream_request_id text,                      -- Tiqets request ID for tracing
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. Indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS ix_tiqets_cache_expires
  ON public.tiqets_public_cache (expires_at);  -- for cleanup queries

-- ═══════════════════════════════════════════════════════════════
-- 3. RLS — browser never accesses this table directly
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.tiqets_public_cache ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated access — only service-role Edge Function
-- (RLS is bypassed for service_role, so no policies needed)

-- ═══════════════════════════════════════════════════════════════
-- 4. Cleanup function (run periodically via pg_cron or manual)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cleanup_tiqets_cache()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH deleted AS (
    DELETE FROM public.tiqets_public_cache
    WHERE expires_at < now()
    RETURNING 1
  )
  SELECT count(*)::integer FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.cleanup_tiqets_cache() FROM PUBLIC;
