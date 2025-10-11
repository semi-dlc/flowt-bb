-- Update shipment_requests table to match demand.json structure
ALTER TABLE public.shipment_requests
  -- Drop old simple columns
  DROP COLUMN IF EXISTS origin_city,
  DROP COLUMN IF EXISTS origin_country,
  DROP COLUMN IF EXISTS destination_city,
  DROP COLUMN IF EXISTS destination_country,
  DROP COLUMN IF EXISTS needed_date,
  DROP COLUMN IF EXISTS weight_kg,
  DROP COLUMN IF EXISTS volume_m3,
  DROP COLUMN IF EXISTS cargo_type,
  DROP COLUMN IF EXISTS max_price_per_kg,
  DROP COLUMN IF EXISTS special_requirements,
  
  -- Add new structured columns
  ADD COLUMN demand_id TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN shipper JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN route JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN cargo JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN dangerous_goods JSONB DEFAULT '{"is_dangerous": false}'::jsonb,
  ADD COLUMN customs_trade JSONB DEFAULT '{"requires_customs_clearance": false}'::jsonb,
  ADD COLUMN special_requirements JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN human_verified BOOLEAN DEFAULT false,
  ADD COLUMN verification_notes TEXT;

-- Update shipment_offers table to match offer.json structure
ALTER TABLE public.shipment_offers
  -- Drop old simple columns
  DROP COLUMN IF EXISTS origin_city,
  DROP COLUMN IF EXISTS origin_country,
  DROP COLUMN IF EXISTS destination_city,
  DROP COLUMN IF EXISTS destination_country,
  DROP COLUMN IF EXISTS departure_date,
  DROP COLUMN IF EXISTS arrival_date,
  DROP COLUMN IF EXISTS available_weight_kg,
  DROP COLUMN IF EXISTS available_volume_m3,
  DROP COLUMN IF EXISTS cargo_types,
  DROP COLUMN IF EXISTS price_per_kg,
  DROP COLUMN IF EXISTS vehicle_type,
  DROP COLUMN IF EXISTS notes,
  
  -- Add new structured columns
  ADD COLUMN offer_id TEXT UNIQUE DEFAULT gen_random_uuid()::text,
  ADD COLUMN carrier JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN route JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN capacity JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN vehicle JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN accepted_cargo_types JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN customs_capabilities JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN pricing JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Create indexes for JSONB fields for better query performance
CREATE INDEX idx_requests_route ON public.shipment_requests USING GIN (route);
CREATE INDEX idx_requests_cargo ON public.shipment_requests USING GIN (cargo);
CREATE INDEX idx_offers_route ON public.shipment_offers USING GIN (route);
CREATE INDEX idx_offers_capacity ON public.shipment_offers USING GIN (capacity);

-- Add comments for documentation
COMMENT ON COLUMN shipment_requests.route IS 'Contains origin, destination with coordinates, pickup/delivery dates';
COMMENT ON COLUMN shipment_requests.cargo IS 'Contains description, weight, volume, dimensions, items array, declared value';
COMMENT ON COLUMN shipment_requests.dangerous_goods IS 'Contains UN number, class, packing group if dangerous';
COMMENT ON COLUMN shipment_offers.route IS 'Contains origin, destination with coordinates, pickup/delivery date ranges';
COMMENT ON COLUMN shipment_offers.capacity IS 'Contains available weight, volume, max dimensions';
COMMENT ON COLUMN shipment_offers.vehicle IS 'Contains type, fuel_type, equipment, certifications';