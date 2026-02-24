-- Create custom types
CREATE TYPE public.app_role AS ENUM ('super_admin', 'admin', 'staff', 'accountant');
CREATE TYPE public.order_status AS ENUM ('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled');
CREATE TYPE public.payment_status AS ENUM ('pending', 'partial', 'paid', 'refunded');
CREATE TYPE public.stock_movement_type AS ENUM ('in', 'out', 'adjustment', 'transfer');

-- Companies table (multi-tenant)
CREATE TABLE public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  logo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'staff',
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, company_id)
);

-- Categories table
CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  supplier_id UUID REFERENCES public.suppliers(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  sku TEXT,
  description TEXT,
  price DECIMAL(12,2) NOT NULL DEFAULT 0,
  cost_price DECIMAL(12,2) NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  min_stock_level INTEGER NOT NULL DEFAULT 10,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orders table
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  order_number TEXT NOT NULL,
  status order_status NOT NULL DEFAULT 'pending',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax DECIMAL(12,2) NOT NULL DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Order items table
CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stock movements table
CREATE TABLE public.stock_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  type stock_movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  reference_id UUID,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id UUID,
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Security definer function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.profiles WHERE id = _user_id
$$;

-- Security definer function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Function to check if user has any role in company
CREATE OR REPLACE FUNCTION public.user_has_company_access(_user_id UUID, _company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND company_id = _company_id
  )
$$;

-- RLS Policies for companies
CREATE POLICY "Users can view their company" ON public.companies
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), id)
  );

CREATE POLICY "Super admins can insert companies" ON public.companies
  FOR INSERT WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Admins can update their company" ON public.companies
  FOR UPDATE USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.user_has_company_access(auth.uid(), id) AND 
     EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND company_id = id AND role = 'admin'))
  );

-- RLS Policies for profiles
CREATE POLICY "Users can view profiles in their company" ON public.profiles
  FOR SELECT USING (
    id = auth.uid() OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.get_user_company_id(auth.uid()) = company_id
  );

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- RLS Policies for user_roles
CREATE POLICY "Users can view roles in their company" ON public.user_roles
  FOR SELECT USING (
    user_id = auth.uid() OR
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Admins can manage roles" ON public.user_roles
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    (public.user_has_company_access(auth.uid(), company_id) AND 
     EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND company_id = user_roles.company_id AND role = 'admin'))
  );

-- RLS Policies for categories
CREATE POLICY "Users can view categories in their company" ON public.categories
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Staff can manage categories" ON public.categories
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

-- RLS Policies for suppliers
CREATE POLICY "Users can view suppliers in their company" ON public.suppliers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Staff can manage suppliers" ON public.suppliers
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

-- RLS Policies for products
CREATE POLICY "Users can view products in their company" ON public.products
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Staff can manage products" ON public.products
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

-- RLS Policies for customers
CREATE POLICY "Users can view customers in their company" ON public.customers
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Staff can manage customers" ON public.customers
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

-- RLS Policies for orders
CREATE POLICY "Users can view orders in their company" ON public.orders
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Staff can manage orders" ON public.orders
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

-- RLS Policies for order_items
CREATE POLICY "Users can view order items" ON public.order_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (public.has_role(auth.uid(), 'super_admin') OR public.user_has_company_access(auth.uid(), orders.company_id))
    )
  );

CREATE POLICY "Staff can manage order items" ON public.order_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = order_items.order_id 
      AND (public.has_role(auth.uid(), 'super_admin') OR public.user_has_company_access(auth.uid(), orders.company_id))
    )
  );

-- RLS Policies for stock_movements
CREATE POLICY "Users can view stock movements in their company" ON public.stock_movements
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "Staff can manage stock movements" ON public.stock_movements
  FOR ALL USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

-- RLS Policies for activity_logs
CREATE POLICY "Users can view activity logs in their company" ON public.activity_logs
  FOR SELECT USING (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

CREATE POLICY "System can insert activity logs" ON public.activity_logs
  FOR INSERT WITH CHECK (
    public.has_role(auth.uid(), 'super_admin') OR
    public.user_has_company_access(auth.uid(), company_id)
  );

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'full_name');
  RETURN NEW;
END;
$$;

-- Trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create updated_at triggers for all relevant tables
CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON public.companies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON public.products FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();