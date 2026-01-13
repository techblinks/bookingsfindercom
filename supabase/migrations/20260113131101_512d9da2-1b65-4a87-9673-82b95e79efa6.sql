-- Create ad_placements table for backend-controlled ads
CREATE TABLE public.ad_placements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('sponsored_card', 'html_embed')),
  placement TEXT NOT NULL CHECK (placement IN ('after_result_3', 'bottom', 'after_result_5')),
  page TEXT NOT NULL CHECK (page IN ('flights', 'hotels', 'both')),
  device TEXT NOT NULL DEFAULT 'all' CHECK (device IN ('mobile', 'desktop', 'all')),
  geo TEXT[] DEFAULT '{}',
  
  -- Sponsored card fields
  title TEXT,
  description TEXT,
  image_url TEXT,
  cta_text TEXT DEFAULT 'View Deal',
  destination_url TEXT,
  advertiser_name TEXT,
  
  -- HTML embed fields
  html_content TEXT,
  
  -- Control fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  priority INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ad_placements ENABLE ROW LEVEL SECURITY;

-- Public read access for active ads (needed for frontend to fetch)
CREATE POLICY "Anyone can view active ads" 
ON public.ad_placements 
FOR SELECT 
USING (is_active = true);

-- Admin update policy (for tracking impressions/clicks)
CREATE POLICY "Allow increment tracking" 
ON public.ad_placements 
FOR UPDATE 
USING (true)
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_ad_placements_active ON public.ad_placements (is_active, page, device);
CREATE INDEX idx_ad_placements_dates ON public.ad_placements (start_date, end_date);

-- Create trigger for updated_at
CREATE TRIGGER update_ad_placements_updated_at
BEFORE UPDATE ON public.ad_placements
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample sponsored card
INSERT INTO public.ad_placements (
  name, type, placement, page, device,
  title, description, image_url, cta_text, destination_url, advertiser_name,
  is_active, priority
) VALUES (
  'Sample Travel Insurance Ad',
  'sponsored_card',
  'after_result_3',
  'both',
  'all',
  'Protect Your Trip',
  'Get comprehensive travel insurance from $12/day. Cancel for any reason coverage included.',
  'https://images.unsplash.com/photo-1488085061387-422e29b40080?w=400&h=200&fit=crop',
  'Get Quote',
  'https://example.com/travel-insurance',
  'SafeTrip Insurance',
  true,
  10
);