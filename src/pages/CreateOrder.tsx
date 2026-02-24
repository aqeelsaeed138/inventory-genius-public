import { useState, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  UserPlus, 
  ShoppingCart,
  Loader2,
  Package,
  Printer,
  CheckCircle,
  CreditCard,
  Banknote,
  Wallet
} from "lucide-react";
import { useProducts, useCustomers, useCreateCustomer, useCategories } from "@/hooks/useCompanyData";
import { useCreateSalesOrder, useCompanyInfo } from "@/hooks/useOrderData";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";

interface CartItem {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  tax_rate: number;
  available_stock: number;
}

type PaymentMethod = "cash" | "card" | "wallet";

const CreateOrder = () => {
  const navigate = useNavigate();
  const receiptRef = useRef<HTMLDivElement>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discount, setDiscount] = useState(0);
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<any>(null);
  const [newCustomer, setNewCustomer] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
  });

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: customers } = useCustomers();
  const { data: categories } = useCategories();
  const { data: company } = useCompanyInfo();
  const createOrder = useCreateSalesOrder();
  const createCustomer = useCreateCustomer();
  const { formatPrice, currencySymbol } = useCompany();

  const selectedCustomerData = customers?.find(c => c.id === selectedCustomer);

  // Filter available products (in stock)
  const availableProducts = useMemo(() => {
    return products?.filter((p) => 
      p.is_active && 
      p.quantity > 0 &&
      (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
       p.sku?.toLowerCase().includes(searchQuery.toLowerCase()))
    ) || [];
  }, [products, searchQuery]);

  // Get tax rate from category
  const getProductTaxRate = (productId: string) => {
    const product = products?.find(p => p.id === productId);
    if (product?.category_id) {
      const category = categories?.find(c => c.id === product.category_id);
      return category?.tax_rate || 0;
    }
    return 0;
  };

  const addToCart = (product: typeof products[0]) => {
    const existing = cart.find((item) => item.product_id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.quantity) {
        toast.error("Cannot add more than available stock");
        return;
      }
      setCart(cart.map((item) =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, {
        product_id: product.id,
        name: product.name,
        sku: product.sku || "",
        quantity: 1,
        unit_price: product.price,
        tax_rate: getProductTaxRate(product.id),
        available_stock: product.quantity,
      }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(cart.map((item) => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        if (newQty > item.available_stock) {
          toast.error("Cannot exceed available stock");
          return item;
        }
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(cart.filter((item) => item.product_id !== productId));
  };

  const subtotal = cart.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const taxAmount = cart.reduce((acc, item) => {
    const itemTotal = item.quantity * item.unit_price;
    return acc + (itemTotal * (item.tax_rate / 100));
  }, 0);
  const total = subtotal + taxAmount - discount;

  const handleCreateCustomer = async () => {
    if (!newCustomer.name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    const customer = await createCustomer.mutateAsync(newCustomer);
    setSelectedCustomer(customer.id);
    setIsCustomerDialogOpen(false);
    setNewCustomer({ name: "", email: "", phone: "", address: "" });
  };

  const handleConfirmOrder = () => {
    if (cart.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }
    setIsConfirmDialogOpen(true);
  };

  const handleCreateOrder = async () => {
    try {
      const orderData = await createOrder.mutateAsync({
        customer_id: selectedCustomer || undefined,
        items: cart.map((item) => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          tax_rate: item.tax_rate,
        })),
        discount,
        notes: notes ? `${notes} | Payment: ${paymentMethod.toUpperCase()}` : `Payment: ${paymentMethod.toUpperCase()}`,
      });

      setCompletedOrder({
        ...orderData,
        items: cart,
        customer: selectedCustomerData,
        payment_method: paymentMethod,
      });
      setIsConfirmDialogOpen(false);
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const handlePrintReceipt = () => {
    const printContent = receiptRef.current;
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Receipt - ${completedOrder?.order_number || 'Order'}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Courier New', monospace; 
              padding: 10px;
              max-width: 300px;
              margin: 0 auto;
            }
            .receipt { text-align: center; }
            .shop-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
            .shop-info { font-size: 11px; color: #666; margin-bottom: 10px; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .order-info { font-size: 12px; text-align: left; margin-bottom: 10px; }
            .items { text-align: left; font-size: 11px; }
            .item { display: flex; justify-content: space-between; margin: 4px 0; }
            .item-name { flex: 1; }
            .item-qty { width: 30px; text-align: center; }
            .item-price { width: 70px; text-align: right; }
            .totals { text-align: right; margin-top: 10px; font-size: 12px; }
            .total-row { display: flex; justify-content: space-between; margin: 3px 0; }
            .grand-total { font-weight: bold; font-size: 14px; margin-top: 5px; }
            .footer { text-align: center; margin-top: 15px; font-size: 11px; }
            .thank-you { font-weight: bold; margin-top: 10px; }
            @media print { 
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              @page { margin: 0; size: 80mm auto; }
            }
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

  const handleNewOrder = () => {
    setCompletedOrder(null);
    setCart([]);
    setSelectedCustomer("");
    setDiscount(0);
    setNotes("");
    setPaymentMethod("cash");
  };

  return (
    <DashboardLayout 
      title="Create Sales Order" 
      description="Add products and complete the sale"
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Package className="h-5 w-5" />
                Select Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or SKU..."
                  className="pl-9"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : availableProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No products match your search" : "No products available"}
                </div>
              ) : (
                <div className="grid gap-2 max-h-[400px] overflow-y-auto">
                  {availableProducts.map((product) => {
                    const inCart = cart.find((item) => item.product_id === product.id);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {product.quantity <= (product.min_stock_level || 10) && (
                              <Badge variant="secondary" className="text-xs">Low Stock</Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {product.sku || "N/A"} • Stock: {product.quantity} • {formatPrice(product.price)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={inCart ? "secondary" : "default"}
                          onClick={() => addToCart(product)}
                          disabled={inCart && inCart.quantity >= product.quantity}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {inCart ? `Added (${inCart.quantity})` : "Add"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Cart */}
          {cart.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Items ({cart.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Tax</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cart.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.sku}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product_id, -1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-8 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product_id, 1)}
                              disabled={item.quantity >= item.available_stock}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {formatPrice(item.unit_price)}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.tax_rate}%
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(item.quantity * item.unit_price)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromCart(item.product_id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Summary */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={selectedCustomer || "walk-in"} 
                onValueChange={(value) => setSelectedCustomer(value === "walk-in" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Walk-in Customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                  {customers?.filter(customer => customer.id).map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Dialog open={isCustomerDialogOpen} onOpenChange={setIsCustomerDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add New Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Customer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Name <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="Customer name"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({ ...newCustomer, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        placeholder="+92 3XX XXXXXXX"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({ ...newCustomer, phone: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="email@example.com"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({ ...newCustomer, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Textarea
                        placeholder="Address (optional)"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
                      />
                    </div>
                    <Button 
                      className="w-full" 
                      onClick={handleCreateCustomer}
                      disabled={createCustomer.isPending}
                    >
                      {createCustomer.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : "Add Customer"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax</span>
                  <span>{formatPrice(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <Input
                    type="number"
                    min="0"
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                    className="w-24 h-8 text-right"
                  />
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>{formatPrice(total)}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  placeholder="Order notes (optional)"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Payment Method */}
              <div className="space-y-2">
                <Label>Payment Method</Label>
                <div className="grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant={paymentMethod === "cash" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod("cash")}
                    className="flex flex-col h-auto py-3"
                  >
                    <Banknote className="h-4 w-4 mb-1" />
                    <span className="text-xs">Cash</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "card" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod("card")}
                    className="flex flex-col h-auto py-3"
                  >
                    <CreditCard className="h-4 w-4 mb-1" />
                    <span className="text-xs">Card</span>
                  </Button>
                  <Button
                    type="button"
                    variant={paymentMethod === "wallet" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPaymentMethod("wallet")}
                    className="flex flex-col h-auto py-3"
                  >
                    <Wallet className="h-4 w-4 mb-1" />
                    <span className="text-xs">Wallet</span>
                  </Button>
                </div>
              </div>

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleConfirmOrder}
                disabled={cart.length === 0 || createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Complete Sale ({formatPrice(total)})
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Order</DialogTitle>
            <DialogDescription>
              Review order details before completing the sale
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{cart.length} product(s)</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span>{selectedCustomerData?.name || "Walk-in Customer"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Payment</span>
                <span className="capitalize">{paymentMethod}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tax</span>
                <span>{formatPrice(taxAmount)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Discount</span>
                  <span>-{formatPrice(discount)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateOrder} disabled={createOrder.isPending}>
              {createOrder.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm & Complete
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Order Complete Dialog with Receipt */}
      <Dialog open={!!completedOrder} onOpenChange={() => {}}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Order Completed!
            </DialogTitle>
          </DialogHeader>
          
          {/* Receipt Preview */}
          <div className="border rounded-lg p-4 bg-white max-h-[400px] overflow-y-auto">
            <div ref={receiptRef} className="receipt">
              <div className="shop-name">{company?.name || "Shop Name"}</div>
              <div className="shop-info">
                {company?.address && <div>{company.address}</div>}
                {company?.phone && <div>Tel: {company.phone}</div>}
              </div>
              
              <div className="divider"></div>
              
              <div className="order-info">
                <div><strong>Invoice:</strong> {completedOrder?.order_number}</div>
                <div><strong>Date:</strong> {new Date().toLocaleString()}</div>
                {completedOrder?.customer && (
                  <div><strong>Customer:</strong> {completedOrder.customer.name}</div>
                )}
                <div><strong>Payment:</strong> {completedOrder?.payment_method?.toUpperCase()}</div>
              </div>
              
              <div className="divider"></div>
              
              <div className="items">
                {completedOrder?.items?.map((item: CartItem, idx: number) => (
                  <div key={idx} className="item">
                    <span className="item-name">{item.name}</span>
                    <span className="item-qty">x{item.quantity}</span>
                    <span className="item-price">{currencySymbol} {(item.quantity * item.unit_price).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              
              <div className="divider"></div>
              
              <div className="totals">
                <div className="total-row">
                  <span>Subtotal:</span>
                  <span>{currencySymbol} {subtotal.toFixed(2)}</span>
                </div>
                <div className="total-row">
                  <span>Tax:</span>
                  <span>{currencySymbol} {taxAmount.toFixed(2)}</span>
                </div>
                {discount > 0 && (
                  <div className="total-row">
                    <span>Discount:</span>
                    <span>-{currencySymbol} {discount.toFixed(2)}</span>
                  </div>
                )}
                <div className="divider"></div>
                <div className="total-row grand-total">
                  <span>TOTAL:</span>
                  <span>{currencySymbol} {total.toFixed(2)}</span>
                </div>
              </div>
              
              <div className="footer">
                <div className="divider"></div>
                <div className="thank-you">Thank you for your purchase!</div>
                <div>Please come again</div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="gap-2 flex-col sm:flex-row">
            <Button variant="outline" onClick={handlePrintReceipt} className="w-full sm:w-auto">
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
            <Button onClick={handleNewOrder} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              New Order
            </Button>
            <Button 
              variant="secondary" 
              onClick={() => navigate(`/orders/${completedOrder?.id}`)}
              className="w-full sm:w-auto"
            >
              View Details
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CreateOrder;
