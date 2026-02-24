import { useState, useEffect } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Building2, Loader2, Package, MapPin, DollarSign, Briefcase } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { COUNTRY_LIST, CURRENCY_MAP, BUSINESS_TYPES, getCurrencyForCountry } from "@/lib/currency";

const CompanySetup = () => {
  const navigate = useNavigate();
  const { user, profile, profileLoading, refreshProfile, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    companyName: "",
    businessType: "",
    country: "PK",
    location: "",
    currency: "PKR",
    currencySymbol: "Rs.",
  });

  // Auto-detect currency when country changes
  useEffect(() => {
    const currency = getCurrencyForCountry(formData.country);
    setFormData(prev => ({
      ...prev,
      currency: currency.code,
      currencySymbol: currency.symbol,
    }));
  }, [formData.country]);

  // Wait for profile to load
  if (profileLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Redirect to dashboard if user already has a company
  if (profile?.company_id) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }

    if (!formData.businessType) {
      toast.error("Please select a business type");
      return;
    }

    if (!user) {
      toast.error("You must be logged in");
      return;
    }
    
    setLoading(true);

    try {
      // Generate company ID client-side to avoid RLS circular dependency
      const companyId = crypto.randomUUID();

      // Step 1: Create the company with all details
      const { error: companyError } = await supabase
        .from("companies")
        .insert({
          id: companyId,
          name: formData.companyName.trim(),
          business_type: formData.businessType,
          country: formData.country,
          location: formData.location,
          currency: formData.currency,
          currency_symbol: formData.currencySymbol,
        });

      if (companyError) {
        throw companyError;
      }

      // Step 2: Create admin role FIRST (INSERT allowed for own user_id)
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "admin",
          company_id: companyId,
        });

      if (roleError) {
        throw roleError;
      }

      // Step 3: Update user's profile with company_id
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ company_id: companyId })
        .eq("id", user.id);

      if (profileError) {
        throw profileError;
      }

      // Step 4: Initialize business type filters
      const { data: templateFilters } = await supabase
        .from("business_type_filters")
        .select("*")
        .or(`business_type.eq.default,business_type.eq.${formData.businessType}`);

      if (templateFilters?.length) {
        const companyFilters = templateFilters.map((filter, index) => ({
          company_id: companyId,
          filter_name: filter.filter_name,
          filter_key: filter.filter_key,
          filter_type: filter.filter_type,
          options: filter.options,
          is_enabled: true,
          is_custom: false,
          sort_order: index,
        }));

        await supabase.from("company_filters").insert(companyFilters);
      }

      // Refresh the profile to get updated company_id
      await refreshProfile();
      
      toast.success("Company created successfully!");
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      console.error("Error creating company:", error);
      toast.error(error.message || "Failed to create company");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  const nextStep = () => {
    if (step === 1 && !formData.companyName.trim()) {
      toast.error("Please enter a company name");
      return;
    }
    if (step === 2 && !formData.businessType) {
      toast.error("Please select a business type");
      return;
    }
    setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-lg">
        <Card className="border-border/50 shadow-lg">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-4 h-12 w-12 rounded-xl bg-primary flex items-center justify-center">
              <Package className="h-6 w-6 text-primary-foreground" />
            </div>
            <CardTitle className="text-2xl">Set Up Your Business</CardTitle>
            <CardDescription>
              Step {step} of 3 - {step === 1 ? "Basic Info" : step === 2 ? "Business Type" : "Location & Currency"}
            </CardDescription>
            
            {/* Progress bar */}
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map((s) => (
                <div
                  key={s}
                  className={`h-2 flex-1 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
          </CardHeader>
          
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Step 1: Company Name */}
              {step === 1 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName" className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" />
                      Company Name
                    </Label>
                    <Input
                      id="companyName"
                      type="text"
                      placeholder="Enter your business name"
                      className="h-12"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      autoFocus
                    />
                  </div>
                  <Button type="button" className="w-full h-12" onClick={nextStep}>
                    Continue
                  </Button>
                </div>
              )}

              {/* Step 2: Business Type */}
              {step === 2 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Briefcase className="h-4 w-4" />
                      Business Type
                    </Label>
                    <div className="grid grid-cols-2 gap-3">
                      {BUSINESS_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData(prev => ({ ...prev, businessType: type.value }))}
                          className={`p-4 rounded-lg border-2 text-left transition-all ${
                            formData.businessType === type.value
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <span className="font-medium">{type.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={prevStep}>
                      Back
                    </Button>
                    <Button type="button" className="flex-1 h-12" onClick={nextStep}>
                      Continue
                    </Button>
                  </div>
                </div>
              )}

              {/* Step 3: Location & Currency */}
              {step === 3 && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      Country
                    </Label>
                    <Select
                      value={formData.country}
                      onValueChange={(v) => setFormData(prev => ({ ...prev, country: v }))}
                    >
                      <SelectTrigger className="h-12">
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {COUNTRY_LIST.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            {country.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>City / Location</Label>
                    <Input
                      placeholder="e.g., Lahore, Karachi"
                      className="h-12"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Currency
                    </Label>
                    <div className="flex gap-3">
                      <Select
                        value={formData.currency}
                        onValueChange={(v) => {
                          const currency = Object.values(CURRENCY_MAP).find(c => c.code === v);
                          setFormData(prev => ({
                            ...prev,
                            currency: v,
                            currencySymbol: currency?.symbol || prev.currencySymbol,
                          }));
                        }}
                      >
                        <SelectTrigger className="flex-1 h-12">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CURRENCY_MAP).map((currency) => (
                            <SelectItem key={currency.code} value={currency.code}>
                              {currency.symbol} - {currency.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        className="w-20 h-12 text-center"
                        value={formData.currencySymbol}
                        onChange={(e) => setFormData(prev => ({ ...prev, currencySymbol: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button type="button" variant="outline" className="flex-1 h-12" onClick={prevStep}>
                      Back
                    </Button>
                    <Button type="submit" className="flex-1 h-12" disabled={loading}>
                      {loading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Company"
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </form>

            <div className="mt-6 pt-4 border-t">
              <Button 
                variant="ghost" 
                className="w-full" 
                onClick={handleLogout}
              >
                Sign out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompanySetup;