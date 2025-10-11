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
        <Card key={request.id} className="glass-card glass-hover overflow-hidden border-accent/20 shadow-xl rounded-2xl">
          <CardHeader className="pb-5 bg-gradient-to-br from-accent/8 to-orange-500/5">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16 border-3 border-accent/20 shadow-xl">
                <AvatarImage src={`https://api.dicebear.com/7.x/initials/svg?seed=${request.company_name}&backgroundColor=f97316,ea580c,c2410c`} />
                <AvatarFallback className="bg-gradient-to-br from-accent to-orange-600 text-white font-bold text-xl">
                  {request.company_name?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <CardTitle className="text-xl font-bold truncate text-foreground mb-2">
                  {request.company_name}
                </CardTitle>
                <Badge className="bg-gradient-to-r from-accent to-orange-600 text-white text-xs font-semibold border-0 shadow-md">
                  <AlertCircle className="w-3.5 h-3.5 mr-1.5" />
                  Urgent Need
                </Badge>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5 pt-6 px-6 pb-6">
            <div className="flex items-start gap-4 text-sm">
              <MapPin className="w-5 h-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="leading-relaxed flex-1">
                <div className="font-bold text-foreground text-base">{request.origin_city}, {request.origin_country}</div>
                <div className="text-muted-foreground text-sm my-2 font-medium">→</div>
                <div className="font-bold text-foreground text-base">{request.destination_city}, {request.destination_country}</div>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <Calendar className="w-5 h-5 flex-shrink-0 text-accent" />
                <span className="text-sm font-semibold">By {new Date(request.needed_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
              </div>
              <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-muted/50">
                <Package className="w-5 h-5 flex-shrink-0 text-accent" />
                <span className="font-bold text-foreground text-sm">{request.weight_kg.toLocaleString()}kg</span>
                {request.volume_m3 && <span className="text-muted-foreground text-xs">· {request.volume_m3}m³</span>}
              </div>
            </div>
            
            <Badge variant="outline" className="text-xs font-semibold border-accent/40 bg-accent/5">{request.cargo_type}</Badge>
            
            {request.max_price_per_kg && (
              <div className="pt-4 border-t border-border/50">
                <div className="text-xs text-muted-foreground mb-2 uppercase tracking-wide font-semibold">Max Budget</div>
                <div className="text-3xl font-black premium-text">
                  €{request.max_price_per_kg.toFixed(2)}<span className="text-base">/kg</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
