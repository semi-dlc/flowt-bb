-- Create enum for shipment status
CREATE TYPE shipment_status AS ENUM ('active', 'matched', 'in_transit', 'completed', 'cancelled');

-- Create enum for cargo type
CREATE TYPE cargo_type AS ENUM ('pallets', 'containers', 'bulk', 'refrigerated', 'hazardous', 'other');

-- Create profiles table for company information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  company_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shipment_offers table (available capacity)
CREATE TABLE public.shipment_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  departure_date DATE NOT NULL,
  arrival_date DATE,
  available_weight_kg NUMERIC NOT NULL,
  available_volume_m3 NUMERIC,
  cargo_types cargo_type[] NOT NULL,
  price_per_kg NUMERIC,
  vehicle_type TEXT,
  notes TEXT,
  status shipment_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create shipment_requests table (shipping needs)
CREATE TABLE public.shipment_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL,
  destination_city TEXT NOT NULL,
  destination_country TEXT NOT NULL,
  needed_date DATE NOT NULL,
  weight_kg NUMERIC NOT NULL,
  volume_m3 NUMERIC,
  cargo_type cargo_type NOT NULL,
  max_price_per_kg NUMERIC,
  special_requirements TEXT,
  status shipment_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create bookings table (matched shipments)
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID NOT NULL REFERENCES public.shipment_offers(id) ON DELETE CASCADE,
  request_id UUID NOT NULL REFERENCES public.shipment_requests(id) ON DELETE CASCADE,
  carrier_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shipper_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agreed_price NUMERIC NOT NULL,
  weight_kg NUMERIC NOT NULL,
  status shipment_status NOT NULL DEFAULT 'matched',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipment_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Shipment offers policies
CREATE POLICY "Anyone can view active offers"
  ON public.shipment_offers FOR SELECT
  TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create own offers"
  ON public.shipment_offers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own offers"
  ON public.shipment_offers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own offers"
  ON public.shipment_offers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Shipment requests policies
CREATE POLICY "Anyone can view active requests"
  ON public.shipment_requests FOR SELECT
  TO authenticated
  USING (status = 'active' OR user_id = auth.uid());

CREATE POLICY "Users can create own requests"
  ON public.shipment_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own requests"
  ON public.shipment_requests FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own requests"
  ON public.shipment_requests FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Bookings policies
CREATE POLICY "Users can view their bookings"
  ON public.bookings FOR SELECT
  TO authenticated
  USING (carrier_id = auth.uid() OR shipper_id = auth.uid());

CREATE POLICY "Users can create bookings for their offers/requests"
  ON public.bookings FOR INSERT
  TO authenticated
  WITH CHECK (carrier_id = auth.uid() OR shipper_id = auth.uid());

CREATE POLICY "Users can update their bookings"
  ON public.bookings FOR UPDATE
  TO authenticated
  USING (carrier_id = auth.uid() OR shipper_id = auth.uid());

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipment_offers_updated_at BEFORE UPDATE ON public.shipment_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_shipment_requests_updated_at BEFORE UPDATE ON public.shipment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for better query performance
CREATE INDEX idx_offers_origin ON public.shipment_offers(origin_city, origin_country);
CREATE INDEX idx_offers_destination ON public.shipment_offers(destination_city, destination_country);
CREATE INDEX idx_offers_date ON public.shipment_offers(departure_date);
CREATE INDEX idx_offers_status ON public.shipment_offers(status);

CREATE INDEX idx_requests_origin ON public.shipment_requests(origin_city, origin_country);
CREATE INDEX idx_requests_destination ON public.shipment_requests(destination_city, destination_country);
CREATE INDEX idx_requests_date ON public.shipment_requests(needed_date);
CREATE INDEX idx_requests_status ON public.shipment_requests(status);