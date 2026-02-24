-- Enable RLS on business_type_filters (public read-only table)
ALTER TABLE public.business_type_filters ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read business type filters (these are predefined templates)
CREATE POLICY "Anyone can view business type filters"
ON public.business_type_filters
FOR SELECT
TO authenticated
USING (true);