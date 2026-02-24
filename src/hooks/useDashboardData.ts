import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { startOfMonth, subMonths, format } from "date-fns";

export const useSalesChartData = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["sales-chart", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Get orders from the last 7 months
      const sevenMonthsAgo = subMonths(startOfMonth(new Date()), 6).toISOString();

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, total, created_at")
        .eq("company_id", profile.company_id)
        .gte("created_at", sevenMonthsAgo)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Group by month
      const monthlyData: Record<string, { sales: number; orders: number }> = {};

      // Initialize all 7 months
      for (let i = 6; i >= 0; i--) {
        const monthDate = subMonths(new Date(), i);
        const key = format(monthDate, "MMM yyyy");
        monthlyData[key] = { sales: 0, orders: 0 };
      }

      orders?.forEach((order) => {
        const key = format(new Date(order.created_at), "MMM yyyy");
        if (monthlyData[key]) {
          monthlyData[key].sales += Number(order.total || 0);
          monthlyData[key].orders += 1;
        }
      });

      return Object.entries(monthlyData).map(([name, data]) => ({
        name: name.split(" ")[0], // Just month abbreviation
        sales: Math.round(data.sales),
        orders: data.orders,
      }));
    },
    enabled: !!profile?.company_id,
  });
};

export const useLowStockProducts = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["low-stock-products", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, quantity, min_stock_level")
        .eq("company_id", profile.company_id)
        .eq("is_active", true)
        .order("quantity", { ascending: true });

      if (error) throw error;

      // Filter products where quantity < min_stock_level
      return (data || [])
        .filter((p) => p.quantity < p.min_stock_level)
        .slice(0, 6);
    },
    enabled: !!profile?.company_id,
  });
};

export const useTopProducts = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["top-products", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Get all order items with their orders to filter by company
      const { data: orderItems, error } = await supabase
        .from("order_items")
        .select(`
          quantity,
          total,
          product:products(id, name, company_id)
        `);

      if (error) throw error;

      // Filter by company and aggregate by product
      const productStats: Record<string, { name: string; sales: number; revenue: number }> = {};

      orderItems?.forEach((item) => {
        const product = item.product as any;
        if (!product || product.company_id !== profile.company_id) return;

        if (!productStats[product.id]) {
          productStats[product.id] = { name: product.name, sales: 0, revenue: 0 };
        }
        productStats[product.id].sales += item.quantity;
        productStats[product.id].revenue += Number(item.total || 0);
      });

      // Sort by sales desc and take top 5
      return Object.values(productStats)
        .sort((a, b) => b.sales - a.sales)
        .slice(0, 5);
    },
    enabled: !!profile?.company_id,
  });
};

export const useDashboardStatsWithChange = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["dashboard-stats-change", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const now = new Date();
      const thisMonthStart = startOfMonth(now).toISOString();
      const lastMonthStart = startOfMonth(subMonths(now, 1)).toISOString();

      // Get current and previous month orders for change calculation
      const [currentOrders, previousOrders, currentProducts, currentCustomers] = await Promise.all([
        supabase
          .from("orders")
          .select("total")
          .eq("company_id", profile.company_id)
          .gte("created_at", thisMonthStart),
        supabase
          .from("orders")
          .select("total")
          .eq("company_id", profile.company_id)
          .gte("created_at", lastMonthStart)
          .lt("created_at", thisMonthStart),
        supabase
          .from("products")
          .select("id", { count: "exact" })
          .eq("company_id", profile.company_id),
        supabase
          .from("customers")
          .select("id", { count: "exact" })
          .eq("company_id", profile.company_id),
      ]);

      const currentRevenue = currentOrders.data?.reduce((a, o) => a + Number(o.total || 0), 0) || 0;
      const prevRevenue = previousOrders.data?.reduce((a, o) => a + Number(o.total || 0), 0) || 0;
      const currentOrderCount = currentOrders.data?.length || 0;
      const prevOrderCount = previousOrders.data?.length || 0;

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 100 * 10) / 10;
      };

      return {
        totalRevenue: currentRevenue + prevRevenue + (previousOrders.data?.reduce((a, o) => a + Number(o.total || 0), 0) || 0),
        revenueChange: calcChange(currentRevenue, prevRevenue),
        totalProducts: currentProducts.count || 0,
        totalOrders: (currentOrders.data?.length || 0) + (previousOrders.data?.length || 0),
        ordersChange: calcChange(currentOrderCount, prevOrderCount),
        totalCustomers: currentCustomers.count || 0,
      };
    },
    enabled: !!profile?.company_id,
  });
};
