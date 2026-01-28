-- Add scheduled_publish_at column to country_landing_pages
ALTER TABLE public.country_landing_pages
ADD COLUMN scheduled_publish_at timestamp with time zone DEFAULT NULL;

-- Create index for efficient scheduling queries
CREATE INDEX idx_country_landing_pages_scheduled_publish 
ON public.country_landing_pages (scheduled_publish_at) 
WHERE scheduled_publish_at IS NOT NULL AND is_published = false;