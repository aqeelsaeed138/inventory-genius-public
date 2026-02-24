import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, Loader2, Filter, X, Upload, RefreshCw } from "lucide-react";
import { useProducts, useCategories, useSuppliers, useCreateProduct } from "@/hooks/useCompanyData";
import { useCategoryHierarchy } from "@/hooks/useCategoryData";
import { useCompany } from "@/contexts/CompanyContext";
import { CSVImportDialog } from "@/components/products/CSVImportDialog";
import { productSchema, validateForm } from "@/lib/validations";
import { generateSKU } from "@/lib/skuGenerator";

const Products = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    description: "",
    price: 0,
    cost_price: 0,
    quantity: 0,
    min_stock_level: 10,
    category_id: "",
    supplier_id: "",
  });

  const { data: products, isLoading } = useProducts();
  const { data: categories } = useCategories();
  const { data: categoryHierarchy } = useCategoryHierarchy();
  const { data: suppliers } = useSuppliers();
  const createProduct = useCreateProduct();
  const { formatPrice } = useCompany();

  // Filter products
  const filteredProducts = products?.filter((product) => {
    // Search filter
    const matchesSearch = 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.sku?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Stock filter
    let matchesStock = true;
    if (stockFilter === "in-stock") {
      matchesStock = product.quantity > product.min_stock_level;
    } else if (stockFilter === "low-stock") {
      matchesStock = product.quantity > 0 && product.quantity <= product.min_stock_level;
    } else if (stockFilter === "out-of-stock") {
      matchesStock = product.quantity === 0;
    }
    
    // Category filter
    let matchesCategory = true;
    if (categoryFilter !== "all") {
      matchesCategory = product.category_id === categoryFilter;
    }
    
    return matchesSearch && matchesStock && matchesCategory;
  });

  const validateFormData = () => {
    const result = validateForm(productSchema, newProduct);
    
    if (result.success) {
      setErrors({});
      return true;
    } else if (result.success === false) {
      setErrors(result.errors);
      return false;
    }
    return false;
  };

  const handleCreateProduct = async () => {
    if (!validateFormData()) return;
    
    await createProduct.mutateAsync(newProduct);
    setIsDialogOpen(false);
    setErrors({});
    setNewProduct({
      name: "",
      sku: "",
      description: "",
      price: 0,
      cost_price: 0,
      quantity: 0,
      min_stock_level: 10,
      category_id: "",
      supplier_id: "",
    });
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setErrors({});
    }
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setNewProduct(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Get category name by ID
  const getCategoryName = (categoryId: string): string | undefined => {
    return categories?.find(c => c.id === categoryId)?.name;
  };

  // Auto-generate SKU when name or category changes
  const regenerateSKU = () => {
    const categoryName = newProduct.category_id ? getCategoryName(newProduct.category_id) : undefined;
    const newSku = generateSKU(newProduct.name, categoryName);
    setNewProduct(prev => ({ ...prev, sku: newSku }));
  };

  // Auto-generate SKU when name changes and SKU is empty or was auto-generated
  useEffect(() => {
    if (newProduct.name && !newProduct.sku) {
      regenerateSKU();
    }
  }, [newProduct.name]);

  // Regenerate SKU when category changes (if name exists)
  useEffect(() => {
    if (newProduct.name && newProduct.category_id) {
      regenerateSKU();
    }
  }, [newProduct.category_id]);

  const getStockStatus = (quantity: number, minStock: number) => {
    if (quantity === 0) return { label: "Out of Stock", variant: "destructive" as const };
    if (quantity <= minStock) return { label: "Low Stock", variant: "warning" as const };
    return { label: "In Stock", variant: "success" as const };
  };

  const clearFilters = () => {
    setStockFilter("all");
    setCategoryFilter("all");
    setSearchQuery("");
  };

  const hasActiveFilters = stockFilter !== "all" || categoryFilter !== "all" || searchQuery;

  // Flatten category hierarchy for select
  const flattenCategories = (categories: any[], prefix = ""): { id: string; name: string }[] => {
    return categories.flatMap(cat => [
      { id: cat.id, name: prefix + cat.name },
      ...flattenCategories(cat.children || [], prefix + "  ")
    ]);
  };

  const flatCategories = categoryHierarchy ? flattenCategories(categoryHierarchy) : [];

  return (
    <DashboardLayout title="Products" description="Manage your product inventory">
      <div className="flex flex-col gap-4 mb-6">
        {/* Filters Row */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Select value={stockFilter} onValueChange={setStockFilter}>
              <SelectTrigger className="w-[160px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Stock Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Stock</SelectItem>
                <SelectItem value="in-stock">In Stock</SelectItem>
                <SelectItem value="low-stock">Low Stock</SelectItem>
                <SelectItem value="out-of-stock">Out of Stock</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {flatCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          <div className="flex gap-2 md:ml-auto">
            <CSVImportDialog
              trigger={
                <Button variant="outline">
                  <Upload className="h-4 w-4 mr-2" />
                  Import CSV
                </Button>
              }
            />
            
            <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Product Name <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder="Enter product name"
                    value={newProduct.name}
                    onChange={(e) => handleFieldChange("name", e.target.value)}
                    className={errors.name ? "border-destructive" : ""}
                  />
                  {errors.name && (
                    <p className="text-sm text-destructive">{errors.name}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>SKU</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Auto-generated from name & category"
                      value={newProduct.sku}
                      onChange={(e) => handleFieldChange("sku", e.target.value)}
                      className={errors.sku ? "border-destructive flex-1" : "flex-1"}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={regenerateSKU}
                      title="Regenerate SKU"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Auto-generated based on product name and category</p>
                  {errors.sku && (
                    <p className="text-sm text-destructive">{errors.sku}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      value={newProduct.price}
                      onChange={(e) => handleFieldChange("price", parseFloat(e.target.value) || 0)}
                      className={errors.price ? "border-destructive" : ""}
                    />
                    {errors.price && (
                      <p className="text-sm text-destructive">{errors.price}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Cost Price</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      min="0"
                      value={newProduct.cost_price}
                      onChange={(e) => handleFieldChange("cost_price", parseFloat(e.target.value) || 0)}
                      className={errors.cost_price ? "border-destructive" : ""}
                    />
                    {errors.cost_price && (
                      <p className="text-sm text-destructive">{errors.cost_price}</p>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      min="0"
                      value={newProduct.quantity}
                      onChange={(e) => handleFieldChange("quantity", parseInt(e.target.value) || 0)}
                      className={errors.quantity ? "border-destructive" : ""}
                    />
                    {errors.quantity && (
                      <p className="text-sm text-destructive">{errors.quantity}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>Min Stock Level</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      min="0"
                      value={newProduct.min_stock_level}
                      onChange={(e) => handleFieldChange("min_stock_level", parseInt(e.target.value) || 10)}
                      className={errors.min_stock_level ? "border-destructive" : ""}
                    />
                    {errors.min_stock_level && (
                      <p className="text-sm text-destructive">{errors.min_stock_level}</p>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Category <span className="text-destructive">*</span></Label>
                  <Select
                    value={newProduct.category_id}
                    onValueChange={(value) => handleFieldChange("category_id", value)}
                  >
                    <SelectTrigger className={errors.category_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {flatCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.category_id && (
                    <p className="text-sm text-destructive">{errors.category_id}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Supplier <span className="text-destructive">*</span></Label>
                  <Select
                    value={newProduct.supplier_id}
                    onValueChange={(value) => handleFieldChange("supplier_id", value)}
                  >
                    <SelectTrigger className={errors.supplier_id ? "border-destructive" : ""}>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.supplier_id && (
                    <p className="text-sm text-destructive">{errors.supplier_id}</p>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  onClick={handleCreateProduct}
                  disabled={createProduct.isPending}
                >
                  {createProduct.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Product"
                  )}
                </Button>
              </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredProducts?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No products found</h3>
            <p className="text-muted-foreground text-sm">
              {hasActiveFilters ? "Try adjusting your filters" : "Add your first product to get started"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" className="mt-4" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Product</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Quantity</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProducts?.map((product) => {
                const status = getStockStatus(product.quantity, product.min_stock_level);
                return (
                  <TableRow 
                    key={product.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/products/${product.id}`)}
                  >
                    <TableCell>
                      <div className="font-medium">{product.name}</div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {product.sku || "-"}
                    </TableCell>
                    <TableCell>{product.category?.name || "-"}</TableCell>
                    <TableCell className="text-right">
                      {formatPrice(Number(product.price))}
                    </TableCell>
                    <TableCell className="text-right">{product.quantity}</TableCell>
                    <TableCell>
                      <Badge variant={status.variant === "success" ? "default" : status.variant === "warning" ? "secondary" : "destructive"}>
                        {status.label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </div>
    </DashboardLayout>
  );
};

export default Products;
