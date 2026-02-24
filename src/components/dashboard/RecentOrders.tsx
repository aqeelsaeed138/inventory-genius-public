import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useOrders } from "@/hooks/useCompanyData";
import { useCompany } from "@/contexts/CompanyContext";
import { Loader2 } from "lucide-react";

const statusColors: Record<string, string> = {
  completed: "bg-success/10 text-success border-success/20",
  confirmed: "bg-success/10 text-success border-success/20",
  delivered: "bg-success/10 text-success border-success/20",
  processing: "bg-warning/10 text-warning border-warning/20",
  pending: "bg-muted text-muted-foreground border-border",
  shipped: "bg-primary/10 text-primary border-primary/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

const RecentOrders = () => {
  const { data: orders, isLoading } = useOrders();
  const { formatPrice } = useCompany();
  
  // Get the 5 most recent orders
  const recentOrders = orders?.slice(0, 5) || [];

  return (
    <div className="bg-card rounded-2xl shadow-card border border-border/50 overflow-hidden">
      <div className="p-6 border-b border-border">
        <h3 className="text-lg font-semibold">Recent Orders</h3>
        <p className="text-sm text-muted-foreground">Latest transactions across your business</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : recentOrders.length === 0 ? (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          No orders yet
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">{order.order_number}</TableCell>
                  <TableCell>{order.customer?.name || "Walk-in"}</TableCell>
                  <TableCell className="font-medium">{formatPrice(Number(order.total))}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColors[order.status] || statusColors.pending}>
                      {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(order.created_at).toLocaleDateString()}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default RecentOrders;
