import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Request {
  id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  needed_date: string;
  weight_kg: number;
  volume_m3: number | null;
  cargo_type: string;
  max_price_per_kg: number | null;
  profiles: {
    company_name: string;
  };
}

export const RequestsList = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    const { data, error } = await supabase
      .from('shipment_requests')
      .select(`
        *,
        profiles!shipment_requests_user_id_fkey (company_name)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive",
      });
    } else {
      setRequests(data as any || []);
    }
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {requests.map((request) => (
        <Card key={request.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-accent" />
              {request.profiles?.company_name || 'Unknown Company'}
            </CardTitle>
            <CardDescription className="flex items-center gap-1">
              <MapPin className="w-4 h-4" />
              {request.origin_city}, {request.origin_country} → {request.destination_city}, {request.destination_country}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <span>Needed by: {new Date(request.needed_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span>{request.weight_kg}kg</span>
              {request.volume_m3 && <span>, {request.volume_m3}m³</span>}
            </div>
            <Badge variant="secondary">{request.cargo_type}</Badge>
            {request.max_price_per_kg && (
              <div className="text-lg font-semibold text-accent">
                Max: €{request.max_price_per_kg}/kg
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
