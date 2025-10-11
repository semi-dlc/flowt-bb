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
        <Card key={offer.id} className="glass-card glass-hover rounded-2xl border-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border-2 border-primary/20">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${offer.company_name}&backgroundColor=4f46e5,7c3aed,db2777`} />
                <AvatarFallback className="bg-gradient-to-br from-primary to-purple-600 text-primary-foreground">
                  {offer.company_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate">
                  {offer.company_name}
                </CardTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-xs">
                    <Truck className="w-3 h-3 mr-1" />
                    {offer.vehicle_type || 'Truck'}
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{offer.origin_city}</span>, {offer.origin_country} → <span className="font-medium text-foreground">{offer.destination_city}</span>, {offer.destination_country}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>{new Date(offer.departure_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-foreground">{offer.available_weight_kg.toLocaleString()}kg</span>
              {offer.available_volume_m3 && <span>, {offer.available_volume_m3}m³</span>}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {offer.cargo_types.slice(0, 3).map((type) => (
                <Badge key={type} variant="secondary" className="glass-card text-xs">{type}</Badge>
              ))}
            </div>
            {offer.price_per_kg && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  €{offer.price_per_kg.toFixed(2)}/kg
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
