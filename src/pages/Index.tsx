import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LogOut, Plus } from "lucide-react";
import { AIChat } from "@/components/AIChat";
import { OffersList } from "@/components/OffersList";
import { RequestsList } from "@/components/RequestsList";
import { CreateOfferDialog } from "@/components/CreateOfferDialog";
import { CreateRequestDialog } from "@/components/CreateRequestDialog";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-purple-500/5 to-pink-500/10 relative overflow-hidden">
      {/* Animated background orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-pink-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <header className="glass sticky top-0 z-50 shadow-lg">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-pink-500 bg-clip-text text-transparent">
              FLOWT
            </h1>
            <div className="hidden md:block h-8 w-px bg-gradient-to-b from-transparent via-primary/30 to-transparent" />
            <p className="hidden md:block text-xs text-muted-foreground/80 max-w-md leading-relaxed">
              <span className="bg-gradient-to-r from-primary/80 via-purple-500/80 to-pink-500/80 bg-clip-text text-transparent font-medium">
                FLOWT transforms empty truck space into opportunity
              </span>
              , driving collaboration and sustainability across industrial logistics
            </p>
          </div>
          {user ? (
            <Button variant="outline" onClick={handleSignOut} className="glass-card glass-hover">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")} className="glass-card glass-hover">
              Sign In / Sign Up
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 relative z-10">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Tabs defaultValue="offers" className="w-full glass-card rounded-2xl p-6">
              <div className="flex justify-between items-center mb-4">
                <TabsList className="glass-card">
                  <TabsTrigger value="offers" className="data-[state=active]:glass">Available Capacity</TabsTrigger>
                  <TabsTrigger value="requests" className="data-[state=active]:glass">Shipping Needs</TabsTrigger>
                </TabsList>
                {user && (
                  <div className="flex gap-2">
                    <CreateOfferDialog />
                    <CreateRequestDialog />
                  </div>
                )}
              </div>

              <TabsContent value="offers" className="space-y-4">
                <OffersList />
              </TabsContent>

              <TabsContent value="requests" className="space-y-4">
                <RequestsList />
              </TabsContent>
            </Tabs>
          </div>

          <div className="lg:col-span-1">
            <AIChat />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
