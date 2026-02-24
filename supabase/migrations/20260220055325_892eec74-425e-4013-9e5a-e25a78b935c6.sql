
-- =============================================
-- Phase 1: E-Commerce Website Builder Schema
-- =============================================

-- 1. Add columns to existing orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS order_source TEXT DEFAULT 'pos',
  ADD COLUMN IF NOT EXISTS shipping_address JSONB,
  ADD COLUMN IF NOT EXISTS tracking_number TEXT;

-- 2. Create stores table
CREATE TABLE IF NOT EXISTS public.stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE UNIQUE NOT NULL,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT UNIQUE,
  store_name TEXT NOT NULL,
  tagline TEXT,
  logo_url TEXT,
  favicon_url TEXT,
  is_published BOOLEAN DEFAULT false,
  theme_config JSONB DEFAULT '{}',
  contact_email TEXT,
  contact_phone TEXT,
  address TEXT,
  social_links JSONB DEFAULT '{}',
  payment_methods JSONB DEFAULT '[]',
  shipping_config JSONB DEFAULT '{}',
  seo_title TEXT,
  seo_description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Create store_products table
CREATE TABLE IF NOT EXISTS public.store_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  is_featured BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, product_id)
);

-- 4. Create store_pages table
CREATE TABLE IF NOT EXISTS public.store_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT,
  is_published BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (company_id, slug)
);

-- 5. Create cart_sessions table
CREATE TABLE IF NOT EXISTS public.cart_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  session_token TEXT UNIQUE NOT NULL,
  items JSONB DEFAULT '[]',
  customer_email TEXT,
  expires_at TIMESTAMPTZ DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- =============================================
-- Indexes for performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_stores_subdomain ON public.stores(subdomain);
CREATE INDEX IF NOT EXISTS idx_stores_company_id ON public.stores(company_id);
CREATE INDEX IF NOT EXISTS idx_stores_custom_domain ON public.stores(custom_domain);
CREATE INDEX IF NOT EXISTS idx_store_products_company_id ON public.store_products(company_id);
CREATE INDEX IF NOT EXISTS idx_store_products_product_id ON public.store_products(product_id);
CREATE INDEX IF NOT EXISTS idx_store_pages_company_id ON public.store_pages(company_id);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_token ON public.cart_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_cart_sessions_company_id ON public.cart_sessions(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_order_source ON public.orders(order_source);

-- =============================================
-- Updated_at trigger for stores
-- =============================================
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON public.stores
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Enable RLS on new tables
-- =============================================
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_sessions ENABLE ROW LEVEL SECURITY;

-- =============================================
-- RLS Policies: stores
-- =============================================

-- Authenticated company owners can manage their store
CREATE POLICY "Company owners can manage their store"
  ON public.stores
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR user_has_company_access(auth.uid(), company_id)
  );

-- PUBLIC: anyone can read published stores (for storefront rendering)
CREATE POLICY "Public can view published stores"
  ON public.stores
  FOR SELECT
  USING (is_published = true);

-- =============================================
-- RLS Policies: store_products
-- =============================================

-- Authenticated company owners manage their published products
CREATE POLICY "Company owners can manage store products"
  ON public.store_products
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR user_has_company_access(auth.uid(), company_id)
  );

-- PUBLIC: anyone can read store_products for published stores
CREATE POLICY "Public can view store products for published stores"
  ON public.store_products
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM public.stores WHERE is_published = true
    )
  );

-- =============================================
-- RLS Policies: store_pages
-- =============================================

-- Authenticated company owners manage their pages
CREATE POLICY "Company owners can manage store pages"
  ON public.store_pages
  FOR ALL
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR user_has_company_access(auth.uid(), company_id)
  )
  WITH CHECK (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR user_has_company_access(auth.uid(), company_id)
  );

-- PUBLIC: anyone can read published pages for published stores
CREATE POLICY "Public can view published store pages"
  ON public.store_pages
  FOR SELECT
  USING (
    is_published = true
    AND company_id IN (
      SELECT company_id FROM public.stores WHERE is_published = true
    )
  );

-- =============================================
-- RLS Policies: cart_sessions
-- =============================================

-- Anyone can insert a cart session (anonymous shoppers)
CREATE POLICY "Anyone can create cart sessions"
  ON public.cart_sessions
  FOR INSERT
  WITH CHECK (true);

-- Anyone can read/update their own cart session (by token — enforced in app)
CREATE POLICY "Anyone can read cart sessions"
  ON public.cart_sessions
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can update cart sessions"
  ON public.cart_sessions
  FOR UPDATE
  USING (true);

-- Company owners can view their store's cart sessions
CREATE POLICY "Company owners can view their cart sessions"
  ON public.cart_sessions
  FOR SELECT
  USING (
    has_role(auth.uid(), 'super_admin'::app_role)
    OR user_has_company_access(auth.uid(), company_id)
  );

-- =============================================
-- Public products RLS: allow public read for published store products
-- =============================================
CREATE POLICY "Public can view active products in published stores"
  ON public.products
  FOR SELECT
  USING (
    is_active = true
    AND company_id IN (
      SELECT company_id FROM public.stores WHERE is_published = true
    )
  );

-- =============================================
-- Public categories RLS: allow public read for published store categories
-- =============================================
CREATE POLICY "Public can view categories in published stores"
  ON public.categories
  FOR SELECT
  USING (
    is_active = true
    AND company_id IN (
      SELECT company_id FROM public.stores WHERE is_published = true
    )
  );
