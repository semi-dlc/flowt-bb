import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {offers.map((offer) => (
        <Card key={offer.id} className="glass-card glass-hover overflow-hidden border-primary/20 shadow-xl rounded-2xl">
          <CardHeader className="pb-5 bg-gradient-to-br from-primary/8 to-blue-500/5">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-3 border-primary/20 shadow-xl">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${offer.company_name}&backgroundColor=3b82f6,2563eb,1d4ed8`} />
                <AvatarFallback className="premium-gradient text-white font-bold text-xl">
                  {offer.company_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl font-bold truncate text-foreground mb-2">
                  {offer.company_name}
                </CardTitle>
                <Badge className="premium-gradient text-white text-xs font-semibold border-0 shadow-md">
                  <Truck className="w-3.5 h-3.5 mr-1.5" />
                  {offer.vehicle_type || 'Truck'}
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6 px-6 pb-6">
            <div className="flex items-start gap-4 text-sm">
              <MapPin className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed flex-1">
                <div className="font-bold text-foreground text-base">{offer.origin_city}, {offer.origin_country}</div>
                <div className="text-muted-foreground text-sm my-2 font-medium">→</div>
                <div className="font-bold text-foreground text-base">{offer.destination_city}, {offer.destination_country}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 flex-shrink-0 text-primary" />
                <span className="text-sm font-semibold">{new Date(offer.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <Package className="w-5 h-5 flex-shrink-0 text-primary" />
                <span className="font-bold text-foreground text-sm">{offer.available_weight_kg.toLocaleString()}kg</span>
                {offer.available_volume_m3 && <span className="text-muted-foreground text-xs">· {offer.available_volume_m3}m³</span>}
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {offer.cargo_types.slice(0, 3).map((type) => (
                <Badge key={type} variant="outline" className="text-xs font-semibold border-primary/40 bg-primary/5">{type}</Badge>
              ))}
            </div>
            
            {offer.price_per_kg && (
              <div className="pt-4 border-t border-border/50">
                <div className="text-3xl font-black premium-text">
                  €{offer.price_per_kg.toFixed(2)}<span className="text-base">/kg</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
