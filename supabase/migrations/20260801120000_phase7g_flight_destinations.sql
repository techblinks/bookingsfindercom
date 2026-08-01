-- Phase 7G: Flight Destination Manager — flight_destinations + storage
-- Admin-managed destination cards for the flight landing page.
-- Public can read ACTIVE rows; only admins can write. Master images live in the
-- 'flight-destinations' storage bucket (public read, admin-only writes).

-- ═══════════════════════════════════════════════════════════════
-- 1. TABLE
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.flight_destinations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  city          text NOT NULL,
  country       text NOT NULL,
  iata_code     text NOT NULL,
  slug          text NOT NULL,
  description   text DEFAULT NULL,
  alt_text      text DEFAULT NULL,
  image_path    text DEFAULT NULL,
  focal_x       numeric NOT NULL DEFAULT 0.5,
  focal_y       numeric NOT NULL DEFAULT 0.5,
  display_order integer NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 2. CONSTRAINTS — idempotent: drop first, then add
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.flight_destinations DROP CONSTRAINT IF EXISTS ck_fd_city_not_empty;
ALTER TABLE public.flight_destinations ADD CONSTRAINT ck_fd_city_not_empty
  CHECK (char_length(trim(city)) > 0);

ALTER TABLE public.flight_destinations DROP CONSTRAINT IF EXISTS ck_fd_country_not_empty;
ALTER TABLE public.flight_destinations ADD CONSTRAINT ck_fd_country_not_empty
  CHECK (char_length(trim(country)) > 0);

-- IATA: exactly 3 uppercase letters
ALTER TABLE public.flight_destinations DROP CONSTRAINT IF EXISTS ck_fd_iata_format;
ALTER TABLE public.flight_destinations ADD CONSTRAINT ck_fd_iata_format
  CHECK (iata_code ~ '^[A-Z]{3}$');

-- Slug: lowercase letters, numbers, hyphens
ALTER TABLE public.flight_destinations DROP CONSTRAINT IF EXISTS ck_fd_slug_format;
ALTER TABLE public.flight_destinations ADD CONSTRAINT ck_fd_slug_format
  CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$');

-- Focal point: normalised 0..1
ALTER TABLE public.flight_destinations DROP CONSTRAINT IF EXISTS ck_fd_focal_x_range;
ALTER TABLE public.flight_destinations ADD CONSTRAINT ck_fd_focal_x_range
  CHECK (focal_x >= 0 AND focal_x <= 1);

ALTER TABLE public.flight_destinations DROP CONSTRAINT IF EXISTS ck_fd_focal_y_range;
ALTER TABLE public.flight_destinations ADD CONSTRAINT ck_fd_focal_y_range
  CHECK (focal_y >= 0 AND focal_y <= 1);

ALTER TABLE public.flight_destinations DROP CONSTRAINT IF EXISTS ck_fd_display_order_nonneg;
ALTER TABLE public.flight_destinations ADD CONSTRAINT ck_fd_display_order_nonneg
  CHECK (display_order >= 0);

-- Unique slug (used as the public identifier / image path stem)
CREATE UNIQUE INDEX IF NOT EXISTS ux_flight_destinations_slug
  ON public.flight_destinations (slug);

-- Fast public ordering of active rows
CREATE INDEX IF NOT EXISTS ix_flight_destinations_active_order
  ON public.flight_destinations (is_active, display_order);

-- ═══════════════════════════════════════════════════════════════
-- 3. TABLE RLS
-- ═══════════════════════════════════════════════════════════════

ALTER TABLE public.flight_destinations ENABLE ROW LEVEL SECURITY;

-- Public (anon + authenticated) may read ONLY active rows.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'flight_destinations'
      AND policyname = 'Public can read active destinations'
  ) THEN
    CREATE POLICY "Public can read active destinations"
      ON public.flight_destinations FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;

-- Admins may read/insert/update/delete every row.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'flight_destinations'
      AND policyname = 'Admins can manage destinations'
  ) THEN
    CREATE POLICY "Admins can manage destinations"
      ON public.flight_destinations FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- ═══════════════════════════════════════════════════════════════
-- 4. TRIGGER — auto-set updated_at
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.set_flight_destinations_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_flight_destinations_updated ON public.flight_destinations;
CREATE TRIGGER trg_flight_destinations_updated
  BEFORE UPDATE ON public.flight_destinations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_flight_destinations_updated_at();

-- ═══════════════════════════════════════════════════════════════
-- 5. STORAGE BUCKET — flight-destinations
-- ═══════════════════════════════════════════════════════════════

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'flight-destinations',
  'flight-destinations',
  true,
  5242880, -- 5 MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ═══════════════════════════════════════════════════════════════
-- 6. STORAGE RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- Public read: bucket is public, so anon SELECT is allowed by Supabase's
-- default public-bucket behaviour. An explicit public SELECT policy makes the
-- intent clear and covers signed contexts.
DROP POLICY IF EXISTS "Public can read flight-destination objects" ON storage.objects;
CREATE POLICY "Public can read flight-destination objects"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'flight-destinations');

DROP POLICY IF EXISTS "Admins can upload flight-destination objects" ON storage.objects;
CREATE POLICY "Admins can upload flight-destination objects"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'flight-destinations' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can update flight-destination objects" ON storage.objects;
CREATE POLICY "Admins can update flight-destination objects"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'flight-destinations' AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id = 'flight-destinations' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can delete flight-destination objects" ON storage.objects;
CREATE POLICY "Admins can delete flight-destination objects"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'flight-destinations' AND public.has_role(auth.uid(), 'admin'));

-- ═══════════════════════════════════════════════════════════════
-- 7. SEED — six destinations, INACTIVE and WITHOUT images
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.flight_destinations
  (city, country, iata_code, slug, description, alt_text, display_order, is_active)
VALUES
  ('Kathmandu', 'Nepal',                'KTM', 'kathmandu',
   'Gateway to the Himalaya',
   'Kathmandu, Nepal — temple rooftops beneath the Himalaya', 1, false),
  ('New Delhi', 'India',                'DEL', 'new-delhi',
   'History meets modern India',
   'New Delhi, India — a historic sandstone monument at golden hour', 2, false),
  ('Dubai', 'United Arab Emirates',     'DXB', 'dubai',
   'A skyline in the desert',
   'Dubai, United Arab Emirates — a modern skyline against a hazy warm sky', 3, false),
  ('London', 'United Kingdom',          'LON', 'london',
   'Timeless landmarks and lanes',
   'London, United Kingdom — a classic bridge over a calm river', 4, false),
  ('Singapore', 'Singapore',            'SIN', 'singapore',
   'A lush garden city',
   'Singapore, Singapore — a green city skyline with lush foreground trees', 5, false),
  ('Sydney', 'Australia',               'SYD', 'sydney',
   'Harbour city and beaches',
   'Sydney, Australia — a harbour view with sailboats and blue water', 6, false)
ON CONFLICT (slug) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- VERIFICATION (after applying migration to hosted Supabase)
-- ═══════════════════════════════════════════════════════════════
-- 1. Table exists with RLS enabled; policies: public-read-active + admin-manage.
-- 2. Bucket 'flight-destinations' exists: public=true, 5 MB, image/* mimes.
-- 3. Storage policies exist for bucket_id='flight-destinations'
--    (public SELECT + admin INSERT/UPDATE/DELETE).
-- 4. Six seed rows present, is_active=false, image_path NULL.
-- 5. Anon SELECT returns 0 rows (all inactive); admin SELECT returns 6.
-- 6. Non-admin authenticated user cannot INSERT/UPDATE/DELETE.
