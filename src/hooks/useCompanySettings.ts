import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CompanyFilter {
  id: string;
  filter_name: string;
  filter_key: string;
  filter_type: string;
  options: string[];
  is_enabled: boolean;
  is_custom: boolean;
  sort_order: number;
}

export const useCompanySettings = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["company-settings", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const useUpdateCompanySettings = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (settings: {
      name?: string;
      business_type?: string;
      location?: string;
      country?: string;
      currency?: string;
      currency_symbol?: string;
      email?: string;
      phone?: string;
      address?: string;
      logo_url?: string;
    }) => {
      if (!profile?.company_id) throw new Error("No company found");

      const { error } = await supabase
        .from("companies")
        .update(settings)
        .eq("id", profile.company_id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-settings"] });
      queryClient.invalidateQueries({ queryKey: ["company-info"] });
      toast.success("Settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update settings: " + error.message);
    },
  });
};

export const useCompanyFilters = () => {
  const { profile } = useAuth();

  return useQuery({
    queryKey: ["company-filters", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from("company_filters")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("sort_order");

      if (error) throw error;
      return (data || []) as CompanyFilter[];
    },
    enabled: !!profile?.company_id,
  });
};

export const useBusinessTypeFilters = () => {
  return useQuery({
    queryKey: ["business-type-filters"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_type_filters")
        .select("*");

      if (error) throw error;
      return data || [];
    },
  });
};

export const useInitializeCompanyFilters = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (businessType: string) => {
      if (!profile?.company_id) throw new Error("No company found");

      // Get default filters and business type specific filters
      const { data: templateFilters } = await supabase
        .from("business_type_filters")
        .select("*")
        .or(`business_type.eq.default,business_type.eq.${businessType}`);

      if (!templateFilters?.length) return;

      // Create company filters from templates
      const companyFilters = templateFilters.map((filter, index) => ({
        company_id: profile.company_id!,
        filter_name: filter.filter_name,
        filter_key: filter.filter_key,
        filter_type: filter.filter_type,
        options: filter.options,
        is_enabled: true,
        is_custom: false,
        sort_order: index,
      }));

      const { error } = await supabase
        .from("company_filters")
        .upsert(companyFilters, { onConflict: "company_id,filter_key" });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-filters"] });
    },
  });
};

export const useUpdateFilter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<CompanyFilter>) => {
      const { error } = await supabase
        .from("company_filters")
        .update(updates)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-filters"] });
      toast.success("Filter updated");
    },
    onError: (error) => {
      toast.error("Failed to update filter: " + error.message);
    },
  });
};

export const useAddCustomFilter = () => {
  const queryClient = useQueryClient();
  const { profile } = useAuth();

  return useMutation({
    mutationFn: async (filter: {
      filter_name: string;
      filter_key: string;
      filter_type: string;
      options?: string[];
    }) => {
      if (!profile?.company_id) throw new Error("No company found");

      const { error } = await supabase.from("company_filters").insert({
        company_id: profile.company_id,
        ...filter,
        options: filter.options || [],
        is_enabled: true,
        is_custom: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-filters"] });
      toast.success("Custom filter added");
    },
    onError: (error) => {
      toast.error("Failed to add filter: " + error.message);
    },
  });
};

export const useDeleteFilter = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (filterId: string) => {
      const { error } = await supabase
        .from("company_filters")
        .delete()
        .eq("id", filterId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["company-filters"] });
      toast.success("Filter removed");
    },
    onError: (error) => {
      toast.error("Failed to remove filter: " + error.message);
    },
  });
};