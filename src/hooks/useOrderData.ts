import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { generateSKU } from "@/lib/skuGenerator";

// Get order with items
export const useOrderDetails = (orderId: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["order-details", orderId],
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select(`
          *,
          customer:customers(id, name, email, phone, address)
        `)
        .eq("id", orderId)
        .single();
      
      if (orderError) throw orderError;
      
      const { data: items, error: itemsError } = await supabase
        .from("order_items")
        .select(`
          *,
          product:products(id, name, sku, price)
        `)
        .eq("order_id", orderId);
      
      if (itemsError) throw itemsError;
      
      return { ...order, items };
    },
    enabled: !!orderId && !!profile?.company_id,
  });
};

// Get company info for invoice
export const useCompanyInfo = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["company-info", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", profile.company_id)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

// Create sales order with proper tax calculation
export const useCreateSalesOrder = () => {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (order: {
      customer_id?: string;
      items: { product_id: string; quantity: number; unit_price: number; tax_rate: number }[];
      discount?: number;
      notes?: string;
    }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const subtotal = order.items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
      const taxAmount = order.items.reduce((acc, item) => {
        const itemTotal = item.quantity * item.unit_price;
        return acc + (itemTotal * (item.tax_rate / 100));
      }, 0);
      const discount = order.discount || 0;
      const total = subtotal + taxAmount - discount;
      
      const orderNumber = `INV-${Date.now().toString().slice(-8)}`;
      
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          company_id: profile.company_id,
          customer_id: order.customer_id || null,
          order_number: orderNumber,
          subtotal,
          tax: taxAmount,
          discount,
          total,
          notes: order.notes,
          status: "confirmed",
          payment_status: "paid",
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Insert order items
      const orderItems = order.items.map((item) => ({
        order_id: orderData.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      }));
      
      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(orderItems);
      
      if (itemsError) throw itemsError;
      
      // Update product quantities and create stock movements
      for (const item of order.items) {
        const { data: product } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.product_id)
          .single();
        
        if (product) {
          await supabase
            .from("products")
            .update({ quantity: Math.max(0, product.quantity - item.quantity) })
            .eq("id", item.product_id);
          
          // Record stock movement
          await supabase
            .from("stock_movements")
            .insert({
              company_id: profile.company_id,
              product_id: item.product_id,
              type: "out",
              quantity: item.quantity,
              reference_id: orderData.id,
              notes: `Sale - Order ${orderNumber}`,
              created_by: user?.id,
            });
        }
      }
      
      // Log activity
      await supabase.from("activity_logs").insert({
        company_id: profile.company_id,
        user_id: user?.id,
        action: "order_created",
        entity_type: "order",
        entity_id: orderData.id,
        details: { order_number: orderNumber, total, items_count: order.items.length },
      });

      return orderData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      toast.success("Order created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create order: " + error.message);
    },
  });
};

// Update order status
export const useUpdateOrderStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ orderId, status, paymentStatus }: { 
      orderId: string; 
      status?: string; 
      paymentStatus?: string;
    }) => {
      const updates: Record<string, string> = {};
      if (status) updates.status = status;
      if (paymentStatus) updates.payment_status = paymentStatus;
      
      const { error } = await supabase
        .from("orders")
        .update(updates)
        .eq("id", orderId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order-details"] });
      toast.success("Order updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update order: " + error.message);
    },
  });
};

