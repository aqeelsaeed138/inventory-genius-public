import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2 } from "lucide-react";
import { useSalesChartData } from "@/hooks/useDashboardData";
import { useCompany } from "@/contexts/CompanyContext";

const SalesChart = () => {
  const { data: chartData, isLoading } = useSalesChartData();
  const { formatPrice } = useCompany();

  return (
    <div className="bg-card rounded-2xl p-6 shadow-card border border-border/50">
      <div className="mb-6">
        <h3 className="text-lg font-semibold">Sales Overview</h3>
        <p className="text-sm text-muted-foreground">Monthly revenue and order trends</p>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center h-[300px]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : !chartData?.length || chartData.every(d => d.sales === 0 && d.orders === 0) ? (
        <div className="flex items-center justify-center h-[300px] text-muted-foreground">
          No sales data yet. Create orders to see trends here.
        </div>
      ) : (
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(226, 71%, 40%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(226, 71%, 40%)" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(173, 58%, 39%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="name"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `${value}`}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "0.75rem",
                  boxShadow: "var(--shadow-soft)",
                }}
                labelStyle={{ color: "hsl(var(--foreground))" }}
                formatter={(value: number, name: string) => [
                  name === "sales" ? formatPrice(value) : value,
                  name === "sales" ? "Revenue" : "Orders"
                ]}
              />
              <Area
                type="monotone"
                dataKey="sales"
                stroke="hsl(226, 71%, 40%)"
                fillOpacity={1}
                fill="url(#colorSales)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="orders"
                stroke="hsl(173, 58%, 39%)"
                fillOpacity={1}
                fill="url(#colorOrders)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};

export default SalesChart;
