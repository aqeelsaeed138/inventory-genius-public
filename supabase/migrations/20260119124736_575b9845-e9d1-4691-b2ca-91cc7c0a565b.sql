-- Add selling_price column to purchase_order_items table
ALTER TABLE public.purchase_order_items 
ADD COLUMN selling_price numeric DEFAULT NULL;

-- Add comment for clarity
COMMENT ON COLUMN public.purchase_order_items.selling_price IS 'The selling price for new products being added to inventory';