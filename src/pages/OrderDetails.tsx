import { useRef } from "react";
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
  Printer, 
  Download, 
  Loader2,
  Building2,
  User,
  Calendar,
  Receipt
} from "lucide-react";
import { useOrderDetails, useCompanyInfo } from "@/hooks/useOrderData";
import { useCompany } from "@/contexts/CompanyContext";

const OrderDetails = () => {
  const { id } = useParams<{ id: string }>();
  const invoiceRef = useRef<HTMLDivElement>(null);
  
  const { data: order, isLoading } = useOrderDetails(id!);
  const { data: company } = useCompanyInfo();
  const { currencySymbol, formatPrice } = useCompany();

  const handlePrint = () => {
    const printContent = invoiceRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${order?.order_number}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; }
            .invoice { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; margin-bottom: 30px; }
            .company-info h1 { margin: 0; font-size: 24px; }
            .invoice-info { text-align: right; }
            .invoice-number { font-size: 20px; font-weight: bold; color: #4f46e5; }
            .customer-section { margin-bottom: 30px; padding: 15px; background: #f9fafb; border-radius: 8px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            th { background: #f9fafb; font-weight: 600; }
            .text-right { text-align: right; }
            .totals { margin-left: auto; width: 300px; }
            .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
            .totals-row.total { font-weight: bold; font-size: 18px; border-top: 2px solid #000; padding-top: 12px; }
            .footer { text-align: center; margin-top: 40px; color: #6b7280; font-size: 14px; }
            @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  };

  const handleDownload = () => {
    handlePrint();
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Order Details" description="">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!order) {
    return (
      <DashboardLayout title="Order Details" description="">
        <div className="text-center py-12">
          <h3 className="font-semibold mb-2">Order not found</h3>
          <Link to="/orders">
            <Button variant="outline">Back to Orders</Button>
          </Link>
        </div>
      </DashboardLayout>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "confirmed":
      case "delivered":
        return "default";
      case "pending":
      case "processing":
        return "secondary";
      case "cancelled":
        return "destructive";
      default:
        return "secondary";
    }
  };

  return (
    <DashboardLayout 
      title={`Order ${order.order_number}`}
      description="View order details and invoice"
    >
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link to="/orders">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Orders
          </Button>
        </Link>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={handleDownload}>
            <Download className="h-4 w-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Order Status Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Receipt className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Order Status</p>
                <Badge variant={getStatusVariant(order.status)}>
                  {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-success/10">
                <Receipt className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Payment Status</p>
                <Badge variant={order.payment_status === "paid" ? "default" : "secondary"}>
                  {order.payment_status.charAt(0).toUpperCase() + order.payment_status.slice(1)}
                </Badge>
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

      {/* Invoice */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Invoice
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div ref={invoiceRef} className="invoice p-6 md:p-8">
            {/* Header */}
            <div className="header flex flex-col md:flex-row justify-between gap-6 mb-8">
              <div className="company-info">
                {company?.logo_url && (
                  <img 
                    src={company.logo_url} 
                    alt={company.name} 
                    className="h-16 w-auto mb-2 object-contain"
                  />
                )}
                <h1 className="text-2xl font-bold">{company?.name || "Company Name"}</h1>
                {company?.address && (
                  <p className="text-muted-foreground">{company.address}</p>
                )}
                {company?.phone && (
                  <p className="text-muted-foreground">Tel: {company.phone}</p>
                )}
                {company?.email && (
                  <p className="text-muted-foreground">{company.email}</p>
                )}
              </div>
              <div className="invoice-info text-left md:text-right">
                <div className="text-2xl font-bold text-primary mb-2">
                  {order.order_number}
                </div>
                <p className="text-muted-foreground">
                  Date: {new Date(order.created_at).toLocaleDateString()}
                </p>
                <p className="text-muted-foreground">
                  Time: {new Date(order.created_at).toLocaleTimeString()}
                </p>
              </div>
            </div>

            {/* Customer Info */}
            {order.customer && (
              <div className="customer-section bg-muted/50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">Bill To:</span>
                </div>
                <p className="font-semibold">{order.customer.name}</p>
                {order.customer.email && (
                  <p className="text-sm text-muted-foreground">{order.customer.email}</p>
                )}
                {order.customer.phone && (
                  <p className="text-sm text-muted-foreground">{order.customer.phone}</p>
                )}
                {order.customer.address && (
                  <p className="text-sm text-muted-foreground">{order.customer.address}</p>
                )}
              </div>
            )}

            {/* Items Table */}
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Qty</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
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
                    <TableCell className="text-right">{formatPrice(Number(item.unit_price))}</TableCell>
                    <TableCell className="text-right font-medium">{formatPrice(Number(item.total))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Totals */}
            <div className="flex justify-end mt-6">
              <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(Number(order.tax))}</span>
                </div>
                {order.discount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Discount</span>
                    <span>-{formatPrice(Number(order.discount))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span>{formatPrice(Number(order.total))}</span>
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

            {/* Footer */}
            <div className="footer text-center mt-8 pt-6 border-t">
              <p className="text-muted-foreground">Thank you for your business!</p>
              <p className="text-sm text-muted-foreground mt-1">
                This is a computer-generated invoice.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
};

export default OrderDetails;
