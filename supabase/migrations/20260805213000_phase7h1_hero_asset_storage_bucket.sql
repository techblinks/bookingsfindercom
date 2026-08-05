-- Phase 7H.1: Add storage_bucket to site_hero_assets
-- Fixes the clone bug where draft assets inherited from a published set
-- lost their storage bucket and defaulted to site-media-drafts.
--
-- Published assets reference the public site-media bucket.
-- Draft assets may inherit paths from site-media (unchanged slots)
-- or have new paths in site-media-drafts (replaced slots).

-- ═══════════════════════════════════════════════════════════════
-- 1. Add storage_bucket column (nullable initially for backfill)
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.site_hero_assets
  ADD COLUMN IF NOT EXISTS storage_bucket text;

-- ═══════════════════════════════════════════════════════════════
-- 2. Backfill existing rows
-- ═══════════════════════════════════════════════════════════════

-- Assets belonging to published sets → 'site-media'
UPDATE public.site_hero_assets a
  SET storage_bucket = 'site-media'
  FROM public.site_hero_sets s
  WHERE a.hero_set_id = s.id
    AND s.status = 'published'
    AND a.storage_bucket IS NULL;

-- Assets belonging to archived sets → 'site-media'
UPDATE public.site_hero_assets a
  SET storage_bucket = 'site-media'
  FROM public.site_hero_sets s
  WHERE a.hero_set_id = s.id
    AND s.status = 'archived'
    AND a.storage_bucket IS NULL;

-- Draft assets whose storage_path matches the same slot in based_on_set_id
-- → these are inherited from published and should use 'site-media'
UPDATE public.site_hero_assets a
  SET storage_bucket = 'site-media'
  FROM public.site_hero_sets s,
       public.site_hero_assets ancestor
  WHERE a.hero_set_id = s.id
    AND s.status = 'draft'
    AND s.based_on_set_id IS NOT NULL
    AND ancestor.hero_set_id = s.based_on_set_id
    AND ancestor.slot_key = a.slot_key
    AND ancestor.storage_path = a.storage_path
    AND a.storage_bucket IS NULL;

-- Remaining draft assets → 'site-media-drafts' (fresh uploads without ancestor)
UPDATE public.site_hero_assets a
  SET storage_bucket = 'site-media-drafts'
  FROM public.site_hero_sets s
  WHERE a.hero_set_id = s.id
    AND s.status = 'draft'
    AND a.storage_bucket IS NULL;

-- Safety net: any stragglers
UPDATE public.site_hero_assets
  SET storage_bucket = 'site-media-drafts'
  WHERE storage_bucket IS NULL;

-- ═══════════════════════════════════════════════════════════════
-- 3. Add NOT NULL + CHECK + DEFAULT
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.site_hero_assets
  ALTER COLUMN storage_bucket SET NOT NULL,
  ALTER COLUMN storage_bucket SET DEFAULT 'site-media-drafts',
  ADD CONSTRAINT ck_hero_asset_storage_bucket CHECK (
    storage_bucket IN ('site-media', 'site-media-drafts')
  );

-- ═══════════════════════════════════════════════════════════════
-- 4. Update create_site_hero_draft to preserve storage_bucket
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_site_hero_draft(p_page_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid       uuid;
  v_published uuid;
  v_next_ver  integer;
  v_new_set   uuid;
  v_asset     record;
BEGIN
  v_uid := auth.uid();
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RETURN NULL;
  END IF;

  -- Find published set
  SELECT id INTO v_published FROM public.site_hero_sets
    WHERE page_key = p_page_key AND status = 'published';

  -- Next version
  SELECT coalesce(max(version_number), 0) + 1 INTO v_next_ver
    FROM public.site_hero_sets WHERE page_key = p_page_key;

  -- Create new draft
  INSERT INTO public.site_hero_sets (page_key, version_number, status, created_by, based_on_set_id)
    VALUES (p_page_key, v_next_ver, 'draft', v_uid, v_published)
    RETURNING id INTO v_new_set;

  -- Clone assets from published set, preserving storage_bucket
  IF v_published IS NOT NULL THEN
    FOR v_asset IN SELECT * FROM public.site_hero_assets WHERE hero_set_id = v_published
    LOOP
      INSERT INTO public.site_hero_assets (
        hero_set_id, slot_key, storage_path, storage_bucket,
        alt_text, is_decorative,
        focal_x, focal_y, original_width, original_height,
        file_size_bytes, mime_type
      ) VALUES (
        v_new_set, v_asset.slot_key, v_asset.storage_path, v_asset.storage_bucket,
        v_asset.alt_text, v_asset.is_decorative,
        v_asset.focal_x, v_asset.focal_y,
        v_asset.original_width, v_asset.original_height,
        v_asset.file_size_bytes, v_asset.mime_type
      );
    END LOOP;
  END IF;

  -- Audit
  PERFORM public.log_site_media_event(
    'HERO_SET_DRAFT_CREATED',
    p_page_key       := p_page_key,
    p_version_number := v_next_ver,
    p_hero_set_id    := v_new_set,
    p_summary        := CASE WHEN v_published IS NOT NULL
      THEN format('Draft created from published v%s', (SELECT version_number FROM public.site_hero_sets WHERE id = v_published))
      ELSE 'Blank draft created'
    END
  );

  RETURN v_new_set;
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 5. REVOKE/GRANT for updated function
-- ═══════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.create_site_hero_draft(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_site_hero_draft(text) TO authenticated;
