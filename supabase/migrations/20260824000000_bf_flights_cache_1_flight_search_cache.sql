-- BF-FLIGHTS-CACHE-1: persistent flight-search cache table (documentation only — do not apply automatically)
-- Provides durable server-side caching for the public Flights search experience,
-- fronting the Travelpayouts Data API (/aviasales/v3/prices_for_dates) so repeated
-- searches for the same route/dates/currency don't re-hit the upstream provider.
-- Managed exclusively by the search-flights Edge Function using service-role access.
-- Mirrors the established pattern in 20260807000000_phase1b_tiqets_public_cache.sql.
--
-- TTL: Travelpayouts' own documentation recommends client-side caching of
-- Data API responses and currently suggests a 24-hour cache lifetime.
-- BookingsFinder uses a more responsive 6-hour demand-driven cache instead
-- (see _shared/flightSearchCache.ts's FRESH_TTL_SEC), with the 24h
-- STALE_MAX_SEC ceiling matching (not exceeding) Travelpayouts' own
-- recommended upper bound. No blanket cron refreshes every route/date
-- combination on this schedule — see BF-FLIGHTS-CACHE-REFRESH-1 below.

-- ═══════════════════════════════════════════════════════════════
-- 1. Cache table
-- ═══════════════════════════════════════════════════════════════
--
-- Semantic (not opaque-hash) key columns are used deliberately, not a single
-- hashed cache_key like the Tiqets cache — BF-FLIGHTS-CACHE-REFRESH-1 (a
-- future follow-up, not built in this round) needs to query/sort by
-- origin/destination/last_requested_at directly to find popular routes worth
-- proactively refreshing, which a hashed key would make impractical.
--
-- cache_key remains the primary key for O(1) exact-match lookups, but it is
-- a deterministic, human-readable delimited string (built by
-- _shared/flightSearchCache.ts's computeFlightSearchCacheKey), not a hash —
-- IATA codes, ISO dates and ISO currency codes can never contain the "|"
-- delimiter, so no collision/escaping concern exists.
--
-- The cache key intentionally represents ONLY the fields that change the
-- Travelpayouts prices_for_dates response: origin, destination,
-- departure_date, return_date (nullable — NULL means one-way), currency.
-- Passenger counts and cabin class are NEVER part of the key — the upstream
-- endpoint does not document supporting either as pricing parameters (see
-- _shared/travelpayouts.ts), so keying by them would only fragment the
-- cache without ever producing a different upstream response.

CREATE TABLE IF NOT EXISTS public.flight_search_cache (
  cache_key          text PRIMARY KEY,          -- deterministic "ORIGIN|DEST|DEPART|RETURN|CCY" string
  origin             text NOT NULL,
  destination        text NOT NULL,
  departure_date     date NOT NULL,
  return_date        date,                       -- NULL = one-way
  currency           text NOT NULL,
  provider           text NOT NULL DEFAULT 'travelpayouts',
  payload            jsonb NOT NULL,              -- normalized { flights: FlightResult[] }
  payload_version    integer NOT NULL DEFAULT 1,  -- bump if the normalized payload shape changes
  fetched_at         timestamptz NOT NULL,        -- when Travelpayouts was actually last called for this key
  expires_at         timestamptz NOT NULL,        -- fetched_at + the fresh TTL in effect at write time (informational; TTL constant is the source of truth for freshness decisions)
  last_requested_at  timestamptz NOT NULL DEFAULT now(),
  request_count      integer NOT NULL DEFAULT 1,  -- demand signal for BF-FLIGHTS-CACHE-REFRESH-1, not used for any freshness decision in this round
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. Indexes
-- ═══════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS ix_flight_search_cache_route
  ON public.flight_search_cache (origin, destination);

CREATE INDEX IF NOT EXISTS ix_flight_search_cache_fetched_at
  ON public.flight_search_cache (fetched_at);  -- freshness queries, cleanup

CREATE INDEX IF NOT EXISTS ix_flight_search_cache_last_requested
  ON public.flight_search_cache (last_requested_at DESC);  -- BF-FLIGHTS-CACHE-REFRESH-1: popular/recently-used keys

-- ═══════════════════════════════════════════════════════════════
-- 3. RLS — browser never accesses this table directly
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.flight_search_cache ENABLE ROW LEVEL SECURITY;

-- No anon or authenticated policies are created — RLS enabled + zero
-- policies denies ALL access (SELECT/INSERT/UPDATE/DELETE) to anon and
-- authenticated roles. service_role bypasses RLS entirely, which is how
-- the search-flights Edge Function reads/writes this table (see
-- SUPABASE_SERVICE_ROLE_KEY usage in _shared/flightSearchCache.ts — that
-- key is read only from server-side environment/secrets and never reaches
-- the browser). The public browser calls the public search-flights Edge
-- Function; it never talks to this table directly.

-- ═══════════════════════════════════════════════════════════════
-- 4. Demand tracking — atomic increment, safe under concurrent requests
-- ═══════════════════════════════════════════════════════════════
--
-- A plain supabase-js `.update({request_count: x+1})` would require a
-- read-then-write round trip (a race under concurrent requests for the
-- same key). This function increments atomically in a single statement.
-- No-ops (0 rows affected) when the key doesn't exist yet — the row's
-- initial request_count=1 is set by the normal cache-write upsert that
-- follows a genuine cache miss, so this is never relied on to create rows.

CREATE OR REPLACE FUNCTION public.bump_flight_search_cache_demand(p_cache_key text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.flight_search_cache
  SET last_requested_at = now(),
      request_count = request_count + 1
  WHERE cache_key = p_cache_key;
$$;

-- Explicit executor contract (T4A-P2 lesson, item 7 of that migration's own
-- audit: "Only REVOKE ALL ... FROM PUBLIC existed; the intended executor was
-- never stated"). REVOKE ALL FROM PUBLIC alone is NOT sufficient to make
-- this callable by the service-role client — PostgreSQL's default PUBLIC
-- execute grant applies to every role including service_role, so revoking
-- it from PUBLIC without an explicit GRANT to service_role would leave
-- search-flights unable to call this RPC at all (service_role's RLS bypass
-- is a separate mechanism from function EXECUTE privilege; it does not
-- imply this grant). search-flights calls this via the service-role client
-- (see _shared/flightSearchCache.ts's recordFlightSearchDemand) on every
-- request, so it MUST remain executable by service_role after the revoke.
REVOKE ALL ON FUNCTION public.bump_flight_search_cache_demand(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.bump_flight_search_cache_demand(text) FROM anon;
REVOKE ALL ON FUNCTION public.bump_flight_search_cache_demand(text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.bump_flight_search_cache_demand(text) TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- 5. Cleanup function (run periodically via pg_cron or manual) — mirrors
--    cleanup_tiqets_cache(). Deletes rows past the 24h stale-usable ceiling
--    (BF-FLIGHTS-CACHE-1 Phase H), not merely past the 6h fresh TTL — a
--    stale-but-usable row must survive until genuinely expired.
--
--    NOT called by search-flights at request time (see follow-up note
--    below) — but still given the same explicit service_role grant as
--    bump_flight_search_cache_demand, for the same T4A-P2 reason: a bare
--    REVOKE ALL FROM PUBLIC with no explicit grant would leave this
--    function uncallable by ANY role, including a future pg_cron job or
--    manual admin invocation authenticated as service_role.
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.cleanup_flight_search_cache()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH deleted AS (
    DELETE FROM public.flight_search_cache
    WHERE fetched_at < now() - interval '24 hours'
    RETURNING 1
  )
  SELECT count(*)::integer FROM deleted;
$$;

REVOKE ALL ON FUNCTION public.cleanup_flight_search_cache() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_flight_search_cache() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_flight_search_cache() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_flight_search_cache() TO service_role;

-- ═══════════════════════════════════════════════════════════════
-- Follow-up (NOT implemented in this migration or this round):
--
-- BF-FLIGHTS-CACHE-REFRESH-1 — a scheduled job (e.g. pg_cron, every 6h)
-- that selects future-dated cache keys ordered by last_requested_at/
-- request_count and proactively refreshes only popular/active routes,
-- rather than refreshing every airport/date combination. This migration
-- only prepares the schema (last_requested_at, request_count indexes) for
-- that future job — no cron is scheduled here.
-- ═══════════════════════════════════════════════════════════════
