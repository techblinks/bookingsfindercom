-- Drop the old constraint and add a new one with more actions
ALTER TABLE public.affiliate_clicks 
DROP CONSTRAINT affiliate_clicks_action_check;

ALTER TABLE public.affiliate_clicks 
ADD CONSTRAINT affiliate_clicks_action_check 
CHECK (action = ANY (ARRAY['search'::text, 'click'::text, 'compare'::text, 'view_deal'::text, 'view_live_prices'::text]));