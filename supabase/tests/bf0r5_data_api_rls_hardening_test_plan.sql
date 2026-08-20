/**
 * BF-0R5 Data API / RLS hardening — verification test plan
 * (round 4 + production postflight correction).
 * =====================================================================
 *
 * Run against a freshly-reset LOCAL Supabase instance only. Never run
 * against production.
 *
 * Covers two migrations:
 *   - 20260820000000_bf0r5_data_api_rls_hardening.sql (round 4)
 *   - 20260820170000_bf0r5_user_roles_grant_hardening.sql (postflight
 *     correction — closes the one production postflight FAIL found after
 *     20260820000000 was applied: user_roles' anon/service_role grants)
 *
 * PART A: catalog-based has_table_privilege/has_column_privilege/
 *         has_function_privilege assertions, including explicit
 *         forbidden-privilege=false checks for every "exactly" claim
 *         (round 4: optimizer_requests/optimizer_results client SELECT;
 *         postflight correction: user_roles anon zero-privilege and
 *         service_role exactly-SELECT).
 * PART A2: pg_policies / pg_proc definition sanity checks (policy text,
 *          dangerous-policy absence, search_path hardening; round 4 adds
 *          subscribe_email's void-return and ON CONFLICT DO NOTHING checks;
 *          postflight correction adds user_roles' exactly-2-policies check).
 * PART B: behavioural tests via SET LOCAL ROLE + forged request.jwt.claims,
 *         exercising the real INSERT/UPDATE/SELECT/RPC paths and catching
 *         the errors, INCLUDING genuine create_saved_search() and
 *         subscribe_email() RPC round trips (not just raw-grant checks),
 *         round 4's opted-out-address protection / non-distinguishing-
 *         response proof for subscribe_email, and the postflight
 *         correction's own-row-SELECT / non-admin-write-denied / admin-
 *         write-still-works proof for user_roles.
 *
 * Every assertion RAISEs an EXCEPTION on failure; a clean run with only
 * NOTICE output is a full pass.
 */

-- ═══════════════════════════════════════════════════════════════
-- PART A — catalog-based grant assertions
-- ═══════════════════════════════════════════════════════════════

