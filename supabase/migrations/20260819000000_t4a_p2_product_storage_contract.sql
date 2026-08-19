-- T4A-P2: Durable product storage contract repair
-- ============================================================================
-- Forward-only. The historical Phase 1C migration
-- (20260808000000_phase1c_experience_destinations.sql) is NOT edited.
--
-- The T4A audit proved the Phase 1C product storage contract could not
-- faithfully store a normalized Tiqets product:
--
--   1. product_url was NOT NULL while NormalizedProduct.productUrl is
--      `string | null` — a genuine product with no provider URL could not be
--      stored at all.
--   2. Genuine normalized image metadata (alt text, credit) had nowhere to go.
--   3. Genuine normalized product facts (smartphone ticket, instant delivery,
--      duration, cancellation, checkout URL) had nowhere to go.
--   4. tag_ids / images were written as JSON *strings* by the legacy writer
--      instead of JSON arrays.
--   5. The ON CONFLICT update set was incomplete: tagline, venue_name,
--      wheelchair_accessible and skip_the_line froze at their first-insert
--      values forever.
--   6. The upsert overwrote `description` and `images` — data owned by detail
--      enrichment, not by list discovery.
--   7. Only `REVOKE ALL ... FROM PUBLIC` existed; the intended executor was
--      never stated.
--
-- THIS MIGRATION IS NOT APPLIED BY THIS COMMIT. Applying it is a separate,
-- explicit operation against a named project ref. Nothing here rewrites,
-- deletes or backfills existing rows: no remote data has been inspected, so
-- no claim is made about the shape of rows already in the table.
--
-- SCOPE: experience_products + upsert_experience_products ONLY.
--   experience_destinations       — deliberately untouched (later phase).
--   experience_catalog_sync_state — deliberately untouched (T4A-P3).
--   RLS policies                  — deliberately untouched (read architecture).
--   refresh-catalogue             — remains fail-closed (503, T4A-P1).

-- ═══════════════════════════════════════════════════════════════════
-- 1. product_url becomes nullable
-- ═══════════════════════════════════════════════════════════════════
--
-- Absence of a provider URL means "not currently known". It does NOT mean the
-- product is invalid, sold out, price-on-request, or that a URL should be
-- generated or guessed. Customer-facing CTA logic already fails closed when no
-- valid provider URL exists, so a URL-less product is storable and simply not
-- linkable. Widening NOT NULL → NULL cannot fail on existing rows.

ALTER TABLE public.experience_products
  ALTER COLUMN product_url DROP NOT NULL;

-- ═══════════════════════════════════════════════════════════════════
-- 2. Genuine normalized fields that had no column
-- ═══════════════════════════════════════════════════════════════════
--
-- Every column below maps 1:1 to a field NormalizedProduct genuinely carries.
-- Nothing speculative is added: there is no `meeting_point` and no
-- `availability_state` column here, because the provider contract does not
-- supply them, and no `free_cancellation` boolean, because reducing the
-- provider's cancellation *text* to a boolean is a different proposition than
-- the one the provider actually made.
--
-- All nullable: null means "not observed", which is a fact, not a defect.

ALTER TABLE public.experience_products
  -- NormalizedProduct.image.altText — never generated, never derived from the title.
  ADD COLUMN IF NOT EXISTS image_alt            text,
  -- NormalizedProduct.image.credit
  ADD COLUMN IF NOT EXISTS image_credit         text,
  -- NormalizedProduct.smartphoneTicket
  ADD COLUMN IF NOT EXISTS smartphone_ticket    boolean,
  -- NormalizedProduct.instantTicketDelivery. NOT `instant_confirmation`:
  -- see the COMMENT ON below — the two are different traveller claims.
  ADD COLUMN IF NOT EXISTS instant_ticket_delivery boolean,
  -- NormalizedProduct.duration (provider text, e.g. "2 hours")
  ADD COLUMN IF NOT EXISTS duration             text,
  -- NormalizedProduct.cancellation (provider text, preserved verbatim)
  ADD COLUMN IF NOT EXISTS cancellation         text,
  -- NormalizedProduct.productCheckoutUrl
  ADD COLUMN IF NOT EXISTS product_checkout_url text;

COMMENT ON COLUMN public.experience_products.image_alt IS
  'Provider-supplied alt text for image_url. Null means the provider gave none — never generated.';
COMMENT ON COLUMN public.experience_products.image_credit IS
  'Provider-supplied image credit. Null means the provider gave none — never invented.';
COMMENT ON COLUMN public.experience_products.cancellation IS
  'Provider cancellation text, verbatim. Deliberately NOT reduced to a free_cancellation boolean.';
