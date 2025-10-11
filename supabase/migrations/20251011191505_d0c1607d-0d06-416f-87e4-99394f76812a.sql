-- Update shipment_requests table to match demand.json structure
-- Drop old simple columns if they exist
DO $$ 
BEGIN
  -- Drop old columns from shipment_requests
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS origin_city;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS origin_country;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS destination_city;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS destination_country;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS needed_date;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS weight_kg;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS volume_m3;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS cargo_type;
  ALTER TABLE public.shipment_requests DROP COLUMN IF EXISTS max_price_per_kg;
  
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='demand_id') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN demand_id TEXT UNIQUE DEFAULT gen_random_uuid()::text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='shipper') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN shipper JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='route') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN route JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='cargo') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN cargo JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='dangerous_goods') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN dangerous_goods JSONB DEFAULT '{"is_dangerous": false}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='customs_trade') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN customs_trade JSONB DEFAULT '{"requires_customs_clearance": false}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='special_requirements') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN special_requirements JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='human_verified') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN human_verified BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_requests' AND column_name='verification_notes') THEN
    ALTER TABLE public.shipment_requests ADD COLUMN verification_notes TEXT;
  END IF;
END $$;

-- Update shipment_offers table to match offer.json structure
DO $$ 
BEGIN
  -- Drop old columns from shipment_offers
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS origin_city;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS origin_country;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS destination_city;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS destination_country;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS departure_date;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS arrival_date;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS available_weight_kg;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS available_volume_m3;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS cargo_types;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS price_per_kg;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS vehicle_type;
  ALTER TABLE public.shipment_offers DROP COLUMN IF EXISTS notes;
  
  -- Add new columns if they don't exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='offer_id') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN offer_id TEXT UNIQUE DEFAULT gen_random_uuid()::text;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='carrier') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN carrier JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='route') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN route JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='capacity') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN capacity JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='vehicle') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN vehicle JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='accepted_cargo_types') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN accepted_cargo_types JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='customs_capabilities') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN customs_capabilities JSONB DEFAULT '{}'::jsonb;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='shipment_offers' AND column_name='pricing') THEN
    ALTER TABLE public.shipment_offers ADD COLUMN pricing JSONB NOT NULL DEFAULT '{}'::jsonb;
  END IF;
END $$;

-- Create indexes for JSONB fields for better query performance
CREATE INDEX IF NOT EXISTS idx_requests_route ON public.shipment_requests USING GIN (route);
CREATE INDEX IF NOT EXISTS idx_requests_cargo ON public.shipment_requests USING GIN (cargo);
CREATE INDEX IF NOT EXISTS idx_offers_route ON public.shipment_offers USING GIN (route);
CREATE INDEX IF NOT EXISTS idx_offers_capacity ON public.shipment_offers USING GIN (capacity);