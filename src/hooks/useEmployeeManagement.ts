import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AppRole } from "./useRoleAccess";

export interface Employee {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string;
  role: AppRole;
  invited_by: string | null;
  invited_at: string | null;
}

export const useEmployees = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["employees", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      // Get all users with roles in this company
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .eq("company_id", profile.company_id);

      if (rolesError) throw rolesError;

      if (!roles?.length) return [];

      // Get profile info for each user
      const userIds = roles.map((r) => r.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, created_at, invited_by, invited_at")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Combine role and profile data
      return (profiles || []).map((p) => {
        const role = roles.find((r) => r.user_id === p.id);
        return {
          ...p,
          role: role?.role as AppRole,
        };
      }) as Employee[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useInviteEmployee = () => {
  const queryClient = useQueryClient();
  const { profile, user, session } = useAuth();

  return useMutation({
    mutationFn: async ({
      email,
      password,
      fullName,
      role = "staff",
    }: {
      email: string;
      password: string;
      fullName: string;
      role?: AppRole;
    }) => {
      if (!profile?.company_id || !user?.id || !session?.access_token) {
        throw new Error("No company or user found");
      }

      // Call the edge function to create employee
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-employee`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            email,
            password,
            fullName,
            role,
            companyId: profile.company_id,
            invitedBy: user.id,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create employee");
      }

      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add employee: " + error.message);
    },
  });
};

export const useUpdateEmployeeRole = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      if (!profile?.company_id) throw new Error("No company found");

      const { error } = await supabase
        .from("user_roles")
        .update({ role })
        .eq("user_id", userId)
        .eq("company_id", profile.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee role updated");
    },
    onError: (error) => {
      toast.error("Failed to update role: " + error.message);
    },
  });
};

export const useRemoveEmployee = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (userId: string) => {
      if (!profile?.company_id) throw new Error("No company found");

      // Remove role
      const { error: roleError } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("company_id", profile.company_id);

      if (roleError) throw roleError;

      // Remove company association from profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: null })
        .eq("id", userId);

      if (profileError) throw profileError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      toast.success("Employee removed");
    },
    onError: (error) => {
      toast.error("Failed to remove employee: " + error.message);
    },
  });
};