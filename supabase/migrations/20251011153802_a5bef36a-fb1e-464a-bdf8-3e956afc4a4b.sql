-- Security Fix: Restrict PII exposure in profiles table

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a restricted policy: users can only view their own complete profile
CREATE POLICY "Users can view own complete profile"
  ON public.profiles 
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- Create a public view with only safe, non-PII information
CREATE VIEW public.profiles_public AS
SELECT 
  id,
  company_name,
  company_type,
  created_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.profiles_public IS 'Public view of profiles exposing only company information, not PII like email/phone/contact_person';