-- Add status, tax_rate, units, and parent_id to categories for hierarchy and tax management
ALTER TABLE public.categories 
ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS tax_rate numeric NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS allowed_units text[] DEFAULT ARRAY['pieces', 'units', 'kg', 'g', 'liter', 'ml']::text[];

-- Add index for category hierarchy
CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);

-- Add image_url to products (already exists but ensuring it's there)
-- Add is_active to products
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Create supplier_complaints table
CREATE TABLE IF NOT EXISTS public.supplier_complaints (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id uuid NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  subject text NOT NULL,
  description text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'closed')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on supplier_complaints
ALTER TABLE public.supplier_complaints ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for supplier_complaints
CREATE POLICY "Users can view complaints in their company" 
ON public.supplier_complaints 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Staff can manage complaints" 
ON public.supplier_complaints 
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

-- Create product_reviews table
CREATE TABLE IF NOT EXISTS public.product_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on product_reviews
ALTER TABLE public.product_reviews ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for product_reviews
CREATE POLICY "Users can view reviews in their company" 
ON public.product_reviews 
FOR SELECT 
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Staff can manage reviews" 
ON public.product_reviews 
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

-- Add location and rating columns to suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS rating numeric DEFAULT 0 CHECK (rating >= 0 AND rating <= 5);

-- Create trigger for updated_at on supplier_complaints
CREATE TRIGGER update_supplier_complaints_updated_at
BEFORE UPDATE ON public.supplier_complaints
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();