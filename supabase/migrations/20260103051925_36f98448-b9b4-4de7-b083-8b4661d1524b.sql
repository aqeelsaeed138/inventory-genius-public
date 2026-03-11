-- Drop the existing problematic SELECT policy on companies
DROP POLICY IF EXISTS "Users can view their company" ON public.companies;

-- Create a simpler SELECT policy that allows viewing companies user has roles in
CREATE POLICY "Users can view their companies" 
ON public.companies 
FOR SELECT 
TO authenticated
USING (
  public.has_role(auth.uid(), 'super_admin'::app_role) OR
  id IN (
    SELECT company_id FROM public.user_roles WHERE user_id = auth.uid()
  )
);

-- Drop the existing SELECT policy on user_roles if it causes issues
DROP POLICY IF EXISTS "Users can view roles in their company" ON public.user_roles;

-- Add a simpler SELECT policy for user_roles to allow users to view their own roles
CREATE POLICY "Users can view their own roles" 
ON public.user_roles 
FOR SELECT 
TO authenticated
USING (user_id = auth.uid());