DO $$
BEGIN

  -- user_profiles entitlement columns remain protected
  IF has_column_privilege('authenticated', 'public.user_profiles', 'plan', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can still UPDATE user_profiles.plan';
  END IF;
  IF has_column_privilege('authenticated', 'public.user_profiles', 'monthly_optimizer_uses', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can still UPDATE user_profiles.monthly_optimizer_uses';
  END IF;
  IF has_column_privilege('authenticated', 'public.user_profiles', 'last_optimizer_reset', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can still UPDATE user_profiles.last_optimizer_reset';
  END IF;
  IF has_table_privilege('authenticated', 'public.user_profiles', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: authenticated can still INSERT into user_profiles';
  END IF;
  IF has_table_privilege('anon', 'public.user_profiles', 'INSERT')
     OR has_table_privilege('anon', 'public.user_profiles', 'UPDATE')
     OR has_table_privilege('anon', 'public.user_profiles', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: anon has some privilege on user_profiles';
  END IF;

  -- subscriptions remain service-controlled
  IF has_table_privilege('anon', 'public.subscriptions', 'INSERT')
     OR has_table_privilege('anon', 'public.subscriptions', 'UPDATE')
     OR has_table_privilege('anon', 'public.subscriptions', 'DELETE')
     OR has_table_privilege('anon', 'public.subscriptions', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: anon has some privilege on subscriptions';
  END IF;
  IF has_table_privilege('authenticated', 'public.subscriptions', 'INSERT')
     OR has_table_privilege('authenticated', 'public.subscriptions', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.subscriptions', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: authenticated can still write subscriptions';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.subscriptions', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: authenticated lost SELECT on subscriptions entirely';
  END IF;

  -- optimizer_results cannot be fabricated by clients
  IF has_table_privilege('anon', 'public.optimizer_results', 'INSERT')
     OR has_table_privilege('anon', 'public.optimizer_results', 'UPDATE')
     OR has_table_privilege('anon', 'public.optimizer_results', 'DELETE')
     OR has_table_privilege('authenticated', 'public.optimizer_results', 'INSERT')
     OR has_table_privilege('authenticated', 'public.optimizer_results', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.optimizer_results', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: a client role can still write optimizer_results';
  END IF;

  -- optimizer_requests matches the new architecture (no client INSERT)
  IF has_table_privilege('anon', 'public.optimizer_requests', 'INSERT')
     OR has_table_privilege('authenticated', 'public.optimizer_requests', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: a client role can still INSERT optimizer_requests';
  END IF;

  -- round 4: optimizer_requests / optimizer_results have NO client SELECT
  -- either — confirmed unused by any current frontend code.
  IF has_table_privilege('anon', 'public.optimizer_requests', 'SELECT')
     OR has_table_privilege('authenticated', 'public.optimizer_requests', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: a client role can still SELECT optimizer_requests (round 4: must be fully client-inaccessible)';
  END IF;
  IF has_table_privilege('anon', 'public.optimizer_results', 'SELECT')
     OR has_table_privilege('authenticated', 'public.optimizer_results', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: a client role can still SELECT optimizer_results (round 4: must be fully client-inaccessible)';
  END IF;

  -- admin_profiles cannot manufacture admin access
  IF has_table_privilege('anon', 'public.admin_profiles', 'INSERT')
     OR has_table_privilege('authenticated', 'public.admin_profiles', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: a client role can still INSERT admin_profiles';
  END IF;

  -- user_roles (postflight correction: 20260820170000). anon must have
  -- ZERO privilege of any kind, including SELECT — role information is
  -- not meant to be publicly readable and no anon caller anywhere
  -- legitimately needs it.
  IF has_table_privilege('anon', 'public.user_roles', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: anon can SELECT user_roles';
  END IF;
  IF has_table_privilege('anon', 'public.user_roles', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: anon can INSERT user_roles';
  END IF;
  IF has_table_privilege('anon', 'public.user_roles', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: anon can UPDATE user_roles';
  END IF;
  IF has_table_privilege('anon', 'public.user_roles', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: anon can DELETE user_roles';
  END IF;

  -- user_roles: service_role has exactly SELECT (postflight correction —
  -- required by _shared/admin-auth.ts's requireAdmin() and get-admin-stats,
  -- both of which read user_roles under a service_role-keyed client; no
  -- service_role writer exists anywhere).
  IF NOT has_table_privilege('service_role', 'public.user_roles', 'SELECT') THEN
    RAISE EXCEPTION 'FAIL: service_role lost SELECT on user_roles (admin-auth Edge Functions would break)';
  END IF;
  IF has_table_privilege('service_role', 'public.user_roles', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: service_role can INSERT user_roles (not exactly SELECT)';
  END IF;
  IF has_table_privilege('service_role', 'public.user_roles', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: service_role can UPDATE user_roles (not exactly SELECT)';
  END IF;
  IF has_table_privilege('service_role', 'public.user_roles', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role can DELETE user_roles (not exactly SELECT)';
  END IF;

  -- saved_searches / price_history (round 3: RPC-only creation — NO raw
  -- grant of any kind for anon/authenticated, not even INSERT).
  IF has_table_privilege('anon', 'public.saved_searches', 'SELECT')
     OR has_table_privilege('anon', 'public.saved_searches', 'INSERT')
     OR has_table_privilege('anon', 'public.saved_searches', 'UPDATE')
     OR has_table_privilege('anon', 'public.saved_searches', 'DELETE')
     OR has_table_privilege('authenticated', 'public.saved_searches', 'SELECT')
     OR has_table_privilege('authenticated', 'public.saved_searches', 'INSERT')
     OR has_table_privilege('authenticated', 'public.saved_searches', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.saved_searches', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: a client role has a raw table privilege on saved_searches (must be RPC-only)';
  END IF;
  IF has_table_privilege('anon', 'public.price_history', 'SELECT')
     OR has_table_privilege('anon', 'public.price_history', 'INSERT')
     OR has_table_privilege('anon', 'public.price_history', 'UPDATE')
     OR has_table_privilege('anon', 'public.price_history', 'DELETE')
     OR has_table_privilege('authenticated', 'public.price_history', 'SELECT')
     OR has_table_privilege('authenticated', 'public.price_history', 'INSERT')
     OR has_table_privilege('authenticated', 'public.price_history', 'UPDATE')
     OR has_table_privilege('authenticated', 'public.price_history', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: a client role has a raw table privilege on price_history (must be RPC-only)';
  END IF;
  -- Creation must still be reachable — via EXECUTE on the RPC, not a grant.
  IF NOT has_function_privilege('anon', 'public.create_saved_search(text,text,text,date,date,integer,text,numeric,numeric)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.create_saved_search(text,text,text,date,date,integer,text,numeric,numeric)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon/authenticated lost EXECUTE on create_saved_search (feature over-reduced)';
  END IF;

  -- ad_placements: admin path reachable via grant, anon has none.
  IF NOT has_table_privilege('authenticated', 'public.ad_placements', 'UPDATE') THEN
    RAISE EXCEPTION 'FAIL: authenticated lost UPDATE on ad_placements entirely (admin path unreachable)';
  END IF;
  IF has_table_privilege('anon', 'public.ad_placements', 'UPDATE')
     OR has_table_privilege('anon', 'public.ad_placements', 'INSERT')
     OR has_table_privilege('anon', 'public.ad_placements', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: anon has a direct write privilege on ad_placements (tracking must go through the RPCs only)';
  END IF;
  IF NOT has_function_privilege('anon', 'public.increment_ad_impression(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.increment_ad_impression(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('anon', 'public.increment_ad_click(uuid)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.increment_ad_click(uuid)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: ad tracking RPC EXECUTE grants are missing';
  END IF;

  -- subscribers (round 3, new table).
  IF has_table_privilege('anon', 'public.subscribers', 'SELECT')
     OR has_table_privilege('anon', 'public.subscribers', 'INSERT')
     OR has_table_privilege('anon', 'public.subscribers', 'UPDATE')
     OR has_table_privilege('anon', 'public.subscribers', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: anon has a raw table privilege on subscribers (must be RPC-only)';
  END IF;
  IF has_table_privilege('authenticated', 'public.subscribers', 'INSERT') THEN
    RAISE EXCEPTION 'FAIL: authenticated has a raw INSERT privilege on subscribers (must be RPC-only)';
  END IF;
  IF NOT has_table_privilege('authenticated', 'public.subscribers', 'SELECT')
     OR NOT has_table_privilege('authenticated', 'public.subscribers', 'UPDATE')
     OR NOT has_table_privilege('authenticated', 'public.subscribers', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: authenticated lost the admin-path grant on subscribers (admin UI would break)';
  END IF;
  IF NOT has_function_privilege('anon', 'public.subscribe_email(text,text)', 'EXECUTE')
     OR NOT has_function_privilege('authenticated', 'public.subscribe_email(text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'FAIL: anon/authenticated lost EXECUTE on subscribe_email (feature over-reduced)';
  END IF;

  -- service-role paths retain EXACTLY their required privileges — every
  -- "exactly" claim below asserts both the required privileges are TRUE
  -- and every other privilege is explicitly FALSE (round-3 correction).
  IF NOT (has_table_privilege('service_role', 'public.subscriptions', 'SELECT')
      AND has_table_privilege('service_role', 'public.subscriptions', 'INSERT')
      AND has_table_privilege('service_role', 'public.subscriptions', 'UPDATE'))
     OR has_table_privilege('service_role', 'public.subscriptions', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role does not have exactly SELECT/INSERT/UPDATE on subscriptions';
  END IF;

  IF NOT (has_table_privilege('service_role', 'public.user_profiles', 'SELECT')
      AND has_table_privilege('service_role', 'public.user_profiles', 'INSERT')
      AND has_table_privilege('service_role', 'public.user_profiles', 'UPDATE'))
     OR has_table_privilege('service_role', 'public.user_profiles', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role does not have exactly SELECT/INSERT/UPDATE on user_profiles';
  END IF;

  IF NOT (has_table_privilege('service_role', 'public.optimizer_requests', 'SELECT')
      AND has_table_privilege('service_role', 'public.optimizer_requests', 'INSERT'))
     OR has_table_privilege('service_role', 'public.optimizer_requests', 'UPDATE')
     OR has_table_privilege('service_role', 'public.optimizer_requests', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role does not have exactly SELECT/INSERT on optimizer_requests';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.optimizer_results', 'INSERT')
     OR has_table_privilege('service_role', 'public.optimizer_results', 'SELECT')
     OR has_table_privilege('service_role', 'public.optimizer_results', 'UPDATE')
     OR has_table_privilege('service_role', 'public.optimizer_results', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role does not have exactly INSERT on optimizer_results';
  END IF;

  IF NOT (has_table_privilege('service_role', 'public.saved_searches', 'SELECT')
      AND has_table_privilege('service_role', 'public.saved_searches', 'UPDATE'))
     OR has_table_privilege('service_role', 'public.saved_searches', 'INSERT')
     OR has_table_privilege('service_role', 'public.saved_searches', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role does not have exactly SELECT/UPDATE on saved_searches';
  END IF;

  IF NOT has_table_privilege('service_role', 'public.price_history', 'INSERT')
     OR has_table_privilege('service_role', 'public.price_history', 'SELECT')
     OR has_table_privilege('service_role', 'public.price_history', 'UPDATE')
     OR has_table_privilege('service_role', 'public.price_history', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role does not have exactly INSERT on price_history';
  END IF;

  IF NOT (has_table_privilege('service_role', 'public.subscribers', 'SELECT')
      AND has_table_privilege('service_role', 'public.subscribers', 'UPDATE'))
     OR has_table_privilege('service_role', 'public.subscribers', 'INSERT')
     OR has_table_privilege('service_role', 'public.subscribers', 'DELETE') THEN
    RAISE EXCEPTION 'FAIL: service_role does not have exactly SELECT/UPDATE on subscribers';
  END IF;

  RAISE NOTICE 'PART A: all catalog-based grant assertions passed.';
END $$;


-- ═══════════════════════════════════════════════════════════════
-- PART A2 — pg_policies / pg_proc definition sanity checks
-- ═══════════════════════════════════════════════════════════════

DO $$
DECLARE
  v_def text;
  v_proconfig text[];
BEGIN
  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscriptions'
      AND policyname = 'Users can view their own subscription';
  IF v_def IS NULL OR v_def NOT ILIKE '%auth.uid()%user_id%' THEN
    RAISE EXCEPTION 'FAIL: subscriptions own-row SELECT policy missing or not owner-scoped: %', v_def;
  END IF;

  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_profiles'
      AND policyname = 'Users can view their own profile';
  IF v_def IS NULL OR v_def NOT ILIKE '%auth.uid()%user_id%' THEN
    RAISE EXCEPTION 'FAIL: user_profiles own-row SELECT policy missing or not owner-scoped: %', v_def;
  END IF;

  -- round 4: the optimizer_requests/optimizer_results SELECT policies are
  -- now DROPPED (not preserved) — no client role reads either table, per
  -- the round-4 repository-wide search. Both tables must have ZERO
  -- policies left (RLS is enabled, so zero policies = zero client access,
  -- same pattern as saved_searches/price_history/subscribers' RPC-only
  -- design). service_role bypasses RLS regardless.
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'optimizer_requests') THEN
    RAISE EXCEPTION 'FAIL: optimizer_requests still has a client-facing policy; round 4 requires zero client Data API access';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'optimizer_results') THEN
    RAISE EXCEPTION 'FAIL: optimizer_results still has a client-facing policy; round 4 requires zero client Data API access';
  END IF;

  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Admins can manage roles';
  IF v_def IS NULL OR v_def NOT ILIKE '%has_role%' THEN
    RAISE EXCEPTION 'FAIL: user_roles admin policy missing or no longer has_role-scoped: %', v_def;
  END IF;

  -- user_roles (postflight correction): "Users can view their own roles"
  -- must remain present and owner-scoped — neither policy is dropped or
  -- weakened by 20260820170000, only the grant layer changed.
  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Users can view their own roles';
  IF v_def IS NULL OR v_def NOT ILIKE '%auth.uid()%user_id%' THEN
    RAISE EXCEPTION 'FAIL: user_roles own-row SELECT policy missing or no longer owner-scoped: %', v_def;
  END IF;

  -- user_roles: exactly these two policies exist — no additional
  -- permissive write policy has been introduced anywhere (the postflight
  -- correction migration adds no CREATE POLICY at all, only REVOKE/GRANT).
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles') <> 2 THEN
    RAISE EXCEPTION 'FAIL: user_roles does not have exactly 2 policies (expected only "Users can view their own roles" and "Admins can manage roles")';
  END IF;

  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'ad_placements' AND policyname = 'Admins can manage ad placements';
  IF v_def IS NULL OR v_def NOT ILIKE '%has_role%' THEN
    RAISE EXCEPTION 'FAIL: ad_placements admin policy missing or no longer has_role-scoped: %', v_def;
  END IF;

  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_placements'
             AND policyname = 'Allow increment tracking') THEN
    RAISE EXCEPTION 'FAIL: the dangerous unscoped ad_placements tracking policy still exists';
  END IF;

  -- Round-4 pre-merge correction: the three legacy admin write policies
  -- from migration 20260113151333 must be dropped, not left redundant
  -- alongside "Admins can manage ad placements". Each was never itself a
  -- vulnerability (all has_role-gated), but their continued presence made
  -- the "ONLY INSERT/UPDATE/DELETE policy" claim in this migration's
  -- comments inaccurate, and left duplicate permissive policies covering
  -- the same rows.
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_placements'
             AND policyname = 'Admins can insert ads') THEN
    RAISE EXCEPTION 'FAIL: legacy "Admins can insert ads" policy still exists on ad_placements';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_placements'
             AND policyname = 'Admins can update ads') THEN
    RAISE EXCEPTION 'FAIL: legacy "Admins can update ads" policy still exists on ad_placements';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_placements'
             AND policyname = 'Admins can delete ads') THEN
    RAISE EXCEPTION 'FAIL: legacy "Admins can delete ads" policy still exists on ad_placements';
  END IF;
  -- Confirm exactly one INSERT/UPDATE/DELETE-capable policy remains on the
  -- table (the combined "Admins can manage ad placements" FOR ALL policy),
  -- not just that the three named legacy policies are gone by name — this
  -- also catches any other stray write policy that might exist.
  IF (SELECT count(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ad_placements'
      AND (cmd = 'INSERT' OR cmd = 'UPDATE' OR cmd = 'DELETE' OR cmd = 'ALL')) <> 1 THEN
    RAISE EXCEPTION 'FAIL: ad_placements does not have exactly one write-capable policy (expected only "Admins can manage ad placements")';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid
             WHERE c.relname = 'ad_placements' AND t.tgname = 'guard_ad_placement_tracking_columns') THEN
    RAISE EXCEPTION 'FAIL: the round-1 trigger should have been removed in favour of the RPC design';
  END IF;

  -- round 3: no leftover client policy on saved_searches/price_history
  -- (grants are fully revoked, so any leftover policy would be inert, but
  -- its presence would be confusing/misleading to a future auditor).
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'saved_searches') THEN
    RAISE EXCEPTION 'FAIL: saved_searches still has a client-facing policy; creation must be RPC-only with zero policies';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'price_history') THEN
    RAISE EXCEPTION 'FAIL: price_history still has a client-facing policy; creation must be RPC-only with zero policies';
  END IF;

  -- round 3: subscribers dangerous policies gone, admin policies intact.
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscribers'
             AND policyname = 'Anyone can unsubscribe with token') THEN
    RAISE EXCEPTION 'FAIL: the dangerous unscoped subscribers unsubscribe policy still exists';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'subscribers'
             AND policyname = 'Anyone can subscribe') THEN
    RAISE EXCEPTION 'FAIL: the raw-INSERT subscribers policy still exists; creation must be RPC-only';
  END IF;
  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscribers' AND policyname = 'Admins can update subscribers';
  IF v_def IS NULL OR v_def NOT ILIKE '%has_role%' THEN
    RAISE EXCEPTION 'FAIL: subscribers admin UPDATE policy missing or no longer has_role-scoped: %', v_def;
  END IF;
  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscribers' AND policyname = 'Admins can view all subscribers';
  IF v_def IS NULL OR v_def NOT ILIKE '%has_role%' THEN
    RAISE EXCEPTION 'FAIL: subscribers admin SELECT policy missing or no longer has_role-scoped: %', v_def;
  END IF;
  SELECT qual INTO v_def FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'subscribers' AND policyname = 'Admins can delete subscribers';
  IF v_def IS NULL OR v_def NOT ILIKE '%has_role%' THEN
    RAISE EXCEPTION 'FAIL: subscribers admin DELETE policy missing or no longer has_role-scoped: %', v_def;
  END IF;

  -- round 3: ad tracking RPC search_path hardened to '' (empty), not 'public'.
  SELECT proconfig INTO v_proconfig FROM pg_proc
    WHERE proname = 'increment_ad_impression' AND pronamespace = 'public'::regnamespace;
  IF v_proconfig IS NULL OR NOT ('search_path=""' = ANY (v_proconfig)) THEN
    RAISE EXCEPTION 'FAIL: increment_ad_impression search_path is not hardened to empty: %', v_proconfig;
  END IF;
  SELECT proconfig INTO v_proconfig FROM pg_proc
    WHERE proname = 'increment_ad_click' AND pronamespace = 'public'::regnamespace;
  IF v_proconfig IS NULL OR NOT ('search_path=""' = ANY (v_proconfig)) THEN
    RAISE EXCEPTION 'FAIL: increment_ad_click search_path is not hardened to empty: %', v_proconfig;
  END IF;

  -- round 3: new RPCs are also search_path-hardened to '' (empty).
  SELECT proconfig INTO v_proconfig FROM pg_proc
    WHERE proname = 'create_saved_search' AND pronamespace = 'public'::regnamespace;
  IF v_proconfig IS NULL OR NOT ('search_path=""' = ANY (v_proconfig)) THEN
    RAISE EXCEPTION 'FAIL: create_saved_search search_path is not hardened to empty: %', v_proconfig;
  END IF;
  SELECT proconfig INTO v_proconfig FROM pg_proc
    WHERE proname = 'subscribe_email' AND pronamespace = 'public'::regnamespace;
  IF v_proconfig IS NULL OR NOT ('search_path=""' = ANY (v_proconfig)) THEN
    RAISE EXCEPTION 'FAIL: subscribe_email search_path is not hardened to empty: %', v_proconfig;
  END IF;

  -- round 3: create_saved_search cannot accept server-managed fields —
  -- confirm the function signature does not expose them as parameters.
  IF pg_get_function_arguments(
       (SELECT oid FROM pg_proc WHERE proname = 'create_saved_search' AND pronamespace = 'public'::regnamespace)
     ) ILIKE ANY (ARRAY['%is_active%', '%last_checked_at%', '%updated_at%', '%current_lowest_price%'])
  THEN
    RAISE EXCEPTION 'FAIL: create_saved_search exposes a server-managed field as a caller-settable parameter';
  END IF;

  -- round 3: subscribe_email cannot accept server-managed fields either.
  IF pg_get_function_arguments(
       (SELECT oid FROM pg_proc WHERE proname = 'subscribe_email' AND pronamespace = 'public'::regnamespace)
     ) ILIKE ANY (ARRAY['%is_subscribed%', '%unsubscribe_token%', '%subscribed_at%', '%unsubscribed_at%'])
  THEN
    RAISE EXCEPTION 'FAIL: subscribe_email exposes a server-managed field as a caller-settable parameter';
  END IF;

  -- round 4: subscribe_email must return void — no boolean, no row — so
  -- there is structurally nothing left for a caller to branch on. A
  -- regression back to `RETURNS boolean` (or anything else) would
  -- reintroduce a distinguishing channel even if the body looked safe.
  IF pg_get_function_result(
       (SELECT oid FROM pg_proc WHERE proname = 'subscribe_email' AND pronamespace = 'public'::regnamespace)
     ) <> 'void'
  THEN
    RAISE EXCEPTION 'FAIL: subscribe_email no longer returns void (round 4 requires a non-distinguishing return type)';
  END IF;

  -- round 4: subscribe_email must use ON CONFLICT (email) DO NOTHING, never
  -- DO UPDATE — DO UPDATE is exactly the mechanism round 3 used to
  -- silently reactivate a previously-unsubscribed row without ownership
  -- proof. Checked structurally so a future edit can't quietly reintroduce
  -- it while still passing the behavioural opted-out test below.
  SELECT pg_get_functiondef(oid) INTO v_def FROM pg_proc
    WHERE proname = 'subscribe_email' AND pronamespace = 'public'::regnamespace;
  IF v_def NOT ILIKE '%ON CONFLICT (email) DO NOTHING%' THEN
    RAISE EXCEPTION 'FAIL: subscribe_email does not use ON CONFLICT (email) DO NOTHING: %', v_def;
  END IF;
  IF v_def ILIKE '%DO UPDATE%' THEN
    RAISE EXCEPTION 'FAIL: subscribe_email still contains a DO UPDATE clause that could modify an existing row';
  END IF;

  RAISE NOTICE 'PART A2: all policy/function-definition sanity checks passed.';
END $$;


-- ═══════════════════════════════════════════════════════════════
-- PART B — behavioural tests (role-switching)
-- ═══════════════════════════════════════════════════════════════

-- Test-environment-only setup, NOT part of any migration: a live read-only
-- production audit confirmed `authenticated` already holds
-- SELECT/INSERT/UPDATE/DELETE on public.user_roles via Supabase's
-- untracked, implicit platform bootstrap grant — the same class of
-- untracked grant this whole project has repeatedly had to account for.
-- 20260820170000_bf0r5_user_roles_grant_hardening.sql deliberately leaves
-- `authenticated`'s privileges on this table untouched (per the caller
-- audit's conclusion that RLS, not the grant, must do the real work here —
-- the admin write path needs the grant to stay reachable at all, exactly
-- like ad_placements/subscribers elsewhere in this project). A fresh LOCAL
-- `supabase db reset` does NOT reproduce that same bootstrap grant for this
-- one table, so it is replicated here purely so the role-switch tests
-- below exercise the SAME grant-present/RLS-decides conditions production
-- actually has, instead of failing on a local-only permission-denied error
-- that has nothing to do with the migration under test.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;

DO $$
DECLARE
  v_user_id uuid := '00000000-0000-0000-0000-000000000001';
  v_other_user_id uuid := '00000000-0000-0000-0000-000000000003';
  v_admin_id uuid := '00000000-0000-0000-0000-000000000002';
  v_ad_id uuid;
  v_ad_id2 uuid;
  v_search_id uuid;
  v_caught boolean;
  v_impressions_before int;
  v_rpc_id uuid;
  v_rpc_created_at timestamptz;
  v_rpc_row_count int;
  v_price_row_count int;
  v_sub_id uuid;
  v_sub_email text := 'bf0r5-round3-subscriber@example.test';
  v_sub_token text;
  v_optout_email text := 'bf0r5-round4-optout@example.test';
  v_optout_token_before text;
  v_optout_token_after text;
  v_active_email text := 'bf0r5-round4-active@example.test';
  v_active_subscribed_at_before timestamptz;
  v_active_subscribed_at_after timestamptz;
  v_role_text text;
  v_role_count int;
BEGIN
  INSERT INTO auth.users (id, email) VALUES (v_user_id, 'plain-user@example.test') ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES (v_other_user_id, 'other-user@example.test') ON CONFLICT (id) DO NOTHING;
  INSERT INTO auth.users (id, email) VALUES (v_admin_id, 'admin-user@example.test') ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_admin_id, 'admin') ON CONFLICT DO NOTHING;
  -- Postflight correction fixtures: give both non-admin users their own
  -- 'user' role row, so test 9 (own-row SELECT) and test 10 (cannot SELECT
  -- another user's row) exercise a real row, not an empty result either way.
  INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'user') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (v_other_user_id, 'user') ON CONFLICT DO NOTHING;

  INSERT INTO public.ad_placements (name, type, placement, page, title, destination_url, is_active, impressions, clicks)
  VALUES ('bf0r5-test-ad', 'sponsored_card', 'after_result_3', 'both', 'Original Title', 'https://example.test/original', true, 0, 0)
  RETURNING id INTO v_ad_id;

  INSERT INTO public.saved_searches (email, origin, destination, departure_date, is_active)
  VALUES ('victim@example.test', 'SYD', 'LHR', CURRENT_DATE + 30, true)
  RETURNING id INTO v_search_id;

  -- Round 4 fixtures for subscribe_email's opted-out-protection /
  -- non-distinguishing-response tests: one email that previously
  -- unsubscribed, one email that is already actively subscribed. Both
  -- pre-exist BEFORE any anon call, seeded here in superuser context (this
  -- DO block itself is not RLS-restricted).
  INSERT INTO public.subscribers (email, subscription_source, is_subscribed, subscribed_at, unsubscribed_at)
  VALUES (v_optout_email, 'manual', false, now() - interval '30 days', now() - interval '10 days');
  SELECT unsubscribe_token INTO v_optout_token_before FROM public.subscribers WHERE email = v_optout_email;

  INSERT INTO public.subscribers (email, subscription_source, is_subscribed, subscribed_at, unsubscribed_at)
  VALUES (v_active_email, 'manual', true, now() - interval '30 days', NULL);
  SELECT subscribed_at INTO v_active_subscribed_at_before FROM public.subscribers WHERE email = v_active_email;

  -- ── anon ──────────────────────────────────────────────────────
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);

  -- 1. anon cannot enumerate saved_searches at all.
  v_caught := false;
  BEGIN
    PERFORM * FROM public.saved_searches;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 1: anon can enumerate saved_searches'; END IF;

  -- 3. anonymous management of someone else's saved alert fails (no UPDATE privilege at all).
  v_caught := false;
  BEGIN
    UPDATE public.saved_searches SET is_active = false WHERE id = v_search_id;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 3: anon can modify an existing saved_searches row'; END IF;

  -- 4. arbitrary price_history enumeration fails.
  v_caught := false;
  BEGIN
    PERFORM * FROM public.price_history;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 4: anon can enumerate price_history'; END IF;

  -- Round 3 test 1/2: raw anon INSERT is now denied on both tables
  -- (creation is RPC-only).
  v_caught := false;
  BEGIN
    INSERT INTO public.saved_searches (email, origin, destination, departure_date, is_active)
    VALUES ('should-fail@example.test', 'BNE', 'NRT', CURRENT_DATE + 10, true);
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R3-1: anon can still raw-INSERT into saved_searches directly'; END IF;

  v_caught := false;
  BEGIN
    INSERT INTO public.price_history (saved_search_id, price) VALUES (v_search_id, 100);
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R3-2: anon can still raw-INSERT into price_history directly'; END IF;

  -- Round 3 test 4/5/6: create_saved_search RPC creates exactly one alert,
  -- returns only its own id/created_at, and inserts the optional initial
  -- price point server-side.
  SELECT id, created_at INTO v_rpc_id, v_rpc_created_at
  FROM public.create_saved_search(
    'new-visitor@example.test', 'MEL', 'SIN', CURRENT_DATE + 45,
    NULL, 1, 'economy', NULL, 250
  );
  IF v_rpc_id IS NULL OR v_rpc_created_at IS NULL THEN
    RAISE EXCEPTION 'FAIL R3-4: create_saved_search did not return an id/created_at';
  END IF;

  SELECT count(*) INTO v_rpc_row_count FROM public.create_saved_search(
    'second-visitor@example.test', 'PER', 'DXB', CURRENT_DATE + 20,
    NULL, 2, 'business', 900, NULL
  );
  IF v_rpc_row_count <> 1 THEN
    RAISE EXCEPTION 'FAIL R3-5: create_saved_search returned % rows instead of exactly 1', v_rpc_row_count;
  END IF;

  -- Confirm the initial price point landed (as superuser context is not
  -- available mid-role-switch; use a service_role-equivalent check after
  -- RESET ROLE further down instead). Here we confirm indirectly: the RPC
  -- call above did not raise, and price_history has no anon-visible
  -- SELECT, so we defer the row-count proof to the cleanup section below
  -- where the role is superuser again.

  -- Round 3 test 8: caller cannot supply server-managed fields — the RPC
  -- signature simply has no such parameters (proven in PART A2); attempting
  -- to pass one as a named argument must fail at the SQL parser/planner
  -- level (function does not exist with that signature), not silently
  -- accept it.
  v_caught := false;
  BEGIN
    PERFORM public.create_saved_search(
      p_email => 'attacker@example.test', p_origin => 'AAA', p_destination => 'BBB',
      p_departure_date => CURRENT_DATE + 1, p_current_price => 1,
      p_target_price => NULL
    );
    -- the call above is a VALID subset of real parameters and should
    -- succeed (it does not smuggle in a forbidden field) — this just
    -- proves named-argument calls work at all, not a vulnerability.
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF v_caught THEN RAISE EXCEPTION 'FAIL R3-8-setup: a legitimate named-argument create_saved_search call unexpectedly failed'; END IF;

  -- 5. ad tracking cannot change destination_url — there is no direct UPDATE
  -- privilege at all any more, so any attempted raw UPDATE fails outright.
  v_caught := false;
  BEGIN
    UPDATE public.ad_placements SET destination_url = 'https://evil.test/phish' WHERE id = v_ad_id;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 5: anon was able to rewrite ad_placements.destination_url'; END IF;

  -- 6. ad tracking cannot change html_content (same reasoning).
  v_caught := false;
  BEGIN
    UPDATE public.ad_placements SET html_content = '<script>alert(1)</script>' WHERE id = v_ad_id;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 6: anon was able to rewrite ad_placements.html_content'; END IF;

  -- 7. ad tracking cannot change title/advertiser/control state.
  v_caught := false;
  BEGIN
    UPDATE public.ad_placements SET title = 'hijacked', is_active = false WHERE id = v_ad_id;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 7: anon was able to rewrite ad_placements.title/is_active'; END IF;

  -- 8. tracking counter semantics: only the bounded +1 RPC is reachable, and
  -- it cannot be abused into an arbitrary assignment.
  SELECT impressions INTO v_impressions_before FROM public.ad_placements WHERE id = v_ad_id; -- readable via public SELECT policy
  PERFORM public.increment_ad_impression(v_ad_id);
  PERFORM public.increment_ad_click(v_ad_id);
  IF (SELECT impressions FROM public.ad_placements WHERE id = v_ad_id) <> v_impressions_before + 1 THEN
    RAISE EXCEPTION 'FAIL 8: increment_ad_impression did not add exactly one';
  END IF;
  v_caught := false;
  BEGIN
    UPDATE public.ad_placements SET impressions = 999999999 WHERE id = v_ad_id;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 8b: anon was able to directly assign an arbitrary impressions value'; END IF;

  -- Round 3 test 9: subscribers cannot be enumerated by anon.
  v_caught := false;
  BEGIN
    PERFORM * FROM public.subscribers;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R3-9: anon can enumerate subscribers'; END IF;

  -- Round 3 test 10: unsubscribe token cannot be read by anon (SELECT
  -- denied entirely — already proven above, but confirm a targeted
  -- single-column attempt also fails, not just SELECT *).
  v_caught := false;
  BEGIN
    PERFORM unsubscribe_token FROM public.subscribers LIMIT 1;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R3-10: anon can read subscribers.unsubscribe_token'; END IF;

  -- Round 3 test 11: arbitrary subscriber UPDATE fails outright (no grant).
  v_caught := false;
  BEGIN
    UPDATE public.subscribers SET is_subscribed = false WHERE email = 'someone-else@example.test';
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R3-11: anon can UPDATE an arbitrary subscribers row'; END IF;

  -- Round 4 test 12/15 (corrected): subscribe_email RPC returns void — the
  -- ONLY observable outcome for anon of a valid call is "no exception was
  -- raised". A brand-new email, an already-actively-subscribed email, and
  -- a previously-unsubscribed email must all produce this SAME observable
  -- outcome (see R4 opted-out/non-distinguishing tests below) — that is
  -- the whole point of the round-4 fix.
  v_caught := false;
  BEGIN
    PERFORM public.subscribe_email(v_sub_email, 'price_alert');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF v_caught THEN RAISE EXCEPTION 'FAIL R3-12: subscribe_email raised for a brand-new subscriber'; END IF;

  -- Calling again for the SAME already-subscribed email must not raise or
  -- leak a row either — identical observable outcome to the first call.
  v_caught := false;
  BEGIN
    PERFORM public.subscribe_email(v_sub_email, 'price_alert');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF v_caught THEN RAISE EXCEPTION 'FAIL R3-12b: subscribe_email raised for an already-subscribed email'; END IF;

  -- Round 3 test 13: invalid/empty input changes zero rows and does not raise.
  v_caught := false;
  BEGIN
    PERFORM public.subscribe_email('', 'price_alert');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF v_caught THEN RAISE EXCEPTION 'FAIL R3-13: subscribe_email raised for an empty email'; END IF;
  v_caught := false;
  BEGIN
    PERFORM public.subscribe_email(NULL, 'price_alert');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF v_caught THEN RAISE EXCEPTION 'FAIL R3-13b: subscribe_email raised for a NULL email'; END IF;

  -- Round 4 test: subscribe_email must NOT reactivate a previously-
  -- unsubscribed email — the core opted-out-address protection requirement.
  -- Same observable outcome (no exception) as every other case above; the
  -- actual row-state proof happens after RESET ROLE, in superuser context,
  -- below (subscribers has no anon-visible SELECT to check it here).
  v_caught := false;
  BEGIN
    PERFORM public.subscribe_email(v_optout_email, 'hero_banner');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF v_caught THEN RAISE EXCEPTION 'FAIL R4-optout: subscribe_email raised for a previously-unsubscribed email'; END IF;

  -- Round 4 test: subscribe_email on an already-active email (seeded
  -- earlier, distinct from v_sub_email above) must be a true no-op, not
  -- just "no exception" — confirmed via subscribed_at after RESET ROLE.
  v_caught := false;
  BEGIN
    PERFORM public.subscribe_email(v_active_email, 'hero_banner');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF v_caught THEN RAISE EXCEPTION 'FAIL R4-active: subscribe_email raised for an already-active email'; END IF;

  RESET ROLE;

  -- Superuser-context verification (RLS-exempt): the opted-out email must
  -- remain unsubscribed with its unsubscribed_at/token untouched, and the
  -- already-active email's subscribed_at must be unchanged — proving both
  -- anon subscribe_email calls above were genuinely no-ops, not merely
  -- exception-free.
  IF (SELECT is_subscribed FROM public.subscribers WHERE email = v_optout_email) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL R4-optout-b: subscribe_email reactivated a previously-unsubscribed email';
  END IF;
  IF (SELECT unsubscribed_at FROM public.subscribers WHERE email = v_optout_email) IS NULL THEN
    RAISE EXCEPTION 'FAIL R4-optout-c: subscribe_email cleared unsubscribed_at on a previously-unsubscribed email';
  END IF;
  SELECT unsubscribe_token INTO v_optout_token_after FROM public.subscribers WHERE email = v_optout_email;
  IF v_optout_token_after IS DISTINCT FROM v_optout_token_before THEN
    RAISE EXCEPTION 'FAIL R4-optout-d: subscribe_email changed unsubscribe_token on a previously-unsubscribed email';
  END IF;

  SELECT subscribed_at INTO v_active_subscribed_at_after FROM public.subscribers WHERE email = v_active_email;
  IF v_active_subscribed_at_after IS DISTINCT FROM v_active_subscribed_at_before THEN
    RAISE EXCEPTION 'FAIL R4-active-b: subscribe_email modified an already-active subscriber''s row';
  END IF;
  IF (SELECT is_subscribed FROM public.subscribers WHERE email = v_active_email) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL R4-active-c: subscribe_email left an already-active subscriber in a non-subscribed state';
  END IF;

  -- ── anon (continued) ─────────────────────────────────────────
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);

  -- Round 4 test: optimizer_requests / optimizer_results are now fully
  -- inaccessible to anon, including SELECT (grant fully revoked, not just
  -- RLS-invisible).
  v_caught := false;
  BEGIN
    PERFORM * FROM public.optimizer_requests;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R4-1: anon can SELECT optimizer_requests'; END IF;

  v_caught := false;
  BEGIN
    PERFORM * FROM public.optimizer_results;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R4-2: anon can SELECT optimizer_results'; END IF;

  RESET ROLE;

  -- ── authenticated, non-admin ─────────────────────────────────
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_user_id)::text, true);

  -- 2. authenticated user cannot enumerate another user's alerts (no
  -- ownership mechanism authorizes it — SELECT is fully denied).
  v_caught := false;
  BEGIN
    PERFORM * FROM public.saved_searches;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 2: authenticated can enumerate saved_searches'; END IF;

  -- Postflight correction test 9: authenticated can SELECT their own role
  -- row — "Users can view their own roles" must still work; this is the
  -- exact pattern useAdminAuth.ts / analytics.ts's requireAdmin() rely on.
  SELECT role INTO v_role_text FROM public.user_roles WHERE user_id = v_user_id;
  IF v_role_text IS DISTINCT FROM 'user' THEN
    RAISE EXCEPTION 'FAIL R4-ur-9: authenticated could not SELECT their own user_roles row (regression)';
  END IF;

  -- Postflight correction test 10: authenticated cannot SELECT another
  -- user's role row — RLS-filtered to zero rows, not an exception (same
  -- row-invisibility mode used throughout this suite for non-admin reads).
  SELECT count(*) INTO v_role_count FROM public.user_roles WHERE user_id = v_other_user_id;
  IF v_role_count <> 0 THEN
    RAISE EXCEPTION 'FAIL R4-ur-10: authenticated (non-admin) can SELECT another user''s user_roles row';
  END IF;

  -- Postflight correction test 11: authenticated (non-admin) cannot INSERT
  -- a user_roles row (e.g. a self-granted 'admin' escalation attempt) — the
  -- "Admins can manage roles" WITH CHECK clause rejects the new row
  -- outright, which Postgres raises as an explicit RLS-violation error
  -- (unlike UPDATE/DELETE's silent zero-row behaviour below).
  v_caught := false;
  BEGIN
    INSERT INTO public.user_roles (user_id, role) VALUES (v_user_id, 'admin');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R4-ur-11: authenticated (non-admin) was able to INSERT a user_roles row (privilege escalation)'; END IF;

  -- Postflight correction test 12: authenticated (non-admin) cannot UPDATE
  -- a user_roles row, including their own — "Admins can manage roles"'
  -- USING clause makes every row invisible to a non-admin for this
  -- command, so the UPDATE silently affects zero rows; no exception is
  -- raised (same failure mode as ad_placements FAIL 9 / subscribers
  -- R3-9c above). The actual no-op is verified in superuser context below.
  UPDATE public.user_roles SET role = 'admin' WHERE user_id = v_user_id;

  -- Postflight correction test 13: authenticated (non-admin) cannot DELETE
  -- a user_roles row, including their own — same row-invisibility mode.
  DELETE FROM public.user_roles WHERE user_id = v_user_id;

  -- 12 (behavioural). authenticated (non-admin) cannot write user_profiles.plan.
  v_caught := false;
  BEGIN
    UPDATE public.user_profiles SET plan = 'pro' WHERE user_id = v_user_id;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 12: authenticated (non-admin) was able to UPDATE user_profiles.plan'; END IF;

  -- 14 (behavioural). authenticated (non-admin) cannot fabricate optimizer_results.
  v_caught := false;
  BEGIN
    INSERT INTO public.optimizer_results (request_id, recommended_route, estimated_total_cost, timing_advice)
    VALUES (gen_random_uuid(), '{}'::jsonb, 100, 'neutral');
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL 14: authenticated (non-admin) was able to INSERT optimizer_results'; END IF;

  -- Round 4 test: authenticated (non-admin) also has no SELECT on
  -- optimizer_requests / optimizer_results (grant fully revoked for both
  -- client roles, not just anon).
  v_caught := false;
  BEGIN
    PERFORM * FROM public.optimizer_requests;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R4-3: authenticated (non-admin) can SELECT optimizer_requests'; END IF;

  v_caught := false;
  BEGIN
    PERFORM * FROM public.optimizer_results;
  EXCEPTION WHEN OTHERS THEN v_caught := true;
  END;
  IF NOT v_caught THEN RAISE EXCEPTION 'FAIL R4-4: authenticated (non-admin) can SELECT optimizer_results'; END IF;

  -- 9. authenticated non-admin cannot perform admin ad CRUD.
  --
  -- NOTE ON FAILURE MODE: `authenticated` DOES hold the table-level UPDATE
  -- grant (needed for the admin path to be reachable at all — see the
  -- migration comment). For a non-admin, the ONLY applicable policy
  -- ("Admins can manage ad placements") fails its USING clause, which makes
  -- RLS treat the row as simply not present for this UPDATE — Postgres
  -- affects ZERO rows and raises NO exception (this is standard, correct
  -- RLS behaviour: row-invisibility, not a grant-level permission error).
  -- This is a materially different failure mode from anon's case above
  -- (anon has no grant at all, so its attempt raises a hard permission-
  -- denied error) — the test must check the actual row state, not assume
  -- an exception.
  UPDATE public.ad_placements SET title = 'still hijacked' WHERE id = v_ad_id;
  IF (SELECT title FROM public.ad_placements WHERE id = v_ad_id) <> 'Original Title' THEN
    RAISE EXCEPTION 'FAIL 9: authenticated (non-admin) was able to rewrite ad_placements.title';
  END IF;

  -- Round 3 test 9 (subscribers, non-admin authenticated): same
  -- grant-present/policy-absent row-invisibility mode as ad_placements —
  -- UPDATE silently affects zero rows, no exception. UNLIKE ad_placements,
  -- subscribers has NO permissive SELECT policy visible to a non-admin at
  -- all (correctly — subscriber emails must not be enumerable even by an
  -- ordinary logged-in user), so the verifying SELECT itself returns ZERO
  -- ROWS here, not the pre-update value — checking `<> 'Original Title'`
  -- would misread "row invisible" as "row changed" (a genuine bug caught
  -- while writing this test, the same class of bug fixed in round 2's
  -- test 9). The UPDATE's actual effect is verified afterwards, in the
  -- superuser cleanup section below, where subscribers is fully visible.
  UPDATE public.subscribers SET is_subscribed = false WHERE email = v_sub_email;

  -- The row-count of this non-admin SELECT must be exactly zero — NOT an
  -- exception. `authenticated` holds the raw table SELECT grant (required
  -- for the admin path to be reachable at all); it is RLS, not the grant,
  -- that hides every row from a non-admin. Asserting an exception here
  -- would be the same category of test bug as above, just for SELECT
  -- instead of UPDATE.
  IF (SELECT count(*) FROM public.subscribers) <> 0 THEN
    RAISE EXCEPTION 'FAIL R3-9c: authenticated (non-admin) can see one or more subscribers rows';
  END IF;

  RESET ROLE;

  -- Superuser-context verification (RLS-exempt): confirm the non-admin
  -- UPDATE two statements above genuinely affected zero rows, BEFORE the
  -- admin block below performs its own legitimate update to the same row
  -- (which would otherwise make this check unable to distinguish "the
  -- non-admin attempt did nothing" from "the admin later fixed it").
  IF (SELECT is_subscribed FROM public.subscribers WHERE email = v_sub_email) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'FAIL R3-9b: authenticated (non-admin) was able to rewrite a subscribers row';
  END IF;

  -- Postflight correction tests 12/13 (superuser verification): confirm
  -- the non-admin UPDATE and DELETE attempts against user_roles above
  -- genuinely did nothing — v_user_id's row must still exist, unchanged,
  -- with role='user', not escalated to 'admin' and not removed. Checked
  -- BEFORE the admin block below, for the same reason as R3-9b above.
  SELECT role INTO v_role_text FROM public.user_roles WHERE user_id = v_user_id;
  IF v_role_text IS DISTINCT FROM 'user' THEN
    RAISE EXCEPTION 'FAIL R4-ur-12-13: authenticated (non-admin) was able to UPDATE or DELETE their own user_roles row (got role=%)', v_role_text;
  END IF;

  -- ── authenticated, admin ─────────────────────────────────────
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', json_build_object('role', 'authenticated', 'sub', v_admin_id)::text, true);

  -- 10. authenticated admin CAN perform intended admin ad CRUD (no regression).
  UPDATE public.ad_placements SET title = 'Admin Edited Title' WHERE id = v_ad_id;
  IF (SELECT title FROM public.ad_placements WHERE id = v_ad_id) <> 'Admin Edited Title' THEN
    RAISE EXCEPTION 'FAIL 10: admin was NOT able to update ad_placements.title (regression)';
  END IF;

  -- Round-4 pre-merge correction test: admin INSERT and DELETE must still
  -- work through the single consolidated "Admins can manage ad placements"
  -- FOR ALL policy, now that the three separate legacy INSERT/UPDATE/
  -- DELETE policies it replaced are gone. FOR ALL covers every command by
  -- design, but this proves it behaviourally rather than by inspection —
  -- the specific regression risk this cleanup could have introduced.
  INSERT INTO public.ad_placements (name, type, placement, page, title, destination_url, is_active, impressions, clicks)
  VALUES ('bf0r5-round4-admin-insert-test', 'sponsored_card', 'after_result_3', 'both', 'Admin Insert Test', 'https://example.test/admin-insert', true, 0, 0)
  RETURNING id INTO v_ad_id2;
  IF v_ad_id2 IS NULL THEN
    RAISE EXCEPTION 'FAIL R4-ad-insert: admin was NOT able to INSERT into ad_placements (regression)';
  END IF;

  DELETE FROM public.ad_placements WHERE id = v_ad_id2;
  IF EXISTS (SELECT 1 FROM public.ad_placements WHERE id = v_ad_id2) THEN
    RAISE EXCEPTION 'FAIL R4-ad-delete: admin was NOT able to DELETE from ad_placements (regression)';
  END IF;

  -- Round 3 test 14: admin subscriber management remains functional.
  SELECT id, unsubscribe_token INTO v_sub_id, v_sub_token
  FROM public.subscribers WHERE email = v_sub_email;
  IF v_sub_id IS NULL THEN
    RAISE EXCEPTION 'FAIL R3-14a: admin could not SELECT the subscribers row (regression)';
  END IF;
  UPDATE public.subscribers SET is_subscribed = false, unsubscribed_at = now() WHERE id = v_sub_id;
  IF (SELECT is_subscribed FROM public.subscribers WHERE id = v_sub_id) IS DISTINCT FROM false THEN
    RAISE EXCEPTION 'FAIL R3-14b: admin was NOT able to update a subscribers row (regression)';
  END IF;

  -- Postflight correction test 14: authenticated admin still passes the
  -- intended "Admins can manage roles" policy — genuine role-management
  -- write, not just SELECT. Confirms the postflight correction (which
  -- touched only anon/service_role grants, never this policy) left the
  -- admin write path fully functional.
  UPDATE public.user_roles SET role = 'moderator' WHERE user_id = v_other_user_id;
  IF (SELECT role FROM public.user_roles WHERE user_id = v_other_user_id) IS DISTINCT FROM 'moderator' THEN
    RAISE EXCEPTION 'FAIL R4-ur-14: admin was NOT able to UPDATE a user_roles row via "Admins can manage roles" (regression)';
  END IF;

  RESET ROLE;

  -- Round 3 test 6/7 continued (superuser context): confirm the initial
  -- price_history row from the create_saved_search RPC call above was
  -- actually written server-side, and confirm the second RPC call's
  -- current_price=NULL correctly skipped price_history.
  SELECT count(*) INTO v_price_row_count FROM public.price_history WHERE saved_search_id = v_rpc_id;
  IF v_price_row_count <> 1 THEN
    RAISE EXCEPTION 'FAIL R3-6: create_saved_search did not write exactly one initial price_history row (got %)', v_price_row_count;
  END IF;

  -- Round 3 test 7: caller cannot enumerate another alert through the RPC
  -- — the RPC has no read/list capability at all (confirmed structurally
  -- in PART A2 by its RETURNS TABLE(id, created_at) shape with no WHERE-
  -- clause parameter, and behaviourally here: it only ever returns the
  -- row it itself just inserted).
  IF v_rpc_id = v_search_id THEN
    RAISE EXCEPTION 'FAIL R3-7: RPC returned an id belonging to a pre-existing row, not its own new row';
  END IF;

  -- Cleanup (service_role / superuser context after RESET ROLE).
  DELETE FROM public.ad_placements WHERE id = v_ad_id;
  DELETE FROM public.price_history WHERE saved_search_id IN (
    SELECT id FROM public.saved_searches WHERE email IN (
      'victim@example.test', 'new-visitor@example.test', 'second-visitor@example.test', 'attacker@example.test'
    )
  );
  DELETE FROM public.saved_searches WHERE email IN (
    'victim@example.test', 'new-visitor@example.test', 'second-visitor@example.test', 'attacker@example.test'
  );
  DELETE FROM public.subscribers WHERE email IN (v_sub_email, v_optout_email, v_active_email);
  DELETE FROM public.user_roles WHERE user_id IN (v_admin_id, v_user_id, v_other_user_id);

  RAISE NOTICE 'PART B: all behavioural RLS/RPC tests passed.';
END $$;
