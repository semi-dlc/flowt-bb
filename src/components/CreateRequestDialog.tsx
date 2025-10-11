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
const requestSchema = z.object({
  origin_city: z.string().trim().min(2, "City name too short"),
  origin_country: z.string().trim().min(2, "Country too short"),
  destination_city: z.string().trim().min(2, "City name too short"),
  destination_country: z.string().trim().min(2, "Country too short"),
  pickup_date: z.string().refine(d => !isNaN(Date.parse(d)), "Invalid date"),
  weight_kg: z.number().positive("Weight must be positive"),
  volume_m3: z.number().positive("Volume must be positive").optional(),
  cargo_description: z.string().min(1, "Description required"),
  is_dangerous: z.boolean(),
});

export const CreateRequestDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const validation = requestSchema.safeParse({
      origin_city: formData.get("origin_city"),
      origin_country: formData.get("origin_country"),
      destination_city: formData.get("destination_city"),
      destination_country: formData.get("destination_country"),
      pickup_date: formData.get("pickup_date"),
      weight_kg: Number(formData.get("weight_kg")),
      volume_m3: formData.get("volume_m3") ? Number(formData.get("volume_m3")) : undefined,
      cargo_description: formData.get("cargo_description"),
      is_dangerous: formData.get("is_dangerous") === "on",
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
        description: "You must be logged in to create a request",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error } = await supabase.from('shipment_requests').insert({
      user_id: user.id,
      route: {
        origin: {
          city: validation.data.origin_city,
          country_code: validation.data.origin_country
        },
        destination: {
          city: validation.data.destination_city,
          country_code: validation.data.destination_country
        },
        pickup_date_required: {
          earliest: validation.data.pickup_date
        }
      },
      cargo: {
        description: validation.data.cargo_description,
        weight_kg: validation.data.weight_kg,
        volume_m3: validation.data.volume_m3
      },
      dangerous_goods: {
        is_dangerous: validation.data.is_dangerous
      },
      shipper: {},
      special_requirements: {}
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
        description: "Request created successfully",
      });
      setOpen(false);
      window.location.reload();
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          Request Shipping
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Request Shipping Capacity</DialogTitle>
          <DialogDescription>
            Post your shipping needs to find available transport
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin_city">Origin City</Label>
              <Input id="origin_city" name="origin_city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="origin_country">Origin Country Code</Label>
              <Input id="origin_country" name="origin_country" placeholder="DE" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_city">Destination City</Label>
              <Input id="destination_city" name="destination_city" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination_country">Destination Country Code</Label>
              <Input id="destination_country" name="destination_country" placeholder="FR" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pickup_date">Pickup Date</Label>
              <Input id="pickup_date" name="pickup_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_kg">Weight (kg)</Label>
              <Input id="weight_kg" name="weight_kg" type="number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume_m3">Volume (m³)</Label>
              <Input id="volume_m3" name="volume_m3" type="number" step="0.1" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo_description">Cargo Description</Label>
            <Input id="cargo_description" name="cargo_description" placeholder="Pallets, containers, etc." required />
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox id="is_dangerous" name="is_dangerous" />
            <Label htmlFor="is_dangerous" className="text-sm font-normal">
              Dangerous Goods
            </Label>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};