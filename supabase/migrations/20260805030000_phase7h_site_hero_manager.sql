-- Phase 7H: Site Hero Media Manager — versioned hero sets for home/flights/stays
-- Admin-managed hero images with atomic publishing, reversion, and rollback.
-- Public reads only published sets; admins manage drafts via RLS + RPC.

-- ═══════════════════════════════════════════════════════════════
-- 1. TABLE: site_hero_sets
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.site_hero_sets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key        text NOT NULL,
  version_number  integer NOT NULL,
  status          text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'published', 'archived')),
  created_by      uuid DEFAULT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_by    uuid DEFAULT NULL,
  published_at    timestamptz DEFAULT NULL,
  archived_at     timestamptz DEFAULT NULL,
  based_on_set_id uuid DEFAULT NULL REFERENCES public.site_hero_sets(id) ON DELETE SET NULL,
  notes           text DEFAULT NULL,

  CONSTRAINT ck_hero_page_key CHECK (
    page_key IN ('home', 'flights', 'stays')
  ),

  UNIQUE (page_key, version_number)
);

-- One published set per page_key
CREATE UNIQUE INDEX IF NOT EXISTS ux_site_hero_sets_one_published
  ON public.site_hero_sets (page_key)
  WHERE status = 'published';

CREATE INDEX IF NOT EXISTS ix_site_hero_sets_page_status
  ON public.site_hero_sets (page_key, status);

-- ═══════════════════════════════════════════════════════════════
-- 2. TABLE: site_hero_assets
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.site_hero_assets (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hero_set_id     uuid NOT NULL REFERENCES public.site_hero_sets(id) ON DELETE CASCADE,
  slot_key        text NOT NULL
                  CHECK (slot_key IN ('main', 'support_1', 'support_2', 'mobile')),
  storage_path    text NOT NULL CHECK (char_length(trim(storage_path)) > 0),
  alt_text        text DEFAULT NULL,
  is_decorative   boolean NOT NULL DEFAULT false,
  focal_x         integer NOT NULL DEFAULT 50 CHECK (focal_x >= 0 AND focal_x <= 100),
  focal_y         integer NOT NULL DEFAULT 50 CHECK (focal_y >= 0 AND focal_y <= 100),
  original_width  integer DEFAULT NULL,
  original_height integer DEFAULT NULL,
  file_size_bytes bigint DEFAULT NULL,
  mime_type       text DEFAULT NULL,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  UNIQUE (hero_set_id, slot_key)
);

CREATE INDEX IF NOT EXISTS ix_site_hero_assets_set
  ON public.site_hero_assets (hero_set_id);

-- ═══════════════════════════════════════════════════════════════
-- 3. HELPER: has_role — REUSE EXISTING, DO NOT REDEFINE
-- ═══════════════════════════════════════════════════════════════
-- The project already has public.has_role(_user_id UUID, _role app_role)
-- defined in migration 20260113145901. This migration MUST NOT recreate it.
-- All RLS policies below use the established signature.

-- ═══════════════════════════════════════════════════════════════
-- 4. TABLE RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.site_hero_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_hero_assets ENABLE ROW LEVEL SECURITY;

-- Public: read published sets and their assets only
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='site_hero_sets'
    AND policyname='Public can read published hero sets')
  THEN
    CREATE POLICY "Public can read published hero sets"
      ON public.site_hero_sets FOR SELECT
      TO anon, authenticated
      USING (status = 'published');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='site_hero_assets'
    AND policyname='Public can read published hero assets')
  THEN
    CREATE POLICY "Public can read published hero assets"
      ON public.site_hero_assets FOR SELECT
      TO anon, authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.site_hero_sets
          WHERE public.site_hero_sets.id = public.site_hero_assets.hero_set_id
          AND public.site_hero_sets.status = 'published'
        )
      );
  END IF;
END $$;

