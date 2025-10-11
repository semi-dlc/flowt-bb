-- Allow public read access to active shipment offers and requests
-- This enables anyone to browse available capacity without logging in

-- Update RLS policy for shipment_offers to allow public read of active offers
DROP POLICY IF EXISTS "Anyone can view active offers" ON public.shipment_offers;

CREATE POLICY "Public can view active offers"
  ON public.shipment_offers
  FOR SELECT
  USING (status = 'active' OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- Update RLS policy for shipment_requests to allow public read of active requests  
DROP POLICY IF EXISTS "Anyone can view active requests" ON public.shipment_requests;

CREATE POLICY "Public can view active requests"
  ON public.shipment_requests
  FOR SELECT
  USING (status = 'active' OR (auth.uid() IS NOT NULL AND user_id = auth.uid()));

-- Allow public access to the profiles_public view
-- (authenticated users already have access, this adds anon access)
GRANT SELECT ON public.profiles_public TO anon;