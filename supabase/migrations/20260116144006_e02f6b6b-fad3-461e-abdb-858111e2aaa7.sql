-- Create country landing pages table
CREATE TABLE public.country_landing_pages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK (type IN ('flights', 'hotels')),
  country_name TEXT NOT NULL,
  country_code TEXT NOT NULL,
  title TEXT NOT NULL,
  meta_description TEXT NOT NULL,
  h1_title TEXT NOT NULL,
  intro_paragraph TEXT NOT NULL,
  main_content TEXT NOT NULL,
  popular_cities JSONB DEFAULT '[]'::jsonb,
  popular_routes JSONB DEFAULT '[]'::jsonb,
  travel_tips JSONB DEFAULT '[]'::jsonb,
  faqs JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for fast lookups
CREATE INDEX idx_country_pages_slug ON public.country_landing_pages(slug);
CREATE INDEX idx_country_pages_type ON public.country_landing_pages(type);
CREATE INDEX idx_country_pages_published ON public.country_landing_pages(is_published);

-- Enable RLS
ALTER TABLE public.country_landing_pages ENABLE ROW LEVEL SECURITY;

-- Public read access for published pages
CREATE POLICY "Anyone can view published country pages"
ON public.country_landing_pages
FOR SELECT
USING (is_published = true);

-- Admin write access
CREATE POLICY "Admins can manage country pages"
ON public.country_landing_pages
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_country_landing_pages_updated_at
BEFORE UPDATE ON public.country_landing_pages
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();