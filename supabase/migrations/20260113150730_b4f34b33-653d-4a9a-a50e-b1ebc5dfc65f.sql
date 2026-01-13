-- Create a table to cache route prices
CREATE TABLE public.route_price_cache (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin TEXT NOT NULL,
    destination TEXT NOT NULL,
    departure_date DATE NOT NULL,
    return_date DATE,
    currency TEXT NOT NULL DEFAULT 'USD',
    price NUMERIC,
    cached_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '1 hour'),
    UNIQUE (origin, destination, departure_date, return_date, currency)
);

-- Enable RLS
ALTER TABLE public.route_price_cache ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read cached prices (public data)
CREATE POLICY "Anyone can read cached prices"
ON public.route_price_cache
FOR SELECT
USING (true);

-- Allow service role to insert/update via edge functions
CREATE POLICY "Service can manage cache"
ON public.route_price_cache
FOR ALL
USING (true)
WITH CHECK (true);

-- Create an index for faster lookups
CREATE INDEX idx_route_price_cache_lookup 
ON public.route_price_cache (origin, destination, departure_date, currency, expires_at);

-- Create a function to clean up expired cache entries (can be called periodically)
CREATE OR REPLACE FUNCTION public.cleanup_expired_price_cache()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.route_price_cache WHERE expires_at < now();
$$;