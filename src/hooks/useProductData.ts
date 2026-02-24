import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useProduct = (productId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["product", productId],
    queryFn: async () => {
      if (!productId || !profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name, tax_rate, parent_id, is_active),
          supplier:suppliers(id, name, email, phone, address, location, rating)
        `)
        .eq("id", productId)
        .eq("company_id", profile.company_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!profile?.company_id,
  });
};

export const useProductAnalytics = (productId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["product-analytics", productId],
    queryFn: async () => {
      if (!productId || !profile?.company_id) return null;
      
      // Get order items for this product
      const { data: orderItems, error: orderItemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          order:orders(id, created_at, status, company_id)
        `)
        .eq("product_id", productId);
      
      if (orderItemsError) throw orderItemsError;
      
      // Filter to only include items from orders in this company
      const companyOrderItems = orderItems?.filter(
        item => item.order?.company_id === profile.company_id
      ) || [];
      
      // Get product for cost calculation
      const { data: product } = await supabase
        .from("products")
        .select("cost_price, price")
        .eq("id", productId)
        .single();
      
      // Calculate analytics
      const totalSales = companyOrderItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalRevenue = companyOrderItems.reduce((acc, item) => acc + Number(item.total), 0);
      const costPrice = Number(product?.cost_price || 0);
      const totalCost = totalSales * costPrice;
      const profit = totalRevenue - totalCost;
      
      // Group sales by month
      const salesByMonth: Record<string, { sales: number; revenue: number }> = {};
      companyOrderItems.forEach(item => {
        if (item.order?.created_at) {
          const month = new Date(item.order.created_at).toISOString().slice(0, 7);
          if (!salesByMonth[month]) {
            salesByMonth[month] = { sales: 0, revenue: 0 };
          }
          salesByMonth[month].sales += item.quantity;
          salesByMonth[month].revenue += Number(item.total);
        }
      });
      
      // Get reviews
      const { data: reviews } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("company_id", profile.company_id);
      
      const avgRating = reviews?.length 
        ? reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length 
        : 0;
      
      return {
        totalSales,
        totalRevenue,
        profit,
        profitMargin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
        salesByMonth: Object.entries(salesByMonth).map(([month, data]) => ({
          month,
          ...data,
        })).sort((a, b) => a.month.localeCompare(b.month)),
        reviews: reviews || [],
        avgRating,
        hasData: companyOrderItems.length > 0,
      };
    },
    enabled: !!productId && !!profile?.company_id,
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...product }: { 
      id: string;
      name?: string;
      sku?: string;
      description?: string;
      price?: number;
      cost_price?: number;
      quantity?: number;
      min_stock_level?: number;
      category_id?: string;
      supplier_id?: string;
      image_url?: string;
      is_active?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("products")
        .update(product)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      toast.success("Product updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update product: " + error.message);
    },
  });
};

export const useProductComplaints = (productId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["product-complaints", productId],
    queryFn: async () => {
      if (!productId || !profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("supplier_complaints")
        .select(`
          *,
          supplier:suppliers(id, name, email)
        `)
        .eq("product_id", productId)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!productId && !!profile?.company_id,
  });
};

export const useCreateComplaint = () => {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (complaint: {
      supplier_id: string;
      product_id?: string;
      subject: string;
      description: string;
    }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const { data, error } = await supabase
        .from("supplier_complaints")
        .insert({
          ...complaint,
          company_id: profile.company_id,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["product-complaints"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-complaints"] });
      toast.success("Complaint submitted successfully");
    },
    onError: (error) => {
      toast.error("Failed to submit complaint: " + error.message);
    },
  });
};
