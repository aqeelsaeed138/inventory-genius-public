-- Add tax_rate column to suppliers table
ALTER TABLE public.suppliers 
ADD COLUMN tax_rate numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.suppliers.tax_rate IS 'Tax rate percentage (0-100) applied to purchase orders from this supplier';