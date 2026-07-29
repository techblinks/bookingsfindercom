-- Phase 7D: Central Brand Manager — site_branding + storage (HARDENED v2)
-- Single-row table with fixed singleton key 'default'.
-- Public can read; only admins can write.
-- Creates the branding storage bucket and all RLS policies.

-- ═══════════════════════════════════════════════════════════════
-- 1. TABLE — fixed singleton id = 'default'
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.site_branding (
  id              text PRIMARY KEY DEFAULT 'default'
                  CHECK (id = 'default'),
  site_name       text NOT NULL DEFAULT 'BookingsFinder',
  tagline         text DEFAULT NULL,
  logo_url        text DEFAULT NULL,
  logo_light_url  text DEFAULT NULL,
  logo_dark_url   text DEFAULT NULL,
  icon_url        text DEFAULT NULL,
  favicon_url     text DEFAULT NULL,
  primary_color   text NOT NULL DEFAULT '#0D4F5C',
  secondary_color text NOT NULL DEFAULT '#CC4D28',
  accent_color    text NOT NULL DEFAULT '#2E6B4A',
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid DEFAULT NULL REFERENCES auth.users(id) ON DELETE SET NULL
);

-- ═══════════════════════════════════════════════════════════════
-- 2. CONSTRAINTS
-- ═══════════════════════════════════════════════════════════════

-- Colour: 6-digit hex only
ALTER TABLE public.site_branding
  ADD CONSTRAINT IF NOT EXISTS ck_primary_color_hex
    CHECK (primary_color IS NULL OR primary_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT IF NOT EXISTS ck_secondary_color_hex
    CHECK (secondary_color IS NULL OR secondary_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT IF NOT EXISTS ck_accent_color_hex
    CHECK (accent_color IS NULL OR accent_color ~ '^#[0-9a-fA-F]{6}$'),
  ADD CONSTRAINT IF NOT EXISTS ck_site_name_not_empty
    CHECK (site_name IS NOT NULL AND char_length(trim(site_name)) > 0);

ALTER TABLE public.site_branding
  ADD CONSTRAINT IF NOT EXISTS ck_primary_color_not_null
    CHECK (primary_color IS NOT NULL),
  ADD CONSTRAINT IF NOT EXISTS ck_secondary_color_not_null
    CHECK (secondary_color IS NOT NULL),
  ADD CONSTRAINT IF NOT EXISTS ck_accent_color_not_null
    CHECK (accent_color IS NOT NULL);

-- ═══════════════════════════════════════════════════════════════
-- 3. SEED — upsert against fixed singleton key
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.site_branding (id, site_name, tagline, primary_color, secondary_color, accent_color)
VALUES ('default', 'BookingsFinder', 'Plan, Prepare, and Travel Ready', '#0D4F5C', '#CC4D28', '#2E6B4A')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 4. TABLE RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.site_branding ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_branding'
      AND policyname = 'Public can read branding'
  ) THEN
    CREATE POLICY "Public can read branding"
      ON public.site_branding FOR SELECT
      TO anon, authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'site_branding'
      AND policyname = 'Admins can manage branding'
  ) THEN
    CREATE POLICY "Admins can manage branding"
      ON public.site_branding FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. TRIGGER — auto-set updated_at / updated_by
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_branding_updated_by()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_branding_updated ON public.site_branding;
CREATE TRIGGER trg_branding_updated
  BEFORE UPDATE ON public.site_branding
  FOR EACH ROW
  EXECUTE FUNCTION public.set_branding_updated_by();

-- ═══════════════════════════════════════════════════════════════
-- 6. STORAGE BUCKET — branding
-- ═══════════════════════════════════════════════════════════════

-- Create the bucket if it does not already exist.
-- Supabase stores buckets in storage.buckets; seed row is idempotent.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'branding',
  'branding',
  true,
  2097152,
  ARRAY['image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ═══════════════════════════════════════════════════════════════
-- 7. STORAGE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Policy helper: drop existing policies before (re)creating them.
-- safety is per-policy — a missing policy will raise NOTICE only.

-- A. Admin read/list branding objects
DROP POLICY IF EXISTS "Admins can view branding objects" ON storage.objects;
CREATE POLICY "Admins can view branding objects"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND public.has_role(auth.uid(), 'admin')
  );

-- B. Admin upload
DROP POLICY IF EXISTS "Admins can upload branding objects" ON storage.objects;
CREATE POLICY "Admins can upload branding objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'branding'
    AND public.has_role(auth.uid(), 'admin')
  );

-- C. Admin update (supports upsert: INSERT + UPDATE)
DROP POLICY IF EXISTS "Admins can update branding objects" ON storage.objects;
CREATE POLICY "Admins can update branding objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    bucket_id = 'branding'
    AND public.has_role(auth.uid(), 'admin')
  );

-- D. Admin delete
DROP POLICY IF EXISTS "Admins can delete branding objects" ON storage.objects;
CREATE POLICY "Admins can delete branding objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'branding'
    AND public.has_role(auth.uid(), 'admin')
  );

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION (after applying migration to hosted Supabase)
-- ═══════════════════════════════════════════════════════════════

-- The migration creates the branding bucket and Storage RLS policies.
-- After applying the migration, verify the hosted Supabase project:

-- 1. Confirm bucket exists: Dashboard → Storage → "branding" bucket
-- 2. Confirm bucket settings:
--    - Public: true
--    - File size limit: 2 MB
--    - Allowed MIME types: image/png, image/webp
-- 3. Confirm policies exist on storage.objects for bucket_id = 'branding':
--    - "Admins can view branding objects"   (SELECT)
--    - "Admins can upload branding objects" (INSERT)
--    - "Admins can update branding objects" (UPDATE)
--    - "Admins can delete branding objects" (DELETE)
-- 4. Perform an admin upload via /admin/branding
-- 5. Verify the uploaded asset is publicly accessible via its URL
-- 6. Verify a non-admin authenticated user cannot upload
