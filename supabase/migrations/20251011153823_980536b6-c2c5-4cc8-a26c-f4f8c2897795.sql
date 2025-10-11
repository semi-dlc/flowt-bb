-- Fix security definer view issue
-- Drop and recreate the view with SECURITY INVOKER to enforce RLS on the querying user

DROP VIEW IF EXISTS public.profiles_public;

CREATE VIEW public.profiles_public 
WITH (security_invoker = true) AS
SELECT 
  id,
  company_name,
  company_type,
  created_at
FROM public.profiles;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.profiles_public TO authenticated;

-- Add comment for documentation
COMMENT ON VIEW public.profiles_public IS 'Public view of profiles exposing only company information, not PII like email/phone/contact_person. Uses security_invoker to enforce RLS on querying user.';