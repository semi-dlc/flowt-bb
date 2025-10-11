import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Package, MapPin, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Request {
  id: string;
  user_id: string;
  origin_city: string;
  origin_country: string;
  destination_city: string;
  destination_country: string;
  needed_date: string;
  weight_kg: number;
  volume_m3: number | null;
  cargo_type: string;
  max_price_per_kg: number | null;
  company_name?: string;
}

export const RequestsList = () => {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    // Fetch shipment requests
    const { data: requestsData, error: requestsError } = await supabase
      .from('shipment_requests')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (requestsError) {
      toast({
        title: "Error",
        description: "Failed to load requests",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Fetch company names from profiles_public
    if (requestsData && requestsData.length > 0) {
      const userIds = [...new Set(requestsData.map(request => request.user_id))];
      const { data: profilesData } = await supabase
        .from('profiles_public')
        .select('id, company_name')
        .in('id', userIds);

      // Merge company names with requests
      const requestsWithCompanies = requestsData.map(request => ({
        ...request,
        company_name: profilesData?.find(p => p.id === request.user_id)?.company_name || 'Unknown Company'
      }));

      setRequests(requestsWithCompanies);
    } else {
      setRequests([]);
    }
    
    setLoading(false);
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {requests.map((request) => (
        <Card key={request.id} className="glass-card glass-hover rounded-2xl">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Package className="w-5 h-5 text-accent" />
              {request.company_name}
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
            <Badge variant="secondary" className="glass-card">{request.cargo_type}</Badge>
            {request.max_price_per_kg && (
              <div className="text-lg font-semibold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                Max: €{request.max_price_per_kg}/kg
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