-- Admin: full access
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='site_hero_sets'
    AND policyname='Admins can manage hero sets')
  THEN
    CREATE POLICY "Admins can manage hero sets"
      ON public.site_hero_sets FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='site_hero_assets'
    AND policyname='Admins can manage hero assets')
  THEN
    CREATE POLICY "Admins can manage hero assets"
      ON public.site_hero_assets FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role))
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 5. RPC: publish_site_hero_set (with row locking and audit)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.publish_site_hero_set(p_set_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_page_key   text;
  v_prev_set   uuid;
  v_slot_count integer;
  v_uid        uuid;
  v_version    integer;
  v_asset      record;
BEGIN
  -- Auth check
  v_uid := auth.uid();
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RETURN 'error: not authorised';
  END IF;

  -- Lock target set (prevent concurrent publish of same draft)
  SELECT page_key, version_number
    INTO v_page_key, v_version
    FROM public.site_hero_sets
    WHERE id = p_set_id
    FOR UPDATE;

  IF v_page_key IS NULL THEN
    RETURN 'error: set not found';
  END IF;

  -- Lock current published set for this page
  SELECT id INTO v_prev_set
    FROM public.site_hero_sets
    WHERE page_key = v_page_key AND status = 'published'
    FOR UPDATE;

  -- Validate exactly 4 required slots
  SELECT count(*) INTO v_slot_count
    FROM public.site_hero_assets
    WHERE hero_set_id = p_set_id;

  IF v_slot_count < 4 THEN
    RETURN 'error: incomplete set — all 4 slots required (found ' || v_slot_count || ')';
  END IF;

  -- Validate required slot keys present
  IF NOT EXISTS (SELECT 1 FROM public.site_hero_assets WHERE hero_set_id = p_set_id AND slot_key = 'main') OR
     NOT EXISTS (SELECT 1 FROM public.site_hero_assets WHERE hero_set_id = p_set_id AND slot_key = 'support_1') OR
     NOT EXISTS (SELECT 1 FROM public.site_hero_assets WHERE hero_set_id = p_set_id AND slot_key = 'support_2') OR
     NOT EXISTS (SELECT 1 FROM public.site_hero_assets WHERE hero_set_id = p_set_id AND slot_key = 'mobile') THEN
    RETURN 'error: required slots missing — need main, support_1, support_2, mobile';
  END IF;

  -- Reject duplicate or unknown slots
  IF EXISTS (
    SELECT slot_key FROM public.site_hero_assets
    WHERE hero_set_id = p_set_id AND slot_key NOT IN ('main', 'support_1', 'support_2', 'mobile')
  ) THEN
    RETURN 'error: unknown slot keys in set';
  END IF;

  -- Verify every asset has a valid storage_path
  IF EXISTS (
    SELECT 1 FROM public.site_hero_assets
    WHERE hero_set_id = p_set_id AND char_length(trim(storage_path)) = 0
  ) THEN
    RETURN 'error: assets with empty storage path';
  END IF;

  -- Archive current published set
  IF v_prev_set IS NOT NULL THEN
    UPDATE public.site_hero_sets
      SET status = 'archived', archived_at = now(), updated_at = now()
      WHERE id = v_prev_set;
  END IF;

  -- Publish target
  UPDATE public.site_hero_sets
    SET status = 'published',
        published_by = v_uid,
        published_at = now(),
        updated_at = now()
    WHERE id = p_set_id;

  -- Audit log
  PERFORM public.log_site_media_event(
    'HERO_SET_PUBLISHED',
    p_page_key    := v_page_key,
    p_version_number := v_version,
    p_hero_set_id := p_set_id,
    p_summary     := 'Published; previously published version archived'
  );

  RETURN 'published';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 6. RPC: create_site_hero_draft
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.create_site_hero_draft(p_page_key text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid       uuid;
  v_published  uuid;
  v_next_ver   integer;
  v_new_set    uuid;
  v_asset      record;
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

  -- Clone assets from published set if it exists
  IF v_published IS NOT NULL THEN
    FOR v_asset IN SELECT * FROM public.site_hero_assets WHERE hero_set_id = v_published
    LOOP
      INSERT INTO public.site_hero_assets (
        hero_set_id, slot_key, storage_path, alt_text, is_decorative,
        focal_x, focal_y, original_width, original_height, file_size_bytes, mime_type
      ) VALUES (
        v_new_set, v_asset.slot_key, v_asset.storage_path, v_asset.alt_text,
        v_asset.is_decorative, v_asset.focal_x, v_asset.focal_y,
        v_asset.original_width, v_asset.original_height, v_asset.file_size_bytes,
        v_asset.mime_type
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
-- 7. RPC: revert_site_hero_set (clone → publish; preserves history)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.revert_site_hero_set(p_page_key text, p_version_number integer)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid        uuid;
  v_archived   uuid;
  v_prev_pub   uuid;
  v_next_ver   integer;
  v_new_set    uuid;
  v_asset      record;
BEGIN
  v_uid := auth.uid();
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RETURN 'error: not authorised';
  END IF;

  -- Validate page key
  IF p_page_key NOT IN ('home', 'flights', 'stays') THEN
    RETURN 'error: invalid page_key';
  END IF;

  -- Lock current published set
  SELECT id INTO v_prev_pub FROM public.site_hero_sets
    WHERE page_key = p_page_key AND status = 'published'
    FOR UPDATE;

  -- Find archived version
  SELECT id INTO v_archived FROM public.site_hero_sets
    WHERE page_key = p_page_key AND version_number = p_version_number AND status = 'archived'
    FOR UPDATE;

  IF v_archived IS NULL THEN
    RETURN 'error: archived version not found';
  END IF;

  -- Next version number
  SELECT coalesce(max(version_number), 0) + 1 INTO v_next_ver
    FROM public.site_hero_sets WHERE page_key = p_page_key;

  -- Clone archived set into new draft, then publish
  INSERT INTO public.site_hero_sets (page_key, version_number, status, created_by, based_on_set_id)
    VALUES (p_page_key, v_next_ver, 'draft', v_uid, v_archived)
    RETURNING id INTO v_new_set;

  -- Clone assets from archived version
  FOR v_asset IN SELECT * FROM public.site_hero_assets WHERE hero_set_id = v_archived
  LOOP
    INSERT INTO public.site_hero_assets (
      hero_set_id, slot_key, storage_path, alt_text, is_decorative,
      focal_x, focal_y, original_width, original_height, file_size_bytes, mime_type
    ) VALUES (
      v_new_set, v_asset.slot_key, v_asset.storage_path, v_asset.alt_text,
      v_asset.is_decorative, v_asset.focal_x, v_asset.focal_y,
      v_asset.original_width, v_asset.original_height, v_asset.file_size_bytes,
      v_asset.mime_type
    );
  END LOOP;

  -- Archive current published
  IF v_prev_pub IS NOT NULL THEN
    UPDATE public.site_hero_sets
      SET status = 'archived', archived_at = now(), updated_at = now()
      WHERE id = v_prev_pub;
  END IF;

  -- Publish the clone
  UPDATE public.site_hero_sets
    SET status = 'published',
        published_by = v_uid,
        published_at = now(),
        updated_at = now()
    WHERE id = v_new_set;

  -- Audit
  PERFORM public.log_site_media_event(
    'HERO_SET_REVERTED',
    p_page_key       := p_page_key,
    p_version_number := v_next_ver,
    p_hero_set_id    := v_new_set,
    p_summary        := format('Reverted to version %s (cloned as v%s)', p_version_number, v_next_ver)
  );

  RETURN 'reverted';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 8. RPC: disable_custom_site_hero (with row locking + audit)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.disable_custom_site_hero(p_page_key text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid      uuid;
  v_pub_set  uuid;
  v_version  integer;
BEGIN
  v_uid := auth.uid();
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RETURN 'error: not authorised';
  END IF;

  -- Validate page key
  IF p_page_key NOT IN ('home', 'flights', 'stays') THEN
    RETURN 'error: invalid page_key';
  END IF;

  -- Lock current published set
  SELECT id, version_number INTO v_pub_set, v_version
    FROM public.site_hero_sets
    WHERE page_key = p_page_key AND status = 'published'
    FOR UPDATE;

  IF v_pub_set IS NULL THEN
    RETURN 'disabled'; -- nothing to disable
  END IF;

  UPDATE public.site_hero_sets
    SET status = 'archived', archived_at = now(), updated_at = now()
    WHERE id = v_pub_set;

  -- Audit
  PERFORM public.log_site_media_event(
    'HERO_CUSTOM_MEDIA_DISABLED',
    p_page_key       := p_page_key,
    p_version_number := v_version,
    p_hero_set_id    := v_pub_set,
    p_summary        := 'Custom hero disabled; site returns to built-in fallback'
  );

  RETURN 'disabled';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 8b. RPC: discard_site_hero_draft
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.discard_site_hero_draft(p_set_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid        uuid;
  v_page_key   text;
  v_version    integer;
  v_status     text;
  v_asset      record;
BEGIN
  v_uid := auth.uid();
  IF NOT public.has_role(v_uid, 'admin'::public.app_role) THEN
    RETURN 'error: not authorised';
  END IF;

  SELECT page_key, version_number, status
    INTO v_page_key, v_version, v_status
    FROM public.site_hero_sets
    WHERE id = p_set_id
    FOR UPDATE;

  IF v_page_key IS NULL THEN
    RETURN 'error: set not found';
  END IF;

  IF v_status != 'draft' THEN
    RETURN 'error: only drafts can be discarded';
  END IF;

  -- Remove draft assets
  DELETE FROM public.site_hero_assets WHERE hero_set_id = p_set_id;

  -- Remove draft set
  DELETE FROM public.site_hero_sets WHERE id = p_set_id;

  -- Audit
  PERFORM public.log_site_media_event(
    'HERO_DRAFT_DELETED',
    p_page_key       := v_page_key,
    p_version_number := v_version,
    p_hero_set_id    := p_set_id,
    p_summary        := 'Draft discarded'
  );

  RETURN 'discarded';
END;
$$;

-- ═══════════════════════════════════════════════════════════════
-- 9. STORAGE BUCKETS: site-media (public) + site-media-drafts (private)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media', 'site-media', true, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-media-drafts', 'site-media-drafts', false, 5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ── Storage RLS: site-media (public bucket) ──

-- Anyone can read published files
DROP POLICY IF EXISTS "Public can read site-media objects" ON storage.objects;
CREATE POLICY "Public can read site-media objects"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'site-media');

-- Admins can write to public bucket (for file promotion during publish)
DROP POLICY IF EXISTS "Admins can upload site-media" ON storage.objects;
CREATE POLICY "Admins can upload site-media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can update site-media" ON storage.objects;
CREATE POLICY "Admins can update site-media"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS "Admins can delete site-media" ON storage.objects;
CREATE POLICY "Admins can delete site-media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-media' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ── Storage RLS: site-media-drafts (private bucket) ──

-- No public/anonymous access to drafts
DROP POLICY IF EXISTS "No public read on site-media-drafts" ON storage.objects;
CREATE POLICY "No public read on site-media-drafts"
  ON storage.objects FOR SELECT
  TO anon
  USING (false);

-- Regular authenticated users cannot read drafts
DROP POLICY IF EXISTS "Only admins can read site-media-drafts" ON storage.objects;
CREATE POLICY "Only admins can read site-media-drafts"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'site-media-drafts' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can upload drafts
DROP POLICY IF EXISTS "Admins can upload site-media-drafts" ON storage.objects;
CREATE POLICY "Admins can upload site-media-drafts"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'site-media-drafts' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can update drafts
DROP POLICY IF EXISTS "Admins can update site-media-drafts" ON storage.objects;
CREATE POLICY "Admins can update site-media-drafts"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'site-media-drafts' AND public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (bucket_id = 'site-media-drafts' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- Only admins can delete drafts
DROP POLICY IF EXISTS "Admins can delete site-media-drafts" ON storage.objects;
CREATE POLICY "Admins can delete site-media-drafts"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'site-media-drafts' AND public.has_role(auth.uid(), 'admin'::public.app_role));

-- ═══════════════════════════════════════════════════════════════
-- 10. AUDIT LOG: site_media_events
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.site_media_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type      text NOT NULL CHECK (event_type IN (
    'HERO_SET_DRAFT_CREATED',
    'HERO_IMAGE_UPLOADED',
    'HERO_IMAGE_REPLACED',
    'HERO_METADATA_UPDATED',
    'HERO_SET_PUBLISHED',
    'HERO_SET_REVERTED',
    'HERO_CUSTOM_MEDIA_DISABLED',
    'HERO_DRAFT_DELETED'
  )),
  actor_id        uuid DEFAULT NULL,
  page_key        text DEFAULT NULL,
  version_number  integer DEFAULT NULL,
  hero_set_id     uuid DEFAULT NULL,
  slot_key        text DEFAULT NULL,
  summary         text DEFAULT NULL,
  created_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_media_events ENABLE ROW LEVEL SECURITY;

-- Admins can read audit log
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='site_media_events'
    AND policyname='Admins can read site media events')
  THEN
    CREATE POLICY "Admins can read site media events"
      ON public.site_media_events FOR SELECT
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='site_media_events'
    AND policyname='Admins can insert site media events')
  THEN
    CREATE POLICY "Admins can insert site media events"
      ON public.site_media_events FOR INSERT
      TO authenticated
      WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));
  END IF;
