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
        <Card key={request.id} className="glass-card glass-hover rounded-2xl border-accent/10">
          <CardHeader className="pb-3">
            <div className="flex items-start gap-3">
              <Avatar className="h-12 w-12 border-2 border-accent/20">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.company_name}&backgroundColor=f59e0b,ec4899,8b5cf6`} />
                <AvatarFallback className="bg-gradient-to-br from-accent to-orange-600 text-accent-foreground">
                  {request.company_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-base font-semibold truncate">
                  {request.company_name}
                </CardTitle>
                <div className="flex items-center gap-1.5 mt-1">
                  <Badge variant="outline" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Urgent Request
                  </Badge>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-2 text-sm">
              <MapPin className="w-4 h-4 text-accent mt-0.5 flex-shrink-0" />
              <span className="text-muted-foreground leading-relaxed">
                <span className="font-medium text-foreground">{request.origin_city}</span>, {request.origin_country} → <span className="font-medium text-foreground">{request.destination_city}</span>, {request.destination_country}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="w-4 h-4 flex-shrink-0" />
              <span>Needed by {new Date(request.needed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Package className="w-4 h-4 flex-shrink-0" />
              <span className="font-medium text-foreground">{request.weight_kg.toLocaleString()}kg</span>
              {request.volume_m3 && <span>, {request.volume_m3}m³</span>}
            </div>
            <Badge variant="secondary" className="glass-card text-xs">{request.cargo_type}</Badge>
            {request.max_price_per_kg && (
              <div className="pt-2 border-t border-border/50">
                <div className="text-sm text-muted-foreground">Budget</div>
                <div className="text-xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
                  €{request.max_price_per_kg.toFixed(2)}/kg
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
