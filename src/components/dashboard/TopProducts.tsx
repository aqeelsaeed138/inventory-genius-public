import { Package, Loader2 } from "lucide-react";
import { useTopProducts } from "@/hooks/useDashboardData";
import { useCompany } from "@/contexts/CompanyContext";

const TopProducts = () => {
  const { data: topProducts, isLoading } = useTopProducts();
  const { formatPrice } = useCompany();

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Top Products</h3>
        <p className="text-sm text-muted-foreground">Best performing items by sales</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !topProducts?.length ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          No sales data yet. Create orders to see top products.
        </div>
      ) : (
        <div className="space-y-4">
          {topProducts.map((product, index) => (
            <div
              key={product.name}
              className="flex items-center gap-4 p-3 rounded-lg hover:bg-secondary/50 transition-colors"
            >
              <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center font-semibold text-muted-foreground">
                #{index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{product.name}</p>
                <p className="text-sm text-muted-foreground">{product.sales} sold</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatPrice(product.revenue)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopProducts;
