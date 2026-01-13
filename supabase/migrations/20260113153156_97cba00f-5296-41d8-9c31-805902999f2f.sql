-- Drop and recreate the type check constraint with more options
ALTER TABLE public.ad_placements DROP CONSTRAINT ad_placements_type_check;
ALTER TABLE public.ad_placements ADD CONSTRAINT ad_placements_type_check 
  CHECK (type = ANY (ARRAY['sponsored_card'::text, 'html_embed'::text, 'banner'::text, 'native'::text, 'hero_banner'::text, 'inline_promo'::text]));

-- Drop and recreate the page check constraint to include home
ALTER TABLE public.ad_placements DROP CONSTRAINT ad_placements_page_check;
ALTER TABLE public.ad_placements ADD CONSTRAINT ad_placements_page_check 
  CHECK (page = ANY (ARRAY['flights'::text, 'hotels'::text, 'both'::text, 'home'::text, 'all'::text]));

-- Drop and recreate the placement check constraint with more options
ALTER TABLE public.ad_placements DROP CONSTRAINT ad_placements_placement_check;
ALTER TABLE public.ad_placements ADD CONSTRAINT ad_placements_placement_check 
  CHECK (placement = ANY (ARRAY['after_result_3'::text, 'bottom'::text, 'after_result_5'::text, 'hero_below'::text, 'between_sections'::text, 'sidebar'::text, 'footer_above'::text]));