COMMENT ON COLUMN public.experience_products.instant_ticket_delivery IS
  'Provider claim that the TICKET is delivered instantly (Tiqets instant_ticket_delivery). This is NOT booking confirmation: it must never be read as, mapped to, or stored in an instant_confirmation column. The Tiqets /products contract makes no booking-confirmation claim, which is why the live Tiqets ExperienceProduct adapter leaves instantConfirmation null.';

-- ═══════════════════════════════════════════════════════════════════
-- 3. Ownership documentation (rating scale decision recorded here)
-- ═══════════════════════════════════════════════════════════════════
--
-- rating stays numeric(3,2). The audit noted numeric(3,2) cannot hold 10.00,
-- but the repository's own evidence treats ratings as a 0–5 scale
-- (tiqets-public bounds min_rating with `z.number().int().min(1).max(5)`),
-- and nothing in the repository shows Tiqets returning a 0–10 scale. Changing
-- the column on a hunch would be a schema change with no proof behind it, so
-- the type is preserved. Revisit only with direct provider evidence.

COMMENT ON COLUMN public.experience_products.rating IS
  'Provider average rating on the 0-5 scale the readers assume (see tiqets-public min_rating 1..5). numeric(3,2) preserved deliberately: no repository evidence of a 0-10 provider scale.';

-- description and images are DETAIL-ENRICHMENT OWNED. Catalogue list
-- discovery is not an authoritative source for either, and the upsert below
-- never writes them on conflict.
COMMENT ON COLUMN public.experience_products.description IS
  'DETAIL-ENRICHMENT OWNED. Never written by catalogue list discovery; upsert_experience_products never overwrites it on conflict.';
COMMENT ON COLUMN public.experience_products.images IS
  'DETAIL-ENRICHMENT OWNED gallery. Never written by catalogue list discovery — the list contract exposes only one primary image, which lives in image_url/image_alt/image_credit. A one-item gallery is never fabricated from it.';
COMMENT ON COLUMN public.experience_products.provider_updated_at IS
  'Reserved for a genuine upstream modification timestamp. The Tiqets /products contract exposes none, so catalogue discovery leaves it untouched rather than inventing one.';

-- ═══════════════════════════════════════════════════════════════════
-- 4. JSONB shape guards — forward-only, NOT VALID
-- ═══════════════════════════════════════════════════════════════════
--
-- The legacy writer did `JSON.stringify(tagIds)` before handing the value to a
-- jsonb column, producing "[1,2,3]" (a JSON string) instead of [1,2,3] (a JSON
-- array). Production row state is UNKNOWN — no remote data has been inspected
-- — so these constraints are added NOT VALID: every new or updated row must be
-- a genuine array, while existing rows are neither validated nor rewritten.
-- No data-cleanup UPDATE is performed. A later phase may VALIDATE these
-- constraints once real row state has been examined on a non-production copy.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.experience_products'::regclass
      AND conname = 'ck_experience_products_tag_ids_array'
  ) THEN
    ALTER TABLE public.experience_products
      ADD CONSTRAINT ck_experience_products_tag_ids_array
      CHECK (jsonb_typeof(tag_ids) = 'array') NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.experience_products'::regclass
      AND conname = 'ck_experience_products_images_array'
  ) THEN
    ALTER TABLE public.experience_products
      ADD CONSTRAINT ck_experience_products_images_array
      CHECK (jsonb_typeof(images) = 'array') NOT VALID;
  END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════
-- 5. upsert_experience_products — repaired storage contract
-- ═══════════════════════════════════════════════════════════════════
--
-- Signature, SECURITY DEFINER, hardened search_path, provider-scoped identity
-- and the integer return are all preserved from Phase 1C.
--
-- ATOMIC BY DESIGN. One malformed row aborts the whole batch with a named
-- error rather than being silently skipped: silent skipping is how a sync
-- reports success while losing products. Chunking, retry and partial-success
-- policy belong to the P3 sync engine, not to this function.
--
-- IDENTITY IS LOCKED. The conflict target is (provider, provider_product_id)
-- and nothing else. `slug` is GENERATED ALWAYS from the provider title and is
-- metadata only — it is never a conflict target, never unique, and never
-- BookingsFinder canonical activity identity (that lives in
-- things_activities, keyed by (destination_slug, slug)).
--
-- NULL POLICY. Snapshot-owned columns take EXCLUDED unconditionally, so the
-- latest genuine observation wins even when it is null: a price that
-- disappears upstream becomes null, an image that disappears becomes null.
-- COALESCE(EXCLUDED.col, old.col) is deliberately NOT used on snapshot
-- columns — it would silently preserve stale provider facts and make the
-- catalogue lie about current provider state. "Last known value" is a
-- provenance model, not a merge trick.

