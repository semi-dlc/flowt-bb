import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MapPin, Calendar, Truck } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Offer {
  id: string;
  user_id: string;
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
  company_name?: string;
}

export const OffersList = () => {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchOffers();
  }, []);

  const fetchOffers = async () => {
    // Fetch shipment offers
    const { data: offersData, error: offersError } = await supabase
      .from('shipment_offers')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (offersError) {
      toast({
        title: "Error",
        description: "Failed to load offers",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch company names from profiles_public
    if (offersData && offersData.length > 0) {
      const userIds = [...new Set(offersData.map(offer => offer.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles_public')
        .select('id, company_name')
        .in('id', userIds);

      // Merge company names with offers
      const offersWithCompanies = offersData.map(offer => ({
        ...offer,
        company_name: profilesData?.find(p => p.id === offer.user_id)?.company_name || 'Unknown Company'
      }));

      setOffers(offersWithCompanies);
    } else {
      setOffers([]);
    }
    
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {offers.map((offer) => (
        <Card key={offer.id} className="saas-card">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Truck className="w-5 h-5 text-primary" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate text-foreground">
                  {offer.company_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {offer.vehicle_type || 'Truck'}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{offer.origin_city}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="font-medium text-foreground">{offer.destination_city}</span>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{new Date(offer.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{offer.available_weight_kg.toLocaleString()}kg</span>
                {offer.available_volume_m3 && <span className="text-muted-foreground">· {offer.available_volume_m3}m³</span>}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-1.5">
              {offer.cargo_types.slice(0, 3).map((type) => (
                <span key={type} className="saas-badge bg-muted text-muted-foreground">{type}</span>
              ))}
            </div>
            
            {offer.price_per_kg && (
              <div className="pt-3 border-t border-border">
                <div className="text-2xl font-semibold text-foreground">
                  €{offer.price_per_kg.toFixed(2)}<span className="text-sm text-muted-foreground">/kg</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
