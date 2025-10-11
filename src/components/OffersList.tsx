import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Offer {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  departure_date: string;
  available_weight_kg: number;
  available_volume_m3: number | null;
  cargo_types: string[];
  price_per_kg: number | null;
  vehicle_type: string | null;
  profiles: {
    company_name: string;
  };
}

export const OffersList = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    const { data, error } = await supabase
      .from('shipment_offers')
      .select(`
        *,
        profiles!shipment_offers_user_id_fkey (company_name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load offers",
        variant: "destructive",
      });
    } else {
      setOffers(data as any || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer) => (
        <Card key={offer.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Truck className="w-5 h-5 text-primary" />
              {offer.profiles?.company_name || 'Unknown Company'}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {offer.origin_city}, {offer.origin_country} → {offer.destination_city}, {offer.destination_country}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Departure: {new Date(offer.departure_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>{offer.available_weight_kg}kg available</span>
              {offer.available_volume_m3 && <span>, {offer.available_volume_m3}m³</span>}
            </div>
            <div className="flex flex-wrap gap-2">
              {offer.cargo_types.map((type) => (
                <Badge key={type} variant="secondary">{type}</Badge>
              ))}
            </div>
            {offer.price_per_kg && (
              <div className="text-lg font-semibold text-primary">
                €{offer.price_per_kg}/kg
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
