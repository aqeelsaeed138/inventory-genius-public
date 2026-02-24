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
  Truck,
  Package,
  DollarSign,
  TrendingUp,
  Star,
  MessageSquare,
  MapPin,
  Phone,
  Mail,
  Loader2,
  Save,
} from "lucide-react";
import { useSupplier, useSupplierProducts, useSupplierComplaints, useSupplierAnalytics, useUpdateSupplier, useUpdateComplaintStatus } from "@/hooks/useSupplierData";
import { AnalyticsChart, AnalyticsStatCard, NoDataMessage } from "@/components/analytics/AnalyticsChart";

const SupplierDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useSupplier(id);
  const { data: products } = useSupplierProducts(id);
  const { data: complaints } = useSupplierComplaints(id);
  const { data: analytics } = useSupplierAnalytics(id);
  const updateSupplier = useUpdateSupplier();
  const updateComplaintStatus = useUpdateComplaintStatus();

  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    location: "",
    rating: 0,
    tax_rate: 0,
  });

  const handleEdit = () => {
    if (supplier) {
      setEditForm({
        name: supplier.name,
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        location: supplier.location || "",
        rating: Number(supplier.rating) || 0,
        tax_rate: Number(supplier.tax_rate) || 0,
      });
      setIsEditing(true);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    await updateSupplier.mutateAsync({ id, ...editForm });
    setIsEditing(false);
  };

  const handleStatusChange = async (complaintId: string, status: string) => {
    await updateComplaintStatus.mutateAsync({ id: complaintId, status });
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Loading..." description="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!supplier) {
    return (
      <DashboardLayout title="Supplier Not Found" description="">
        <div className="flex flex-col items-center justify-center py-12">
          <Truck className="h-12 w-12 text-muted-foreground mb-4" />
          <p>Supplier not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/suppliers")}>
            Back to Suppliers
          </Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={supplier.name}
      description="Supplier details and performance"
    >
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/suppliers")}
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Suppliers
      </Button>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="complaints">Complaints</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {supplier.email && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{supplier.email}</p>
                    </div>
                  </div>
                )}
                {supplier.phone && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Phone className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Phone</p>
                      <p className="font-medium">{supplier.phone}</p>
                    </div>
                  </div>
                )}
                {(supplier.address || supplier.location) && (
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <MapPin className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Location</p>
                      <p className="font-medium">{supplier.location || supplier.address}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supplier Info */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">Supplier Information</CardTitle>
                {!isEditing ? (
                  <Button variant="outline" size="sm" onClick={handleEdit}>
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} disabled={updateSupplier.isPending}>
                      {updateSupplier.isPending ? (
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
                      <Label>Email</Label>
                      <Input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="+92 3XX XXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        value={editForm.location}
                        onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rating (0-5)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="5"
                        step="0.1"
                        value={editForm.rating}
                        onChange={(e) => setEditForm({ ...editForm, rating: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tax Rate (%)</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        step="0.1"
                        value={editForm.tax_rate}
                        onChange={(e) => setEditForm({ ...editForm, tax_rate: Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)) })}
                        placeholder="0"
                      />
                      <p className="text-xs text-muted-foreground">Applied to purchase orders</p>
                    </div>
                    <div className="md:col-span-2 space-y-2">
                      <Label>Address</Label>
                      <Textarea
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Products</p>
                        <p className="text-2xl font-bold">{products?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Complaints</p>
                        <p className="text-2xl font-bold">{complaints?.length || 0}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Rating</p>
                        <div className="flex items-center gap-2">
                          <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                          <span className="text-2xl font-bold">
                            {Number(supplier.rating || 0).toFixed(1)}
                          </span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Tax Rate</p>
                        <p className="text-2xl font-bold">{Number(supplier.tax_rate || 0).toFixed(1)}%</p>
                      </div>
                    </div>
                    {supplier.address && (
                      <div className="pt-4 border-t">
                        <p className="text-sm text-muted-foreground">Full Address</p>
                        <p className="mt-1">{supplier.address}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          {!products?.length ? (
            <Card className="border-dashed">
              <CardContent className="py-12">
                <div className="flex flex-col items-center justify-center text-center">
                  <Package className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold mb-1">No Products</h3>
                  <p className="text-muted-foreground">This supplier has no products linked</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="bg-card rounded-xl border shadow-card overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
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
                      <TableCell>{product.category?.name || "-"}</TableCell>
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

        <TabsContent value="complaints" className="space-y-6">
          {!complaints?.length ? (
            <NoDataMessage
              title="No Complaints"
              message="No complaints have been filed against this supplier"
            />
          ) : (
            <div className="space-y-4">
              {complaints.map((complaint: any) => (
                <Card key={complaint.id}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="h-4 w-4 text-muted-foreground" />
                          <h4 className="font-semibold">{complaint.subject}</h4>
                        </div>
                        <p className="text-muted-foreground">{complaint.description}</p>
                        {complaint.product && (
                          <p className="text-sm text-muted-foreground mt-2">
                            Product: {complaint.product.name}
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1">
                          Filed: {new Date(complaint.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Select
                          value={complaint.status}
                          onValueChange={(value) => handleStatusChange(complaint.id, value)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {!analytics?.hasData ? (
            <NoDataMessage
              title="No Purchase Data"
              message="Start selling products from this supplier to see analytics"
            />
          ) : (
            <>
              <div className="grid md:grid-cols-4 gap-4">
                <AnalyticsStatCard
                  title="Products"
                  value={analytics.productCount}
                  icon={<Package className="h-6 w-6 text-primary" />}
                />
                <AnalyticsStatCard
                  title="Total Sales"
                  value={analytics.totalSales}
                  icon={<Package className="h-6 w-6 text-primary" />}
                />
                <AnalyticsStatCard
                  title="Revenue Generated"
                  value={analytics.totalRevenue}
                  format="currency"
                  icon={<DollarSign className="h-6 w-6 text-primary" />}
                />
                <AnalyticsStatCard
                  title="Complaints"
                  value={analytics.complaintsCount}
                  icon={<MessageSquare className="h-6 w-6 text-primary" />}
                />
              </div>

              <AnalyticsChart
                title="Purchase History"
                data={analytics.purchasesByMonth.map(p => ({ month: p.month, revenue: p.cost, sales: p.quantity }))}
                type="bar"
              />
            </>
          )}
        </TabsContent>
      </Tabs>
    </DashboardLayout>
  );
};

export default SupplierDetails;
