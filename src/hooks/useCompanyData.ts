import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useProducts = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["products", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name),
          supplier:suppliers(id, name)
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const useCategories = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["categories", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const useSuppliers = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["suppliers", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const useCustomers = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["customers", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const useOrders = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["orders", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(id, name, email)
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const useDashboardStats = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["dashboard-stats", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const [productsRes, ordersRes, customersRes, lowStockRes] = await Promise.all([
        supabase
          .from("products")
          .select("id, price, quantity", { count: "exact" })
          .eq("company_id", profile.company_id),
        supabase
          .from("orders")
          .select("id, total, status", { count: "exact" })
          .eq("company_id", profile.company_id),
        supabase
          .from("customers")
          .select("id", { count: "exact" })
          .eq("company_id", profile.company_id),
        supabase
          .from("products")
          .select("*")
          .eq("company_id", profile.company_id)
          .lt("quantity", supabase.rpc ? 10 : 10),
      ]);
      
      const totalRevenue = ordersRes.data?.reduce((acc, order) => acc + Number(order.total || 0), 0) || 0;
      const totalProducts = productsRes.count || 0;
      const totalOrders = ordersRes.count || 0;
      const totalCustomers = customersRes.count || 0;
      
      // Get low stock products (quantity < min_stock_level)
      const lowStockProducts = productsRes.data?.filter(p => p.quantity < 10) || [];
      
      return {
        totalRevenue,
        totalProducts,
        totalOrders,
        totalCustomers,
        lowStockCount: lowStockProducts.length,
      };
    },
    enabled: !!profile?.company_id,
  });
};

// Mutations
export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (product: {
      name: string;
      sku?: string;
      description?: string;
      price: number;
      cost_price: number;
      quantity: number;
      min_stock_level: number;
      category_id?: string;
      supplier_id?: string;
    }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, company_id: profile.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Product created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create product: " + error.message);
    },
  });
};

export const useCreateCategory = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (category: { name: string; description?: string }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const { data, error } = await supabase
        .from("categories")
        .insert({ ...category, company_id: profile.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create category: " + error.message);
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (supplier: { name: string; email?: string; phone?: string; address?: string }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...supplier, company_id: profile.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create supplier: " + error.message);
    },
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (customer: { name: string; email?: string; phone?: string; address?: string }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const { data, error } = await supabase
        .from("customers")
        .insert({ ...customer, company_id: profile.company_id })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      toast.success("Customer created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create customer: " + error.message);
    },
  });
};

export const useCreateOrder = () => {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (order: {
      customer_id?: string;
      items: { product_id: string; quantity: number; unit_price: number }[];
      notes?: string;
    }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const subtotal = order.items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
      const tax = subtotal * 0.1; // 10% tax
      const total = subtotal + tax;
      
      const orderNumber = `ORD-${Date.now()}`;
      
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          company_id: profile.company_id,
          customer_id: order.customer_id,
          order_number: orderNumber,
          subtotal,
          tax,
          total,
          notes: order.notes,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Insert order items
      const orderItems = order.items.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));
      
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // Update product quantities
      for (const item of order.items) {
        const { data: product } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.product_id)
          .single();
        
        if (product) {
          await supabase
            .from("products")
            .update({ quantity: product.quantity - item.quantity })
            .eq("id", item.product_id);
        }
      }
      
      return orderData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Order created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create order: " + error.message);
    },
  });
};
