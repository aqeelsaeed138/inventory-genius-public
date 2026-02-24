import { AlertTriangle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useLowStockProducts } from "@/hooks/useDashboardData";

const LowStockAlert = () => {
  const { data: lowStockItems, isLoading } = useLowStockProducts();

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
          <AlertTriangle className="h-5 w-5 text-warning" />
        </div>
        <div>
          <h3 className="text-lg font-semibold">Low Stock Alert</h3>
          <p className="text-sm text-muted-foreground">
            {isLoading ? "Loading..." : `${lowStockItems?.length || 0} items need attention`}
          </p>
        </div>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !lowStockItems?.length ? (
        <div className="text-center py-8 text-muted-foreground text-sm">
          All products are well stocked! 🎉
        </div>
      ) : (
        <div className="space-y-4">
          {lowStockItems.map((item) => {
            const percentage = (item.quantity / item.min_stock_level) * 100;
            return (
              <div key={item.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{item.name}</span>
                    {item.sku && (
                      <span className="text-muted-foreground ml-2">({item.sku})</span>
                    )}
                  </div>
                  <span className="text-muted-foreground">
                    {item.quantity} / {item.min_stock_level}
                  </span>
                </div>
                <Progress value={Math.min(percentage, 100)} className="h-2" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LowStockAlert;
