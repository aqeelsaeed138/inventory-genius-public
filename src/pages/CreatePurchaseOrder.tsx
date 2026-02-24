import { useState, useMemo, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { 
  Plus, 
  Minus, 
  Trash2, 
  Search, 
  Truck,
  Loader2,
  Package,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import { useProducts, useSuppliers } from "@/hooks/useCompanyData";
import { useCreatePurchaseOrder } from "@/hooks/useOrderData";
import { useCompany } from "@/contexts/CompanyContext";
import { toast } from "sonner";
import { generateSKU } from "@/lib/skuGenerator";

interface OrderItem {
  product_id: string;
  name: string;
  sku: string;
  quantity: number;
  unit_price: number;
  current_stock: number;
  min_stock: number;
  is_new_product?: boolean;
  selling_price?: number;
}

const CreatePurchaseOrder = () => {
  const navigate = useNavigate();
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [notes, setNotes] = useState("");

  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductCost, setNewProductCost] = useState("");
  const [newProductSellingPrice, setNewProductSellingPrice] = useState("");

  const { data: products, isLoading: productsLoading } = useProducts();
  const { data: suppliers } = useSuppliers();
  const createOrder = useCreatePurchaseOrder();
  const { formatPrice, currencySymbol } = useCompany();

  // Filter products by selected supplier and search query
  const filteredProducts = useMemo(() => {
    let filtered = products || [];
    
    if (selectedSupplier) {
      filtered = filtered.filter(p => p.supplier_id === selectedSupplier);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [products, selectedSupplier, searchQuery]);

  // Get low stock products
  const lowStockProducts = useMemo(() => {
    return filteredProducts.filter(p => p.quantity <= (p.min_stock_level || 10));
  }, [filteredProducts]);

  const addToOrder = (product: typeof products[0]) => {
    const existing = orderItems.find((item) => item.product_id === product.id);
    
    if (existing) {
      setOrderItems(orderItems.map((item) =>
        item.product_id === product.id
          ? { ...item, quantity: item.quantity + 10 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, {
        product_id: product.id,
        name: product.name,
        sku: product.sku || "",
        quantity: 10,
        unit_price: product.cost_price || product.price * 0.7,
        current_stock: product.quantity,
        min_stock: product.min_stock_level || 10,
      }]);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setOrderItems(orderItems.map((item) => {
      if (item.product_id === productId) {
        const newQty = item.quantity + delta;
        if (newQty < 1) return item;
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const updatePrice = (productId: string, price: number) => {
    setOrderItems(orderItems.map((item) => 
      item.product_id === productId ? { ...item, unit_price: price } : item
    ));
  };

  const removeFromOrder = (productId: string) => {
    setOrderItems(orderItems.filter((item) => item.product_id !== productId));
  };

  const addNewProduct = () => {
    if (!newProductName.trim()) {
      toast.error("Product name is required");
      return;
    }
    
    const newId = `new_${Date.now()}`;
    // Use provided SKU or auto-generate one
    const finalSku = newProductSku || generateSKU(newProductName);
    
    setOrderItems([...orderItems, {
      product_id: newId,
      name: newProductName,
      sku: finalSku,
      quantity: 10,
      unit_price: parseFloat(newProductCost) || 0,
      current_stock: 0,
      min_stock: 10,
      is_new_product: true,
      selling_price: parseFloat(newProductSellingPrice) || 0,
    }]);
    
    setNewProductName("");
    setNewProductSku("");
    setNewProductCost("");
    setNewProductSellingPrice("");
    toast.success("New product added to order");
  };

  // Auto-generate SKU when new product name changes
  useEffect(() => {
    if (newProductName && !newProductSku) {
      setNewProductSku(generateSKU(newProductName));
    }
  }, [newProductName]);

  const regenerateNewProductSku = () => {
    setNewProductSku(generateSKU(newProductName));
  };

  // Get selected supplier's tax rate
  const selectedSupplierData = suppliers?.find(s => s.id === selectedSupplier);
  const supplierTaxRate = Number(selectedSupplierData?.tax_rate) || 0;

  const subtotal = orderItems.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
  const tax = subtotal * (supplierTaxRate / 100);
  const total = subtotal + tax;

  const handleCreateOrder = async () => {
    if (!selectedSupplier) {
      toast.error("Please select a supplier");
      return;
    }
    
    if (orderItems.length === 0) {
      toast.error("Please add at least one product to the order");
      return;
    }

    const orderData = await createOrder.mutateAsync({
      supplier_id: selectedSupplier,
      items: orderItems.map((item) => ({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        is_new_product: item.is_new_product,
        product_name: item.is_new_product ? item.name : undefined,
        product_sku: item.is_new_product ? item.sku : undefined,
        selling_price: item.is_new_product ? item.selling_price : undefined,
      })),
      notes,
    });

    navigate(`/purchase-orders/${orderData.id}`);
  };

  return (
    <DashboardLayout 
      title="Create Purchase Order" 
      description="Order products from suppliers to restock inventory"
    >
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Supplier & Product Selection */}
        <div className="lg:col-span-2 space-y-6">
          {/* Supplier Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Truck className="h-5 w-5" />
                Select Supplier
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers?.map((supplier) => (
                    <SelectItem key={supplier.id} value={supplier.id}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Product Selection */}
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

              {/* Low Stock Alert */}
              {lowStockProducts.length > 0 && (
                <div className="mb-4 p-3 bg-warning/10 border border-warning/20 rounded-lg">
                  <div className="flex items-center gap-2 text-warning mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">{lowStockProducts.length} products need restocking</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {lowStockProducts.slice(0, 5).map((product) => (
                      <Button
                        key={product.id}
                        size="sm"
                        variant="outline"
                        onClick={() => addToOrder(product)}
                        className="text-xs"
                      >
                        {product.name} ({product.quantity} left)
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              
              {productsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : !selectedSupplier ? (
                <div className="text-center py-8 text-muted-foreground">
                  Select a supplier to view their products
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No products match your search" : "No products from this supplier"}
                </div>
              ) : (
                <div className="grid gap-2 max-h-[300px] overflow-y-auto">
                  {filteredProducts.map((product) => {
                    const inOrder = orderItems.find((item) => item.product_id === product.id);
                    const isLowStock = product.quantity <= (product.min_stock_level || 10);
                    
                    return (
                      <div
                        key={product.id}
                        className={`flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors ${
                          isLowStock ? "border-warning/50" : ""
                        }`}
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{product.name}</span>
                            {isLowStock && (
                              <Badge variant="secondary" className="text-xs bg-warning/10 text-warning">
                                Low Stock
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            SKU: {product.sku || "N/A"} • Current Stock: {product.quantity} • Cost: {formatPrice(product.cost_price || product.price * 0.7)}
                          </div>
                        </div>
                        <Button
                          size="sm"
                          variant={inOrder ? "secondary" : "default"}
                          onClick={() => addToOrder(product)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          {inOrder ? `Added (${inOrder.quantity})` : "Add"}
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add New Product */}
          {selectedSupplier && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New Product
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Order a product that's not yet in your inventory. It will be added when you receive the order.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Product Name *</Label>
                    <Input
                      placeholder="Product name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">SKU</Label>
                    <div className="flex gap-1">
                      <Input
                        placeholder="Auto-generated"
                        value={newProductSku}
                        onChange={(e) => setNewProductSku(e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="h-9 w-9 shrink-0"
                        onClick={regenerateNewProductSku}
                        title="Regenerate SKU"
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit Cost</Label>
                    <Input
                      type="number"
                      placeholder="Cost price"
                      value={newProductCost}
                      onChange={(e) => setNewProductCost(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Selling Price</Label>
                    <Input
                      type="number"
                      placeholder="Selling price"
                      value={newProductSellingPrice}
                      onChange={(e) => setNewProductSellingPrice(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addNewProduct} className="w-full">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to Order
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Items */}
          {orderItems.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Order Items ({orderItems.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-center">Qty</TableHead>
                      <TableHead className="text-right">Unit Cost</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderItems.map((item) => (
                      <TableRow key={item.product_id}>
                        <TableCell>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{item.name}</span>
                              {item.is_new_product && (
                                <Badge variant="secondary" className="text-xs">New</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {item.is_new_product ? `SKU: ${item.sku}` : `Current: ${item.current_stock} | Min: ${item.min_stock}`}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product_id, -5)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="w-10 text-center">{item.quantity}</span>
                            <Button
                              size="icon"
                              variant="outline"
                              className="h-7 w-7"
                              onClick={() => updateQuantity(item.product_id, 5)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updatePrice(item.product_id, Number(e.target.value))}
                            className="w-24 h-8 text-right"
                          />
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatPrice(item.quantity * item.unit_price)}
                        </TableCell>
                        <TableCell>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive"
                            onClick={() => removeFromOrder(item.product_id)}
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
        <div>
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Items</span>
                  <span>{orderItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Tax ({supplierTaxRate}%)</span>
                  <span>{formatPrice(tax)}</span>
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

              <Button 
                className="w-full" 
                size="lg"
                onClick={handleCreateOrder}
                disabled={!selectedSupplier || orderItems.length === 0 || createOrder.isPending}
              >
                {createOrder.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Truck className="h-4 w-4 mr-2" />
                    Create Purchase Order
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default CreatePurchaseOrder;
