import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useSupplier = (supplierId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["supplier", supplierId],
    queryFn: async () => {
      if (!supplierId || !profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", supplierId)
        .eq("company_id", profile.company_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!supplierId && !!profile?.company_id,
  });
};

export const useSupplierProducts = (supplierId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["supplier-products", supplierId],
    queryFn: async () => {
      if (!supplierId || !profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq("supplier_id", supplierId)
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!supplierId && !!profile?.company_id,
  });
};

export const useSupplierComplaints = (supplierId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["supplier-complaints", supplierId],
    queryFn: async () => {
      if (!supplierId || !profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("supplier_complaints")
        .select(`
          *,
          product:products(id, name)
        `)
        .eq("supplier_id", supplierId)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!supplierId && !!profile?.company_id,
  });
};

export const useSupplierAnalytics = (supplierId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["supplier-analytics", supplierId],
    queryFn: async () => {
      if (!supplierId || !profile?.company_id) return null;
      
      // Get products from this supplier
      const { data: products } = await supabase
        .from("products")
        .select("id, price, cost_price")
        .eq("supplier_id", supplierId)
        .eq("company_id", profile.company_id);
      
      if (!products?.length) {
        return { hasData: false, totalPurchases: 0, totalRevenue: 0, productCount: 0 };
      }
      
      const productIds = products.map(p => p.id);
      
      // Get order items for these products
      const { data: orderItems } = await supabase
        .from("order_items")
        .select(`
          *,
          order:orders(id, created_at, company_id)
        `)
        .in("product_id", productIds);
      
      // Filter to only include items from orders in this company
      const companyOrderItems = orderItems?.filter(
        item => item.order?.company_id === profile.company_id
      ) || [];
      
      const totalSales = companyOrderItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalRevenue = companyOrderItems.reduce((acc, item) => acc + Number(item.total), 0);
      
      // Calculate purchase cost
      const avgCost = products.reduce((acc, p) => acc + Number(p.cost_price), 0) / products.length;
      const totalPurchases = totalSales * avgCost;
      
      // Group by month
      const purchasesByMonth: Record<string, { quantity: number; cost: number }> = {};
      companyOrderItems.forEach(item => {
        if (item.order?.created_at) {
          const month = new Date(item.order.created_at).toISOString().slice(0, 7);
          if (!purchasesByMonth[month]) {
            purchasesByMonth[month] = { quantity: 0, cost: 0 };
          }
          purchasesByMonth[month].quantity += item.quantity;
          purchasesByMonth[month].cost += item.quantity * avgCost;
        }
      });
      
      // Get complaints count
      const { count: complaintsCount } = await supabase
        .from("supplier_complaints")
        .select("id", { count: "exact" })
        .eq("supplier_id", supplierId)
        .eq("company_id", profile.company_id);
      
      return {
        hasData: companyOrderItems.length > 0,
        totalPurchases,
        totalRevenue,
        productCount: products.length,
        totalSales,
        complaintsCount: complaintsCount || 0,
        purchasesByMonth: Object.entries(purchasesByMonth).map(([month, data]) => ({
          month,
          ...data,
        })).sort((a, b) => a.month.localeCompare(b.month)),
      };
    },
    enabled: !!supplierId && !!profile?.company_id,
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...supplier }: { 
      id: string;
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      location?: string;
      rating?: number;
      tax_rate?: number;
    }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update(supplier)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier", data.id] });
      toast.success("Supplier updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update supplier: " + error.message);
    },
  });
};

export const useUpdateComplaintStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { data, error } = await supabase
        .from("supplier_complaints")
        .update({ status })
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["product-complaints"] });
      toast.success("Complaint status updated");
    },
    onError: (error) => {
      toast.error("Failed to update status: " + error.message);
    },
  });
};
