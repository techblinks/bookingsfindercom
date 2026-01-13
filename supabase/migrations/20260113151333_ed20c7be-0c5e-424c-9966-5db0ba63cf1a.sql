-- Add RLS policies for admins to manage ad_placements
CREATE POLICY "Admins can insert ads"
ON public.ad_placements
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update ads"
ON public.ad_placements
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete ads"
ON public.ad_placements
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));