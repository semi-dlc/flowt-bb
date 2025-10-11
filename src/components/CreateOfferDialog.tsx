import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const CreateOfferDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const cargoTypes = formData.get('cargo_types')?.toString().split(',') || [];

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('shipment_offers').insert({
      user_id: user.id,
      origin_city: formData.get('origin_city') as string,
      origin_country: formData.get('origin_country') as string,
      destination_city: formData.get('destination_city') as string,
      destination_country: formData.get('destination_country') as string,
      departure_date: formData.get('departure_date') as string,
      available_weight_kg: Number(formData.get('available_weight_kg')),
      available_volume_m3: Number(formData.get('available_volume_m3')) || null,
      cargo_types: cargoTypes,
      price_per_kg: Number(formData.get('price_per_kg')) || null,
      vehicle_type: formData.get('vehicle_type') as string || null,
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
