-- Fix Security Issue 1: Profiles table - require authentication
DROP POLICY IF EXISTS "Users can view profiles in their company" ON public.profiles;
CREATE POLICY "Authenticated users can view profiles in their company" 
ON public.profiles 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  company_id = public.get_user_company_id(auth.uid())
);

-- Fix Security Issue 2: Purchase orders - require authentication for SELECT
DROP POLICY IF EXISTS "Users can view purchase orders in their company" ON public.purchase_orders;
CREATE POLICY "Authenticated users can view purchase orders in their company" 
ON public.purchase_orders 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  company_id = public.get_user_company_id(auth.uid())
);

-- Fix Security Issue 3: Stock movements - make audit trail immutable
-- Drop overly permissive ALL policy for staff
DROP POLICY IF EXISTS "Staff can manage stock movements" ON public.stock_movements;

-- Create separate INSERT and SELECT policies (no UPDATE/DELETE)
CREATE POLICY "Staff can insert stock movements" 
ON public.stock_movements 
FOR INSERT 
WITH CHECK (
  auth.uid() IS NOT NULL AND 
  company_id = public.get_user_company_id(auth.uid())
);

CREATE POLICY "Staff can view stock movements" 
ON public.stock_movements 
FOR SELECT 
USING (
  auth.uid() IS NOT NULL AND 
  company_id = public.get_user_company_id(auth.uid())
);

-- Explicitly deny UPDATE on stock_movements (audit trail is immutable)
-- No UPDATE policy means updates are blocked by RLS

-- Fix Security Issue 4: Review and fix other overly permissive policies
-- Check business_type_filters - this is reference data, SELECT (true) is acceptable for public read
-- But INSERT/UPDATE/DELETE should be restricted

DROP POLICY IF EXISTS "Anyone can view business type filters" ON public.business_type_filters;
CREATE POLICY "Anyone can read business type filters" 
ON public.business_type_filters 
FOR SELECT 
USING (true);

-- Ensure no INSERT/UPDATE/DELETE without admin
DROP POLICY IF EXISTS "Admins can manage business type filters" ON public.business_type_filters;
CREATE POLICY "Only super admins can manage business type filters" 
ON public.business_type_filters 
FOR ALL 
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));