// Purchase orders hooks
export const usePurchaseOrders = () => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["purchase-orders", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          supplier:suppliers(id, name, email)
        `)
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });
};

export const usePurchaseOrderDetails = (orderId: string) => {
  const { profile } = useAuth();
  
  return useQuery({
    queryKey: ["purchase-order-details", orderId],
    queryFn: async () => {
      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .select(`
          *,
          supplier:suppliers(id, name, email, phone, address)
        `)
        .eq("id", orderId)
        .single();
      
      if (orderError) throw orderError;
      
      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select(`
          *,
          product:products(id, name, sku, price)
        `)
        .eq("purchase_order_id", orderId);
      
      if (itemsError) throw itemsError;
      
      return { ...order, items };
    },
    enabled: !!orderId && !!profile?.company_id,
  });
};

export const useCreatePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (order: {
      supplier_id: string;
      items: { 
        product_id: string; 
        quantity: number; 
        unit_price: number;
        is_new_product?: boolean;
        product_name?: string;
        product_sku?: string;
        selling_price?: number;
      }[];
      notes?: string;
    }) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      const subtotal = order.items.reduce((acc, item) => acc + item.quantity * item.unit_price, 0);
      const tax = subtotal * 0.1;
      const total = subtotal + tax;
      
      const orderNumber = `PO-${Date.now().toString().slice(-8)}`;
      
      const { data: orderData, error: orderError } = await supabase
        .from("purchase_orders")
        .insert({
          company_id: profile.company_id,
          supplier_id: order.supplier_id,
          order_number: orderNumber,
          subtotal,
          tax,
          total,
          notes: order.notes,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (orderError) throw orderError;
      
      // Insert order items - handle both existing and new products
      const orderItems = order.items.map((item) => ({
        purchase_order_id: orderData.id,
        product_id: item.is_new_product ? null : item.product_id,
        product_name: item.is_new_product ? item.product_name : null,
        product_sku: item.is_new_product ? item.product_sku : null,
        is_new_product: item.is_new_product || false,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
        selling_price: item.is_new_product ? item.selling_price : null,
      }));
      
      const { error: itemsError } = await supabase
        .from("purchase_order_items")
        .insert(orderItems);
      
      if (itemsError) throw itemsError;

      // Log activity
      await supabase.from("activity_logs").insert({
        company_id: profile.company_id,
        user_id: user?.id,
        action: "purchase_order_created",
        entity_type: "purchase_order",
        entity_id: orderData.id,
        details: { order_number: orderNumber, total, items_count: order.items.length },
      });
      
      return orderData;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      toast.success("Purchase order created successfully");
    },
    onError: (error) => {
      toast.error("Failed to create purchase order: " + error.message);
    },
  });
};

export const useReceivePurchaseOrder = () => {
  const queryClient = useQueryClient();
  const { profile, user } = useAuth();
  
  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!profile?.company_id) throw new Error("No company found");
      
      // Get order details with items
      const { data: order, error: orderError } = await supabase
        .from("purchase_orders")
        .select("*")
        .eq("id", orderId)
        .single();
      
      if (orderError) throw orderError;
      
      const { data: items, error: itemsError } = await supabase
        .from("purchase_order_items")
        .select("*")
        .eq("purchase_order_id", orderId);
      
      if (itemsError) throw itemsError;
      
      // Update order status
      const { error: updateError } = await supabase
        .from("purchase_orders")
        .update({ status: "received" })
        .eq("id", orderId);
      
      if (updateError) throw updateError;
      
      // Process items - create new products if needed, update existing ones
      const newProducts: { id: string; name: string }[] = [];
      
      for (const item of items || []) {
        if (item.is_new_product && item.product_name) {
          // Create new product with selling price or auto-calculate
          const sellingPrice = item.selling_price && item.selling_price > 0 
            ? item.selling_price 
            : item.unit_price * 1.3; // Default 30% markup if no selling price
          
          const { data: newProduct, error: productError } = await supabase
            .from("products")
            .insert({
              company_id: profile.company_id,
              name: item.product_name,
              sku: item.product_sku || generateSKU(item.product_name),
              quantity: item.quantity,
              price: sellingPrice,
              cost_price: item.unit_price,
              supplier_id: order.supplier_id,
            })
            .select()
            .single();
          
          if (productError) {
            console.error("Error creating product:", productError);
            continue;
          }
          
          newProducts.push({ id: newProduct.id, name: item.product_name });
          
          // Update the purchase order item with the new product_id
          await supabase
            .from("purchase_order_items")
            .update({ product_id: newProduct.id, is_new_product: false })
            .eq("id", item.id);
          
          // Record stock movement
          await supabase
            .from("stock_movements")
            .insert({
              company_id: profile.company_id,
              product_id: newProduct.id,
              type: "in",
              quantity: item.quantity,
              reference_id: orderId,
              notes: `Purchase Order ${order.order_number} - New product added`,
              created_by: user?.id,
            });
        } else if (item.product_id) {
          // Existing product - update quantity
          const { data: product } = await supabase
            .from("products")
            .select("quantity")
            .eq("id", item.product_id)
            .single();
          
          if (product) {
            await supabase
              .from("products")
              .update({ quantity: product.quantity + item.quantity })
              .eq("id", item.product_id);
            
            // Record stock movement
            await supabase
              .from("stock_movements")
              .insert({
                company_id: profile.company_id,
                product_id: item.product_id,
                type: "in",
                quantity: item.quantity,
                reference_id: orderId,
                notes: `Purchase Order ${order.order_number} received`,
                created_by: user?.id,
              });
          }
        }
      }

      // Log activity
      await supabase.from("activity_logs").insert({
        company_id: profile.company_id,
        user_id: user?.id,
        action: "purchase_order_received",
        entity_type: "purchase_order",
        entity_id: orderId,
        details: { order_number: order.order_number, items_received: items?.length || 0 },
      });
      
      return order;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      queryClient.invalidateQueries({ queryKey: ["purchase-order-details"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["activity-logs"] });
      toast.success("Purchase order received - inventory updated");
    },
    onError: (error) => {
      toast.error("Failed to receive order: " + error.message);
    },
  });
};
