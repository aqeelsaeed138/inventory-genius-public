import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type AppRole = "super_admin" | "admin" | "staff" | "accountant";

export const useUserRole = () => {
  const { user, profile } = useAuth();

  return useQuery({
    queryKey: ["user-role", user?.id, profile?.company_id],
    queryFn: async () => {
      if (!user?.id || !profile?.company_id) return null;

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("company_id", profile.company_id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching user role:", error);
        return null;
      }

      return data?.role as AppRole | null;
    },
    enabled: !!user?.id && !!profile?.company_id,
  });
};

export const useIsOwner = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    isOwner: role === "admin" || role === "super_admin",
    isLoading,
    role,
  };
};

export const useIsEmployee = () => {
  const { data: role, isLoading } = useUserRole();
  return {
    isEmployee: role === "staff" || role === "accountant",
    isLoading,
    role,
  };
};

// Permission checks
export const usePermissions = () => {
  const { data: role, isLoading } = useUserRole();

  const isOwner = role === "admin" || role === "super_admin";
  const isAccountant = role === "accountant";
  const isStaff = role === "staff";

  return {
    isLoading,
    role,
    // Owner-only permissions
    canViewRevenue: isOwner || isAccountant,
    canViewAnalytics: isOwner || isAccountant,
    canManageEmployees: isOwner,
    canEditSettings: isOwner,
    canDeleteData: isOwner,
    // Staff + Owner permissions
    canCreateOrders: true,
    canManageProducts: isOwner || isStaff,
    canManageStock: isOwner || isStaff,
    canViewCustomers: true,
    canCreatePurchaseOrders: isOwner || isStaff,
    // View financial data
    canViewFinancials: isOwner || isAccountant,
  };
};