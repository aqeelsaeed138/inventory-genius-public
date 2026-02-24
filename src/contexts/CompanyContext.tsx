import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPhoneFormatForCountry, DEFAULT_PHONE_FORMAT } from "@/lib/currency";

interface CompanyInfo {
  id: string;
  name: string;
  business_type: string | null;
  country: string | null;
  location: string | null;
  currency: string;
  currency_symbol: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
}

interface PhoneFormat {
  pattern: RegExp;
  placeholder: string;
  example: string;
  minLength: number;
  maxLength: number;
}

interface CompanyContextType {
  company: CompanyInfo | null;
  isLoading: boolean;
  currencySymbol: string;
  countryCode: string;
  phoneFormat: PhoneFormat;
  formatPrice: (amount: number) => string;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export const useCompany = () => {
  const context = useContext(CompanyContext);
  if (!context) {
    throw new Error("useCompany must be used within a CompanyProvider");
  }
  return context;
};

export const CompanyProvider = ({ children }: { children: ReactNode }) => {
  const { profile } = useAuth();

  const { data: company, isLoading } = useQuery({
    queryKey: ["company-context", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;

      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();

      if (error) throw error;
      return data as CompanyInfo;
    },
    enabled: !!profile?.company_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const currencySymbol = company?.currency_symbol || "Rs.";
  const countryCode = company?.country || "US";
  const phoneFormat = getPhoneFormatForCountry(countryCode) || DEFAULT_PHONE_FORMAT;

  const formatPrice = (amount: number) => {
    return `${currencySymbol} ${amount.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <CompanyContext.Provider
      value={{
        company,
        isLoading,
        currencySymbol,
        countryCode,
        phoneFormat,
        formatPrice,
      }}
    >
      {children}
    </CompanyContext.Provider>
  );
};