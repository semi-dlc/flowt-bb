import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Checkbox } from "@/components/ui/checkbox";

// Validation schema for new JSONB structure
const offerSchema = z.object({
  origin_city: z.string().trim().min(2, "City name too short").max(100),
  origin_country: z.string().trim().length(2, "Use 2-letter country code (e.g., DE, FR)"),
  origin_postal: z.string().trim().min(3).max(20).optional(),
  destination_city: z.string().trim().min(2, "City name too short").max(100),
  destination_country: z.string().trim().length(2, "Use 2-letter country code (e.g., DE, FR)"),
  destination_postal: z.string().trim().min(3).max(20).optional(),
  departure_date: z.string().refine(d => !isNaN(Date.parse(d)), "Invalid date"),
  available_weight_kg: z.number().positive("Weight must be positive").max(100000),
  available_volume_m3: z.number().positive("Volume must be positive").max(1000).optional(),
  price_per_kg: z.number().positive("Price must be positive").max(10000).optional(),
  vehicle_type: z.string().trim().max(50).optional(),
  fuel_type: z.string().trim().max(50).optional(),
  adr_certified: z.boolean(),
  temperature_controlled: z.boolean(),
});

export const CreateOfferDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const validation = offerSchema.safeParse({
      origin_city: formData.get("origin_city"),
      origin_country: formData.get("origin_country"),
      origin_postal: formData.get("origin_postal") || undefined,
      destination_city: formData.get("destination_city"),
      destination_country: formData.get("destination_country"),
      destination_postal: formData.get("destination_postal") || undefined,
      departure_date: formData.get("departure_date"),
      available_weight_kg: Number(formData.get("available_weight_kg")),
      available_volume_m3: formData.get("available_volume_m3") ? Number(formData.get("available_volume_m3")) : undefined,
      price_per_kg: formData.get("price_per_kg") ? Number(formData.get("price_per_kg")) : undefined,
      vehicle_type: formData.get("vehicle_type") || undefined,
      fuel_type: formData.get("fuel_type") || undefined,
      adr_certified: formData.get("adr_certified") === "on",
      temperature_controlled: formData.get("temperature_controlled") === "on",
    });

    if (!validation.success) {
      toast({
        title: "Validation Error",
        description: validation.error.errors[0].message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to create an offer",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('shipment_offers').insert({
      user_id: user.id,
      route: {
        origin: {
          city: validation.data.origin_city,
          country_code: validation.data.origin_country,
          postal_code: validation.data.origin_postal || "",
          coordinates: { latitude: 0, longitude: 0 }
        },
        destination: {
          city: validation.data.destination_city,
          country_code: validation.data.destination_country,
          postal_code: validation.data.destination_postal || "",
          coordinates: { latitude: 0, longitude: 0 }
        },
        pickup_date_range: {
          earliest: validation.data.departure_date,
          latest: validation.data.departure_date
        },
        cross_border: validation.data.origin_country !== validation.data.destination_country
      },
      capacity: {
        available_weight_kg: validation.data.available_weight_kg,
        available_volume_m3: validation.data.available_volume_m3 || 0,
        max_dimensions: { length_cm: 0, width_cm: 0, height_cm: 0 }
      },
      vehicle: {
        type: validation.data.vehicle_type || "Truck",
        fuel_type: validation.data.fuel_type || "diesel",
        equipment: [],
        adr_certified: validation.data.adr_certified,
        temperature_controlled: validation.data.temperature_controlled
      },
      pricing: {
        price_per_kg: validation.data.price_per_kg || 0,
        currency: "EUR",
        pricing_model: "per_kg"
      },
      accepted_cargo_types: {
        dangerous_goods_accepted: validation.data.adr_certified
      },
      carrier: {},
      customs_capabilities: {
        customs_clearance_service: false
      }
    });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Offer created successfully",
      });
      setOpen(false);
      window.location.reload();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Offer Capacity
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Offer Available Capacity</DialogTitle>
          <DialogDescription>
            List your available transport capacity to help other businesses
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="origin_city">Origin City *</Label>
                <Input id="origin_city" name="origin_city" placeholder="Berlin" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="origin_country">Country Code *</Label>
                <Input id="origin_country" name="origin_country" placeholder="DE" maxLength={2} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin_postal">Origin Postal Code</Label>
              <Input id="origin_postal" name="origin_postal" placeholder="10115" />
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="destination_city">Destination City *</Label>
                <Input id="destination_city" name="destination_city" placeholder="Paris" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="destination_country">Country Code *</Label>
                <Input id="destination_country" name="destination_country" placeholder="FR" maxLength={2} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_postal">Destination Postal Code</Label>
              <Input id="destination_postal" name="destination_postal" placeholder="75001" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="departure_date">Departure Date *</Label>
              <Input id="departure_date" name="departure_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available_weight_kg">Available Weight (kg) *</Label>
              <Input id="available_weight_kg" name="available_weight_kg" type="number" min="1" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="available_volume_m3">Available Volume (m³)</Label>
              <Input id="available_volume_m3" name="available_volume_m3" type="number" step="0.1" min="0" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_kg">Price per kg (€)</Label>
              <Input id="price_per_kg" name="price_per_kg" type="number" step="0.01" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <div className="space-y-2">
              <Label htmlFor="vehicle_type">Vehicle Type</Label>
              <Input id="vehicle_type" name="vehicle_type" placeholder="Truck, Van, Semi" maxLength={50} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fuel_type">Fuel Type</Label>
              <Input id="fuel_type" name="fuel_type" placeholder="diesel, electric, hydrogen" maxLength={50} />
            </div>
          </div>

          <div className="space-y-3 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox id="adr_certified" name="adr_certified" />
              <Label htmlFor="adr_certified" className="text-sm font-normal">
                ADR Certified (Dangerous Goods)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox id="temperature_controlled" name="temperature_controlled" />
              <Label htmlFor="temperature_controlled" className="text-sm font-normal">
                Temperature Controlled
              </Label>
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Offer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};