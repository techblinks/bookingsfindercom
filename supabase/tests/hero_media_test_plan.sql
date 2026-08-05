/**
 * Supabase Database + RLS + Storage Test Plan
 * ==========================================
 *
 * This file documents both automated tests (that can run in a Supabase
 * local/test environment with the right setup) and manual hosted-Supabase
 * verification steps that require a live admin session.
 *
 * AUTOMATED = runnable via supabase test or pgTAP
 * MANUAL    = requires hosted Supabase dashboard / live auth tokens
 */

-- ═══════════════════════════════════════════════════════════════
-- PART A: SQL-level tests (automated, pgTAP-style)
-- ═══════════════════════════════════════════════════════════════

/*
-- Test: tables exist
SELECT has_table('public', 'site_hero_sets');
SELECT has_table('public', 'site_hero_assets');
SELECT has_table('public', 'site_media_events');

-- Test: constraint enforcement
-- page_key CHECK rejects invalid values
INSERT INTO public.site_hero_sets (page_key, version_number, status)
  VALUES ('INVALID', 999, 'draft');  -- should fail

-- slot_key CHECK rejects invalid values
INSERT INTO public.site_hero_assets (hero_set_id, slot_key, storage_path)
  VALUES ('00000000-0000-0000-0000-000000000000', 'INVALID', 'path');  -- should fail

-- Test: only one published set per page_key (unique partial index)
-- (requires setup: insert two published sets for same page_key)

-- Test: RLS — anonymous can read published sets
-- (requires anon role token)

-- Test: RLS — anonymous cannot read drafts
-- (requires anon role token + draft row)

-- Test: RLS — anonymous cannot INSERT
-- (requires anon role token)

-- Test: storage — anonymous can SELECT from site-media
-- Test: storage — anonymous cannot SELECT from site-media-drafts
*/


-- ═══════════════════════════════════════════════════════════════
-- PART B: Function-level tests (automated)
-- ═══════════════════════════════════════════════════════════════

/*
-- Test: publish_site_hero_set rejects incomplete set
SELECT public.publish_site_hero_set('00000000-0000-0000-0000-000000000000');
-- Expected: 'error: set not found'

-- Test: create_site_hero_draft returns null for non-admin
-- (requires non-admin auth context)

-- Test: revert_site_hero_set validates page_key
SELECT public.revert_site_hero_set('INVALID', 1);
-- Expected: 'error: invalid page_key'

-- Test: disable_custom_site_hero validates page_key
SELECT public.disable_custom_site_hero('INVALID');
-- Expected: 'error: invalid page_key'

-- Test: discard_site_hero_draft only works on drafts
-- (requires draft + non-draft setup)

-- Test: has_role is unchanged (signature check)
SELECT proname, proargnames FROM pg_proc WHERE proname = 'has_role';
-- Expected: pronargs = 2, proargnames = {_user_id, _role}

-- Test: all SECURITY DEFINER functions have search_path = 'public'
SELECT proname, prosecdef, proconfig
FROM pg_proc
WHERE proname IN (
  'publish_site_hero_set', 'create_site_hero_draft',
  'revert_site_hero_set', 'disable_custom_site_hero',
  'discard_site_hero_draft', 'log_site_media_event'
);
-- Expected: prosecdef = true, proconfig contains 'search_path=' (empty, secure)
*/


-- ═══════════════════════════════════════════════════════════════
-- PART C: Manual hosted-Supabase checks (requires live project)
-- ═══════════════════════════════════════════════════════════════

/*
 1. Anonymous (no auth token):
    a. SELECT from site_hero_sets — sees only published sets   [MANUAL]
    b. SELECT from site_hero_assets — sees only published assets [MANUAL]
    c. Cannot INSERT/UPDATE/DELETE on both tables               [MANUAL]
    d. Can read from storage bucket 'site-media'                [MANUAL]
    e. CANNOT read from 'site-media-drafts' bucket              [MANUAL]
    f. CANNOT upload to any bucket                              [MANUAL]

 2. Authenticated non-admin:
    a. Same as anonymous for read access                        [MANUAL]
    b. Cannot INSERT/UPDATE/DELETE on hero tables               [MANUAL]
    c. Cannot upload to 'site-media-drafts'                     [MANUAL]

 3. Authenticated admin:
    a. Can CREATE draft via RPC                                 [MANUAL]
    b. Can read draft rows from site_hero_sets                  [MANUAL]
    c. Can upload to 'site-media-drafts'                        [MANUAL]
    d. Can read from 'site-media-drafts'                        [MANUAL]
    e. Can PUBLISH a complete set                               [MANUAL]
    f. Can REVERT to an archived version                        [MANUAL]
    g. Can DISABLE custom hero (activate fallback)              [MANUAL]
    h. Can DISCARD a draft                                      [MANUAL]
    i. Can read site_media_events audit log                     [MANUAL]

 4. Atomic publishing (manual verification):
    a. Create draft with 4 images, publish → live site updates  [MANUAL]
    b. Create v2, publish → v1 archived, v2 live                [MANUAL]
    c. Revert to v1 → v3 created (clone), v3 live               [MANUAL]
    d. Check that v1 still exists (archived, not mutated)       [MANUAL]
    e. Disable custom hero → no published set, fallback active  [MANUAL]
    f. Undo disable by creating new draft + publishing          [MANUAL]

 5. Storage privacy:
    a. Draft file URL from site-media-drafts returns 403/404    [MANUAL]
       for anonymous
    b. Published file URL from site-media returns image         [MANUAL]
    c. Signed URL from createSignedUrl works for admin          [MANUAL]
    d. Signed URL expires after 300s                            [MANUAL]
*/

-- ═══════════════════════════════════════════════════════════════
-- PART D: Edge Function tests (manual, requires deploy)
-- ═══════════════════════════════════════════════════════════════

/*
 1. POST with valid draftSetId → 200, success=true               [MANUAL]
 2. POST with invalid draftSetId → 400                           [MANUAL]
 3. POST without auth header → 401                               [MANUAL]
 4. POST with non-admin user → 403                               [MANUAL]
 5. POST with incomplete set (3/4 slots) → 400                   [MANUAL]
 6. POST with unknown slot key → 400                             [MANUAL]
 7. Verify files copied to site-media bucket with UUID paths     [MANUAL]
 8. Verify old draft files remain in site-media-drafts           [MANUAL]
 9. Simulate DB failure: verify copied files cleaned up          [MANUAL]
 10. Duplicate publish: verify row locking prevents double       [MANUAL]
     publish
 11. Check audit log for HERO_SET_PUBLISHED event                [MANUAL]
*/
