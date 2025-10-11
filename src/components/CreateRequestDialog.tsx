import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const CreateRequestDialog = () => {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from('shipment_requests').insert({
      user_id: user.id,
      origin_city: formData.get('origin_city') as string,
      origin_country: formData.get('origin_country') as string,
      destination_city: formData.get('destination_city') as string,
      destination_country: formData.get('destination_country') as string,
      needed_date: formData.get('needed_date') as string,
      weight_kg: Number(formData.get('weight_kg')),
      volume_m3: Number(formData.get('volume_m3')) || null,
      cargo_type: formData.get('cargo_type') as string,
      max_price_per_kg: Number(formData.get('max_price_per_kg')) || null,
      special_requirements: formData.get('special_requirements') as string || null,
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
              <Label htmlFor="needed_date">Needed By Date</Label>
              <Input id="needed_date" name="needed_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="weight_kg">Weight (kg)</Label>
              <Input id="weight_kg" name="weight_kg" type="number" required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="volume_m3">Volume (m³)</Label>
              <Input id="volume_m3" name="volume_m3" type="number" step="0.1" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="max_price_per_kg">Max Price per kg (€)</Label>
              <Input id="max_price_per_kg" name="max_price_per_kg" type="number" step="0.01" />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="cargo_type">Cargo Type</Label>
            <Input id="cargo_type" name="cargo_type" placeholder="pallets" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="special_requirements">Special Requirements</Label>
            <Input id="special_requirements" name="special_requirements" placeholder="Temperature controlled, etc." />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Creating..." : "Create Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
