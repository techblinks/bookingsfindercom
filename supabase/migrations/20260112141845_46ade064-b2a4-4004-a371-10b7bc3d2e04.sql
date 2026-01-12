-- Create the update function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for saved flight searches with price alerts
CREATE TABLE public.saved_searches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  departure_date DATE NOT NULL,
  return_date DATE,
  passengers INTEGER NOT NULL DEFAULT 1,
  cabin_class TEXT NOT NULL DEFAULT 'economy',
  target_price NUMERIC,
  current_lowest_price NUMERIC,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for price history tracking
CREATE TABLE public.price_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  saved_search_id UUID NOT NULL REFERENCES public.saved_searches(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  recorded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.price_history ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts for saved searches
CREATE POLICY "Allow anonymous inserts for saved_searches" 
ON public.saved_searches 
FOR INSERT 
WITH CHECK (true);

-- Allow reading searches
CREATE POLICY "Allow anonymous reads for saved_searches" 
ON public.saved_searches 
FOR SELECT 
USING (true);

-- Allow updates
CREATE POLICY "Allow anonymous updates for saved_searches" 
ON public.saved_searches 
FOR UPDATE 
USING (true);

-- Allow deletes
CREATE POLICY "Allow anonymous deletes for saved_searches" 
ON public.saved_searches 
FOR DELETE 
USING (true);

-- Price history policies
CREATE POLICY "Allow anonymous inserts for price_history" 
ON public.price_history 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Allow anonymous reads for price_history" 
ON public.price_history 
FOR SELECT 
USING (true);

-- Create indexes
CREATE INDEX idx_saved_searches_email ON public.saved_searches(email);
CREATE INDEX idx_saved_searches_active ON public.saved_searches(is_active);
CREATE INDEX idx_price_history_search ON public.price_history(saved_search_id);

-- Create trigger for updated_at
CREATE TRIGGER update_saved_searches_updated_at
BEFORE UPDATE ON public.saved_searches
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();