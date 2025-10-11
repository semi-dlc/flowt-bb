import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, MapPin, Calendar, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Request {
  id: string;
  demand_id: string;
  route: {
    origin?: { city?: string; country_code?: string };
    destination?: { city?: string; country_code?: string };
    pickup_date_required?: { earliest?: string; latest?: string };
  };
  cargo: {
    description?: string;
    weight_kg?: number;
    volume_m3?: number;
  };
  dangerous_goods?: {
    is_dangerous?: boolean;
  };
  shipper?: {
    company_name?: string;
  };
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
      const requestsWithCompanies = requestsData.map(request => {
        const shipperData = request.shipper as any;
        return {
          ...request,
          company_name: profilesData?.find(p => p.id === request.user_id)?.company_name || 
                       shipperData?.company_name || 
                       'Unknown Company'
        };
      });

      setRequests(requestsWithCompanies as any);
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
        <Card key={request.id} className="saas-card border-l-4 border-l-accent">
          <CardHeader className="pb-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Package className="w-5 h-5 text-accent" strokeWidth={2} />
              </div>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate text-foreground">
                  {request.company_name}
                </CardTitle>
                <p className="text-xs text-accent mt-0.5 font-medium">
                  Shipping Request
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-medium text-foreground">
                  {request.route?.origin?.city || 'N/A'}, {request.route?.origin?.country_code || 'N/A'}
                </span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="font-medium text-foreground">
                  {request.route?.destination?.city || 'N/A'}, {request.route?.destination?.country_code || 'N/A'}
                </span>
              </div>
            </div>
            
            <div className="flex gap-4 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-accent" />
                <span className="text-foreground">
                  {request.route?.pickup_date_required?.earliest 
                    ? new Date(request.route.pickup_date_required.earliest).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                    : 'TBD'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-accent" />
                <span className="font-medium text-foreground">
                  {request.cargo?.weight_kg?.toLocaleString() || 0}kg
                </span>
                {request.cargo?.volume_m3 && (
                  <span className="text-muted-foreground">· {request.cargo.volume_m3}m³</span>
                )}
              </div>
            </div>
            
            {request.cargo?.description && (
              <span className="saas-badge bg-accent/10 text-accent">
                {request.cargo.description}
              </span>
            )}

            {request.dangerous_goods?.is_dangerous && (
              <div className="flex items-center gap-2 text-xs">
                <AlertTriangle className="w-3 h-3 text-destructive" />
                <span className="text-destructive font-medium">Dangerous Goods</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};