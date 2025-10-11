import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const useIsDeveloper = () => {
  const [isDeveloper, setIsDeveloper] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkDeveloperStatus = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setIsDeveloper(false);
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .eq('role', 'developer')
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
          console.error('Error checking developer status:', error);
        }

        setIsDeveloper(!!data);
      } catch (error) {
        console.error('Error in checkDeveloperStatus:', error);
        setIsDeveloper(false);
      } finally {
        setLoading(false);
      }
    };

    checkDeveloperStatus();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkDeveloperStatus();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return { isDeveloper, loading };
};
