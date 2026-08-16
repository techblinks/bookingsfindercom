/**
 * Supabase Database + RLS Test Plan — Phase 2D (T2D-A)
 * ======================================================
 * things_activities / things_activity_offers
 *
 * This file documents automated pgTAP-style checks (runnable in a Supabase
 * local environment with the right setup) and manual hosted-Supabase steps
 * that require a live admin session. Run with the migration applied LOCALLY
 * only — never remotely in this phase.
 *
 * AUTOMATED = runnable via supabase test or pgTAP
 * MANUAL    = requires hosted Supabase dashboard / live auth tokens
 */

-- ═══════════════════════════════════════════════════════════════
-- PART A: SQL-level tests (automated, pgTAP-style)
-- ═══════════════════════════════════════════════════════════════

/*
-- Test: tables exist
SELECT has_table('public', 'things_activities');
SELECT has_table('public', 'things_activity_offers');

-- Test: unique destination + activity slug (final collision authority)
-- Two rows with the same (destination_slug, slug) must fail.
INSERT INTO public.things_activities (destination_slug, slug, canonical_title)
  VALUES ('rome', 'vatican-museums-tour', 'Vatican Museums Tour');
INSERT INTO public.things_activities (destination_slug, slug, canonical_title)
  VALUES ('rome', 'vatican-museums-tour', 'Duplicate');  -- should fail (unique)

-- Test: the same slug is allowed under a DIFFERENT destination
INSERT INTO public.things_activities (destination_slug, slug, canonical_title)
  VALUES ('paris', 'vatican-museums-tour', 'Paris variant');  -- should succeed

-- Test: unique provider + provider_product_id
-- The same Viator product cannot be offered against two activities.
INSERT INTO public.things_activities (destination_slug, slug, canonical_title)
  VALUES ('rome', 'colosseum-tour', 'Colosseum Tour');
INSERT INTO public.things_activity_offers (activity_id, provider, provider_product_id)
  SELECT id, 'viator', '3731VATICAN' FROM public.things_activities WHERE slug = 'colosseum-tour';
INSERT INTO public.things_activity_offers (activity_id, provider, provider_product_id)
  SELECT id, 'viator', '3731VATICAN' FROM public.things_activities WHERE slug = 'vatican-museums-tour';  -- should fail (unique)

-- Test: provider CHECK rejects unknown providers
INSERT INTO public.things_activity_offers (activity_id, provider, provider_product_id)
  SELECT id, 'getyourguide', 'x' FROM public.things_activities LIMIT 1;  -- should fail

-- Test: slug CHECK rejects malformed slugs
INSERT INTO public.things_activities (destination_slug, slug, canonical_title)
  VALUES ('rome', 'Bad Slug', 'x');  -- should fail
INSERT INTO public.things_activities (destination_slug, slug, canonical_title)
  VALUES ('rome', 'vatican-museums-tour-', 'x');  -- should fail (trailing hyphen)

-- Test: publication_status defaults to draft
INSERT INTO public.things_activities (destination_slug, slug, canonical_title)
  VALUES ('rome', 'default-status', 'Default Status');
-- Expected: publication_status = 'draft' on the new row

-- Test: title changes do NOT rewrite the canonical slug
-- (slug is a plain stored column; update canonical_title and re-read slug)
UPDATE public.things_activities SET canonical_title = 'Renamed' WHERE slug = 'default-status';
-- Expected: slug still 'default-status', canonical_title now 'Renamed'

-- Test: RLS — anon cannot SELECT
-- (requires anon role token; expected: 0 rows / permission denied)
-- Test: RLS — anon cannot INSERT / UPDATE / DELETE
-- (requires anon role token; expected: permission denied)
-- Test: RLS — authenticated non-admin cannot SELECT / INSERT / UPDATE / DELETE
-- (requires a non-admin auth token; expected: permission denied)
-- Test: service_role CAN read/write (bypasses RLS)
-- (requires service role key; expected: success)
*/

-- ═══════════════════════════════════════════════════════════════
-- PART B: Manual hosted-Supabase checks (requires live project)
-- ═══════════════════════════════════════════════════════════════

/*
 1. Anonymous (no auth token):
    a. SELECT from things_activities        → 0 rows / denied   [MANUAL]
    b. INSERT into things_activities        → denied            [MANUAL]
    c. UPDATE / DELETE on either table      → denied            [MANUAL]
    d. SELECT from things_activity_offers   → denied            [MANUAL]

 2. Authenticated non-admin:
    a. Same as anonymous for all four operations                 [MANUAL]

 3. Service role (Edge Function only):
    a. Can INSERT a canonical activity with DEFAULT 'draft'     [MANUAL]
    b. Can INSERT one offer per provider product                [MANUAL]
    c. Duplicate (provider, provider_product_id) rejected       [MANUAL]
    d. Duplicate (destination_slug, slug) rejected              [MANUAL]
    e. Updated canonical_title leaves slug unchanged            [MANUAL]
*/
