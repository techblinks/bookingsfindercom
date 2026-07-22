-- Phase 3C: Add source_page and placement columns for affiliate tracking context
-- Both are nullable to preserve backward compatibility with existing rows

ALTER TABLE public.affiliate_clicks 
  ADD COLUMN IF NOT EXISTS source_page TEXT,
  ADD COLUMN IF NOT EXISTS placement TEXT;
