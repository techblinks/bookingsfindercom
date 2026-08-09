-- Phase 1C: Durable Tiqets catalogue index + destination lookup
-- Required for local catalogue search when upstream location filters are unreliable.

-- ═══════════════════════════════════════════════════════════════════
-- 1. experience_products — cached provider product catalogue
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.experience_products (
  provider            text NOT NULL,
  provider_product_id text NOT NULL,
  title               text NOT NULL,
  slug                text NOT NULL GENERATED ALWAYS AS (
    lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'))
  ) STORED,
  city_id             text,
  city_name           text,
  country_id          text,
  country_name        text,
  tagline             text,
  description         text,
  venue_name          text,
  rating              numeric(3,2),
  review_count        integer,
  price_amount        numeric,
  price_currency      text,
  image_url           text,
  images              jsonb NOT NULL DEFAULT '[]'::jsonb,
  tag_ids             jsonb NOT NULL DEFAULT '[]'::jsonb,
  wheelchair_accessible boolean,
  skip_the_line       boolean,
  product_url         text NOT NULL,
  sale_status         text,
  provider_updated_at timestamptz,
  last_seen_at        timestamptz NOT NULL DEFAULT now(),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, provider_product_id)
);

CREATE INDEX IF NOT EXISTS ix_products_city
  ON public.experience_products (provider, city_id);

CREATE INDEX IF NOT EXISTS ix_products_country
  ON public.experience_products (provider, country_id);

-- ═══════════════════════════════════════════════════════════════════
-- 2. experience_destinations — derived city/country lookup
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.experience_destinations (
  provider              text NOT NULL,
  destination_id        text NOT NULL,
  name                  text NOT NULL,
  country_id            text,
  country               text,
  country_code          text,
  slug                  text,
  observed_product_count integer NOT NULL DEFAULT 0,
  last_seen_at          timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, destination_id)
);

CREATE INDEX IF NOT EXISTS ix_destinations_name
  ON public.experience_destinations (provider, name);

-- ═══════════════════════════════════════════════════════════════════
-- 3. experience_catalog_sync_state — checkpointed pagination
-- ═══════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.experience_catalog_sync_state (
  provider          text PRIMARY KEY,
  next_page         integer NOT NULL DEFAULT 1,
  page_size         integer NOT NULL DEFAULT 20,
  status            text DEFAULT 'idle',
  pages_scanned     integer NOT NULL DEFAULT 0,
  products_observed integer NOT NULL DEFAULT 0,
  started_at        timestamptz,
  last_success_at   timestamptz,
  completed_at      timestamptz,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════════
-- 4. Server-side catalogue upsert helper (service_role only)
-- ═══════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.upsert_experience_products(
  p_provider text,
  p_products jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count integer := 0;
  v_row jsonb;
BEGIN
  FOR v_row IN SELECT * FROM jsonb_array_elements(p_products)
  LOOP
    INSERT INTO public.experience_products (
      provider, provider_product_id, title, city_id, city_name,
      country_id, country_name, tagline, description, venue_name,
      rating, review_count, price_amount, price_currency,
      image_url, images, tag_ids, wheelchair_accessible, skip_the_line,
      product_url, sale_status, provider_updated_at, last_seen_at
    ) VALUES (
      p_provider,
      v_row->>'provider_product_id',
      v_row->>'title',
      v_row->>'city_id',
      v_row->>'city_name',
      v_row->>'country_id',
      v_row->>'country_name',
      v_row->>'tagline',
      v_row->>'description',
      v_row->>'venue_name',
      (v_row->>'rating')::numeric,
      (v_row->>'review_count')::integer,
      (v_row->>'price_amount')::numeric,
      v_row->>'price_currency',
      v_row->>'image_url',
      COALESCE((v_row->'images'), '[]'::jsonb),
      COALESCE((v_row->'tag_ids'), '[]'::jsonb),
      (v_row->>'wheelchair_accessible')::boolean,
      (v_row->>'skip_the_line')::boolean,
      v_row->>'product_url',
      v_row->>'sale_status',
      (v_row->>'provider_updated_at')::timestamptz,
      coalesce((v_row->>'last_seen_at')::timestamptz, now())
    )
    ON CONFLICT (provider, provider_product_id) DO UPDATE SET
      title = EXCLUDED.title,
      city_id = EXCLUDED.city_id,
      city_name = EXCLUDED.city_name,
      country_id = EXCLUDED.country_id,
      country_name = EXCLUDED.country_name,
      rating = EXCLUDED.rating,
      review_count = EXCLUDED.review_count,
      price_amount = EXCLUDED.price_amount,
      price_currency = EXCLUDED.price_currency,
      image_url = EXCLUDED.image_url,
      images = EXCLUDED.images,
      tag_ids = EXCLUDED.tag_ids,
      product_url = EXCLUDED.product_url,
      sale_status = EXCLUDED.sale_status,
      last_seen_at = EXCLUDED.last_seen_at,
      updated_at = now();
    v_count := v_count + 1;
  END LOOP;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.upsert_experience_products(text, jsonb) FROM PUBLIC;

-- ═══════════════════════════════════════════════════════════════════
-- 5. RLS — public read, no browser writes
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE public.experience_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.experience_catalog_sync_state ENABLE ROW LEVEL SECURITY;

-- Products: public read-only
CREATE POLICY "Public can read products" ON public.experience_products
  FOR SELECT TO anon, authenticated USING (true);

-- Destinations: public read-only
CREATE POLICY "Public can read destinations" ON public.experience_destinations
  FOR SELECT TO anon, authenticated USING (true);

-- Sync state: no public access
