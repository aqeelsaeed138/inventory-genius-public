import { useParams, Link } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  Loader2,
  Building2,
  Calendar,
  Truck,
  CheckCircle
} from "lucide-react";
import { usePurchaseOrderDetails, useReceivePurchaseOrder, useCompanyInfo } from "@/hooks/useOrderData";

const PurchaseOrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  
  const { data: order, isLoading } = usePurchaseOrderDetails(id!);
  const { data: company } = useCompanyInfo();
  const receiveOrder = useReceivePurchaseOrder();

  const handleReceive = async () => {
    await receiveOrder.mutateAsync(id!);
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Purchase Order" description="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Purchase Order" description="">
        <div className="text-center py-12">
          <h3 className="font-semibold mb-2">Order not found</h3>
          <Link to="/purchase-orders">
            <Button variant="outline">Back to Purchase Orders</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "received":
        return "default";
      case "confirmed":
        return "secondary";
      case "pending":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout 
      title={`Purchase Order ${order.order_number}`}
      description="View purchase order details"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link to="/purchase-orders">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Purchase Orders
          </Button>
        </Link>
        {(order.status === "pending" || order.status === "confirmed") && (
          <Button onClick={handleReceive} disabled={receiveOrder.isPending}>
            {receiveOrder.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4 mr-2" />
            )}
            Mark as Received
          </Button>
        )}
      </div>

      {/* Order Status Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Truck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <Badge variant={getStatusVariant(order.status)}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Building2 className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Supplier</p>
                <p className="font-medium">{order.supplier?.name}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <Calendar className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date</p>
                <p className="font-medium">{new Date(order.created_at).toLocaleDateString()}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Order Details */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {/* Supplier Info */}
          {order.supplier && (
            <div className="mb-6 p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">Supplier:</span>
              </div>
              <p className="font-semibold">{order.supplier.name}</p>
              {order.supplier.email && (
                <p className="text-sm text-muted-foreground">{order.supplier.email}</p>
              )}
              {order.supplier.phone && (
                <p className="text-sm text-muted-foreground">{order.supplier.phone}</p>
              )}
              {order.supplier.address && (
                <p className="text-sm text-muted-foreground">{order.supplier.address}</p>
              )}
            </div>
          )}

          {/* Items Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-center">Qty</TableHead>
                <TableHead className="text-right">Unit Cost</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {order.items?.map((item: any, index: number) => (
                <TableRow key={item.id}>
                  <TableCell>{index + 1}</TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{item.product?.name || "Product"}</div>
                      {item.product?.sku && (
                        <div className="text-sm text-muted-foreground">SKU: {item.product.sku}</div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">{item.quantity}</TableCell>
                  <TableCell className="text-right">Rs. {Number(item.unit_price).toFixed(2)}</TableCell>
                  <TableCell className="text-right font-medium">Rs. {Number(item.total).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Totals */}
          <div className="flex justify-end mt-6">
            <div className="w-full max-w-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>Rs. {Number(order.subtotal).toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax</span>
                <span>Rs. {Number(order.tax).toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>Rs. {Number(order.total).toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {order.notes && (
            <div className="mt-6 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm font-medium mb-1">Notes:</p>
              <p className="text-sm text-muted-foreground">{order.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default PurchaseOrderDetails;
