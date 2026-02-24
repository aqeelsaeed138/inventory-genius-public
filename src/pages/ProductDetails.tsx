import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
  ArrowLeft,
  Package,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  Star,
  MessageSquare,
  Loader2,
  Save,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { useProduct, useProductAnalytics, useUpdateProduct, useProductComplaints, useCreateComplaint } from "@/hooks/useProductData";
import { useCategories, useSuppliers } from "@/hooks/useCompanyData";
import { AnalyticsChart, AnalyticsStatCard, NoDataMessage } from "@/components/analytics/AnalyticsChart";

const ProductDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: product, isLoading } = useProduct(id);
  const { data: analytics } = useProductAnalytics(id);
  const { data: complaints } = useProductComplaints(id);
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();
  const updateProduct = useUpdateProduct();
  const createComplaint = useCreateComplaint();

  const [isEditing, setIsEditing] = useState(false);
  const [isComplaintDialogOpen, setIsComplaintDialogOpen] = useState(false);
  const [isOrderDialogOpen, setIsOrderDialogOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    sku: "",
    description: "",
    price: 0,
    cost_price: 0,
    quantity: 0,
    min_stock_level: 10,
    category_id: "",
    supplier_id: "",
    image_url: "",
  });
  const [complaintForm, setComplaintForm] = useState({
    subject: "",
    description: "",
  });
  const [orderQuantity, setOrderQuantity] = useState(0);

  const handleEdit = () => {
    if (product) {
      setEditForm({
        name: product.name,
        sku: product.sku || "",
        description: product.description || "",
        price: Number(product.price),
        cost_price: Number(product.cost_price),
        quantity: product.quantity,
        min_stock_level: product.min_stock_level,
        category_id: product.category_id || "",
        supplier_id: product.supplier_id || "",
        image_url: product.image_url || "",
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    await updateProduct.mutateAsync({ id, ...editForm });
    setIsEditing(false);
  };

  const handleSubmitComplaint = async () => {
    if (!product?.supplier_id || !id) return;
    await createComplaint.mutateAsync({
      supplier_id: product.supplier_id,
      product_id: id,
      subject: complaintForm.subject,
      description: complaintForm.description,
    });
    setIsComplaintDialogOpen(false);
    setComplaintForm({ subject: "", description: "" });
  };

  const handleOrderStock = async () => {
    if (!id || orderQuantity <= 0) return;
    await updateProduct.mutateAsync({
      id,
      quantity: (product?.quantity || 0) + orderQuantity,
    });
    setIsOrderDialogOpen(false);
    setOrderQuantity(0);
  };

  const isOutOfStock = product?.quantity === 0;
  const isLowStock = product && product.quantity <= product.min_stock_level && product.quantity > 0;
  const taxRate = product?.category?.tax_rate || 0;

  if (isLoading) {
    return (
      <DashboardLayout title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!product) {
    return (
      <DashboardLayout title="Product Not Found" description="">
        <div className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <p>Product not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/products")}>
            Back to Products
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={product.name}
      description="Product details and analytics"
    >
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/products")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Products
      </Button>

      {isOutOfStock && (
        <Alert variant="destructive" className="mb-6">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Out of Stock</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>This product is currently out of stock.</span>
            <Dialog open={isOrderDialogOpen} onOpenChange={setIsOrderDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Order Stock
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Order More Stock</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Quantity to Add</Label>
                    <Input
                      type="number"
                      min="1"
                      value={orderQuantity}
                      onChange={(e) => setOrderQuantity(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <Button onClick={handleOrderStock} disabled={orderQuantity <= 0}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add to Inventory
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </AlertDescription>
        </Alert>
      )}

      {isLowStock && (
        <Alert className="mb-6 border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4 text-warning" />
          <AlertTitle className="text-warning">Low Stock Warning</AlertTitle>
          <AlertDescription>
            Only {product.quantity} units left. Minimum stock level is {product.min_stock_level}.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          {/* Reviews tab hidden - code maintained for future use */}
          {/* <TabsTrigger value="reviews">Reviews</TabsTrigger> */}
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Product Image */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Product Image</CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <Input
                      placeholder="Enter image URL"
                      value={editForm.image_url}
                      onChange={(e) => setEditForm({ ...editForm, image_url: e.target.value })}
                    />
                    {editForm.image_url && (
                      <img
                        src={editForm.image_url}
                        alt={product.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    )}
                  </div>
                ) : product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-muted rounded-lg flex items-center justify-center">
                    <Package className="h-16 w-16 text-muted-foreground" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Info */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Product Information</CardTitle>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateProduct.isPending}>
                      {updateProduct.isPending ? (
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
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Name</Label>
                      <Input
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>SKU</Label>
                      <Input
                        value={editForm.sku}
                        onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Price</Label>
                      <Input
                        type="number"
                        value={editForm.price}
                        onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Cost Price</Label>
                      <Input
                        type="number"
                        value={editForm.cost_price}
                        onChange={(e) => setEditForm({ ...editForm, cost_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        value={editForm.quantity}
                        onChange={(e) => setEditForm({ ...editForm, quantity: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Min Stock Level</Label>
                      <Input
                        type="number"
                        value={editForm.min_stock_level}
                        onChange={(e) => setEditForm({ ...editForm, min_stock_level: parseInt(e.target.value) || 10 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={editForm.category_id}
                        onValueChange={(value) => setEditForm({ ...editForm, category_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories?.map((cat) => (
                            <SelectItem key={cat.id} value={cat.id}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Supplier</Label>
                      <Select
                        value={editForm.supplier_id}
                        onValueChange={(value) => setEditForm({ ...editForm, supplier_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select supplier" />
                        </SelectTrigger>
                        <SelectContent>
                          {suppliers?.map((sup) => (
                            <SelectItem key={sup.id} value={sup.id}>
                              {sup.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Description</Label>
                      <Textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">SKU</p>
                        <p className="font-medium">{product.sku || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium">{product.category?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Supplier</p>
                        <p className="font-medium">{product.supplier?.name || "-"}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Status</p>
                        <Badge variant={isOutOfStock ? "destructive" : isLowStock ? "secondary" : "default"}>
                          {isOutOfStock ? "Out of Stock" : isLowStock ? "Low Stock" : "In Stock"}
                        </Badge>
                      </div>
                    </div>
                    <div className="grid md:grid-cols-4 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-sm text-muted-foreground">Price</p>
                        <p className="text-xl font-bold">${Number(product.price).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Cost</p>
                        <p className="text-xl font-bold">${Number(product.cost_price).toFixed(2)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Quantity</p>
                        <p className="text-xl font-bold">{product.quantity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tax Rate</p>
                        <p className="text-xl font-bold">{taxRate}%</p>
                      </div>
                    </div>
                    {product.description && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="mt-1">{product.description}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {!analytics?.hasData ? (
            <NoDataMessage
              title="No Sales Data"
              message="Start selling this product to see analytics here"
            />
          ) : (
            <>
              <div className="grid md:grid-cols-4 gap-4">
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
                <AnalyticsStatCard
                  title="Profit Margin"
                  value={analytics.profitMargin}
                  format="percent"
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

        {/* Reviews TabContent hidden - code maintained for future use
        <TabsContent value="reviews" className="space-y-6">
          {!analytics?.reviews?.length ? (
            <NoDataMessage
              title="No Reviews Yet"
              message="Customer reviews will appear here"
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center gap-2">
                  <Star className="h-8 w-8 text-yellow-500 fill-yellow-500" />
                  <span className="text-3xl font-bold">{analytics.avgRating.toFixed(1)}</span>
                </div>
                <span className="text-muted-foreground">
                  Based on {analytics.reviews.length} reviews
                </span>
              </div>
              {analytics.reviews.map((review: any) => (
                <Card key={review.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      {[...Array(5)].map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < review.rating ? "text-yellow-500 fill-yellow-500" : "text-muted"}`}
                        />
                      ))}
                    </div>
                    <p>{review.review_text || "No comment"}</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        */}

        <TabsContent value="complaints" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isComplaintDialogOpen} onOpenChange={setIsComplaintDialogOpen}>
              <DialogTrigger asChild>
                <Button disabled={!product.supplier_id}>
                  <MessageSquare className="h-4 w-4 mr-2" />
                  File Complaint
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Submit Complaint to Supplier</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Subject</Label>
                    <Input
                      placeholder="Brief subject of complaint"
                      value={complaintForm.subject}
                      onChange={(e) => setComplaintForm({ ...complaintForm, subject: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Describe the issue in detail"
                      value={complaintForm.description}
                      onChange={(e) => setComplaintForm({ ...complaintForm, description: e.target.value })}
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={handleSubmitComplaint}
                    disabled={!complaintForm.subject || !complaintForm.description || createComplaint.isPending}
                  >
                    {createComplaint.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Submit Complaint"
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {!complaints?.length ? (
            <NoDataMessage
              title="No Complaints"
              message="File a complaint to report issues with this product"
            />
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint: any) => (
                <Card key={complaint.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold">{complaint.subject}</h4>
                        <p className="text-muted-foreground mt-1">{complaint.description}</p>
                        <p className="text-sm text-muted-foreground mt-2">
                          To: {complaint.supplier?.name} • {new Date(complaint.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={
                        complaint.status === "resolved" ? "default" :
                        complaint.status === "in_progress" ? "secondary" :
                        complaint.status === "closed" ? "outline" :
                        "destructive"
                      }>
                        {complaint.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default ProductDetails;
