import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Package, MapPin, Calendar, AlertCircle } from "lucide-react";
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
        <Card key={request.id} className="glass-card glass-hover overflow-hidden border-destructive/20">
          <CardHeader className="pb-4 bg-gradient-to-br from-destructive/5 to-orange-500/5">
            <div className="flex items-start gap-4">
              <Avatar className="h-14 w-14 border-2 border-destructive/30 shadow-md">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.company_name}&backgroundColor=f59e0b,ec4899,8b5cf6`} />
                <AvatarFallback className="bg-gradient-to-br from-destructive to-orange-600 text-destructive-foreground font-bold text-lg">
                  {request.company_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-lg font-bold truncate text-foreground mb-1">
                  {request.company_name}
                </CardTitle>
                <Badge variant="destructive" className="text-xs font-medium">
                  <AlertCircle className="w-3 h-3 mr-1.5" />
                  Urgent Need
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="flex items-start gap-3 text-sm">
              <MapPin className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed">
                <div className="font-semibold text-foreground">{request.origin_city}, {request.origin_country}</div>
                <div className="text-muted-foreground text-xs my-1">↓</div>
                <div className="font-semibold text-foreground">{request.destination_city}, {request.destination_country}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4 flex-shrink-0 text-destructive/70" />
                <span className="text-xs">By {new Date(request.needed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 flex-shrink-0 text-destructive/70" />
                <span className="font-semibold text-foreground text-xs">{request.weight_kg.toLocaleString()}kg</span>
                {request.volume_m3 && <span className="text-muted-foreground text-xs">· {request.volume_m3}m³</span>}
              </div>
            </div>
            
            <Badge variant="outline" className="text-xs font-normal border-destructive/30">{request.cargo_type}</Badge>
            
            {request.max_price_per_kg && (
              <div className="pt-3 border-t">
                <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">Max Budget</div>
                <div className="text-2xl font-black bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  €{request.max_price_per_kg.toFixed(2)}<span className="text-sm">/kg</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
