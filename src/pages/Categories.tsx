import { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import { Plus, Search, FolderOpen, Loader2, ChevronRight, Filter, X } from "lucide-react";
import { useCategories, useCreateCategory } from "@/hooks/useCompanyData";
import { useCategoryHierarchy } from "@/hooks/useCategoryData";
import { categorySchema, validateForm } from "@/lib/validations";

const Categories = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [newCategory, setNewCategory] = useState({
    name: "",
    description: "",
    parent_id: "",
    tax_rate: 0,
  });

  const { data: categories, isLoading } = useCategories();
  const { data: categoryHierarchy } = useCategoryHierarchy();
  const createCategory = useCreateCategory();

  const filteredCategories = categories?.filter((category) => {
    const matchesSearch = category.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesStatus = true;
    if (statusFilter === "active") {
      matchesStatus = category.is_active === true;
    } else if (statusFilter === "inactive") {
      matchesStatus = category.is_active === false;
    }
    
    return matchesSearch && matchesStatus;
  });

  const hasActiveFilters = statusFilter !== "all" || searchQuery;

  const clearFilters = () => {
    setStatusFilter("all");
    setSearchQuery("");
  };

  const validateFormData = () => {
    const result = validateForm(categorySchema, newCategory);
    
    if (result.success) {
      setErrors({});
      return true;
    } else if (result.success === false) {
      setErrors(result.errors);
      return false;
    }
    return false;
  };

  const handleCreateCategory = async () => {
    if (!validateFormData()) return;
    
    const categoryData: any = {
      name: newCategory.name,
      description: newCategory.description,
    };
    
    // Only include parent_id if it's set
    if (newCategory.parent_id && newCategory.parent_id !== "none") {
      categoryData.parent_id = newCategory.parent_id;
    }
    
    await createCategory.mutateAsync(categoryData);
    setIsDialogOpen(false);
    setErrors({});
    setNewCategory({ name: "", description: "", parent_id: "", tax_rate: 0 });
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setErrors({});
    }
  };

  const handleFieldChange = (field: string, value: string | number) => {
    setNewCategory(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  // Get parent category name
  const getParentName = (parentId: string | null) => {
    if (!parentId) return null;
    const parent = categories?.find(c => c.id === parentId);
    return parent?.name || null;
  };

  // Build breadcrumb path for a category
  const getCategoryPath = (categoryId: string): string[] => {
    const path: string[] = [];
    let currentId: string | null = categoryId;
    
    while (currentId) {
      const category = categories?.find(c => c.id === currentId);
      if (category) {
        path.unshift(category.name);
        currentId = category.parent_id;
      } else {
        break;
      }
    }
    
    return path;
  };

  return (
    <DashboardLayout title="Categories" description="Organize your products into categories">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2 flex-1">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search categories..."
              className="pl-9"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          
          {hasActiveFilters && (
            <Button variant="ghost" size="icon" onClick={clearFilters}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Category Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="Enter category name"
                  value={newCategory.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-destructive">{errors.name}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Parent Category (Optional)</Label>
                <Select
                  value={newCategory.parent_id || "none"}
                  onValueChange={(value) => setNewCategory({ ...newCategory, parent_id: value === "none" ? "" : value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="No parent (Top level)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No parent (Top level)</SelectItem>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Select a parent to create a subcategory
                </p>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Enter description (optional)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                />
              </div>
              <Button 
                className="w-full" 
                onClick={handleCreateCategory}
                disabled={createCategory.isPending}
              >
                {createCategory.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Category"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="bg-card rounded-xl border shadow-card overflow-x-auto">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : filteredCategories?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-semibold mb-1">No categories found</h3>
            <p className="text-muted-foreground text-sm">
              {searchQuery ? "Try adjusting your search" : "Add your first category to get started"}
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Hierarchy</TableHead>
                <TableHead>Tax Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCategories?.map((category) => {
                const path = getCategoryPath(category.id);
                return (
                  <TableRow 
                    key={category.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/categories/${category.id}`)}
                  >
                    <TableCell className="font-medium">{category.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        {path.map((name, i) => (
                          <span key={i} className="flex items-center">
                            {i > 0 && <ChevronRight className="h-3 w-3 mx-1" />}
                            <span className={i === path.length - 1 ? "text-foreground font-medium" : ""}>
                              {name}
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {Number(category.tax_rate) > 0 ? `${category.tax_rate}%` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={category.is_active ? "default" : "secondary"}>
                        {category.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {new Date(category.created_at).toLocaleDateString()}
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

export default Categories;
