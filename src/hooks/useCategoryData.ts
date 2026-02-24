import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useCategory = (categoryId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["category", categoryId],
    queryFn: async () => {
      if (!categoryId || !profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("id", categoryId)
        .eq("company_id", profile.company_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && !!profile?.company_id,
  });
};

export const useCategoryHierarchy = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["category-hierarchy", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      
      // Build hierarchy
      const buildHierarchy = (categories: typeof data, parentId: string | null = null, level = 0): any[] => {
        return categories
          ?.filter(cat => cat.parent_id === parentId)
          .map(cat => ({
            ...cat,
            level,
            children: buildHierarchy(categories, cat.id, level + 1),
          })) || [];
      };
      
      return buildHierarchy(data);
    },
    enabled: !!profile?.company_id,
  });
};

export const useSubcategories = (parentId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["subcategories", parentId],
    queryFn: async () => {
      if (!parentId || !profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("parent_id", parentId)
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!parentId && !!profile?.company_id,
  });
};

export const useCategoryProducts = (categoryId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["category-products", categoryId],
    queryFn: async () => {
      if (!categoryId || !profile?.company_id) return [];
      
      // Get all subcategory IDs
      const { data: subcategories } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", categoryId)
        .eq("company_id", profile.company_id);
      
      const categoryIds = [categoryId, ...(subcategories?.map(c => c.id) || [])];
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name),
          supplier:suppliers(id, name)
        `)
        .in("category_id", categoryIds)
        .eq("company_id", profile.company_id)
        .order("name");
      
      if (error) throw error;
      return data;
    },
    enabled: !!categoryId && !!profile?.company_id,
  });
};

export const useCategoryAnalytics = (categoryId: string | undefined) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["category-analytics", categoryId],
    queryFn: async () => {
      if (!categoryId || !profile?.company_id) return null;
      
      // Get all subcategory IDs
      const { data: subcategories } = await supabase
        .from("categories")
        .select("id")
        .eq("parent_id", categoryId)
        .eq("company_id", profile.company_id);
      
      const categoryIds = [categoryId, ...(subcategories?.map(c => c.id) || [])];
      
      // Get products in this category
      const { data: products } = await supabase
        .from("products")
        .select("id, price, cost_price")
        .in("category_id", categoryIds)
        .eq("company_id", profile.company_id);
      
      if (!products?.length) {
        return { hasData: false, totalSales: 0, totalRevenue: 0, profit: 0, salesByMonth: [] };
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
      
      // Calculate totals
      const totalSales = companyOrderItems.reduce((acc, item) => acc + item.quantity, 0);
      const totalRevenue = companyOrderItems.reduce((acc, item) => acc + Number(item.total), 0);
      
      // Calculate profit (simplified - assumes avg cost)
      const avgCost = products.reduce((acc, p) => acc + Number(p.cost_price), 0) / products.length;
      const totalCost = totalSales * avgCost;
      const profit = totalRevenue - totalCost;
      
      // Group by month
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
      
      return {
        hasData: companyOrderItems.length > 0,
        totalSales,
        totalRevenue,
        profit,
        profitMargin: totalRevenue > 0 ? (profit / totalRevenue) * 100 : 0,
        productCount: products.length,
        salesByMonth: Object.entries(salesByMonth).map(([month, data]) => ({
          month,
          ...data,
        })).sort((a, b) => a.month.localeCompare(b.month)),
      };
    },
    enabled: !!categoryId && !!profile?.company_id,
  });
};

export const useUpdateCategory = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...category }: { 
      id: string;
      name?: string;
      description?: string;
      parent_id?: string | null;
      is_active?: boolean;
      tax_rate?: number;
      allowed_units?: string[];
    }) => {
      const { data, error } = await supabase
        .from("categories")
        .update(category)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      
      // If category is being deactivated, deactivate all products
      if (category.is_active === false) {
        await supabase
          .from("products")
          .update({ is_active: false })
          .eq("category_id", id);
      }
      
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      queryClient.invalidateQueries({ queryKey: ["category", data.id] });
      queryClient.invalidateQueries({ queryKey: ["category-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Category updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update category: " + error.message);
    },
  });
};

export const useCreateCategoryWithParent = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  
  return useMutation({
    mutationFn: async (category: { 
      name: string; 
      description?: string; 
      parent_id?: string;
      tax_rate?: number;
      allowed_units?: string[];
    }) => {
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
      queryClient.invalidateQueries({ queryKey: ["category-hierarchy"] });
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      toast.success("Category created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create category: " + error.message);
    },
  });
};
