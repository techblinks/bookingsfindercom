
CREATE TABLE public.seo_route_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  origin_city text NOT NULL,
  destination_city text NOT NULL,
  origin_iata text NOT NULL,
  destination_iata text NOT NULL,
  title text NOT NULL,
  meta_description text NOT NULL,
  h1_title text NOT NULL,
  intro_paragraph text NOT NULL,
  main_content text NOT NULL,
  travel_tips jsonb DEFAULT '[]'::jsonb,
  faqs jsonb DEFAULT '[]'::jsonb,
  related_routes jsonb DEFAULT '[]'::jsonb,
  is_published boolean NOT NULL DEFAULT false,
  generation_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seo_route_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published route pages"
  ON public.seo_route_pages FOR SELECT
  USING (is_published = true);

CREATE POLICY "Admins can manage route pages"
  ON public.seo_route_pages FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_seo_route_pages_updated_at
  BEFORE UPDATE ON public.seo_route_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.seo_route_pages;
