import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

// Validation schema
const offerSchema = z.object({
  origin_city: z.string().trim().min(2, "City name too short").max(100, "City name too long")
    .regex(/^[a-zA-Z\s\-]+$/, "Invalid city name"),
  origin_country: z.string().trim().min(2, "Country name too short").max(100, "Country name too long")
    .regex(/^[a-zA-Z\s\-]+$/, "Invalid country name"),
  destination_city: z.string().trim().min(2, "City name too short").max(100, "City name too long")
    .regex(/^[a-zA-Z\s\-]+$/, "Invalid city name"),
  destination_country: z.string().trim().min(2, "Country name too short").max(100, "Country name too long")
    .regex(/^[a-zA-Z\s\-]+$/, "Invalid country name"),
  departure_date: z.string().refine(d => !isNaN(Date.parse(d)), "Invalid date"),
  available_weight_kg: z.number().positive("Weight must be positive").max(100000, "Weight too large"),
  available_volume_m3: z.number().positive("Volume must be positive").max(1000, "Volume too large").optional(),
  price_per_kg: z.number().positive("Price must be positive").max(10000, "Price too large").optional(),
  vehicle_type: z.string().trim().max(50, "Vehicle type too long").optional(),
  cargo_types: z.array(z.string()).min(1, "Select at least one cargo type").max(10, "Too many cargo types")
});

export const CreateOfferDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const cargoTypes = formData.get('cargo_types')?.toString().split(',').map(t => t.trim()).filter(Boolean) || [];

    // Validate input
    const validation = offerSchema.safeParse({
      origin_city: formData.get("origin_city"),
      origin_country: formData.get("origin_country"),
      destination_city: formData.get("destination_city"),
      destination_country: formData.get("destination_country"),
      departure_date: formData.get("departure_date"),
      available_weight_kg: Number(formData.get("available_weight_kg")),
      available_volume_m3: formData.get("available_volume_m3") ? Number(formData.get("available_volume_m3")) : undefined,
      price_per_kg: formData.get("price_per_kg") ? Number(formData.get("price_per_kg")) : undefined,
      vehicle_type: formData.get("vehicle_type") || undefined,
      cargo_types: cargoTypes
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
      origin_city: validation.data.origin_city,
      origin_country: validation.data.origin_country,
      destination_city: validation.data.destination_city,
      destination_country: validation.data.destination_country,
      departure_date: validation.data.departure_date,
      available_weight_kg: validation.data.available_weight_kg,
      available_volume_m3: validation.data.available_volume_m3 || null,
      cargo_types: validation.data.cargo_types,
      price_per_kg: validation.data.price_per_kg || null,
      vehicle_type: validation.data.vehicle_type || null,
    } as any);

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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin_city">Origin City</Label>
              <Input id="origin_city" name="origin_city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin_country">Origin Country</Label>
              <Input id="origin_country" name="origin_country" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_city">Destination City</Label>
              <Input id="destination_city" name="destination_city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_country">Destination Country</Label>
              <Input id="destination_country" name="destination_country" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="departure_date">Departure Date</Label>
              <Input id="departure_date" name="departure_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available_weight_kg">Available Weight (kg)</Label>
              <Input id="available_weight_kg" name="available_weight_kg" type="number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="available_volume_m3">Available Volume (m³)</Label>
              <Input id="available_volume_m3" name="available_volume_m3" type="number" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="price_per_kg">Price per kg (€)</Label>
              <Input id="price_per_kg" name="price_per_kg" type="number" step="0.01" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo_types">Cargo Types (comma separated)</Label>
            <Input id="cargo_types" name="cargo_types" placeholder="pallets, containers" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="vehicle_type">Vehicle Type</Label>
            <Input id="vehicle_type" name="vehicle_type" placeholder="Truck, Van, etc." />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Offer"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};