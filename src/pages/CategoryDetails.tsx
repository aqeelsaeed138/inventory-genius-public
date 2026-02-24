import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  FolderOpen,
  Package,
  DollarSign,
  TrendingUp,
  Loader2,
  Save,
  Plus,
} from "lucide-react";
import { useCategory, useSubcategories, useCategoryProducts, useCategoryAnalytics, useUpdateCategory, useCreateCategoryWithParent } from "@/hooks/useCategoryData";
import { useCategories } from "@/hooks/useCompanyData";
import { AnalyticsChart, AnalyticsStatCard, NoDataMessage } from "@/components/analytics/AnalyticsChart";

const UNIT_OPTIONS = ["pieces", "units", "kg", "g", "liter", "ml", "meter", "cm", "box", "pack"];

const CategoryDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: category, isLoading } = useCategory(id);
  const { data: subcategories } = useSubcategories(id);
  const { data: products } = useCategoryProducts(id);
  const { data: analytics } = useCategoryAnalytics(id);
  const { data: allCategories } = useCategories();
  const updateCategory = useUpdateCategory();
  const createSubcategory = useCreateCategoryWithParent();

  const [isEditing, setIsEditing] = useState(false);
  const [isSubcategoryDialogOpen, setIsSubcategoryDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    is_active: true,
    tax_rate: 0,
    allowed_units: [] as string[],
    parent_id: null as string | null,
  });
  const [newSubcategory, setNewSubcategory] = useState({
    name: "",
    description: "",
    tax_rate: 0,
  });

  const handleEdit = () => {
    if (category) {
      setEditForm({
        name: category.name,
        description: category.description || "",
        is_active: category.is_active,
        tax_rate: Number(category.tax_rate),
        allowed_units: category.allowed_units || [],
        parent_id: category.parent_id,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    await updateCategory.mutateAsync({ id, ...editForm });
    setIsEditing(false);
  };

  const handleCreateSubcategory = async () => {
    if (!id) return;
    await createSubcategory.mutateAsync({
      ...newSubcategory,
      parent_id: id,
    });
    setIsSubcategoryDialogOpen(false);
    setNewSubcategory({ name: "", description: "", tax_rate: 0 });
  };

  const toggleUnit = (unit: string) => {
    setEditForm(prev => ({
      ...prev,
      allowed_units: prev.allowed_units.includes(unit)
        ? prev.allowed_units.filter(u => u !== unit)
        : [...prev.allowed_units, unit]
    }));
  };

  // Get parent category name
  const parentCategory = allCategories?.find(c => c.id === category?.parent_id);

  if (isLoading) {
    return (
      <DashboardLayout title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!category) {
    return (
      <DashboardLayout title="Category Not Found" description="">
        <div className="flex flex-col items-center justify-center py-12">
          <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
          <p>Category not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/categories")}>
            Back to Categories
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={category.name}
      description="Category details and analytics"
    >
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/categories")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Categories
      </Button>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="subcategories">Subcategories</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Category Information</CardTitle>
              {!isEditing ? (
                <Button variant="outline" size="sm" onClick={handleEdit}>
                  Edit
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSave} disabled={updateCategory.isPending}>
                    {updateCategory.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Save
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {isEditing ? (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={editForm.tax_rate}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value) || 0;
                          // Clamp value between 0 and 100
                          const clampedValue = Math.min(100, Math.max(0, value));
                          setEditForm({ ...editForm, tax_rate: clampedValue });
                        }}
                      />
                      <p className="text-xs text-muted-foreground">Enter a value between 0 and 100</p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Parent Category</Label>
                    <Select
                      value={editForm.parent_id || "none"}
                      onValueChange={(value) => setEditForm({ ...editForm, parent_id: value === "none" ? null : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="No parent (Top level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No parent (Top level)</SelectItem>
                        {allCategories?.filter(c => c.id !== id).map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      checked={editForm.is_active}
                      onCheckedChange={(checked) => setEditForm({ ...editForm, is_active: checked })}
                    />
                    <Label>Active</Label>
                    {!editForm.is_active && (
                      <span className="text-sm text-muted-foreground">
                        (All products in this category will be deactivated)
                      </span>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Allowed Units</Label>
                    <div className="flex flex-wrap gap-2">
                      {UNIT_OPTIONS.map((unit) => (
                        <Button
                          key={unit}
                          type="button"
                          variant={editForm.allowed_units.includes(unit) ? "default" : "outline"}
                          size="sm"
                          onClick={() => toggleUnit(unit)}
                        >
                          {unit}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Tax Rate</p>
                      <p className="font-medium">{Number(category.tax_rate)}%</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Parent Category</p>
                      <p className="font-medium">{parentCategory?.name || "None (Top level)"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Products</p>
                      <p className="font-medium">{products?.length || 0}</p>
                    </div>
                  </div>
                  {category.description && (
                    <div>
                      <p className="text-sm text-muted-foreground">Description</p>
                      <p className="mt-1">{category.description}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">Allowed Units</p>
                    <div className="flex flex-wrap gap-2">
                      {(category.allowed_units || []).map((unit: string) => (
                        <Badge key={unit} variant="outline">{unit}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="subcategories" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isSubcategoryDialogOpen} onOpenChange={setIsSubcategoryDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Subcategory
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Subcategory</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Name</Label>
                    <Input
                      value={newSubcategory.name}
                      onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      value={newSubcategory.description}
                      onChange={(e) => setNewSubcategory({ ...newSubcategory, description: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%) - Leave 0 to inherit from parent</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={newSubcategory.tax_rate}
                      onChange={(e) => {
                        const value = parseFloat(e.target.value) || 0;
                        const clampedValue = Math.min(100, Math.max(0, value));
                        setNewSubcategory({ ...newSubcategory, tax_rate: clampedValue });
                      }}
                    />
                    <p className="text-xs text-muted-foreground">Enter a value between 0 and 100</p>
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleCreateSubcategory}
                    disabled={!newSubcategory.name || createSubcategory.isPending}
                  >
                    {createSubcategory.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Create Subcategory"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!subcategories?.length ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">No Subcategories</h3>
                  <p className="text-muted-foreground">Create subcategories to build a hierarchy</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-card rounded-xl border shadow-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Tax Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcategories.map((sub) => (
                    <TableRow key={sub.id}>
                      <TableCell className="font-medium">{sub.name}</TableCell>
                      <TableCell>
                        {Number(sub.tax_rate) > 0 ? `${sub.tax_rate}%` : `Inherited (${category.tax_rate}%)`}
                      </TableCell>
                      <TableCell>
                        <Badge variant={sub.is_active ? "default" : "secondary"}>
                          {sub.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/categories/${sub.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {!products?.length ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">No Products</h3>
                  <p className="text-muted-foreground">Add products to this category</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-card rounded-xl border shadow-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-muted-foreground">{product.sku || "-"}</TableCell>
                      <TableCell className="text-right">${Number(product.price).toFixed(2)}</TableCell>
                      <TableCell className="text-right">{product.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={
                          product.quantity === 0 ? "destructive" :
                          product.quantity <= product.min_stock_level ? "secondary" :
                          "default"
                        }>
                          {product.quantity === 0 ? "Out of Stock" :
                           product.quantity <= product.min_stock_level ? "Low Stock" :
                           "In Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/products/${product.id}`)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {!analytics?.hasData ? (
            <NoDataMessage
              title="No Sales Data"
              message="Start selling products from this category to see analytics"
            />
          ) : (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <AnalyticsStatCard
                  title="Total Products"
                  value={analytics.productCount}
                  icon={<Package className="h-6 w-6 text-primary" />}
                />
                <AnalyticsStatCard
                  title="Total Sales"
                  value={analytics.totalSales}
                  icon={<Package className="h-6 w-6 text-primary" />}
                />
                <AnalyticsStatCard
                  title="Total Revenue"
                  value={analytics.totalRevenue}
                  format="currency"
                  icon={<DollarSign className="h-6 w-6 text-primary" />}
                />
                <AnalyticsStatCard
                  title="Profit"
                  value={analytics.profit}
                  format="currency"
                  icon={<TrendingUp className="h-6 w-6 text-primary" />}
                />
              </div>

              <div className="grid lg:grid-cols-2 gap-6">
                <AnalyticsChart
                  title="Revenue Over Time"
                  data={analytics.salesByMonth}
                  type="line"
                  dataKey="revenue"
                />
                <AnalyticsChart
                  title="Sales Over Time"
                  data={analytics.salesByMonth}
                  type="bar"
                />
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default CategoryDetails;