END $$;

-- Helper: log a site media event (runs as SECURITY DEFINER so RLS on
-- site_media_events does not block the log write).
CREATE OR REPLACE FUNCTION public.log_site_media_event(
  p_event_type      text,
  p_page_key        text DEFAULT NULL,
  p_version_number  integer DEFAULT NULL,
  p_hero_set_id     uuid DEFAULT NULL,
  p_slot_key        text DEFAULT NULL,
  p_summary         text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.site_media_events (
    event_type, actor_id, page_key, version_number, hero_set_id, slot_key, summary
  ) VALUES (
    p_event_type, auth.uid(), p_page_key, p_version_number, p_hero_set_id, p_slot_key, p_summary
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_site_media_event(text, text, integer, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_site_media_event(text, text, integer, uuid, text, text) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 11. REVOKE/GRANT — restrict all SECURITY DEFINER functions
-- ═══════════════════════════════════════════════════════════════

REVOKE ALL ON FUNCTION public.publish_site_hero_set(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.publish_site_hero_set(uuid) TO authenticated;

REVOKE ALL ON FUNCTION public.create_site_hero_draft(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_site_hero_draft(text) TO authenticated;

REVOKE ALL ON FUNCTION public.revert_site_hero_set(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revert_site_hero_set(text, integer) TO authenticated;

REVOKE ALL ON FUNCTION public.disable_custom_site_hero(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.disable_custom_site_hero(text) TO authenticated;

REVOKE ALL ON FUNCTION public.discard_site_hero_draft(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.discard_site_hero_draft(uuid) TO authenticated;
