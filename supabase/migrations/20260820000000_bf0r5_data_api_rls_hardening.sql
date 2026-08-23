-- BF-0R-5: Data API / RLS least-privilege hardening (round 4 — corrected)
-- ============================================================================
-- Forward-only. No historical migration is edited. No row is deleted. No
-- backfill is performed.
--
-- A read-only production privilege/RLS audit against the authoritative
-- Supabase project (pjehrnhmjrxrlrhuhqgf) found that several tables carry
-- policies from the original Jan/Feb-2026 migrations that grant the `anon`
-- and/or `authenticated` Data API roles far more than the product actually
-- uses. `service_role` (Edge Functions: run-optimizer, stripe-webhook,
-- get-subscription-status, check-price-alerts, unsubscribe, send-bulk-email)
-- BYPASSES RLS entirely, but a local-reset test in round 1 proved its actual
-- table PRIVILEGES are NOT guaranteed by anything this repository tracks —
-- every table service_role needs now has an EXPLICIT grant below, scoped to
-- exactly the operations traced in the current codebase, rather than relying
-- on Supabase's implicit platform-level bootstrap grant.
--
-- Round 3 corrections applied here (see BOOKINGSFINDER_BF0R5_DATA_API_SECURITY.md
-- for the full writeup):
--   1. saved_searches / price_history: round 2's "anon/authenticated keep
--      raw INSERT" design was WRONG. usePriceAlerts.ts's createAlert() does
--      `.insert(...).select().single()` and needs `data.id` back to record
--      the initial price point — a raw INSERT grant with SELECT fully
--      revoked cannot satisfy PostgREST's `.select()` representation
--      request, so alert creation would have broken in production. Fixed by
--      replacing the raw INSERT grant entirely with a single narrow
--      SECURITY DEFINER RPC, create_saved_search(...), that performs the
--      INSERT (and the optional initial price_history INSERT) as the
--      table-owning role and returns only {id, created_at} — no raw client
--      table privilege on either table remains at all. usePriceAlerts.ts is
--      updated in this same branch to call the RPC.
--   2. subscribers: a table missed entirely in rounds 1-2. Live production
--      migration 20260113154936 defines "Anyone can unsubscribe with token"
--      as `FOR UPDATE USING (true) WITH CHECK (true)` — no token predicate
--      whatsoever, despite the name. Combined with "Anyone can subscribe"
--      (`FOR INSERT WITH CHECK (true)`), any caller holding a raw table
--      grant could rewrite ANY subscriber's email, is_subscribed, or
--      unsubscribe_token. Re-audit found the real unsubscribe flow
--      (supabase/functions/unsubscribe) already runs under service_role,
--      which bypasses RLS unconditionally — so this policy has ZERO
--      legitimate caller and is pure exposure. Fixed by dropping both
--      dangerous policies, removing all raw anon/authenticated table
--      privilege, and adding a single SECURITY DEFINER RPC,
--      subscribe_email(...), as the only client-reachable write path
--      (upsert-only, returns a boolean, never a row). Admin management
--      (AdminSubscribers.tsx) is preserved via the pre-existing
--      has_role-gated SELECT/UPDATE/DELETE policies, unchanged.
--   3. ad_placements RPCs: `SET search_path = public` replaced with
--      `SET search_path = ''` in both increment_ad_impression and
--      increment_ad_click, per instruction — every referenced relation was
--      already fully schema-qualified (`public.ad_placements`), so this is
--      a strictly safer, equivalent-behavior change with no logic impact.
--   4. service_role privileges made explicit for subscribers as well (see
--      above), continuing the round-2 approach for every other table.
--
-- Round 4 corrections applied here (see BOOKINGSFINDER_BF0R5_DATA_API_SECURITY.md
-- for the full writeup):
--   1. service_role EXACT privileges: GRANT is additive, not authoritative.
--      Every table below that claims an "exactly X, Y" service_role
--      privilege set (subscriptions, user_profiles, optimizer_requests,
--      optimizer_results, saved_searches, price_history, subscribers) now
--      runs an explicit `REVOKE ALL ... FROM service_role` immediately
--      before its `GRANT ... TO service_role` — so the GRANT is the
--      complete and only source of service_role's privileges on that
--      table, regardless of what Supabase's platform-level bootstrap grant
--      (untracked by this repository) issued at project-creation time.
--   2. subscribe_email(...) privacy/consent fix — two real defects in the
--      round-3 design, found in this round's review:
--        a. SUBSCRIBER-STATUS/EXISTENCE ORACLE: round 3 returned `true` for
--           both a brand-new email and a reactivated previously-unsubscribed
--           email, `false` only when already actively subscribed — a
--           two-way oracle over any third party's subscription state.
--        b. UNVERIFIED RE-SUBSCRIPTION: round 3's `ON CONFLICT ... DO
--           UPDATE ... WHERE is_subscribed = false` silently reactivated a
--           previously-unsubscribed row with no proof of ownership.
--      Fixed: `ON CONFLICT (email) DO NOTHING` (never touches an existing
--      row, active or unsubscribed) and `RETURNS void` (no boolean, no row,
--      identical response for new/already-active/previously-unsubscribed).
--      A verified-ownership resubscription flow is explicitly NOT invented
--      here — see the BF-0R-6 note below.
--   3. Frontend welcome-email trigger removed. usePriceAlerts.ts's
--      addSubscriber() previously branched on subscribe_email's boolean to
--      decide whether to call the (separately unauthenticated)
--      send-welcome-email Edge Function — itself a second, Edge-Function-
--      triggering existence oracle. That branch is removed; the welcome
--      email is temporarily withheld pending a non-oracle-shaped trigger
--      design (BF-0R-6).
--   4. optimizer_requests / optimizer_results: a final repository-wide
--      search (`grep -r "from('optimizer_re" src/`) confirms NO frontend
--      code reads either table. The "Users can view their own requests" /
--      "Users can view results for their requests" SELECT policies now
--      have zero legitimate client caller and are dropped; SELECT is
--      revoked from anon/authenticated at the grant layer too (not just
--      INSERT/UPDATE/DELETE as in round 3). No client role — anon or
--      authenticated — has ANY raw Data API privilege on either table
--      after this migration. Historical rows are NOT deleted;
--      service_role's own SELECT/INSERT remains exactly as before.
--
-- Confirmed by a repository-wide search of src/ and supabase/functions/
-- before writing this migration (unchanged from round 2 plus the additions
-- above):
--   - No frontend code calls `.from('user_profiles')`/`.from('subscriptions')`
--     for any write. No frontend code calls `.from('optimizer_requests')` or
--     `.from('optimizer_results')` at all — confirmed again in round 4 (see
--     item 4 above), which is why client SELECT is now dropped too.
--   - useAdminAuth.ts and _shared/admin-auth.ts both authorize exclusively
--     via user_roles/has_role(); neither reads admin_profiles.
--   - usePriceAlerts.ts's `recordPrice` is defined but never called from any
--     page/component — dead code. check-price-alerts (service_role) is the
--     actual, already-existing server-side price-recording path for
--     ONGOING price updates. usePriceAlerts.ts's createAlert() IS a live
--     browser writer of price_history (the *initial* price point) — this
--     was previously mis-cited as evidence that no browser code writes
--     price_history; that citation is corrected here. createAlert()'s
--     initial-price write now happens inside create_saved_search(), not
--     from the browser directly.
--
-- ============================================================================
-- BF-0R-6 — DOCUMENTED, NOT FIXED IN THIS MIGRATION (Edge/alerts security
-- phase; database/RLS scope only in BF-0R-5, per instruction not to expand
-- scope without dedicated evidence/authorization for each item):
--
--   1. supabase/functions/send-welcome-email — no auth check, accepts an
--      arbitrary `email` field, sends a real email via Resend to whatever
--      address is supplied, with caller-controlled `origin`/`destination`
--      values interpolated into the HTML body. This is an unauthenticated
--      email-relay/spam-abuse primitive AND a potential HTML-injection
--      vector into a real outbound email. Edge Function authorization
--      issue, not a database/RLS issue.
--   2. supabase/functions/check-price-alerts — runs as service_role
--      (bypasses RLS unconditionally), enumerates ALL active alerts,
--      calls the Travelpayouts API, writes DB rows, and sends alert
--      emails. No authenticated scheduler/admin verification was observed
--      gating who/what may invoke it.
--   3. Anonymous create_saved_search(...) — permits arbitrary-email alert
--      creation with no ownership verification of the supplied email.
--      Needed before any of this becomes a fully automated, production-safe
--      alerting pipeline: (a) verified-email ownership for alert creation
--      and for the future resubscription flow noted above, and (b)
--      abuse/rate controls on creation and on check-price-alerts' outbound
--      email volume.
--   4. Anonymous subscribe_email(...) — this round's fix (see the
--      subscribers block below) correctly closes the subscriber-status/
--      existence oracle and correctly prevents an anonymous caller from
--      reactivating a previously-unsubscribed row. It does NOT verify
--      email ownership for a genuinely NEW row: an anonymous caller can
--      still submit any arbitrary, previously-unknown, third-party email
--      address and create a brand-new subscribers row for it. This is a
--      separate, still-open surface from the oracle/reactivation issue —
--      not something to fix by touching subscribe_email's logic again in
--      BF-0R-5. Before automated marketing/bulk-email delivery to
--      newly-created subscribers is production-safe, a verified-email/
--      double-opt-in (or equivalent confirmation-link) step is needed,
--      plus reasonable rate/abuse controls on public signup to prevent
--      database stuffing (mass creation of unconfirmed rows for addresses
--      the submitter does not own).
--
-- These four items are the next separate BF-0R-6 Edge/alerts security
-- phase and are explicitly out of scope for this migration.
-- ============================================================================


-- ═══════════════════════════════════════════════════════════════════
-- 1. SUBSCRIPTIONS
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE: "Service can manage subscriptions" FOR ALL USING (true) WITH CHECK
-- (true), with no TO clause — applies to PUBLIC. anon/authenticated could
-- SELECT, INSERT, UPDATE or DELETE any row for any user_id. Confirmed live
-- in production. Billing/entitlement state was fully client-writable.
--
-- AFTER: authenticated may SELECT only their own subscription. No client
-- role may INSERT/UPDATE/DELETE. service_role (stripe-webhook) is granted
-- exactly SELECT/INSERT/UPDATE explicitly (traced usage: upsert on
-- checkout.session.completed, update on subscription status changes; no
-- DELETE observed anywhere).

DROP POLICY IF EXISTS "Service can manage subscriptions" ON public.subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscription" ON public.subscriptions;

-- Round 4: GRANT is additive, not authoritative — a GRANT of exactly the
-- required service_role privileges does NOT remove any broader privilege
-- service_role may already hold (e.g. Supabase's platform-level bootstrap
-- grant, which is untracked by this repository and not guaranteed to match
-- across local/production). REVOKE ALL FROM service_role first, on every
-- role touched below, so the subsequent GRANT is the complete, exact, and
-- only source of service_role's privileges on this table.
REVOKE ALL ON public.subscriptions FROM anon, authenticated, service_role;
GRANT SELECT ON public.subscriptions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.subscriptions TO service_role;

CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 2. USER_PROFILES
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE: "Users can insert their own profile" and "Users can update their
-- own profile" let any authenticated caller write ANY column on their own
-- row via the Data API — including plan, monthly_optimizer_uses, and
-- last_optimizer_reset. Confirmed live in production.
--
-- AFTER: authenticated may SELECT only their own profile. No client role
-- may INSERT or UPDATE any column — confirmed unused by any current
-- frontend code, and the signup trigger already handles row creation.
-- service_role is granted exactly SELECT/INSERT/UPDATE explicitly (traced
-- usage: stripe-webhook writes plan; get-subscription-status reads and
-- conditionally resets monthly_optimizer_uses/last_optimizer_reset;
-- run-optimizer's atomic claim, PR #65, not yet deployed, will read and
-- update the same two columns once merged — this grant preserves that path
-- for when it ships, per instruction).

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;

-- Round 4: explicit REVOKE ALL FROM service_role before GRANT — see the
-- note on the subscriptions block above; applied identically here.
REVOKE ALL ON public.user_profiles FROM anon, authenticated, service_role;
GRANT SELECT ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.user_profiles TO service_role;

CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);


-- ═══════════════════════════════════════════════════════════════════
-- 3. OPTIMIZER_REQUESTS
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE: "Anyone can create optimizer requests" FOR INSERT WITH CHECK
-- (true) — a holdover from a pre-authentication anonymous-preview design.
-- run-optimizer (PR #65) writes every request row itself, server-side. No
-- current frontend code inserts into this table. "Users can view their own
-- requests" (SELECT, caller's own rows OR legacy rows with user_id IS NULL)
-- was carried forward unchanged through rounds 1-3.
--
-- ROUND 4: a final repository-wide search (src/, supabase/functions/) for
-- `.from('optimizer_requests')` confirms no frontend code reads this table
-- at all — the "own requests" SELECT policy has zero legitimate client
-- caller today; run-optimizer (service_role, bypasses RLS) is the only
-- actual reader. Raw Data API SELECT access is therefore dropped for
-- clients too, not just write access. Historical rows are NOT deleted —
-- only the client-facing policy/grant is removed; service_role (and any
-- future admin tooling built later) retains full visibility.
--
-- AFTER: no client role may SELECT/INSERT/UPDATE/DELETE. service_role is
-- granted exactly SELECT/INSERT explicitly (run-optimizer inserts a row and
-- reads back its id; no UPDATE/DELETE observed anywhere).

DROP POLICY IF EXISTS "Anyone can create optimizer requests" ON public.optimizer_requests;
DROP POLICY IF EXISTS "Users can view their own requests" ON public.optimizer_requests;

-- Round 4: explicit REVOKE ALL FROM service_role before GRANT — see the
-- note on the subscriptions block above; applied identically here. Client
-- roles now lose SELECT as well (see round-4 note above), not just writes.
REVOKE ALL ON public.optimizer_requests FROM anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.optimizer_requests TO service_role;


-- ═══════════════════════════════════════════════════════════════════
-- 4. OPTIMIZER_RESULTS
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE: "Service can manage results" FOR ALL USING (true) WITH CHECK
-- (true) — same PUBLIC-not-service_role naming mismatch as subscriptions.
-- Any caller could fabricate a fake "provider-backed" result or tamper
-- with/delete a genuine one. "Users can view results for their requests"
-- (SELECT, via a join proving the caller owns the parent request) was
-- carried forward unchanged through rounds 1-3.
--
-- ROUND 4: same final repository-wide search as optimizer_requests above —
-- no frontend code reads this table either (`.from('optimizer_results')`
-- has zero matches in src/). Raw Data API SELECT access is dropped for
-- clients too. Historical rows are NOT deleted.
--
-- AFTER: no client role may SELECT/INSERT/UPDATE/DELETE. service_role is
-- granted exactly INSERT explicitly (run-optimizer inserts a result row;
-- no SELECT/UPDATE/DELETE by service_role observed anywhere).

DROP POLICY IF EXISTS "Service can manage results" ON public.optimizer_results;
DROP POLICY IF EXISTS "Users can view results for their requests" ON public.optimizer_results;

-- Round 4: explicit REVOKE ALL FROM service_role before GRANT — see the
-- note on the subscriptions block above; applied identically here. Client
-- roles now lose SELECT as well (see round-4 note above), not just writes.
REVOKE ALL ON public.optimizer_results FROM anon, authenticated, service_role;
GRANT INSERT ON public.optimizer_results TO service_role;


-- ═══════════════════════════════════════════════════════════════════
-- 5. ADMIN_PROFILES
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE: "Users can create their own admin profile" FOR INSERT WITH CHECK
-- (auth.uid() = user_id) let any authenticated user create a row for
-- themselves in a table named admin_profiles.
--
-- Re-confirmed (round 2): repository-wide search (src/, supabase/functions/)
-- shows this table is NOT read by any current authorization path —
-- useAdminAuth.ts and _shared/admin-auth.ts both check user_roles/has_role()
-- exclusively, and admin_profiles appears only in generated TypeScript
-- schema types. This self-insert is therefore NOT currently exploitable for
-- privilege escalation, but is closed as defense-in-depth. The table itself
-- is NOT dropped — no separately-proven reason to remove it entirely.

DROP POLICY IF EXISTS "Users can create their own admin profile" ON public.admin_profiles;

REVOKE INSERT ON public.admin_profiles FROM anon, authenticated;


-- ═══════════════════════════════════════════════════════════════════
-- 6. USER_ROLES — re-audited, unchanged
-- ═══════════════════════════════════════════════════════════════════
-- "Admins can manage roles" FOR ALL USING (public.has_role(auth.uid(),
-- 'admin')) already requires the CALLER to already hold the admin role
-- before they can insert/update/delete ANY row in this table — including
-- their own. Not a `USING (true)` gap: has_role() is a genuine, correctly-
-- scoped check. "Users can view their own roles" is SELECT-only and
-- correctly self-scoped; it cannot combine with the admin policy to widen
-- write access (permissive-policy OR-combination applies per command, and
-- no other policy grants INSERT/UPDATE/DELETE). No non-admin privilege-
-- escalation path exists. No change made. No explicit service_role grant is
-- added: no current Edge Function writes user_roles directly (the
-- auto-admin-assignment trigger is SECURITY DEFINER and needs none).


-- ═══════════════════════════════════════════════════════════════════
-- 7. AD_PLACEMENTS (round 2 — redesigned)
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE (round 1 shipped a BEFORE UPDATE trigger here): re-evaluated per
-- explicit instruction to consider column-level grants and/or a
-- tightly-scoped RPC. Column-level grants alone were re-confirmed
-- insufficient: `authenticated` must keep full-column UPDATE privilege for
-- the admin path (AdminAds.tsx, ordinary browser client), and Postgres has
-- no way to grant a column subset to only SOME members of `authenticated`
-- (admin-ness is data-driven via user_roles, not a separate Postgres role) —
-- a permissive tracking policy would still combine via OR with that grant
-- for non-admins.
--
-- SMALLER DESIGN CHOSEN: remove ALL direct client UPDATE capability on this
-- table for non-admins. Impression/click tracking moves to two narrow
-- SECURITY DEFINER RPCs that can only add exactly one to one named counter
-- on one active row — no client-supplied value, no other column reachable,
-- no arbitrary-assignment ("impressions = 999999999") possible. This is
-- smaller and more auditable than a trigger: there is no longer any
-- permissive policy path through which a non-admin could even attempt a raw
-- UPDATE, so no column-comparison guard is needed at all.
--
-- Hardening applied to both RPCs, per instruction: fixed `search_path`,
-- fully-qualified object references, explicit REVOKE-then-GRANT EXECUTE
-- (never left PUBLIC-executable by default), and the only input is the
-- target row's id — no column name, no value, nothing else is settable.

DROP POLICY IF EXISTS "Allow increment tracking" ON public.ad_placements;

-- Round-4 pre-merge correction: migration 20260113151333 already created
-- three admin-only write policies on this table — "Admins can insert ads"
-- (INSERT), "Admins can update ads" (UPDATE), "Admins can delete ads"
-- (DELETE), all has_role(auth.uid(), 'admin')-gated. This migration's
-- combined "Admins can manage ad placements" FOR ALL policy was added
-- alongside them without dropping them first. That never reopened the
-- vulnerability — every one of the four policies is admin-gated, so a
-- non-admin still could not write — but it left four redundant permissive
-- policies covering the same rows and made the "ONLY" claim below
-- inaccurate. All four (the three legacy ones plus this migration's own,
-- the latter DROPped defensively for idempotency on a re-run) are dropped
-- here and replaced with exactly one explicit policy.
DROP POLICY IF EXISTS "Admins can insert ads" ON public.ad_placements;
DROP POLICY IF EXISTS "Admins can update ads" ON public.ad_placements;
DROP POLICY IF EXISTS "Admins can delete ads" ON public.ad_placements;
DROP POLICY IF EXISTS "Admins can manage ad placements" ON public.ad_placements;

REVOKE ALL ON public.ad_placements FROM anon;
GRANT SELECT ON public.ad_placements TO anon;

REVOKE ALL ON public.ad_placements FROM authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ad_placements TO authenticated;
-- The grant above is necessary for the admin path to be reachable at all;
-- RLS is what actually stops a non-admin authenticated user from using it —
-- see the admin-only policy below, which is now genuinely the ONLY
-- INSERT/UPDATE/DELETE policy on this table after this migration (the
-- three legacy admin policies above were dropped, not left redundant).

CREATE POLICY "Admins can manage ad placements"
  ON public.ad_placements
  FOR ALL
  TO authenticated
  USING (public.has_role((select auth.uid()), 'admin'))
  WITH CHECK (public.has_role((select auth.uid()), 'admin'));

-- "Anyone can view active ads" (public SELECT of is_active=true rows) is
-- deliberately left untouched — anonymous visitors must be able to fetch ad
-- content to render it; this is genuine public catalogue access.

CREATE OR REPLACE FUNCTION public.increment_ad_impression(p_ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.ad_placements
  SET impressions = impressions + 1
  WHERE id = p_ad_id
    AND is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_ad_click(p_ad_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.ad_placements
  SET clicks = clicks + 1
  WHERE id = p_ad_id
    AND is_active = true;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_ad_impression(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_ad_click(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_ad_impression(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_ad_click(uuid) TO anon, authenticated;

COMMENT ON FUNCTION public.increment_ad_impression(uuid) IS
  'BF-0R5: the only way anon/authenticated may mutate ad_placements without
   the admin role. Adds exactly one to impressions on one active row; no
   other column or arbitrary value is reachable through this function.
   NOTE: this RPC prevents CONTENT tampering (no arbitrary column/value),
   it does NOT prevent an anonymous caller from calling it repeatedly to
   inflate the counter. Classified as analytics-abuse (P1), not a security
   boundary — impressions/clicks drive no billing or access decision
   anywhere in this codebase. Rate-limiting bot-driven inflation, if ever
   required, is a separate, out-of-scope follow-up.';
COMMENT ON FUNCTION public.increment_ad_click(uuid) IS
  'BF-0R5: the only way anon/authenticated may mutate ad_placements without
   the admin role. Adds exactly one to clicks on one active row; no other
   column or arbitrary value is reachable through this function.
   NOTE: this RPC prevents CONTENT tampering (no arbitrary column/value),
   it does NOT prevent an anonymous caller from calling it repeatedly to
   inflate the counter. Classified as analytics-abuse (P1), not a security
   boundary — impressions/clicks drive no billing or access decision
   anywhere in this codebase. Rate-limiting bot-driven inflation, if ever
   required, is a separate, out-of-scope follow-up.';

-- FRONTEND CHANGE REQUIRED AND IMPLEMENTED IN THIS BRANCH (round 3):
-- src/hooks/useHomeAds.ts previously performed a client-side read-then-
-- UPDATE to increment impressions/clicks. That direct UPDATE path has no
-- privilege once this migration lands (anon/authenticated have no more
-- table-level UPDATE grant on ad_placements). useHomeAds.ts now calls
-- `supabase.rpc('increment_ad_impression', { p_ad_id: adId })` /
-- `increment_ad_click` instead — see src/hooks/useHomeAds.ts in this same
-- commit. No product behavior is silently broken by this migration.


-- ═══════════════════════════════════════════════════════════════════
-- 8. SAVED_SEARCHES / PRICE_HISTORY (round 3 — RPC-only creation)
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE (original): FOR SELECT/UPDATE/DELETE USING (true) with no
-- ownership scoping at all — confirmed live: any caller can enumerate
-- every row (every user's email + full search history) or tamper with/
-- delete any alert.
--
-- BEFORE (round 2, WRONG): kept a raw `GRANT INSERT ... TO anon,
-- authenticated` plus a WITH CHECK(true) INSERT policy, on the theory that
-- INSERT-only is safe because the created row goes straight back to its
-- creator. That is false against the ACTUAL frontend contract:
-- usePriceAlerts.ts's createAlert() does
--   `.from('saved_searches').insert({...}).select().single()`
-- PostgREST's `.select()` after INSERT requires a SELECT-capable
-- representation of the new row (governed by the `Prefer:
-- return=representation` header + RLS SELECT policy), which round 2 had
-- just removed entirely — so the round-2 design would return the insert
-- error/empty result to every real caller in production. Verified locally
-- against the `anon` role (see BOOKINGSFINDER_BF0R5_DATA_API_SECURITY.md
-- §6) — this was NOT caught by the round-2 test plan because it only
-- exercised raw INSERT with `ON CONFLICT DO NOTHING`-style checks, never a
-- true `insert().select().single()` round trip.
--
-- Re-audit (round 2/3, unchanged conclusion): MyAlerts.tsx identifies
-- "ownership" by asking the visitor to type an email address, then queries
-- `.eq('email', email)` — this is client-side filtering only; RLS enforces
-- nothing about it, and email is not a secret. The row `id` is a genuine
-- gen_random_uuid() (high entropy) but the application never uses it as a
-- bearer credential — the "find my alerts" flow is fundamentally
-- email-indexed, not id-indexed, so scoping RLS to "id you already know"
-- would not preserve the existing product flow, and scoping by email is
-- exactly the "weak id+email scheme" this correction explicitly rules out.
-- No trustworthy ownership mechanism (authenticated ownership, a per-alert
-- bearer token, a signed management link, or server-side email
-- verification) exists anywhere in the current codebase for these two
-- tables.
--
-- DECISION (round 3 — corrected creation mechanism, same restriction
-- scope as round 2): Option B for viewing/managing existing alerts —
-- restrict, do not invent a weak scheme. Anonymous alert CREATION remains
-- fully functional, but now goes through a single narrow SECURITY DEFINER
-- RPC, create_saved_search(...), instead of a raw table grant:
--   - runs as the table-owning role (owner-exempt from RLS by default —
--     the same mechanism already used by increment_ad_impression/click
--     above), so it needs NO INSERT policy and NO raw client grant at all;
--   - accepts only the fields a visitor is legitimately allowed to supply
--     (email, origin, destination, departure_date, return_date,
--     passengers, cabin_class, target_price, current_price);
--   - validates required fields and rejects nonsensical passenger counts;
--   - performs the saved_searches INSERT and, if a current price was
--     supplied, the initial price_history INSERT, in the same transaction;
--   - returns ONLY {id, created_at} — never another caller's row, never
--     the full table, no enumeration surface;
--   - has no UPDATE/DELETE/list capability whatsoever;
--   - `SET search_path = ''` with every relation fully schema-qualified;
--   - `REVOKE ALL ... FROM PUBLIC` then explicit `GRANT EXECUTE` to
--     anon, authenticated only (anonymous alert creation is an intended,
--     confirmed-live product feature).
-- usePriceAlerts.ts's createAlert() is updated in this same branch to call
-- this RPC instead of the raw insert/select chain, and no longer performs
-- a raw price_history INSERT from the browser at all.
--
-- Viewing saved alerts, pausing/resuming, deleting, and the price-history
-- chart remain unavailable through the Data API — same restriction as
-- round 2, now actually enforced consistently for creation too — pending a
-- dedicated secure-ownership design (e.g. a per-alert access token minted
-- at creation and required for every subsequent operation) as its own
-- deliberate product decision, explicitly NOT invented here. MyAlerts.tsx /
-- SavedSearchesPanel.tsx are updated in this same branch to show an honest
-- "temporarily unavailable" message instead of attempting calls that would
-- now fail (see src/pages/MyAlerts.tsx, src/components/flights/
-- SavedSearchesPanel.tsx).
--
-- service_role is granted exactly what the existing check-price-alerts
-- Edge Function traces to: SELECT + UPDATE on saved_searches (reads active
-- alerts, writes current_lowest_price/last_checked_at), and INSERT on
-- price_history (records each subsequently-observed price). No DELETE
-- anywhere. service_role does NOT need INSERT on saved_searches — initial
-- row creation now happens exclusively through create_saved_search(),
-- which runs as the table owner, not as service_role.

DROP POLICY IF EXISTS "Allow anonymous inserts for saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Allow anonymous reads for saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Allow anonymous updates for saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Allow anonymous deletes for saved_searches" ON public.saved_searches;
DROP POLICY IF EXISTS "Anyone can create a saved search" ON public.saved_searches;

-- Round 4: explicit REVOKE ALL FROM service_role before GRANT — see the
-- note on the subscriptions block above; applied identically here.
REVOKE ALL ON public.saved_searches FROM anon, authenticated, service_role;
GRANT SELECT, UPDATE ON public.saved_searches TO service_role;
-- No INSERT grant for service_role: see note above.
-- No grant of any kind for anon/authenticated: creation is RPC-only.

DROP POLICY IF EXISTS "Allow anonymous inserts for price_history" ON public.price_history;
DROP POLICY IF EXISTS "Allow anonymous reads for price_history" ON public.price_history;
DROP POLICY IF EXISTS "Anyone can record an initial price point for their new alert" ON public.price_history;

-- Round 4: explicit REVOKE ALL FROM service_role before GRANT — see the
-- note on the subscriptions block above; applied identically here.
REVOKE ALL ON public.price_history FROM anon, authenticated, service_role;
GRANT INSERT ON public.price_history TO service_role;
-- No grant of any kind for anon/authenticated: the initial price point is
-- now written server-side, inside create_saved_search(), as the table
-- owner — not via a client-held table grant.

CREATE OR REPLACE FUNCTION public.create_saved_search(
  p_email text,
  p_origin text,
  p_destination text,
  p_departure_date date,
  p_return_date date DEFAULT NULL,
  p_passengers integer DEFAULT 1,
  p_cabin_class text DEFAULT 'economy',
  p_target_price numeric DEFAULT NULL,
  p_current_price numeric DEFAULT NULL
)
RETURNS TABLE (id uuid, created_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
  v_created_at timestamptz;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RAISE EXCEPTION 'email is required';
  END IF;
  IF p_origin IS NULL OR btrim(p_origin) = '' THEN
    RAISE EXCEPTION 'origin is required';
  END IF;
  IF p_destination IS NULL OR btrim(p_destination) = '' THEN
    RAISE EXCEPTION 'destination is required';
  END IF;
  IF p_departure_date IS NULL THEN
    RAISE EXCEPTION 'departure_date is required';
  END IF;
  IF p_passengers IS NULL OR p_passengers < 1 OR p_passengers > 9 THEN
    RAISE EXCEPTION 'passengers must be between 1 and 9';
  END IF;

  INSERT INTO public.saved_searches (
    email, origin, destination, departure_date, return_date,
    passengers, cabin_class, target_price, current_lowest_price, is_active
  ) VALUES (
    lower(btrim(p_email)), p_origin, p_destination, p_departure_date, p_return_date,
    p_passengers, COALESCE(NULLIF(btrim(p_cabin_class), ''), 'economy'),
    p_target_price, p_current_price, true
  )
  RETURNING public.saved_searches.id, public.saved_searches.created_at
  INTO v_id, v_created_at;

  IF p_current_price IS NOT NULL THEN
    INSERT INTO public.price_history (saved_search_id, price)
    VALUES (v_id, p_current_price);
  END IF;

  RETURN QUERY SELECT v_id, v_created_at;
END;
$$;

REVOKE ALL ON FUNCTION public.create_saved_search(
  text, text, text, date, date, integer, text, numeric, numeric
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_saved_search(
  text, text, text, date, date, integer, text, numeric, numeric
) TO anon, authenticated;

COMMENT ON FUNCTION public.create_saved_search(
  text, text, text, date, date, integer, text, numeric, numeric
) IS
  'BF-0R5: the only way anon/authenticated may create a saved_searches /
   price_history row. Creates exactly one alert (and, optionally, one
   initial price point) for the fields supplied by the caller; returns only
   {id, created_at} for that new row. No SELECT/UPDATE/DELETE capability,
   no enumeration of other rows, no way to touch a server-managed column
   (current_lowest_price beyond the initial value, last_checked_at,
   is_active, updated_at) or another caller''s data.';


-- ═══════════════════════════════════════════════════════════════════
-- 9. SUBSCRIBERS (round 3 — new table, previously missed)
-- ═══════════════════════════════════════════════════════════════════
-- BEFORE: migration 20260113154936 defines, and production still runs:
--   CREATE POLICY "Anyone can unsubscribe with token"
--   ON public.subscribers FOR UPDATE USING (true) WITH CHECK (true);
-- Despite the name, there is NO token predicate anywhere in this policy —
-- it is a plain `USING (true) WITH CHECK (true)` FOR UPDATE with no TO
-- clause (applies to PUBLIC). Combined with "Anyone can subscribe" (`FOR
-- INSERT WITH CHECK (true)`, also PUBLIC), any caller holding a raw table
-- grant on subscribers could rewrite ANY row's email, is_subscribed,
-- unsubscribe_token, or subscription_source — full tamper capability over
-- every subscriber, keyed by nothing.
--
-- Forensic audit performed before touching any SQL, per instruction:
--   1. Final local policies after all 30+1 migrations (pg_policies):
--      "Admins can view all subscribers" (SELECT, has_role-gated),
--      "Admins can update subscribers" (UPDATE, has_role-gated),
--      "Admins can delete subscribers" (DELETE, has_role-gated),
--      "Anyone can subscribe" (INSERT, WITH CHECK true, PUBLIC),
--      "Anyone can unsubscribe with token" (UPDATE, USING/WITH CHECK true,
--      PUBLIC, no token predicate) — confirmed live, unmodified by any
--      later migration.
--   2/3. anon/authenticated/service_role table + column privileges: same
--      platform-bootstrap caveat as every other table in this migration —
--      nothing in this repo previously made them explicit for subscribers.
--   4. Every frontend reader/writer (repository-wide grep, src/):
--      - src/hooks/usePriceAlerts.ts: addSubscriber() SELECTs
--        `id, is_subscribed` `.eq('email', email).single()`, then
--        conditionally UPDATEs by id, or INSERTs a new row. This SELECT is
--        a genuine existence/status oracle for arbitrary emails and is
--        removed in this round — see below.
--      - src/components/home/HeroEmailCapture.tsx and
--        src/components/ExitIntentPopup.tsx: raw
--        `.from('subscribers').insert({ email, subscription_source })`,
--        catching Postgres error code 23505 (unique violation) to show
--        "already subscribed" — a raw-INSERT existence oracle via the
--        error code. All three call sites are consolidated onto the new
--        subscribe_email(...) RPC in this round, which never raises a
--        unique-violation (it upserts) and never differentiates by error
--        code, closing this oracle for all three entry points at once.
--   5. src/pages/AdminSubscribers.tsx: SELECT * (list), UPDATE
--      (is_subscribed/unsubscribed_at toggle), DELETE — via the ordinary
--      authenticated browser client, gated client-side by useAdminAuth and
--      server-side by the pre-existing has_role-scoped policies. Unchanged
--      and preserved by this migration.
--   6. Edge Functions touching subscribers (service_role, bypasses RLS
--      unconditionally regardless of any policy/grant below):
--      - supabase/functions/unsubscribe/index.ts: SELECTs by
--        unsubscribe_token, UPDATEs is_subscribed/unsubscribed_at by id.
--        This is the REAL unsubscribe-link handler a subscriber reaches
--        from an email. It runs under SUPABASE_SERVICE_ROLE_KEY end to
--        end and therefore needs, and uses, NO client-facing RLS policy or
--        grant at all.
--      - supabase/functions/send-bulk-email/index.ts: SELECTs
--        `email, unsubscribe_token` filtered `is_subscribed = true`
--        (admin-authenticated via has_role check inside the function).
--   7. Unsubscribe links: generated by send-bulk-email as
--      `${supabaseUrl}/functions/v1/unsubscribe?token=...`, i.e. the token
--      is only ever transmitted (a) from server to the outbound email, and
--      (b) from the email link back to the service-role-backed Edge
--      Function. It is never read by, or returned to, a browser Supabase
--      client under anon/authenticated.
--   8. Welcome-email flow: usePriceAlerts.ts calls the send-welcome-email
--      Edge Function directly after a successful subscribe; unrelated to
--      subscribers RLS (see the top-of-file note on that function's own,
--      separate, unauthenticated-abuse finding, reported not fixed).
--   9. unsubscribe_token is never transmitted to the browser: confirmed by
--      (7) above and by the removal, in this round, of the only client
--      SELECT policy that could have exposed it.
--   10. No later migration modifies the original subscribers policies —
--      confirmed by grep across supabase/migrations/ for "subscribers".
--
-- CLASSIFICATION: the production exploit is real and requires BOTH a
-- matching RLS policy AND a table-level grant to be reachable through the
-- Data API — this repository has never made the anon/authenticated table
-- grant explicit for subscribers, so exploitability on the LIVE production
-- project depends on whatever Supabase's platform bootstrap grant
-- actually issued at project-creation time (same caveat as every other
-- table here). Because that grant is not tracked, it must be assumed
-- present until the production preflight (prepared, not run, per
-- instruction) proves otherwise. Treated as CONFIRMED-exploitable for
-- planning purposes; the local test suite proves it exploitable in a
-- from-scratch schema regardless of the bootstrap-grant question, which is
-- the correct conservative assumption.
--
-- TARGET CONTRACT (corrected wording — the grants below were never
-- changed, only this comment; see the migration commentary correction
-- alongside this section):
--   - anon: zero raw table privilege of any kind. Signing up is possible
--     ONLY via subscribe_email(...), which never returns a row, never
--     accepts is_subscribed/unsubscribe_token/subscribed_at/
--     email-of-another-row as input, and only ever INSERTs a brand-new
--     row (ON CONFLICT (email) DO NOTHING) — it never mutates an existing
--     row, active or previously unsubscribed.
--   - authenticated: has the raw SELECT/UPDATE/DELETE table grant (needed
--     so the admin path — AdminSubscribers.tsx — is reachable at all) but
--     NO raw INSERT grant (subscriber creation is RPC-only for every
--     client role, admin included). For a non-admin authenticated caller,
--     that SELECT/UPDATE/DELETE grant is inert: the pre-existing
--     has_role-gated policies below are the ONLY SELECT/UPDATE/DELETE
--     policies on this table, so RLS — not the grant — is what actually
--     stops a non-admin authenticated user from reading or writing any
--     row. Exactly as with ad_placements, Postgres cannot distinguish
--     "admin" from "non-admin" within one role, so the grant must stay
--     broad and RLS does the real work.
--   - service_role: SELECT + UPDATE explicitly (unsubscribe,
--     send-bulk-email). No INSERT (subscriber creation is RPC-only, never
--     performed by an Edge Function) and no DELETE (no Edge Function
--     deletes subscribers).
--   - No client-facing unsubscribe RPC is added. The real unsubscribe flow
--     already runs entirely under service_role and needs no RLS policy or
--     grant of any kind; adding a parallel client-callable
--     unsubscribe_by_token(...) would be new, unused surface area with no
--     current caller — not built, per the general instruction throughout
--     this migration not to add capability nothing in the codebase uses.

DROP POLICY IF EXISTS "Anyone can unsubscribe with token" ON public.subscribers;
DROP POLICY IF EXISTS "Anyone can subscribe" ON public.subscribers;

REVOKE ALL ON public.subscribers FROM anon;
REVOKE ALL ON public.subscribers FROM authenticated;
GRANT SELECT, UPDATE, DELETE ON public.subscribers TO authenticated;
-- The grant above is necessary for the admin path (AdminSubscribers.tsx)
-- to be reachable at all; RLS is what actually stops a non-admin
-- authenticated user from using it — see the pre-existing has_role-scoped
-- policies below, which remain the ONLY SELECT/UPDATE/DELETE policies on
-- this table after this migration. No INSERT grant for authenticated: no
-- admin-UI insert path exists, and client creation is RPC-only.

-- Round 4: explicit REVOKE ALL FROM service_role before GRANT — see the
-- note on the subscriptions block above; applied identically here.
REVOKE ALL ON public.subscribers FROM service_role;
GRANT SELECT, UPDATE ON public.subscribers TO service_role;

-- "Admins can view all subscribers" / "Admins can update subscribers" /
-- "Admins can delete subscribers" (all has_role(auth.uid(), 'admin')
-- USING clauses) are deliberately left untouched — already correctly
-- scoped, no vulnerability, confirmed by the same has_role() reasoning
-- applied to user_roles and ad_placements above.

-- ROUND 4 CORRECTION: the round-3 subscribe_email design had two real
-- defects, found in this round's pre-commit review.
--
-- 1. SUBSCRIBER-STATUS/EXISTENCE ORACLE. The round-3 function returned
--    `true` for BOTH a brand-new email AND a previously-unsubscribed email
--    being reactivated, and `false` only when the email was ALREADY
--    actively subscribed. That is a two-way distinguishing oracle: any
--    caller who can guess or already knows an email address can submit it
--    to this RPC and learn, from the single boolean, whether that address
--    is CURRENTLY an active subscriber — private state about a third
--    party the caller does not own or control.
-- 2. UNVERIFIED RE-SUBSCRIPTION. The round-3 `ON CONFLICT ... DO UPDATE
--    ... WHERE is_subscribed = false` clause silently flipped a
--    previously-unsubscribed row back to `is_subscribed = true` with no
--    proof the caller actually owns that email address (no verification
--    link, no confirmation step) — anyone who once unsubscribed could be
--    re-subscribed by any third party simply resubmitting their address
--    through the public hero-banner/exit-popup/price-alert forms.
--
-- FIX: subscribe_email now (a) inserts a genuinely new row only, via
-- `ON CONFLICT (email) DO NOTHING` — it NEVER updates an existing row of
-- any kind, so a previously-unsubscribed email is left unsubscribed no
-- matter how many times it is resubmitted; (b) returns `void` — no boolean,
-- no row, no column, nothing — so the SAME response (successful completion,
-- no distinguishing payload) is observed by the caller for a new email, an
-- already-actively-subscribed email, and a previously-unsubscribed email
-- alike. There is no longer any return value a caller could use to infer
-- which of the three states applied. A verified-ownership resubscription
-- flow for previously-unsubscribed addresses is a deliberate future
-- product decision (see BF-0R-6 notes at the top of this file) and is NOT
-- invented here.
CREATE OR REPLACE FUNCTION public.subscribe_email(
  p_email text,
  p_source text DEFAULT 'manual'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_source text;
BEGIN
  IF p_email IS NULL OR btrim(p_email) = '' THEN
    RETURN;
  END IF;

  v_source := CASE
    WHEN p_source IN ('price_alert', 'hero_banner', 'exit_popup', 'manual')
      THEN p_source
    ELSE 'manual'
  END;

  INSERT INTO public.subscribers (email, subscription_source, is_subscribed, subscribed_at, unsubscribed_at)
  VALUES (lower(btrim(p_email)), v_source, true, now(), NULL)
  ON CONFLICT (email) DO NOTHING;
  -- Deliberately DO NOTHING on conflict, never a reactivating update: an
  -- existing row — whether actively subscribed or previously unsubscribed —
  -- is never touched by this function. This is what makes the return value
  -- (void) genuinely non-distinguishing: nothing about the pre-existing
  -- row's state ever affects what happens next, so there is nothing left
  -- to leak.
END;
$$;

REVOKE ALL ON FUNCTION public.subscribe_email(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.subscribe_email(text, text) TO anon, authenticated;

COMMENT ON FUNCTION public.subscribe_email(text, text) IS
  'BF-0R5 (round 4): the only way anon/authenticated may create a
   subscribers row. Inserts a genuinely new row only (ON CONFLICT DO
   NOTHING) — never reactivates an existing unsubscribed row and never
   modifies an existing active row. Returns void: no boolean, no row, no
   unsubscribe_token, no indication of whether the email was new, already
   subscribed, or previously unsubscribed. This is intentional — the prior
   boolean return was a subscriber-status/existence oracle for any email
   the caller chose to submit. A verified-ownership resubscription flow
   for previously-unsubscribed addresses does not exist yet and is
   deliberately not built here (see the BF-0R-6 follow-up notes at the top
   of this migration).';

-- FRONTEND CHANGE REQUIRED AND IMPLEMENTED IN THIS BRANCH (round 4):
-- src/hooks/usePriceAlerts.ts (addSubscriber), src/components/home/
-- HeroEmailCapture.tsx, and src/components/ExitIntentPopup.tsx previously
-- performed raw `.from('subscribers')` SELECT/INSERT/UPDATE calls (rounds
-- 1-2) and then called `subscribe_email` and branched on its boolean result
-- to decide whether to fire the send-welcome-email Edge Function (round 3).
-- That branch was itself a second, Edge-Function-triggering existence
-- oracle and is removed in this round: subscribe_email now returns void,
-- and usePriceAlerts.ts no longer calls send-welcome-email from the browser
-- at all — the welcome email is withheld until a non-oracle-shaped trigger
-- (e.g. a server-side hook that fires only on a genuine new-row INSERT,
-- not on client-observable RPC output) is designed as part of BF-0R-6. See
-- those files in this same commit. No product behavior beyond the welcome
-- email is silently broken by this migration.

-- KNOWN, OUT-OF-SCOPE, NOT-FIXED-HERE FINDING: supabase/functions/
-- send-welcome-email has no authentication and will send a real email via
-- Resend to any `email` address supplied in the request body, with no
-- rate limit observed in this function's own code. This is a genuine
-- unauthenticated email-relay/spam-abuse vector. It is an Edge Function
-- authorization issue, not a database/RLS issue, and this migration does
-- not touch it — reported per instruction, not expanded into without
-- further evidence/authorization.
