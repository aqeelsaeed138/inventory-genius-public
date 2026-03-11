-- Create purchase_orders table for supplier orders
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES public.suppliers(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'received', 'cancelled')),
  subtotal NUMERIC NOT NULL DEFAULT 0,
  tax NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase_order_items table
CREATE TABLE public.purchase_order_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL,
  total NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on purchase_orders
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

-- Enable RLS on purchase_order_items  
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for purchase_orders
CREATE POLICY "Users can view purchase orders in their company"
ON public.purchase_orders
FOR SELECT
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

CREATE POLICY "Staff can manage purchase orders"
ON public.purchase_orders
FOR ALL
USING (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), company_id));

-- RLS policies for purchase_order_items
CREATE POLICY "Users can view purchase order items"
ON public.purchase_order_items
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.purchase_orders
  WHERE purchase_orders.id = purchase_order_items.purchase_order_id
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), purchase_orders.company_id))
));

CREATE POLICY "Staff can manage purchase order items"
ON public.purchase_order_items
FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.purchase_orders
  WHERE purchase_orders.id = purchase_order_items.purchase_order_id
  AND (has_role(auth.uid(), 'super_admin'::app_role) OR user_has_company_access(auth.uid(), purchase_orders.company_id))
));

-- Add triggers for updated_at
CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add discount column to orders table for future use
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;