CREATE OR REPLACE FUNCTION public.upsert_experience_products(
  p_provider text,
  p_products jsonb
) RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count   integer := 0;
  v_invalid integer := 0;
  v_dupes   integer := 0;
BEGIN
  -- ── Fail-closed input validation ──────────────────────────────────
  -- The TypeScript adapter (catalogue-storage.ts) is the primary row
  -- validator; this is the final integrity boundary, not a JSON schema.

  IF p_provider IS NULL OR btrim(p_provider) = '' THEN
    RAISE EXCEPTION 'upsert_experience_products: p_provider must be a non-blank provider key';
  END IF;

  IF p_products IS NULL OR jsonb_typeof(p_products) <> 'array' THEN
    RAISE EXCEPTION 'upsert_experience_products: p_products must be a JSON array';
  END IF;

  IF jsonb_array_length(p_products) = 0 THEN
    RETURN 0;
  END IF;

  SELECT count(*) INTO v_invalid
  FROM jsonb_array_elements(p_products) AS e(item)
  WHERE jsonb_typeof(e.item) <> 'object'
     OR coalesce(btrim(e.item->>'provider_product_id'), '') = ''
     OR coalesce(btrim(e.item->>'title'), '') = ''
     -- tag_ids / images, when carried at all, must be genuine JSON arrays.
     -- jsonb_typeof(...) IS NULL means the key is absent, which is fine.
     OR (
          jsonb_typeof(e.item->'tag_ids') IS NOT NULL
          AND jsonb_typeof(e.item->'tag_ids') NOT IN ('array', 'null')
        )
     OR (
          jsonb_typeof(e.item->'images') IS NOT NULL
          AND jsonb_typeof(e.item->'images') NOT IN ('array', 'null')
        );

  IF v_invalid > 0 THEN
    RAISE EXCEPTION
      'upsert_experience_products: % of % rows are invalid (blank provider_product_id/title, or non-array tag_ids/images)',
      v_invalid, jsonb_array_length(p_products);
  END IF;

  -- A provider product may appear at most once per batch. Postgres cannot
  -- apply ON CONFLICT DO UPDATE to the same row twice, and quietly keeping
  -- "whichever won" would be a silent data decision.
  SELECT count(*) INTO v_dupes
  FROM (
    SELECT e.item->>'provider_product_id' AS pid
    FROM jsonb_array_elements(p_products) AS e(item)
    GROUP BY 1
    HAVING count(*) > 1
  ) AS d;

  IF v_dupes > 0 THEN
    RAISE EXCEPTION
      'upsert_experience_products: % provider_product_id value(s) appear more than once in the batch',
      v_dupes;
  END IF;

  -- ── Set-based upsert ──────────────────────────────────────────────
  -- description and images are absent from BOTH the column list and the
  -- update set: catalogue discovery does not own them. On insert they take
  -- their table defaults (NULL / '[]'); on conflict the existing enriched
  -- values are left exactly as they were.
  --
  -- provider_updated_at is likewise absent: no proven upstream timestamp.

  INSERT INTO public.experience_products (
    provider,
    provider_product_id,
    title,
    city_id,
    city_name,
    country_id,
    country_name,
    tagline,
    venue_name,
    rating,
    review_count,
    price_amount,
    price_currency,
    image_url,
    image_alt,
    image_credit,
    tag_ids,
    wheelchair_accessible,
    skip_the_line,
    smartphone_ticket,
    instant_ticket_delivery,
    duration,
    cancellation,
    product_url,
    product_checkout_url,
    sale_status,
    last_seen_at
  )
  SELECT
    p_provider,
    e.item->>'provider_product_id',
    e.item->>'title',
    e.item->>'city_id',
    e.item->>'city_name',
    e.item->>'country_id',
    e.item->>'country_name',
    e.item->>'tagline',
    e.item->>'venue_name',
    -- ->> yields SQL NULL for a JSON null, and '0' for a genuine zero, so a
    -- real 0 rating / 0 review count / 0 price casts to 0 and is never
    -- mistaken for "missing".
    (e.item->>'rating')::numeric,
    (e.item->>'review_count')::integer,
    (e.item->>'price_amount')::numeric,
    e.item->>'price_currency',
    e.item->>'image_url',
    e.item->>'image_alt',
    e.item->>'image_credit',
    -- Consumed as JSONB via -> (never ->>), so an array stays an array. A
    -- JSON string such as "[1,2,3]" was already rejected above.
    CASE
      WHEN jsonb_typeof(e.item->'tag_ids') = 'array' THEN e.item->'tag_ids'
      ELSE '[]'::jsonb
    END,
    (e.item->>'wheelchair_accessible')::boolean,
    (e.item->>'skip_the_line')::boolean,
    (e.item->>'smartphone_ticket')::boolean,
    (e.item->>'instant_ticket_delivery')::boolean,
    e.item->>'duration',
    e.item->>'cancellation',
    -- Nullable by contract: an absent provider URL is stored as null.
    e.item->>'product_url',
    e.item->>'product_checkout_url',
    -- Raw normalized provider status, verbatim. Never re-spelled.
    e.item->>'sale_status',
    coalesce((e.item->>'last_seen_at')::timestamptz, now())
  FROM jsonb_array_elements(p_products) AS e(item)
  ON CONFLICT (provider, provider_product_id) DO UPDATE SET
    -- A. SNAPSHOT-OWNED — latest genuine observation wins, null included.
    title                 = EXCLUDED.title,
    city_id               = EXCLUDED.city_id,
    city_name             = EXCLUDED.city_name,
    country_id            = EXCLUDED.country_id,
    country_name          = EXCLUDED.country_name,
    tagline               = EXCLUDED.tagline,
    venue_name            = EXCLUDED.venue_name,
    rating                = EXCLUDED.rating,
    review_count          = EXCLUDED.review_count,
    price_amount          = EXCLUDED.price_amount,
    price_currency        = EXCLUDED.price_currency,
    image_url             = EXCLUDED.image_url,
    image_alt             = EXCLUDED.image_alt,
    image_credit          = EXCLUDED.image_credit,
    tag_ids               = EXCLUDED.tag_ids,
    wheelchair_accessible = EXCLUDED.wheelchair_accessible,
    skip_the_line         = EXCLUDED.skip_the_line,
    smartphone_ticket     = EXCLUDED.smartphone_ticket,
    instant_ticket_delivery = EXCLUDED.instant_ticket_delivery,
    duration              = EXCLUDED.duration,
    cancellation          = EXCLUDED.cancellation,
    product_url           = EXCLUDED.product_url,
    product_checkout_url  = EXCLUDED.product_checkout_url,
    sale_status           = EXCLUDED.sale_status,
    last_seen_at          = EXCLUDED.last_seen_at,
    -- C. DATABASE-OWNED
    updated_at            = now();
    --
    -- B. ENRICHMENT-OWNED — description and images are intentionally ABSENT
    -- from this SET. Catalogue discovery must never erase a richer,
    -- separately sourced description or gallery.
    --
    -- Identity is intentionally ABSENT too: provider, provider_product_id,
    -- created_at and the generated slug are never reassigned here.

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

