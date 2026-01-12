-- Create a table to track affiliate clicks and searches
CREATE TABLE public.affiliate_clicks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('flight', 'hotel')),
  action TEXT NOT NULL CHECK (action IN ('search', 'click')),
  origin TEXT,
  destination TEXT,
  departure_date DATE,
  return_date DATE,
  airline_code TEXT,
  flight_number TEXT,
  hotel_id TEXT,
  price NUMERIC,
  currency TEXT DEFAULT 'USD',
  redirect_url TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (allow anonymous inserts for tracking)
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;

-- Policy: Allow anyone to insert (anonymous tracking)
CREATE POLICY "Allow anonymous inserts" 
ON public.affiliate_clicks 
FOR INSERT 
WITH CHECK (true);

-- Policy: No one can read/update/delete (admin only via service role)
CREATE POLICY "Deny public reads" 
ON public.affiliate_clicks 
FOR SELECT 
USING (false);

-- Add index for analytics queries
CREATE INDEX idx_affiliate_clicks_type_action ON public.affiliate_clicks(type, action);
CREATE INDEX idx_affiliate_clicks_created_at ON public.affiliate_clicks(created_at DESC);