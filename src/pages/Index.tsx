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
    <div className="min-h-screen bg-gradient-to-br from-background via-cyan-100 to-primary/10 relative overflow-hidden">
      {/* Premium animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-cyan-300/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-0 w-[800px] h-[800px] bg-accent/15 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-primary/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '2s' }} />
      </div>
      
      <header className="glass sticky top-0 z-50 border-b border-primary/10">
        <div className="container mx-auto px-6 py-5 flex justify-between items-center">
          <div className="flex items-center gap-6">
            <h1 className="text-3xl font-bold tracking-tight premium-text">
              FLOWT
            </h1>
            <div className="hidden md:block h-10 w-px bg-gradient-to-b from-transparent via-primary/20 to-transparent" />
            <p className="hidden md:block text-sm text-muted-foreground max-w-lg font-medium">
              Transform empty capacity into revenue.{" "}
              <span className="premium-text font-semibold">
                The intelligent freight marketplace.
              </span>
            </p>
          </div>
          {user ? (
            <Button variant="outline" onClick={handleSignOut} className="glass-hover border-primary/20 hover:border-primary/40 font-medium">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")} className="premium-gradient text-white font-semibold shadow-lg hover:shadow-xl transition-all">
              Sign In / Sign Up
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Tabs defaultValue="offers" className="w-full glass-card rounded-3xl p-8 shadow-2xl">
              <div className="flex justify-between items-center mb-8">
                <TabsList className="glass-card p-1.5">
                  <TabsTrigger value="offers" className="data-[state=active]:premium-gradient data-[state=active]:text-white font-semibold px-6 py-2.5 rounded-lg transition-all">Available Capacity</TabsTrigger>
                  <TabsTrigger value="requests" className="data-[state=active]:premium-gradient data-[state=active]:text-white font-semibold px-6 py-2.5 rounded-lg transition-all">Shipping Needs</TabsTrigger>
                </TabsList>
                {user && (
                  <div className="flex gap-3">
                    <CreateOfferDialog />
                    <CreateRequestDialog />
                  </div>
                )}
              </div>

              <TabsContent value="offers" className="space-y-6">
                <OffersList />
              </TabsContent>

              <TabsContent value="requests" className="space-y-6">
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
