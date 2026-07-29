-- Phase 7D patch: Add adjustable logo sizing to site_branding.
-- Adds logo_height_desktop, logo_height_mobile, logo_height_footer columns.
-- Idempotent — safe to run on already-applied or fresh DBs.

-- Add columns (skip if they already exist via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_branding'
      AND column_name = 'logo_height_desktop'
  ) THEN
    ALTER TABLE public.site_branding
      ADD COLUMN logo_height_desktop integer NOT NULL DEFAULT 56;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_branding'
      AND column_name = 'logo_height_mobile'
  ) THEN
    ALTER TABLE public.site_branding
      ADD COLUMN logo_height_mobile integer NOT NULL DEFAULT 40;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'site_branding'
      AND column_name = 'logo_height_footer'
  ) THEN
    ALTER TABLE public.site_branding
      ADD COLUMN logo_height_footer integer NOT NULL DEFAULT 48;
  END IF;
END $$;

-- Range constraints (24–120 px) — idempotent drop-then-add
ALTER TABLE public.site_branding
  DROP CONSTRAINT IF EXISTS ck_logo_height_desktop_range;
ALTER TABLE public.site_branding
  ADD CONSTRAINT ck_logo_height_desktop_range
    CHECK (logo_height_desktop IS NULL OR (logo_height_desktop >= 24 AND logo_height_desktop <= 120));

ALTER TABLE public.site_branding
  DROP CONSTRAINT IF EXISTS ck_logo_height_mobile_range;
ALTER TABLE public.site_branding
  ADD CONSTRAINT ck_logo_height_mobile_range
    CHECK (logo_height_mobile IS NULL OR (logo_height_mobile >= 24 AND logo_height_mobile <= 120));

ALTER TABLE public.site_branding
  DROP CONSTRAINT IF EXISTS ck_logo_height_footer_range;
ALTER TABLE public.site_branding
  ADD CONSTRAINT ck_logo_height_footer_range
    CHECK (logo_height_footer IS NULL OR (logo_height_footer >= 24 AND logo_height_footer <= 120));

-- Also ensure NOT NULL constraints (columns have defaults, but belt-and-suspenders)
ALTER TABLE public.site_branding
  DROP CONSTRAINT IF EXISTS ck_logo_height_desktop_not_null;
ALTER TABLE public.site_branding
  ADD CONSTRAINT ck_logo_height_desktop_not_null
    CHECK (logo_height_desktop IS NOT NULL);

ALTER TABLE public.site_branding
  DROP CONSTRAINT IF EXISTS ck_logo_height_mobile_not_null;
ALTER TABLE public.site_branding
  ADD CONSTRAINT ck_logo_height_mobile_not_null
    CHECK (logo_height_mobile IS NOT NULL);

ALTER TABLE public.site_branding
  DROP CONSTRAINT IF EXISTS ck_logo_height_footer_not_null;
ALTER TABLE public.site_branding
  ADD CONSTRAINT ck_logo_height_footer_not_null
    CHECK (logo_height_footer IS NOT NULL);
