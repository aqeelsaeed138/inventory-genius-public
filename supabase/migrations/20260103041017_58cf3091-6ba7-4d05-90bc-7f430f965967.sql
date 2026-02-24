-- Drop existing insert policy for companies
DROP POLICY IF EXISTS "Super admins can insert companies" ON public.companies;

-- Allow authenticated users to create companies during signup
CREATE POLICY "Authenticated users can insert companies" ON public.companies
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Allow users to insert their own role when creating a company
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;

CREATE POLICY "Users can insert their own role" ON public.user_roles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update and delete roles" ON public.user_roles
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.user_has_company_access(auth.uid(), company_id) AND 
     EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = user_roles.company_id AND ur.role = 'admin'))
  );

CREATE POLICY "Admins can delete roles" ON public.user_roles
  FOR DELETE USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.user_has_company_access(auth.uid(), company_id) AND 
     EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.company_id = user_roles.company_id AND ur.role = 'admin'))
  );