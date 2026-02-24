import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ActivityAction = 
  | "product_created"
  | "product_updated"
  | "product_deleted"
  | "order_created"
  | "order_updated"
  | "purchase_order_created"
  | "purchase_order_received"
  | "customer_created"
  | "customer_updated"
  | "category_created"
  | "supplier_created"
  | "stock_adjusted"
  | "employee_added"
  | "settings_updated";

export type EntityType = 
  | "product"
  | "order"
  | "purchase_order"
  | "customer"
  | "category"
  | "supplier"
  | "settings"
  | "employee";

export const useLogActivity = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      action,
      entityType,
      entityId,
      details,
    }: {
      action: ActivityAction;
      entityType: EntityType;
      entityId?: string;
      details?: Record<string, any>;
    }) => {
      if (!profile?.company_id || !user?.id) {
        console.warn("Cannot log activity: missing company or user");
        return;
      }

      const { error } = await supabase.from("activity_logs").insert({
        company_id: profile.company_id,
        user_id: user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
      });

      if (error) {
        console.error("Error logging activity:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
    },
  });
};

export const useActivityLogs = (limit = 20) => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["activity-logs", profile?.company_id, limit],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("activity_logs")
        .select(`
          *,
          user:profiles!activity_logs_user_id_fkey(id, full_name, avatar_url)
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) {
        // If foreign key doesn't exist, fetch without join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from("activity_logs")
          .select("*")
          .eq("company_id", profile.company_id)
          .order("created_at", { ascending: false })
          .limit(limit);
        
        if (fallbackError) throw fallbackError;
        return fallbackData || [];
      }

      return data || [];
    },
    enabled: !!profile?.company_id,
  });
};

// Helper to format activity messages
export const formatActivityMessage = (log: any): string => {
  const actions: Record<string, string> = {
    product_created: "created a new product",
    product_updated: "updated a product",
    product_deleted: "deleted a product",
    order_created: "created a new order",
    order_updated: "updated an order",
    purchase_order_created: "created a purchase order",
    purchase_order_received: "received a purchase order",
    customer_created: "added a new customer",
    customer_updated: "updated customer details",
    category_created: "created a new category",
    supplier_created: "added a new supplier",
    stock_adjusted: "adjusted stock levels",
    employee_added: "added a new employee",
    settings_updated: "updated company settings",
  };

  return actions[log.action] || log.action;
};