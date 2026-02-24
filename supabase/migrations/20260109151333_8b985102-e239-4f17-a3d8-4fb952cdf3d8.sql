-- Add business type, location, currency, and custom filters to companies table
ALTER TABLE public.companies 
ADD COLUMN IF NOT EXISTS business_type text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS currency text DEFAULT 'PKR',
ADD COLUMN IF NOT EXISTS currency_symbol text DEFAULT 'Rs.',
ADD COLUMN IF NOT EXISTS custom_filters jsonb DEFAULT '[]'::jsonb;

-- Create index for faster company lookups
CREATE INDEX IF NOT EXISTS idx_companies_business_type ON public.companies(business_type);

-- Create business_filters table for predefined business type filters
CREATE TABLE IF NOT EXISTS public.business_type_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_type text NOT NULL,
  filter_name text NOT NULL,
  filter_key text NOT NULL,
  filter_type text NOT NULL DEFAULT 'select',
  options jsonb DEFAULT '[]'::jsonb,
  is_default boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Insert predefined filters for different business types
INSERT INTO public.business_type_filters (business_type, filter_name, filter_key, filter_type, options, is_default) VALUES
-- Clothing business filters
('clothing', 'Size', 'size', 'select', '["XS", "S", "M", "L", "XL", "XXL", "XXXL"]', false),
('clothing', 'Color', 'color', 'select', '["Red", "Blue", "Green", "Black", "White", "Yellow", "Pink", "Purple", "Orange", "Brown", "Gray"]', false),
('clothing', 'Gender', 'gender', 'select', '["Men", "Women", "Unisex", "Kids"]', false),
('clothing', 'Fabric', 'fabric', 'select', '["Cotton", "Polyester", "Silk", "Wool", "Linen", "Denim", "Nylon"]', false),
-- Electronics business filters
('electronics', 'Brand', 'brand', 'text', '[]', false),
('electronics', 'Warranty', 'warranty', 'select', '["No Warranty", "6 Months", "1 Year", "2 Years", "3 Years", "5 Years"]', false),
('electronics', 'Model', 'model', 'text', '[]', false),
-- Grocery business filters
('grocery', 'Expiry Date', 'expiry_date', 'date', '[]', false),
('grocery', 'Weight', 'weight', 'text', '[]', false),
('grocery', 'Organic', 'organic', 'boolean', '[]', false),
-- Pharmacy business filters
('pharmacy', 'Dosage Form', 'dosage_form', 'select', '["Tablet", "Capsule", "Syrup", "Injection", "Cream", "Drops", "Inhaler"]', false),
('pharmacy', 'Prescription Required', 'prescription_required', 'boolean', '[]', false),
('pharmacy', 'Manufacturer', 'manufacturer', 'text', '[]', false),
-- Default filters for all business types
('default', 'Category', 'category', 'select', '[]', true),
('default', 'Price Range', 'price_range', 'range', '[]', true),
('default', 'Stock Availability', 'stock_availability', 'select', '["In Stock", "Low Stock", "Out of Stock"]', true);

-- Add custom_attributes to products for dynamic filters
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS custom_attributes jsonb DEFAULT '{}'::jsonb;

-- Create index for custom attributes search
CREATE INDEX IF NOT EXISTS idx_products_custom_attributes ON public.products USING GIN(custom_attributes);

-- Create company_filters table to store enabled/disabled and custom filters per company
CREATE TABLE IF NOT EXISTS public.company_filters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  filter_name text NOT NULL,
  filter_key text NOT NULL,
  filter_type text NOT NULL DEFAULT 'select',
  options jsonb DEFAULT '[]'::jsonb,
  is_enabled boolean DEFAULT true,
  is_custom boolean DEFAULT false,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(company_id, filter_key)
);

-- Enable RLS on company_filters
ALTER TABLE public.company_filters ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_filters
CREATE POLICY "Users can view filters in their company"
ON public.company_filters
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Staff can manage filters"
ON public.company_filters
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

-- Add email_template preference to suppliers
ALTER TABLE public.suppliers
ADD COLUMN IF NOT EXISTS preferred_email_template text DEFAULT 'standard';

-- Create email_logs table to track supplier communications
CREATE TABLE IF NOT EXISTS public.email_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  recipient_email text NOT NULL,
  recipient_type text NOT NULL,
  recipient_id uuid,
  subject text NOT NULL,
  template_used text,
  status text NOT NULL DEFAULT 'pending',
  sent_at timestamp with time zone,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  created_by uuid
);

-- Enable RLS on email_logs
ALTER TABLE public.email_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for email_logs
CREATE POLICY "Users can view email logs in their company"
ON public.email_logs
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Staff can create email logs"
ON public.email_logs
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

-- Add employee-specific fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS invited_by uuid,
ADD COLUMN IF NOT EXISTS invited_at timestamp with time zone;

-- Create indexes for activity logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_company_id ON public.activity_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON public.activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_entity ON public.activity_logs(entity_type, entity_id);

-- Add product_name to purchase_order_items for new products not yet in inventory
ALTER TABLE public.purchase_order_items
ADD COLUMN IF NOT EXISTS product_name text,
ADD COLUMN IF NOT EXISTS product_sku text,
ADD COLUMN IF NOT EXISTS is_new_product boolean DEFAULT false;

-- Update stock_movements index
CREATE INDEX IF NOT EXISTS idx_stock_movements_product_id ON public.stock_movements(product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_at ON public.stock_movements(created_at DESC);