COMMENT ON FUNCTION public.upsert_experience_products(text, jsonb) IS
  'T4A-P2 durable catalogue product upsert. Atomic, provider-scoped, snapshot-owned columns refreshed (null included); description and images are enrichment-owned and never overwritten. Rows must come from catalogue-storage.ts toCatalogueProductRow.';

-- ═══════════════════════════════════════════════════════════════════
-- 6. Explicit execute permission contract
-- ═══════════════════════════════════════════════════════════════════
--
-- Phase 1C revoked PUBLIC but never stated who may execute this, leaving the
-- intended permission contract implicit. Catalogue writes are a service-role
-- operation: browser roles must never be able to mutate the catalogue.
-- (REVOKE from a role that was never granted is a harmless no-op, and is
-- written out so the intent survives review.)

REVOKE ALL ON FUNCTION public.upsert_experience_products(text, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.upsert_experience_products(text, jsonb) FROM anon;
REVOKE ALL ON FUNCTION public.upsert_experience_products(text, jsonb) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.upsert_experience_products(text, jsonb) TO service_role;

-- ═══════════════════════════════════════════════════════════════════
-- 7. Indexes — deliberately none added
-- ═══════════════════════════════════════════════════════════════════
--
-- The two proven catalogue read filters (tiqets-public catalogue-search
-- .eq("city_id", …) and .eq("country_id", …)) are already served by
-- ix_products_city and ix_products_country from Phase 1C. The remaining
-- catalogue-search paths (title/tagline ILIKE, rating/price/review_count
-- ordering) are unproven at current data volume, and staleness/checkpoint
-- indexes belong to the P3 sync engine. No speculative index is added here.
