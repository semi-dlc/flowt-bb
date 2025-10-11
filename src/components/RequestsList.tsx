import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
    <div className="grid gap-4 md:grid-cols-2">
      {requests.map((request) => (
        <Card key={request.id} className="saas-card">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate text-foreground">
                  {request.company_name}
                </CardTitle>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Shipping Request
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">{request.origin_city}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="font-medium text-foreground">{request.destination_city}</span>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-muted-foreground" />
                <span className="text-foreground">{new Date(request.needed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-muted-foreground" />
                <span className="font-medium text-foreground">{request.weight_kg.toLocaleString()}kg</span>
                {request.volume_m3 && <span className="text-muted-foreground">· {request.volume_m3}m³</span>}
              </div>
            </div>
            
            <span className="saas-badge bg-muted text-muted-foreground">{request.cargo_type}</span>
            
            {request.max_price_per_kg && (
              <div className="pt-3 border-t border-border">
                <div className="text-xs text-muted-foreground mb-1">Max Budget</div>
                <div className="text-2xl font-semibold text-foreground">
                  €{request.max_price_per_kg.toFixed(2)}<span className="text-sm text-muted-foreground">/kg</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
