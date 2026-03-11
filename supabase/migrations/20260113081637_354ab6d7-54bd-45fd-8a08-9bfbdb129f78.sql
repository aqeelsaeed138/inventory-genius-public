-- Fix the overly permissive companies INSERT policy
-- Currently: WITH CHECK (true) - allows anyone to create companies
-- Should require authentication

DROP POLICY IF EXISTS "Authenticated users can create companies" ON public.companies;
CREATE POLICY "Authenticated users can create companies" 
ON public.companies 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);