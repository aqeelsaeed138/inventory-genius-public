import { useState, useEffect } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  Filter,
  Loader2,
  Plus,
  Trash2,
  UserPlus,
  Shield,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useCompanySettings, useUpdateCompanySettings, useCompanyFilters, useUpdateFilter, useAddCustomFilter, useDeleteFilter } from "@/hooks/useCompanySettings";
import { useEmployees, useInviteEmployee, useRemoveEmployee, useUpdateEmployeeRole } from "@/hooks/useEmployeeManagement";
import { usePermissions } from "@/hooks/useRoleAccess";
import { COUNTRY_LIST, CURRENCY_MAP, BUSINESS_TYPES, getPhoneFormatForCountry } from "@/lib/currency";
import { toast } from "sonner";
import type { AppRole } from "@/hooks/useRoleAccess";
import { employeeSchema, validateForm, createCompanySettingsSchema } from "@/lib/validations";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Settings = () => {
  const { canEditSettings, canManageEmployees, isLoading: permissionsLoading } = usePermissions();
  const { data: company, isLoading: companyLoading } = useCompanySettings();
  const { data: filters, isLoading: filtersLoading } = useCompanyFilters();
  const { data: employees, isLoading: employeesLoading } = useEmployees();
  
  const updateSettings = useUpdateCompanySettings();
  const updateFilter = useUpdateFilter();
  const addFilter = useAddCustomFilter();
  const deleteFilter = useDeleteFilter();
  const inviteEmployee = useInviteEmployee();
  const removeEmployee = useRemoveEmployee();
  const updateRole = useUpdateEmployeeRole();

  const [companyForm, setCompanyForm] = useState({
    name: "",
    business_type: "",
    country: "",
    location: "",
    currency: "",
    currency_symbol: "",
    phone: "",
    email: "",
    address: "",
  });

  const [newFilter, setNewFilter] = useState({
    filter_name: "",
    filter_key: "",
    filter_type: "select",
    options: "",
  });

  const [newEmployee, setNewEmployee] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "staff" as "staff" | "accountant",
  });
  const [employeeErrors, setEmployeeErrors] = useState<Record<string, string>>({});
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});
  const [employeeSuccess, setEmployeeSuccess] = useState(false);

  const [isAddFilterOpen, setIsAddFilterOpen] = useState(false);
  const [isAddEmployeeOpen, setIsAddEmployeeOpen] = useState(false);

  // Get phone format based on currently selected country in form
  const currentPhoneFormat = getPhoneFormatForCountry(companyForm.country || "US");

  // Sync form when company data loads - Fixed: using useEffect instead of useState
  useEffect(() => {
    if (company) {
      setCompanyForm({
        name: company.name || "",
        business_type: company.business_type || "",
        country: company.country || "",
        location: company.location || "",
        currency: company.currency || "",
        currency_symbol: company.currency_symbol || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
      });
    }
  }, [company]);

  const handleCountryChange = (country: string) => {
    const currency = CURRENCY_MAP[country];
    setCompanyForm(prev => ({
      ...prev,
      country,
      currency: currency?.code || prev.currency,
      currency_symbol: currency?.symbol || prev.currency_symbol,
    }));
  };

  const handleSaveCompany = async () => {
    // Validate the form
    const schema = createCompanySettingsSchema(companyForm.country);
    const result = validateForm(schema, companyForm);
    
    if (result.success === false) {
      setCompanyErrors(result.errors);
      const firstError = Object.values(result.errors)[0];
      toast.error(firstError || "Please fix the form errors");
      return;
    }
    
    setCompanyErrors({});
    await updateSettings.mutateAsync(companyForm);
  };

  const handleCompanyFieldChange = (field: string, value: string) => {
    setCompanyForm(prev => ({ ...prev, [field]: value }));
    if (companyErrors[field]) {
      setCompanyErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleAddFilter = async () => {
    if (!newFilter.filter_name || !newFilter.filter_key) {
      toast.error("Filter name and key are required");
      return;
    }
    await addFilter.mutateAsync({
      ...newFilter,
      options: newFilter.options.split(",").map(o => o.trim()).filter(Boolean),
    });
    setNewFilter({ filter_name: "", filter_key: "", filter_type: "select", options: "" });
    setIsAddFilterOpen(false);
  };

  const handleAddEmployee = async () => {
    // Validate with Zod schema
    const validationResult = validateForm(employeeSchema, newEmployee);
    
    if (validationResult.success === false) {
      setEmployeeErrors(validationResult.errors);
      const firstError = Object.values(validationResult.errors)[0];
      toast.error(firstError || "Please fix the form errors");
      return;
    }
    
    setEmployeeErrors({});
    
    try {
      await inviteEmployee.mutateAsync(newEmployee);
      setNewEmployee({ email: "", password: "", fullName: "", role: "staff" });
      setEmployeeSuccess(true);
      setTimeout(() => {
        setIsAddEmployeeOpen(false);
        setEmployeeSuccess(false);
      }, 1500);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  // Reset form when dialog closes
  const handleEmployeeDialogChange = (open: boolean) => {
    setIsAddEmployeeOpen(open);
    if (!open) {
      setNewEmployee({ email: "", password: "", fullName: "", role: "staff" });
      setEmployeeErrors({});
      setEmployeeSuccess(false);
    }
  };

  if (permissionsLoading || companyLoading) {
    return (
      <DashboardLayout title="Settings" description="Manage your company settings">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canEditSettings) {
    return (
      <DashboardLayout title="Settings" description="Manage your company settings">
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">Access Restricted</h3>
            <p className="text-muted-foreground text-center max-w-md mt-2">
              You don't have permission to view settings. Please contact your administrator.
            </p>
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Settings" description="Manage your company settings">
      <Tabs defaultValue="company" className="space-y-6">
        <TabsList>
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Company
          </TabsTrigger>
          <TabsTrigger value="filters" className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            Filters
          </TabsTrigger>
          {canManageEmployees && (
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
          )}
        </TabsList>

        {/* Company Settings */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Company Information</CardTitle>
              <CardDescription>Update your company details and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Company Name</Label>
                  <Input
                    value={companyForm.name}
                    onChange={(e) => handleCompanyFieldChange("name", e.target.value)}
                    placeholder="Your Company Name"
                    className={companyErrors.name ? "border-destructive" : ""}
                  />
                  {companyErrors.name && (
                    <p className="text-sm text-destructive">{companyErrors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Business Type</Label>
                  <Select
                    value={companyForm.business_type}
                    onValueChange={(v) => setCompanyForm(prev => ({ ...prev, business_type: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {BUSINESS_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Country</Label>
                  <Select value={companyForm.country} onValueChange={handleCountryChange}>
                    <SelectTrigger>
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
                    value={companyForm.location}
                    onChange={(e) => handleCompanyFieldChange("location", e.target.value)}
                    placeholder="e.g., Lahore"
                    className={companyErrors.location ? "border-destructive" : ""}
                  />
                  {companyErrors.location && (
                    <p className="text-sm text-destructive">{companyErrors.location}</p>
                  )}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Select
                    value={companyForm.currency}
                    onValueChange={(v) => {
                      const currency = Object.values(CURRENCY_MAP).find(c => c.code === v);
                      setCompanyForm(prev => ({
                        ...prev,
                        currency: v,
                        currency_symbol: currency?.symbol || prev.currency_symbol,
                      }));
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select currency" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(CURRENCY_MAP).map((currency) => (
                        <SelectItem key={currency.code} value={currency.code}>
                          {currency.symbol} - {currency.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Currency Symbol</Label>
                  <Input
                    value={companyForm.currency_symbol}
                    onChange={(e) => setCompanyForm(prev => ({ ...prev, currency_symbol: e.target.value }))}
                    placeholder="Rs."
                  />
                </div>
              </div>

              <Separator />

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Phone</Label>
                  <Input
                    value={companyForm.phone}
                    onChange={(e) => handleCompanyFieldChange("phone", e.target.value)}
                    placeholder={currentPhoneFormat.placeholder}
                    className={companyErrors.phone ? "border-destructive" : ""}
                  />
                  {companyErrors.phone && (
                    <p className="text-sm text-destructive">{companyErrors.phone}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Example: {currentPhoneFormat.example}</p>
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={companyForm.email}
                    onChange={(e) => handleCompanyFieldChange("email", e.target.value)}
                    placeholder="company@example.com"
                    className={companyErrors.email ? "border-destructive" : ""}
                  />
                  {companyErrors.email && (
                    <p className="text-sm text-destructive">{companyErrors.email}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={companyForm.address}
                  onChange={(e) => handleCompanyFieldChange("address", e.target.value)}
                  placeholder="Full address"
                  className={companyErrors.address ? "border-destructive" : ""}
                />
                {companyErrors.address && (
                  <p className="text-sm text-destructive">{companyErrors.address}</p>
                )}
              </div>

              <Button onClick={handleSaveCompany} disabled={updateSettings.isPending}>
                {updateSettings.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Filters Settings */}
        <TabsContent value="filters">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Product Filters</CardTitle>
                <CardDescription>Manage filters displayed on product pages</CardDescription>
              </div>
              <Dialog open={isAddFilterOpen} onOpenChange={setIsAddFilterOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Filter
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Filter</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Filter Name</Label>
                      <Input
                        value={newFilter.filter_name}
                        onChange={(e) => setNewFilter(prev => ({ ...prev, filter_name: e.target.value }))}
                        placeholder="e.g., Brand"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Filter Key</Label>
                      <Input
                        value={newFilter.filter_key}
                        onChange={(e) => setNewFilter(prev => ({ ...prev, filter_key: e.target.value.toLowerCase().replace(/\s/g, "_") }))}
                        placeholder="e.g., brand"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Filter Type</Label>
                      <Select
                        value={newFilter.filter_type}
                        onValueChange={(v) => setNewFilter(prev => ({ ...prev, filter_type: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="select">Dropdown</SelectItem>
                          <SelectItem value="text">Text Input</SelectItem>
                          <SelectItem value="boolean">Yes/No</SelectItem>
                          <SelectItem value="range">Range</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Options (comma-separated)</Label>
                      <Input
                        value={newFilter.options}
                        onChange={(e) => setNewFilter(prev => ({ ...prev, options: e.target.value }))}
                        placeholder="Option 1, Option 2, Option 3"
                      />
                    </div>
                    <Button onClick={handleAddFilter} className="w-full" disabled={addFilter.isPending}>
                      {addFilter.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Add Filter
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {filtersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filters?.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No filters configured. Add your first filter to get started.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Filter Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Enabled</TableHead>
                      <TableHead>Custom</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filters?.map((filter) => (
                      <TableRow key={filter.id}>
                        <TableCell className="font-medium">{filter.filter_name}</TableCell>
                        <TableCell className="text-muted-foreground">{filter.filter_key}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{filter.filter_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={filter.is_enabled}
                            onCheckedChange={(checked) =>
                              updateFilter.mutate({ id: filter.id, is_enabled: checked })
                            }
                          />
                        </TableCell>
                        <TableCell>
                          {filter.is_custom && <Badge variant="secondary">Custom</Badge>}
                        </TableCell>
                        <TableCell>
                          {filter.is_custom && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive"
                              onClick={() => deleteFilter.mutate(filter.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Employees Tab */}
        {canManageEmployees && (
          <TabsContent value="employees">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>Manage employees and their access</CardDescription>
                </div>
                <Dialog open={isAddEmployeeOpen} onOpenChange={setIsAddEmployeeOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Add Employee
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Employee</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Full Name</Label>
                        <Input
                          value={newEmployee.fullName}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, fullName: e.target.value }))}
                          placeholder="Employee name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Email</Label>
                        <Input
                          type="email"
                          value={newEmployee.email}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, email: e.target.value }))}
                          placeholder="employee@example.com"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Password</Label>
                        <Input
                          type="password"
                          value={newEmployee.password}
                          onChange={(e) => setNewEmployee(prev => ({ ...prev, password: e.target.value }))}
                          placeholder="Minimum 6 characters"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Role</Label>
                        <Select
                          value={newEmployee.role}
                          onValueChange={(v) => setNewEmployee(prev => ({ ...prev, role: v as "staff" | "accountant" }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="accountant">Accountant</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddEmployee} className="w-full" disabled={inviteEmployee.isPending}>
                        {inviteEmployee.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Add Employee
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {employeesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : employees?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No team members yet. Add your first employee.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employees?.map((emp) => (
                        <TableRow key={emp.id}>
                          <TableCell className="font-medium">
                            {emp.full_name || "Unnamed"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={emp.role === "admin" ? "default" : "secondary"}>
                              {emp.role}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {new Date(emp.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            {emp.role !== "admin" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8 text-destructive"
                                onClick={() => removeEmployee.mutate(emp.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </DashboardLayout>
  );
};

export default Settings;