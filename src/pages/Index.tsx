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
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              FLOWT
            </h1>
            <div className="hidden md:block h-6 w-px bg-border" />
            <p className="hidden md:block text-sm text-muted-foreground max-w-lg">
              The intelligent freight marketplace for capacity optimization
            </p>
          </div>
          {user ? (
            <Button variant="ghost" onClick={handleSignOut} className="text-sm font-medium">
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          ) : (
            <Button onClick={() => navigate("/auth")} className="bg-accent hover:bg-accent/90 text-white text-sm font-medium">
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main className="container mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="offers" className="w-full">
              {user && (
                <div className="flex justify-center gap-2 mb-4">
                  <CreateOfferDialog />
                  <CreateRequestDialog />
                </div>
              )}
              <div className="flex justify-center mb-6">
                <TabsList className="bg-muted">
                  <TabsTrigger value="offers" className="text-sm font-medium data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">Available Capacity</TabsTrigger>
                  <TabsTrigger value="requests" className="text-sm font-medium data-[state=active]:bg-accent data-[state=active]:text-accent-foreground">Shipping Needs</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="offers" className="mt-0">
                <OffersList />
              </TabsContent>

              <TabsContent value="requests" className="mt-0">
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
